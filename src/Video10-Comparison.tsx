import React from 'react';
import { Sequence } from 'remotion';
import {
  LongVideoComposition,
  TitleBadge,
  DataPoint,
  Scoreboard,
  Timer,
  C,
  buildLongTimeline,
  type LongSegmentDef,
  type LongVideoConfig,
} from './VideoLongBase';

// Recording mapping:
// v10-hero: Hook/intro screens
// v10-challenge: Desafio setup screen
// v10-copilot: VS Code + Copilot testing
// v10-cursor: Cursor AI testing
// v10-claude: Claude Code terminal testing
// v10-compare: Comparison charts/tables
// v10-verdict: Verdict/when-to-use screens
// v10-cta: CTA consultoria screen

const SEGMENTS: LongSegmentDef[] = [
  // HOOK
  { id: '01-hook-desafio', dur: 24.17, recording: 'v10-hero', chapter: 'Hook', mood: 'tenso', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '02-hook-contexto', dur: 22.31, recording: 'v10-hero', chapter: 'Hook', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '03-hook-stakes', dur: 26.67, recording: 'v10-hero', chapter: 'Hook', mood: 'urgente', sfx: 'cash', cutStyle: 'rapido' },
  { id: '04-hook-promessa', dur: 24.45, recording: 'v10-hero', chapter: 'Hook', mood: 'epico', sfx: 'whoosh', cutStyle: 'suave' },
  { id: '05-hook-credibilidade', dur: 23.67, recording: 'v10-hero', chapter: 'Hook', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },

  // O DESAFIO
  { id: '06-desafio-regras', dur: 27.93, recording: 'v10-challenge', chapter: 'O Desafio', mood: 'didatico', sfx: 'notification', cutStyle: 'hard-cut' },

  // COPILOT
  { id: '07-copilot-intro', dur: 24.95, recording: 'v10-copilot', chapter: 'Copilot', mood: 'didatico', sfx: 'whoosh', cutStyle: 'hard-cut' },
  { id: '08-copilot-setup', dur: 29.05, recording: 'v10-copilot', chapter: 'Copilot', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '09-copilot-crud', dur: 27.61, recording: 'v10-copilot', chapter: 'Copilot', mood: 'didatico', sfx: 'typing', cutStyle: 'suave' },
  { id: '10-copilot-auth', dur: 27.64, recording: 'v10-copilot', chapter: 'Copilot', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '11-copilot-banco', dur: 25.00, recording: 'v10-copilot', chapter: 'Copilot', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '12-copilot-deploy', dur: 26.91, recording: 'v10-copilot', chapter: 'Copilot', mood: 'tenso', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '13-copilot-score', dur: 29.23, recording: 'v10-compare', chapter: 'Copilot', mood: 'didatico', sfx: 'notification', cutStyle: 'hard-cut' },
  { id: '14-copilot-veredito', dur: 25.65, recording: 'v10-compare', chapter: 'Copilot', mood: 'didatico', sfx: 'whoosh', cutStyle: 'suave' },

  // CURSOR
  { id: '15-cursor-intro', dur: 27.14, recording: 'v10-cursor', chapter: 'Cursor', mood: 'didatico', sfx: 'whoosh', cutStyle: 'hard-cut' },
  { id: '16-cursor-setup', dur: 27.93, recording: 'v10-cursor', chapter: 'Cursor', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },
  { id: '17-cursor-crud', dur: 27.20, recording: 'v10-cursor', chapter: 'Cursor', mood: 'didatico', sfx: 'success', cutStyle: 'suave' },
  { id: '18-cursor-auth', dur: 24.45, recording: 'v10-cursor', chapter: 'Cursor', mood: 'didatico', sfx: 'typing', cutStyle: 'rapido' },
  { id: '19-cursor-tab', dur: 26.02, recording: 'v10-cursor', chapter: 'Cursor', mood: 'epico', sfx: 'typing', cutStyle: 'suave' },
  { id: '20-cursor-banco', dur: 26.86, recording: 'v10-cursor', chapter: 'Cursor', mood: 'didatico', sfx: 'success', cutStyle: 'suave' },
  { id: '21-cursor-limitacoes', dur: 26.44, recording: 'v10-cursor', chapter: 'Cursor', mood: 'tenso', sfx: 'tension', cutStyle: 'rapido' },
  { id: '22-cursor-deploy', dur: 27.33, recording: 'v10-compare', chapter: 'Cursor', mood: 'didatico', sfx: 'notification', cutStyle: 'hard-cut' },
  { id: '23-cursor-score', dur: 27.27, recording: 'v10-compare', chapter: 'Cursor', mood: 'didatico', sfx: 'notification', cutStyle: 'hard-cut' },

  // CLAUDE CODE
  { id: '24-claude-intro', dur: 30.25, recording: 'v10-claude', chapter: 'Claude Code', mood: 'epico', sfx: 'impact', cutStyle: 'hard-cut' },
  { id: '25-claude-setup', dur: 28.71, recording: 'v10-claude', chapter: 'Claude Code', mood: 'epico', sfx: 'typing', cutStyle: 'suave' },
  { id: '26-claude-autonomia', dur: 30.67, recording: 'v10-claude', chapter: 'Claude Code', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },
  { id: '27-claude-crud', dur: 30.91, recording: 'v10-claude', chapter: 'Claude Code', mood: 'didatico', sfx: 'success', cutStyle: 'suave' },
  { id: '28-claude-auth', dur: 28.06, recording: 'v10-claude', chapter: 'Claude Code', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },
  { id: '29-claude-git', dur: 30.67, recording: 'v10-claude', chapter: 'Claude Code', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '30-claude-deploy', dur: 30.07, recording: 'v10-claude', chapter: 'Claude Code', mood: 'epico', sfx: 'success', cutStyle: 'rapido' },
  { id: '31-claude-score', dur: 30.12, recording: 'v10-compare', chapter: 'Claude Code', mood: 'epico', sfx: 'success', cutStyle: 'hard-cut' },

  // COMPARATIVO
  { id: '32-comparativo-intro', dur: 16.17, recording: 'v10-compare', chapter: 'Comparativo', mood: 'tenso', sfx: 'tension', cutStyle: 'hard-cut' },
  { id: '33-comparativo-tempo', dur: 25.79, recording: 'v10-compare', chapter: 'Comparativo', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },
  { id: '34-comparativo-erros', dur: 28.69, recording: 'v10-compare', chapter: 'Comparativo', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '35-comparativo-qualidade', dur: 30.85, recording: 'v10-compare', chapter: 'Comparativo', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '36-comparativo-custo', dur: 28.48, recording: 'v10-compare', chapter: 'Comparativo', mood: 'urgente', sfx: 'cash', cutStyle: 'rapido' },
  { id: '37-comparativo-autonomia', dur: 29.65, recording: 'v10-compare', chapter: 'Comparativo', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },
  { id: '38-comparativo-tabela-final', dur: 26.44, recording: 'v10-compare', chapter: 'Comparativo', mood: 'epico', sfx: 'success', cutStyle: 'hard-cut' },

  // VEREDICTO
  { id: '39-veredicto-honesto', dur: 27.80, recording: 'v10-verdict', chapter: 'Veredicto', mood: 'calmo', sfx: 'none', cutStyle: 'suave' },
  { id: '40-quando-usar', dur: 36.99, recording: 'v10-verdict', chapter: 'Veredicto', mood: 'didatico', sfx: 'notification', cutStyle: 'suave' },
  { id: '41-combinacao', dur: 28.82, recording: 'v10-verdict', chapter: 'Veredicto', mood: 'epico', sfx: 'impact', cutStyle: 'rapido' },

  // CTA
  { id: '42-cta-setup', dur: 28.58, recording: 'v10-cta', chapter: 'CTA', mood: 'urgente', sfx: 'notification', cutStyle: 'hard-cut' },
  { id: '43-cta-preco', dur: 30.67, recording: 'v10-cta', chapter: 'CTA', mood: 'urgente', sfx: 'cash', cutStyle: 'rapido' },
  { id: '44-cta-close', dur: 26.20, recording: 'v10-cta', chapter: 'CTA', mood: 'epico', sfx: 'success', cutStyle: 'fade' },
];

