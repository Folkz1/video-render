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
  EP01_VERTICAL_A_ROLL_SRC,
  EP01_VERTICAL_FRAMES,
  EP01_VERTICAL_TIMELINE,
  VerticalTimelineSegment,
} from './data/ep01-vertical-timeline';

const accentByChapter: Record<VerticalTimelineSegment['chapter'], string> = {
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
  EP01_VERTICAL_TIMELINE.map((segment) => [segment.id, segment.fromFrame]),
) as Record<string, number>;

const frameOf = (id: string) => timelineMap[id] ?? 0;

const soundEvents = [
  {from: 0, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.24, duration: 52},
  {from: frameOf('vhook-02') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.14, duration: 36},
  {from: frameOf('vhook-03') - 3, file: 'sfx/data.mp3', volume: 0.16, duration: 36},
  {from: frameOf('vhook-04') - 5, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.18, duration: 52},
  {from: frameOf('vcontexto-01') + 28, file: 'sfx/notification.mp3', volume: 0.22, duration: 24},
  {from: frameOf('vvirada-01') - 4, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.15, duration: 42},
  {from: frameOf('vvirada-02') - 4, file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.12, duration: 42},
  {from: frameOf('vproof-01') - 3, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.14, duration: 42},
  {from: frameOf('vproof-02') - 3, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.14, duration: 42},
  {from: frameOf('vjarb-01'), file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 50},
  {from: frameOf('vcta-01') - 5, file: 'sfx/ep01-cta-eleven.mp3', volume: 0.18, duration: 96},
];

