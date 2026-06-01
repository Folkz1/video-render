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

// CaptionClip — formato A (monolayer). MULTI-PLANO: o b-roll troca no ritmo da fala
// (cada chunk = 1 plano cortado), enquanto a narração é ÚNICA e a legenda karaokê é
// CONTÍNUA por cima de todos os planos. Trilha de fundo + whoosh nos cortes. Faixa-tese
// e numeral/keyword entram e saem nas janelas certas. Retrocompat: sem planos[] → 1 plano.

const FPS = 30;
const XF = 8; // frames de crossfade entre planos

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type Plano = {
  inicio_s: number;
  fim_s: number;
  tipo?: string;
  video_url?: string;
  imagem_url?: string;
  numero?: string; // numeral gigante nesta janela
  keyword?: string; // keyword-hero nesta janela
  kenburns?: 'in' | 'out' | 'pan';
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
  logo_url: string;
  handle: string;
  duracao_s: number;
  mute_video?: boolean;
  music_url?: string;
  sfx?: { whoosh?: string; ding?: string; pop?: string; riser?: string; impact?: string };
  tema_linhas?: string[]; // faixa-tese (entra/sai)
  tema_y?: number;
  titulo_topo?: string;
  keyword_hero?: string; // keyword global (fallback se nenhum plano tem keyword)
  circulo_em?: { start: number; end: number }[];
};

export const captionClipDefaultProps: CaptionClipProps = {
  planos: [],
  imagem_url: 'https://picsum.photos/1080/1920?7',
  audio_url: '',
  words: [],
  texto: 'caraca esse cara vale trinta milhões agora',
  paleta_hex: '#FFD400',
  logo_url: '',
  handle: '@fiel.ia',
  duracao_s: 8,
  mute_video: true,
};

export const captionClipParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 8) * FPS));

// fundo de UM plano (Ken Burns; nenhum plano fica 100% estático)
const PlanoBg: React.FC<{ plano: Plano; dur: number; idx: number }> = ({ plano, dur, idx }) => {
  const frame = useCurrentFrame();
  const kb = plano.kenburns || (idx % 3 === 0 ? 'in' : idx % 3 === 1 ? 'pan' : 'out');
  let scale = 1.1;
  let panX = 0;
  if (kb === 'in') scale = interpolate(frame, [0, dur], [1.05, 1.17], { extrapolateRight: 'clamp' });
  else if (kb === 'out') scale = interpolate(frame, [0, dur], [1.17, 1.05], { extrapolateRight: 'clamp' });
  else panX = interpolate(frame, [0, dur], [-26, 26], { extrapolateRight: 'clamp' });
  const fadeIn = idx === 0 ? 1 : interpolate(frame, [0, XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const style: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` };
  return (
    <AbsoluteFill style={{ opacity: fadeIn, backgroundColor: '#05060a' }}>
      {plano.video_url ? (
        <OffthreadVideo src={resolveSrc(plano.video_url)} muted style={style} />
      ) : (
        <Img src={resolveSrc(plano.imagem_url || '')} style={style} />
      )}
    </AbsoluteFill>
  );
};

const KeywordHero: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const scale = interpolate(s, [0, 1], [0.55, 1.0]);
  return (
    <div style={{ position: 'absolute', top: 640, left: 0, width: 1080, textAlign: 'center', zIndex: 35, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 150, WebkitTextStroke: '10px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{text}</span>
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
    <div style={{ position: 'absolute', top: 560, left: 0, width: 1080, textAlign: 'center', zIndex: 36, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 180, WebkitTextStroke: '12px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], letterSpacing: '-0.03em' }}>{display}</span>
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
  const { audio_url, words, texto, paleta_hex, logo_url, handle, duracao_s, mute_video = true, music_url, sfx, tema_linhas, tema_y = 1080, titulo_topo, keyword_hero, circulo_em } = props;
  const total = captionClipParaFrames(props);

  // monta a lista de planos (multi) ou cai no single (retrocompat)
  const planos: Plano[] = (props.planos && props.planos.length)
    ? props.planos
    : [{ inicio_s: 0, fim_s: duracao_s, video_url: props.video_url, imagem_url: props.imagem_url, keyword: keyword_hero }];

  const whoosh = sfx?.whoosh;

  // faixa-tese entra ~0.6s e sai ~3.5s antes do fim (não fica congelada o vídeo todo)
  const temaIn = 0.6, temaOut = Math.max(temaIn + 2, duracao_s - 3.2);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* CAMADA DE FUNDO: planos trocando no ritmo */}
      {planos.map((p, i) => {
        const fromF = Math.max(0, Math.round(p.inicio_s * FPS) - (i === 0 ? 0 : XF));
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS) + (i === 0 ? 0 : XF));
        return (
          <Sequence key={`p${i}`} from={fromF} durationInFrames={durF} layout="none">
            <PlanoBg plano={p} dur={durF} idx={i} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade (global) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.5) 0%, rgba(4,6,10,0.06) 24%, rgba(4,6,10,0.48) 62%, rgba(4,6,10,0.92) 100%)', zIndex: 5 }} />

      {/* keyword-hero / numeral por plano (na janela do plano que pede) */}
      {planos.map((p, i) => {
        const fromF = Math.round(p.inicio_s * FPS);
        const durF = Math.max(1, Math.round((p.fim_s - p.inicio_s) * FPS));
        if (p.numero) {
          return <Sequence key={`n${i}`} from={fromF} durationInFrames={durF} layout="none"><NumeralBig numero={p.numero} accent={paleta_hex} /></Sequence>;
        }
        if (p.keyword) {
          return <Sequence key={`k${i}`} from={fromF} durationInFrames={durF} layout="none"><KeywordHero text={p.keyword} accent={paleta_hex} /></Sequence>;
        }
        return null;
      })}

      {/* faixa-tese (entra/sai) */}
      {tema_linhas && tema_linhas.length ? (
        <Sequence from={Math.round(temaIn * FPS)} durationInFrames={Math.max(1, Math.round((temaOut - temaIn) * FPS))} layout="none">
          <TemaFaixa linhas={tema_linhas} y={tema_y} />
        </Sequence>
      ) : null}

      {/* título fixo no topo */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: 150, left: 60, right: 60, textAlign: 'center', zIndex: 30, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 700, fontSize: 44, lineHeight: 1.1, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{titulo_topo}</div>
      ) : null}

      {/* legenda karaokê CONTÍNUA (uma só, cobre todos os planos) */}
      <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={1440} accent={paleta_hex} fontSize={86} maxWordsPerGroup={1} variant="solta" numberPop />

      {/* ÁUDIO: narração única + trilha (vol baixo, fades) + whoosh nos cortes */}
      {mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
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
        <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 32, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{handle}</span>
      </div>

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
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
