import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Short vertical TÉCNICO (canal pessoal de IA/dev): cenas ANIMADAS (motion graphics)
// em vez de fotos — terminal, diagrama de agentes, conceito, stat, hook, cta.
// Áudio por cena (voz do criador / clone), crossfade, branding. 1080x1920 @ 30fps.

const FPS = 30;
const OVERLAP = 10;

const resolveSrc = (src: string): string =>
  !src ? src : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const MONO = 'JetBrains Mono, Fira Code, Consolas, monospace';
const SANS = 'Inter, Segoe UI, sans-serif';

export type CenaTech = {
  anim: 'hook' | 'terminal' | 'agentes' | 'conceito' | 'stat' | 'cta';
  kicker?: string;
  texto: string;
  audio_url: string;
  duracao_s: number;
  linhas?: string[]; // terminal
  nodes?: string[]; // agentes
  numero?: string; // stat
  label?: string; // stat
  bullets?: string[]; // conceito
};

export type ShortTechProps = {
  cenas: CenaTech[];
  accent: string;
  handle: string;
  logo_url?: string;
  sfx_url?: string;
  music_url?: string;
};

export const shortTechDefaultProps: ShortTechProps = {
  cenas: [
    { anim: 'hook', kicker: 'IA NA PRÁTICA', texto: 'Seu primeiro agente em 20 min', audio_url: '', duracao_s: 3.5 },
    { anim: 'terminal', texto: 'Um comando e ele já roda', linhas: ['$ npx hermes init', '⚙ configurando skills...', '✓ agente no ar'], audio_url: '', duracao_s: 5 },
    { anim: 'agentes', texto: 'Ele orquestra o resto', nodes: ['Claude Code', 'Hermes', 'Skills'], audio_url: '', duracao_s: 5 },
    { anim: 'stat', numero: '20min', label: 'do zero ao rodando', texto: 'Sem virar programador', audio_url: '', duracao_s: 4 },
    { anim: 'cta', texto: 'Começa hoje', audio_url: '', duracao_s: 3 },
  ],
  accent: '#00e5ff',
  handle: '@guyfolkz',
};

export const cenasTechParaFrames = (cenas: CenaTech[]) =>
  (cenas ?? []).reduce((a, c) => a + Math.max(1, Math.round((c.duracao_s ?? 3) * FPS)), 0);

