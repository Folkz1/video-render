import React from 'react';
import {
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// CreatorTop — painel-topo do criador, extraído do SplitReaction p/ reuso em TODOS os
// formatos (split universal). Renderiza: vídeo do criador (OffthreadVideo) OU Ken Burns
// do avatar + assinatura anti-repost (HandleTile) + logo badge + linha divisória neon.
// Comportamento visual IDÊNTICO ao painel original do SplitReaction.

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type CreatorTopProps = {
  creator_url?: string; // clip do criador (topo, contínuo) — OffthreadVideo
  creator_avatar?: string; // fallback: imagem do criador (topo) — Ken Burns
  creator_live_audio?: boolean; // gravação real: topo toca o áudio (não muta, não loopa)
  handle: string;
  logo_url?: string;
  paleta_hex: string;
  splitY: number; // altura do painel topo em px (canvas 1920)
  faixa_tese?: string; // não renderizada aqui (fica no host) — mantida por compat de assinatura
};

// Ken Burns lento p/ o avatar (idêntico ao do SplitReaction)
const KenBurns: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [1.05, 1.14], { extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, 120], [-8, 8], { extrapolateRight: 'clamp' });
  return (
    <Img
      src={resolveSrc(src)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` }}
    />
  );
};

// assinatura anti-repost: handle repetido em diagonal, bem sutil, atrás do criador
const HandleTile: React.FC<{ handle: string }> = ({ handle }) => {
  const row = (handle + '   ').repeat(8);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.045, zIndex: 1, transform: 'rotate(-30deg) scale(1.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 64, pointerEvents: 'none' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap', color: '#fff', fontFamily: 'monospace', fontSize: 40, fontWeight: 700 }}>{row}</div>
      ))}
    </div>
  );
};

export const CreatorTop: React.FC<CreatorTopProps> = ({
  creator_url,
  creator_avatar,
  creator_live_audio,
  handle,
  logo_url,
  paleta_hex,
  splitY,
}) => {
  return (
    <>
      {/* TOPO criador (contínuo, fixo) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: splitY, overflow: 'hidden', backgroundColor: '#0a0f1c' }}>
        {creator_url ? (
          <OffthreadVideo src={resolveSrc(creator_url)} muted={!creator_live_audio} loop={!creator_live_audio} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : creator_avatar ? (
          <KenBurns src={creator_avatar} />
        ) : null}
        <HandleTile handle={handle} />
        {logo_url ? (
          <div style={{ position: 'absolute', top: 40, right: 40, width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', zIndex: 50 }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
          </div>
        ) : null}
      </div>

      {/* linha divisória neon */}
      <div style={{ position: 'absolute', top: splitY - 3, left: 0, width: 1080, height: 6, background: paleta_hex, opacity: 0.95, zIndex: 35, boxShadow: `0 0 18px ${paleta_hex}` }} />
    </>
  );
};

// Tela do criador em modo "live audio": quando a gravação real toca seu próprio áudio,
// o host não deve emitir o Audio() das cenas. Helper export p/ os formatos decidirem.
export const creatorLiveAudio = (p: { creator_live_audio?: boolean; show_creator_panel?: boolean }): boolean =>
  Boolean(p.show_creator_panel && p.creator_live_audio);
