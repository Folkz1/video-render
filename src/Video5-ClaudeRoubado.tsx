import React from 'react';
import { Sequence } from 'remotion';
import {
  LongVideoComposition,
  TitleBadge,
  DataPoint,
  Timer,
  C,
  buildLongTimeline,
  type LongSegmentDef,
  type LongVideoConfig,
} from './VideoLongBase';

const SEGMENTS: LongSegmentDef[] = [
  // ATO 1 - O ROUBO
  { id: '01-hook', dur: 27.64, recording: 'v5-headlines', chapter: 'ATO 1 - O ROUBO', mood: 'urgente', sfx: 'impact', cutStyle: 'glitch' },
  { id: '02-numeros', dur: 34.30, recording: 'v5-stats', chapter: 'ATO 1 - O ROUBO', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '03-acusados', dur: 30.15, recording: 'v5-labs', chapter: 'ATO 1 - O ROUBO', mood: 'tenso', sfx: 'alert', cutStyle: 'rapido' },
  { id: '04-headlines', dur: 37.67, recording: 'v5-headlines', chapter: 'ATO 1 - O ROUBO', mood: 'urgente', sfx: 'dramatic', cutStyle: 'hard-cut' },
  { id: '05-por-que-importa', dur: 36.52, recording: 'v5-stats', chapter: 'ATO 1 - O ROUBO', mood: 'urgente', sfx: 'tension', cutStyle: 'rapido' },

  // ATO 2 - A OPERACAO
  { id: '06-o-que-e-destilacao', dur: 41.22, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '07-aluno-professor', dur: 41.59, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '08-hydra-clusters', dur: 41.43, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '09-contas-falsas', dur: 37.41, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'alert', cutStyle: 'rapido' },
  { id: '10-deepseek', dur: 42.56, recording: 'v5-labs', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '11-deepseek-censura', dur: 40.28, recording: 'v5-labs', chapter: 'ATO 2 - A OPERACAO', mood: 'urgente', sfx: 'alert', cutStyle: 'rapido' },
  { id: '12-moonshot', dur: 47.15, recording: 'v5-labs', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '13-minimax', dur: 41.25, recording: 'v5-labs', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '14-o-que-roubaram', dur: 45.19, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '15-custo-treinar', dur: 45.06, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'epico', sfx: 'cash', cutStyle: 'rapido' },
  { id: '16-atalho', dur: 38.93, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'urgente', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '17-openai-tambem', dur: 40.88, recording: 'v5-headlines', chapter: 'ATO 2 - A OPERACAO', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '18-guerra-fria', dur: 42.97, recording: 'v5-map', chapter: 'ATO 2 - A OPERACAO', mood: 'epico', sfx: 'dramatic', cutStyle: 'hard-cut' },
  { id: '19-impacto-api', dur: 42.43, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '20-precos-caem', dur: 38.48, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'revelacao', sfx: 'cash', cutStyle: 'rapido' },
  { id: '21-dev-brasileiro', dur: 41.90, recording: 'v5-stats', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '22-dados-seguros', dur: 37.23, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '23-anthropic-defesa', dur: 41.07, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '24-open-source', dur: 37.49, recording: 'v5-diagram', chapter: 'ATO 2 - A OPERACAO', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },

  // ATO 3 - POSICIONAMENTO
  { id: '25-posicionamento', dur: 43.16, recording: 'v5-strategy', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '26-oportunidade', dur: 34.95, recording: 'v5-stats', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'revelacao', sfx: 'success', cutStyle: 'suave' },
  { id: '27-quem-domina', dur: 38.14, recording: 'v5-strategy', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'epico', sfx: 'dramatic', cutStyle: 'rapido' },
  { id: '28-tres-pilares', dur: 44.65, recording: 'v5-strategy', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '29-consultoria', dur: 37.46, recording: 'v5-cta', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'urgente', sfx: 'cash', cutStyle: 'rapido' },
  { id: '30-cta-final', dur: 31.04, recording: 'v5-cta', chapter: 'ATO 3 - POSICIONAMENTO', mood: 'epico', sfx: 'dramatic', cutStyle: 'fade' },
];

