import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions, WordTiming } from './components/WordCaptions';
import { CreatorTop } from './components/CreatorTop';
import {
  StatCard,
  KeywordCard,
  BannerCard,
  QuoteCard,
  ChapterCard,
  isEditorialCardTipo,
} from './components/EditorialCards';
import { ExplainerSceneForPlano, isExplainerTipo, type ExplainerDados } from './components/ExplainerScenes';
import { TRANSITIONS, type TransitionName } from './kit/transitions';
import {
  buildMusicVolume,
  sfxCueWindow,
  type VoiceWindow,
  type SilenceWindow,
  type SfxCue,
} from './kit/musicTrack';
import { GUYFOLKZ_ACCENT, GUYFOLKZ_ACCENT2, MONO_FONT } from './kit/animationPresets';
import { FilmGrainScanline } from './components/FilmGrainScanline';

// CaptionClip — formato A (monolayer). MULTI-PLANO: o b-roll troca no ritmo da fala
// (cada chunk = 1 plano cortado), enquanto a narração é ÚNICA e a legenda karaokê é
// CONTÍNUA por cima de todos os planos. Trilha de fundo + whoosh nos cortes. Faixa-tese
// e numeral/keyword entram e saem nas janelas certas. Retrocompat: sem planos[] → 1 plano.
//
// SPLIT UNIVERSAL (opt-in): show_creator_panel=true encaixa o painel do criador no topo
// (CreatorTop), confina os planos à metade de baixo e empurra heroes/legenda pra baixo.

const FPS = 30;
const XF = 8; // frames de crossfade entre planos
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

// tipo do plano. Sem tipo (ou 'imagem'/'video') = comportamento ANTIGO (b-roll Ken Burns).
// Os demais tipos disparam um CARD EDITORIAL (EditorialCards) sobre o plano anterior
// escurecido (ou sobre a paleta, via fundo_solido). 100% retrocompatível.
// Tipos novos 'fluxo'|'compara'|'grafico'|'timeline' = ANIMAÇÕES EXPLICATIVAS (ExplainerScenes)
// que EXPLICAM conceitos (fluxo, comparação, gráfico que cresce, linha do tempo) a partir do
// campo `dados` extraído da fala. Aditivo: EDLs sem esses tipos renderizam igual.
export type PlanoTipo =
  | 'imagem' | 'video'
  | 'stat' | 'keyword' | 'banner' | 'quote' | 'capitulo'
  | 'fluxo' | 'compara' | 'grafico' | 'timeline';

export type Plano = {
  inicio_s: number;
  fim_s: number;
  tipo?: PlanoTipo | string; // sem tipo => imagem/vídeo (legado)
  video_url?: string;
  imagem_url?: string;
  numero?: string; // numeral gigante nesta janela (legado; ainda suportado)
  keyword?: string; // keyword-hero nesta janela (legado; ainda suportado)
  kenburns?: 'in' | 'out' | 'pan';
  // ── campos dos cards editoriais (tipo != imagem/vídeo) ──
  texto?: string; // banner/quote/capitulo: texto principal; keyword: a(s) palavra(s); stat: label
  valor?: string; // stat: número ("700", "R$40M", "100M", "3x"); capitulo: numeração ("01")
  sub?: string; // banner: subtítulo; quote: autor da citação
  transicao?: TransitionName; // transição DESTE plano em relação ao anterior (kit); senão crossfade
  anim_in?: string; // reservado (entrada custom); hoje cada card já tem sua entrada
  fundo_solido?: boolean; // true => card sobre backdrop da paleta (não sobre o plano anterior)
  accent?: string; // OVERRIDE de cor DESTE plano (ex.: âmbar GUYFOLKZ_ACCENT2 em card de RISCO);
                   // ausente => usa o accent global do clip (default defensivo).
  // ── ANIMAÇÃO EXPLICATIVA (tipo fluxo/compara/grafico/timeline) ──
  // `dados` carrega o shape da cena (etapas/colunas/valores/eventos) extraído DA FALA.
  dados?: ExplainerDados | Record<string, unknown>;
  // ── B-ROLL ALTERNATIVO (opt-in): outras opções de mídia pra ESTA cena. Quando vêm 2+,
  // o plano-mídia ALTERNA entre elas (corte a cada ~3.5s) p/ aumentar cortes_por_min e
  // matar a monotonia do plano estático longo. Aceita 'alternatives' (storyboard) ou os
  // aliases broll_alternatives/alts. Cada item: string (url) OU {url|video_url|imagem_url}.
  // Ausente/1 item => comportamento atual (1 plano + punch-in). 100% retrocompatível.
  alternatives?: Array<string | { url?: string; video_url?: string; imagem_url?: string; source?: string }>;
  broll_alternatives?: Array<string | { url?: string; video_url?: string; imagem_url?: string; source?: string }>;
  alts?: Array<string | { url?: string; video_url?: string; imagem_url?: string; source?: string }>;
};

