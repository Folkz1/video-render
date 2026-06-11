import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions, type WordTiming } from './components/WordCaptions';
import { CreatorTop } from './components/CreatorTop';
import { TransitionScene } from './kit/sceneTransitions';
import type { LandscapeLongProps, Enfase } from './LandscapeLong';

// ─────────────────────────────────────────────────────────────────────────────
// VerticalLong — o lado 9:16 (1080x1920) do DUAL-FORMAT da Central de Vídeo.
//
// É o gêmeo vertical do LandscapeLong: MESMO CONTRATO DE PROPS (LandscapeLongProps).
// O backend monta UMA props resolvida (script_json) e renderiza nas 2 composições só
// trocando o `composition_id` — daí VerticalLong aceitar EXATAMENTE o mesmo shape do
// Landscape. As únicas chaves a mais que ele lê são as de RECORTE DO CRIADOR (já existentes
// no resto do pipeline: creator_focus_x/y, creator_zoom, creator_punches,
// creator_face_keyframes) + trilha opcional (music_url/voice_windows/sfx_url, logo_url) —
// todas ADITIVAS: quando o backend manda só as props do Landscape, o comportamento é o
// esperado (criador no topo + ênfases + handle), sem nada novo obrigatório.
//
// Como o reenquadramento acontece:
//   A gravação é 16:9. Aqui ela NÃO é cortada por pixel — é o CreatorTop (a MESMA infra do
//   SplitReaction) que recropa via object-position (creator_focus_x/y, default rosto no terço
//   superior) + scale (creator_zoom * punch-in * face-tracking) DENTRO de um painel de 62% no
//   topo. O rosto fica grande e enquadrado; punches/keyframes seguem o que o Landscape já usa.
//   ⇒ Por isso VerticalLong renderiza FRAME CHEIO no Remotion (não usa FFmpeg-compose/overlayOnly
//   do Landscape: lá o vídeo 16:9 é fullscreen e o ffmpeg só sobrepõe overlays; aqui o recorte
//   do criador É a composição).
//
// Layout por região (canvas 1080x1920):
//   • PAINEL DO CRIADOR  — topo, 0 → splitY (≈62% = 1190px). CreatorTop recropa a gravação.
//   • COSTURA            — y = splitY: linha neon (CreatorTop) + legenda karaokê ancorada nela.
//   • ÁREA DE APOIO      — splitY → 1920 (≈38% = 730px): cutaway ativo (vídeo/Ken Burns) OU
//                          painel de marca discreto (paleta+handle+logo). Quando um cutaway é
//                          marcado "fullscreen" (label === 'PUNCH'/punch), ele estende sobre o
//                          criador num beat momentâneo.
//   • ÊNFASES            — KeywordPop reposicionado pro centro-baixo da área de apoio (nunca corta).
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const W = 1080;
const H = 1920;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const DEFAULT_PALETA = ['#0A0F1C', '#00E5FF', '#FFFFFF'];

export type { LandscapeLongProps, Enfase, WordTiming };

// VerticalLong aceita o MESMO contrato do Landscape + chaves aditivas de recorte/trilha.
// Tudo opcional ⇒ a props EXATA do Landscape renderiza sem nada novo.
export type VerticalLongProps = LandscapeLongProps & {
  // ── recorte do criador (reusa a infra do CreatorTop; default = rosto no terço superior) ──
  creator_focus_x?: number; // 0..1 object-position horizontal (default 0.5)
  creator_focus_y?: number; // 0..1 vertical (default 0.34 = olhos no terço superior)
  creator_zoom?: number; // zoom base do painel (default 1.0)
  creator_punches?: { from: number; to: number }[]; // janelas (s) de punch-in
  creator_face_keyframes?: { t: number; cx: number; cy: number; scale: number }[];
  // ── identidade no painel de apoio / logo no criador ──
  logo_url?: string; // logo badge (canto do painel do criador) — vazio ⇒ não renderiza
  // ── trilha opcional (mesma semântica do SplitReaction; ausente ⇒ idêntico ao Landscape) ──
  music_url?: string; // música de fundo (com ducking sob a voz). Ausente ⇒ só áudio do criador
  voice_windows?: { from: number; to: number }[]; // janelas (s) com fala → música abaixa
  sfx_url?: string; // whoosh nos cortes dos cutaways
  // fração do painel do criador (0.55–0.68). Default 0.62.
  split_ratio?: number;
};

