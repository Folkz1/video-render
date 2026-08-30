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
import { buildMusicVolume, type SilenceWindow, type VoiceWindow } from './kit/musicTrack';

// ReactSplit — formato SHORT REACT 9:16 (1080x1920) a partir de GRAVAÇÃO DE TELA do criador.
// Diferença-chave vs TalkingHeadShort: aqui o creatorVideoUrl é uma TELA 16:9 (o criador
// compartilha a tela e reage/ensina, com a câmera dele embutida num canto do próprio screencast).
// Essa tela NUNCA é substituída (é o conteúdo) — fica SEMPRE VISÍVEL no TOPO, escalada a 1080 de
// largura (16:9 ⇒ ~608 de altura), ancorada em cima. O FUNDO é a própria tela borrada+escurecida
// (evita barra preta chapada). A METADE DE BAIXO é um PAINEL de b-roll: as cutaways[] (imagens/
// vídeos do acervo ancorados na palavra dita) aparecem ali, SEM cobrir a tela do topo. A karaokê
// (WordCaptions) fica na faixa inferior. Recebe as MESMAS props do modo gravação que a
// TalkingHeadShort recebe (creatorVideoUrl, creatorLiveAudio, words[], cutaways[], enfases[], etc.).
//
// SYNC: o áudio é o próprio <OffthreadVideo> da tela do topo (creatorLiveAudio) — Remotion
// sincroniza por frame; não há offset manual. A cópia BORRADA do fundo toca MUDA (mesma fonte,
// mesmo frame) pra não duplicar o áudio. B-roll e karaokê seguem os timestamps das words.

const FPS = 30;
const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type WordTimingT = WordTiming;

export type ReactSplitProps = {
  creatorVideoUrl: string; // gravação de TELA 16:9 do criador (áudio real; câmera embutida num canto)
  creatorLiveAudio?: boolean; // default true (toca o áudio da gravação de tela)
  creatorFocusY?: number; // aceito por compatibilidade de props; a tela 16:9 encaixa sem corte (não usado no crop)
  words?: WordTiming[]; // legenda karaokê word-by-word; vazio ⇒ sem legenda
  texto?: string; // fallback da legenda quando words vazio
  cutaways?: {
    startSec: number;
    durSec: number;
    videoUrl?: string;
    imageUrl?: string;
    label?: string;
  }[]; // b-roll que ILUSTRA a fala — aparece no PAINEL de baixo (não cobre a tela do topo)
  enfases?: { texto: string; startSec: number; durSec?: number }[]; // destaques pontuais
  paleta?: string[]; // [fundo, destaque, texto]
  handle?: string; // @ no topo
  logoUrl?: string; // logo badge no topo
  faixaTese?: string; // tese no cold-open (~3s)
  // ── Áudio (trilha + SFX): acabamento "editado"; todos opcionais — ausentes = só a voz da tela. ──
  music_url?: string;
  sfx_whoosh?: string;
  voice_windows?: VoiceWindow[];
  silence_windows?: SilenceWindow[];
  music_dips?: { atSec: number; durSec: number; rampSec: number }[];
  room_tone?: boolean;
  durTotalSec: number; // duração total (durationInFrames = durTotalSec*30)
};

const DEFAULT_PALETA = ['#0A0F1C', '#12E29A', '#FFFFFF'];

// ── Geometria do layout (canvas 1080x1920) ──
// Tela 16:9 no topo: largura 1080 ⇒ altura 1080*9/16 = 607.5 ≈ 608. Ancorada com respiro do topo
// (branding acima dela). Painel de b-roll ocupa a metade de baixo, sob a tela; karaokê no rodapé.
const SCREEN_W = 1080;
const SCREEN_H = 608;           // 1080 * 9/16 (16:9 encaixa sem corte)
const SCREEN_TOP = 300;         // AREA SEGURA: os ~230px do topo sao zona morta da UI do app (IG/TikTok) — a tela comeca ABAIXO disso
const SCREEN_BOTTOM = SCREEN_TOP + SCREEN_H; // 908
const PANEL_MARGIN_X = 40;
const PANEL_X = PANEL_MARGIN_X;               // 40
const PANEL_W = 1080 - PANEL_MARGIN_X * 2;    // 1000
const PANEL_TOP = SCREEN_BOTTOM + 24;         // 932
const PANEL_BOTTOM = 1400;                     // rodape ~400px tambem e' UI do app: b-roll para antes
const PANEL_H = PANEL_BOTTOM - PANEL_TOP;      // 468
const KARAOKE_ANCHOR_Y = 1462;                 // faixa inferior, ACIMA da zona de UI do rodape (~1520+)

