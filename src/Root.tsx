import React from 'react';
import { Composition } from 'remotion';
import { AgentesIA } from './AgentesIA';
import { Video1NVIDIA } from './Video1-NVIDIA';
import { Video2Projetos } from './Video2-Projetos';
import { Video3Meta } from './Video3-Meta';

const FPS = 30;

// Calculated from actual TTS durations + transitions
const V1_FRAMES = 8000;
const V2_FRAMES = 7600;
const V3_FRAMES = 7400;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original (v1) */}
      <Composition
        id="AgentesIA"
        component={AgentesIA}
        durationInFrames={8400}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V2: NVIDIA Improved */}
      <Composition
        id="Video1-NVIDIA"
        component={Video1NVIDIA}
        durationInFrames={V1_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V2: 7 Projetos */}
      <Composition
        id="Video2-Projetos"
        component={Video2Projetos}
        durationInFrames={V2_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V2: Meta Video */}
      <Composition
        id="Video3-Meta"
        component={Video3Meta}
        durationInFrames={V3_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
