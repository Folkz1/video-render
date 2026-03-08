import React from 'react';
import { Sequence } from 'remotion';
import {
  LongVideoComposition,
  TitleBadge,
  DataPoint,
  Timer,
  ProgressBar,
  C,
  buildLongTimeline,
  type LongSegmentDef,
  type LongVideoConfig,
} from './VideoLongBase';

const SEGMENTS: LongSegmentDef[] = [
  // HOOK
  { id: '01-hook-cifra', dur: 23.04, recording: 'v2-stats', chapter: 'Hook', mood: 'urgente', sfx: 'cash', cutStyle: 'hard-cut' },
  { id: '02-counter-animado', dur: 25.97, recording: 'v2-stats', chapter: 'Hook', mood: 'tenso', sfx: 'impact', cutStyle: 'rapido' },
  { id: '03-dor-tempo', dur: 27.22, recording: 'v2-stats', chapter: 'Hook', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '04-virada-solucao', dur: 34.72, recording: 'v2-dashboard', chapter: 'Hook', mood: 'revelacao', sfx: 'success', cutStyle: 'suave' },
  { id: '05-prova-real', dur: 30.12, recording: 'v2-dashboard', chapter: 'Hook', mood: 'epico', sfx: 'notification', cutStyle: 'suave' },

  // PNCP E COLETA
  { id: '06-pncp-intro', dur: 33.83, recording: 'v2-pncp', chapter: 'PNCP e Coleta', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '07-api-pncp', dur: 33.65, recording: 'v2-pncp', chapter: 'PNCP e Coleta', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '08-n8n-coleta', dur: 29.70, recording: 'v2-n8n', chapter: 'PNCP e Coleta', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '09-volume-dados', dur: 28.03, recording: 'v2-stats', chapter: 'PNCP e Coleta', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },

  // MOTOR DE ANALISE IA
  { id: '10-problema-volume', dur: 24.77, recording: 'v2-stats', chapter: 'Motor de Analise IA', mood: 'tenso', sfx: 'tension', cutStyle: 'hard-cut' },
  { id: '11-claude-analise', dur: 28.11, recording: 'v2-ia', chapter: 'Motor de Analise IA', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '12-pipeline-analise', dur: 36.00, recording: 'v2-diagram', chapter: 'Motor de Analise IA', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '13-exemplo-real', dur: 32.86, recording: 'v2-dashboard', chapter: 'Motor de Analise IA', mood: 'revelacao', sfx: 'notification', cutStyle: 'suave' },
  { id: '14-analise-profunda', dur: 31.04, recording: 'v2-ia', chapter: 'Motor de Analise IA', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '15-duas-mil-analises', dur: 27.46, recording: 'v2-stats', chapter: 'Motor de Analise IA', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },

  // ARQUITETURA E DASHBOARD
  { id: '16-stack-arquitetura', dur: 34.61, recording: 'v2-diagram', chapter: 'Arquitetura e Dashboard', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '17-nextjs-frontend', dur: 27.27, recording: 'v2-dashboard', chapter: 'Arquitetura e Dashboard', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '18-dashboard-tour', dur: 31.92, recording: 'v2-dashboard', chapter: 'Arquitetura e Dashboard', mood: 'epico', sfx: 'notification', cutStyle: 'suave' },
  { id: '19-detalhes-licitacao', dur: 31.19, recording: 'v2-dashboard', chapter: 'Arquitetura e Dashboard', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '20-postgresql-dados', dur: 29.18, recording: 'v2-diagram', chapter: 'Arquitetura e Dashboard', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },

  // MOTOR DE VENDAS
  { id: '21-motor-vendas-intro', dur: 22.08, recording: 'v2-vendas', chapter: 'Motor de Vendas', mood: 'urgente', sfx: 'alert', cutStyle: 'hard-cut' },
  { id: '22-lead-capture', dur: 28.71, recording: 'v2-vendas', chapter: 'Motor de Vendas', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '23-whatsapp-integration', dur: 29.23, recording: 'v2-whatsapp', chapter: 'Motor de Vendas', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '24-funil-conversao', dur: 30.91, recording: 'v2-vendas', chapter: 'Motor de Vendas', mood: 'epico', sfx: 'cash', cutStyle: 'rapido' },

  // ARQUITETURA DETALHADA
  { id: '25-n8n-workflows', dur: 31.92, recording: 'v2-n8n', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '26-workflow-coleta-detalhe', dur: 30.20, recording: 'v2-n8n', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '27-workflow-ia-detalhe', dur: 30.77, recording: 'v2-n8n', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '28-prompt-engineering', dur: 36.39, recording: 'v2-ia', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '29-custos-operacao', dur: 33.70, recording: 'v2-custos', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'cash', cutStyle: 'suave' },
  { id: '30-seguranca', dur: 28.16, recording: 'v2-diagram', chapter: 'Arquitetura Detalhada', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '31-escalabilidade', dur: 30.07, recording: 'v2-diagram', chapter: 'Arquitetura Detalhada', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '32-diferenciais', dur: 30.12, recording: 'v2-stats', chapter: 'Arquitetura Detalhada', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },

  // ROI E CTA
  { id: '33-resultados-concretos', dur: 36.16, recording: 'v2-stats', chapter: 'ROI e CTA', mood: 'epico', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '34-roi-calculo', dur: 35.27, recording: 'v2-custos', chapter: 'ROI e CTA', mood: 'epico', sfx: 'cash', cutStyle: 'rapido' },
  { id: '35-oportunidade-perdida', dur: 29.70, recording: 'v2-stats', chapter: 'ROI e CTA', mood: 'urgente', sfx: 'alert', cutStyle: 'rapido' },
  { id: '36-escassez', dur: 27.85, recording: 'v2-cta', chapter: 'ROI e CTA', mood: 'urgente', sfx: 'tension', cutStyle: 'rapido' },
  { id: '37-cta-principal', dur: 35.45, recording: 'v2-cta', chapter: 'ROI e CTA', mood: 'epico', sfx: 'dramatic', cutStyle: 'suave' },
  { id: '38-prova-social', dur: 29.65, recording: 'v2-cta', chapter: 'ROI e CTA', mood: 'calmo', sfx: 'success', cutStyle: 'suave' },
  { id: '39-urgencia-final', dur: 27.80, recording: 'v2-cta', chapter: 'ROI e CTA', mood: 'urgente', sfx: 'alert', cutStyle: 'rapido' },
  { id: '40-encerramento', dur: 25.00, recording: 'v2-cta', chapter: 'ROI e CTA', mood: 'epico', sfx: 'success', cutStyle: 'fade' },
];

