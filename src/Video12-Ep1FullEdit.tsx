import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C} from './VideoLongBase';
import {
  EP01_A_ROLL_SRC,
  EP01_REAL_EDIT_FRAMES,
  EP01_REAL_EDIT_TIMELINE,
  TimelineSegment,
  secondsToFrames,
} from './data/ep01-real-edit-timeline';

const accentByChapter: Record<TimelineSegment['chapter'], string> = {
  hook: '#ff4d4d',
  contexto: '#ff9f1c',
  virada: '#00d4ff',
  prova: '#7cfc00',
  metodo: '#ffd54a',
  objecao: '#ff7b7b',
  honestidade: '#d9dde5',
  virada_final: '#00ff88',
  cta: '#ffd54a',
};

const timelineMap = Object.fromEntries(
  EP01_REAL_EDIT_TIMELINE.map((segment) => [segment.id, segment.fromFrame]),
) as Record<string, number>;

const frameOf = (id: string) => timelineMap[id] ?? 0;

const soundEvents = [
  {from: 0, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.22, duration: 56},
  {from: frameOf('hook-02') - 3, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.14, duration: 40},
  {from: frameOf('hook-03') - 6, file: 'sfx/data.mp3', volume: 0.14, duration: 42},
  {from: frameOf('hook-04') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.12, duration: 38},
  {from: frameOf('hook-06') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.16, duration: 56},
  {from: frameOf('contexto-01') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.09, duration: 46},
  {from: frameOf('contexto-02'), file: 'sfx/notification.mp3', volume: 0.18, duration: 28},
  {from: frameOf('virada-01') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.11, duration: 44},
  {from: frameOf('virada-02') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.16, duration: 52},
  {from: frameOf('virada-03') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.11, duration: 42},
  {from: frameOf('prova-02') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.13, duration: 48},
  {from: frameOf('prova-07') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.1, duration: 48},
  {from: frameOf('metodo-04'), file: 'sfx/typing.mp3', volume: 0.12, duration: 72},
  {from: frameOf('metodo-06') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.11, duration: 48},
  {from: frameOf('jarb-01'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 54},
  {from: frameOf('jarb-02'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 54},
  {from: frameOf('jarb-03'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 54},
  {from: frameOf('jarb-04'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 54},
  {from: frameOf('virada-final-01') - 6, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.13, duration: 52},
  {from: frameOf('cta-01') - 6, file: 'sfx/ep01-cta-eleven.mp3', volume: 0.18, duration: 96},
  {from: frameOf('cta-02') - 4, file: 'sfx/ep01-cta-eleven.mp3', volume: 0.11, duration: 72},
];

const chapterStartFrames = EP01_REAL_EDIT_TIMELINE.reduce<number[]>((acc, segment, index) => {
  if (index === 0) {
    return acc;
  }

  const previous = EP01_REAL_EDIT_TIMELINE[index - 1];
  if (previous.chapter !== segment.chapter) {
    acc.push(segment.fromFrame);
  }

  return acc;
}, []);

const TransitionMatte: React.FC<{durationFrames: number}> = ({durationFrames}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 8], [0.38, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [durationFrames - 10, durationFrames], [0, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#04050a',
        opacity: Math.max(intro, outro),
        pointerEvents: 'none',
      }}
    />
  );
};

const boxForLayout = (layout: TimelineSegment['visualLayout']) => {
  if (layout === 'pip-right') {
    return {
      position: 'absolute' as const,
      top: 86,
      right: 70,
      width: '42%',
      height: '42%',
      borderRadius: 26,
      overflow: 'hidden',
      boxShadow: '0 18px 60px rgba(0,0,0,0.42)',
    };
  }

  if (layout === 'pip-left') {
    return {
      position: 'absolute' as const,
      top: 86,
      left: 70,
      width: '42%',
      height: '42%',
      borderRadius: 26,
      overflow: 'hidden',
      boxShadow: '0 18px 60px rgba(0,0,0,0.42)',
    };
  }

  return {
    position: 'absolute' as const,
    inset: 0,
  };
};

const OverlayText: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const accent = accentByChapter[segment.chapter];
  const lines = segment.overlayText ?? [];
  const reveal = spring({frame, fps, config: {damping: 14, mass: 0.6}});
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(14, segment.durationFrames - 12), segment.durationFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  if (lines.length === 0 || segment.overlayVariant === 'jarb') {
    return null;
  }

  if (segment.overlayVariant === 'hook') {
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity}}>
        <div
          style={{
            transform: `scale(${0.94 + reveal * 0.06})`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
          }}
        >
          {lines.map((line, index) => (
            <div
              key={line}
              style={{
                opacity: interpolate(frame, [index * 5, index * 5 + 9], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                background: 'rgba(7,9,16,0.76)',
                border: `2px solid ${index === 0 ? accent : 'rgba(255,255,255,0.14)'}`,
                borderRadius: 18,
                padding: '14px 24px',
                color: index === 0 ? accent : '#fff',
                fontFamily: 'Inter, Segoe UI, sans-serif',
                fontSize: index === 0 ? 90 : 60,
                fontWeight: 900,
                letterSpacing: 1,
                textTransform: 'uppercase',
                textShadow: '0 6px 18px rgba(0,0,0,0.52)',
                boxShadow: `0 0 60px ${accent}1f`,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  if (segment.overlayVariant === 'cta') {
    return (
      <AbsoluteFill style={{justifyContent: 'flex-end', opacity}}>
        <div
          style={{
            margin: '0 0 84px 70px',
            maxWidth: 980,
            transform: `translateY(${(1 - reveal) * 18}px)`,
          }}
        >
          {lines.map((line, index) => (
            <div
              key={line}
              style={{
                display: 'inline-block',
                marginBottom: 10,
                padding: '10px 18px',
                background: index === 0 ? `${accent}20` : 'rgba(7,9,16,0.68)',
                border: `2px solid ${index === 0 ? accent : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 16,
                color: index === 0 ? accent : '#fff',
                fontFamily: 'Inter, Segoe UI, sans-serif',
                fontSize: index === 1 ? 68 : 40,
                fontWeight: 900,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  const alignBottom = segment.overlayVariant !== 'stat';

  return (
    <AbsoluteFill
      style={{
        justifyContent: alignBottom ? 'flex-end' : 'flex-start',
        opacity,
      }}
    >
      <div
        style={{
          margin: alignBottom ? '0 0 74px 70px' : '80px 0 0 70px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          transform: `translateY(${(1 - reveal) * 14}px)`,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              width: 'fit-content',
              padding: '10px 16px',
              background: index === 0 ? `${accent}20` : 'rgba(7,9,16,0.62)',
              border: `1px solid ${index === 0 ? accent : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 14,
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: segment.overlayVariant === 'minimal' ? 27 : 33,
              fontWeight: 800,
              letterSpacing: 0.35,
              textTransform: 'uppercase',
              textShadow: '0 4px 12px rgba(0,0,0,0.42)',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ARollSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const accent = accentByChapter[segment.chapter];
  const punchScale =
    segment.chapter === 'hook'
      ? interpolate(frame, [0, 6, 12], [1.06, 1.03, 1.03], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : segment.chapter === 'virada_final'
        ? interpolate(frame, [0, 8, 16], [1.03, 1.015, 1.015], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : interpolate(frame, [0, 8, 14], [1.015, 1.0, 1.0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

  return (
    <AbsoluteFill style={{backgroundColor: '#040507'}}>
      <OffthreadVideo
        src={staticFile(EP01_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          transform: `scale(${punchScale})`,
          filter: 'contrast(1.04) saturate(1.02) brightness(0.99)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 120px ${accent}12`,
        }}
      />
      <OverlayText segment={segment} />
      <TransitionMatte durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const ScreenSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const accent = accentByChapter[segment.chapter];
  const visualBox = boxForLayout(segment.visualLayout);

  return (
    <AbsoluteFill style={{backgroundColor: '#03040a'}}>
      <Audio
        src={staticFile(EP01_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
      />

      <div
        style={{
          ...visualBox,
          border: segment.visualLayout === 'full' ? 'none' : `2px solid ${accent}55`,
          background: '#03040a',
        }}
      >
        <OffthreadVideo
          src={staticFile(segment.visualSource!)}
          muted
          startFrom={secondsToFrames(segment.visualTrimBefore ?? 0)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1)',
          }}
        />
      </div>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(3,4,10,0.18) 0%, rgba(3,4,10,0.14) 45%, rgba(3,4,10,0.5) 100%)',
        }}
      />
      <OverlayText segment={segment} />
      <TransitionMatte durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const JarbSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const accent = accentByChapter[segment.chapter];
  const mascotScale = spring({frame, fps: 30, config: {damping: 13, mass: 0.55}});
  const bubbleOpacity = interpolate(frame, [0, 7, segment.durationFrames], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lines = segment.overlayText ?? [];

  return (
    <AbsoluteFill style={{backgroundColor: '#050711'}}>
      <Audio src={staticFile(segment.audioFile!)} volume={1.04} />
      <Audio src={staticFile('sfx/ep01-jarb-eleven.mp3')} volume={0.12} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 45%, ${accent}18, transparent 35%), linear-gradient(135deg, rgba(5,7,17,0.98), rgba(5,7,17,1))`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 44,
          bottom: 48,
          width: 430,
          height: 430,
          transform: `scale(${0.9 + mascotScale * 0.1})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 24,
            borderRadius: '50%',
            background: `${accent}12`,
            filter: 'blur(12px)',
          }}
        />
        <img
          src={staticFile('brand/jarb-mascot.png')}
          style={{position: 'relative', width: '100%', height: '100%', objectFit: 'contain'}}
        />
      </div>
      {lines.some((line) => line.includes('?')) ? (
        <div
          style={{
            position: 'absolute',
            left: 350,
            top: 160,
            width: 74,
            height: 74,
            borderRadius: '50%',
            background: `${accent}22`,
            border: `2px solid ${accent}`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 46,
            fontWeight: 900,
            boxShadow: `0 0 40px ${accent}44`,
          }}
        >
          ?
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          right: 74,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 1120,
          maxWidth: '62%',
          border: `2px solid ${accent}`,
          borderRadius: 28,
          background: 'rgba(8,10,18,0.88)',
          padding: '24px 28px',
          boxShadow: `0 0 140px ${accent}1f`,
          opacity: bubbleOpacity,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 4,
            color: accent,
            marginBottom: 18,
            textTransform: 'uppercase',
          }}
        >
          JARB
        </div>
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              color: '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 56 : 34,
              lineHeight: 1.08,
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: index === lines.length - 1 ? 0 : 10,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <TransitionMatte durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const SegmentRenderer: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  if (segment.kind === 'jarb') {
    return <JarbSegment segment={segment} />;
  }

  if (segment.kind === 'screen') {
    return <ScreenSegment segment={segment} />;
  }

  return <ARollSegment segment={segment} />;
};

export const Video12Ep1FullEdit: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, EP01_REAL_EDIT_FRAMES], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={0} durationInFrames={EP01_REAL_EDIT_FRAMES}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.035} loop />
      </Sequence>

      <Sequence from={0} durationInFrames={secondsToFrames(97)}>
        <Audio src={staticFile('sfx/tension.mp3')} volume={0.075} loop />
      </Sequence>

      <Sequence from={frameOf('virada-02')} durationInFrames={secondsToFrames(160)}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.025} loop />
      </Sequence>

      <Sequence from={frameOf('cta-01')} durationInFrames={secondsToFrames(42)}>
        <Audio src={staticFile('sfx/dramatic.mp3')} volume={0.11} loop />
      </Sequence>

      {soundEvents.map((event, index) => (
        <Sequence key={`${event.file}-${index}`} from={event.from} durationInFrames={event.duration}>
          <Audio src={staticFile(event.file)} volume={event.volume} />
        </Sequence>
      ))}

      {chapterStartFrames.map((fromFrame, index) => (
        <Sequence key={`chapter-whoosh-${index}`} from={fromFrame} durationInFrames={46}>
          <Audio src={staticFile('sfx/ep01-whoosh-eleven.mp3')} volume={0.11} />
        </Sequence>
      ))}

      {EP01_REAL_EDIT_TIMELINE.map((segment) => (
        <Sequence key={segment.id} from={segment.fromFrame} durationInFrames={segment.durationFrames}>
          <SegmentRenderer segment={segment} />
        </Sequence>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 8,
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff4d4d, #ffd54a 55%, #00ff88)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