export const verticalLongDefaultProps: VerticalLongProps = {
  // === espelha landscapeLongDefaultProps (mesmo contrato) ===
  creatorVideoUrl: '', // vazio: o arquivo-exemplo local não existe no build Docker (trap 404); backend SEMPRE passa
  creatorLiveAudio: true,
  words: [], // MODO ÊNFASE: sem legenda karaokê contínua (igual ao Landscape)
  enfases: [
    { texto: 'SOBERANIA', startSec: 3, durSec: 1.8 },
    { texto: 'DESCENTRALIZA', startSec: 7, durSec: 1.8 },
    { texto: 'SEM PERMISSÃO', startSec: 11, durSec: 1.8 },
  ],
  capitulos: [],
  cutaways: [],
  paleta: DEFAULT_PALETA,
  handle: '@GuyFolkz',
  faixaTese: 'A IA é descentralização — e ninguém te contou.',
  durTotalSec: 14,
  overlayOnly: false, // VerticalLong sempre frame-cheio (o recorte do criador É a composição)
  // === aditivos verticais (recorte + identidade) ===
  creator_focus_y: 0.34,
  creator_zoom: 1.0,
  logo_url: '',
  split_ratio: 0.62,
};

// Duração consistente com o padrão do repo (mesma fórmula do landscapeLongParaFrames).
export const verticalLongParaFrames = (durTotalSec: number) =>
  Math.max(1, Math.round((durTotalSec ?? 1) * FPS));

