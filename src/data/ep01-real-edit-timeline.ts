export type Chapter =
  | 'hook'
  | 'contexto'
  | 'virada'
  | 'prova'
  | 'metodo'
  | 'objecao'
  | 'honestidade'
  | 'virada_final'
  | 'cta';

export type EditKind = 'a-roll' | 'screen' | 'jarb';
export type AudioSource = 'diego' | 'jarb' | 'mute';
export type OverlayVariant = 'hook' | 'stat' | 'support' | 'minimal' | 'cta' | 'jarb';
export type VisualLayout = 'full' | 'pip-right' | 'pip-left';

export type EditSegment = {
  id: string;
  startSec: number;
  endSec: number;
  durationSec?: number;
  kind: EditKind;
  chapter: Chapter;
  audioSource: AudioSource;
  audioFile?: string;
  visualSource?: string;
  visualLayout?: VisualLayout;
  visualTrimBefore?: number;
  overlayText?: string[];
  overlayVariant?: OverlayVariant;
  notes?: string;
};

export const EP01_A_ROLL_SRC = '2026-03-07_17-20-29_limpo.mp4';
export const EP01_FPS = 30;

export const EP01_REAL_EDIT_SEGMENTS: EditSegment[] = [
  {
    id: 'hook-01',
    startSec: 1.68,
    endSec: 8.78,
    kind: 'a-roll',
    chapter: 'hook',
    audioSource: 'diego',
    overlayText: ['14 HORAS/DIA', '2 PROJETOS', 'ZERO ESCALABILIDADE'],
    overlayVariant: 'hook',
  },
  {
    id: 'hook-02',
    startSec: 9.02,
    endSec: 11.92,
    kind: 'a-roll',
    chapter: 'hook',
    audioSource: 'diego',
    overlayText: ['EU ERA O GARGALO'],
    overlayVariant: 'hook',
  },
  {
    id: 'hook-03',
    startSec: 12.56,
    endSec: 20.28,
    kind: 'a-roll',
    chapter: 'hook',
    audioSource: 'diego',
    overlayText: ['7 PROJETOS', '8 HORAS', 'US$100/MES'],
    overlayVariant: 'hook',
  },
  {
    id: 'hook-04',
    startSec: 21.30,
    endSec: 27.76,
    kind: 'a-roll',
    chapter: 'hook',
    audioSource: 'diego',
    overlayText: ['MENOS DE R$600'],
    overlayVariant: 'hook',
  },
  {
    id: 'hook-05',
    startSec: 27.76,
    endSec: 34.56,
    kind: 'a-roll',
    chapter: 'hook',
    audioSource: 'diego',
    overlayText: ['ISSO ACONTECEU DE VERDADE'],
    overlayVariant: 'hook',
  },
  {
    id: 'hook-06',
    startSec: 41.14,
    endSec: 51.98,
    kind: 'screen',
    chapter: 'hook',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-hook.webm',
    visualLayout: 'full',
    visualTrimBefore: 8,
    overlayText: ['EU VOU TE MOSTRAR COMO', 'COMEÇAR A USAR IA NO NEGÓCIO'],
    overlayVariant: 'support',
  },
  {
    id: 'hook-07',
    startSec: 52.32,
    endSec: 55.26,
    kind: 'screen',
    chapter: 'hook',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-hook.webm',
    visualLayout: 'full',
    visualTrimBefore: 18,
    overlayText: ['ESSA É A IDEIA DESTE VÍDEO'],
    overlayVariant: 'minimal',
  },
  {
    id: 'contexto-01',
    startSec: 56.80,
    endSec: 71.86,
    kind: 'screen',
    chapter: 'contexto',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-problema.webm',
    visualLayout: 'full',
    visualTrimBefore: 0,
    overlayText: ['EMPREENDEDOR SOLO', 'VENDE E TRAVA', 'ENTREGA E PARA DE VENDER'],
    overlayVariant: 'support',
  },
  {
    id: 'contexto-02',
    startSec: 72.84,
    endSec: 84.62,
    kind: 'screen',
    chapter: 'contexto',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-problema.webm',
    visualLayout: 'full',
    visualTrimBefore: 10,
    overlayText: ['TICKET', 'BUG', 'DEPLOY', 'FOLLOW UP'],
    overlayVariant: 'stat',
  },
  {
    id: 'contexto-03',
    startSec: 85.86,
    endSec: 91.62,
    kind: 'screen',
    chapter: 'contexto',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-problema.webm',
    visualLayout: 'full',
    visualTrimBefore: 20,
    overlayText: ['FALTAVA ALAVANCAGEM'],
    overlayVariant: 'support',
  },
  {
    id: 'jarb-01',
    startSec: 0,
    endSec: 4.414694,
    durationSec: 4.414694,
    kind: 'jarb',
    chapter: 'contexto',
    audioSource: 'jarb',
    audioFile: 'audio/jarb_ep01_1.mp3',
    overlayText: ['VOCÊ ERA BOM', 'MAS PRESO NO OPERACIONAL'],
    overlayVariant: 'jarb',
  },
  {
    id: 'virada-01',
    startSec: 104.94,
    endSec: 123.18,
    kind: 'screen',
    chapter: 'virada',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-config.webm',
    visualLayout: 'full',
    visualTrimBefore: 4,
    overlayText: ['NÃO É SÓ ASSISTENTE', 'EU TRATO COMO SISTEMA'],
    overlayVariant: 'support',
  },
  {
    id: 'virada-02',
    startSec: 141.08,
    endSec: 154.08,
    kind: 'screen',
    chapter: 'virada',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-solucao.webm',
    visualLayout: 'full',
    overlayText: ['CLAUDE.md', 'CONTRATO DE TRABALHO', 'REGRAS + CONTEXTO'],
    overlayVariant: 'stat',
  },
  {
    id: 'virada-03',
    startSec: 169.22,
    endSec: 183.58,
    kind: 'screen',
    chapter: 'virada',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-terminal.webm',
    visualLayout: 'full',
    overlayText: ['ANALISA A CODEBASE', 'ENTENDE A ARQUITETURA', 'IMPLEMENTA A FEATURE'],
    overlayVariant: 'support',
  },
  {
    id: 'virada-04',
    startSec: 183.80,
    endSec: 188.08,
    kind: 'a-roll',
    chapter: 'virada',
    audioSource: 'diego',
    overlayText: ['FUNCIONA DE VERDADE'],
    overlayVariant: 'support',
  },
  {
    id: 'prova-01',
    startSec: 199.10,
    endSec: 202.32,
    kind: 'a-roll',
    chapter: 'prova',
    audioSource: 'diego',
    overlayText: ['O QUE MUDOU NA PRÁTICA'],
    overlayVariant: 'support',
  },
  {
    id: 'prova-02',
    startSec: 204.54,
    endSec: 211.00,
    kind: 'screen',
    chapter: 'prova',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-prova.webm',
    visualLayout: 'full',
    overlayText: ['PROJETOS REAIS', 'SISTEMA RODANDO'],
    overlayVariant: 'stat',
  },
  {
    id: 'prova-03',
    startSec: 211.78,
    endSec: 220.42,
    kind: 'screen',
    chapter: 'prova',
    audioSource: 'diego',
    visualSource: 'recordings-v2/v2-licitaai.webm',
    visualLayout: 'full',
    overlayText: ['LICITAAI', 'QUASE 3 MIL LICITACOES', 'RECEITA RECORRENTE'],
    overlayVariant: 'stat',
  },
  {
    id: 'prova-04',
    startSec: 220.42,
    endSec: 235.16,
    kind: 'screen',
    chapter: 'prova',
    audioSource: 'diego',
    visualSource: 'recordings-v2/v2-superbot.webm',
    visualLayout: 'full',
    overlayText: ['SUPERBOT', '3 CLIENTES', '15 AGENTES | 39 FERRAMENTAS'],
    overlayVariant: 'stat',
  },
  {
    id: 'prova-05',
    startSec: 236.06,
    endSec: 255.86,
    kind: 'a-roll',
    chapter: 'prova',
    audioSource: 'diego',
    overlayText: ['KANBAN', 'REVIEW', 'TESTE', 'PRODUCAO'],
    overlayVariant: 'support',
  },
  {
    id: 'prova-06',
    startSec: 256.24,
    endSec: 262.72,
    kind: 'a-roll',
    chapter: 'prova',
    audioSource: 'diego',
    overlayText: ['REVIEW ANTES DE APROVAR'],
    overlayVariant: 'minimal',
  },
  {
    id: 'prova-07',
    startSec: 287.46,
    endSec: 310.70,
    kind: 'screen',
    chapter: 'prova',
    audioSource: 'diego',
    visualSource: 'recordings-v11/v11-prova.webm',
    visualLayout: 'full',
    overlayText: ['ORQUESTRA', 'PAINEL DE CTO', 'BRIEFING DIARIO'],
    overlayVariant: 'stat',
  },
  {
    id: 'prova-08',
    startSec: 319.04,
    endSec: 341.98,
    kind: 'screen',
    chapter: 'prova',
    audioSource: 'diego',
    visualSource: 'recordings-v2/v3-pipeline.webm',
    visualLayout: 'full',
    overlayText: ['FIEL', 'ISSUEMAPPER', 'VIDEO FACTORY'],
    overlayVariant: 'stat',
  },
  {
    id: 'prova-09',
    startSec: 342.66,
    endSec: 376.18,
    kind: 'a-roll',
    chapter: 'prova',
    audioSource: 'diego',
    overlayText: ['1 PESSOA', '7 PROJETOS', 'ATUALIZACOES CONSTANTES'],
    overlayVariant: 'support',
  },
  {
    id: 'jarb-02',
    startSec: 0,
    endSec: 6.582857,
    durationSec: 6.582857,
    kind: 'jarb',
    chapter: 'prova',
    audioSource: 'jarb',
    audioFile: 'audio/jarb_ep01_2.mp3',
    overlayText: ['ISSO NÃO É SÓ PRODUTIVIDADE', 'ISSO É ALAVANCAGEM'],
    overlayVariant: 'jarb',
  },
  {
    id: 'metodo-01',
    startSec: 378.28,
    endSec: 397.76,
    kind: 'a-roll',
    chapter: 'metodo',
    audioSource: 'diego',
    overlayText: ['NÃO BASTA DIZER QUE USA IA', 'PRECISA MOSTRAR O MÉTODO'],
    overlayVariant: 'support',
  },
  {
    id: 'metodo-02',
    startSec: 398.22,
    endSec: 424.02,
    kind: 'screen',
    chapter: 'metodo',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-terminal.webm',
    visualLayout: 'full',
    overlayText: ['MENOS MÃO NA MASSA', 'MAIS CONTEXTO', 'MAIS DIREÇÃO'],
    overlayVariant: 'support',
  },
  {
    id: 'metodo-03',
    startSec: 424.46,
    endSec: 437.16,
    kind: 'a-roll',
    chapter: 'metodo',
    audioSource: 'diego',
    overlayText: ['DIRIGIR AGENTES'],
    overlayVariant: 'minimal',
  },
  {
    id: 'metodo-04',
    startSec: 437.16,
    endSec: 488.58,
    kind: 'screen',
    chapter: 'metodo',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-config.webm',
    visualLayout: 'full',
    overlayText: ['SKILLS', 'CONTEXTO ESPECIALIZADO', 'DEPARTAMENTOS DA IA'],
    overlayVariant: 'stat',
  },
  {
    id: 'metodo-05',
    startSec: 488.82,
    endSec: 504.08,
    kind: 'a-roll',
    chapter: 'metodo',
    audioSource: 'diego',
    overlayText: ['SKILLS = VIRADA DE JOGO'],
    overlayVariant: 'support',
  },
  {
    id: 'metodo-06',
    startSec: 532.40,
    endSec: 554.14,
    kind: 'screen',
    chapter: 'metodo',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-diagram.webm',
    visualLayout: 'full',
    overlayText: ['ANÁLISE DE IMPACTO', 'BRANCH POR TAREFA', 'PR AUTOMÁTICO', 'GATE DE QUALIDADE'],
    overlayVariant: 'stat',
  },
  {
    id: 'metodo-07',
    startSec: 554.94,
    endSec: 583.86,
    kind: 'screen',
    chapter: 'metodo',
    audioSource: 'diego',
    visualSource: 'recordings-v4/v4-terminal.webm',
    visualLayout: 'full',
    overlayText: ['PLANEJAR', 'EXECUTAR', 'DEBUGAR', 'REVISAR'],
    overlayVariant: 'support',
  },
  {
    id: 'jarb-03',
    startSec: 0,
    endSec: 4.91102,
    durationSec: 4.91102,
    kind: 'jarb',
    chapter: 'metodo',
    audioSource: 'jarb',
    audioFile: 'audio/jarb_ep01_3.mp3',
    overlayText: ['DA EXECUÇÃO PARA A DIREÇÃO'],
    overlayVariant: 'jarb',
  },
  {
    id: 'objecao-01',
    startSec: 592.78,
    endSec: 605.36,
    kind: 'a-roll',
    chapter: 'objecao',
    audioSource: 'diego',
    overlayText: ['ISSO SERVE PARA PROJETO COMPLEXO?'],
    overlayVariant: 'support',
  },
  {
    id: 'objecao-02',
    startSec: 605.36,
    endSec: 633.70,
    kind: 'screen',
    chapter: 'objecao',
    audioSource: 'diego',
    visualSource: 'recordings-v2/v2-licitaai.webm',
    visualLayout: 'full',
    overlayText: ['LICITAAI NÃO É CRUD', 'FILAS', 'IA', 'PNCP', 'MULTI STEP'],
    overlayVariant: 'stat',
  },
  {
    id: 'objecao-03',
    startSec: 657.68,
    endSec: 690.32,
    kind: 'a-roll',
    chapter: 'objecao',
    audioSource: 'diego',
    overlayText: ['PROJETOS REAIS', 'EM PRODUÇÃO', 'GERANDO RECEITA'],
    overlayVariant: 'support',
  },
  {
    id: 'objecao-04',
    startSec: 691.86,
    endSec: 729.74,
    kind: 'a-roll',
    chapter: 'objecao',
    audioSource: 'diego',
    overlayText: ['NÃO SÃO BRINQUEDOS', 'SÃO SISTEMAS PAGOS'],
    overlayVariant: 'minimal',
  },
  {
    id: 'jarb-04',
    startSec: 0,
    endSec: 1.436735,
    durationSec: 1.436735,
    kind: 'jarb',
    chapter: 'honestidade',
    audioSource: 'jarb',
    audioFile: 'audio/jarb_ep01_4.mp3',
    overlayText: ['E SE O CLAUDE ERRA?'],
    overlayVariant: 'jarb',
  },
  {
    id: 'honestidade-01',
    startSec: 730.20,
    endSec: 771.22,
    kind: 'a-roll',
    chapter: 'honestidade',
    audioSource: 'diego',
    overlayText: ['ELE ERRA', 'MAS ITERA MAIS RÁPIDO', 'O CUSTO DO ERRO CAI'],
    overlayVariant: 'minimal',
  },
  {
    id: 'virada-final-01',
    startSec: 772.36,
    endSec: 791.90,
    kind: 'a-roll',
    chapter: 'virada_final',
    audioSource: 'diego',
    overlayText: ['NÃO VIREI MAIS UM CARA DE IA', 'VIREI UM OPERADOR DE SISTEMAS'],
    overlayVariant: 'cta',
  },
  {
    id: 'cta-01',
    startSec: 795.60,
    endSec: 821.88,
    kind: 'a-roll',
    chapter: 'cta',
    audioSource: 'diego',
    overlayText: ['CONSULTORIA DE DIAGNÓSTICO', 'R$500', 'WHATSAPP: LINK NA DESCRIÇÃO'],
    overlayVariant: 'cta',
  },
  {
    id: 'cta-02',
    startSec: 827.08,
    endSec: 837.94,
    kind: 'a-roll',
    chapter: 'cta',
    audioSource: 'diego',
    overlayText: ['LINK NA DESCRIÇÃO', 'FALA COMIGO NO WHATSAPP'],
    overlayVariant: 'minimal',
  },
];

export const getSegmentDurationSec = (segment: EditSegment) =>
  segment.kind === 'jarb' ? segment.durationSec ?? segment.endSec : segment.endSec - segment.startSec;

export const secondsToFrames = (seconds: number) => Math.max(1, Math.round(seconds * EP01_FPS));

export type TimelineSegment = EditSegment & {
  fromFrame: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
};

export const EP01_REAL_EDIT_TIMELINE: TimelineSegment[] = (() => {
  let cursor = 0;

  return EP01_REAL_EDIT_SEGMENTS.map((segment) => {
    const durationFrames = secondsToFrames(getSegmentDurationSec(segment));
    const item: TimelineSegment = {
      ...segment,
      fromFrame: cursor,
      durationFrames,
      startFrame: secondsToFrames(segment.startSec),
      endFrame: secondsToFrames(segment.endSec),
    };

    cursor += durationFrames;
    return item;
  });
})();

export const EP01_REAL_EDIT_SECONDS = EP01_REAL_EDIT_SEGMENTS.reduce(
  (sum, segment) => sum + getSegmentDurationSec(segment),
  0,
);

export const EP01_REAL_EDIT_FRAMES = Math.ceil(EP01_REAL_EDIT_SECONDS * EP01_FPS);