// extrai a lista de mídias alternativas de um plano (storyboard manda assets.broll.alternatives;
// aceitamos também o alias direto no plano). Item string = url; objeto = {url|video_url|imagem_url}.
const planoAlternatives = (p: Plano): Array<{ video_url?: string; imagem_url?: string }> => {
  const raw = p.alternatives || p.broll_alternatives || p.alts || [];
  if (!Array.isArray(raw)) return [];
  const out: Array<{ video_url?: string; imagem_url?: string }> = [];
  for (const it of raw) {
    if (!it) continue;
    if (typeof it === 'string') {
      const isVid = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(it);
      out.push(isVid ? { video_url: it } : { imagem_url: it });
    } else {
      const v = it.video_url; const i = it.imagem_url;
      if (v || i) { out.push({ video_url: v, imagem_url: i }); continue; }
      if (it.url) {
        const isVid = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(it.url);
        out.push(isVid ? { video_url: it.url } : { imagem_url: it.url });
      }
    }
  }
  return out;
};

export type CaptionClipProps = {
  planos?: Plano[]; // multi-plano (preferido)
  // fallback single-plano (retrocompat)
  video_url?: string;
  imagem_url?: string;
  audio_url?: string; // narração ÚNICA (data-uri/url)
  words: WordTiming[]; // timestamps por palavra (cobre o vídeo inteiro)
  texto?: string;
  paleta_hex: string;
  accent2?: string; // âmbar (GUYFOLKZ_ACCENT2): cor de RISCO/alerta. Default defensivo = paleta_hex.
  logo_url: string;
  handle: string;
  duracao_s: number;
  mute_video?: boolean;
  music_url?: string;
  sfx?: { whoosh?: string; ding?: string; pop?: string; riser?: string; impact?: string };
  // ── DIRETOR MUSICAL (Fase 1; todos opcionais, ausentes = comportamento atual) ──
  voice_windows?: VoiceWindow[]; // janelas (s) com fala → música abaixa (ducking 0.045↔0.13)
  silence_windows?: SilenceWindow[]; // janelas (s) onde a música vai a 0 com fade 1.2s (silêncio estratégico)
  sfx_plan?: SfxCue[]; // cues de riser/sting tocados de sfx.riser_url/sting_url
  riser_url?: string; // asset do riser (do kit) — sem isto, cue 'riser' não toca
  sting_url?: string; // asset do sting (do kit) — sem isto, cue 'sting' não toca
  tema_linhas?: string[]; // faixa-tese (entra/sai)
  tema_y?: number;
  titulo_topo?: string;
  caption_style?: 'karaoke' | 'limpa'; // 'karaoke' (amarelo, 1 palavra) | 'limpa' (essay, branco/frase) — default karaoke
  keyword_hero?: string; // keyword global (fallback se nenhum plano tem keyword)
  circulo_em?: { start: number; end: number }[];
  // ── SPLIT UNIVERSAL (opt-in; default = comportamento atual) ──
  show_creator_panel?: boolean; // true => painel do criador no topo + planos/legenda empurrados pra baixo
  creator_url?: string; // clip/gravação do criador (topo)
  creator_avatar?: string; // fallback imagem do criador (topo)
  creator_live_audio?: boolean; // gravação real: topo toca o áudio; não tocar a narração única
  split_ratio?: number; // fração da altura do painel topo (0.42-0.62)
};