const CONFIG: LongVideoConfig = {
  audioDir: 'audio-v10',
  recordingDir: 'recordings-v10',
  segments: SEGMENTS,
  introLines: [
    { text: 'Claude Code vs Cursor vs Copilot' },
    { text: 'O TESTE DEFINITIVO', color: C.gold },
    { text: 'Resultado me CHOCOU', color: C.red },
  ],
  chapters: ['Hook', 'O Desafio', 'Copilot', 'Cursor', 'Claude Code', 'Comparativo', 'Veredicto', 'CTA'],
  accentColor: C.gold,
};

export const Video10Comparison: React.FC = () => {
  const { timeline } = buildLongTimeline(SEGMENTS);

  // Persistent scoreboard during tests
  const copilotStart = timeline[6].start; // 07-copilot-intro
  const claudeEnd = timeline[30].start + timeline[30].totalFrames; // end of 31-claude-score

  const overlays = (
    <>
      {/* Stakes: money calculation */}
      <Sequence from={timeline[2].start} durationInFrames={timeline[2].totalFrames}>
        <DataPoint value="R$54K" label="Perdidos/ano com ferramenta errada" x={60} y={870} delay={15} color={C.red} />
      </Sequence>

      {/* Challenge checklist */}
      <Sequence from={timeline[5].start + 10} durationInFrames={120}>
        <TitleBadge text="O DESAFIO" sub="CRUD + Auth + PostgreSQL + Deploy" color={C.gold} />
      </Sequence>

      {/* Scoreboard during ALL tests */}
      <Sequence from={copilotStart} durationInFrames={claudeEnd - copilotStart}>
        <Scoreboard
          items={[
            { label: 'Copilot', score: 0, color: '#007acc' },
            { label: 'Cursor', score: 0, color: C.purple },
            { label: 'Claude Code', score: 0, color: C.claude },
          ]}
        />
      </Sequence>

      {/* Copilot round badge */}
      <Sequence from={timeline[6].start + 5} durationInFrames={90}>
        <TitleBadge text="ROUND 1" sub="GitHub Copilot - $10/mes" color={'#007acc'} />
      </Sequence>

      {/* Copilot auth pain */}
      <Sequence from={timeline[9].start} durationInFrames={timeline[9].totalFrames}>
        <Timer label="Auth Copilot" current="47 min" color={C.red} />
      </Sequence>

      {/* Copilot score */}
      <Sequence from={timeline[12].start} durationInFrames={timeline[12].totalFrames}>
        <DataPoint value="2h38" label="Tempo total" x={60} y={870} delay={10} color={C.red} />
        <DataPoint value="19" label="Erros" x={280} y={870} delay={20} color={C.red} />
        <DataPoint value="6.5/10" label="Qualidade" x={460} y={870} delay={30} color={C.yellow} />
      </Sequence>

      {/* Cursor round badge */}
      <Sequence from={timeline[14].start + 5} durationInFrames={90}>
        <TitleBadge text="ROUND 2" sub="Cursor AI - $20/mes" color={C.purple} />
      </Sequence>

      {/* Cursor Agent Mode wow */}
      <Sequence from={timeline[15].start + 10} durationInFrames={100}>
        <Timer label="Agent Mode" current="2:47" color={C.purple} />
      </Sequence>

      {/* Cursor Tab prediction */}
      <Sequence from={timeline[18].start + 10} durationInFrames={100}>
        <TitleBadge text="TAB PREDICTION" sub="Multi-line autocomplete" color={C.purple} />
      </Sequence>

      {/* Cursor score */}
      <Sequence from={timeline[22].start} durationInFrames={timeline[22].totalFrames}>
        <DataPoint value="1h22" label="Tempo total" x={60} y={870} delay={10} color={C.yellow} />
        <DataPoint value="7" label="Erros" x={280} y={870} delay={20} color={C.yellow} />
        <DataPoint value="8.0/10" label="Qualidade" x={460} y={870} delay={30} color={C.green} />
      </Sequence>

      {/* Claude Code round badge */}
      <Sequence from={timeline[23].start + 5} durationInFrames={90}>
        <TitleBadge text="ROUND 3" sub="Claude Code - $20/mes" color={C.claude} />
      </Sequence>

      {/* Claude autonomy timer */}
      <Sequence from={timeline[25].start} durationInFrames={timeline[25].totalFrames}>
        <Timer label="ZERO INTERVENCAO" current="6 min" color={C.green} />
      </Sequence>

      {/* Claude auth comparison */}
      <Sequence from={timeline[27].start + 10} durationInFrames={100}>
        <TitleBadge text="12 MIN / 0 ERROS" sub="Auth: Copilot 47min vs Cursor 16min vs Claude 12min" color={C.green} />
      </Sequence>

      {/* Claude deploy badge */}
      <Sequence from={timeline[29].start + 10} durationInFrames={100}>
        <TitleBadge text="DEPLOY AUTONOMO" sub="Unico que faz deploy sem ajuda" color={C.green} />
      </Sequence>

      {/* Claude score */}
      <Sequence from={timeline[30].start} durationInFrames={timeline[30].totalFrames}>
        <DataPoint value="54 min" label="Tempo total" x={60} y={870} delay={10} color={C.green} />
        <DataPoint value="2" label="Erros (auto-fix)" x={280} y={870} delay={20} color={C.green} />
        <DataPoint value="9.2/10" label="Qualidade" x={460} y={870} delay={30} color={C.green} />
      </Sequence>

      {/* Final comparison: time bars */}
      <Sequence from={timeline[32].start} durationInFrames={timeline[32].totalFrames}>
        <DataPoint value="3x" label="Claude Code mais rapido" x={60} y={870} delay={10} color={C.green} />
      </Sequence>

      {/* Error comparison */}
      <Sequence from={timeline[33].start} durationInFrames={timeline[33].totalFrames}>
        <DataPoint value="99.7%" label="Taxa de acerto Claude Code" x={60} y={870} delay={10} color={C.green} />
      </Sequence>

      {/* Winner badge */}
      <Sequence from={timeline[37].start + 10} durationInFrames={120}>
        <TitleBadge text="VENCEDOR: CLAUDE CODE" sub="5 de 6 categorias" color={C.gold} />
      </Sequence>

      {/* Combo power */}
      <Sequence from={timeline[40].start + 10} durationInFrames={100}>
        <TitleBadge text="COMBO: CURSOR + CLAUDE CODE" sub="$40/mes = produtividade de 3 devs" color={C.green} />
      </Sequence>

      {/* CTA consultoria */}
      <Sequence from={timeline[41].start + 5} durationInFrames={timeline[41].totalFrames + timeline[42].totalFrames + timeline[43].totalFrames}>
        <TitleBadge
          text="CONSULTORIA R$500/h"
          sub="Claude Code do zero ao deploy"
          color={C.gold}
          fadeOut={timeline[41].totalFrames + timeline[42].totalFrames + timeline[43].totalFrames}
        />
      </Sequence>
    </>
  );

  return <LongVideoComposition config={CONFIG} overlays={overlays} />;
};
