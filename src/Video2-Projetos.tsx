import React from 'react';
import { Sequence } from 'remotion';
import { VideoComposition, TitleBadge, DataPoint, C, buildTimeline, type SegmentDef } from './VideoBase';

const SEGMENTS: SegmentDef[] = [
  { id: '01-hook',         dur: 21.5, recording: 'v2-projects' },
  { id: '02-problema',     dur: 21.2, recording: 'v2-projects' },
  { id: '03-dados',        dur: 22.8, recording: 'v2-licitaai' },
  { id: '04-solucao',      dur: 23.4, recording: 'v2-superbot' },
  { id: '05-como-funciona', dur: 22.1, recording: 'v2-superbot' },
  { id: '06-prova',        dur: 23.7, recording: 'v2-licitaai' },
  { id: '07-resultados',   dur: 23.7, recording: 'v1-n8n-site' },
  { id: '08-oportunidade', dur: 20.0, recording: 'v2-projects' },
  { id: '09-cta-setup',    dur: 19.2, recording: 'v1-whatsapp' },
  { id: '10-cta-close',    dur: 27.0, recording: 'v2-cta' },
];

export const Video2Projetos: React.FC = () => {
  const { timeline } = buildTimeline(SEGMENTS);

  const overlays = (
    <>
      <Sequence from={timeline[0].start} durationInFrames={100}>
        <TitleBadge text="7 PROJETOS / 30 DIAS" sub="Todos construidos com inteligencia artificial" />
      </Sequence>

      <Sequence from={timeline[2].start + 10} durationInFrames={100}>
        <TitleBadge text="LICITAAI" sub="SaaS com 2.907 licitacoes e receita de R$5K/mes" color={C.green} />
      </Sequence>
      <Sequence from={timeline[2].start} durationInFrames={timeline[2].totalFrames}>
        <DataPoint value="2.907" label="Licitacoes" x={1500} y={120} delay={40} color={C.green} />
        <DataPoint value="2.173" label="Analises IA" x={1500} y={260} delay={55} color={C.blue} />
        <DataPoint value="R$5K" label="Receita/mes" x={1500} y={400} delay={70} color={C.yellow} />
      </Sequence>

      <Sequence from={timeline[3].start + 10} durationInFrames={100}>
        <TitleBadge text="SUPERBOT" sub="15 agentes IA + 39 tools + 3 clientes ativos" color={C.blue} />
      </Sequence>

      <Sequence from={timeline[4].start + 10} durationInFrames={100}>
        <TitleBadge text="ORQUESTRA" sub="CTO virtual com memoria semantica e briefings diarios" color={C.yellow} />
      </Sequence>

      <Sequence from={timeline[5].start + 10} durationInFrames={100}>
        <TitleBadge text="+4 PROJETOS" sub="CRM Juridico (PT), Fiel IA, IssueMapper, Video Factory" color={C.purple} />
      </Sequence>

      <Sequence from={timeline[6].start + 10} durationInFrames={100}>
        <TitleBadge text="STACK COMPLETA" sub="Next.js + React + N8N + PostgreSQL + Claude Code" color={C.blue} />
      </Sequence>

      <Sequence from={timeline[7].start + 10} durationInFrames={100}>
        <TitleBadge text="ESTE VIDEO = IA" sub="Roteiro, voz, animacoes - tudo automatizado por R$1.50" color={C.green} />
      </Sequence>

      <Sequence from={timeline[9].start + 20} durationInFrames={120}>
        <TitleBadge text="R$500 / 1 HORA" sub="Consultoria individual - garantia de satisfacao" color={C.green} fadeOut={120} />
      </Sequence>
    </>
  );

  return (
    <VideoComposition
      config={{
        audioDir: 'audio-v2-projetos',
        recordingDir: 'recordings-v2',
        segments: SEGMENTS,
        introLines: [
          { text: 'Criei ', color: C.text },
          { text: '7 Projetos', color: C.green },
          { text: ' com IA' },
          { text: ' em 30 Dias.', color: C.blue },
          { text: ' E Voce Pode Tambem.', color: C.yellow },
        ],
      }}
      overlays={overlays}
    />
  );
};
