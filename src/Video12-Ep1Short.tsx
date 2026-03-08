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
  BuiltShortDefinition,
  BuiltShortSegment,
  EP01_SHORT_A_ROLL_SRC,
  EP01_SHORTS_MAP,
} from './data/ep01-shorts-data';

type ShortProps = {
  shortId: string;
};

type SoundEvent = {
  from: number;
  file: string;
  volume: number;
  duration: number;
};

const promptFrames = 52;

const backgroundForAccent = (accent: string) =>
  `radial-gradient(circle at 18% 15%, ${accent}24, transparent 32%), linear-gradient(180deg, #05070e 0%, #030409 100%)`;

const clampFrom = (frame: number) => Math.max(0, frame);

const buildSoundEvents = (short: BuiltShortDefinition): SoundEvent[] => {
  const events: SoundEvent[] = [];

  if (short.hookFrames > 0) {
    events.push({from: 0, file: 'sfx/ep01-hit-eleven.mp3', volume: 0.22, duration: 48});
    events.push({
      from: clampFrom(short.hookFrames - 8),
      file: 'sfx/ep01-whoosh-eleven.mp3',
      volume: 0.18,
      duration: 46,
    });
  }

  short.segments.forEach((segment, index) => {
    const from = segment.fromFrame;
    if (segment.kind === 'jarb') {
      events.push({from, file: 'sfx/ep01-jarb-eleven.mp3', volume: 0.16, duration: 54});
      return;
    }

    if (segment.kind === 'proof') {
      events.push({from: clampFrom(from - 4), file: 'sfx/ep01-hit-eleven.mp3', volume: 0.14, duration: 44});
      events.push({from: from + 20, file: 'sfx/data.mp3', volume: 0.12, duration: 36});
      return;
    }

    if (segment.kind === 'screen') {
      events.push({from: clampFrom(from - 4), file: 'sfx/ep01-whoosh-eleven.mp3', volume: 0.12, duration: 44});
      if (segment.chapter === 'contexto') {
        events.push({from: from + 24, file: 'sfx/notification.mp3', volume: 0.16, duration: 26});
      }
      return;
    }

    if (index === 0 || segment.chapter === 'hook') {
      events.push({from: clampFrom(from - 3), file: 'sfx/ep01-hit-eleven.mp3', volume: 0.12, duration: 34});
    }
  });

  events.push({
    from: clampFrom(short.totalFrames - promptFrames - 6),
    file: short.soundProfile === 'proof' ? 'sfx/success.mp3' : 'sfx/ep01-cta-eleven.mp3',
    volume: 0.12,
    duration: 72,
  });

  return events;
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
        fontSize: 22,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
      }}
    >
      {text}
    </div>
  );
};

