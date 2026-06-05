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
import { KeywordPop } from './components/KeywordPop';
import { CreatorTop } from './components/CreatorTop';
import {
  type CaptionClipProps,
  type Plano,
  captionClipParaFrames,
} from './CaptionClip';

// CaptionBold — variação ESTÉTICA do CaptionClip (MESMO contrato de props).
// O backend manda exatamente os mesmos props do CaptionClip; aqui só muda o LOOK:
//  • Tipografia MAIOR, bold, centralizada (legenda karaokê grande no miolo).
//  • Faixas de cor SÓLIDAS alternando (block bars accent/preto) atrás da legenda,
//    em vez do lower-third sutil — estética "punch" tipo MrBeast/Hormozi.
//  • KeywordPop mais AGRESSIVO (pill/fill com overshoot + shake) por plano,
//    no lugar do KeywordHero/NumeralBig discretos.
// Reusa o mesmo motor de b-roll multi-plano (Ken Burns + crossfade + whoosh),
// o mesmo CaptionClipProps e os componentes WordCaptions + KeywordPop.

const FPS = 30;
const XF = 8; // crossfade entre planos
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

// usa os defaults do CaptionClip pra manter contrato idêntico
export { captionClipDefaultProps as captionBoldDefaultProps } from './CaptionClip';
export const captionBoldParaFrames = captionClipParaFrames;

