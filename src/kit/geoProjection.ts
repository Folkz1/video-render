// geoProjection.ts — projeção lat/lon -> pixels do mapa do Rio Grande do Sul.
//
// Não é uma projeção cartográfica completa (sem d3-geo/mapbox — o repo não tem essas
// libs, ver package.json). É uma projeção linear equiretangular com correção simples
// de cosseno de latitude, precisa o bastante pra um estado. A MESMA fórmula/constantes
// (RS_MAP_BBOX/SCALE/LON_CORRECTION) foi usada OFFLINE por scripts/build-rs-map-path.mjs
// pra gerar RS_MAP_PATH_D (src/data/rs-map-path.ts) — então projectLatLon() aqui projeta
// qualquer lat/lon pro MESMO espaço de pixels do contorno estático, sem reprocessar o
// path em runtime (proibido: render headless não pode fazer geo-processing pesado).
//
// "Câmera" (zoom no eixo de cidades): o WeatherMap não mostra o estado inteiro a cada
// vídeo — ele ENQUADRA a região das cidades da vez (o "eixo" da pauta) via o atributo
// viewBox do <svg>, calculado dinamicamente a partir do bounding box REAL de
// props.cidades (computeCameraViewBox). Path e pins vivem no MESMO espaço de pixels
// fixo (RS_MAP_WIDTH x RS_MAP_HEIGHT); a câmera só recorta/enquadra esse espaço — não
// distorce o contorno do estado (ao contrário de recalibrar a projeção por vídeo, que
// esticaria o mapa de forma não-uniforme conforme as cidades passadas).

import { RS_MAP_BBOX, RS_MAP_HEIGHT, RS_MAP_LON_CORRECTION, RS_MAP_SCALE, RS_MAP_WIDTH } from '../data/rs-map-path';

// re-exporta o path (e as constantes cruas, pra quem precisar) — quem importa
// geoProjection.ts não precisa saber que os dados vêm de um arquivo gerado offline.
export { RS_MAP_PATH_D } from '../data/rs-map-path';
export { RS_MAP_BBOX, RS_MAP_HEIGHT, RS_MAP_LON_CORRECTION, RS_MAP_SCALE, RS_MAP_WIDTH };

export type LatLon = { lat: number; lon: number };
export type Px = { x: number; y: number };

/** Projeta lat/lon pro espaço de pixels fixo do mapa do RS (mesma fórmula do script offline). */
export const projectLatLon = (lat: number, lon: number): Px => ({
  x: (lon - RS_MAP_BBOX.lonMin) * RS_MAP_LON_CORRECTION * RS_MAP_SCALE,
  y: (RS_MAP_BBOX.latMax - lat) * RS_MAP_SCALE,
});

export type CameraViewBox = { minX: number; minY: number; width: number; height: number };

/**
 * Calcula o retângulo de "câmera" (viewBox do SVG) que enquadra o bounding box REAL das
 * cidades passadas, com padding, PRESERVANDO o aspect ratio do container (containerAspect
 * = largura/altura em px) — evita esticar/distorcer o contorno do estado. Cai num fallback
 * generoso (padding mínimo) quando há só 1 cidade ou todas na mesma lat/lon.
 */
export const computeCameraViewBox = (
  cidades: LatLon[],
  containerAspect: number,
  paddingFrac = 0.28,
): CameraViewBox => {
  if (!cidades.length) {
    // sem cidades: mostra o estado inteiro
    return fitAspect({ minX: 0, minY: 0, width: RS_MAP_WIDTH, height: RS_MAP_HEIGHT }, containerAspect);
  }
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const c of cidades) {
    latMin = Math.min(latMin, c.lat); latMax = Math.max(latMax, c.lat);
    lonMin = Math.min(lonMin, c.lon); lonMax = Math.max(lonMax, c.lon);
  }
  // padding mínimo absoluto em graus — impede zoom exagerado quando as cidades estão
  // coladas umas nas outras (ou é 1 única cidade, span=0).
  const MIN_PAD_DEG = 0.5;
  const latPad = Math.max((latMax - latMin) * paddingFrac, MIN_PAD_DEG);
  const lonPad = Math.max((lonMax - lonMin) * paddingFrac, MIN_PAD_DEG);

  const topLeft = projectLatLon(latMax + latPad, lonMin - lonPad);
  const bottomRight = projectLatLon(latMin - latPad, lonMax + lonPad);

  const rect: CameraViewBox = {
    minX: topLeft.x,
    minY: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
  return fitAspect(rect, containerAspect);
};

/** Expande a menor dimensão do retângulo (centrado) até bater o aspect ratio alvo. */
const fitAspect = (rect: CameraViewBox, targetAspect: number): CameraViewBox => {
  const curAspect = rect.width / rect.height;
  if (!Number.isFinite(curAspect) || curAspect <= 0) return rect;
  if (curAspect < targetAspect) {
    // estreito demais -> alarga a largura
    const newWidth = rect.height * targetAspect;
    const cx = rect.minX + rect.width / 2;
    return { minX: cx - newWidth / 2, minY: rect.minY, width: newWidth, height: rect.height };
  }
  // baixo demais -> alarga a altura
  const newHeight = rect.width / targetAspect;
  const cy = rect.minY + rect.height / 2;
  return { minX: rect.minX, minY: cy - newHeight / 2, width: rect.width, height: newHeight };
};

/** Converte um ponto projetado (px no espaço fixo do mapa) pra % dentro de uma câmera (viewBox). */
export const pxToPercent = (p: Px, cam: CameraViewBox): { leftPct: number; topPct: number } => ({
  leftPct: ((p.x - cam.minX) / cam.width) * 100,
  topPct: ((p.y - cam.minY) / cam.height) * 100,
});
