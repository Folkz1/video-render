import React from 'react';
import { Composition } from 'remotion';
import { AgentesIA } from './AgentesIA';
import { Video1NVIDIA } from './Video1-NVIDIA';
import { Video2Projetos } from './Video2-Projetos';
import { Video3Meta } from './Video3-Meta';
import { Video4EditorFree } from './Video4-EditorFree';
import { Video7WhatsApp } from './Video7-WhatsApp';
import { Video10Comparison } from './Video10-Comparison';
import { Video2LicitaAI } from './Video2-LicitaAI';
import { Video5ClaudeRoubado } from './Video5-ClaudeRoubado';
import { Video11Virada } from './Video11-Virada';
import { Video1AVirada } from './Video1-AVirada';
import { Video12Ep1FullEdit } from './Video12-Ep1FullEdit';
import { EP01_REAL_EDIT_FRAMES } from './data/ep01-real-edit-timeline';
import { Video12Ep1Vertical } from './Video12-Ep1Vertical';
import { EP01_VERTICAL_FRAMES } from './data/ep01-vertical-timeline';
import {Video12Ep1Short} from './Video12-Ep1Short';
import {EP01_SHORTS} from './data/ep01-shorts-data';

const FPS = 30;

// Calculated from actual TTS durations + transitions
const V1_FRAMES = 8000;
const V2_FRAMES = 7600;
const V3_FRAMES = 7400;

// Long-form videos (10-30 min) - calculated from buildLongTimeline
const V4_FRAMES = 37400;   // 36 segs, 7 chapters, ~19.6 min audio
const V7_FRAMES = 28700;   // 36 segs, 7 chapters, ~14.8 min audio
const V10_FRAMES = 38700;  // 44 segs, 8 chapters, ~20.2 min audio
const V2L_FRAMES = 38500;  // 40 segs, 7 chapters, ~21.4 min audio
const V5_FRAMES = 36900;   // 30 segs, 3 chapters, ~20.5 min audio

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

      {/* V4: DELETEI MEU EDITOR - Claude Code Terminal (~20 min) */}
      <Composition
        id="Video4-EditorFree"
        component={Video4EditorFree}
        durationInFrames={V4_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V7: PARE de QUEIMAR LEADS - WhatsApp Bot (~15 min) */}
      <Composition
        id="Video7-WhatsApp"
        component={Video7WhatsApp}
        durationInFrames={V7_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V10: Claude Code vs Cursor vs Copilot (~21 min) */}
      <Composition
        id="Video10-Comparison"
        component={Video10Comparison}
        durationInFrames={V10_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V2-Long: LicitaAI - Encontra R$2M em Licitacoes (~21 min) */}
      <Composition
        id="Video2-LicitaAI"
        component={Video2LicitaAI}
        durationInFrames={V2L_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V5: Labs Chineses Roubaram o Claude (~20 min) */}
      <Composition
        id="Video5-ClaudeRoubado"
        component={Video5ClaudeRoubado}
        durationInFrames={V5_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* V11: A Virada Ep1 */}
      <Composition
        id="Video11-Virada"
        component={Video11Virada}
        durationInFrames={3600}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* S1 EP01: A VIRADA - Gravação Real A-ROLL */}
      <Composition
        id="Video1AVirada"
        component={Video1AVirada}
        durationInFrames={36000} 
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* EP01 Full Edit from raw A-roll (14min) */}
      <Composition
        id="Video12-EP01-FullEdit"
        component={Video12Ep1FullEdit}
        durationInFrames={EP01_REAL_EDIT_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      <Composition
        id="Video12-EP01-Vertical"
        component={Video12Ep1Vertical}
        durationInFrames={EP01_VERTICAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {EP01_SHORTS.map((short) => (
        <Composition
          key={short.compositionId}
          id={short.compositionId}
          component={Video12Ep1Short}
          durationInFrames={short.totalFrames}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{shortId: short.id}}
        />
      ))}
    </>
  );
};