// ── Cold open: tese sobreposta nos primeiros ~3s (versão vertical, fonte mobile-first) ──
const ColdOpenTitle: React.FC<{ text: string; accent: string; textColor: string }> = ({
  text,
  accent,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [6, 36], [0, 420], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.68) 100%)',
        zIndex: 70,
        padding: '0 64px',
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: 5,
          background: accent,
          borderRadius: 2,
          marginBottom: 28,
          boxShadow: `0 0 22px ${accent}`,
        }}
      />
      <div
        style={{
          maxWidth: 940,
          textAlign: 'center',
          fontFamily: 'Montserrat, Poppins, Inter, Segoe UI, sans-serif',
          fontWeight: 900,
          fontSize: 78,
          lineHeight: 1.08,
          color: textColor,
          transform: `scale(${scale})`,
          textShadow: '0 4px 22px rgba(0,0,0,0.7)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ── Ênfase pontual (vertical): palavra-chave que estoura na ÁREA DE APOIO, sem cortar. ──
// Reposicionada pro centro-baixo da área de apoio (não no terço inferior do 16:9). Quebra de
// linha automática (whiteSpace normal) p/ frases longas não vazarem das laterais 9:16.
const EnfasePopVertical: React.FC<{ texto: string; accent: string; anchorY: number }> = ({
  texto,
  accent,
  anchorY,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.55, 1]);
  const op = interpolate(
    frame,
    [0, 5, Math.max(6, durationInFrames - 8), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: anchorY,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(-3deg)`,
        transformOrigin: 'center',
        opacity: op,
        zIndex: 58,
        width: 940,
        maxWidth: 940,
        fontFamily: 'Inter, Arial, sans-serif',
        fontWeight: 900,
        fontSize: 96,
        lineHeight: 0.98,
        color: accent,
        WebkitTextStroke: '3px rgba(5,6,10,0.65)',
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
        textShadow: `0 0 26px ${accent}, 0 6px 20px rgba(0,0,0,0.6)`,
        letterSpacing: '0.01em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      {texto}
    </div>
  );
};

// ── Marcador de capítulo (lower-third sobre a costura), versão vertical ──
const ChapterMarker: React.FC<{
  titulo: string;
  number: number;
  accent: string;
  textColor: string;
  splitY: number;
}> = ({ titulo, number, accent, textColor, splitY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, mass: 0.5 } });
  const slideX = interpolate(s, [0, 1], [-60, 0]);
  const opacity = interpolate(frame, [0, 12, 90, 105], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: splitY + 28,
        left: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `translateX(${slideX}px)`,
        zIndex: 65,
      }}
    >
      <div
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 900,
          fontSize: 48,
          color: accent,
          textShadow: `0 0 18px ${accent}`,
        }}
      >
        {String(number).padStart(2, '0')}
      </div>
      <div style={{ width: 4, height: 44, background: accent, borderRadius: 2 }} />
      <div
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 800,
          fontSize: 34,
          color: textColor,
          textTransform: 'uppercase',
          letterSpacing: 2,
          textShadow: '0 3px 14px rgba(0,0,0,0.6)',
        }}
      >
        {titulo}
      </div>
    </div>
  );
};

// ── Painel de marca discreto: o "repouso" da área de apoio quando não há cutaway ativo.
// Gradiente da paleta + handle + logo opcional. Calmo (não compete com a fala/criador). ──
const BrandRest: React.FC<{
  bg: string;
  accent: string;
  handle: string;
  logoUrl?: string;
}> = ({ bg, accent, handle, logoUrl }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 26), [-1, 1], [0.35, 0.7]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${accent}1f 0%, ${bg} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
      }}
    >
      {logoUrl ? (
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 30,
            background: 'rgba(255,255,255,0.96)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: `0 0 ${Math.round(28 * glow)}px ${accent}`,
          }}
        >
          <Img src={resolveSrc(logoUrl)} style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
        </div>
      ) : (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: `4px solid ${accent}`,
            boxShadow: `0 0 ${Math.round(26 * glow)}px ${accent}`,
          }}
        />
      )}
      {handle ? (
        <div
          style={{
            color: '#fff',
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 900,
            fontSize: 46,
            letterSpacing: 3,
            textShadow: '0 2px 14px rgba(0,0,0,0.7)',
          }}
        >
          {handle.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── Cutaway na ÁREA DE APOIO (ou fullscreen, num punch momentâneo) ──
const SupportCutaway: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
  label?: string;
  durFrames: number;
  accent: string;
}> = ({ videoUrl, imageUrl, label, durFrames, accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, durFrames - 10, durFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 12], [1.08, 1], { extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, durFrames], [-10, 10], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden', backgroundColor: '#05060a' }}>
      {videoUrl ? (
        <OffthreadVideo
          src={resolveSrc(videoUrl)}
          muted
          loop
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}
        />
      ) : imageUrl ? (
        // Ken Burns na imagem (apoio estático ganha movimento)
        <Img
          src={resolveSrc(imageUrl)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translateX(${panX}px)`,
          }}
        />
      ) : null}
      {/* vinheta sutil p/ integrar + moldura neon discreta sinalizando "insert" */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,6,10,0.45) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `3px solid ${accent}`,
          boxShadow: `inset 0 0 34px ${accent}55`,
          pointerEvents: 'none',
        }}
      />
      {label ? (
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 28,
            padding: '8px 18px',
            borderRadius: 8,
            background: 'rgba(5,6,10,0.78)',
            border: `2px solid ${accent}`,
            color: '#fff',
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// detecta se um cutaway deve estender sobre o criador (beat fullscreen = "punch").
const isFullscreenCutaway = (label?: string): boolean =>
  /\b(punch|fullscreen|tela\s*cheia|full)\b/i.test(label ?? '');

export const VerticalLong: React.FC<VerticalLongProps> = (props) => {
  const {
    creatorVideoUrl,
    creatorLiveAudio = true,
    words = [],
    enfases = [],
    capitulos = [],
    cutaways = [],
    paleta,
    handle = '',
    faixaTese = '',
    durTotalSec,
    // aditivos verticais
    creator_focus_x,
    creator_focus_y = 0.34,
    creator_zoom = 1.0,
    creator_punches,
    creator_face_keyframes,
    logo_url = '',
    music_url,
    voice_windows,
    sfx_url,
    split_ratio = 0.62,
  } = props;

  const [bg, accent, textColor] = [
    paleta?.[0] ?? DEFAULT_PALETA[0],
    paleta?.[1] ?? DEFAULT_PALETA[1],
    paleta?.[2] ?? DEFAULT_PALETA[2],
  ];

  const total = verticalLongParaFrames(durTotalSec);
  // painel do criador ≈62% (clamp 0.55–0.68). splitY = costura.
  const splitY = Math.round(clamp(split_ratio, 0.55, 0.68) * H);
  const supportTop = splitY;
  const supportH = H - splitY;
  const supportCenterY = supportTop + Math.round(supportH * 0.46); // âncora p/ ênfases

  // cutaways: divididos em "apoio" (área de baixo) e "fullscreen" (beat sobre o criador).
  const cuts = (cutaways ?? []).map((cw, i) => ({
    i,
    from: Math.max(0, Math.round((cw.startSec ?? 0) * FPS)),
    durFrames: Math.max(1, Math.round((cw.durSec ?? 1) * FPS)),
    cw,
    full: isFullscreenCutaway(cw.label),
  }));

  // ducking: música abaixa sob a voz (janelas em s). Igual ao SplitReaction.
  const hasVW = Array.isArray(voice_windows) && voice_windows.length > 0;
  const musicVol = hasVW
    ? (f: number) => {
        const t = f / FPS;
        const inVoice = voice_windows!.some((w) => t >= w.from - 0.12 && t < w.to + 0.12);
        return inVoice ? 0.045 : 0.13;
      }
    : 0.12;

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* ── ÁREA DE APOIO (fundo): por default o painel de marca. Cutaways de apoio entram
            por cima dele nas mesmas janelas de tempo do 16:9 (sincronizado). ───────────── */}
      <div
        style={{
          position: 'absolute',
          top: supportTop,
          left: 0,
          width: W,
          height: supportH,
          overflow: 'hidden',
        }}
      >
        {/* repouso: painel de marca discreto */}
        <BrandRest bg={bg} accent={accent} handle={handle} logoUrl={logo_url} />

        {/* cutaways de APOIO (não-fullscreen): vídeo/Ken Burns na área de baixo */}
        {cuts
          .filter((c) => !c.full)
          .map((c) => (
            <Sequence key={`sup${c.i}`} from={c.from} durationInFrames={c.durFrames}>
              <TransitionScene entryAnim="fade" entryDurFrames={8} style={{ position: 'absolute', inset: 0 }}>
                <SupportCutaway
                  videoUrl={c.cw.videoUrl}
                  imageUrl={c.cw.imageUrl}
                  label={c.cw.label}
                  durFrames={c.durFrames}
                  accent={accent}
                />
              </TransitionScene>
            </Sequence>
          ))}
      </div>

      {/* ── PAINEL DO CRIADOR (topo ~62%): CreatorTop recropa a gravação 16:9 no rosto
            (object-position + zoom + punches + face-tracking) e desenha a linha-costura neon.
            Reusa EXATAMENTE a infra do SplitReaction. ──────────────────────────────────── */}
      <CreatorTop
        creator_url={creatorVideoUrl}
        creator_live_audio={creatorLiveAudio}
        handle={handle}
        logo_url={logo_url}
        paleta_hex={accent}
        splitY={splitY}
        creator_focus_x={creator_focus_x}
        creator_focus_y={creator_focus_y}
        creator_zoom={creator_zoom}
        creator_punches={creator_punches}
        creator_face_keyframes={creator_face_keyframes}
      />

      {/* cutaways FULLSCREEN (label punch/fullscreen): estendem sobre o criador num beat
          momentâneo. Renderizados DEPOIS do CreatorTop p/ ficarem por cima. */}
      {cuts
        .filter((c) => c.full)
        .map((c) => (
          <Sequence key={`full${c.i}`} from={c.from} durationInFrames={c.durFrames}>
            <SupportCutaway
              videoUrl={c.cw.videoUrl}
              imageUrl={c.cw.imageUrl}
              label={c.cw.label}
              durFrames={c.durFrames}
              accent={accent}
            />
          </Sequence>
        ))}

      {/* ── LEGENDA karaokê na COSTURA dos painéis (anchorY = splitY). Fonte grande mobile-first.
            OPCIONAL: só renderiza se houver `words` (modo legendado). MODO ÊNFASE ⇒ words=[]. ── */}
      {words.length > 0 ? (
        <Sequence from={0} durationInFrames={total}>
          <WordCaptions
            words={words}
            fromSec={0}
            anchorY={splitY}
            accent={accent}
            fontSize={76}
            maxWidth={960}
            maxWordsPerGroup={3}
            variant="solta"
            allCaps
          />
        </Sequence>
      ) : null}

      {/* ── CAPÍTULOS: lower-third logo abaixo da costura, ~3.5s na tela ── */}
      {(capitulos ?? []).map((cap, i) => {
        const from = Math.max(0, Math.round((cap.startSec ?? 0) * FPS));
        return (
          <Sequence key={`cap${i}`} from={from} durationInFrames={105}>
            <ChapterMarker
              titulo={cap.titulo}
              number={i + 1}
              accent={accent}
              textColor={textColor}
              splitY={splitY}
            />
          </Sequence>
        );
      })}

      {/* ── COLD OPEN: tese sobreposta nos primeiros ~3s ── */}
      {faixaTese ? (
        <Sequence from={0} durationInFrames={90}>
          <ColdOpenTitle text={faixaTese} accent={accent} textColor={textColor} />
        </Sequence>
      ) : null}

      {/* ── ÊNFASES PONTUAIS: KeywordPop reposicionado pro centro-baixo da área de apoio
            (nunca cortado nas laterais 9:16; quebra de linha quando longo). ── */}
      {enfases.map((enf, i) => {
        const from = Math.max(0, Math.round((enf.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((enf.durSec ?? 1.8) * FPS));
        return (
          <Sequence key={`enf${i}`} from={from} durationInFrames={durFrames}>
            <EnfasePopVertical texto={enf.texto} accent={accent} anchorY={supportCenterY} />
          </Sequence>
        );
      })}

      {/* ── ÁUDIO ──
          1) áudio do criador = OffthreadVideo dentro do CreatorTop (creator_live_audio).
          2) música de fundo OPCIONAL com ducking sob a voz (igual SplitReaction). Ausente ⇒
             só o áudio do criador (= comportamento do Landscape).
          3) SFX whoosh OPCIONAL nos cortes dos cutaways. */}
      {music_url ? (
        <Sequence from={0} durationInFrames={total}>
          <Audio src={resolveSrc(music_url)} volume={musicVol} loop />
        </Sequence>
      ) : null}
      {sfx_url
        ? cuts.map((c) => (
            <Sequence key={`sfx${c.i}`} from={Math.max(0, c.from - 5)} durationInFrames={18}>
              <Audio src={resolveSrc(sfx_url)} volume={0.3} />
            </Sequence>
          ))
        : null}

      {/* ── HANDLE discreto no canto inferior direito (sobre a área de apoio) ── */}
      {handle ? (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 44,
            zIndex: 80,
            color: accent,
            opacity: 0.9,
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: 2,
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}
        >
          {handle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
