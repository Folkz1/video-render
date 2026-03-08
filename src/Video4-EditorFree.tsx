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

// Recording mapping:
// v4-terminal: Claude Code terminal sessions
// v4-vscode: VS Code with Copilot
// v4-split: Split screen comparison
// v4-config: CLAUDE.md, settings, skills, hooks, memory
// v4-diagram: Flow diagrams, architecture, pipelines
// v4-stats: Metrics, infographics, data
// v4-demo: Live demo recordings
// v4-cta: CTA / consultoria screen

const SEGMENTS: LongSegmentDef[] = [
  // ATO 1 - DRAMA
  { id: '01-confissao', dur: 30.07, recording: 'v4-terminal', chapter: 'ATO 1 - DRAMA', mood: 'calmo', sfx: 'tension', cutStyle: 'suave' },
  { id: '02-git-log', dur: 28.27, recording: 'v4-terminal', chapter: 'ATO 1 - DRAMA', mood: 'epico', sfx: 'typing', cutStyle: 'rapido' },
  { id: '03-provocacao', dur: 29.78, recording: 'v4-diagram', chapter: 'ATO 1 - DRAMA', mood: 'urgente', sfx: 'dramatic', cutStyle: 'hard-cut' },
  { id: '04-ponto-virada', dur: 28.71, recording: 'v4-vscode', chapter: 'ATO 1 - DRAMA', mood: 'tenso', sfx: 'impact', cutStyle: 'hard-cut' },

  // ATO 2 - JORNADA (Setup)
  { id: '05-instalacao', dur: 31.64, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Setup)', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '06-claude-md', dur: 34.14, recording: 'v4-config', chapter: 'ATO 2 - JORNADA (Setup)', mood: 'revelacao', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '07-settings', dur: 35.16, recording: 'v4-config', chapter: 'ATO 2 - JORNADA (Setup)', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },

  // ATO 2 - JORNADA (Fluxo)
  { id: '08-primeiro-prompt', dur: 37.07, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'epico', sfx: 'typing', cutStyle: 'suave' },
  { id: '09-analise-impacto', dur: 30.77, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '10-implementacao', dur: 35.56, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'epico', sfx: 'typing', cutStyle: 'rapido' },
  { id: '11-testes', dur: 37.25, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'tenso', sfx: 'success', cutStyle: 'rapido' },
  { id: '12-commit', dur: 31.98, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'calmo', sfx: 'notification', cutStyle: 'suave' },
  { id: '13-fluxo-completo', dur: 31.45, recording: 'v4-diagram', chapter: 'ATO 2 - JORNADA (Fluxo)', mood: 'epico', sfx: 'whoosh', cutStyle: 'suave' },

  // ATO 2 - JORNADA (Comparativo)
  { id: '14-comparativo-vscode', dur: 34.30, recording: 'v4-split', chapter: 'ATO 2 - JORNADA (Comparativo)', mood: 'tenso', sfx: 'tension', cutStyle: 'hard-cut' },
  { id: '15-comparativo-claude', dur: 32.11, recording: 'v4-split', chapter: 'ATO 2 - JORNADA (Comparativo)', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },
  { id: '16-resultado-comparativo', dur: 31.19, recording: 'v4-split', chapter: 'ATO 2 - JORNADA (Comparativo)', mood: 'epico', sfx: 'impact', cutStyle: 'hard-cut' },

  // ATO 2 - JORNADA (Truques)
  { id: '17-agent-team', dur: 30.20, recording: 'v4-diagram', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '18-mcp-servers', dur: 30.30, recording: 'v4-diagram', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '19-subagentes', dur: 34.01, recording: 'v4-diagram', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'data', cutStyle: 'suave' },
  { id: '20-hooks', dur: 31.56, recording: 'v4-config', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'alert', cutStyle: 'suave' },
  { id: '21-skills', dur: 33.00, recording: 'v4-config', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '22-memory', dur: 32.76, recording: 'v4-config', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'calmo', sfx: 'data', cutStyle: 'suave' },
  { id: '23-navegacao-codebase', dur: 34.75, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'didatico', sfx: 'typing', cutStyle: 'rapido' },
  { id: '24-debug', dur: 38.90, recording: 'v4-split', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '25-refactor', dur: 36.42, recording: 'v4-demo', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'epico', sfx: 'success', cutStyle: 'suave' },
  { id: '26-deploy', dur: 30.77, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Truques)', mood: 'epico', sfx: 'success', cutStyle: 'suave' },

  // ATO 2 - JORNADA (Limitacoes)
  { id: '27-limitacao-visual', dur: 29.65, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Limitacoes)', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '28-limitacao-ui', dur: 39.13, recording: 'v4-split', chapter: 'ATO 2 - JORNADA (Limitacoes)', mood: 'didatico', sfx: 'none', cutStyle: 'suave' },
  { id: '29-limitacao-greenfield', dur: 32.94, recording: 'v4-stats', chapter: 'ATO 2 - JORNADA (Limitacoes)', mood: 'didatico', sfx: 'alert', cutStyle: 'suave' },
  { id: '30-workaround', dur: 32.45, recording: 'v4-terminal', chapter: 'ATO 2 - JORNADA (Limitacoes)', mood: 'revelacao', sfx: 'success', cutStyle: 'suave' },

  // ATO 3 - CTA
  { id: '31-cinquenta-projetos', dur: 31.64, recording: 'v4-stats', chapter: 'ATO 3 - CTA', mood: 'epico', sfx: 'dramatic', cutStyle: 'hard-cut' },
  { id: '32-numeros-reais', dur: 31.45, recording: 'v4-stats', chapter: 'ATO 3 - CTA', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },
  { id: '33-novo-perfil', dur: 28.82, recording: 'v4-diagram', chapter: 'ATO 3 - CTA', mood: 'calmo', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '34-empresas-pagam', dur: 32.05, recording: 'v4-stats', chapter: 'ATO 3 - CTA', mood: 'urgente', sfx: 'cash', cutStyle: 'rapido' },
  { id: '35-consultoria', dur: 31.22, recording: 'v4-cta', chapter: 'ATO 3 - CTA', mood: 'calmo', sfx: 'notification', cutStyle: 'suave' },
  { id: '36-cta-final', dur: 37.25, recording: 'v4-cta', chapter: 'ATO 3 - CTA', mood: 'urgente', sfx: 'dramatic', cutStyle: 'fade' },
];

