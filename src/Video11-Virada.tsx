import React from 'react';
import { VideoComposition, SegmentDef, VideoConfig } from './VideoBase';

const SEGMENTS: SegmentDef[] = [
  { id: '01-hook', dur: 25, recording: 'v11-hook' },
  { id: '02-problema', dur: 25, recording: 'v11-problema' },
  { id: '03-solucao', dur: 25, recording: 'v11-solucao' },
  { id: '04-prova', dur: 25, recording: 'v11-prova' },
  { id: '05-cta', dur: 20, recording: 'v11-cta' },
];

const CONFIG: VideoConfig = {
  audioDir: 'audio-v11-virada',
  recordingDir: 'recordings-v11',
  segments: SEGMENTS,
  introLines: [
    { text: 'OPERAÇÃO COM I.A.' },
    { text: 'A VIRADA', color: '#00ddff' },
  ],
};

export const Video11Virada: React.FC = () => <VideoComposition config={CONFIG} />;
