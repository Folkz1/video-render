import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from 'remotion';

const FPS = 30;
const TRANSITION = 25; // crossfade frames
const PAUSE = 40; // pause between segments

// Audio segments with durations (seconds, from filesize at 128kbps)
const AUDIO = [
  { id: '01-hook', dur: 26.8 },
  { id: '02-contexto', dur: 24.2 },
  { id: '03-dados', dur: 25.5 },
  { id: '04-diferenca', dur: 23.7 },
  { id: '05-como-funciona', dur: 29.4 },
  { id: '05b-stack-detail', dur: 29.2 },
  { id: '06-resultados', dur: 21.8 },
  { id: '07-oportunidade', dur: 23.3 },
  { id: '07b-como-comecar', dur: 26.8 },
  { id: '08-cta', dur: 17.7 },
];

// Which Playwright recording goes with each segment
const SCENE_MAP: Record<string, string> = {
  '01-hook': 'data-screen',
  '02-contexto': 'data-screen',
  '03-dados': 'agent-flow',
  '04-diferenca': 'agent-flow',
  '05-como-funciona': 'n8n-site',
  '05b-stack-detail': 'elevenlabs-site',
  '06-resultados': 'results-dashboard',
  '07-oportunidade': 'whatsapp-demo',
  '07b-como-comecar': 'whatsapp-demo',
  '08-cta': 'cta-screen',
};

const C = {
  bg: '#0a0a0f',
  green: '#00ff88',
  red: '#ff4455',
  blue: '#0088ff',
  yellow: '#ffaa00',
  text: '#ffffff',
  sub: '#8899aa',
};

// --- Reusable Components ---

const FadeOverlay: React.FC<{
  mode: 'in' | 'out'; startFrame?: number; dur?: number;
}> = ({ mode, startFrame = 0, dur = TRANSITION }) => {
  const frame = useCurrentFrame();
  let opacity: number;
  if (mode === 'in') {
    opacity = interpolate(frame, [0, dur], [1, 0], { extrapolateRight: 'clamp' });
  } else {
    const s = startFrame;
    opacity = frame > s ? interpolate(frame, [s, s + dur], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  }
  return <AbsoluteFill style={{ backgroundColor: C.bg, opacity, zIndex: 50 }} />;
};

const TitleBadge: React.FC<{
  text: string; sub?: string; color?: string; fadeOut?: number;
}> = ({ text, sub, color = C.green, fadeOut = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const opacity = interpolate(frame, [0, 12, fadeOut - 15, fadeOut], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute', top: 40, left: 60, opacity,
      transform: `scale(${scale})`, zIndex: 80,
    }}>
      <div style={{
        display: 'inline-block', padding: '10px 24px', borderRadius: 8,
        background: `${color}22`, border: `2px solid ${color}44`,
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          fontSize: 28, fontWeight: 800, color,
          fontFamily: 'Inter, Segoe UI, sans-serif',
        }}>{text}</span>
      </div>
      {sub && (
        <div style={{
          fontSize: 18, color: C.sub, marginTop: 8,
          fontFamily: 'Inter, Segoe UI, sans-serif',
        }}>{sub}</div>
      )}
    </div>
  );
};

const DataPoint: React.FC<{
  value: string; label: string; x: number; y: number;
  delay?: number; color?: string;
}> = ({ value, label, x, y, delay = 0, color = C.green }) => {
  const frame = useCurrentFrame();
  const appear = frame - delay;
  const opacity = appear > 0 ? interpolate(appear, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  const ty = appear > 0 ? interpolate(appear, [0, 12], [20, 0], { extrapolateRight: 'clamp' }) : 20;

  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      opacity, transform: `translateY(${ty}px)`, zIndex: 80,
    }}>
      <div style={{
        padding: '12px 20px', borderRadius: 10,
        background: 'rgba(10,10,15,0.85)', border: `1px solid ${color}33`,
      }}>
        <div style={{ fontSize: 36, fontWeight: 900, color, fontFamily: 'Inter, Segoe UI, sans-serif' }}>{value}</div>
        <div style={{ fontSize: 14, color: C.sub, fontFamily: 'Inter, Segoe UI, sans-serif' }}>{label}</div>
      </div>
    </div>
  );
};