const SegmentTransition: React.FC<{accent: string; durationFrames: number}> = ({
  accent,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 7], [0.42, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [durationFrames - 9, durationFrames], [0, 0.28], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.max(intro, outro);
  const sweep = interpolate(frame, [0, durationFrames], [-22, 18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <AbsoluteFill style={{backgroundColor: '#04050a', opacity, pointerEvents: 'none'}} />
      <AbsoluteFill
        style={{
          opacity: opacity * 0.55,
          background: `linear-gradient(145deg, transparent ${16 + sweep}%, ${accent}22 ${30 + sweep}%, transparent ${44 + sweep}%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

const HeaderTag: React.FC<{text?: string; accent: string}> = ({text, accent}) => {
  if (!text) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-block',
        padding: '10px 18px',
        borderRadius: 999,
        border: `1px solid ${accent}66`,
        background: `${accent}18`,
        color: accent,
        fontFamily: 'Inter, Segoe UI, sans-serif',
        fontSize: 24,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
      }}
    >
      {text}
    </div>
  );
};

const HeadlineStack: React.FC<{
  segment: VerticalTimelineSegment;
  accent: string;
  bottom?: number;
}> = ({segment, accent, bottom = 180}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 16, mass: 0.7}});
  const opacity = interpolate(
    frame,
    [0, 7, Math.max(14, segment.durationFrames - 10), segment.durationFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        right: 48,
        bottom,
        zIndex: 20,
        opacity,
        transform: `translateY(${(1 - reveal) * 18}px)`,
      }}
    >
      <div style={{marginBottom: 18}}>
        <HeaderTag text={segment.kicker} accent={accent} />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        {segment.headline.map((line, index) => (
          <div
            key={line}
            style={{
              width: 'fit-content',
              maxWidth: '100%',
              padding: '12px 18px',
              borderRadius: 22,
              border: `2px solid ${index === 0 ? accent : 'rgba(255,255,255,0.12)'}`,
              background: index === 0 ? `${accent}20` : 'rgba(7,9,16,0.74)',
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 58 : 46,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0.2,
              textTransform: 'uppercase',
              boxShadow: index === 0 ? `0 0 40px ${accent}22` : undefined,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      {segment.caption ? (
        <div
          style={{
            marginTop: 18,
            color: '#f4f7fb',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {segment.caption}
        </div>
      ) : null}
    </div>
  );
};

const FaceSegment: React.FC<{segment: VerticalTimelineSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const accent = accentByChapter[segment.chapter];
  const scale = segment.chapter === 'cta'
    ? interpolate(frame, [0, 8, 20], [1.08, 1.04, 1.04], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, 7, 16], [1.1, 1.05, 1.05], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  return (
    <AbsoluteFill style={{backgroundColor: '#040507'}}>
      <OffthreadVideo
        src={staticFile(EP01_VERTICAL_A_ROLL_SRC)}
        startFrom={segment.audioStartFrame}
        endAt={segment.audioEndFrame}
        volume={1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          transform: `scale(${scale})`,
          filter: 'contrast(1.05) saturate(1.03) brightness(0.98)',
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,5,7,0.22) 0%, rgba(4,5,7,0.08) 28%, rgba(4,5,7,0.4) 60%, rgba(4,5,7,0.92) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 120px ${accent}18`,
        }}
      />
      <HeadlineStack segment={segment} accent={accent} bottom={segment.chapter === 'cta' ? 210 : 170} />
      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const ScreenCard: React.FC<{
  segment: VerticalTimelineSegment;
  accent: string;
  cardTop: number;
}> = ({segment, accent, cardTop}) => {
  const frame = useCurrentFrame();
  const cardScale = interpolate(frame, [0, 8, 20], [0.96, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: cardTop,
        left: 44,
        right: 44,
        height: 640,
        borderRadius: 38,
        overflow: 'hidden',
        border: `2px solid ${accent}55`,
        boxShadow: `0 20px 80px ${accent}22`,
        background: '#070912',
        transform: `scale(${cardScale})`,
        zIndex: 12,
      }}
    >
      <OffthreadVideo
        src={staticFile(segment.visualSource!)}
        muted
        startFrom={Math.round((segment.visualTrimBefore ?? 0) * 30)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
};

const ScreenSegment: React.FC<{segment: VerticalTimelineSegment}> = ({segment}) => {
  const accent = accentByChapter[segment.chapter];

  return (
    <AbsoluteFill style={{backgroundColor: '#03040a'}}>
      <Audio
        src={staticFile(EP01_VERTICAL_A_ROLL_SRC)}
        startFrom={segment.audioStartFrame}
        endAt={segment.audioEndFrame}
        volume={1}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 20% 18%, ${accent}20, transparent 36%), linear-gradient(180deg, #05070f 0%, #04060d 100%)`,
        }}
      />
      <ScreenCard segment={segment} accent={accent} cardTop={180} />
      <HeadlineStack segment={segment} accent={accent} bottom={88} />
      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const ProofSegment: React.FC<{segment: VerticalTimelineSegment}> = ({segment}) => {
  const accent = accentByChapter[segment.chapter];

  return (
    <AbsoluteFill style={{backgroundColor: '#03040a'}}>
      <Audio
        src={staticFile(EP01_VERTICAL_A_ROLL_SRC)}
        startFrom={segment.audioStartFrame}
        endAt={segment.audioEndFrame}
        volume={1}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 80% 16%, ${accent}16, transparent 34%), linear-gradient(180deg, #060811 0%, #03040a 100%)`,
        }}
      />
      <ScreenCard segment={segment} accent={accent} cardTop={150} />

      <div
        style={{
          position: 'absolute',
          top: 108,
          right: 46,
          zIndex: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {['PROVA REAL', 'PRODUÇÃO', 'EM OPERAÇÃO'].map((tag, index) => (
          <div
            key={tag}
            style={{
              width: 'fit-content',
              alignSelf: 'flex-end',
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${index === 0 ? accent : 'rgba(255,255,255,0.12)'}`,
              background: index === 0 ? `${accent}1e` : 'rgba(7,9,16,0.66)',
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: 21,
              fontWeight: 800,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </div>
        ))}
      </div>

      <HeadlineStack segment={segment} accent={accent} bottom={84} />
      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const JarbSegment: React.FC<{segment: VerticalTimelineSegment}> = ({segment}) => {
  const accent = accentByChapter[segment.chapter];
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mascotScale = spring({frame, fps, config: {damping: 14, mass: 0.55}});

  return (
    <AbsoluteFill style={{backgroundColor: '#050711'}}>
      <Audio src={staticFile(segment.audioFile!)} volume={1.02} />
      <Audio src={staticFile('sfx/ep01-jarb-eleven.mp3')} volume={0.16} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 18%, ${accent}1c, transparent 34%), linear-gradient(180deg, #060816 0%, #04060f 100%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 50,
          right: 50,
          top: 180,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 12,
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            transform: `scale(${0.92 + mascotScale * 0.08})`,
          }}
        >
          <img
            src={staticFile('brand/jarb-mascot.png')}
            style={{width: '100%', height: '100%', objectFit: 'contain'}}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 48,
          right: 48,
          bottom: 230,
          padding: '24px 28px',
          borderRadius: 34,
          border: `2px solid ${accent}`,
          background: 'rgba(8,10,18,0.88)',
          boxShadow: `0 0 100px ${accent}22`,
          zIndex: 16,
        }}
      >
        <HeaderTag text={segment.kicker} accent={accent} />
        <div
          style={{
            marginTop: 18,
            color: '#fff',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 0.98,
            textTransform: 'uppercase',
          }}
        >
          {segment.headline[0]}
        </div>
      </div>

      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const SegmentRenderer: React.FC<{segment: VerticalTimelineSegment}> = ({segment}) => {
  if (segment.layout === 'jarb') {
    return <JarbSegment segment={segment} />;
  }

  if (segment.layout === 'screen') {
    return <ScreenSegment segment={segment} />;
  }

  if (segment.layout === 'proof') {
    return <ProofSegment segment={segment} />;
  }

  return <FaceSegment segment={segment} />;
};

export const Video12Ep1Vertical: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, EP01_VERTICAL_FRAMES], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={0} durationInFrames={EP01_VERTICAL_FRAMES}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.038} loop />
      </Sequence>

      <Sequence from={0} durationInFrames={Math.min(EP01_VERTICAL_FRAMES, 1500)}>
        <Audio src={staticFile('sfx/tension.mp3')} volume={0.08} loop />
      </Sequence>

      <Sequence from={frameOf('vproof-01')} durationInFrames={360}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={0.026} loop />
      </Sequence>

      {soundEvents.map((event, index) => (
        <Sequence key={`${event.file}-${index}`} from={event.from} durationInFrames={event.duration}>
          <Audio src={staticFile(event.file)} volume={event.volume} />
        </Sequence>
      ))}

      {EP01_VERTICAL_TIMELINE.map((segment) => (
        <Sequence key={segment.id} from={segment.fromFrame} durationInFrames={segment.durationFrames}>
          <SegmentRenderer segment={segment} />
        </Sequence>
      ))}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: 'rgba(255,255,255,0.05)',
          zIndex: 30,
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