export const captionClipDefaultProps: CaptionClipProps = {
  // Demo de NARRAÇÃO LONGA nível editor: 1 exemplo de CADA tipo de plano.
  // (planos-mídia = Ken Burns + punch-in; planos-card = motion-graphics + transições)
  planos: [
    { inicio_s: 0, fim_s: 4, tipo: 'imagem', imagem_url: 'https://picsum.photos/1080/1920?11', kenburns: 'in' },
    { inicio_s: 4, fim_s: 7.5, tipo: 'capitulo', valor: '01', texto: 'Como tudo começou', transicao: 'slidePush' },
    { inicio_s: 7.5, fim_s: 11.5, tipo: 'imagem', imagem_url: 'https://picsum.photos/1080/1920?22', kenburns: 'pan', transicao: 'wipe' },
    { inicio_s: 11.5, fim_s: 15, tipo: 'keyword', texto: 'DESCENTRALIZA', transicao: 'glitchCut' },
    { inicio_s: 15, fim_s: 19, tipo: 'stat', valor: 'R$40M', texto: 'em 18 meses, do zero', transicao: 'zoomBlur', fundo_solido: true },
    // card de RISCO usa o âmbar (accent2) via sentinela declarativa:
    { inicio_s: 19, fim_s: 22.5, tipo: 'banner', texto: 'Ninguém viu chegando', sub: 'Enquanto os incumbentes dormiam, o mercado virou.', transicao: 'whipPan', accent: 'accent2' },
    // ── ANIMAÇÃO EXPLICATIVA: linha do tempo construída na frente do espectador ──
    { inicio_s: 22.5, fim_s: 28.5, tipo: 'timeline', transicao: 'slidePush', fundo_solido: true, dados: { titulo: 'A virada em 3 atos', eventos: [{ ano: '2024', texto: '700 atendentes' }, { ano: '2025', texto: 'recuo' }, { ano: '2026', texto: 'híbrido' }] } },
    { inicio_s: 28.5, fim_s: 30, tipo: 'quote', texto: 'A diferença entre o fracasso e a revolução é só apertar o botão.', sub: 'GuyFolkz', transicao: 'fade', fundo_solido: true },
  ],
  imagem_url: 'https://picsum.photos/1080/1920?7',
  audio_url: '',
  words: [],
  texto: 'caraca esse cara vale trinta milhões agora e ninguém viu chegando',
  // IDENTIDADE "Terminal-Noir": accent verde-terminal dessaturado + âmbar de risco.
  paleta_hex: GUYFOLKZ_ACCENT,
  accent2: GUYFOLKZ_ACCENT2,
  logo_url: '',
  handle: '@guyfolkz',
  duracao_s: 30,
  mute_video: true,
};

export const captionClipParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 8) * FPS));

const isMediaPlano = (p: Plano): boolean =>
  !p.tipo || p.tipo === 'imagem' || p.tipo === 'video' ||
  (!isEditorialCardTipo(p.tipo) && !isExplainerTipo(p.tipo) && (!!p.video_url || !!p.imagem_url));

// mídia bruta de UM plano (Ken Burns + punch-in). Reusado como camada de fundo do
// plano-mídia E como BACKDROP escurecido sob os cards editoriais (modo `darken`).
const SEG_S = 3.5; // duração-alvo de cada sub-plano quando há b-roll alternativo (corte interno)