const CONFIG: LongVideoConfig = {
  audioDir: 'audio-v5',
  recordingDir: 'recordings-v5',
  segments: SEGMENTS,
  introLines: [
    { text: 'A Anthropic REVELOU:', color: C.red },
    { text: 'Labs Chineses' },
    { text: 'ROUBARAM o Claude', color: C.red },
  ],
  chapters: ['ATO 1 - O ROUBO', 'ATO 2 - A OPERACAO', 'ATO 3 - POSICIONAMENTO'],
  accentColor: C.red,
};

export const Video5ClaudeRoubado: React.FC = () => {
  const { timeline } = buildLongTimeline(SEGMENTS);

  const overlays = (
    <>
      {/* Scale of theft */}
      <Sequence from={timeline[0].start} durationInFrames={timeline[0].totalFrames + timeline[1].totalFrames}>
        <DataPoint value="24.000" label="Contas falsas" x={60} y={870} delay={10} color={C.red} />
        <DataPoint value="16M" label="Conversas roubadas" x={300} y={870} delay={25} color={C.red} />
        <DataPoint value="3 labs" label="Chineses" x={540} y={870} delay={40} color={C.yellow} />
      </Sequence>

      {/* Labs accused */}
      <Sequence from={timeline[2].start + 10} durationInFrames={100}>
        <TitleBadge text="OS ACUSADOS" sub="DeepSeek + Moonshot + MiniMax" color={C.red} />
      </Sequence>

      {/* Distillation explainer */}
      <Sequence from={timeline[5].start + 10} durationInFrames={120}>
        <TitleBadge text="DESTILACAO" sub="Como o aluno rouba do professor" color={C.cyan} />
      </Sequence>

      {/* DeepSeek stats */}
      <Sequence from={timeline[9].start} durationInFrames={timeline[9].totalFrames}>
        <Timer label="DeepSeek" current="O mais sofisticado" color={C.red} />
      </Sequence>

      {/* Moonshot volume */}
      <Sequence from={timeline[11].start + 10} durationInFrames={100}>
        <TitleBadge text="3.4 MILHOES" sub="Trocas roubadas pela Moonshot" color={C.yellow} />
      </Sequence>

      {/* Training cost */}
      <Sequence from={timeline[14].start} durationInFrames={timeline[14].totalFrames}>
        <DataPoint value="$100M+" label="Custo treinar modelo do zero" x={60} y={870} delay={10} color={C.gold} />
      </Sequence>

      {/* API price drop */}
      <Sequence from={timeline[19].start + 10} durationInFrames={100}>
        <TitleBadge text="PRECOS -80%" sub="APIs de IA despencaram" color={C.green} />
      </Sequence>

      {/* Cold war badge */}
      <Sequence from={timeline[17].start + 10} durationInFrames={120}>
        <TitleBadge text="GUERRA FRIA DA IA" sub="EUA vs China pelo dominio da inteligencia artificial" color={C.red} />
      </Sequence>

      {/* 3 pillars */}
      <Sequence from={timeline[27].start + 10} durationInFrames={120}>
        <TitleBadge text="3 PILARES" sub="Protecao + Posicionamento + Receita" color={C.green} />
      </Sequence>

      {/* CTA */}
      <Sequence from={timeline[28].start + 5} durationInFrames={timeline[28].totalFrames + timeline[29].totalFrames}>
        <TitleBadge
          text="CONSULTORIA R$500/h"
          sub="Posicione-se nessa nova realidade da IA"
          color={C.gold}
          fadeOut={timeline[28].totalFrames + timeline[29].totalFrames}
        />
      </Sequence>
    </>
  );

  return <LongVideoComposition config={CONFIG} overlays={overlays} />;
};