const BrowserClip: React.FC<{ src: string; totalFrames: number }> = ({ src, totalFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, totalFrames], [1.02, 1.08], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={src}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10,10,15,0.4) 100%)',
      }} />
    </AbsoluteFill>
  );
};

const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = frame > 90 ? interpolate(frame, [90, 110], [0, 0.8], { extrapolateRight: 'clamp' }) : 0;

  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 40,
      opacity, zIndex: 100,
      fontSize: 13, fontWeight: 600, color: '#556',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      letterSpacing: 2,
    }}>
      DIEGO | @GuyFolkz
    </div>
  );
};

const LowerThird: React.FC = () => {
  const frame = useCurrentFrame();
  const show = frame > 50 && frame < 130;
  const opacity = show ? interpolate(frame, [50, 65, 115, 130], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) : 0;

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 60,
      display: 'flex', alignItems: 'center', gap: 16,
      opacity, zIndex: 100,
    }}>
      <div style={{ width: 4, height: 50, background: C.green, borderRadius: 2 }} />
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, fontFamily: 'Inter, Segoe UI, sans-serif' }}>DIEGO</div>
        <div style={{ fontSize: 16, color: C.green, fontFamily: 'Inter, Segoe UI, sans-serif' }}>@GuyFolkz</div>
      </div>
    </div>
  );
};

// --- Main Composition ---

