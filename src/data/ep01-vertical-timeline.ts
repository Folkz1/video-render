import {
  Chapter,
  EP01_A_ROLL_SRC,
  EP01_FPS,
  secondsToFrames,
} from './ep01-real-edit-timeline';

export type VerticalLayout = 'face' | 'screen' | 'proof' | 'jarb' | 'cta';

export type VerticalSegment = {
  id: string;
  chapter: Chapter;
  layout: VerticalLayout;
  audioStartSec?: number;
  audioEndSec?: number;
  durationSec?: number;
  audioFile?: string;
  visualSource?: string;
  visualTrimBefore?: number;
  kicker?: string;
  headline: string[];
  caption?: string;
};

export const EP01_VERTICAL_A_ROLL_SRC = EP01_A_ROLL_SRC;

export const EP01_VERTICAL_SEGMENTS: VerticalSegment[] = [
  {
    id: 'vhook-01',
    chapter: 'hook',
    layout: 'face',
    audioStartSec: 1.68,
    audioEndSec: 7.2,
    kicker: 'ANTES',
    headline: ['14 HORAS/DIA', '2 PROJETOS', 'ZERO ESCALABILIDADE'],
    caption: 'EU ESTAVA TRAVADO',
  },
  {
    id: 'vhook-02',
    chapter: 'hook',
    layout: 'face',
    audioStartSec: 9.02,
    audioEndSec: 11.92,
    kicker: 'PONTO DE RUPTURA',
    headline: ['EU ERA O GARGALO'],
    caption: 'TUDO PASSAVA POR MIM',
  },
  {
    id: 'vhook-03',
    chapter: 'hook',
    layout: 'face',
    audioStartSec: 12.56,
    audioEndSec: 17.2,
    kicker: 'HOJE',
    headline: ['7 PROJETOS', '8 HORAS', 'US$100/MÊS'],
    caption: 'ESSA FOI A VIRADA',
  },
  {
    id: 'vhook-04',
    chapter: 'hook',
    layout: 'screen',
    audioStartSec: 41.14,
    audioEndSec: 46.4,
    visualSource: 'recordings-v11/v11-hook.webm',
    visualTrimBefore: 8,
    kicker: 'PROMESSA',
    headline: ['EU VOU TE MOSTRAR COMO'],
    caption: 'USAR IA COMO SISTEMA',
  },
  {
    id: 'vcontexto-01',
    chapter: 'contexto',
    layout: 'screen',
    audioStartSec: 56.8,
    audioEndSec: 66,
    visualSource: 'recordings-v11/v11-problema.webm',
    visualTrimBefore: 0,
    kicker: 'A DOR',
    headline: ['EMPREENDEDOR SOLO', 'VENDE E TRAVA', 'ENTREGA E PARA DE VENDER'],
    caption: 'SEM ALAVANCAGEM',
  },
  {
    id: 'vvirada-01',
    chapter: 'virada',
    layout: 'screen',
    audioStartSec: 104.94,
    audioEndSec: 111.7,
    visualSource: 'recordings-v4/v4-config.webm',
    visualTrimBefore: 4,
    kicker: 'A VIRADA',
    headline: ['NÃO É SÓ ASSISTENTE', 'EU TRATO COMO SISTEMA'],
    caption: 'DIREÇÃO + CONTEXTO + REGRAS',
  },
  {
    id: 'vvirada-02',
    chapter: 'virada',
    layout: 'screen',
    audioStartSec: 141.08,
    audioEndSec: 148.2,
    visualSource: 'recordings-v11/v11-solucao.webm',
    visualTrimBefore: 0,
    kicker: 'CÉREBRO OPERACIONAL',
    headline: ['CLAUDE.md', 'CONTRATO DE TRABALHO'],
    caption: 'O AGENTE JÁ SABE COMO AGIR',
  },
  {
    id: 'vproof-01',
    chapter: 'prova',
    layout: 'proof',
    audioStartSec: 211.78,
    audioEndSec: 218.6,
    visualSource: 'recordings-v2/v2-licitaai.webm',
    visualTrimBefore: 0,
    kicker: 'PROVA',
    headline: ['LICITAAI', 'PROJETO REAL', 'RECEITA RECORRENTE'],
    caption: 'NÃO É TEORIA',
  },
  {
    id: 'vproof-02',
    chapter: 'prova',
    layout: 'proof',
    audioStartSec: 342.66,
    audioEndSec: 349.8,
    visualSource: 'recordings-v11/v11-prova.webm',
    visualTrimBefore: 18,
    kicker: 'ALAVANCAGEM',
    headline: ['1 PESSOA', '7 PROJETOS', 'ATUALIZAÇÕES CONSTANTES'],
    caption: 'PRODUÇÃO DE VERDADE',
  },
  {
    id: 'vjarb-01',
    chapter: 'honestidade',
    layout: 'jarb',
    durationSec: 1.436735,
    audioFile: 'audio/jarb_ep01_4.mp3',
    kicker: 'OBJEÇÃO',
    headline: ['E SE O CLAUDE ERRA?'],
    caption: 'PERGUNTA CERTA',
  },
  {
    id: 'vcta-01',
    chapter: 'cta',
    layout: 'cta',
    audioStartSec: 795.6,
    audioEndSec: 804,
    kicker: 'CTA',
    headline: ['CONSULTORIA DE DIAGNÓSTICO', 'R$500'],
    caption: 'WHATSAPP: LINK NA DESCRIÇÃO',
  },
];

export type VerticalTimelineSegment = VerticalSegment & {
  fromFrame: number;
  durationFrames: number;
  audioStartFrame: number;
  audioEndFrame: number;
};

export const EP01_VERTICAL_TIMELINE: VerticalTimelineSegment[] = (() => {
  let cursor = 0;

  return EP01_VERTICAL_SEGMENTS.map((segment) => {
    const durationSec =
      segment.durationSec ??
      Math.max(0, (segment.audioEndSec ?? 0) - (segment.audioStartSec ?? 0));
    const durationFrames = secondsToFrames(durationSec);

    const item: VerticalTimelineSegment = {
      ...segment,
      fromFrame: cursor,
      durationFrames,
      audioStartFrame: secondsToFrames(segment.audioStartSec ?? 0),
      audioEndFrame: secondsToFrames(segment.audioEndSec ?? durationSec),
    };

    cursor += durationFrames;
    return item;
  });
})();

export const EP01_VERTICAL_FRAMES = EP01_VERTICAL_TIMELINE.reduce(
  (total, segment) => total + segment.durationFrames,
  0,
);

export const EP01_VERTICAL_SECONDS = EP01_VERTICAL_FRAMES / EP01_FPS;
