import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring
} from 'remotion';
import { 
  FPS, 
  C, 
  TitleBadge, 
  FadeOverlay, 
  DataPoint, 
  Scoreboard, 
  Timer,
  GlitchTransition
} from './VideoLongBase';

/**
 * COMPOSITION: EP01 - A VIRADA (EDIÇÃO COMPLETA)
 * Ajuste dinâmico de efeitos visuais sobre o clipe da câmera.
 */

export const T = {
  hook: 0,
  contexto: 45,       // 0:45
  jarb1: 150,         // 2:30
  virada_demo: 158,   // 2:38
  prova_tela: 300,    // 5:00
  jarb2: 480,         // 8:00
  metodo_tela: 490,   // 8:10
  objecao: 720,       // 12:00
  jarb3: 810,         // 13:30
  honestidade: 818,   // 13:38
  virada_final: 930,  // 15:30
  cta: 1020           // 17:00
};

export const Video1AVirada: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();  const DIEGO_VIDEO = "2026-03-07_17-20-29_studio.mp4"; 
  const videoSrc = staticFile(DIEGO_VIDEO);

  // Efeito intermitente do modo 'Honestidade'
  const isHonestidade = frame > T.honestidade * fps && frame < T.virada_final * fps;
  const redPulse = isHonestidade 
      ? interpolate(Math.sin((frame - T.honestidade * fps) * 0.1), [-1, 1], [0, 0.1]) 
      : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      
      {/* 1. VÍDEO PRINCIPAL (A-ROLL) */}
      <AbsoluteFill>
         <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(255, 0, 0, ${redPulse})`, zIndex: 5, pointerEvents: 'none' }} />
         <OffthreadVideo src={videoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} volume={1.0} />
         <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 150px rgba(10,10,15,0.8)', zIndex: 10 }} />
      </AbsoluteFill>


      {/* 2. HOOK - O Choque do antes vs agora (OVERLAY PLAYWRIGHT HOOK) */}
      <Sequence from={T.hook * fps} durationInFrames={15 * fps}>
         <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 40, zIndex: 12 }}>
             <div style={{ width: '40%', height: '40%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 50px rgba(0,255,255,0.2)', border: `2px solid ${C.cyan}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-hook.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>
      
      <Sequence from={15 * fps} durationInFrames={(T.contexto - 15) * fps}>
         <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 40, zIndex: 12 }}>
             {/* Mantemos fixada a última visão ou expandida */}
             <div style={{ width: '40%', height: '40%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 50px rgba(0,255,136,0.2)', border: `2px solid ${C.green}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-hook.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 3. CONTEXTO - A Dor (OVERLAY PLAYWRIGHT PROBREMA) */}
      <Sequence from={T.contexto * fps} durationInFrames={(T.jarb1 - T.contexto) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,15,0.7)', zIndex: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* Gravação The WebM gerada pelo script Playwright contendo the layout e animações originais */}
             <div style={{ width: '85%', height: '85%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 100px rgba(255,0,0,0.2)', border: `2px solid ${C.red}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-problema.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 4. JARB 1 (VOZ E FEEDBACK VISUAL) */}
      <Sequence from={T.jarb1 * fps} durationInFrames={(T.virada_demo - T.jarb1) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,15,0.7)', zIndex: 12 }}>
             <Audio src={staticFile('audio/jarb_ep01_1.mp3')} volume={1.3} />
             <Audio src={staticFile('audio/sfx_woosh.mp3')} volume={0.8} />
             <div style={{ position: 'absolute', inset: 0, border: `12px solid ${C.cyan}`, opacity: 0.4 }} />
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: `${C.cyan}22`, border: `2px solid ${C.cyan}`, padding: '40px', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
               <h3 style={{ fontSize: 60, fontFamily: 'Inter', fontWeight: 900, color: C.cyan, margin: 0, textShadow: `0 0 30px ${C.cyan}` }}>[ JARB INJETANDO ]</h3>
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 5. A VIRADA - CLAUDE.md (OVERLAY PLAYWRIGHT SOLUÇÃO) */}
      <Sequence from={T.virada_demo * fps} durationInFrames={(T.prova_tela - T.virada_demo) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(5,5,8,0.7)', zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Audio src={staticFile('audio/sfx_hit.mp3')} volume={1.0} />
             
             {/* A Gravação Real do Playwright assumindo a Tela */}
             <div style={{ width: '90%', height: '90%', borderRadius: '20px', overflow: 'hidden', boxShadow: `0 0 100px ${C.green}33`, border: `2px solid ${C.green}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-solucao.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 6. A PROVA - OS 7 PROJETOS (OVERLAY PLAYWRIGHT PROVA) */}
      <Sequence from={T.prova_tela * fps} durationInFrames={(T.jarb2 - T.prova_tela) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,15,0.7)', zIndex: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* Tela Renderizada do Playwright contendo os dados reais */}
             <div style={{ width: '90%', height: '90%', borderRadius: '20px', overflow: 'hidden', boxShadow: `0 0 100px ${C.gold}22`, border: `2px solid ${C.gold}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-prova.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 7. JARB 2 */}
      <Sequence from={T.jarb2 * fps} durationInFrames={(T.metodo_tela - T.jarb2) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,15,0.7)', zIndex: 16 }}>
             <Audio src={staticFile('audio/jarb_ep01_2.mp3')} />
             <div style={{ position: 'absolute', inset: 0, border: `12px solid ${C.cyan}`, opacity: 0.4 }} />
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: `${C.cyan}22`, border: `2px solid ${C.cyan}`, padding: '40px', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
               <h3 style={{ fontSize: 60, fontFamily: 'Inter', fontWeight: 900, color: C.cyan, margin: 0, textShadow: `0 0 30px ${C.cyan}` }}>[ JARB INJETANDO ]</h3>
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 8. MÉTODO / FRAMEWORK (OVERLAY DIREITA) */}
      <Sequence from={T.metodo_tela * fps} durationInFrames={(T.objecao - T.metodo_tela) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(5,5,16,0.5)', zIndex: 17 }}>
             <div style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translate(0, -50%)', display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'right' }}>
                <h1 style={{ fontSize: 60, fontFamily: 'Inter', fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>[1] DIREÇÃO</h1>
                <h1 style={{ fontSize: 60, fontFamily: 'Inter', fontWeight: 900, color: C.cyan, margin: 0, textShadow: `0 0 40px ${C.cyan}` }}>[2] SKILLS (Depts)</h1>
                <h1 style={{ fontSize: 60, fontFamily: 'Inter', fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>[3] GATES CONTÍNUOS</h1>
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* 9. OBJEÇÃO - Funciona pra coisas complexas? */}
      <Sequence from={T.objecao * fps} durationInFrames={(T.jarb3 - T.objecao) * fps}>
         <DataPoint value="Risco Alto" label="GATES AUTOMÁTICOS" x={80} y={100} color={C.purple} />
         <DataPoint value="PR Automático" label="REVISÃO DO CODEX" x={80} y={240} delay={2*fps} color={C.blue} />
      </Sequence>

      {/* 10. JARB 3 */}
      <Sequence from={T.jarb3 * fps} durationInFrames={(T.honestidade - T.jarb3) * fps}>
         <Audio src={staticFile('audio/jarb_ep01_3.mp3')} volume={1.3} />
         <div style={{ position: 'absolute', inset: 0, border: `12px solid ${C.cyan}`, opacity: 0.4, zIndex: 20 }} />
      </Sequence>

      {/* 11. HONESTIDADE - Mostra onde a IA falha */}
      <Sequence from={T.honestidade * fps} durationInFrames={(T.virada_final - T.honestidade) * fps}>
         <Audio src={staticFile('audio/sfx_hit.mp3')} volume={0.8} />
         <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '8px 24px', background: C.red, color: '#fff', fontFamily: 'Inter', fontWeight: 900, fontSize: 24, borderRadius: 8, letterSpacing: 4 }}>
               ALERTA DE FALHA
            </div>
            <h2 style={{ fontSize: 36, fontFamily: 'Inter', fontWeight: 800, color: '#fff', marginTop: 16, textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>
               PRODUTO, ESTRATÉGIA E CONTEXTO LARGO AINDA SÃO HUMANOS.
            </h2>
         </div>
      </Sequence>

      {/* 12. VIRADA FINAL (Fechamento) */}
      <Sequence from={T.virada_final * fps} durationInFrames={(T.cta - T.virada_final) * fps}>
         <Audio src={staticFile('audio/sfx_woosh.mp3')} volume={1.0} />
         <GlitchTransition />
         <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,10,15,0.6)', zIndex: 40 }}>
            <h1 style={{ fontSize: 90, fontFamily: 'Inter', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: -2, margin: 0, textAlign: 'center' }}>
               EU NÃO VIREI UM<br/>
               <span style={{ color: C.green }}>CARA DA I.A.</span>
            </h1>
         </AbsoluteFill>
      </Sequence>
      
      <Sequence from={T.virada_final * fps + 3 * fps} durationInFrames={((T.cta - T.virada_final) - 3) * fps}>
         <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,10,15,0.9)', zIndex: 45 }}>
            <h1 style={{ fontSize: 80, fontFamily: 'Inter', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: -2, margin: 0, textAlign: 'center' }}>
               EU VIREI UM<br/>
               <span style={{ color: C.gold }}>OPERADOR DE SISTEMAS.</span>
            </h1>
         </AbsoluteFill>
      </Sequence>

      {/* 13. CTA FINAL (OVERLAY PLAYWRIGHT CTA) */}
      <Sequence from={T.cta * fps} durationInFrames={(T.cta + 90) * fps}>
         <AbsoluteFill style={{ backgroundColor: 'rgba(10,10,15,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div style={{ width: '80%', height: '80%', borderRadius: '20px', overflow: 'hidden', boxShadow: `0 0 100px ${C.gold}33`, border: `2px solid ${C.gold}55` }}>
                 <OffthreadVideo src={staticFile('recordings-v11/v11-cta.webm')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
         </AbsoluteFill>
      </Sequence>

      {/* Fade out universal no final do vídeo */}
      <FadeOverlay mode="out" startFrame={durationInFrames - FPS*2} dur={FPS*2} />
    </AbsoluteFill>
  );
};