export const reactSplitDefaultProps: ReactSplitProps = {
  creatorVideoUrl: '',
  creatorLiveAudio: true,
  creatorFocusY: 0.5,
  words: [],
  texto: 'e foi assim que a gente resolveu isso em dois cliques',
  cutaways: [
    { startSec: 5, durSec: 4, imageUrl: 'https://picsum.photos/1280/720?41', label: 'DEMO' },
    { startSec: 16, durSec: 4, imageUrl: 'https://picsum.photos/1280/720?42' },
  ],
  enfases: [{ texto: 'DOIS CLIQUES', startSec: 2, durSec: 1.6 }],
  paleta: DEFAULT_PALETA,
  handle: '@guyfolkz',
  logoUrl: '',
  faixaTese: '',
  durTotalSec: 30,
};

export const reactSplitParaFrames = (p: { durTotalSec?: number }) =>
  Math.max(1, Math.round((p?.durTotalSec ?? 1) * FPS));

// ── Fundo: a PRÓPRIA tela do criador escalada pra COBRIR 1080x1920, com blur forte + escurecida.
// Evita a barra preta chapada acima/abaixo da tela 16:9. Toca MUDA (o áudio vem da tela nítida do
// topo — mesma fonte, mesmo frame). ──
const BlurBackground: React.FC<{ src: string; bg: string }> = ({ src, bg }) => (
  <AbsoluteFill style={{ backgroundColor: bg, zIndex: 0 }}>
    {src ? (
      <OffthreadVideo
        src={resolveSrc(src)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(42px) brightness(0.34)', transform: 'scale(1.18)' }}
      />
    ) : null}
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${bg}cc 0%, ${bg}55 30%, ${bg}55 68%, ${bg}dd 100%)` }} />
  </AbsoluteFill>
);

// ── Tela do criador (topo, SEMPRE visível, NUNCA substituída): 16:9 encaixa sem corte no box
// 1080x608, com moldura arredondada e borda accent sutil pra "assentar" a tela sobre o fundo. ──
const CreatorScreen: React.FC<{ src: string; live: boolean; accent: string }> = ({ src, live, accent }) => {
  // SEM crop e SEM punch-in (QA Diego): objectFit 'contain' mostra a tela 16:9 INTEIRA dentro do
  // box — a camera do criador no CANTO fica 100% visivel. scale fixo (1.0): nada corta as bordas.
  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN_TOP,
        left: 0,
        width: SCREEN_W,
        height: SCREEN_H,
        overflow: 'hidden',
        zIndex: 10,
        backgroundColor: '#05060a',
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
      }}
    >
      {src ? (
        <OffthreadVideo
          src={resolveSrc(src)}
          muted={!live}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : null}
      {/* borda accent sutil no rodapé da tela = costura visual com o painel de baixo */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: accent, boxShadow: `0 0 18px ${accent}aa` }} />
    </div>
  );
};

// ── PainelCutaway: b-roll que ILUSTRA a fala, dentro do painel da metade de baixo. Entra/sai
// suave, com Ken Burns leve, borda accent e cantos arredondados. Imagem em contain (sobre cópia
// borrada) pra nunca cortar retrato/landscape; vídeo em cover. NÃO cobre a tela do topo. ──
const PanelCutaway: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
  label?: string;
  durFrames: number;
  accent: string;
}> = ({ videoUrl, imageUrl, label, durFrames, accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, durFrames - 8, durFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, durFrames], [1.04, 1.12], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: PANEL_X,
        top: PANEL_TOP,
        width: PANEL_W,
        height: PANEL_H,
        borderRadius: 28,
        overflow: 'hidden',
        opacity,
        zIndex: 30,
        backgroundColor: '#05060a',
      }}
    >
      {videoUrl ? (
        <OffthreadVideo src={resolveSrc(videoUrl)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale.toFixed(4)})` }} />
      ) : imageUrl ? (
        <>
          {/* fundo BORRADO preenchendo (evita corte feio de retrato/landscape forçado em cover) */}
          <Img
            src={resolveSrc(imageUrl)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(0.5)', transform: `scale(${(scale + 0.08).toFixed(4)})` }}
          />
          {/* frente: imagem INTEIRA (contain), sem corte */}
          <Img
            src={resolveSrc(imageUrl)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${scale.toFixed(4)})` }}
          />
        </>
      ) : null}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 28, border: `4px solid ${accent}`, boxShadow: `inset 0 0 44px ${accent}44`, pointerEvents: 'none' }} />
      {label ? (
        <div style={{ position: 'absolute', top: 22, left: 26, padding: '9px 20px', borderRadius: 8, background: 'rgba(5,6,10,0.8)', border: `2px solid ${accent}`, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

// ── Painel VAZIO (sem b-roll no instante): só a moldura sutil deixando o FUNDO BORRADO aparecer
// (nada de card chapado). Fica SEMPRE atrás das cutaways; quando uma cutaway entra, ela cobre. ──
const PanelFrame: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    style={{
      position: 'absolute',
      left: PANEL_X,
      top: PANEL_TOP,
      width: PANEL_W,
      height: PANEL_H,
      borderRadius: 28,
      zIndex: 20,
      border: `2px solid ${accent}40`,
      boxShadow: `inset 0 0 60px rgba(0,0,0,0.45)`,
      background: 'linear-gradient(180deg, rgba(5,6,10,0.10) 0%, rgba(5,6,10,0.28) 100%)',
      pointerEvents: 'none',
    }}
  />
);

// ── Ênfase pontual: palavra-chave que estoura acima da legenda (só quando NÃO há karaokê word-level) ──
const EnfasePop: React.FC<{ texto: string; accent: string }> = ({ texto, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.55, 1]);
  const op = interpolate(frame, [0, 5, Math.max(6, durationInFrames - 8), durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 480, zIndex: 45 }}>
      <div style={{ opacity: op, transform: `scale(${scale}) rotate(-3deg)`, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            background: 'rgba(6,8,12,0.86)',
            border: `3px solid ${accent}`,
            borderRadius: 24,
            padding: '12px 36px',
            boxShadow: `0 0 34px ${accent}66, 0 12px 34px rgba(0,0,0,0.55)`,
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 900,
            fontSize: 78,
            lineHeight: 1.0,
            color: accent,
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
            textAlign: 'center',
            maxWidth: 940,
            whiteSpace: 'nowrap',
          }}
        >
          {texto}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Cold open: tese sobreposta nos primeiros ~3s ──
const ColdOpenTitle: React.FC<{ text: string; accent: string; textColor: string }> = ({ text, accent, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 260, opacity, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.62) 100%)', zIndex: 70 }}>
      <div style={{ maxWidth: 960, textAlign: 'center', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 78, lineHeight: 1.1, color: textColor, transform: `scale(${scale})`, textShadow: `0 4px 22px rgba(0,0,0,0.75), 0 0 30px ${accent}44`, padding: '0 60px' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ── Progress bar ──
const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, total], [0, 100], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.12)', zIndex: 60 }}>
      <div style={{ width: `${p}%`, height: '100%', background: accent, boxShadow: `0 0 12px ${accent}` }} />
    </div>
  );
};

// ── "Silêncio-pontuação": envelope de MUSIC DIPS (idêntico ao TalkingHeadShort) ──
const DIP_FLOOR = 0.125; // ~-18dB
const DIP_ATTACK_S = 0.15;
const buildMusicDipGain = (
  dips: { atSec: number; durSec: number; rampSec: number }[] | undefined,
  fps: number,
) => (f: number): number => {
  if (!Array.isArray(dips) || dips.length === 0) return 1;
  const t = f / fps;
  let gain = 1;
  for (const d of dips) {
    const dropStart = d.atSec - d.durSec;
    const attackEnd = dropStart + DIP_ATTACK_S;
    const rampEnd = d.atSec + Math.max(0, d.rampSec ?? 0.6);
    let g = 1;
    if (t < dropStart) g = 1;
    else if (t < attackEnd) {
      g = interpolate(t, [dropStart, attackEnd], [1, DIP_FLOOR], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    } else if (t < d.atSec) g = DIP_FLOOR;
    else if (t < rampEnd) {
      g = interpolate(t, [d.atSec, rampEnd], [DIP_FLOOR, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    } else g = 1;
    gain = Math.min(gain, g);
  }
  return gain;
};

export const ReactSplit: React.FC<ReactSplitProps> = (props) => {
  const {
    creatorVideoUrl,
    creatorLiveAudio = true,
    words = [],
    texto,
    cutaways = [],
    enfases = [],
    paleta,
    handle = '',
    logoUrl = '',
    faixaTese = '',
    music_url,
    sfx_whoosh,
    voice_windows,
    silence_windows,
    music_dips,
    room_tone = true,
    durTotalSec,
  } = props;

  const [bg, accent, textColor] = [paleta?.[0] ?? DEFAULT_PALETA[0], paleta?.[1] ?? DEFAULT_PALETA[1], paleta?.[2] ?? DEFAULT_PALETA[2]];
  const total = reactSplitParaFrames(props);
  const showEnfases = words.length === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* FUNDO: cópia BORRADA+escurecida da tela cobrindo 1080x1920 (evita barra preta chapada) */}
      <BlurBackground src={creatorVideoUrl} bg={bg} />

      {/* TELA do criador (topo, SEMPRE visível, NUNCA substituída) — é o conteúdo. Áudio real. */}
      {creatorVideoUrl ? <CreatorScreen src={creatorVideoUrl} live={creatorLiveAudio} accent={accent} /> : null}

      {/* PAINEL de b-roll (metade de baixo): moldura sutil deixando o fundo borrado aparecer */}
      <PanelFrame accent={accent} />

      {/* CUTAWAYS: b-roll que ILUSTRA a fala aparece NO PAINEL (não cobre a tela do topo).
          Mesma lógica de timing das cutaways da TalkingHeadShort (startSec/durSec ancorados na fala). */}
      {(cutaways ?? []).map((cw, i) => {
        const from = Math.max(0, Math.round((cw.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((cw.durSec ?? 1) * FPS));
        return (
          <Sequence key={`cw${i}`} from={from} durationInFrames={durFrames}>
            <PanelCutaway videoUrl={cw.videoUrl} imageUrl={cw.imageUrl} label={cw.label} durFrames={durFrames} accent={accent} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade da faixa inferior (karaokê) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 74%, rgba(4,6,10,0.85) 100%)', zIndex: 15, pointerEvents: 'none' }} />

      {/* COLD OPEN: tese nos ~3s iniciais */}
      {faixaTese ? (
        <Sequence from={0} durationInFrames={90}>
          <ColdOpenTitle text={faixaTese} accent={accent} textColor={textColor} />
        </Sequence>
      ) : null}

      {/* ÊNFASES pontuais (só quando não há karaokê word-level) */}
      {showEnfases ? (enfases ?? []).map((enf, i) => {
        const from = Math.max(0, Math.round((enf.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((enf.durSec ?? 1.6) * FPS));
        return (
          <Sequence key={`enf${i}`} from={from} durationInFrames={durFrames}>
            <EnfasePop texto={enf.texto} accent={accent} />
          </Sequence>
        );
      }) : null}

      {/* KARAOKÊ word-by-word (faixa inferior, mesmo estilo/accent da TalkingHeadShort) */}
      {(words.length > 0 || texto) ? (
        <WordCaptions
          words={words}
          text={texto}
          durSec={durTotalSec}
          fromSec={0}
          anchorY={KARAOKE_ANCHOR_Y}
          accent={accent}
          fontSize={82}
          maxWordsPerGroup={1}
          variant="solta"
          numberPop
        />
      ) : null}

      {/* BRANDING: logo + handle no topo esquerdo (acima da tela) */}
      <div style={{ position: 'absolute', top: 250, left: 48, zIndex: 50, display: 'flex', alignItems: 'center', gap: 14 }}>
        {logoUrl ? (
          <div style={{ background: '#fff', borderRadius: 14, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logoUrl)} style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        {handle ? (
          <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 30, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{handle}</span>
        ) : null}
      </div>

      {/* ÁUDIO: a VOZ vem do próprio vídeo da TELA (CreatorScreen, live). Por baixo: trilha de fundo
          (loop) com DUCKING sob a fala + room-tone leve + whoosh na entrada de cada cutaway. */}
      {music_url ? (
        <Audio
          src={resolveSrc(music_url)}
          loop
          volume={(() => {
            const ducking = buildMusicVolume({
              fps: FPS,
              totalFrames: total,
              voiceWindows: voice_windows,
              silenceWindows: silence_windows,
              duckVoice: 0.02,  // QA Diego: trilha DISCRETA sob a fala (antes 0.07)
              duckPause: 0.04,  // base ~0.03-0.04 nas pausas (antes 0.17 = alto demais)
            });
            const dipGain = buildMusicDipGain(music_dips, FPS);
            return (f: number) => ducking(f) * dipGain(f);
          })()}
        />
      ) : null}
      {room_tone ? (
        <Sequence from={0} durationInFrames={total} layout="none">
          <Audio src={resolveSrc('roomtone.mp3')} volume={0.006} loop />
        </Sequence>
      ) : null}
      {sfx_whoosh
        ? (cutaways ?? []).map((cw, i) => (
            <Sequence
              key={`wh${i}`}
              from={Math.max(0, Math.round((cw.startSec ?? 0) * FPS) - 4)}
              durationInFrames={16}
              layout="none"
            >
              <Audio src={resolveSrc(sfx_whoosh)} volume={0.12} />
            </Sequence>
          ))
        : null}

      <ProgressBar total={total} accent={accent} />
    </AbsoluteFill>
  );
};
