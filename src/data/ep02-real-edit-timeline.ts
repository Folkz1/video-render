export type Chapter =
  | 'hook'
  | 'problema'
  | 'virada'
  | 'prova'
  | 'metodo'
  | 'reflexao'
  | 'aplicacao'
  | 'honestidade'
  | 'cta'
  | 'fecho';

export type EditKind = 'video' | 'card' | 'jarb';
export type LayoutMode = 'face' | 'full' | 'screen' | 'none';
export type OverlayVariant = 'hook' | 'support' | 'minimal' | 'cta' | 'stat' | 'jarb';
export type OverlayPlacement =
  | 'left-center'
  | 'right-center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type EditSegment = {
  id: string;
  kind: EditKind;
  startSec: number;
  endSec?: number;
  durationSec?: number;
  chapter: Chapter;
  layout: LayoutMode;
  overlayText?: string[];
  overlayVariant?: OverlayVariant;
  overlayPlacement?: OverlayPlacement;
  echoText?: string[];
  echoPlacement?: OverlayPlacement;
  zoom?: number;
  objectPosition?: string;
  audioFile?: string;
  notes?: string;
};

export const EP02_A_ROLL_SRC = '2026-03-08_15-29-52_editbase.mp4';
export const EP02_FPS = 30;

export const EP02_REAL_EDIT_SEGMENTS: EditSegment[] = [
  {
    id: 'hook-01',
    kind: 'video',
    startSec: 0.0,
    endSec: 29.98,
    chapter: 'hook',
    layout: 'face',
    overlayText: ['Você é bom.', 'Mas o negócio não cresce.'],
    overlayVariant: 'hook',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.06,
  },
  {
    id: 'hook-02',
    kind: 'video',
    startSec: 36.98,
    endSec: 65.1,
    chapter: 'hook',
    layout: 'full',
    overlayText: ['O gargalo é você.', 'Mas agora existe saída.'],
    overlayVariant: 'hook',
    overlayPlacement: 'right-center',
    zoom: 1.02,
  },
  {
    id: 'hook-03',
    kind: 'video',
    startSec: 65.54,
    endSec: 74.06,
    chapter: 'hook',
    layout: 'face',
    overlayText: ['5x mais faturamento.', 'Menos horas por dia.'],
    overlayVariant: 'support',
    overlayPlacement: 'left-center',
    objectPosition: '66% center',
    zoom: 1.08,
  },
  {
    id: 'problema-01',
    kind: 'video',
    startSec: 77.26,
    endSec: 118.04,
    chapter: 'problema',
    layout: 'face',
    overlayText: ['14 horas por dia.', 'Quase burnout.'],
    overlayVariant: 'support',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.08,
  },
  {
    id: 'problema-02',
    kind: 'video',
    startSec: 118.8,
    endSec: 149.8,
    chapter: 'problema',
    layout: 'full',
    overlayText: ['20 notificações.', 'Bug.', 'Cliente.', 'Reunião.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'problema-03',
    kind: 'video',
    startSec: 149.8,
    endSec: 197.42,
    chapter: 'problema',
    layout: 'face',
    overlayText: ['Ocupado demais para crescer.', 'Você vira um pato.'],
    overlayVariant: 'support',
    overlayPlacement: 'left-center',
    echoText: ['PATO', 'PATO', 'PATO'],
    echoPlacement: 'right-center',
    objectPosition: '70% center',
    zoom: 1.07,
  },
  {
    id: 'jarb-01',
    kind: 'jarb',
    startSec: 0,
    durationSec: 5.8,
    chapter: 'virada',
    layout: 'none',
    audioFile: 'audio/jarb_ep02_1.mp3',
    overlayText: ['Ou seja:', 'não era falta de esforço.', 'Era excesso de execução.'],
    overlayVariant: 'jarb',
  },
  {
    id: 'virada-01',
    kind: 'video',
    startSec: 199.3,
    endSec: 275.5,
    chapter: 'virada',
    layout: 'full',
    overlayText: ['Liste o que precisa de você.', 'E separe do que é execução.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'prova-01',
    kind: 'video',
    startSec: 324.01,
    endSec: 358.91,
    chapter: 'prova',
    layout: 'screen',
    overlayText: ['Orquestra.', 'O hub da operação.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'prova-02',
    kind: 'video',
    startSec: 366.01,
    endSec: 416.83,
    chapter: 'prova',
    layout: 'screen',
    overlayText: ['Gravações.', 'WhatsApp.', 'RAG.', 'Memória.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
    notes: 'Corta a aba de contatos sensível que aparece antes.',
  },
  {
    id: 'prova-03',
    kind: 'video',
    startSec: 419.41,
    endSec: 459.53,
    chapter: 'prova',
    layout: 'screen',
    overlayText: ['Segundo cérebro.', 'Contexto dos clientes.'],
    overlayVariant: 'support',
    overlayPlacement: 'bottom-right',
    zoom: 1.01,
  },
  {
    id: 'prova-04',
    kind: 'video',
    startSec: 462.87,
    endSec: 496.84,
    chapter: 'prova',
    layout: 'screen',
    overlayText: ['Briefings.', 'Operação real.', 'Vídeo em produção.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'prova-05',
    kind: 'video',
    startSec: 496.84,
    endSec: 546.93,
    chapter: 'prova',
    layout: 'face',
    overlayText: ['Qualquer pessoa pode colocar', 'sistemas em produção.'],
    overlayVariant: 'support',
    overlayPlacement: 'left-center',
    echoText: ['QUALQUER COISA', 'QUALQUER COISA'],
    echoPlacement: 'right-center',
    objectPosition: '68% center',
    zoom: 1.06,
  },
  {
    id: 'prova-06',
    kind: 'video',
    startSec: 546.93,
    endSec: 581.09,
    chapter: 'prova',
    layout: 'screen',
    overlayText: ['Briefing diário.', 'Prioridade automática.'],
    overlayVariant: 'minimal',
    overlayPlacement: 'bottom-right',
    zoom: 1.01,
  },
  {
    id: 'jarb-02',
    kind: 'jarb',
    startSec: 0,
    durationSec: 5.9,
    chapter: 'metodo',
    layout: 'none',
    audioFile: 'audio/jarb_ep02_2.mp3',
    overlayText: ['A prova já apareceu na tela.', 'Memória, briefing e contexto.', 'Isso é operação real.'],
    overlayVariant: 'jarb',
  },
  {
    id: 'metodo-card-01',
    kind: 'card',
    startSec: 641.62,
    endSec: 676.84,
    chapter: 'metodo',
    layout: 'none',
    overlayText: ['Skills em ação.', 'Pesquisa profunda.', 'Render farm.', 'Propostas comerciais.'],
    overlayVariant: 'stat',
    overlayPlacement: 'left-center',
    notes: 'Mantém o áudio, mas não mostra a tela com dados sensíveis.',
  },
  {
    id: 'metodo-01',
    kind: 'video',
    startSec: 676.84,
    endSec: 725.7,
    chapter: 'metodo',
    layout: 'screen',
    overlayText: ['Cloud Code como', 'segundo cérebro.'],
    overlayVariant: 'support',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'metodo-02',
    kind: 'video',
    startSec: 766.88,
    endSec: 830.64,
    chapter: 'metodo',
    layout: 'screen',
    overlayText: ['Orquestrar.', 'Agentes por etapa.', 'Impacto por workflow.'],
    overlayVariant: 'stat',
    overlayPlacement: 'top-right',
    zoom: 1.01,
  },
  {
    id: 'reflexao-01',
    kind: 'video',
    startSec: 872.02,
    endSec: 949.11,
    chapter: 'reflexao',
    layout: 'face',
    overlayText: ['Tire a execução das costas.', 'Ganhe tempo para pensar.'],
    overlayVariant: 'support',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.07,
  },
  {
    id: 'aplicacao-01',
    kind: 'video',
    startSec: 959.57,
    endSec: 1042.85,
    chapter: 'aplicacao',
    layout: 'face',
    overlayText: ['Não é só para dev.', 'Anúncios.', 'Métricas.', 'Rotinas.'],
    overlayVariant: 'stat',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.05,
  },
  {
    id: 'jarb-03',
    kind: 'jarb',
    startSec: 0,
    durationSec: 5.6,
    chapter: 'cta',
    layout: 'none',
    audioFile: 'audio/jarb_ep02_3.mp3',
    overlayText: ['Se ainda parece distante,', 'começa pelo gargalo.', 'Depois automatiza o resto.'],
    overlayVariant: 'jarb',
  },
  {
    id: 'cta-01',
    kind: 'video',
    startSec: 1043.45,
    endSec: 1094.73,
    chapter: 'cta',
    layout: 'face',
    overlayText: ['Consultoria de diagnóstico.', 'R$ 500.', 'Uma hora ao vivo.'],
    overlayVariant: 'cta',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.05,
  },
  {
    id: 'honestidade-01',
    kind: 'video',
    startSec: 1094.73,
    endSec: 1126.17,
    chapter: 'honestidade',
    layout: 'face',
    overlayText: ['Nem tudo são flores.', '80%, ajuste, e resultado.'],
    overlayVariant: 'minimal',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.04,
  },
  {
    id: 'fecho-01',
    kind: 'video',
    startSec: 1126.17,
    endSec: 1176.35,
    chapter: 'fecho',
    layout: 'face',
    overlayText: ['Eu falo.', 'A IA executa.', 'E o mundo mudou.'],
    overlayVariant: 'cta',
    overlayPlacement: 'left-center',
    objectPosition: '68% center',
    zoom: 1.06,
  },
];

export const secondsToFrames = (seconds: number) =>
  Math.max(1, Math.round(seconds * EP02_FPS));

const getSegmentDurationSec = (segment: EditSegment) => {
  if (segment.kind === 'jarb') {
    return segment.durationSec ?? 5;
  }

  return Math.max(0.1, (segment.endSec ?? segment.startSec) - segment.startSec);
};

export type TimelineSegment = EditSegment & {
  fromFrame: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
};

export const EP02_REAL_EDIT_TIMELINE: TimelineSegment[] = (() => {
  let cursor = 0;

  return EP02_REAL_EDIT_SEGMENTS.map((segment) => {
    const durationFrames = secondsToFrames(getSegmentDurationSec(segment));
    const startFrame = secondsToFrames(segment.startSec);
    const endFrame = segment.endSec ? secondsToFrames(segment.endSec) : startFrame + durationFrames;

    const item: TimelineSegment = {
      ...segment,
      fromFrame: cursor,
      durationFrames,
      startFrame,
      endFrame,
    };

    cursor += durationFrames;
    return item;
  });
})();

export const EP02_REAL_EDIT_SECONDS = EP02_REAL_EDIT_SEGMENTS.reduce(
  (sum, segment) => sum + getSegmentDurationSec(segment),
  0,
);

export const EP02_REAL_EDIT_FRAMES = Math.ceil(EP02_REAL_EDIT_SECONDS * EP02_FPS);
