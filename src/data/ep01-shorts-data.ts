import {Chapter, EP01_A_ROLL_SRC, EP01_FPS, secondsToFrames} from './ep01-real-edit-timeline';

export type ShortSegmentKind = 'face' | 'screen' | 'proof' | 'jarb';
export type ShortSoundProfile = 'punchy' | 'dramatic' | 'proof' | 'objection';

export type ShortSegmentDefinition = {
  id: string;
  kind: ShortSegmentKind;
  chapter: Chapter;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  audioFile?: string;
  visualSource?: string;
  visualTrimBefore?: number;
  visualObjectFit?: 'cover' | 'contain';
  kicker?: string;
  headline: string[];
  caption?: string;
};

export type ShortDefinition = {
  id: string;
  compositionId: string;
  title: string;
  accent: string;
  prompt: string;
  soundProfile: ShortSoundProfile;
  hookVoiceover?: string;
  hookAudioFile?: string;
  hookDurationSec?: number;
  hookText?: string[];
  segments: ShortSegmentDefinition[];
};

export const EP01_SHORT_A_ROLL_SRC = EP01_A_ROLL_SRC;

const shortDefinitions: ShortDefinition[] = [
  {
    id: 'ep01-short-01',
    compositionId: 'Video12-EP01-Short01',
    title: '14 Horas Para 7 Projetos',
    accent: '#ff4d4d',
    prompt: 'Comenta "ESCALA" que eu solto a parte 2.',
    soundProfile: 'punchy',
    hookVoiceover: 'Em três semanas eu saí de quatorze horas por dia para sete projetos em operação.',
    hookAudioFile: 'audio/short-hooks/ep01-short-01-hook.mp3',
    hookDurationSec: 5.05,
    hookText: ['14 HORAS', 'PARA 7 PROJETOS'],
    segments: [
      {
        id: 's01-a',
        kind: 'face',
        chapter: 'hook',
        startSec: 1.68,
        endSec: 11.92,
        kicker: 'ANTES',
        headline: ['14 HORAS/DIA', '2 PROJETOS', 'ZERO ESCALABILIDADE'],
        caption: 'O gargalo da empresa era eu mesmo.',
      },
      {
        id: 's01-b',
        kind: 'face',
        chapter: 'hook',
        startSec: 12.56,
        endSec: 27.76,
        kicker: 'DEPOIS',
        headline: ['7 PROJETOS', '8 HORAS', 'US$100/MÊS'],
        caption: 'Menos de R$600 para operar tudo.',
      },
      {
        id: 's01-c',
        kind: 'face',
        chapter: 'hook',
        startSec: 27.76,
        endSec: 34.56,
        kicker: 'VIRADA',
        headline: ['ISSO ACONTECEU DE VERDADE'],
        caption: 'Foi a minha virada nas últimas 3 semanas.',
      },
    ],
  },
  {
    id: 'ep01-short-02',
    compositionId: 'Video12-EP01-Short02',
    title: 'O Ciclo Do Empreendedor Solo',
    accent: '#ff9f1c',
    prompt: 'Comenta "GARGALO" se você vive esse ciclo.',
    soundProfile: 'dramatic',
    hookVoiceover: 'Se você vende e trava, esse vídeo é sobre o gargalo certo.',
    hookAudioFile: 'audio/short-hooks/ep01-short-02-hook.mp3',
    hookDurationSec: 3.43,
    hookText: ['VENDE', 'E TRAVA'],
    segments: [
      {
        id: 's02-a',
        kind: 'screen',
        chapter: 'contexto',
        startSec: 56.8,
        endSec: 71.86,
        visualSource: 'recordings-v11/v11-problema.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'A DOR',
        headline: ['EMPREENDEDOR SOLO', 'VENDE E TRAVA', 'ENTREGA E PARA DE VENDER'],
        caption: 'Sem alavancagem, o negócio gira em círculo.',
      },
      {
        id: 's02-b',
        kind: 'screen',
        chapter: 'contexto',
        startSec: 72.84,
        endSec: 84.62,
        visualSource: 'recordings-v11/v11-problema.webm',
        visualTrimBefore: 10,
        visualObjectFit: 'contain',
        kicker: 'CAOS',
        headline: ['TICKET', 'BUG', 'DEPLOY', 'FOLLOW UP'],
        caption: 'Tudo na mesma pessoa, ao mesmo tempo.',
      },
      {
        id: 's02-c',
        kind: 'jarb',
        chapter: 'contexto',
        durationSec: 4.414694,
        audioFile: 'audio/jarb_ep01_1.mp3',
        kicker: 'JARB',
        headline: ['VOCÊ ERA BOM', 'MAS PRESO NO OPERACIONAL'],
        caption: 'Essa é a dor que trava negócio pequeno.',
      },
    ],
  },
  {
    id: 'ep01-short-03',
    compositionId: 'Video12-EP01-Short03',
    title: 'O Problema Era Alavancagem',
    accent: '#ffd54a',
    prompt: 'Comenta "ALAVANCAGEM" que eu abro esse framework.',
    soundProfile: 'punchy',
    hookVoiceover: 'O problema não era habilidade. Era alavancagem.',
    hookAudioFile: 'audio/short-hooks/ep01-short-03-hook.mp3',
    hookDurationSec: 3.77,
    hookText: ['NÃO ERA', 'HABILIDADE'],
    segments: [
      {
        id: 's03-a',
        kind: 'screen',
        chapter: 'contexto',
        startSec: 85.86,
        endSec: 91.62,
        visualSource: 'recordings-v11/v11-problema.webm',
        visualTrimBefore: 20,
        visualObjectFit: 'contain',
        kicker: 'VIRADA MENTAL',
        headline: ['O PROBLEMA NÃO ERA HABILIDADE'],
        caption: 'Era falta de alavancagem.',
      },
      {
        id: 's03-b',
        kind: 'screen',
        chapter: 'virada',
        startSec: 104.94,
        endSec: 123.18,
        visualSource: 'recordings-v4/v4-config.webm',
        visualTrimBefore: 4,
        visualObjectFit: 'contain',
        kicker: 'O NOVO MODELO',
        headline: ['NÃO É ASSISTENTE', 'NEM CHATBOT GLORIFICADO'],
        caption: 'Eu comecei a tratar como CTO virtual.',
      },
      {
        id: 's03-c',
        kind: 'face',
        chapter: 'virada',
        startSec: 183.8,
        endSec: 188.08,
        kicker: 'RESUMO',
        headline: ['FOI UMA VIRADA DE CHAVE'],
        caption: 'Mudou como eu penso e como eu executo.',
      },
    ],
  },
  {
    id: 'ep01-short-04',
    compositionId: 'Video12-EP01-Short04',
    title: 'CLAUDE.md Muda O Resultado',
    accent: '#00d4ff',
    prompt: 'Comenta "MD" que eu mostro a estrutura.',
    soundProfile: 'proof',
    hookVoiceover: 'Um arquivo mudou a qualidade de tudo que a IA me entregava.',
    hookAudioFile: 'audio/short-hooks/ep01-short-04-hook.mp3',
    hookDurationSec: 3.37,
    hookText: ['O ARQUIVO', 'QUE MUDA TUDO'],
    segments: [
      {
        id: 's04-a',
        kind: 'screen',
        chapter: 'virada',
        startSec: 114.4,
        endSec: 123.18,
        visualSource: 'recordings-v4/v4-config.webm',
        visualTrimBefore: 6,
        visualObjectFit: 'contain',
        kicker: 'ARQUIVO-CHAVE',
        headline: ['CLAUDE.md', 'CONTRATO DE TRABALHO'],
        caption: 'Quem a IA é, as regras e a prioridade do projeto.',
      },
      {
        id: 's04-b',
        kind: 'screen',
        chapter: 'virada',
        startSec: 141.08,
        endSec: 154.08,
        visualSource: 'recordings-v11/v11-solucao.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'CONTEXTO',
        headline: ['REGRAS', 'PRIORIDADES', 'STACK'],
        caption: 'A IA entra sabendo como decidir.',
      },
      {
        id: 's04-c',
        kind: 'screen',
        chapter: 'virada',
        startSec: 169.22,
        endSec: 183.58,
        visualSource: 'recordings-v4/v4-terminal.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'RESULTADO',
        headline: ['ANALISA A CODEBASE', 'SEGUE A ARQUITETURA', 'IMPLEMENTA A FEATURE'],
        caption: 'É isso que muda o nível da saída.',
      },
    ],
  },
  {
    id: 'ep01-short-05',
    compositionId: 'Video12-EP01-Short05',
    title: 'Sete Projetos Reais Em Produção',
    accent: '#7cfc00',
    prompt: 'Comenta "PROVA" se quiser ver o resto do ecossistema.',
    soundProfile: 'proof',
    hookVoiceover: 'Não me pede opinião. Me pede prova.',
    hookAudioFile: 'audio/short-hooks/ep01-short-05-hook.mp3',
    hookDurationSec: 2.59,
    hookText: ['PROVA', 'REAL'],
    segments: [
      {
        id: 's05-a',
        kind: 'face',
        chapter: 'prova',
        startSec: 199.1,
        endSec: 202.32,
        kicker: 'PROVA',
        headline: ['O QUE MUDOU NA PRÁTICA'],
        caption: 'Não é slide bonito. É operação real.',
      },
      {
        id: 's05-b',
        kind: 'proof',
        chapter: 'prova',
        startSec: 204.54,
        endSec: 211.0,
        visualSource: 'recordings-v11/v11-prova.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'VISÃO GERAL',
        headline: ['PROJETOS REAIS', 'SISTEMA RODANDO'],
        caption: 'Tudo isso foi feito com Claude Code.',
      },
      {
        id: 's05-c',
        kind: 'proof',
        chapter: 'prova',
        startSec: 211.78,
        endSec: 220.42,
        visualSource: 'recordings-v2/v2-licitaai.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'LICITAAI',
        headline: ['QUASE 3 MIL LICITAÇÕES', 'RECEITA RECORRENTE'],
        caption: 'Projeto real de alto nível.',
      },
      {
        id: 's05-d',
        kind: 'proof',
        chapter: 'prova',
        startSec: 220.42,
        endSec: 235.16,
        visualSource: 'recordings-v2/v2-superbot.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'SUPERBOT',
        headline: ['3 CLIENTES', '15 AGENTES', '39 FERRAMENTAS'],
        caption: 'Não é side project. Está operando.',
      },
    ],
  },
  {
    id: 'ep01-short-06',
    compositionId: 'Video12-EP01-Short06',
    title: 'Uma Pessoa Operando Tudo Isso',
    accent: '#00ff88',
    prompt: 'Comenta "PAINEL" se quiser tour do Orquestra.',
    soundProfile: 'proof',
    hookVoiceover: 'Isso aqui não é produtividade. É operação.',
    hookAudioFile: 'audio/short-hooks/ep01-short-06-hook.mp3',
    hookDurationSec: 2.93,
    hookText: ['NÃO É', 'PRODUTIVIDADE'],
    segments: [
      {
        id: 's06-a',
        kind: 'proof',
        chapter: 'prova',
        startSec: 287.46,
        endSec: 298.0,
        visualSource: 'recordings-v11/v11-prova.webm',
        visualTrimBefore: 18,
        visualObjectFit: 'contain',
        kicker: 'ORQUESTRA',
        headline: ['PAINEL DE CTO', 'BRIEFING DIÁRIO'],
        caption: 'Tudo o que precisa de atenção chega pronto.',
      },
      {
        id: 's06-b',
        kind: 'proof',
        chapter: 'prova',
        startSec: 319.04,
        endSec: 334.34,
        visualSource: 'recordings-v2/v3-pipeline.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'PIPELINE',
        headline: ['FIEL', 'ISSUEMAPPER', 'VIDEO FACTORY'],
        caption: 'Mais um bloco do ecossistema operando em paralelo.',
      },
      {
        id: 's06-c',
        kind: 'face',
        chapter: 'prova',
        startSec: 342.66,
        endSec: 355.8,
        kicker: 'NÚMERO REAL',
        headline: ['1 PESSOA', '7 PROJETOS', 'ATUALIZAÇÕES CONSTANTES'],
        caption: 'Esse é o tipo de alavancagem que interessa.',
      },
      {
        id: 's06-d',
        kind: 'jarb',
        chapter: 'prova',
        durationSec: 6.582857,
        audioFile: 'audio/jarb_ep01_2.mp3',
        kicker: 'JARB',
        headline: ['ISSO NÃO É SÓ PRODUTIVIDADE', 'ISSO É ALAVANCAGEM'],
        caption: 'É operação com IA, não hobby com prompt.',
      },
    ],
  },
  {
    id: 'ep01-short-07',
    compositionId: 'Video12-EP01-Short07',
    title: 'Skills São Departamentos Da IA',
    accent: '#ffd54a',
    prompt: 'Comenta "SKILLS" que eu abro a pasta inteira.',
    soundProfile: 'punchy',
    hookVoiceover: 'Skills são departamentos para a IA.',
    hookAudioFile: 'audio/short-hooks/ep01-short-07-hook.mp3',
    hookDurationSec: 2.22,
    hookText: ['SKILLS', 'DEPARTAMENTOS'],
    segments: [
      {
        id: 's07-a',
        kind: 'screen',
        chapter: 'metodo',
        startSec: 437.16,
        endSec: 457.46,
        visualSource: 'recordings-v4/v4-config.webm',
        visualTrimBefore: 12,
        visualObjectFit: 'contain',
        kicker: 'MUDANÇA 2',
        headline: ['SKILLS', 'DEPARTAMENTOS DA IA'],
        caption: 'Conhecimento empacotado para uma tarefa específica.',
      },
      {
        id: 's07-b',
        kind: 'screen',
        chapter: 'metodo',
        startSec: 475.46,
        endSec: 488.58,
        visualSource: 'recordings-v4/v4-config.webm',
        visualTrimBefore: 24,
        visualObjectFit: 'contain',
        kicker: 'CONTEXTO',
        headline: ['CADA SKILL TEM REGRAS', 'WORKFLOW', 'CHAVE', 'COMANDO'],
        caption: 'A IA chega pronta antes de executar.',
      },
      {
        id: 's07-c',
        kind: 'jarb',
        chapter: 'metodo',
        durationSec: 4.91102,
        audioFile: 'audio/jarb_ep01_3.mp3',
        kicker: 'JARB',
        headline: ['DA EXECUÇÃO PARA A DIREÇÃO'],
        caption: 'Esse é o salto operacional.',
      },
    ],
  },
  {
    id: 'ep01-short-08',
    compositionId: 'Video12-EP01-Short08',
    title: 'O Que Separa Brincar De Operar',
    accent: '#ff7b7b',
    prompt: 'Comenta "GATE" que eu abro meu fluxo.',
    soundProfile: 'dramatic',
    hookVoiceover: 'Sem gate de qualidade, IA vira cassino.',
    hookAudioFile: 'audio/short-hooks/ep01-short-08-hook.mp3',
    hookDurationSec: 2.77,
    hookText: ['SEM GATE', 'É CASSINO'],
    segments: [
      {
        id: 's08-a',
        kind: 'screen',
        chapter: 'metodo',
        startSec: 532.4,
        endSec: 554.14,
        visualSource: 'recordings-v4/v4-diagram.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'MUDANÇA 3',
        headline: ['ANÁLISE DE IMPACTO', 'BRANCH POR TAREFA', 'PR AUTOMÁTICO'],
        caption: 'Nada entra sem trilho.',
      },
      {
        id: 's08-b',
        kind: 'screen',
        chapter: 'metodo',
        startSec: 554.94,
        endSec: 570.0,
        visualSource: 'recordings-v4/v4-terminal.webm',
        visualTrimBefore: 10,
        visualObjectFit: 'contain',
        kicker: 'GATE',
        headline: ['NADA ENTRA SEM', 'QUALIDADE'],
        caption: 'É isso que separa brincar com IA de operar com IA.',
      },
      {
        id: 's08-c',
        kind: 'screen',
        chapter: 'metodo',
        startSec: 570.0,
        endSec: 583.86,
        visualSource: 'recordings-v4/v4-terminal.webm',
        visualTrimBefore: 20,
        visualObjectFit: 'contain',
        kicker: 'FRAMEWORK',
        headline: ['PLANEJAR', 'EXECUTAR', 'DEBUGAR', 'REVISAR'],
        caption: 'Processo simples. Disciplina alta.',
      },
    ],
  },
  {
    id: 'ep01-short-09',
    compositionId: 'Video12-EP01-Short09',
    title: 'Isso Funciona Em Projeto Complexo',
    accent: '#00d4ff',
    prompt: 'Comenta "COMPLEXO" que eu mostro o LicitaAI.',
    soundProfile: 'objection',
    hookVoiceover: 'Isso aqui funciona quando o projeto é realmente complexo.',
    hookAudioFile: 'audio/short-hooks/ep01-short-09-hook.mp3',
    hookDurationSec: 3.35,
    hookText: ['FUNCIONA', 'NO COMPLEXO'],
    segments: [
      {
        id: 's09-a',
        kind: 'face',
        chapter: 'objecao',
        startSec: 592.78,
        endSec: 605.36,
        kicker: 'OBJEÇÃO',
        headline: ['ISSO SÓ FUNCIONA', 'EM COISA SIMPLES?'],
        caption: 'Essa é a pergunta mais comum.',
      },
      {
        id: 's09-b',
        kind: 'proof',
        chapter: 'objecao',
        startSec: 605.36,
        endSec: 633.7,
        visualSource: 'recordings-v2/v2-licitaai.webm',
        visualTrimBefore: 0,
        visualObjectFit: 'contain',
        kicker: 'LICITAAI',
        headline: ['FILAS', 'MULTI STEP', 'RAG', 'PNCP'],
        caption: 'Isso não é CRUD. É engenharia em produção.',
      },
      {
        id: 's09-c',
        kind: 'face',
        chapter: 'objecao',
        startSec: 633.7,
        endSec: 644.46,
        kicker: 'RESPOSTA',
        headline: ['NÍVEL ALTO', 'COM CRIATIVIDADE', 'E CONTEXTO'],
        caption: 'Dá para chegar muito mais longe do que parece.',
      },
    ],
  },
  {
    id: 'ep01-short-10',
    compositionId: 'Video12-EP01-Short10',
    title: 'IA Erra, Mas O Erro Ficou Barato',
    accent: '#d9dde5',
    prompt: 'Comenta "OPERADOR" que eu solto a continuação.',
    soundProfile: 'objection',
    hookVoiceover: 'IA erra. O ponto é quanto custa esse erro.',
    hookAudioFile: 'audio/short-hooks/ep01-short-10-hook.mp3',
    hookDurationSec: 3.24,
    hookText: ['IA ERRA', 'E AGORA?'],
    segments: [
      {
        id: 's10-a',
        kind: 'jarb',
        chapter: 'honestidade',
        durationSec: 1.436735,
        audioFile: 'audio/jarb_ep01_4.mp3',
        kicker: 'JARB',
        headline: ['E SE O CLAUDE ERRA?'],
        caption: 'A objeção certa.',
      },
      {
        id: 's10-b',
        kind: 'face',
        chapter: 'honestidade',
        startSec: 730.2,
        endSec: 745.42,
        kicker: 'HONESTIDADE',
        headline: ['ERRA', 'CLARO QUE ERRA'],
        caption: 'O ponto não é IA perfeita.',
      },
      {
        id: 's10-c',
        kind: 'face',
        chapter: 'honestidade',
        startSec: 745.42,
        endSec: 760.0,
        kicker: 'ALAVANCAGEM',
        headline: ['O ERRO DELA', 'É MAIS BARATO QUE O MEU'],
        caption: 'Ela refaz em minutos. Eu perdia horas.',
      },
      {
        id: 's10-d',
        kind: 'face',
        chapter: 'virada_final',
        startSec: 772.36,
        endSec: 791.9,
        kicker: 'BIG IDEA',
        headline: ['EU NÃO VIREI UM CARA DE IA', 'VIREI UM OPERADOR DE SISTEMAS'],
        caption: 'Essa frase resume o canal inteiro.',
      },
    ],
  },
];