export const AgentesIA: React.FC = () => {
  // Build timeline
  const INTRO_FRAMES = 90; // 3s intro
  let cursor = INTRO_FRAMES;

  const timeline: Array<{
    audioId: string; recording: string;
    start: number; audioFrames: number; totalFrames: number;
  }> = [];

  for (const seg of AUDIO) {
    const audioFrames = Math.ceil(seg.dur * FPS);
    const totalFrames = audioFrames + PAUSE + TRANSITION;
    timeline.push({
      audioId: seg.id,
      recording: SCENE_MAP[seg.id],
      start: cursor,
      audioFrames,
      totalFrames,
    });
    cursor += totalFrames;
  }

  const OUTRO_FRAMES = 150; // 5s outro
  const TOTAL = cursor + OUTRO_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>

      {/* === INTRO === */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES + 30}>
        <AbsoluteFill style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <IntroTitle />
        </AbsoluteFill>
      </Sequence>

      {/* === SEGMENTS === */}
      {timeline.map((seg, i) => (
        <React.Fragment key={seg.audioId}>
          {/* Browser recording background */}
          <Sequence from={seg.start} durationInFrames={seg.totalFrames}>
            <BrowserClip
              src={staticFile(`recordings/${seg.recording}.webm`)}
              totalFrames={seg.totalFrames}
            />
            <FadeOverlay mode="in" dur={TRANSITION} />
            <FadeOverlay mode="out" startFrame={seg.totalFrames - TRANSITION} dur={TRANSITION} />
          </Sequence>

          {/* TTS Audio */}
          <Sequence from={seg.start + 8} durationInFrames={seg.audioFrames + 10}>
            <Audio src={staticFile(`audio/${seg.audioId}.mp3`)} volume={0.95} />
          </Sequence>

          {/* Whoosh SFX on every other transition */}
          {i > 0 && i % 2 === 0 && (
            <Sequence from={seg.start} durationInFrames={60}>
              <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.12} />
            </Sequence>
          )}
        </React.Fragment>
      ))}

      {/* === SEGMENT OVERLAYS === */}

      {/* 01-hook: Title badge */}
      <Sequence from={timeline[0].start} durationInFrames={100}>
        <TitleBadge text="NVIDIA Q4 2025" sub="Receita recorde no setor de IA" />
      </Sequence>

      {/* 02-contexto: Data strip at bottom */}
      <Sequence from={timeline[1].start} durationInFrames={timeline[1].totalFrames}>
        <DataPoint value="$68B" label="Receita NVIDIA Q4" x={60} y={870} delay={15} color={C.green} />
        <DataPoint value="-16K" label="Demissoes Amazon" x={320} y={870} delay={30} color={C.red} />
        <DataPoint value="40%" label="Apps com agentes IA" x={580} y={870} delay={45} color={C.blue} />
      </Sequence>

      {/* 03-dados: McKinsey badge */}
      <Sequence from={timeline[2].start + 20} durationInFrames={100}>
        <TitleBadge text="AGENTES AUTONOMOS" sub="$3.4 trilhoes em valor economico (McKinsey)" color={C.yellow} />
      </Sequence>

      {/* 05-como-funciona: Stack badge */}
      <Sequence from={timeline[4].start} durationInFrames={100}>
        <TitleBadge text="STACK DO AGENTE" sub="N8N + ElevenLabs + WhatsApp API" color={C.blue} />
      </Sequence>

      {/* 05b-stack-detail: Cost badge */}
      <Sequence from={timeline[5].start + 20} durationInFrames={100}>
        <TitleBadge text="CUSTO TOTAL" sub="Menos de R$200/mes por agente completo" color={C.green} />
      </Sequence>

      {/* 06-resultados: Results badge + data points */}
      <Sequence from={timeline[6].start + 10} durationInFrames={100}>
        <TitleBadge text="RESULTADOS REAIS" sub="Caso real de implementacao B2B" color={C.green} />
      </Sequence>
      <Sequence from={timeline[6].start} durationInFrames={timeline[6].totalFrames}>
        <DataPoint value="+35%" label="Conversao" x={1500} y={120} delay={50} color={C.green} />
        <DataPoint value="5s" label="Resposta" x={1500} y={260} delay={65} color={C.blue} />
        <DataPoint value="-88%" label="Custo operacional" x={1500} y={400} delay={80} color={C.yellow} />
      </Sequence>

      {/* 07-oportunidade: B2B badge */}
      <Sequence from={timeline[7].start + 10} durationInFrames={100}>
        <TitleBadge text="OPORTUNIDADE B2B" sub="R$5-15K por implementacao + recorrencia" color={C.yellow} />
      </Sequence>

      {/* 07b-como-comecar: Steps badge */}
      <Sequence from={timeline[8].start + 10} durationInFrames={100}>
        <TitleBadge text="COMO COMECAR" sub="4 passos para seu primeiro agente" color={C.blue} />
      </Sequence>

      {/* === GLOBAL SFX === */}
      <Sequence from={INTRO_FRAMES} durationInFrames={90}>
        <Audio src={staticFile('sfx/impact.mp3')} volume={0.18} />
      </Sequence>
      <Sequence from={timeline[2].start} durationInFrames={120}>
        <Audio src={staticFile('sfx/tension.mp3')} volume={0.07} />
      </Sequence>
      <Sequence from={timeline[6].start} durationInFrames={90}>
        <Audio src={staticFile('sfx/data.mp3')} volume={0.1} />
      </Sequence>
      <Sequence from={timeline[9].start} durationInFrames={60}>
        <Audio src={staticFile('sfx/alert.mp3')} volume={0.12} />
      </Sequence>

      {/* === GLOBAL UI === */}
      <Sequence from={0} durationInFrames={TOTAL}>
        <Watermark />
      </Sequence>
      <Sequence from={0} durationInFrames={150}>
        <LowerThird />
      </Sequence>
    </AbsoluteFill>
  );
};

// Intro title animation
const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 15, mass: 0.6 } });
  const opacity = interpolate(frame, [0, 15, 70, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ textAlign: 'center', opacity, transform: `scale(${scale})` }}>
      <div style={{
        fontSize: 20, fontWeight: 700, color: C.green,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        letterSpacing: 6, textTransform: 'uppercase', marginBottom: 20,
      }}>GUYFOLKZ</div>
      <div style={{
        fontSize: 56, fontWeight: 900, color: C.text,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        lineHeight: 1.2, maxWidth: 1200,
      }}>
        NVIDIA Faturou <span style={{ color: C.green }}>$68 Bilhoes</span>.
        <br />
        Amazon <span style={{ color: C.red }}>Demitiu 16 Mil</span>.
        <br />
        Isso e <span style={{ color: C.yellow }}>SO o Comeco</span>.
      </div>
    </div>
  );
};
