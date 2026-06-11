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
import { WordCaptions } from './components/WordCaptions';
import { CreatorTop } from './components/CreatorTop';
import {
  StatCard,
  KeywordCard,
  BannerCard,
  QuoteCard,
  ChapterCard,
  isEditorialCardTipo,
} from './components/EditorialCards';
import { ExplainerSceneForPlano, isExplainerTipo } from './components/ExplainerScenes';
import { TRANSITIONS } from './kit/transitions';
import { buildMusicVolume, sfxCueWindow } from './kit/musicTrack';
import {
  type CaptionClipProps,
  type Plano,
  captionClipDefaultProps,
} from './CaptionClip';

// ─────────────────────────────────────────────────────────────────────────────
// CaptionWide — o LADO 16:9 (1920x1080) do CaptionClip. Gêmeo horizontal: MESMAS
// props (planos[] tipados incl. cards editoriais stat/keyword/banner/quote/capitulo,
// audio_url da narração, words karaokê, music_url/sfx, paleta/handle/logo, titulo_topo).
// O EDL director produz planos AGNÓSTICOS de aspecto; aqui só REPOSICIONAMOS pro
// landscape: b-roll/Ken Burns cobrindo 1920x1080, cards centralizados com tipografia
// maior, karaokê na faixa inferior (~y 880), handle no canto. Reaproveita os mesmos
// componentes (EditorialCards/WordCaptions/CreatorTop/transições) — não duplica motor.
//
// NÃO altera CaptionClip nem EditorialCards: reusa-os como vêm. Os cards editoriais são
// flex-centrados (inset:0) → centram naturalmente em qualquer canvas; aqui herdam 1920x1080.
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const XF = 8; // frames de crossfade entre planos
const W = 1920;
const H = 1080;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const isMediaPlano = (p: Plano): boolean =>
  !p.tipo || p.tipo === 'imagem' || p.tipo === 'video' ||
  (!isEditorialCardTipo(p.tipo) && !isExplainerTipo(p.tipo) && (!!p.video_url || !!p.imagem_url));

// mídia bruta de UM plano (Ken Burns + punch-in) cobrindo 1920x1080.
const PlanoMedia: React.FC<{ plano: Plano; dur: number; idx: number; darken?: boolean; punch?: boolean }> = ({ plano, dur, idx, darken, punch }) => {
  const frame = useCurrentFrame();
  const kb = plano.kenburns || (idx % 3 === 0 ? 'in' : idx % 3 === 1 ? 'pan' : 'out');
  let scale = 1.1;
  let panX = 0;
  if (kb === 'in') scale = interpolate(frame, [0, dur], [1.05, 1.17], { extrapolateRight: 'clamp' });
  else if (kb === 'out') scale = interpolate(frame, [0, dur], [1.17, 1.05], { extrapolateRight: 'clamp' });
  else panX = interpolate(frame, [0, dur], [-40, 40], { extrapolateRight: 'clamp' }); // pan mais largo no 16:9
  const punchScale = punch && dur > 4 * FPS ? interpolate(frame, [0, dur], [1.0, 1.06], { extrapolateRight: 'clamp' }) : 1;
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale * punchScale}) translateX(${panX}px)`,
    filter: darken ? 'brightness(0.42) saturate(0.9)' : undefined,
  };
  return plano.video_url ? (
    <OffthreadVideo src={resolveSrc(plano.video_url)} muted style={style} />
  ) : (
    <Img src={resolveSrc(plano.imagem_url || '')} style={style} />
  );
};

const EditorialCardForPlano: React.FC<{ plano: Plano; dur: number; accent: string }> = ({ plano, dur, accent }) => {
  const durSec = dur / FPS;
  switch (plano.tipo) {
    case 'stat':
      return <StatCard valor={plano.valor ?? plano.numero ?? ''} texto={plano.texto} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    case 'keyword':
      return <KeywordCard texto={plano.texto ?? plano.keyword ?? ''} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    case 'banner':
      return <BannerCard texto={plano.texto ?? ''} sub={plano.sub} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    case 'quote':
      return <QuoteCard texto={plano.texto ?? ''} autor={plano.sub} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    case 'capitulo':
      return <ChapterCard texto={plano.texto ?? ''} valor={plano.valor} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    case 'fluxo':
    case 'compara':
    case 'grafico':
    case 'timeline':
      return <ExplainerSceneForPlano tipo={plano.tipo} dados={plano.dados} accent={accent} durSec={durSec} fundoSolido={plano.fundo_solido} />;
    default:
      return null;
  }
};

// fundo de UM plano cobrindo 1920x1080. Plano-mídia => Ken Burns; plano-card => backdrop
// (mídia anterior escurecida OU paleta) + card editorial. Entrada por transição do kit OU crossfade.
const PlanoBg: React.FC<{
  plano: Plano;
  backdropPlano?: Plano;
  dur: number;
  idx: number;
  accent: string;
}> = ({ plano, backdropPlano, dur, idx, accent }) => {
  const frame = useCurrentFrame();
  const media = isMediaPlano(plano);

  let containerStyle: React.CSSProperties = {};
  if (idx === 0) {
    containerStyle = { opacity: 1 };
  } else if (plano.transicao && TRANSITIONS[plano.transicao]) {
    const progress = interpolate(frame, [0, XF + 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const pair = TRANSITIONS[plano.transicao](progress, { accent, size: W });
    containerStyle = pair.incoming;
  } else {
    containerStyle = { opacity: interpolate(frame, [0, XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: W,
        height: H,
        overflow: 'hidden',
        backgroundColor: '#05060a',
        ...containerStyle,
      }}
    >
      {media ? (
        <PlanoMedia plano={plano} dur={dur} idx={idx} punch />
      ) : (
        <>
          {!plano.fundo_solido && backdropPlano ? (
            <PlanoMedia plano={backdropPlano} dur={dur} idx={idx} darken />
          ) : !plano.fundo_solido ? (
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 40%, ${accent}1f 0%, #05060a 60%)` }} />
          ) : null}
          <EditorialCardForPlano plano={plano} dur={dur} accent={accent} />
        </>
      )}
    </div>
  );
};

