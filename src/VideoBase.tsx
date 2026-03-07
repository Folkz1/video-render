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
const TRANSITION = 20;
const PAUSE = 35;

export const C = {
  bg: '#0a0a0f',
  green: '#00ff88',
  red: '#ff4455',
  blue: '#0088ff',
  yellow: '#ffaa00',
  purple: '#aa44ff',
  cyan: '#00ddff',
  text: '#ffffff',
  sub: '#8899aa',
};

// --- Reusable Components ---

export const FadeOverlay: React.FC<{
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

export const TitleBadge: React.FC<{
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

export const DataPoint: React.FC<{
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

export const BrowserClip: React.FC<{ src: string; totalFrames: number }> = ({ src, totalFrames }) => {
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
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10,10,15,0.4) 100%)',
      }} />
    </AbsoluteFill>
  );
};

export const Watermark: React.FC = () => {
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

export const LowerThird: React.FC = () => {
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

// Generic Intro
export const IntroTitle: React.FC<{
  lines: Array<{ text: string; color?: string }>;
  subtitle?: string;
}> = ({ lines, subtitle = 'GUYFOLKZ' }) => {
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
      }}>{subtitle}</div>
      <div style={{
        fontSize: 52, fontWeight: 900, color: C.text,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        lineHeight: 1.2, maxWidth: 1200,
      }}>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            <span style={{ color: line.color || C.text }}>{line.text}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// --- Video Builder ---

export interface SegmentDef {
  id: string;
  dur: number; // seconds from TTS
  recording: string; // recording filename (without .webm)
}

export interface VideoConfig {
  audioDir: string; // e.g., 'audio-v2'
  recordingDir: string; // e.g., 'recordings-v2'
  segments: SegmentDef[];
  introLines: Array<{ text: string; color?: string }>;
}

export function buildTimeline(segments: SegmentDef[]) {
  const INTRO_FRAMES = 90;
  let cursor = INTRO_FRAMES;

  const timeline: Array<{
    audioId: string; recording: string;
    start: number; audioFrames: number; totalFrames: number;
  }> = [];

  for (const seg of segments) {
    const audioFrames = Math.ceil(seg.dur * FPS);
    const totalFrames = audioFrames + PAUSE + TRANSITION;
    timeline.push({
      audioId: seg.id,
      recording: seg.recording,
      start: cursor,
      audioFrames,
      totalFrames,
    });
    cursor += totalFrames;
  }

  const OUTRO_FRAMES = 150;
  const TOTAL = cursor + OUTRO_FRAMES;

  return { timeline, TOTAL, INTRO_FRAMES, OUTRO_FRAMES };
}

export const VideoComposition: React.FC<{
  config: VideoConfig;
  overlays?: React.ReactNode;
}> = ({ config, overlays }) => {
  const { timeline, TOTAL, INTRO_FRAMES } = buildTimeline(config.segments);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* AMBIENT MUSIC */}
      <Sequence from={0} durationInFrames={TOTAL}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.04} loop />
      </Sequence>

      {/* INTRO */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES + 30}>
        <AbsoluteFill style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <IntroTitle lines={config.introLines} />
        </AbsoluteFill>
      </Sequence>

      {/* INTRO SFX */}
      <Sequence from={5} durationInFrames={90}>
        <Audio src={staticFile('sfx/dramatic.mp3')} volume={0.15} />
      </Sequence>

      {/* SEGMENTS */}
      {timeline.map((seg, i) => (
        <React.Fragment key={seg.audioId}>
          {/* Browser recording */}
          <Sequence from={seg.start} durationInFrames={seg.totalFrames}>
            <BrowserClip
              src={staticFile(`${config.recordingDir}/${seg.recording}.webm`)}
              totalFrames={seg.totalFrames}
            />
            <FadeOverlay mode="in" dur={TRANSITION} />
            <FadeOverlay mode="out" startFrame={seg.totalFrames - TRANSITION} dur={TRANSITION} />
          </Sequence>

          {/* TTS Audio */}
          <Sequence from={seg.start + 8} durationInFrames={seg.audioFrames + 10}>
            <Audio src={staticFile(`${config.audioDir}/${seg.audioId}.mp3`)} volume={0.95} />
          </Sequence>

          {/* Transition SFX */}
          {i > 0 && i % 2 === 0 && (
            <Sequence from={seg.start} durationInFrames={60}>
              <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.10} />
            </Sequence>
          )}

          {/* Notification SFX on data segments */}
          {(seg.audioId === '03-dados' || seg.audioId === '06-prova') && (
            <Sequence from={seg.start + 15} durationInFrames={30}>
              <Audio src={staticFile('sfx/notification.mp3')} volume={0.12} />
            </Sequence>
          )}

          {/* Success SFX on results */}
          {seg.audioId === '07-resultados' && (
            <Sequence from={seg.start + 30} durationInFrames={60}>
              <Audio src={staticFile('sfx/success.mp3')} volume={0.15} />
            </Sequence>
          )}

          {/* Cash SFX on opportunity */}
          {seg.audioId === '08-oportunidade' && (
            <Sequence from={seg.start + 20} durationInFrames={30}>
              <Audio src={staticFile('sfx/cash.mp3')} volume={0.18} />
            </Sequence>
          )}
        </React.Fragment>
      ))}

      {/* Impact SFX at hook */}
      <Sequence from={INTRO_FRAMES} durationInFrames={90}>
        <Audio src={staticFile('sfx/impact.mp3')} volume={0.16} />
      </Sequence>

      {/* Tension on problem */}
      {timeline[1] && (
        <Sequence from={timeline[1].start} durationInFrames={120}>
          <Audio src={staticFile('sfx/tension.mp3')} volume={0.06} />
        </Sequence>
      )}

      {/* Data SFX on dados */}
      {timeline[2] && (
        <Sequence from={timeline[2].start} durationInFrames={90}>
          <Audio src={staticFile('sfx/data.mp3')} volume={0.08} />
        </Sequence>
      )}

      {/* Alert on CTA */}
      {timeline[9] && (
        <Sequence from={timeline[9].start} durationInFrames={60}>
          <Audio src={staticFile('sfx/alert.mp3')} volume={0.12} />
        </Sequence>
      )}

      {/* Custom overlays */}
      {overlays}

      {/* GLOBAL UI */}
      <Sequence from={0} durationInFrames={TOTAL}>
        <Watermark />
      </Sequence>
      <Sequence from={0} durationInFrames={150}>
        <LowerThird />
      </Sequence>
    </AbsoluteFill>
  );
};