// ── Fundo CYBERPUNK / synthwave (grid em perspectiva + neon + scanlines) ──────
const MAGENTA = '#ff2bd6';
const CyberBackground: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 24), [-1, 1], [0.22, 0.5]);
  const scroll = (frame * 2) % 80;
  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* glow de horizonte (sol synthwave) */}
      <AbsoluteFill style={{ background: `radial-gradient(120% 60% at 50% 30%, ${accent}33 0%, ${MAGENTA}1f 30%, transparent 60%)` }} />
      {/* grid em perspectiva, rolando */}
      <div
        style={{
          position: 'absolute', left: '-50%', right: '-50%', bottom: 0, height: '62%',
          backgroundImage:
            `linear-gradient(${accent}55 2px, transparent 2px), linear-gradient(90deg, ${accent}40 2px, transparent 2px)`,
          backgroundSize: `80px 80px`,
          backgroundPositionY: `${scroll}px`,
          transform: 'perspective(520px) rotateX(68deg)',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(transparent, #000 40%)',
          WebkitMaskImage: 'linear-gradient(transparent, #000 40%)',
          opacity: 0.7,
        }}
      />
      {/* glow central pulsante */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${accent}${Math.round(glow * 90).toString(16).padStart(2, '0')} 0%, transparent 52%)` }} />
      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 2px, transparent 4px)',
          opacity: 0.5, mixBlendMode: 'multiply',
        }}
      />
      {/* vinheta */}
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 320px 80px rgba(0,0,0,0.85)' }} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ kicker?: string; texto: string; accent: string; dur: number }> = ({ kicker, texto, accent, dur }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [OVERLAP, OVERLAP + 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame, [OVERLAP, OVERLAP + 12], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 64, right: 64, bottom: 230, opacity: op, transform: `translateY(${y}px)` }}>
      {kicker ? (
        <div style={{ color: accent, fontFamily: MONO, fontSize: 30, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ color: '#fff', fontFamily: SANS, fontSize: 72, fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.01em', textShadow: '0 3px 24px rgba(0,0,0,0.6)' }}>
        {texto}
      </div>
    </div>
  );
};

// ── HOOK: palavras entrando com stagger ───────────────────────────────────────
const HookAnim: React.FC<{ cena: CenaTech; accent: string }> = ({ cena, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = cena.texto.split(' ');
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {cena.kicker ? (
        <div style={{ color: accent, fontFamily: MONO, fontSize: 34, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 30, opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) }}>
          {cena.kicker}
        </div>
      ) : null}
      {(() => {
        // glitch RGB split: flicker pseudo-aleatório baseado no frame
        const g = Math.sin(frame * 12.9898) * 43758.5453;
        const glitch = (g - Math.floor(g)) > 0.82 ? 1 : 0;
        const dx = glitch ? 6 : 0;
        const layer = (color: string, ox: number, opacity: number) => (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '0 22px', color, transform: `translateX(${ox}px)`, opacity, mixBlendMode: 'screen' }}>
            {words.map((w, i) => {
              const s = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 16, mass: 0.5 } });
              return (
                <span key={i} style={{ fontFamily: SANS, fontSize: 96, fontWeight: 900, lineHeight: 1.05, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>{w}</span>
              );
            })}
          </div>
        );
        return (
          <div style={{ position: 'relative', width: '100%', minHeight: 320, textShadow: `0 0 30px ${accent}` }}>
            {layer(accent, -dx, glitch ? 0.6 : 0)}
            {layer(MAGENTA, dx, glitch ? 0.6 : 0)}
            {layer('#fff', glitch ? (dx ? 2 : 0) : 0, 1)}
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

// ── TERMINAL: janela com linhas tipando ───────────────────────────────────────
const TerminalAnim: React.FC<{ cena: CenaTech; accent: string; dur: number }> = ({ cena, accent, dur }) => {
  const frame = useCurrentFrame();
  const linhas = cena.linhas ?? [];
  const perLine = Math.max(14, Math.floor((dur - 20) / Math.max(1, linhas.length)));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 70 }}>
      <div style={{ width: '100%', background: '#0d1117', border: '1px solid #20262e', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', overflow: 'hidden', transform: `scale(${interpolate(spring({ frame, fps: 30, config: { damping: 18 } }), [0, 1], [0.92, 1])})` }}>
        <div style={{ display: 'flex', gap: 9, padding: '16px 20px', background: '#161b22', borderBottom: '1px solid #20262e' }}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
            <div key={c} style={{ width: 15, height: 15, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ padding: '28px 26px', fontFamily: MONO, fontSize: 38, lineHeight: 1.7, minHeight: 280 }}>
          {linhas.map((ln, i) => {
            const start = i * perLine;
            const chars = Math.max(0, Math.floor(interpolate(frame - start, [0, perLine * 0.7], [0, ln.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
            const isCmd = ln.trim().startsWith('$');
            const done = ln.trim().startsWith('✓') || ln.trim().startsWith('✔');
            const color = isCmd ? '#fff' : done ? accent : '#8b949e';
            if (frame < start) return <div key={i} style={{ height: 0 }} />;
            return (
              <div key={i} style={{ color }}>
                {ln.slice(0, chars)}
                {chars < ln.length && frame >= start ? <span style={{ color: accent }}>▋</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── AGENTES: nodes conectados com pulso ───────────────────────────────────────
const AgentsAnim: React.FC<{ cena: CenaTech; accent: string }> = ({ cena, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nodes = cena.nodes ?? [];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 70 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {nodes.map((n, i) => {
          const s = spring({ frame: frame - i * 10, fps, config: { damping: 15 } });
          const pulse = interpolate(Math.sin((frame - i * 8) / 12), [-1, 1], [0.6, 1]);
          return (
            <React.Fragment key={i}>
              {i > 0 ? (
                <div style={{ width: 4, height: 70, background: `linear-gradient(${accent}, transparent)`, opacity: interpolate(frame - i * 10, [0, 14], [0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), boxShadow: `0 0 ${pulse * 16}px ${accent}` }} />
              ) : null}
              <div
                style={{
                  padding: '28px 48px', borderRadius: 18, background: '#11161d',
                  border: `2px solid ${accent}`, color: '#fff', fontFamily: MONO, fontSize: 44, fontWeight: 700,
                  opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                  boxShadow: `0 0 ${pulse * 28}px ${accent}55`,
                }}
              >
                {n}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── CONCEITO: frase grande + bullets ──────────────────────────────────────────
const ConceitoAnim: React.FC<{ cena: CenaTech; accent: string }> = ({ cena, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bullets = cena.bullets ?? [];
  return (
    <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'center', padding: '80px 70px' }}>
      <div style={{ color: '#fff', fontFamily: SANS, fontSize: 80, fontWeight: 900, lineHeight: 1.08, marginBottom: 40, opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }), transform: `translateX(${interpolate(frame, [0, 14], [-20, 0], { extrapolateRight: 'clamp' })}px)` }}>
        {cena.kicker ? <span style={{ color: accent }}>{cena.kicker} </span> : null}
      </div>
      {bullets.map((b, i) => {
        const s = spring({ frame: frame - 14 - i * 12, fps, config: { damping: 16 } });
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, opacity: s, transform: `translateX(${(1 - s) * 30}px)` }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: accent, flexShrink: 0 }} />
            <span style={{ color: '#d9e0e8', fontFamily: SANS, fontSize: 52, fontWeight: 600 }}>{b}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── STAT: número gigante ──────────────────────────────────────────────────────
const StatAnim: React.FC<{ cena: CenaTech; accent: string }> = ({ cena, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 70 }}>
      <div style={{ color: accent, fontFamily: MONO, fontSize: 200, fontWeight: 800, lineHeight: 1, transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`, opacity: s, textShadow: `0 0 60px ${accent}66` }}>
        {cena.numero}
      </div>
      {cena.label ? (
        <div style={{ color: '#8b949e', fontFamily: SANS, fontSize: 46, fontWeight: 600, marginTop: 20, opacity: interpolate(frame, [12, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          {cena.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── CTA: fecho ────────────────────────────────────────────────────────────────
const CtaAnim: React.FC<{ cena: CenaTech; accent: string; handle: string; logo_url?: string }> = ({ cena, accent, handle, logo_url }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ color: '#fff', fontFamily: SANS, fontSize: 88, fontWeight: 900, textAlign: 'center', opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})` }}>
        {cena.texto}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40, opacity: interpolate(frame, [14, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        {logo_url ? <Img src={resolveSrc(logo_url)} style={{ height: 60, width: 'auto' }} /> : null}
        <span style={{ color: accent, fontFamily: MONO, fontSize: 48, fontWeight: 700 }}>{handle}</span>
      </div>
    </AbsoluteFill>
  );
};

const renderAnim = (cena: CenaTech, accent: string, handle: string, logo_url: string | undefined, dur: number) => {
  switch (cena.anim) {
    case 'hook': return <HookAnim cena={cena} accent={accent} />;
    case 'terminal': return <TerminalAnim cena={cena} accent={accent} dur={dur} />;
    case 'agentes': return <AgentsAnim cena={cena} accent={accent} />;
    case 'conceito': return <ConceitoAnim cena={cena} accent={accent} />;
    case 'stat': return <StatAnim cena={cena} accent={accent} />;
    case 'cta': return <CtaAnim cena={cena} accent={accent} handle={handle} logo_url={logo_url} />;
    default: return null;
  }
};

const Branding: React.FC<{ handle: string; accent: string }> = ({ handle, accent }) => (
  <div style={{ position: 'absolute', top: 64, left: 56, zIndex: 50, fontFamily: MONO, fontSize: 32, fontWeight: 700, color: '#fff' }}>
    <span style={{ color: accent }}>▸ </span>{handle}
  </div>
);

export const ShortTech: React.FC<ShortTechProps> = ({ cenas, accent, handle, logo_url, sfx_url, music_url }) => {
  let cursor = 0;
  const build = (cenas ?? []).map((cena) => {
    const dur = Math.max(1, Math.round((cena.duracao_s ?? 3) * FPS));
    const item = { cena, from: cursor, dur };
    cursor += dur;
    return item;
  });
  const total = Math.max(1, cursor);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      <CyberBackground accent={accent} />

      {music_url ? (
        <Sequence from={0} durationInFrames={total}>
          <Audio src={resolveSrc(music_url)} volume={0.1} loop />
        </Sequence>
      ) : null}

      {build.map((b, i) => (
        <Sequence key={`a${i}`} from={b.from} durationInFrames={b.dur}>
          {b.cena.audio_url ? <Audio src={resolveSrc(b.cena.audio_url)} volume={1} /> : null}
        </Sequence>
      ))}

      {sfx_url
        ? build.slice(1).map((b, i) => (
            <Sequence key={`s${i}`} from={Math.max(0, b.from - 5)} durationInFrames={18}>
              <Audio src={resolveSrc(sfx_url)} volume={0.3} />
            </Sequence>
          ))
        : null}

      {build.map((b, i) => {
        const dd = b.dur + (i === 0 ? 0 : OVERLAP);
        return (
          <Sequence key={`v${i}`} from={Math.max(0, b.from - (i === 0 ? 0 : OVERLAP))} durationInFrames={dd}>
            <SceneWrap dur={dd}>
              {renderAnim(b.cena, accent, handle, logo_url, dd)}
              {b.cena.anim !== 'hook' && b.cena.anim !== 'cta' ? (
                <Caption kicker={b.cena.kicker} texto={b.cena.texto} accent={accent} dur={dd} />
              ) : null}
            </SceneWrap>
          </Sequence>
        );
      })}

      <Branding handle={handle} accent={accent} />
    </AbsoluteFill>
  );
};

const SceneWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, OVERLAP, dur - OVERLAP, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};
