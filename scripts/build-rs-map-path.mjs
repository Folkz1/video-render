// build-rs-map-path.mjs — gerador OFFLINE do path SVG do contorno do Rio Grande do Sul.
//
// Roda UMA VEZ (dev machine), NUNCA no render headless. Lê o GeoJSON oficial do IBGE
// (malha territorial do estado RS, já simplificada pela própria API) e projeta cada
// ponto lat/lon pra um espaço de pixels FIXO usando uma projeção linear equiretangular
// com correção de cosseno de latitude (aproximação leve, sem d3-geo — adequada pra uma
// área do tamanho de um estado). Gera `src/data/rs-map-path.ts`, que exporta:
//   - RS_MAP_PATH_D: string do atributo `d` do <path> SVG (contorno do estado)
//   - RS_MAP_BBOX: { latMin, latMax, lonMin, lonMax } — os MESMOS limites usados aqui
//   - RS_MAP_SCALE / RS_MAP_LON_CORRECTION: os fatores da projeção
//   - RS_MAP_WIDTH / RS_MAP_HEIGHT: dimensões do espaço de pixels resultante
//
// `src/kit/geoProjection.ts` importa essas constantes e expõe `projectLatLon(lat, lon)`
// usando a IDÊNTICA fórmula abaixo — então qualquer cidade (lat/lon real) cai exatamente
// no lugar certo sobre o contorno, sem precisar reprocessar o path em runtime.
//
// Fonte dos dados: IBGE — API de Malhas Territoriais (malha do estado 43 = RS),
// qualidade=minima (já generalizada pelo IBGE, 1 polígono, ~240 pontos). Cópia local em
// scripts/data/rs-ibge-raw.geojson.json pra não depender de rede pra regenerar.
// Regerar (se precisar): node scripts/build-rs-map-path.mjs
//
// Fonte original (se quiser buscar de novo):
// https://servicodados.ibge.gov.br/api/v3/malhas/estados/RS?formato=application/vnd.geo+json&qualidade=minima

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = path.join(__dirname, 'data', 'rs-ibge-raw.geojson.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'rs-map-path.ts');

const TARGET_HEIGHT = 1080; // altura do espaço de pixels "canônico" do mapa (a largura deriva do aspect real)
const ROUND = (n) => Math.round(n * 10) / 10; // 1 casa decimal — path enxuto, precisão de sobra pra 1080x1920

function main() {
  const raw = JSON.parse(readFileSync(RAW_PATH, 'utf8'));
  const feature = raw.features[0];
  const geomType = feature.geometry.type;
  // suporta Polygon (1 anel externo) e MultiPolygon (vários) — RS hoje é um único Polygon,
  // mas deixamos MultiPolygon coberto pra robustez se o IBGE mudar a malha no futuro.
  const rings = geomType === 'Polygon' ? [feature.geometry.coordinates[0]] : feature.geometry.coordinates.map((p) => p[0]);

  // bbox real do estado (nenhum padding extra — os limites SÃO o contorno do RS)
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
      lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
    }
  }

  // correção de cosseno de latitude: no hemisfério sul, 1° de longitude "encolhe"
  // horizontalmente conforme a latitude. Usamos o centro do estado como referência —
  // aproximação linear (não é projeção cartográfica completa), suficiente pra um estado.
  const centerLatRad = ((latMin + latMax) / 2) * (Math.PI / 180);
  const lonCorrection = Math.cos(centerLatRad);

  const scale = TARGET_HEIGHT / (latMax - latMin);
  const width = (lonMax - lonMin) * lonCorrection * scale;

  const project = (lon, lat) => ({
    x: ROUND((lon - lonMin) * lonCorrection * scale),
    y: ROUND((latMax - lat) * scale),
  });

  const ringToPath = (ring) => {
    const pts = ring.map(([lon, lat]) => project(lon, lat));
    const [first, ...rest] = pts;
    return `M${first.x},${first.y} ` + rest.map((p) => `L${p.x},${p.y}`).join(' ') + ' Z';
  };

  const pathD = rings.map(ringToPath).join(' ');
  const totalPoints = rings.reduce((n, r) => n + r.length, 0);

  const out = `// ─────────────────────────────────────────────────────────────────────────────
// GERADO OFFLINE por scripts/build-rs-map-path.mjs — NÃO EDITAR À MÃO.
// Fonte: IBGE Malhas Territoriais (estado 43 = RS, qualidade=minima).
// Regerar: node scripts/build-rs-map-path.mjs
//
// RS_MAP_PATH_D é o contorno do Rio Grande do Sul num espaço de pixels FIXO
// (${Math.round(width)}×${TARGET_HEIGHT}). RS_MAP_BBOX/SCALE/LON_CORRECTION são os
// mesmos valores usados pra projetar cada ponto — src/kit/geoProjection.ts usa a
// IDÊNTICA fórmula pra projetar lat/lon de cidades nesse mesmo espaço, garantindo
// alinhamento entre o contorno e os pins.
// ─────────────────────────────────────────────────────────────────────────────

export const RS_MAP_BBOX = {
  latMin: ${latMin},
  latMax: ${latMax},
  lonMin: ${lonMin},
  lonMax: ${lonMax},
} as const;

export const RS_MAP_SCALE = ${scale}; // pixels por grau de latitude (e por grau de longitude já corrigido)
export const RS_MAP_LON_CORRECTION = ${lonCorrection}; // cos(latitude central) — encolhimento horizontal
export const RS_MAP_WIDTH = ${Math.round(width * 10) / 10};
export const RS_MAP_HEIGHT = ${TARGET_HEIGHT};

// ${totalPoints} pontos (${rings.length} anel${rings.length > 1 ? 'is' : ''}), simplificado pelo próprio IBGE (qualidade=minima).
export const RS_MAP_PATH_D = '${pathD}';
`;

  writeFileSync(OUT_PATH, out, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`OK: ${OUT_PATH}`);
  console.log(`bbox lat [${latMin}, ${latMax}] lon [${lonMin}, ${lonMax}]`);
  console.log(`pixel space: ${Math.round(width)}x${TARGET_HEIGHT} — ${totalPoints} pontos, ${rings.length} anel(is)`);
}

main();