const SegmentTransition: React.FC<{accent: string; durationFrames: number}> = ({
  accent,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 7], [0.28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [durationFrames - 10, durationFrames], [0, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.max(intro, outro);

  return (
    <>
      <AbsoluteFill style={{backgroundColor: '#04050a', opacity, pointerEvents: 'none'}} />
      <AbsoluteFill
        style={{
          opacity: opacity * 0.5,
          background: `linear-gradient(135deg, transparent 14%, ${accent}22 31%, transparent 48%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

const HeadlineStack: React.FC<{
  segment: BuiltShortSegment;
  accent: string;
  bottom?: number;
}> = ({segment, accent, bottom = 170}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 15, mass: 0.62}});
  const opacity = interpolate(
    frame,
    [0, 7, Math.max(16, segment.durationFrames - 12), segment.durationFrames],
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
              fontSize: index === 0 ? 56 : 44,
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
            fontSize: 26,
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

const HookColdOpen: React.FC<{short: BuiltShortDefinition}> = ({short}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 16, mass: 0.7}});
  const firstSegment = short.segments[0];
  const accent = short.accent;
  const hookText = short.hookText ?? [];

  return (
    <AbsoluteFill style={{backgroundColor: '#04050a'}}>
      {firstSegment.kind === 'face' ? (
        <OffthreadVideo
          src={staticFile(EP01_SHORT_A_ROLL_SRC)}
          startFrom={firstSegment.startFrame}
          endAt={firstSegment.startFrame + short.hookFrames}
          volume={0}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            transform: 'scale(1.08)',
            filter: 'blur(4px) brightness(0.48) saturate(0.9)',
          }}
        />
      ) : firstSegment.visualSource ? (
        <OffthreadVideo
          src={staticFile(firstSegment.visualSource)}
          muted
          startFrom={Math.round((firstSegment.visualTrimBefore ?? 0) * 30)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.04)',
            filter: 'blur(5px) brightness(0.42) saturate(0.9)',
          }}
        />
      ) : null}

      <Audio src={staticFile(short.hookAudioFile!)} volume={1} />
      <AbsoluteFill style={{background: backgroundForAccent(accent)}} />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,5,10,0.18) 0%, rgba(4,5,10,0.34) 50%, rgba(4,5,10,0.92) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          padding: '0 70px',
          transform: `scale(${0.95 + reveal * 0.05})`,
        }}
      >
        {hookText.map((line, index) => (
          <div
            key={line}
            style={{
              padding: '14px 24px',
              borderRadius: 24,
              background: index === 0 ? `${accent}22` : 'rgba(8,10,18,0.76)',
              border: `2px solid ${index === 0 ? accent : 'rgba(255,255,255,0.12)'}`,
              color: index === 0 ? accent : '#fff',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: index === 0 ? 76 : 60,
              fontWeight: 900,
              lineHeight: 1,
              textTransform: 'uppercase',
              textAlign: 'center',
              boxShadow: `0 0 50px ${accent}18`,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <SegmentTransition accent={accent} durationFrames={short.hookFrames} />
    </AbsoluteFill>
  );
};

const FaceSegment: React.FC<{segment: BuiltShortSegment; accent: string}> = ({segment, accent}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 7, 18], [1.04, 1.01, 1.01], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#040507'}}>
      <OffthreadVideo
        src={staticFile(EP01_SHORT_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '42% top',
          transform: `scale(${scale})`,
          filter: 'contrast(1.05) saturate(1.03) brightness(0.98)',
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,5,7,0.16) 0%, rgba(4,5,7,0.08) 26%, rgba(4,5,7,0.38) 60%, rgba(4,5,7,0.92) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 120px ${accent}16`,
        }}
      />
      <HeadlineStack segment={segment} accent={accent} />
      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const ScreenCard: React.FC<{
  segment: BuiltShortSegment;
  accent: string;
  cardTop: number;
  height: number;
}> = ({segment, accent, cardTop, height}) => {
  const frame = useCurrentFrame();
  const cardScale = interpolate(frame, [0, 8, 20], [0.97, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: cardTop,
        left: 42,
        right: 42,
        height,
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
          objectFit: segment.visualObjectFit ?? 'cover',
          backgroundColor: '#06070e',
        }}
      />
    </div>
  );
};

const ScreenSegment: React.FC<{segment: BuiltShortSegment; accent: string}> = ({segment, accent}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#03040a'}}>
      <Audio
        src={staticFile(EP01_SHORT_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
      />
      <AbsoluteFill style={{background: backgroundForAccent(accent)}} />
      <ScreenCard segment={segment} accent={accent} cardTop={180} height={720} />
      <HeadlineStack segment={segment} accent={accent} bottom={88} />
      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const ProofSegment: React.FC<{segment: BuiltShortSegment; accent: string}> = ({segment, accent}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#03040a'}}>
      <Audio
        src={staticFile(EP01_SHORT_A_ROLL_SRC)}
        startFrom={segment.startFrame}
        endAt={segment.endFrame}
        volume={1}
      />
      <AbsoluteFill style={{background: backgroundForAccent(accent)}} />
      <ScreenCard segment={segment} accent={accent} cardTop={150} height={760} />

      <div
        style={{
          position: 'absolute',
          top: 110,
          right: 46,
          zIndex: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {['PROVA REAL', 'EM OPERAÇÃO'].map((tag, index) => (
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
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 0.8,
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

const JarbSegment: React.FC<{segment: BuiltShortSegment; accent: string}> = ({segment, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mascotScale = spring({frame, fps, config: {damping: 14, mass: 0.55}});

  return (
    <AbsoluteFill style={{backgroundColor: '#050711'}}>
      <Audio src={staticFile(segment.audioFile!)} volume={1.02} />
      <AbsoluteFill style={{background: backgroundForAccent(accent)}} />

      <div
        style={{
          position: 'absolute',
          left: 50,
          right: 50,
          top: 190,
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
            fontSize: 70,
            fontWeight: 900,
            lineHeight: 0.98,
            textTransform: 'uppercase',
          }}
        >
          {segment.headline[0]}
        </div>
        {segment.caption ? (
          <div
            style={{
              marginTop: 18,
              color: '#dfe8f4',
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {segment.caption}
          </div>
        ) : null}
      </div>

      <SegmentTransition accent={accent} durationFrames={segment.durationFrames} />
    </AbsoluteFill>
  );
};

const PromptOutro: React.FC<{text: string; accent: string}> = ({text, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 15, mass: 0.7}});
  const opacity = interpolate(frame, [0, 6, promptFrames], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 42,
        right: 42,
        bottom: 44,
        zIndex: 28,
        opacity,
        transform: `translateY(${(1 - reveal) * 14}px)`,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 28,
          border: `2px solid ${accent}`,
          background: 'rgba(8,10,18,0.88)',
          boxShadow: `0 0 70px ${accent}1f`,
          color: '#fff',
          fontFamily: 'Inter, Segoe UI, sans-serif',
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1.05,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SegmentRenderer: React.FC<{
  segment: BuiltShortSegment;
  accent: string;
}> = ({segment, accent}) => {
  if (segment.kind === 'jarb') {
    return <JarbSegment segment={segment} accent={accent} />;
  }

  if (segment.kind === 'proof') {
    return <ProofSegment segment={segment} accent={accent} />;
  }

  if (segment.kind === 'screen') {
    return <ScreenSegment segment={segment} accent={accent} />;
  }

  return <FaceSegment segment={segment} accent={accent} />;
};

const useShort = (shortId: string) => EP01_SHORTS_MAP[shortId] ?? EP01_SHORTS_MAP['ep01-short-01'];

export const Video12Ep1Short: React.FC<ShortProps> = ({shortId}) => {
  const short = useShort(shortId);
  const soundEvents = buildSoundEvents(short);
  const ambientVolume =
    short.soundProfile === 'proof' ? 0.032 : short.soundProfile === 'dramatic' ? 0.028 : 0.026;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={0} durationInFrames={short.totalFrames}>
        <Audio src={staticFile('sfx/ambient-tech.mp3')} volume={ambientVolume} loop />
      </Sequence>

      {(short.soundProfile === 'punchy' || short.soundProfile === 'dramatic') && (
        <Sequence from={0} durationInFrames={Math.min(short.totalFrames, 220)}>
          <Audio
            src={staticFile(short.soundProfile === 'dramatic' ? 'sfx/dramatic.mp3' : 'sfx/tension.mp3')}
            volume={short.soundProfile === 'dramatic' ? 0.08 : 0.075}
            loop
          />
        </Sequence>
      )}

      {soundEvents.map((event, index) => (
        <Sequence key={`${event.file}-${event.from}-${index}`} from={event.from} durationInFrames={event.duration}>
          <Audio src={staticFile(event.file)} volume={event.volume} />
        </Sequence>
      ))}

      {short.hookFrames > 0 && short.hookAudioFile ? (
        <Sequence from={0} durationInFrames={short.hookFrames}>
          <HookColdOpen short={short} />
        </Sequence>
      ) : null}

      {short.segments.map((segment) => (
        <Sequence key={segment.id} from={segment.fromFrame} durationInFrames={segment.durationFrames}>
          <SegmentRenderer segment={segment} accent={short.accent} />
        </Sequence>
      ))}

      <Sequence from={Math.max(0, short.totalFrames - promptFrames)} durationInFrames={promptFrames}>
        <PromptOutro text={short.prompt} accent={short.accent} />
      </Sequence>
    </AbsoluteFill>
  );
};
