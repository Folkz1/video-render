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
const TRANSITION = 15;
const PAUSE = 20;

export { FPS, TRANSITION, PAUSE };

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
  claude: '#D4A574',
  gold: '#FFD700',
};

// --- Cinema Direction Types ---
export type Mood = 'tenso' | 'didatico' | 'epico' | 'urgente' | 'calmo' | 'revelacao';
export type CutStyle = 'rapido' | 'suave' | 'hard-cut' | 'fade' | 'glitch';
export type SfxType = 'impact' | 'tension' | 'notification' | 'success' | 'cash' | 'typing' | 'whoosh' | 'alert' | 'dramatic' | 'data' | 'none';

export interface LongSegmentDef {
  id: string;
  dur: number;
  recording: string;
  chapter: string;
  mood?: Mood;
  sfx?: SfxType;
  cutStyle?: CutStyle;
}

// --- Reusable Components ---

export const FadeOverlay: React.FC<{
  mode: 'in' | 'out'; startFrame?: number; dur?: number;
}> = ({ mode, startFrame = 0, dur = TRANSITION }) => {
  const frame = useCurrentFrame();
  let opacity: number;
  if (mode === 'in') {
    opacity = interpolate(frame, [0, dur], [1, 0], { extrapolateRight: 'clamp' });
  } else {
    opacity = frame > startFrame
      ? interpolate(frame, [startFrame, startFrame + dur], [0, 1], { extrapolateRight: 'clamp' })
      : 0;
  }
  return <AbsoluteFill style={{ backgroundColor: C.bg, opacity, zIndex: 50 }} />;
};

export const GlitchTransition: React.FC<{ dur?: number }> = ({ dur = 8 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const offset = Math.sin(frame * 3) * 10;
  return (
    <AbsoluteFill style={{ zIndex: 55, opacity }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${C.cyan}11, transparent, ${C.red}11)`,
        transform: `translateX(${offset}px)`,
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '48%', height: 4,
        background: C.cyan, opacity: 0.6,
      }} />
    </AbsoluteFill>
  );
};

export const ChapterTitle: React.FC<{
  title: string; number?: number; accent?: string;
}> = ({ title, number, accent = C.green }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14, mass: 0.5 } });
  const opacity = interpolate(frame, [0, 10, 50, 65], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [5, 30], [0, 400], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      opacity, backgroundColor: `${C.bg}ee`,
      zIndex: 60,
    }}>
      {number !== undefined && (
        <div style={{
          fontSize: 80, fontWeight: 900, color: `${accent}33`,
          fontFamily: 'Inter, Segoe UI, sans-serif',
          position: 'absolute', top: '30%',
          transform: `scale(${scale})`,
        }}>
          {String(number).padStart(2, '0')}
        </div>
      )}
      <div style={{
        width: lineWidth, height: 3, background: accent,
        borderRadius: 2, marginBottom: 20,
      }} />
      <div style={{
        fontSize: 44, fontWeight: 800, color: C.text,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        textTransform: 'uppercase', letterSpacing: 3,
        transform: `scale(${scale})`,
      }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};

export const Scoreboard: React.FC<{
  items: Array<{ label: string; score: number; color: string }>;
  highlight?: number;
}> = ({ items, highlight }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: 20, right: 20, opacity, zIndex: 90,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {items.map((item, i) => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px', borderRadius: 6,
          background: highlight === i ? `${item.color}22` : 'rgba(10,10,15,0.8)',
          border: highlight === i ? `2px solid ${item.color}` : '1px solid #222',
          transition: 'all 0.3s',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: item.color,
          }} />
          <span style={{
            fontSize: 14, fontWeight: 700, color: item.color,
            fontFamily: 'Inter, Segoe UI, sans-serif',
            minWidth: 80,
          }}>{item.label}</span>
          <span style={{
            fontSize: 18, fontWeight: 900, color: C.text,
            fontFamily: 'Inter, Segoe UI, sans-serif',
          }}>{item.score}</span>
        </div>
      ))}
    </div>
  );
};

export const Timer: React.FC<{
  label: string; current: string; color?: string;
}> = ({ label, current, color = C.yellow }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 0.9], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: 20, left: 20, opacity, zIndex: 90,
      padding: '8px 16px', borderRadius: 8,
      background: 'rgba(10,10,15,0.85)', border: `1px solid ${color}33`,
    }}>
      <div style={{
        fontSize: 11, color: C.sub, fontWeight: 600,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        textTransform: 'uppercase', letterSpacing: 2,
      }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 900, color,
        fontFamily: 'Inter, Segoe UI, sans-serif',
      }}>{current}</div>
    </div>
  );
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

export const ProgressBar: React.FC<{
  progress: number; label: string; color?: string;
}> = ({ progress, label, color = C.green }) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, 30], [0, progress], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: 60, right: 60,
      opacity, zIndex: 80,
    }}>
      <div style={{
        fontSize: 14, color: C.sub, marginBottom: 6,
        fontFamily: 'Inter, Segoe UI, sans-serif',
      }}>{label}</div>
      <div style={{
        height: 6, borderRadius: 3, background: '#1a1a2e',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${width}%`, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
        }} />
      </div>
    </div>
  );
};

export const BrowserClip: React.FC<{ src: string; totalFrames: number }> = ({ src, totalFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, totalFrames], [1.02, 1.06], { extrapolateRight: 'clamp' });

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

// --- Long Video Builder ---

export interface LongVideoConfig {
  audioDir: string;
  recordingDir: string;
  segments: LongSegmentDef[];
  introLines: Array<{ text: string; color?: string }>;
  chapters: string[];
  accentColor?: string;
}

