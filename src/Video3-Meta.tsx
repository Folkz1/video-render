import React from 'react';
import { Sequence } from 'remotion';
import { VideoComposition, TitleBadge, DataPoint, C, buildTimeline, type SegmentDef } from './VideoBase';

const SEGMENTS: SegmentDef[] = [
  { id: '01-hook',         dur: 19.9, recording: 'v3-pipeline' },
  { id: '02-problema',     dur: 21.2, recording: 'v3-pipeline' },
  { id: '03-dados',        dur: 21.9, recording: 'v3-terminal' },
  { id: '04-solucao',      dur: 23.6, recording: 'v3-terminal' },
  { id: '05-como-funciona', dur: 23.6, recording: 'v3-pipeline' },
  { id: '06-prova',        dur: 22.0, recording: 'v3-pipeline' },
  { id: '07-resultados',   dur: 19.9, recording: 'v3-terminal' },
  { id: '08-oportunidade', dur: 21.9, recording: 'v3-pipeline' },
  { id: '09-cta-setup',    dur: 20.5, recording: 'v3-terminal' },
  { id: '10-cta-close',    dur: 23.7, recording: 'v3-cta' },
];

export const Video3Meta: React.FC = () => {
  const { timeline } = buildTimeline(SEGMENTS);

  const overlays = (
    <>
      <Sequence from={timeline[0].start} durationInFrames={100}>
        <TitleBadge text="100% CRIADO POR IA" sub="Voz, roteiro, animacoes, composicao" />
      </Sequence>

      <Sequence from={timeline[1].start + 10} durationInFrames={100}>
        <TitleBadge text="O PROBLEMA" sub="1 semana pra 1 video vs 30 minutos com IA" color={C.red} />
      </Sequence>

      <Sequence from={timeline[2].start + 10} durationInFrames={100}>
        <TitleBadge text="ETAPA 1: ROTEIRO" sub="Claude Code escreve 10 segmentos otimizados" color={C.green} />
      </Sequence>

      <Sequence from={timeline[3].start + 10} durationInFrames={100}>
        <TitleBadge text="ETAPA 2: GRAVACAO" sub="Playwright grava sites reais + telas custom" color={C.yellow} />
      </Sequence>

      <Sequence from={timeline[4].start + 10} durationInFrames={100}>
        <TitleBadge text="ETAPA 3: REMOTION" sub="React renderiza 8400 frames em Full HD" color={C.blue} />
      </Sequence>

      <Sequence from={timeline[5].start + 10} durationInFrames={100}>
        <TitleBadge text="CUSTO: R$1.50" sub="ElevenLabs + Claude Code = centavos por video" color={C.green} />
      </Sequence>
      <Sequence from={timeline[5].start} durationInFrames={timeline[5].totalFrames}>
        <DataPoint value="R$0.30" label="Voz ElevenLabs" x={1500} y={120} delay={40} color={C.blue} />
        <DataPoint value="R$0.00" label="Playwright + Remotion" x={1500} y={260} delay={55} color={C.green} />
        <DataPoint value="R$1.20" label="Claude Code" x={1500} y={400} delay={70} color={C.purple} />
      </Sequence>

      <Sequence from={timeline[6].start + 10} durationInFrames={100}>
        <TitleBadge text="10+ VIDEOS PRODUZIDOS" sub="Shorts verticais + longos horizontais" color={C.cyan} />
      </Sequence>

      <Sequence from={timeline[7].start + 10} durationInFrames={100}>
        <TitleBadge text="MERCADO CORPORATIVO" sub="R$1.000/video quando seu custo e R$1.50" color={C.yellow} />
      </Sequence>

      <Sequence from={timeline[9].start + 20} durationInFrames={120}>
        <TitleBadge text="R$500 / 1 HORA" sub="Aprenda a criar videos com IA no mesmo dia" color={C.green} fadeOut={120} />
      </Sequence>
    </>
  );

  return (
    <VideoComposition
      config={{
        audioDir: 'audio-v2-meta',
        recordingDir: 'recordings-v2',
        segments: SEGMENTS,
        introLines: [
          { text: 'Este Video Foi Criado', color: C.text },
          { text: ' Inteiramente por IA.', color: C.green },
          { text: ' Custo: ', color: C.text },
          { text: 'R$1.50.', color: C.yellow },
        ],
      }}
      overlays={overlays}
    />
  );
};
