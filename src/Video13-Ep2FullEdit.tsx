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
import {C, ChapterTitle} from './VideoLongBase';
import {
  EP02_A_ROLL_SRC,
  EP02_REAL_EDIT_FRAMES,
  EP02_REAL_EDIT_TIMELINE,
  OverlayPlacement,
  TimelineSegment,
  secondsToFrames,
} from './data/ep02-real-edit-timeline';

const accentByChapter: Record<TimelineSegment['chapter'], string> = {
  hook: '#ff4d4d',
  problema: '#ff9f1c',
  virada: '#00d4ff',
  prova: '#00ff88',
  metodo: '#ffd54a',
  reflexao: '#7cfcff',
  aplicacao: '#7cfc00',
  honestidade: '#d9dde5',
  cta: '#ffd54a',
  fecho: '#00ff88',
};

const chapterTitles: Record<TimelineSegment['chapter'], string> = {
  hook: 'O Gargalo',
  problema: 'O Caos',
  virada: 'A Lista',
  prova: 'A Prova',
  metodo: 'O Sistema',
  reflexao: 'A Habilidade',
  aplicacao: 'Aplicação',
  honestidade: 'Ajuste Fino',
  cta: 'Diagnóstico',
  fecho: 'Novo Modelo',
};

const timelineMap = Object.fromEntries(
  EP02_REAL_EDIT_TIMELINE.map((segment) => [segment.id, segment.fromFrame]),
) as Record<string, number>;

const frameOf = (id: string) => timelineMap[id] ?? 0;

const soundEvents = [
  {from: 0, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.18, duration: 52},
  {from: frameOf('hook-02') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.14, duration: 48},
  {from: frameOf('problema-02') - 3, file: 'sfx/notification.mp3', volume: 0.16, duration: 34},
  {from: frameOf('jarb-01'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.15, duration: 48},
  {from: frameOf('virada-01') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.1, duration: 44},
  {from: frameOf('prova-01') - 4, file: 'sfx/data.mp3', volume: 0.12, duration: 48},
  {from: frameOf('prova-04') - 4, file: 'sfx/success.mp3', volume: 0.12, duration: 42},
  {from: frameOf('jarb-02'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.15, duration: 48},
  {from: frameOf('metodo-card-01') - 3, file: 'sfx/typing.mp3', volume: 0.1, duration: 64},
  {from: frameOf('metodo-02') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.1, duration: 44},
  {from: frameOf('jarb-03'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.15, duration: 48},
  {from: frameOf('cta-01') - 5, file: 'sfx/ep01-cta-eleven.mp3', volume: 0.16, duration: 86},
  {from: frameOf('fecho-01') - 4, file: 'sfx/success.mp3', volume: 0.12, duration: 42},
];

const chapterStartFrames = EP02_REAL_EDIT_TIMELINE.reduce<number[]>((acc, segment, index) => {
  if (index === 0) {
    return acc;
  }

  const previous = EP02_REAL_EDIT_TIMELINE[index - 1];
  if (previous.chapter !== segment.chapter) {
    acc.push(segment.fromFrame);
  }

  return acc;
}, []);

const TransitionMatte: React.FC<{durationFrames: number}> = ({durationFrames}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 8], [0.36, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [durationFrames - 10, durationFrames], [0, 0.24], {
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

const placementBox = (placement: OverlayPlacement = 'left-center') => {
  switch (placement) {
    case 'right-center':
      return {
        position: 'absolute' as const,
        right: 64,
        top: '50%',
        transform: 'translateY(-50%)',
        maxWidth: 620,
        alignItems: 'flex-end' as const,
      };
    case 'top-left':
      return {
        position: 'absolute' as const,
        left: 64,
        top: 110,
        maxWidth: 620,
        alignItems: 'flex-start' as const,
      };
    case 'top-right':
      return {
        position: 'absolute' as const,
        right: 64,
        top: 110,
        maxWidth: 620,
        alignItems: 'flex-end' as const,
      };
    case 'bottom-left':
      return {
        position: 'absolute' as const,
        left: 64,
        bottom: 82,
        maxWidth: 620,
        alignItems: 'flex-start' as const,
      };
    case 'bottom-right':
      return {
        position: 'absolute' as const,
        right: 64,
        bottom: 82,
        maxWidth: 620,
        alignItems: 'flex-end' as const,
      };
    case 'left-center':
    default:
      return {
        position: 'absolute' as const,
        left: 64,
        top: '50%',
        transform: 'translateY(-50%)',
        maxWidth: 620,
        alignItems: 'flex-start' as const,
      };
  }
};

const ChapterPill: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const accent = accentByChapter[segment.chapter];
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 60, 74], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 34,
        left: 44,
        padding: '10px 18px',
        borderRadius: 16,
        background: 'rgba(7,9,16,0.72)',
        border: `1px solid ${accent}`,
        color: accent,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 1.2,
        opacity,
      }}
    >
      {chapterTitles[segment.chapter]}
    </div>
  );
};

