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
import { KeywordPop } from './components/KeywordPop';
import { TransitionScene, type EntryAnim } from './kit/sceneTransitions';
import type { SlideDir } from './kit/animationPresets';

// SplitReaction — formato B (split 50/50 permanente): TOPO = rosto do criador (fixo,
// retenção facial + autoridade); BAIXO = b-roll/clip do tema que troca a cada cena;
// legenda karaokê word-by-word na costura. Genérico por nicho (paleta/handle/logo do brand).

const FPS = 30;

// FIEL IA — o clip da fonte tem overlays QUEIMADOS do canal de origem (faixa inferior
// INSCREVA-SE/LIKE/nome + legenda própria da fonte) nos ~13% de baixo. Damos um leve zoom
// e empurramos o vídeo PRA CIMA pra que essa faixa saia do frame. Conservador: o rosto de
// quem fala fica no centro-superior e não é cortado.
const SOURCE_CROP = 0.18; // fração de baixo a remover do frame da fonte (tira banner + legenda própria do canal)
const SOURCE_ZOOM = 1 / (1 - SOURCE_CROP); // ~1.15

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type CenaSplit = {
  kicker?: string;
  texto: string; // fala crua (fallback p/ legenda se words vazio)
  video_url?: string; // b-roll do tema (clip real via /api/v1/clip)
  imagem_url?: string; // fallback: imagem AI 1080x1920
  audio_url: string; // narração da cena (data-uri ou url)
  duracao_s: number;
  words?: WordTiming[]; // timestamps por palavra (relativos ao áudio da cena)
  broll_cta?: string; // overlay opcional no rodapé do b-roll
  logo_url?: string; // logo do nicho p/ "exemplificar" (entra animado quando a fala cita a ferramenta)
  // ── PRESETS de animação (opt-in; default = slideIn sutil de baixo) ──
  // Aplica-se à ENTRADA da faixa de texto da cena (ATO 1 HOOK / ATO 3 COMENTÁRIO).
  // O CORTE (ATO 2 FonteFala) e a estrutura dos atos ficam INTACTOS.
  entrada_anim?: EntryAnim; // 'popIn' | 'slideIn' | 'fade' | 'none'
  entrada_dir?: SlideDir;   // direção do slideIn (default 'up')
};

export type SplitReactionProps = {
  cenas: CenaSplit[];
  creator_url?: string; // clip do criador (topo, contínuo) — OffthreadVideo
  creator_avatar?: string; // fallback: imagem do criador (topo)
  creator_live_audio?: boolean; // gravação real: topo toca o áudio (não muta, não loopa)
  paleta_hex: string;
  logo_url: string;
  handle: string;
  split_ratio?: number; // fração da altura do painel TOPO (0.42-0.62)
  faixa_tese?: string; // título-tese fixo opcional
  sfx_url?: string;
  music_url?: string;
  // ── Sprint 1 (deep-study): enquadramento do criador + ducking de áudio ──
  creator_focus_x?: number; // object-position do rosto (0..1)
  creator_focus_y?: number; // default 0.32 (olhos no terço superior)
  creator_zoom?: number;
  creator_punches?: { from: number; to: number }[]; // janelas (s) de punch-in
  creator_face_keyframes?: { t: number; cx: number; cy: number; scale: number }[]; // face-tracking
  voice_windows?: { from: number; to: number }[]; // janelas (s) com fala → música abaixa (ducking)
  keyword_pops?: { text: string; fromSec: number }[]; // palavras-chave estourando na tela (exemplificar)
  // ── FIEL IA: ATO "a fonte fala" (CORTE em tela cheia) ──
  // Quando presente, o creator_url toca em TELA CHEIA com o ÁUDIO ORIGINAL (muted=false)
  // + legenda limpa da transcrição. Ausente => comportamento atual.
  // words = transcrição do trecho COM timing [{t: seg relativo ao início do clip, text}].
  // Presente => legenda SINCRONIZADA (cada frase de t[i] até t[i+1]); ausente => fallback uniforme.
  fonte_fala?: { dur_s: number; legenda?: string; words?: { t: number; text: string }[] };
  // ── FIEL IA 3-ATOS: HOOK → CORTE → COMENTÁRIO ──
  // hook_n = nº de cenas ANTES do corte (ATO 1 HOOK). As cenas restantes (ATO 3 COMENTÁRIO)
  // renderizam DEPOIS do corte. Ausente/0 => formato atual (todas as cenas, depois fonte_fala).
  hook_n?: number;
};