const CONFIG: LongVideoConfig = {
  audioDir: 'audio-v2-long',
  recordingDir: 'recordings-v2',
  segments: SEGMENTS,
  introLines: [
    { text: 'Esse Sistema ENCONTRA' },
    { text: 'R$2 MILHOES', color: C.gold },
    { text: 'em Licitacoes', color: C.green },
  ],
  chapters: ['Hook', 'PNCP e Coleta', 'Motor de Analise IA', 'Arquitetura e Dashboard', 'Motor de Vendas', 'Arquitetura Detalhada', 'ROI e CTA'],
  accentColor: C.gold,
};

export const Video2LicitaAI: React.FC = () => {
  const { timeline } = buildLongTimeline(SEGMENTS);

  const overlays = (
    <>
      {/* R$2.3M badge */}
      <Sequence from={timeline[0].start + 10} durationInFrames={100}>
        <TitleBadge text="R$2.300.000" sub="Perdidos por falta de atencao" color={C.gold} />
      </Sequence>

      {/* PNCP volume */}
      <Sequence from={timeline[5].start} durationInFrames={timeline[5].totalFrames + timeline[6].totalFrames}>
        <DataPoint value="800+" label="Editais/dia no PNCP" x={60} y={870} delay={10} color={C.green} />
      </Sequence>

      {/* AI analysis counter */}
      <Sequence from={timeline[10].start} durationInFrames={300}>
        <Timer label="Motor de Analise" current="2.907" color={C.cyan} />
      </Sequence>

      {/* 2173 analyses */}
      <Sequence from={timeline[14].start + 10} durationInFrames={100}>
        <TitleBadge text="2.173 ANALISES" sub="Automaticas com Claude/GPT" color={C.green} />
      </Sequence>

      {/* Stack badge */}
      <Sequence from={timeline[15].start + 10} durationInFrames={120}>
        <TitleBadge text="STACK" sub="Next.js 16 + PostgreSQL + OpenAI + N8N" color={C.blue} />
      </Sequence>

      {/* Dashboard tour */}
      <Sequence from={timeline[17].start} durationInFrames={timeline[17].totalFrames + timeline[18].totalFrames}>
        <ProgressBar progress={100} label="Dashboard LicitaAI" color={C.green} />
      </Sequence>

      {/* WhatsApp integration */}
      <Sequence from={timeline[22].start + 10} durationInFrames={100}>
        <TitleBadge text="EVOLUTION API" sub="WhatsApp integrado ao Motor de Vendas" color={C.green} />
      </Sequence>

      {/* Costs */}
      <Sequence from={timeline[28].start} durationInFrames={timeline[28].totalFrames}>
        <DataPoint value="R$180" label="Custo mensal total" x={60} y={870} delay={10} color={C.green} />
        <DataPoint value="R$5K" label="Receita recorrente" x={300} y={870} delay={25} color={C.gold} />
      </Sequence>

      {/* ROI */}
      <Sequence from={timeline[33].start + 10} durationInFrames={100}>
        <TitleBadge text="ROI: 2.677%" sub="R$180/mes gera R$5.000/mes" color={C.gold} />
      </Sequence>

      {/* CTA */}
      <Sequence from={timeline[35].start + 5} durationInFrames={timeline[35].totalFrames + timeline[36].totalFrames + timeline[37].totalFrames}>
        <TitleBadge
          text="CONSULTORIA R$500/h"
          sub="Setup completo LicitaAI para sua empresa"
          color={C.gold}
          fadeOut={timeline[35].totalFrames + timeline[36].totalFrames + timeline[37].totalFrames}
        />
      </Sequence>
    </>
  );

  return <LongVideoComposition config={CONFIG} overlays={overlays} />;
};
