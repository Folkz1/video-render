import {Chapter, EP02_A_ROLL_SRC, EP02_FPS, secondsToFrames} from './ep02-real-edit-timeline';

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
  objectPosition?: string;
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

export const EP02_SHORT_A_ROLL_SRC = EP02_A_ROLL_SRC;
const EP02_SCREEN_SRC = EP02_A_ROLL_SRC;
const FACE_POS = '60% center';

const shortDefinitions: ShortDefinition[] = [
  {
    id: 'ep02-short-01',
    compositionId: 'Video13-EP02-Short01',
    title: 'Você É Bom, Mas Virou o Gargalo',
    accent: '#ff4d4d',
    prompt: 'Comenta "GARGALO" que eu solto a parte 2.',
    soundProfile: 'punchy',
    segments: [
      {
        id: 's01-a',
        kind: 'face',
        chapter: 'hook',
        startSec: 16.92,
        endSec: 24.28,
        objectPosition: FACE_POS,
        kicker: 'DOR',
        headline: ['VOCÊ É BOM', 'MAS O NEGÓCIO NÃO CRESCE'],
        caption: 'Você entrega bem, mas o faturamento trava.',
      },
      {
        id: 's01-b',
        kind: 'face',
        chapter: 'hook',
        startSec: 27.2,
        endSec: 36.8,
        objectPosition: FACE_POS,
        kicker: 'DIAGNÓSTICO',
        headline: ['O PROBLEMA É QUE', 'VOCÊ VIROU O GARGALO'],
        caption: 'Sem alavancagem, a empresa para em você.',
      },
      {
        id: 's01-c',
        kind: 'face',
        chapter: 'hook',
        startSec: 36.98,
        endSec: 55.2,
        objectPosition: FACE_POS,
        kicker: 'SAÍDA',
        headline: ['HOJE DÁ PARA TER', 'IA FAZENDO O TEU TRABALHO'],
        caption: 'Não é contratar mais gente. É delegar execução.',
      },
      {
        id: 's01-d',
        kind: 'face',
        chapter: 'hook',
        startSec: 65.54,
        endSec: 74.06,
        objectPosition: FACE_POS,
        kicker: 'RESULTADO',
        headline: ['5X FATURAMENTO', 'MENOS HORAS POR DIA'],
        caption: 'Esse foi o efeito da mudança no meu dia a dia.',
      },
    ],
  },
  {
    id: 'ep02-short-02',
    compositionId: 'Video13-EP02-Short02',
    title: 'Quem Faz Tudo Vira um Pato',
    accent: '#ff9f1c',
    prompt: 'Comenta "PATO" se você vive esse ciclo.',
    soundProfile: 'dramatic',
    segments: [
      {
        id: 's02-a',
        kind: 'face',
        chapter: 'problema',
        startSec: 118.8,
        endSec: 141.2,
        objectPosition: FACE_POS,
        kicker: 'ROTINA',
        headline: ['20 NOTIFICAÇÕES', 'BUG, CLIENTE E AUTOMAÇÃO'],
        caption: 'Você começa o dia apagando incêndio.',
      },
      {
        id: 's02-b',
        kind: 'face',
        chapter: 'problema',
        startSec: 144.06,
        endSec: 158,
        objectPosition: FACE_POS,
        kicker: 'ILUSÃO',
        headline: ['PARECE PRODUTIVO', 'MAS ESTÁ GIRANDO NO MESMO LUGAR'],
        caption: 'Quando faz tudo, a qualidade de tudo cai.',
      },
      {
        id: 's02-c',
        kind: 'face',
        chapter: 'problema',
        startSec: 158,
        endSec: 178.82,
        objectPosition: FACE_POS,
        kicker: 'ANALOGIA',
        headline: ['VOCÊ VIRA UM PATO'],
        caption: 'Tenta voar, nadar e correr. Não faz nada direito.',
      },
      {
        id: 's02-d',
        kind: 'jarb',
        chapter: 'virada',
        durationSec: 5.8,
        audioFile: 'audio/jarb_ep02_1.mp3',
        kicker: 'JARB',
        headline: ['NÃO ERA FALTA DE ESFORÇO', 'ERA EXCESSO DE EXECUÇÃO'],
        caption: 'Esse é o gargalo invisível.',
      },
    ],
  },
  {
    id: 'ep02-short-03',
    compositionId: 'Video13-EP02-Short03',
    title: 'O Framework MIM vs EXECUÇÃO',
    accent: '#00d4ff',
    prompt: 'Comenta "FRAMEWORK" que eu solto a lista.',
    soundProfile: 'proof',
    segments: [
      {
        id: 's03-a',
        kind: 'screen',
        chapter: 'virada',
        startSec: 199.3,
        endSec: 216.9,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 199.3,
        visualObjectFit: 'cover',
        kicker: 'VIRADA',
        headline: ['FAZ UMA LISTA', 'DO QUE PRECISA DE VOCÊ'],
        caption: 'Separa presença real de simples execução.',
      },
      {
        id: 's03-b',
        kind: 'screen',
        chapter: 'virada',
        startSec: 216.9,
        endSec: 238.26,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 216.9,
        visualObjectFit: 'cover',
        kicker: 'CORTE',
        headline: ['DEBUG', 'TESTES', 'BACK-END'],
        caption: 'Tudo que já não precisa mais passar pela tua mão.',
      },
      {
        id: 's03-c',
        kind: 'screen',
        chapter: 'virada',
        startSec: 246.56,
        endSec: 272.5,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 246.56,
        visualObjectFit: 'cover',
        kicker: 'ALAVANCAGEM',
        headline: ['SE A IA JÁ TEM A HABILIDADE', 'TERCEIRIZA A EXECUÇÃO'],
        caption: 'Se não tem, você empacota isso em uma skill.',
      },
      {
        id: 's03-d',
        kind: 'screen',
        chapter: 'virada',
        startSec: 272.5,
        endSec: 281.3,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 272.5,
        visualObjectFit: 'cover',
        kicker: 'RESUMO',
        headline: ['ESSE FOI O FRAMEWORK'],
        caption: 'MIM para decisão. IA para execução.',
      },
    ],
  },
  {
    id: 'ep02-short-04',
    compositionId: 'Video13-EP02-Short04',
    title: 'Orquestra Virou Meu Segundo Cérebro',
    accent: '#00ff88',
    prompt: 'Comenta "ORQUESTRA" que eu mostro mais provas.',
    soundProfile: 'proof',
    segments: [
      {
        id: 's04-a',
        kind: 'proof',
        chapter: 'prova',
        startSec: 324.01,
        endSec: 344.05,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 324.01,
        visualObjectFit: 'cover',
        kicker: 'ORQUESTRA',
        headline: ['UM HUB INTELIGENTE', 'COM TODAS AS FONTES'],
        caption: 'Clientes, canais e contexto em um só lugar.',
      },
      {
        id: 's04-b',
        kind: 'proof',
        chapter: 'prova',
        startSec: 349.03,
        endSec: 358.91,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 349.03,
        visualObjectFit: 'cover',
        kicker: 'MEMÓRIA',
        headline: ['MEMÓRIA VETORIAL', 'HISTÓRICO POR CLIENTE'],
        caption: 'Busca contexto quando eu preciso, não quando eu lembro.',
      },
      {
        id: 's04-c',
        kind: 'proof',
        chapter: 'prova',
        startSec: 371.89,
        endSec: 387.79,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 371.89,
        visualObjectFit: 'cover',
        kicker: 'GRAVAÇÕES',
        headline: ['A REUNIÃO VIRA', 'TRANSCRIÇÃO + RAG'],
        caption: 'Tudo entra no sistema e volta como contexto útil.',
      },
      {
        id: 's04-d',
        kind: 'proof',
        chapter: 'prova',
        startSec: 401.63,
        endSec: 416.83,
        visualSource: EP02_SCREEN_SRC,
        visualTrimBefore: 401.63,
        visualObjectFit: 'cover',
        kicker: 'MULTIMODAL',
        headline: ['ÁUDIO', 'IMAGEM', 'WHATSAPP'],
        caption: 'Quando tudo vira contexto, você ganha um segundo cérebro.',
      },
    ],
  },
  {
    id: 'ep02-short-05',
    compositionId: 'Video13-EP02-Short05',
    title: 'A Skill Mais Importante de 2026',
    accent: '#7cfcff',
    prompt: 'Comenta "2026" que eu abro essa tese inteira.',
    soundProfile: 'objection',
    segments: [
      {
        id: 's05-a',
        kind: 'face',
        chapter: 'reflexao',
        startSec: 902.03,
        endSec: 913.39,
        objectPosition: FACE_POS,
        kicker: 'PONTO',
        headline: ['TIRA A EXECUÇÃO DAS COSTAS', 'GANHA TEMPO PRA PENSAR'],
        caption: 'O ganho real não é só produtividade.',
      },
      {
        id: 's05-b',
        kind: 'face',
        chapter: 'reflexao',
        startSec: 913.39,
        endSec: 928.17,
        objectPosition: FACE_POS,
        kicker: 'HABILIDADE',
        headline: ['A SKILL MAIS IMPORTANTE', 'DE 2026'],
        caption: 'Isso precisa guiar tua vida profissional.',
      },
      {
        id: 's05-c',
        kind: 'face',
        chapter: 'reflexao',
        startSec: 928.17,
        endSec: 935.51,
        objectPosition: FACE_POS,
        kicker: 'FRASE',
        headline: ['VOCÊ NÃO PRECISA PROGRAMAR', 'PRECISA DIRIGIR QUEM SABE'],
        caption: 'Essa é a mudança de papel.',
      },
      {
        id: 's05-d',
        kind: 'face',
        chapter: 'reflexao',
        startSec: 936.85,
        endSec: 949.11,
        objectPosition: FACE_POS,
        kicker: 'ESCALA',
        headline: ['HOJE O PROGRAMADOR', 'USA IA PARA PROGRAMAR'],
        caption: 'E isso muda a régua da operação inteira.',
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
    totalSeconds: cursor / EP02_FPS,
    segments,
  };
};

export const EP02_SHORTS: BuiltShortDefinition[] = shortDefinitions.map(buildShort);

export const EP02_SHORTS_MAP = Object.fromEntries(
  EP02_SHORTS.map((short) => [short.id, short]),
) as Record<string, BuiltShortDefinition>;
