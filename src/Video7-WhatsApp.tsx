import React from 'react';
import { Sequence } from 'remotion';
import {
  LongVideoComposition,
  TitleBadge,
  DataPoint,
  Scoreboard,
  Timer,
  ProgressBar,
  C,
  buildLongTimeline,
  type LongSegmentDef,
  type LongVideoConfig,
} from './VideoLongBase';

// Recording mapping: multiple segments share the same recording
// v7-whatsapp: WhatsApp mockup screen
// v7-flow: Architecture flow diagram
// v7-evolution: Evolution API / EasyPanel browser
// v7-n8n: N8N workflow canvas
// v7-demo: Demo split screen
// v7-custos: Cost comparison screen
// v7-roi: ROI calculator
// v7-cta: CTA consultoria screen

const SEGMENTS: LongSegmentDef[] = [
  // ATO 1 - HOOK
  { id: '01-hook', dur: 30.6, recording: 'v7-whatsapp', chapter: 'Hook', mood: 'urgente', sfx: 'alert', cutStyle: 'glitch' },
  { id: '02-estatistica-choque', dur: 18.7, recording: 'v7-stats', chapter: 'Hook', mood: 'tenso', sfx: 'impact', cutStyle: 'rapido' },
  { id: '03-dor-financeira', dur: 21.5, recording: 'v7-stats', chapter: 'Hook', mood: 'tenso', sfx: 'tension', cutStyle: 'hard-cut' },
  { id: '04-virada', dur: 26.8, recording: 'v7-whatsapp', chapter: 'Hook', mood: 'revelacao', sfx: 'success', cutStyle: 'suave' },
  { id: '05-credibilidade', dur: 18.6, recording: 'v7-stats', chapter: 'Hook', mood: 'epico', sfx: 'notification', cutStyle: 'suave' },

  // ATO 2 - ARQUITETURA
  { id: '06-arquitetura-intro', dur: 34.6, recording: 'v7-flow', chapter: 'Arquitetura', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '07-fluxo-completo', dur: 32.7, recording: 'v7-flow', chapter: 'Arquitetura', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '08-por-que-evolution', dur: 26.7, recording: 'v7-evolution', chapter: 'Arquitetura', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },

  // ATO 2 - INSTALACAO
  { id: '09-easypanel-intro', dur: 31.5, recording: 'v7-evolution', chapter: 'Instalacao', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '10-evolution-install', dur: 24.3, recording: 'v7-evolution', chapter: 'Instalacao', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '11-n8n-install', dur: 21.2, recording: 'v7-evolution', chapter: 'Instalacao', mood: 'didatico', sfx: 'success', cutStyle: 'suave' },

  // ATO 2 - CONFIGURACAO
  { id: '12-conectar-whatsapp', dur: 24.4, recording: 'v7-evolution', chapter: 'Configuracao', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '13-webhook-config', dur: 22.5, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '14-n8n-workflow-inicio', dur: 21.2, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '15-n8n-filtro', dur: 23.7, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'none', cutStyle: 'suave' },
  { id: '16-n8n-contexto', dur: 22.9, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '17-n8n-prompt', dur: 30.1, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '18-n8n-llm-call', dur: 24.1, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '19-n8n-resposta', dur: 23.7, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'success', cutStyle: 'suave' },
  { id: '20-n8n-notifica-vendedor', dur: 23.7, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'alert', cutStyle: 'suave' },
  { id: '21-n8n-salva-historico', dur: 22.3, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '22-workflow-completo', dur: 23.7, recording: 'v7-n8n', chapter: 'Configuracao', mood: 'epico', sfx: 'success', cutStyle: 'suave' },

  // ATO 2 - DEMO
  { id: '23-demo-intro', dur: 13.1, recording: 'v7-demo', chapter: 'Demo', mood: 'tenso', sfx: 'dramatic', cutStyle: 'hard-cut' },
  { id: '24-demo-mensagem', dur: 9.3, recording: 'v7-whatsapp', chapter: 'Demo', mood: 'tenso', sfx: 'notification', cutStyle: 'rapido' },
  { id: '25-demo-processamento', dur: 9.5, recording: 'v7-n8n', chapter: 'Demo', mood: 'tenso', sfx: 'typing', cutStyle: 'rapido' },
  { id: '26-demo-resposta', dur: 30.3, recording: 'v7-whatsapp', chapter: 'Demo', mood: 'revelacao', sfx: 'success', cutStyle: 'rapido' },
  { id: '27-demo-vendedor', dur: 19.7, recording: 'v7-demo', chapter: 'Demo', mood: 'calmo', sfx: 'notification', cutStyle: 'suave' },
  { id: '28-demo-inteligencia', dur: 30.1, recording: 'v7-whatsapp', chapter: 'Demo', mood: 'epico', sfx: 'success', cutStyle: 'suave' },

  // ATO 2 - CUSTOS
  { id: '29-custos-detalhado', dur: 31.2, recording: 'v7-custos', chapter: 'Custos', mood: 'didatico', sfx: 'cash', cutStyle: 'suave' },
  { id: '30-comparativo', dur: 25.1, recording: 'v7-custos', chapter: 'Custos', mood: 'epico', sfx: 'impact', cutStyle: 'hard-cut' },

  // ATO 3 - CTA
  { id: '31-roi', dur: 23.7, recording: 'v7-roi', chapter: 'CTA', mood: 'epico', sfx: 'cash', cutStyle: 'suave' },
  { id: '32-objecao-medo', dur: 34.0, recording: 'v7-cta', chapter: 'CTA', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '33-urgencia', dur: 24.8, recording: 'v7-whatsapp', chapter: 'CTA', mood: 'urgente', sfx: 'alert', cutStyle: 'rapido' },
  { id: '34-cta-consultoria', dur: 29.7, recording: 'v7-cta', chapter: 'CTA', mood: 'epico', sfx: 'dramatic', cutStyle: 'suave' },
  { id: '35-prova-social-final', dur: 28.4, recording: 'v7-cta', chapter: 'CTA', mood: 'epico', sfx: 'success', cutStyle: 'suave' },
  { id: '36-encerramento', dur: 31.1, recording: 'v7-cta', chapter: 'CTA', mood: 'urgente', sfx: 'alert', cutStyle: 'fade' },
];