export type BuiltShortSegment = ShortSegmentDefinition & {
  fromFrame: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
};

export type BuiltShortDefinition = ShortDefinition & {
  hookFrames: number;
  totalFrames: number;
  totalSeconds: number;
  segments: BuiltShortSegment[];
};

const buildShort = (definition: ShortDefinition): BuiltShortDefinition => {
  const hookFrames = definition.hookDurationSec ? secondsToFrames(definition.hookDurationSec) : 0;
  let cursor = hookFrames;

  const segments = definition.segments.map((segment) => {
    const durationSec =
      segment.durationSec ??
      Math.max(0.1, (segment.endSec ?? 0) - (segment.startSec ?? 0));
    const durationFrames = secondsToFrames(durationSec);
    const built: BuiltShortSegment = {
      ...segment,
      fromFrame: cursor,
      durationFrames,
      startFrame: secondsToFrames(segment.startSec ?? 0),
      endFrame: secondsToFrames(segment.endSec ?? durationSec),
    };
    cursor += durationFrames;
    return built;
  });

  return {
    ...definition,
    hookFrames,
    totalFrames: cursor,
    totalSeconds: cursor / EP01_FPS,
    segments,
  };
};

export const EP01_SHORTS: BuiltShortDefinition[] = shortDefinitions.map(buildShort);

export const EP01_SHORTS_MAP = Object.fromEntries(
  EP01_SHORTS.map((short) => [short.id, short]),
) as Record<string, BuiltShortDefinition>;