// keyword/numeral LEGADO (planos-mídia sem tipo de card). Centralizado, tipografia maior horizontal.
const KeywordHero: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const scale = interpolate(s, [0, 1], [0.55, 1.0]);
  return (
    <div style={{ position: 'absolute', top: 360, left: 0, width: W, textAlign: 'center', zIndex: 35, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 170, WebkitTextStroke: '11px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{text}</span>
    </div>
  );
};

const NumeralBig: React.FC<{ numero: string; accent: string }> = ({ numero, accent }) => {
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
    <div style={{ position: 'absolute', top: 320, left: 0, width: W, textAlign: 'center', zIndex: 36, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 210, WebkitTextStroke: '13px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], letterSpacing: '-0.03em' }}>{display}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

const TemaFaixa: React.FC<{ linhas: string[]; y: number }> = ({ linhas, y }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ty = interpolate(frame, [0, 10], [18, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: y, left: 120, right: 120, textAlign: 'center', zIndex: 32, opacity: op, transform: `translateY(${ty}px)` }}>
      {linhas.map((l, i) => (
        <div key={i} style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 64, lineHeight: 1.12, WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 3px 14px rgba(0,0,0,0.6)' }}>{l}</div>
      ))}
    </div>
  );
};

export const CaptionWide: React.FC<CaptionClipProps> = (props) => {
  const { audio_url, words, texto, paleta_hex, logo_url, handle, duracao_s, mute_video = true, music_url, sfx, tema_linhas, tema_y = 760, titulo_topo, keyword_hero,
    show_creator_panel = false, creator_url, creator_avatar, creator_live_audio, split_ratio = 0.5,
    voice_windows, silence_windows, sfx_plan, riser_url, sting_url } = props;
  const total = Math.max(1, Math.round((duracao_s ?? 8) * FPS));

  const planos: Plano[] = (props.planos && props.planos.length)
    ? props.planos
    : [{ inicio_s: 0, fim_s: duracao_s, video_url: props.video_url, imagem_url: props.imagem_url, keyword: keyword_hero }];

  const whoosh = sfx?.whoosh;
  const temaIn = 0.6, temaOut = temaIn + 3.6;

  // SPLIT UNIVERSAL no 16:9: painel do criador no topo confina os planos abaixo. No áudio-only
  // (show_creator_panel=false) NÃO há split → planos cobrem 1920x1080 inteiro (caminho do bug).
  const splitY = show_creator_panel ? Math.round(Math.max(0.42, Math.min(0.62, split_ratio)) * H) : 0;
  const captionAnchor = show_creator_panel ? Math.round((splitY + H) / 2) + 30 : 880; // faixa inferior
  const liveAudio = Boolean(show_creator_panel && creator_live_audio);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* CAMADA DE FUNDO: planos trocando no ritmo (mídia OU card editorial), cobrindo 1920x1080 */}
      {planos.map((p, i) => {
        const fromF = Math.max(0, Math.round(p.inicio_s * FPS) - (i === 0 ? 0 : XF));
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS) + (i === 0 ? 0 : XF));
        const backdropPlano = isMediaPlano(p)
          ? undefined
          : planos.slice(0, i).reverse().find((q) => isMediaPlano(q));
        return (
          <Sequence key={`p${i}`} from={fromF} durationInFrames={durF} layout="none">
            <PlanoBg plano={p} backdropPlano={backdropPlano} dur={durF} idx={i} accent={paleta_hex} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade (global) — foco no rodapé pra legenda inferior */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.5) 0%, rgba(4,6,10,0.04) 22%, rgba(4,6,10,0.32) 58%, rgba(4,6,10,0.92) 100%)', zIndex: 5 }} />

      {/* keyword-hero / numeral por plano (LEGADO, planos-mídia) — suprime durante o hook da tese */}
      {planos.map((p, i) => {
        if (isEditorialCardTipo(p.tipo) || isExplainerTipo(p.tipo)) return null;
        const fromF = Math.round(p.inicio_s * FPS);
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS));
        const noHook = Boolean(tema_linhas && tema_linhas.length) && p.inicio_s < temaOut - 0.3;
        if (p.numero && !noHook) {
          return <Sequence key={`n${i}`} from={fromF} durationInFrames={durF} layout="none"><NumeralBig numero={p.numero} accent={paleta_hex} /></Sequence>;
        }
        if (p.keyword && !noHook) {
          return <Sequence key={`k${i}`} from={fromF} durationInFrames={durF} layout="none"><KeywordHero text={p.keyword} accent={paleta_hex} /></Sequence>;
        }
        return null;
      })}

      {/* faixa-tese (entra/sai) */}
      {tema_linhas && tema_linhas.length ? (
        <Sequence from={Math.round(temaIn * FPS)} durationInFrames={Math.max(1, Math.round((temaOut - temaIn) * FPS))} layout="none">
          <TemaFaixa linhas={tema_linhas} y={show_creator_panel ? Math.max(tema_y, splitY + 40) : tema_y} />
        </Sequence>
      ) : null}

      {/* título fixo no topo */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: show_creator_panel ? splitY + 20 : 80, left: 120, right: 120, textAlign: 'center', zIndex: 30, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 700, fontSize: 50, lineHeight: 1.1, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{titulo_topo}</div>
      ) : null}

      {/* legenda CONTÍNUA na faixa inferior — karaokê (amarelo) OU limpa (essay) */}
      {props.caption_style === 'limpa' ? (
        <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={captionAnchor} accent="#FFFFFF" fontSize={56} maxWidth={1400} maxWordsPerGroup={6} variant="limpa" numberPop={false} />
      ) : (
        <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={captionAnchor} accent={paleta_hex} fontSize={92} maxWidth={1500} maxWordsPerGroup={1} variant="solta" numberPop />
      )}

      {/* painel do criador no topo (split universal) — no áudio-only fica desligado */}
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

      {/* ÁUDIO: narração única + trilha + whoosh nos cortes (idêntico ao CaptionClip). */}
      {!liveAudio && mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
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
      {/* SFX plan: riser/sting dos assets do kit nas janelas calculadas (vol 0.3). */}
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

      {/* branding no canto */}
      <div style={{ position: 'absolute', top: 56, left: 64, zIndex: 50, display: 'flex', alignItems: 'center', gap: 16 }}>
        {logo_url ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '8px 14px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logo_url)} style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 34, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{handle}</span>
      </div>

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};

// MESMO contrato de frames do CaptionClip (FPS*duracao_s). Reusa os defaults do CaptionClip
// como base, só ajustando a faixa-tese pro 16:9 (não muda nada estrutural).
export const captionWideDefaultProps: CaptionClipProps = {
  ...captionClipDefaultProps,
  tema_y: 760,
};

export const captionWideParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 8) * FPS));