const CONFIG: LongVideoConfig = {
  audioDir: 'audio-v7',
  recordingDir: 'recordings-v7',
  segments: SEGMENTS,
  introLines: [
    { text: 'PARE de', color: C.red },
    { text: 'QUEIMAR LEADS' },
    { text: 'Bot WhatsApp em 5s', color: C.green },
  ],
  chapters: ['Hook', 'Arquitetura', 'Instalacao', 'Configuracao', 'Demo', 'Custos', 'CTA'],
  accentColor: C.green,
};

export const Video7WhatsApp: React.FC = () => {
  const { timeline } = buildLongTimeline(SEGMENTS);

  const overlays = (
    <>
      {/* Hook: extreme urgency edits */}
      <Sequence from={timeline[0].start} durationInFrames={timeline[0].totalFrames}>
        <Timer label="Lead esperando..." current="5:00 min" color={C.red} />
      </Sequence>
      
      <Sequence from={timeline[0].start + 180} durationInFrames={120}>
        <TitleBadge text="10 MINUTOS" sub="Concorrente já respondeu" color={C.yellow} fadeOut={120} />
      </Sequence>

      <Sequence from={timeline[0].start + 360} durationInFrames={150}>
        <TitleBadge text="47 MINUTOS" sub="Tempo médio no Brasil..." color={C.red} fadeOut={150} />
      </Sequence>
      
      <Sequence from={timeline[0].start + 600} durationInFrames={250}>
        <DataPoint value="PERDIDO !" label="Lead fechou com o concorrente" x={200} y={400} color={C.red} delay={10} />
      </Sequence>

      {/* Stats: 78% badge */}
      <Sequence from={timeline[1].start + 10} durationInFrames={timeline[1].totalFrames}>
        <TitleBadge text="78% DOS LEADS" sub="Fecham com quem responde primeiro" color={C.green} />
      </Sequence>
      
      <Sequence from={timeline[1].start + 240} durationInFrames={200}>
        <TitleBadge text="HARVARD REVIEW" sub="Velocidade define a venda" color={C.blue} fadeOut={200} />
      </Sequence>

      {/* Financial damage: cascade effect */}
      <Sequence from={timeline[2].start} durationInFrames={timeline[2].totalFrames}>
        <DataPoint value="20 Leads" label="Recebidos/mês" x={60} y={870} delay={15} color={C.text} />
        <DataPoint value="- 5 Perdidos" label="Por demora" x={240} y={870} delay={80} color={C.red} />
        <DataPoint value="R$ 1.000" label="Ticket Medio" x={460} y={870} delay={150} color={C.yellow} />
        <DataPoint value="R$ 60 MIL/ANO" label="JOGADOS NO LIXO" x={700} y={870} delay={230} color={C.red} />
      </Sequence>

      {/* Solution badge */}
      <Sequence from={timeline[3].start + 10} durationInFrames={100}>
        <TitleBadge text="R$25/MES" sub="Resposta automatica em 5 segundos" color={C.green} />
      </Sequence>

      {/* Architecture badge */}
      <Sequence from={timeline[5].start + 10} durationInFrames={120}>
        <TitleBadge text="ARQUITETURA" sub="Evolution API + N8N + LLM + VPS" color={C.blue} />
      </Sequence>

      {/* Installation progress */}
      <Sequence from={timeline[8].start} durationInFrames={timeline[8].totalFrames + timeline[9].totalFrames + timeline[10].totalFrames}>
        <ProgressBar progress={100} label="Instalacao" color={C.green} />
      </Sequence>

      {/* N8N workflow node count */}
      <Sequence from={timeline[12].start} durationInFrames={300}>
        <Timer label="N8N Workflow" current="8 nodes" color={C.blue} />
      </Sequence>

      {/* Demo: live timer */}
      <Sequence from={timeline[22].start} durationInFrames={timeline[22].totalFrames + timeline[23].totalFrames + timeline[24].totalFrames + timeline[25].totalFrames}>
        <Timer label="DEMO AO VIVO" current="4.8s" color={C.green} />
      </Sequence>

      {/* Costs comparison */}
      <Sequence from={timeline[28].start} durationInFrames={timeline[28].totalFrames + timeline[29].totalFrames}>
        <DataPoint value="R$29" label="Bot IA / mes" x={60} y={870} delay={10} color={C.green} />
        <DataPoint value="R$3.500" label="CLT / mes" x={300} y={870} delay={25} color={C.red} />
        <DataPoint value="98.9%" label="Economia" x={560} y={870} delay={40} color={C.gold} />
      </Sequence>

      {/* ROI badge */}
      <Sequence from={timeline[30].start + 10} durationInFrames={100}>
        <TitleBadge text="ROI: 1.567%" sub="R$500 ticket x 1 lead extra/mes" color={C.gold} />
      </Sequence>

      {/* CTA badge */}
      <Sequence from={timeline[33].start + 5} durationInFrames={timeline[33].totalFrames}>
        <TitleBadge
          text="CONSULTORIA R$500/h"
          sub="Bot configurado + Workflow + Treinamento"
          color={C.gold}
          fadeOut={timeline[33].totalFrames}
        />
      </Sequence>
    </>
  );

  return <LongVideoComposition config={CONFIG} overlays={overlays} />;
};