// fundo de UM plano — Ken Burns + leve dessaturação/escurecimento pra a tipografia
// bold "queimar" por cima. topOffset>0 confina o plano abaixo do painel do criador.
const PlanoBg: React.FC<{ plano: Plano; dur: number; idx: number; topOffset?: number }> = ({ plano, dur, idx, topOffset = 0 }) => {
  const frame = useCurrentFrame();
  const kb = plano.kenburns || (idx % 3 === 0 ? 'in' : idx % 3 === 1 ? 'pan' : 'out');
  let scale = 1.12;
  let panX = 0;
  if (kb === 'in') scale = interpolate(frame, [0, dur], [1.06, 1.2], { extrapolateRight: 'clamp' });
  else if (kb === 'out') scale = interpolate(frame, [0, dur], [1.2, 1.06], { extrapolateRight: 'clamp' });
  else panX = interpolate(frame, [0, dur], [-30, 30], { extrapolateRight: 'clamp' });
  const fadeIn = idx === 0 ? 1 : interpolate(frame, [0, XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const style: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: `scale(${scale}) translateX(${panX}px)`,
    filter: 'saturate(1.05) contrast(1.08) brightness(0.82)',
  };
  return (
    <div style={{ position: 'absolute', top: topOffset, left: 0, width: 1080, height: 1920 - topOffset, overflow: 'hidden', opacity: fadeIn, backgroundColor: '#05060a' }}>
      {plano.video_url ? (
        <OffthreadVideo src={resolveSrc(plano.video_url)} muted style={style} />
      ) : (
        <Img src={resolveSrc(plano.imagem_url || '')} style={style} />
      )}
    </div>
  );
};

// faixa SÓLIDA atrás da legenda — alterna accent / preto conforme o índice do plano,
// entrando com um swipe horizontal. É a assinatura visual deste formato.
const ColorBar: React.FC<{ accent: string; even: boolean; y: number }> = ({ accent, even, y }) => {
  const frame = useCurrentFrame();
  const sw = interpolate(frame, [0, 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute', top: y - 150, left: 0, width: 1080, height: 300,
        background: even ? accent : '#0b0d12',
        opacity: 0.92,
        transform: `scaleX(${sw})`,
        transformOrigin: even ? 'left center' : 'right center',
        zIndex: 25,
        boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
      }}
    />
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

// faixa-tese GRANDE bold centralizada (entra/sai) — substitui o TemaFaixa itálico.
const TeseBold: React.FC<{ linhas: string[]; accent: string; y: number }> = ({ linhas, accent, y }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.78, 1]);
  const op = interpolate(frame, [0, 8, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: y, left: 40, right: 40, textAlign: 'center', zIndex: 34, opacity: op, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      {linhas.map((l, i) => (
        <div key={i} style={{ display: 'inline-block', margin: '6px 4px', padding: '6px 18px', background: i % 2 === 0 ? accent : '#fff', color: '#05060a', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 76, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '-0.02em', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>{l}</div>
      ))}
    </div>
  );
};

export const CaptionBold: React.FC<CaptionClipProps> = (props) => {
  const { audio_url, words, texto, paleta_hex, logo_url, handle, duracao_s, mute_video = true, music_url, sfx, tema_linhas, tema_y = 1080, titulo_topo, keyword_hero,
    show_creator_panel = false, creator_url, creator_avatar, creator_live_audio, split_ratio = 0.5 } = props;
  const total = captionBoldParaFrames(props);

  // CreatorTop é opcional aqui também — importa só quando precisar (lazy via require evita ciclo).
  // Mantemos o split universal coerente com CaptionClip.
  const planos: Plano[] = (props.planos && props.planos.length)
    ? props.planos
    : [{ inicio_s: 0, fim_s: duracao_s, video_url: props.video_url, imagem_url: props.imagem_url, keyword: keyword_hero }];

  const whoosh = sfx?.whoosh;
  const temaIn = 0.5, temaOut = temaIn + 3.4;

  const splitY = show_creator_panel ? Math.round(clamp(split_ratio, 0.42, 0.62) * 1920) : 0;
  // âncora da legenda: no centro da metade útil (split) ou um pouco abaixo do centro.
  const captionAnchor = show_creator_panel ? Math.round((splitY + 1920) / 2) + 30 : 1080;
  const barY = captionAnchor;
  const liveAudio = Boolean(show_creator_panel && creator_live_audio);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* CAMADA DE FUNDO: planos trocando no ritmo */}
      {planos.map((p, i) => {
        const fromF = Math.max(0, Math.round(p.inicio_s * FPS) - (i === 0 ? 0 : XF));
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS) + (i === 0 ? 0 : XF));
        return (
          <Sequence key={`p${i}`} from={fromF} durationInFrames={durF} layout="none">
            <PlanoBg plano={p} dur={durF} idx={i} topOffset={splitY} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade (mais escuro embaixo pra faixa+legenda) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.62) 0%, rgba(4,6,10,0.08) 26%, rgba(4,6,10,0.55) 60%, rgba(4,6,10,0.94) 100%)', zIndex: 5 }} />

      {/* faixa SÓLIDA atrás da legenda — alterna cor por plano, na janela de cada plano */}
      {planos.map((p, i) => {
        const fromF = Math.round(p.inicio_s * FPS);
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS));
        return (
          <Sequence key={`bar${i}`} from={fromF} durationInFrames={durF} layout="none">
            <ColorBar accent={paleta_hex} even={i % 2 === 0} y={barY} />
          </Sequence>
        );
      })}

      {/* KeywordPop AGRESSIVO por plano — pill/fill alternando, só fora do hook (evita empilhar texto) */}
      {planos.map((p, i) => {
        const fromF = Math.round(p.inicio_s * FPS);
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS));
        const noHook = Boolean(tema_linhas && tema_linhas.length) && p.inicio_s < temaOut - 0.3;
        const term = p.numero || p.keyword;
        if (!term || noHook) return null;
        return (
          <Sequence key={`kp${i}`} from={fromF} durationInFrames={durF} layout="none">
            <KeywordPop
              text={term}
              accent={paleta_hex}
              fromSec={0}
              durSec={Math.min(1.6, durF / FPS)}
              x={540}
              y={show_creator_panel ? splitY + 130 : 470}
              fontSize={p.numero ? 168 : 128}
              variant={i % 2 === 0 ? 'fill' : 'pill'}
              tiltDeg={i % 2 === 0 ? -3 : 3}
            />
          </Sequence>
        );
      })}

      {/* faixa-tese bold (hook, entra/sai) */}
      {tema_linhas && tema_linhas.length ? (
        <Sequence from={Math.round(temaIn * FPS)} durationInFrames={Math.max(1, Math.round((temaOut - temaIn) * FPS))} layout="none">
          <TeseBold linhas={tema_linhas} accent={paleta_hex} y={show_creator_panel ? Math.max(splitY + 50, tema_y - 120) : 760} />
        </Sequence>
      ) : null}

      {/* título topo (opcional) */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: show_creator_panel ? splitY + 20 : 150, left: 50, right: 50, textAlign: 'center', zIndex: 30, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 50, lineHeight: 1.08, textTransform: 'uppercase', WebkitTextStroke: '5px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{titulo_topo}</div>
      ) : null}

      {/* legenda karaokê GRANDE bold centralizada, em cima da faixa sólida */}
      <WordCaptions
        words={words}
        text={texto}
        durSec={duracao_s}
        fromSec={0}
        anchorY={captionAnchor}
        accent="#05060a"
        fontSize={104}
        maxWordsPerGroup={3}
        variant="solta"
        numberPop
        allCaps
      />

      {/* painel do criador no topo (split universal) — mesmo CreatorTop dos outros formatos */}
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

      {/* ÁUDIO: narração única + trilha + whoosh nos cortes */}
      {!liveAudio && mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
      {music_url ? (
        <Audio
          src={resolveSrc(music_url)}
          volume={(f) => interpolate(f, [0, 12, total - 24, total], [0, 0.13, 0.13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}
      {whoosh
        ? planos.slice(1).map((p, i) => (
            <Sequence key={`w${i}`} from={Math.max(0, Math.round(p.inicio_s * FPS) - 4)} durationInFrames={16} layout="none">
              <Audio src={resolveSrc(whoosh)} volume={0.4} />
            </Sequence>
          ))
        : null}

      {/* branding */}
      <div style={{ position: 'absolute', top: 70, left: 56, zIndex: 50, display: 'flex', alignItems: 'center', gap: 16 }}>
        {logo_url ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '8px 14px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logo_url)} style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 34, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{handle}</span>
      </div>

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};