const PlanoMedia: React.FC<{ plano: Plano; dur: number; idx: number; darken?: boolean; punch?: boolean }> = ({ plano, dur, idx, darken, punch }) => {
  const frame = useCurrentFrame();
  const kb = plano.kenburns || (idx % 3 === 0 ? 'in' : idx % 3 === 1 ? 'pan' : 'out');
  let scale = 1.1;
  let panX = 0;
  if (kb === 'in') scale = interpolate(frame, [0, dur], [1.05, 1.17], { extrapolateRight: 'clamp' });
  else if (kb === 'out') scale = interpolate(frame, [0, dur], [1.17, 1.05], { extrapolateRight: 'clamp' });
  else panX = interpolate(frame, [0, dur], [-26, 26], { extrapolateRight: 'clamp' });
  // PUNCH-IN sutil em TODO plano-mídia: leve scale 1→1.06 por cima do Ken Burns — "respira"
  // e sinaliza vida (sem competir com a legenda). Off em backdrops escurecidos (darken)/cards.
  // (antes era gated em dur>4s, o que deixava cenas longas paradas → monótono no QA.)
  const punchScale = punch && !darken ? interpolate(frame, [0, dur], [1.0, 1.06], { extrapolateRight: 'clamp' }) : 1;
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale * punchScale}) translateX(${panX}px)`,
    filter: darken ? 'brightness(0.42) saturate(0.9)' : undefined,
  };

  // ── B-ROLL ALTERNATIVO: se a cena trouxe 2+ mídias E é longa o bastante p/ ≥2 cortes,
  // alterna entre elas (corte a cada ~SEG_S) sem mexer no Ken Burns/punch (transform contínuo)
  // → mais cortes_por_min, mesma sincronia de legenda. Não roda em backdrop (darken).
  const alts = !darken ? planoAlternatives(plano) : [];
  // candidatos = mídia principal do plano + alternativas (dedup por url)
  const candidates: Array<{ video_url?: string; imagem_url?: string }> = [];
  if (plano.video_url || plano.imagem_url) candidates.push({ video_url: plano.video_url, imagem_url: plano.imagem_url });
  for (const a of alts) candidates.push(a);
  const seen = new Set<string>();
  const media = candidates.filter((c) => {
    const key = (c.video_url || c.imagem_url || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const segFrames = Math.round(SEG_S * FPS);
  const useAlternation = media.length >= 2 && dur >= 2 * segFrames;
  const segIdx = useAlternation ? clamp(Math.floor(frame / segFrames), 0, media.length - 1) : 0;
  const cur = media[segIdx] || { video_url: plano.video_url, imagem_url: plano.imagem_url };

  return cur.video_url ? (
    <OffthreadVideo src={resolveSrc(cur.video_url)} muted style={style} />
  ) : (
    <Img src={resolveSrc(cur.imagem_url || '')} style={style} />
  );
};

// fundo de UM plano. topOffset>0 (split universal): plano confinado abaixo do painel.
// Plano-mídia (imagem/vídeo) => Ken Burns + punch-in. Plano-card (stat/keyword/banner/
// quote/capitulo) => backdrop (plano anterior escurecido OU paleta) + o CARD editorial.
// `transicao`: quando presente, a ENTRADA deste plano usa a transição do kit (wipe/
// slidePush/zoomBlur/glitchCut/whipPan/fade) revelando sobre o plano anterior (que segue
// embaixo no overlap); sem `transicao` => crossfade clássico (opacity em XF frames).
const PlanoBg: React.FC<{
  plano: Plano;
  backdropPlano?: Plano; // plano-mídia anterior, mostrado escurecido sob um card
  dur: number;
  idx: number;
  topOffset?: number;
  accent: string;
  heroOffset?: number;
  glitchFlash?: boolean; // money-shot: só este plano deixa o glitchCut FLASHAR o accent
}> = ({ plano, backdropPlano, dur, idx, topOffset = 0, accent, heroOffset = 0, glitchFlash = false }) => {
  const frame = useCurrentFrame();
  const media = isMediaPlano(plano);

  // ── ENTRADA: transição do kit OU crossfade clássico ──
  let containerStyle: React.CSSProperties = {};
  if (idx === 0) {
    containerStyle = { opacity: 1 };
  } else if (plano.transicao && TRANSITIONS[plano.transicao]) {
    // progresso 0..1 ao longo da janela de overlap (XF frames). Reveal sobre o anterior.
    const progress = interpolate(frame, [0, XF + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    // flash de accent SÓ no money-shot (glitchFlash); demais glitchCut entram sem flash.
    const pair = TRANSITIONS[plano.transicao](progress, { accent, size: 1080, flash: glitchFlash });
    containerStyle = pair.incoming;
  } else {
    containerStyle = { opacity: interpolate(frame, [0, XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: topOffset,
        left: 0,
        width: 1080,
        height: 1920 - topOffset,
        overflow: 'hidden',
        backgroundColor: '#05060a',
        ...containerStyle,
      }}
    >
      {media ? (
        // plano-mídia normal: Ken Burns + punch-in
        <PlanoMedia plano={plano} dur={dur} idx={idx} punch />
      ) : (
        <>
          {/* backdrop do card:
              - fundo_solido => o PRÓPRIO card pinta um backdrop da paleta (Backdrop interno);
              - senão, se há plano-mídia anterior => mostra-o ESCURECIDO (continuidade visual);
              - senão (sem mídia anterior) => gradiente leve da paleta. */}
          {!plano.fundo_solido && backdropPlano ? (
            <PlanoMedia plano={backdropPlano} dur={dur} idx={idx} darken />
          ) : !plano.fundo_solido ? (
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 36%, ${accent}1f 0%, #05060a 60%)` }} />
          ) : null}
          {/* o card editorial preenche a janela */}
          <EditorialCardForPlano plano={plano} dur={dur} accent={accent} offsetY={heroOffset} />
        </>
      )}
    </div>
  );
};