export const splitReactionDefaultProps: SplitReactionProps = {
  cenas: [
    { kicker: 'REAGINDO', texto: 'Olha o que a IA fez agora', imagem_url: 'https://picsum.photos/1080/1080?10', audio_url: '', duracao_s: 4, words: [] },
  ],
  creator_avatar: 'https://picsum.photos/1080/1080?99',
  paleta_hex: '#2FD4C4',
  logo_url: '',
  handle: '@guyfolkz',
  split_ratio: 0.5,
};

export const cenasSplitParaFrames = (cenas: CenaSplit[]) =>
  (cenas ?? []).reduce((acc, c) => acc + Math.max(1, Math.round((c.duracao_s ?? 3) * FPS)), 0);

// total de frames do SplitReaction = ATO 1 (cenas) + ATO 2 (fonte_fala) quando presente.
export const splitReactionParaFrames = (props: { cenas: CenaSplit[]; fonte_fala?: { dur_s: number } }) =>
  cenasSplitParaFrames(props.cenas) +
  (props.fonte_fala?.dur_s ? Math.max(1, Math.round(props.fonte_fala.dur_s * FPS)) : 0);

const KenBurns: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [1.05, 1.14], { extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, 120], [-8, 8], { extrapolateRight: 'clamp' });
  return <Img src={resolveSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` }} />;
};

// logo do nicho "exemplificando" a fala: entra com mola, glow pulsante e leve float
const LogoBadge: React.FC<{ src: string; accent: string }> = ({ src, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.4, 1]);
  const float = Math.sin(frame / 22) * 6;
  const glow = interpolate(Math.sin(frame / 18), [-1, 1], [0.35, 0.85]);
  return (
    <div style={{ position: 'absolute', top: 28, right: 28, width: 156, height: 156, borderRadius: 30, zIndex: 30, background: 'rgba(8,12,22,0.80)', border: `2px solid ${accent}`, boxShadow: `0 0 ${Math.round(22 * glow)}px ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${scale}) translateY(${float}px)`, opacity: appear }}>
      <Img src={resolveSrc(src)} style={{ width: '62%', height: '62%', objectFit: 'contain' }} />
    </div>
  );
};

const BottomBroll: React.FC<{ cena: CenaSplit; splitY: number; accent: string }> = ({ cena, splitY, accent }) => (
  <>
    <div style={{ position: 'absolute', top: splitY, left: 0, width: 1080, height: 1920 - splitY, overflow: 'hidden', backgroundColor: '#05060a' }}>
      {cena.video_url ? (
        <OffthreadVideo src={resolveSrc(cena.video_url)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <KenBurns src={cena.imagem_url || ''} />
      )}
      {cena.logo_url ? <LogoBadge src={cena.logo_url} accent={accent} /> : null}
      {cena.broll_cta ? (
        // ENTRADA animada da faixa (preset). Default = slideIn sutil de baixo ~12f.
        // Override por cena: cena.entrada_anim / cena.entrada_dir. Aditivo: sem
        // broll_cta, nada muda; o FonteFala (ATO 2) e a estrutura ficam intactos.
        <TransitionScene
          entryAnim={cena.entrada_anim ?? 'slideIn'}
          entryDir={cena.entrada_dir ?? 'up'}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 44 }}
        >
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 38, letterSpacing: '0.04em', WebkitTextStroke: '5px #000', paintOrder: 'stroke fill' }}>{cena.broll_cta.toUpperCase()}</div>
        </TransitionScene>
      ) : null}
    </div>
    <WordCaptions words={cena.words} text={cena.texto} durSec={cena.duracao_s} fromSec={0} anchorY={splitY} accent={accent} fontSize={72} maxWordsPerGroup={2} variant="solta" allCaps />
  </>
);

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

// ── ATO 2 (FIEL IA "a fonte fala") ──
// creator_url em TELA CHEIA (1080x1920, cover) com ÁUDIO ORIGINAL (muted=false) +
// legenda limpa branca (transcrição do trecho, frase a frase via WordCaptions variant="limpa").
// Legenda SINCRONIZADA do trecho da fonte: cada frase aparece de words[i].t até words[i+1].t
// (ou o fim do clip). Estilo limpo/branco (mesma vibe do variant="limpa" do WordCaptions).
const SyncedSourceCaption: React.FC<{ words: { t: number; text: string }[]; durSec: number }> = ({ words, durSec }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // frase ativa = última cujo t já passou
  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if ((words[i]?.t ?? 0) <= t) active = i;
    else break;
  }
  if (active < 0) return null;
  const end = active + 1 < words.length ? words[active + 1].t : durSec;
  if (t >= end) return null; // segurança (não deve ocorrer: active é sempre o último <= t)
  const txt = (words[active]?.text || '').trim();
  if (!txt) return null;
  return (
    <div
      style={{
        position: 'absolute', left: '50%', top: 1500, transform: 'translate(-50%, -50%)',
        width: 920, maxWidth: 920, textAlign: 'center', zIndex: 40,
        fontFamily: 'Montserrat, Poppins, Inter, Segoe UI, sans-serif', fontWeight: 600,
        fontSize: 62, lineHeight: 1.1, color: '#FFFFFF',
        textShadow: '0 2px 8px rgba(0,0,0,0.92), 0 1px 3px rgba(0,0,0,0.97)',
      }}
    >
      {txt}
    </div>
  );
};

const FonteFala: React.FC<{ creator_url?: string; legenda?: string; words?: { t: number; text: string }[]; durSec: number; accent: string }> = ({ creator_url, legenda, words, durSec, accent }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {creator_url ? (
      // leve zoom + empurra pra cima (objectPosition top) p/ tirar a faixa do canal-fonte de baixo
      <OffthreadVideo src={resolveSrc(creator_url)} muted={false} style={{ width: 1080, height: 1920, objectFit: 'cover', objectPosition: '50% 0%', transform: `scale(${SOURCE_ZOOM})`, transformOrigin: 'top center' }} />
    ) : null}
    {/* leve vinheta inferior p/ legibilidade da legenda */}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 620, background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))', zIndex: 20 }} />
    {words && words.length ? (
      <SyncedSourceCaption words={words} durSec={durSec} />
    ) : legenda ? (
      <WordCaptions text={legenda} durSec={durSec} fromSec={0} anchorY={1500} accent={accent} fontSize={62} maxWordsPerGroup={4} variant="limpa" />
    ) : null}
  </AbsoluteFill>
);

export const SplitReaction: React.FC<SplitReactionProps> = (props) => {
  const { cenas, creator_url, creator_avatar, creator_live_audio, paleta_hex, logo_url, handle, split_ratio = 0.5, faixa_tese, sfx_url, music_url, creator_focus_x, creator_focus_y, creator_zoom, creator_punches, creator_face_keyframes, voice_windows, keyword_pops, fonte_fala, hook_n = 0 } = props;
  const splitY = Math.round(clamp(split_ratio, 0.42, 0.62) * 1920);

  // CORTE (fonte_fala) em frames; quando 3-atos (hook_n>0) ele entra ENTRE as cenas.
  const corteFrames = fonte_fala && fonte_fala.dur_s > 0 ? Math.max(1, Math.round(fonte_fala.dur_s * FPS)) : 0;
  const nCenas = (cenas ?? []).length;
  // posição do corte: 3-atos => após `hook_n` cenas; senão (legado) => após TODAS as cenas.
  const corteAfter = hook_n > 0 ? clamp(hook_n, 0, nCenas) : nCenas;

  // Layout: cada cena ganha `from`. As cenas a partir de `corteAfter` são empurradas
  // pela duração do corte (ATO 3 COMENTÁRIO vem DEPOIS do corte).
  let cursor = 0;
  let corteFrom = 0;
  const build = (cenas ?? []).map((cena, i) => {
    if (i === corteAfter) cursor += corteFrames; // abre espaço pro corte antes desta cena
    const dur = Math.max(1, Math.round((cena.duracao_s ?? 3) * FPS));
    const item = { cena, from: cursor, dur };
    cursor += dur;
    return item;
  });
  // corte no fim (legado, corteAfter == nCenas) ou se não houve cena no índice
  corteFrom = corteAfter < build.length ? build[corteAfter].from - corteFrames : cursor;
  if (corteAfter >= nCenas) cursor += corteFrames; // corte ao final ainda não somado
  const totalAll = Math.max(1, cursor); // duração total (ATO 1 + CORTE + ATO 3)

  // janelas de SPLIT (cenas) = tudo MENOS o corte. ATO 1 = [0, corteFrom); ATO 3 = [corteFrom+corteFrames, totalAll).
  const win1 = { from: 0, dur: Math.max(1, corteFrom) };
  const win3from = corteFrom + corteFrames;
  const win3dur = Math.max(0, totalAll - win3from);

  // ducking: música abaixa sob a voz (janelas em s). f começa em 0 quando o Audio entra (from=0).
  const hasVW = Array.isArray(voice_windows) && voice_windows.length > 0;
  const musicVol = hasVW
    ? (f: number) => {
        const t = f / FPS;
        const inVoice = voice_windows!.some((w) => t >= w.from - 0.12 && t < w.to + 0.12);
        return inVoice ? 0.045 : 0.13;
      }
    : 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* TOPO criador (contínuo, fixo) + linha divisória neon — componente reutilizável.
          Renderiza nas janelas de SPLIT (ATO 1 HOOK + ATO 3 COMENTÁRIO); DURANTE o corte
          o creator vira tela cheia (FonteFala). 3-atos: 2 janelas; legado: 1 janela = tudo
          antes do corte final. */}
      {[win1, { from: win3from, dur: win3dur }].filter((w) => w.dur > 0).map((w, wi) => (
        <Sequence key={`topo${wi}`} from={w.from} durationInFrames={w.dur}>
          <CreatorTop
            creator_url={creator_url}
            creator_avatar={creator_avatar}
            creator_live_audio={creator_live_audio}
            handle={handle}
            logo_url={logo_url}
            paleta_hex={paleta_hex}
            splitY={splitY}
            creator_focus_x={creator_focus_x}
            creator_focus_y={creator_focus_y}
            creator_zoom={creator_zoom}
            creator_punches={creator_punches}
            creator_face_keyframes={creator_face_keyframes}
            source_crop={fonte_fala ? SOURCE_CROP : 0}
          />
        </Sequence>
      ))}

      {/* room-tone: leito de presença a ~-44dB sob a voz — mata o "vazio digital" do TTS.
          Só no caminho sintético (a gravação real já tem ambiente próprio). Cobre o vídeo
          inteiro (loop) — não interfere no áudio original do corte. */}
      {!creator_live_audio ? (
        <Sequence from={0} durationInFrames={totalAll}>
          <Audio src={resolveSrc('roomtone.mp3')} volume={0.006} loop />
        </Sequence>
      ) : null}

      {/* música de fundo (com ducking sob a voz). Renderiza nas janelas de SPLIT e SILENCIA
          durante o corte (não vaza sobre o áudio original da fonte). */}
      {music_url
        ? [win1, { from: win3from, dur: win3dur }].filter((w) => w.dur > 0).map((w, wi) => (
            <Sequence key={`mus${wi}`} from={w.from} durationInFrames={w.dur}>
              <Audio src={resolveSrc(music_url)} volume={musicVol} loop />
            </Sequence>
          ))
        : null}

      {/* narração por cena */}
      {build.map((b, i) => (
        <Sequence key={`a${i}`} from={b.from} durationInFrames={b.dur}>
          {b.cena.audio_url ? <Audio src={resolveSrc(b.cena.audio_url)} volume={1} /> : null}
        </Sequence>
      ))}

      {/* SFX whoosh nos cortes (exceto 1ª cena) */}
      {sfx_url
        ? build.slice(1).map((b, i) => (
            <Sequence key={`s${i}`} from={Math.max(0, b.from - 5)} durationInFrames={18}>
              <Audio src={resolveSrc(sfx_url)} volume={0.3} />
            </Sequence>
          ))
        : null}

      {/* BAIXO: b-roll + legenda por cena */}
      {build.map((b, i) => (
        <Sequence key={`v${i}`} from={b.from} durationInFrames={b.dur}>
          <BottomBroll cena={b.cena} splitY={splitY} accent={paleta_hex} />
        </Sequence>
      ))}

      {/* Overlays (handle / faixa-tese / KeywordPop): rendem nas janelas de SPLIT p/ não
          vazarem sobre o corte. Usamos a 1ª janela como base; em 3-atos o handle reaparece
          no ATO 3 via a janela win3 abaixo. Sem fonte_fala, win1 == duração total. */}
      <Sequence from={win1.from} durationInFrames={win1.dur}>
        {/* handle badge — canto superior esquerdo (fora da costura: não colide com a legenda karaokê) */}
        <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 41, color: paleta_hex, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 30, letterSpacing: '0.04em', WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
          {handle.toUpperCase()}
        </div>

        {/* faixa-tese fixa opcional */}
        {faixa_tese ? (
          <div style={{ position: 'absolute', top: 36, left: 60, right: 60, textAlign: 'center', zIndex: 45, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 46, lineHeight: 1.05, fontStyle: 'italic', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill', textShadow: '0 3px 14px rgba(0,0,0,0.6)' }}>
            {faixa_tese}
          </div>
        ) : null}

        {/* KeywordPop: palavra-chave do nicho "estoura" no b-roll no instante em que é falada */}
        {(keyword_pops ?? []).map((kp, i) => (
          <KeywordPop
            key={`kp${i}`}
            text={kp.text}
            fromSec={kp.fromSec}
            accent={paleta_hex}
            y={Math.round(splitY + (1920 - splitY) * 0.42)}
            variant="fill"
          />
        ))}
      </Sequence>

      {/* handle badge também no ATO 3 COMENTÁRIO (3-atos) — a 1ª janela cobre só o HOOK */}
      {win3dur > 0 ? (
        <Sequence from={win3from} durationInFrames={win3dur}>
          <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 41, color: paleta_hex, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 30, letterSpacing: '0.04em', WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
            {handle.toUpperCase()}
          </div>
        </Sequence>
      ) : null}

      {/* CORTE — "a fonte fala": entre HOOK e COMENTÁRIO (3-atos) ou ao final (legado).
          creator_url em tela cheia com
          áudio ORIGINAL + legenda limpa. A música (acima) só vai até `total`, então silencia aqui. */}
      {corteFrames > 0 ? (
        <Sequence from={corteFrom} durationInFrames={corteFrames}>
          <FonteFala creator_url={creator_url} legenda={fonte_fala!.legenda} words={fonte_fala!.words} durSec={fonte_fala!.dur_s} accent={paleta_hex} />
        </Sequence>
      ) : null}

      {/* progress bar cobre o vídeo inteiro (HOOK + CORTE + COMENTÁRIO) */}
      <ProgressBar total={totalAll} accent={paleta_hex} />
    </AbsoluteFill>
  );
};