const RepeatBurst: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const words = segment.echoText ?? [];
  if (words.length === 0) {
    return null;
  }

  const accent = accentByChapter[segment.chapter];
  const anchor = placementBox(segment.echoPlacement ?? 'right-center');

  return (
    <div
      style={{
        ...anchor,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {words.map((word, index) => {
        const opacity = interpolate(frame, [index * 5, index * 5 + 8, index * 5 + 34], [0, 0.94, 0.35], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const translateX = interpolate(frame, [index * 5, index * 5 + 10], [20, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={`${word}-${index}`}
            style={{
              opacity,
              transform: `translateX(${translateX}px) rotate(${index % 2 === 0 ? -4 : 3}deg)`,
              padding: '10px 18px',
              borderRadius: 16,
              border: `2px solid ${accent}`,
              background: `${accent}18`,
              color: accent,
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 44 : 34,
              fontWeight: 900,
              boxShadow: `0 0 32px ${accent}22`,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
};

const OverlayText: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const accent = accentByChapter[segment.chapter];
  const lines = segment.overlayText ?? [];
  const reveal = spring({frame, fps, config: {damping: 13, mass: 0.6}});
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(12, segment.durationFrames - 14), segment.durationFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  if (lines.length === 0 || segment.overlayVariant === 'jarb') {
    return null;
  }

  const anchor = placementBox(segment.overlayPlacement);

  if (segment.overlayVariant === 'hook') {
    return (
      <div
        style={{
          ...anchor,
          opacity,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          transform: anchor.transform ? `${anchor.transform} translateY(${(1 - reveal) * 10}px)` : `translateY(${(1 - reveal) * 10}px)`,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              width: 'fit-content',
              maxWidth: 760,
              padding: '14px 20px',
              borderRadius: 18,
              background: 'rgba(7,9,16,0.86)',
              border: `2px solid ${index === 0 ? accent : 'rgba(255,255,255,0.16)'}`,
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 60 : 40,
              fontWeight: 900,
              lineHeight: 1.05,
              boxShadow: `0 0 42px ${accent}1a`,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    );
  }

  if (segment.overlayVariant === 'cta') {
    return (
      <div
        style={{
          ...anchor,
          opacity,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          transform: anchor.transform ? `${anchor.transform} translateY(${(1 - reveal) * 12}px)` : `translateY(${(1 - reveal) * 12}px)`,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              width: 'fit-content',
              maxWidth: 760,
              padding: '12px 18px',
              borderRadius: 16,
              background: index === 1 ? `${accent}22` : 'rgba(7,9,16,0.78)',
              border: `2px solid ${index === 1 ? accent : 'rgba(255,255,255,0.14)'}`,
              color: index === 1 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 1 ? 56 : 34,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        ...anchor,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transform: anchor.transform ? `${anchor.transform} translateY(${(1 - reveal) * 12}px)` : `translateY(${(1 - reveal) * 12}px)`,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={line}
          style={{
            width: 'fit-content',
            maxWidth: 760,
            padding: '10px 16px',
            borderRadius: 14,
            background: index === 0 ? `${accent}20` : 'rgba(7,9,16,0.72)',
            border: `1px solid ${index === 0 ? accent : 'rgba(255,255,255,0.12)'}`,
            color: index === 0 ? accent : '#fff',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: segment.overlayVariant === 'minimal' ? 28 : 33,
            fontWeight: 800,
            lineHeight: 1.1,
            textAlign: anchor.alignItems === 'flex-end' ? 'right' : 'left',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const VideoSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const accent = accentByChapter[segment.chapter];
  const baseZoom = segment.zoom ?? (segment.layout === 'face' ? 1.06 : 1.01);
  const animatedZoom = interpolate(frame, [0, segment.durationFrames], [baseZoom, baseZoom + 0.015], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#040507'}}>
      <OffthreadVideo
        src={staticFile(EP02_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition:
            segment.objectPosition ?? (segment.layout === 'face' ? '68% center' : 'center center'),
          transform: `scale(${animatedZoom})`,
          filter:
            segment.layout === 'screen'
              ? 'contrast(1.05) saturate(1.04)'
              : 'contrast(1.03) saturate(1.02)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            segment.chapter === 'problema'
              ? 'linear-gradient(180deg, rgba(4,5,10,0.18), rgba(4,5,10,0.2), rgba(255,80,80,0.1))'
              : 'radial-gradient(circle at center, rgba(0,0,0,0) 46%, rgba(0,0,0,0.48) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 120px ${accent}12`,
        }}
      />
      <ChapterPill segment={segment} />
      <OverlayText segment={segment} />
      <RepeatBurst segment={segment} />
      <TransitionMatte durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const CardSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const accent = accentByChapter[segment.chapter];
  const moveX = interpolate(frame, [0, 12], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#060813'}}>
      <Audio
        src={staticFile(EP02_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 20% 20%, ${accent}18, transparent 30%), linear-gradient(135deg, #060813, #0b1020)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 44,
          borderRadius: 34,
          border: `1px solid ${accent}22`,
          background: 'rgba(8,11,22,0.72)',
          boxShadow: `0 0 100px ${accent}12`,
        }}
      />
      <ChapterPill segment={segment} />
      <div
        style={{
          position: 'absolute',
          left: 82,
          top: '50%',
          transform: `translateY(-50%) translateX(${moveX}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 960,
        }}
      >
        {(segment.overlayText ?? []).map((line, index) => (
          <div
            key={line}
            style={{
              width: 'fit-content',
              padding: '14px 20px',
              borderRadius: 18,
              background: index === 0 ? `${accent}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${index === 0 ? accent : 'rgba(255,255,255,0.08)'}`,
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 54 : 34,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 86,
          top: 140,
          width: 360,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {['Pesquisa', 'Execução', 'Memória', 'Workflow'].map((label, index) => (
          <div
            key={label}
            style={{
              padding: '16px 18px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${index === 0 ? accent : 'rgba(255,255,255,0.08)'}`,
              color: index === 0 ? accent : '#d9dde5',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <TransitionMatte durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const JarbSegment: React.FC<{segment: TimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const accent = accentByChapter[segment.chapter];
  const reveal = spring({frame, fps, config: {damping: 12, mass: 0.55}});
  const lines = segment.overlayText ?? [];

  return (
    <AbsoluteFill style={{backgroundColor: '#050711'}}>
      <Audio src={staticFile(segment.audioFile!)} volume={1} />
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
          left: 48,
          bottom: 48,
          width: 380,
          height: 380,
          transform: `scale(${0.92 + reveal * 0.08})`,
        }}
      >
        <img
          src={staticFile('brand/jarb-mascot.png')}
          style={{width: '100%', height: '100%', objectFit: 'contain'}}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 72,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 1040,
          maxWidth: '62%',
          padding: '24px 28px',
          borderRadius: 28,
          border: `2px solid ${accent}`,
          background: 'rgba(8,10,18,0.9)',
          boxShadow: `0 0 120px ${accent}18`,
        }}
      >
        <div
          style={{
            color: accent,
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 4,
            marginBottom: 18,
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
              fontSize: index === 0 ? 50 : 32,
              lineHeight: 1.08,
              fontWeight: 900,
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

  if (segment.kind === 'card') {
    return <CardSegment segment={segment} />;
  }

  return <VideoSegment segment={segment} />;
};

export const Video13Ep2FullEdit: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {soundEvents.map((event, index) => (
        <Sequence key={`${event.file}-${index}`} from={Math.max(0, event.from)} durationInFrames={event.duration}>
          <Audio src={staticFile(event.file)} volume={event.volume} />
        </Sequence>
      ))}

      {chapterStartFrames.map((fromFrame, index) => (
        <Sequence key={`chapter-${index}`} from={Math.max(0, fromFrame - 36)} durationInFrames={44}>
          <Audio src={staticFile('sfx/ep01-whoosh-eleven.mp3')} volume={0.1} />
        </Sequence>
      ))}

      {chapterStartFrames.map((fromFrame, index) => {
        const segment = EP02_REAL_EDIT_TIMELINE.find((item) => item.fromFrame === fromFrame);
        if (!segment) {
          return null;
        }

        return (
          <Sequence key={`title-${segment.chapter}-${index}`} from={Math.max(0, fromFrame - 48)} durationInFrames={48}>
            <ChapterTitle
              title={chapterTitles[segment.chapter]}
              number={index + 2}
              accent={accentByChapter[segment.chapter]}
            />
          </Sequence>
        );
      })}

      <Sequence from={0} durationInFrames={48}>
        <ChapterTitle title={chapterTitles.hook} number={1} accent={accentByChapter.hook} />
      </Sequence>

      {EP02_REAL_EDIT_TIMELINE.map((segment) => (
        <Sequence key={segment.id} from={segment.fromFrame} durationInFrames={segment.durationFrames}>
          <SegmentRenderer segment={segment} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