// despacha o card certo conforme plano.tipo. offsetY empurra pra metade de baixo no split.
const EditorialCardForPlano: React.FC<{ plano: Plano; dur: number; accent: string; offsetY?: number }> = ({ plano, dur, accent, offsetY = 0 }) => {
  const durSec = dur / FPS;
  switch (plano.tipo) {
    case 'stat':
      return <StatCard valor={plano.valor ?? plano.numero ?? ''} texto={plano.texto} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    case 'keyword':
      return <KeywordCard texto={plano.texto ?? plano.keyword ?? ''} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    case 'banner':
      return <BannerCard texto={plano.texto ?? ''} sub={plano.sub} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    case 'quote':
      return <QuoteCard texto={plano.texto ?? ''} autor={plano.sub} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    case 'capitulo':
      return <ChapterCard texto={plano.texto ?? ''} valor={plano.valor} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    case 'fluxo':
    case 'compara':
    case 'grafico':
    case 'timeline':
      return <ExplainerSceneForPlano tipo={plano.tipo} dados={plano.dados} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={plano.fundo_solido} />;
    default:
      return null;
  }
};

const KeywordHero: React.FC<{ text: string; accent: string; offsetY?: number }> = ({ text, accent, offsetY = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const scale = interpolate(s, [0, 1], [0.55, 1.0]);
  return (
    <div style={{ position: 'absolute', top: 640 + offsetY, left: 0, width: 1080, textAlign: 'center', zIndex: 35, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 150, WebkitTextStroke: '10px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{text}</span>
    </div>
  );
};

const NumeralBig: React.FC<{ numero: string; accent: string; offsetY?: number }> = ({ numero, accent, offsetY = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const m = numero.match(/[\d.,]+/);
  let display = numero;
  if (m) {
    const target = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isNaN(target) && target >= 1) {
      const cur = Math.round(interpolate(s, [0, 1], [0, target]));
      display = numero.replace(/[\d.,]+/, cur.toLocaleString('pt-BR'));
    }
  }
  const scale = interpolate(s, [0, 1], [0.5, 1.0]);
  return (
    <div style={{ position: 'absolute', top: 560 + offsetY, left: 0, width: 1080, textAlign: 'center', zIndex: 36, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      {/* Terminal-Noir: numeral gigante em MONOSPACE real (assinatura "dado/terminal"). */}
      <span style={{ color: accent, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 180, WebkitTextStroke: '12px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], letterSpacing: '-0.03em' }}>{display}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

export const CaptionClip: React.FC<CaptionClipProps> = (props) => {
  const { audio_url, words, texto, paleta_hex, accent2, logo_url, handle, duracao_s, mute_video = true, music_url, sfx, tema_linhas, tema_y = 1080, titulo_topo, keyword_hero, circulo_em,
    show_creator_panel = false, creator_url, creator_avatar, creator_live_audio, split_ratio = 0.5,
    voice_windows, silence_windows, sfx_plan, riser_url, sting_url } = props;
  const total = captionClipParaFrames(props);
  // accent2 (âmbar de RISCO) — DEFENSIVO: ausente => cai no accent principal (sem âmbar).
  const accent2Resolved = accent2 || GUYFOLKZ_ACCENT2 || paleta_hex;
  // accent EFETIVO de um plano: override por plano (plano.accent) tem prioridade; senão global.
  // Sentinela 'accent2' => usa o âmbar de risco (token do clip) — açúcar declarativo pro
  // motor de roteiro marcar um card de risco/alerta sem repetir o hex. Default = accent global.
  const planoAccent = (p: Plano): string =>
    !p.accent ? paleta_hex : p.accent === 'accent2' ? accent2Resolved : p.accent;

  // monta a lista de planos (multi) ou cai no single (retrocompat)
  const planosRaw: Plano[] = (props.planos && props.planos.length)
    ? props.planos
    : [{ inicio_s: 0, fim_s: duracao_s, video_url: props.video_url, imagem_url: props.imagem_url, keyword: keyword_hero }];

  // ── AJUSTE DO JUIZ: limitar glitchCut a 1-2 viradas por peça; o resto vira fade/slidePush.
  // O FLASH de accent fica só no "money-shot" (a 1ª glitchCut mantida). Excesso de glitch é
  // demovido alternando fade/slidePush (variedade sem o corte cyber estourado o vídeo todo).
  const MAX_GLITCH = 2;
  let glitchKept = 0;
  let demoteToggle = 0;
  const glitchFlashIdx = new Set<number>(); // índices que MANTÊM o flash (money-shot)
  const planos: Plano[] = planosRaw.map((p, i) => {
    if (p.transicao !== 'glitchCut') return p;
    if (glitchKept < MAX_GLITCH) {
      if (glitchKept === 0) glitchFlashIdx.add(i); // money-shot = 1ª glitch mantida
      glitchKept += 1;
      return p;
    }
    // excesso: demove pra fade/slidePush (alterna) — mais seguro/limpo.
    const repl: TransitionName = demoteToggle % 2 === 0 ? 'fade' : 'slidePush';
    demoteToggle += 1;
    return { ...p, transicao: repl };
  });

  const whoosh = sfx?.whoosh;

  // faixa-tese SÓ no hook (~0.6s a 4.2s) e some — depois fica só título + legenda + destaque
  // pontual do plano. Evita o "texto empilhado" o vídeo todo (mais perto dos refs).
  const temaIn = 0.6, temaOut = temaIn + 3.6;

  // SPLIT UNIVERSAL: planos confinados abaixo do painel; heroes + legenda empurrados pra baixo.
  const splitY = show_creator_panel ? Math.round(clamp(split_ratio, 0.42, 0.62) * 1920) : 0;
  const heroOffset = show_creator_panel ? Math.max(0, splitY - 360) : 0; // 560/640 → dentro da metade de baixo
  const captionAnchor = show_creator_panel ? Math.round((splitY + 1920) / 2) + 40 : 1440;
  const liveAudio = Boolean(show_creator_panel && creator_live_audio);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* CAMADA DE FUNDO: planos trocando no ritmo (mídia OU card editorial) */}
      {planos.map((p, i) => {
        const fromF = Math.max(0, Math.round(p.inicio_s * FPS) - (i === 0 ? 0 : XF));
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS) + (i === 0 ? 0 : XF));
        // backdrop dos cards = último plano-mídia ANTERIOR (mostrado escurecido p/ continuidade)
        const backdropPlano = isMediaPlano(p)
          ? undefined
          : planos.slice(0, i).reverse().find((q) => isMediaPlano(q));
        return (
          <Sequence key={`p${i}`} from={fromF} durationInFrames={durF} layout="none">
            <PlanoBg plano={p} backdropPlano={backdropPlano} dur={durF} idx={i} topOffset={splitY} accent={planoAccent(p)} heroOffset={heroOffset} glitchFlash={glitchFlashIdx.has(i)} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade (global) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.5) 0%, rgba(4,6,10,0.06) 24%, rgba(4,6,10,0.48) 62%, rgba(4,6,10,0.92) 100%)', zIndex: 5 }} />

      {/* keyword-hero / numeral por plano (LEGADO, planos-mídia) — UM destaque por vez:
          suprime enquanto a tese (hook) está na tela, pra não empilhar texto. Planos com
          tipo de card editorial NÃO entram aqui (já desenham o próprio card no fundo). */}
      {planos.map((p, i) => {
        if (isEditorialCardTipo(p.tipo) || isExplainerTipo(p.tipo)) return null;
        const fromF = Math.round(p.inicio_s * FPS);
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS));
        const noHook = Boolean(tema_linhas && tema_linhas.length) && p.inicio_s < temaOut - 0.3;
        if (p.numero && !noHook) {
          return <Sequence key={`n${i}`} from={fromF} durationInFrames={durF} layout="none"><NumeralBig numero={p.numero} accent={planoAccent(p)} offsetY={heroOffset} /></Sequence>;
        }
        if (p.keyword && !noHook) {
          return <Sequence key={`k${i}`} from={fromF} durationInFrames={durF} layout="none"><KeywordHero text={p.keyword} accent={planoAccent(p)} offsetY={heroOffset} /></Sequence>;
        }
        return null;
      })}

      {/* faixa-tese (entra/sai) — empurrada pra metade de baixo no split universal */}
      {tema_linhas && tema_linhas.length ? (
        <Sequence from={Math.round(temaIn * FPS)} durationInFrames={Math.max(1, Math.round((temaOut - temaIn) * FPS))} layout="none">
          <TemaFaixa linhas={tema_linhas} y={show_creator_panel ? Math.max(tema_y, splitY + 60) : tema_y} />
        </Sequence>
      ) : null}

      {/* título/HOOK fixo no topo — HOOK CURTO (~6-10 palavras) que NÃO corta: auto-fit
          (fonte encolhe conforme o texto cresce) + clamp em 2 linhas com quebra por palavra.
          No split universal desce p/ logo abaixo do painel. */}
      {titulo_topo ? (
        <TituloTopo texto={titulo_topo} top={show_creator_panel ? splitY + 24 : 150} />
      ) : null}

      {/* legenda CONTÍNUA — karaokê (amarelo, 1 palavra) OU limpa estilo essay (branco, frase) */}
      {props.caption_style === 'limpa' ? (
        <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={captionAnchor} accent="#FFFFFF" fontSize={60} maxWordsPerGroup={5} variant="limpa" numberPop={false} />
      ) : (
        <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={captionAnchor} accent={paleta_hex} fontSize={86} maxWordsPerGroup={1} variant="solta" numberPop />
      )}

      {/* painel do criador no topo (split universal) */}
      {show_creator_panel ? (
        <CreatorTop
          creator_url={creator_url}
          creator_avatar={creator_avatar}
          creator_live_audio={creator_live_audio}
          handle={handle}
          logo_url={logo_url}
          paleta_hex={paleta_hex}
          splitY={splitY}
        />
      ) : null}

      {/* ÁUDIO: narração única + trilha (vol baixo, fades) + whoosh nos cortes.
          Em modo gravação (live audio), o som vem do vídeo do criador — não tocar a narração. */}
      {!liveAudio && mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
      {/* room-tone: leito de presença ~-44dB sob a voz sintética (mata o "vazio digital"). volume tunável. */}
      {!liveAudio ? <Sequence from={0} durationInFrames={total}><Audio src={resolveSrc('roomtone.mp3')} volume={0.006} loop /></Sequence> : null}
      {/* trilha de fundo: LOOP cobrindo o vídeo inteiro (mata o bug da faixa curta) +
          ducking sob a voz (voice_windows) + silêncio estratégico (silence_windows) + fades. */}
      {music_url ? (
        <Audio
          src={resolveSrc(music_url)}
          loop
          volume={buildMusicVolume({ fps: FPS, totalFrames: total, voiceWindows: voice_windows, silenceWindows: silence_windows })}
        />
      ) : null}
      {/* SFX plan: riser/sting tocados dos assets do kit nas janelas calculadas (vol 0.3). */}
      {Array.isArray(sfx_plan)
        ? sfx_plan.map((cue, i) => {
            const src = cue.type === 'riser' ? riser_url : sting_url;
            if (!src) return null;
            const w = sfxCueWindow(cue, FPS);
            return (
              <Sequence key={`sfx${i}`} from={w.from} durationInFrames={w.durationInFrames} layout="none">
                <Audio src={resolveSrc(src)} volume={0.3} />
              </Sequence>
            );
          })
        : null}
      {whoosh
        ? planos.slice(1).map((p, i) => (
            <Sequence key={`w${i}`} from={Math.max(0, Math.round(p.inicio_s * FPS) - 4)} durationInFrames={16} layout="none">
              <Audio src={resolveSrc(whoosh)} volume={0.4} />
            </Sequence>
          ))
        : null}

      {/* branding — assinatura Terminal-Noir (prompt mono + cursor block piscando) */}
      <BrandLowerThird handle={handle} logo_url={logo_url} accent={paleta_hex} />

      <ProgressBar total={total} accent={paleta_hex} />

      {/* OVERLAY GLOBAL Terminal-Noir — SEMPRE no fim: film grain + scanline CRT + vignette.
          É o que mata o aspecto "AI slop". zIndex alto (acima de tudo), intensidade discreta. */}
      <FilmGrainScanline />
    </AbsoluteFill>
  );
};

// BrandLowerThird — assinatura "Terminal-Noir": prompt de shell `<slug>:~$` em MONOSPACE
// + cursor BLOCK piscando. Substitui o handle em Montserrat 800. O blink é step-end ~1s
// via interpolate (ZERO @keyframes): liga/desliga em degraus duros (cara de cursor de TTY).
// Posição/anim constantes em TODO o vídeo (não entra/sai). Deriva o slug do handle
// (@guyfolkz / @fiel.ia → guyfolkz / fiel.ia); fallback 'guyfolkz'.
const handleToSlug = (handle?: string): string => {
  const s = (handle || '').trim().replace(/^@+/, '');
  return s || 'guyfolkz';
};

const BrandLowerThird: React.FC<{ handle: string; logo_url?: string; accent: string }> = ({ handle, logo_url, accent }) => {
  const frame = useCurrentFrame();
  const slug = handleToSlug(handle);
  // cursor block: ON ~0.55s, OFF ~0.45s (ciclo ~1s = 30 frames), borda dura (step-end).
  const cyc = frame % 30;
  const cursorOn = cyc < 17 ? 1 : 0;
  return (
    <div style={{ position: 'absolute', top: 70, left: 56, zIndex: 50, display: 'flex', alignItems: 'center', gap: 14 }}>
      {logo_url ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
          <Img src={resolveSrc(logo_url)} style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 2,
          background: 'rgba(8,10,16,0.62)',
          border: `1px solid ${accent}55`,
          borderRadius: 8,
          padding: '7px 14px',
          fontFamily: MONO_FONT,
          fontWeight: 500,
          fontSize: 30,
          letterSpacing: '0.01em',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        <span style={{ color: accent }}>{slug}</span>
        <span style={{ color: 'rgba(255,255,255,0.65)' }}>{':~'}</span>
        <span style={{ color: accent }}>{'$'}</span>
        {/* cursor block piscando */}
        <span
          style={{
            display: 'inline-block',
            width: 16,
            height: 30,
            marginLeft: 8,
            transform: 'translateY(4px)',
            background: accent,
            opacity: cursorOn,
            boxShadow: `0 0 10px ${accent}88`,
          }}
        />
      </div>
    </div>
  );
};

const TemaFaixa: React.FC<{ linhas: string[]; y: number }> = ({ linhas, y }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ty = interpolate(frame, [0, 10], [18, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: y, left: 60, right: 60, textAlign: 'center', zIndex: 32, opacity: op, transform: `translateY(${ty}px)` }}>
      {linhas.map((l, i) => (
        <div key={i} style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 62, lineHeight: 1.12, WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 3px 14px rgba(0,0,0,0.6)' }}>{l}</div>
      ))}
    </div>
  );
};

// TÍTULO/HOOK do topo — garante "zero texto cortado". O título às vezes chega LONGO (gancho /
// fala inteira da cena); aqui ele vira um HOOK CURTO e LEGÍVEL: (1) limita a ~10 palavras
// (sem cortar palavra no meio — corta em fronteira de palavra e fecha com reticências); (2)
// AUTO-FIT: a fonte encolhe conforme o texto cresce, então sempre cabe em 2 linhas; (3) wrap
// por palavra (overflowWrap) + clamp de 2 linhas como rede de segurança. Não trunca feio.
const TituloTopo: React.FC<{ texto: string; top: number }> = ({ texto, top }) => {
  const limpo = (texto || '').trim();
  if (!limpo) return null;
  // (1) HOOK curto: no máx ~10 palavras, cortando só em fronteira de palavra.
  const palavras = limpo.split(/\s+/).filter(Boolean);
  const MAX_PAL = 10;
  const curto = palavras.length > MAX_PAL ? palavras.slice(0, MAX_PAL).join(' ') + '…' : limpo;
  // (2) AUTO-FIT por comprimento: texto curto = fonte grande; longo = encolhe (até um piso).
  const n = curto.length;
  const fontSize =
    n <= 26 ? 50 :
    n <= 40 ? 44 :
    n <= 56 ? 38 :
    n <= 74 ? 33 : 29;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 56,
        right: 56,
        textAlign: 'center',
        zIndex: 30,
        color: '#fff',
        fontFamily: 'Montserrat, Inter, sans-serif',
        fontWeight: 700,
        fontSize,
        lineHeight: 1.1,
        WebkitTextStroke: '4px #000',
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
        textShadow: '0 2px 10px rgba(0,0,0,0.7)',
        // (3) rede de segurança: quebra por palavra + clamp em 2 linhas (sem cortar no meio).
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        overflow: 'hidden',
        overflowWrap: 'break-word',
        wordBreak: 'normal',
      }}
    >
      {curto}
    </div>
  );
};