const CONFIG: LongVideoConfig = {
  audioDir: 'audio-v4',
  recordingDir: 'recordings-v4',
  segments: SEGMENTS,
  introLines: [
    { text: 'DELETEI MEU', color: C.red },
    { text: 'EDITOR DE CODIGO' },
    { text: 'Claude Code faz TUDO', color: C.claude },
  ],
  chapters: [
    'ATO 1 - DRAMA',
    'ATO 2 - JORNADA (Setup)',
    'ATO 2 - JORNADA (Fluxo)',
    'ATO 2 - JORNADA (Comparativo)',
    'ATO 2 - JORNADA (Truques)',
    'ATO 2 - JORNADA (Limitacoes)',
    'ATO 3 - CTA',
  ],
  accentColor: C.claude,
};

export const Video4EditorFree: React.FC = () => {
  const { timeline } = buildLongTimeline(SEGMENTS);

  const overlays = (
    <>
      {/* Git log stats */}
      <Sequence from={timeline[1].start + 10} durationInFrames={100}>
        <TitleBadge text="187 COMMITS" sub="14 dias sem abrir VS Code" color={C.claude} />
      </Sequence>

      {/* IDE evolution RIP */}
      <Sequence from={timeline[2].start + 10} durationInFrames={100}>
        <TitleBadge text="RIP IDE" sub="2015 - 2026" color={C.red} />
      </Sequence>

      {/* VS Code pain point */}
      <Sequence from={timeline[3].start} durationInFrames={timeline[3].totalFrames}>
        <DataPoint value="23 abas" label="VS Code travando" x={60} y={870} delay={10} color={C.red} />
        <DataPoint value="5s" label="IntelliSense lag" x={300} y={870} delay={25} color={C.yellow} />
      </Sequence>

      {/* Installation badge */}
      <Sequence from={timeline[4].start + 10} durationInFrames={100}>
        <TitleBadge text="1 COMANDO" sub="npm install -g @anthropic-ai/claude-code" color={C.green} />
      </Sequence>

      {/* CLAUDE.md revelation */}
      <Sequence from={timeline[5].start + 10} durationInFrames={120}>
        <TitleBadge text="CLAUDE.md" sub="O arquivo mais importante do projeto" color={C.claude} />
      </Sequence>

      {/* Flow timer */}
      <Sequence from={timeline[7].start} durationInFrames={timeline[7].totalFrames + timeline[8].totalFrames + timeline[9].totalFrames + timeline[10].totalFrames + timeline[11].totalFrames}>
        <Timer label="Fluxo Completo" current="4 min" color={C.green} />
      </Sequence>

      {/* Comparativo: VS Code vs Claude Code */}
      <Sequence from={timeline[13].start} durationInFrames={timeline[13].totalFrames + timeline[14].totalFrames + timeline[15].totalFrames}>
        <Scoreboard
          items={[
            { label: 'VS Code', score: 45, color: '#007acc' },
            { label: 'Claude Code', score: 6, color: C.claude },
          ]}
          highlight={1}
        />
      </Sequence>

      {/* Result badge */}
      <Sequence from={timeline[15].start + 10} durationInFrames={100}>
        <TitleBadge text="10x MAIS RAPIDO" sub="6 min vs 45 min" color={C.green} />
      </Sequence>

      {/* Truques progress */}
      <Sequence from={timeline[16].start} durationInFrames={300}>
        <Timer label="Truques Avancados" current="6 truques" color={C.cyan} />
      </Sequence>

      {/* MCP diagram */}
      <Sequence from={timeline[17].start + 10} durationInFrames={100}>
        <TitleBadge text="MCP SERVERS" sub="Pinecone + GitHub + Filesystem" color={C.cyan} />
      </Sequence>

      {/* Debug comparison */}
      <Sequence from={timeline[23].start + 10} durationInFrames={100}>
        <TitleBadge text="SEM BREAKPOINT" sub="Debug por leitura de codigo" color={C.purple} />
      </Sequence>

      {/* Refactor stats */}
      <Sequence from={timeline[24].start} durationInFrames={timeline[24].totalFrames}>
        <DataPoint value="32 arquivos" label="Modificados" x={60} y={870} delay={10} color={C.green} />
        <DataPoint value="0 bugs" label="Regressao" x={300} y={870} delay={25} color={C.green} />
        <DataPoint value="12 min" label="Tempo total" x={540} y={870} delay={40} color={C.claude} />
      </Sequence>

      {/* Limitations honesty */}
      <Sequence from={timeline[26].start + 10} durationInFrames={120}>
        <TitleBadge text="LIMITACOES" sub="Honestidade que ninguem mostra" color={C.yellow} />
      </Sequence>

      {/* Efficiency spectrum */}
      <Sequence from={timeline[28].start} durationInFrames={timeline[28].totalFrames}>
        <ProgressBar progress={70} label="Greenfield com CLAUDE.md" color={C.yellow} />
      </Sequence>

      {/* 53 projects stats */}
      <Sequence from={timeline[30].start} durationInFrames={timeline[30].totalFrames + timeline[31].totalFrames}>
        <DataPoint value="53" label="Projetos em producao" x={60} y={870} delay={10} color={C.green} />
        <DataPoint value="-82%" label="Bugs em producao" x={280} y={870} delay={25} color={C.green} />
        <DataPoint value="6h/dia" label="Antes: 12h/dia" x={500} y={870} delay={40} color={C.claude} />
      </Sequence>

      {/* Companies pay */}
      <Sequence from={timeline[33].start + 10} durationInFrames={100}>
        <TitleBadge text="R$5K-15K" sub="Por implementacao com Claude Code" color={C.gold} />
      </Sequence>

      {/* CTA consultoria */}
      <Sequence from={timeline[34].start + 5} durationInFrames={timeline[34].totalFrames + timeline[35].totalFrames}>
        <TitleBadge
          text="CONSULTORIA R$500/h"
          sub="Setup Claude Code no seu projeto real"
          color={C.gold}
          fadeOut={timeline[34].totalFrames + timeline[35].totalFrames}
        />
      </Sequence>
    </>
  );

  return <LongVideoComposition config={CONFIG} overlays={overlays} />;
};