export function buildLongTimeline(segments: LongSegmentDef[]) {
  const INTRO_FRAMES = 90;
  let cursor = INTRO_FRAMES;
  let currentChapter = '';
  let chapterNum = 0;

  const timeline: Array<{
    audioId: string; recording: string;
    start: number; audioFrames: number; totalFrames: number;
    chapter: string; chapterStart: boolean; chapterNum: number;
    mood: Mood; sfx: SfxType; cutStyle: CutStyle;
  }> = [];

  for (const seg of segments) {
    const isNewChapter = seg.chapter !== currentChapter;
    if (isNewChapter) {
      if (currentChapter !== '') {
        cursor += 75; // chapter transition frames
      }
      currentChapter = seg.chapter;
      chapterNum++;
    }

    const audioFrames = Math.ceil(seg.dur * FPS);
    const totalFrames = audioFrames + PAUSE + TRANSITION;
    timeline.push({
      audioId: seg.id,
      recording: seg.recording,
      start: cursor,
      audioFrames,
      totalFrames,
      chapter: seg.chapter,
      chapterStart: isNewChapter,
      chapterNum,
      mood: seg.mood || 'didatico',
      sfx: seg.sfx || 'none',
      cutStyle: seg.cutStyle || 'suave',
    });
    cursor += totalFrames;
  }

  const OUTRO_FRAMES = 180;
  const TOTAL = cursor + OUTRO_FRAMES;

  return { timeline, TOTAL, INTRO_FRAMES, OUTRO_FRAMES };
}

const SFX_MAP: Record<SfxType, { file: string; volume: number }> = {
  impact: { file: 'sfx/impact.mp3', volume: 0.16 },
  tension: { file: 'sfx/tension.mp3', volume: 0.06 },
  notification: { file: 'sfx/notification.mp3', volume: 0.12 },
  success: { file: 'sfx/success.mp3', volume: 0.15 },
  cash: { file: 'sfx/cash.mp3', volume: 0.18 },
  typing: { file: 'sfx/typing.mp3', volume: 0.08 },
  whoosh: { file: 'sfx/whoosh.mp3', volume: 0.10 },
  alert: { file: 'sfx/alert.mp3', volume: 0.12 },
  dramatic: { file: 'sfx/dramatic.mp3', volume: 0.15 },
  data: { file: 'sfx/data.mp3', volume: 0.08 },
  none: { file: '', volume: 0 },
};

export const LongVideoComposition: React.FC<{
  config: LongVideoConfig;
  overlays?: React.ReactNode;
}> = ({ config, overlays }) => {
  const { timeline, TOTAL, INTRO_FRAMES } = buildLongTimeline(config.segments);
  const accent = config.accentColor || C.green;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* AMBIENT MUSIC */}
      <Sequence from={0} durationInFrames={TOTAL}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.035} loop />
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

      <Sequence from={5} durationInFrames={90}>
        <Audio src={staticFile('sfx/dramatic.mp3')} volume={0.15} />
      </Sequence>

      {/* SEGMENTS */}
      {timeline.map((seg, i) => (
        <React.Fragment key={seg.audioId}>
          {/* Chapter Title Card */}
          {seg.chapterStart && (
            <Sequence from={seg.start - 75} durationInFrames={75}>
              <ChapterTitle
                title={seg.chapter}
                number={seg.chapterNum}
                accent={accent}
              />
            </Sequence>
          )}

          {/* Browser recording */}
          <Sequence from={seg.start} durationInFrames={seg.totalFrames}>
            <BrowserClip
              src={staticFile(`${config.recordingDir}/${seg.recording}.webm`)}
              totalFrames={seg.totalFrames}
            />
            {seg.cutStyle === 'glitch' ? (
              <GlitchTransition />
            ) : (
              <FadeOverlay mode="in" dur={seg.cutStyle === 'rapido' ? 8 : TRANSITION} />
            )}
            <FadeOverlay mode="out" startFrame={seg.totalFrames - TRANSITION} dur={TRANSITION} />
          </Sequence>

          {/* TTS Audio */}
          <Sequence from={seg.start + 6} durationInFrames={seg.audioFrames + 10}>
            <Audio src={staticFile(`${config.audioDir}/${seg.audioId}.mp3`)} volume={0.95} />
          </Sequence>

          {/* SFX per segment (cinema direction) */}
          {seg.sfx !== 'none' && SFX_MAP[seg.sfx] && (
            <Sequence from={seg.start + 10} durationInFrames={60}>
              <Audio
                src={staticFile(SFX_MAP[seg.sfx].file)}
                volume={SFX_MAP[seg.sfx].volume}
              />
            </Sequence>
          )}

          {/* Whoosh on every 3rd transition */}
          {i > 0 && i % 3 === 0 && (
            <Sequence from={seg.start} durationInFrames={30}>
              <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.08} />
            </Sequence>
          )}
        </React.Fragment>
      ))}

      {/* Custom overlays */}
      {overlays}

      {/* GLOBAL UI */}
      <Sequence from={0} durationInFrames={TOTAL}>
        <Watermark />
      </Sequence>
      <Sequence from={0} durationInFrames={150}>
        <LowerThird />
      </Sequence>

      {/* OUTRO fade */}
      <Sequence from={TOTAL - 180} durationInFrames={180}>
        <FadeOverlay mode="out" startFrame={0} dur={90} />
      </Sequence>
    </AbsoluteFill>
  );
};
