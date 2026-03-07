import React from 'react';
import { Sequence } from 'remotion';
import { VideoComposition, TitleBadge, DataPoint, C, buildTimeline, type SegmentDef } from './VideoBase';

// Audio durations will be updated after TTS generation
const SEGMENTS: SegmentDef[] = [
  { id: '01-hook',         dur: 22.9, recording: 'v1-data-screen' },
  { id: '02-problema',     dur: 21.0, recording: 'v1-data-screen' },
  { id: '03-dados',        dur: 22.5, recording: 'v1-agent-flow' },
  { id: '04-solucao',      dur: 25.1, recording: 'v1-agent-flow' },
  { id: '05-como-funciona', dur: 25.1, recording: 'v1-n8n-site' },
  { id: '06-prova',        dur: 23.3, recording: 'v1-elevenlabs-site' },
  { id: '07-resultados',   dur: 20.8, recording: 'v1-results' },
  { id: '08-oportunidade', dur: 22.9, recording: 'v1-whatsapp' },
  { id: '09-cta-setup',    dur: 23.7, recording: 'v1-whatsapp' },
  { id: '10-cta-close',    dur: 31.6, recording: 'v1-cta' },
];

export const Video1NVIDIA: React.FC = () => {
  const { timeline } = buildTimeline(SEGMENTS);

  const overlays = (
    <>
      {/* Hook: Title badge */}
      <Sequence from={timeline[0].start} durationInFrames={100}>
        <TitleBadge text="NVIDIA Q4 2025" sub="Receita recorde: $68 bilhoes em 90 dias" />
      </Sequence>

      {/* Problema: Data strip */}
      <Sequence from={timeline[1].start} durationInFrames={timeline[1].totalFrames}>
        <DataPoint value="$68B" label="Receita NVIDIA Q4" x={60} y={870} delay={15} color={C.green} />
        <DataPoint value="-16K" label="Demissoes Amazon" x={320} y={870} delay={30} color={C.red} />
        <DataPoint value="40%" label="Apps com agentes IA" x={580} y={870} delay={45} color={C.blue} />
      </Sequence>

      {/* Dados: McKinsey badge */}
      <Sequence from={timeline[2].start + 20} durationInFrames={100}>
        <TitleBadge text="DADOS CHOCANTES" sub="McKinsey: $3.4 trilhoes em valor economico" color={C.yellow} />
      </Sequence>

      {/* Solucao: Agent badge */}
      <Sequence from={timeline[3].start + 10} durationInFrames={100}>
        <TitleBadge text="AGENTE vs CHATBOT" sub="Proativo, autonomo, 24/7" color={C.blue} />
      </Sequence>

      {/* Como funciona: Stack badge */}
      <Sequence from={timeline[4].start} durationInFrames={100}>
        <TitleBadge text="STACK COMPLETA" sub="N8N + ElevenLabs + WhatsApp + Claude" color={C.blue} />
      </Sequence>

      {/* Prova: Clients badge */}
      <Sequence from={timeline[5].start + 15} durationInFrames={100}>
        <TitleBadge text="3 CLIENTES ATIVOS" sub="Pacific Surf, Dentaly, Famiglia Gianni" color={C.green} />
      </Sequence>

      {/* Resultados: Data points */}
      <Sequence from={timeline[6].start + 10} durationInFrames={100}>
        <TitleBadge text="RESULTADOS REAIS" sub="Implementacao em producao" color={C.green} />
      </Sequence>
      <Sequence from={timeline[6].start} durationInFrames={timeline[6].totalFrames}>
        <DataPoint value="+35%" label="Conversao" x={1500} y={120} delay={50} color={C.green} />
        <DataPoint value="5s" label="Resposta" x={1500} y={260} delay={65} color={C.blue} />
        <DataPoint value="-88%" label="Custo operacional" x={1500} y={400} delay={80} color={C.yellow} />
      </Sequence>

      {/* Oportunidade: B2B badge */}
      <Sequence from={timeline[7].start + 10} durationInFrames={100}>
        <TitleBadge text="MERCADO VAZIO" sub="R$5-15K por implementacao + recorrencia" color={C.yellow} />
      </Sequence>

      {/* CTA setup: Authority badge */}
      <Sequence from={timeline[8].start + 10} durationInFrames={100}>
        <TitleBadge text="7 PROJETOS EM PRODUCAO" sub="LicitaAI, Superbot, Orquestra, CRM, Fiel IA" color={C.purple} />
      </Sequence>

      {/* CTA close: Price badge */}
      <Sequence from={timeline[9].start + 20} durationInFrames={120}>
        <TitleBadge text="R$500 / 1 HORA" sub="Consultoria individual - 5 vagas por semana" color={C.green} fadeOut={120} />
      </Sequence>
    </>
  );

  return (
    <VideoComposition
      config={{
        audioDir: 'audio-v2',
        recordingDir: 'recordings-v2',
        segments: SEGMENTS,
        introLines: [
          { text: 'NVIDIA Faturou ', color: C.text },
          { text: '$68 Bilhoes.', color: C.green },
          { text: ' Amazon ', color: C.text },
          { text: 'Demitiu 16 Mil.', color: C.red },
          { text: ' Isso e ', color: C.text },
          { text: 'SO o Comeco.', color: C.yellow },
        ],
      }}
      overlays={overlays}
    />
  );
};
