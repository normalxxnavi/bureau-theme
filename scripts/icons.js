// @ts-check
'use strict';

/**
 * Genera el tema de iconos de archivo «Bureau Icons» en icons/.
 *
 *   npm run icons
 *
 * Diseño:
 *   - ARCHIVOS: la etiqueta de un expediente del Bureau: el código (TS, C#,
 *     {}…) o un pictograma en el color del lenguaje, sobre la franja de
 *     clasificación con su muesca. Sin hoja de fondo, para que a 16 px se lea.
 *   - CARPETAS: carpeta sólida del color de su categoría con un EMBLEMA (</> en
 *     src, check en test, montaña en images, onda en sounds, pirámide en .git…).
 *   - Carpeta raíz: la pirámide invertida del Consejo (Plano Astral).
 * Guiños de lore: los .env son un documento clasificado (tachado), los tests
 * llevan el hexágono de la Hedron y los archivos de IA (CLAUDE.md, AGENTS.md,
 * *.prompt.md…) llevan al Consejo.
 *
 * Cada icono tiene dos variantes: temas oscuros y temas claros (CONTROL Astral).
 * Todo es original: no se usan logos de terceros.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'icons');
const SVG_DIR = path.join(OUT, 'svg');

/** Colores [tema oscuro, tema claro]. */
const C = {
  red: ['#E5675D', '#B3261E'],
  amber: ['#E6B04F', '#8A6100'],
  paper: ['#CDB68C', '#7A5A16'],
  steel: ['#79A9D1', '#1F5F99'],
  ice: ['#9CC2E6', '#2867A4'],
  cyan: ['#6FCFDC', '#1D6F73'],
  teal: ['#8FC1BE', '#2A6B66'],
  green: ['#86B57E', '#2A7334'],
  violet: ['#B79AE0', '#6A4A9E'],
  rose: ['#DDA9C8', '#8E3A7A'],
  orange: ['#E6904F', '#A84C0E'],
  bone: ['#D9D6CF', '#3A3936'],
  concrete: ['#8E8B85', '#5F5D57'],
  dim: ['#6E6C68', '#97948B'],
};
/** @typedef {keyof typeof C} ColorName */

/** Color «recortado» encima de las placas de color. */
const KNOCK = ['#121315', '#FFFFFF'];
const BOARD = { fill: ['#0D0E0F', '#151517'], stroke: ['#F2EFE8', '#151517'], line: ['#E0352B', '#C8261C'] };
const FONT = "font-family='Segoe UI, -apple-system, Helvetica Neue, Arial, sans-serif' font-weight='700' text-anchor='middle'";

const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Muesca de la franja de clasificación: luz astral (oscuro) o tinta (claro). */
const NOTCH = ['#F2EFE8', '#1A1A1C'];
const svg = (/** @type {string} */ body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>\n`;

/** Oscurece un color (mezcla con negro). */
function darken(/** @type {string} */ hex, /** @type {number} */ t) {
  const n = parseInt(hex.slice(1), 16);
  const f = (/** @type {number} */ v) => Math.round(v * (1 - t)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`.toUpperCase();
}

const stroke = (/** @type {string} */ k, w = 1.2) => `fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter"`;

// --- Pictogramas de archivo (dentro de la hoja; zona ≈ 3–13 × 4–12.6) -------------------

/** @type {Record<string, (k: string, c: string) => string>} */
const PICTO = {
  image: (k) => `<rect x="3.3" y="3.7" width="9" height="8.6" ${stroke(k, 1.1)}/><path d="M4.2 11.6 6.6 8.1l1.8 2.2 1.3-1.5 2.1 2.8z" fill="${k}"/><rect x="9.3" y="5.2" width="1.8" height="1.8" fill="${k}"/>`,
  audio: (k) => [2.4, 6, 8, 5.2, 2.8].map((h, i) => `<rect x="${3.2 + i * 1.9}" y="${8.5 - h / 2}" width="1.2" height="${h}" fill="${k}"/>`).join(''),
  video: (k) => `<path d="M5.4 4.8v7.4l6.2-3.7z" fill="${k}"/>`,
  database: (k, c) => `<path d="M3.6 5.2C3.6 4 5.6 3.4 7.8 3.4s4.2.6 4.2 1.8v6.6c0 1.2-2 1.8-4.2 1.8s-4.2-.6-4.2-1.8z" fill="${k}"/><path d="M3.6 8.4c0 1.1 2 1.7 4.2 1.7s4.2-.6 4.2-1.7" ${stroke(c, 0.9)}/>`,
  lock: (k) => `<rect x="4.2" y="7.4" width="7.4" height="5.4" fill="${k}"/><path d="M5.8 7.4V5.6a2.1 2.1 0 0 1 4.2 0v1.8" ${stroke(k, 1.3)}/>`,
  git: (k) => `<path d="M3.4 4h8.8L7.8 12.6z" fill="${k}"/>`,
  config: (k) => `<path d="M3.4 5h8.8M3.4 8.4h8.8M3.4 11.8h8.8" ${stroke(k, 1)} stroke-opacity=".55"/><rect x="9" y="3.8" width="2.4" height="2.4" fill="${k}"/><rect x="4.4" y="7.2" width="2.4" height="2.4" fill="${k}"/><rect x="7.4" y="10.6" width="2.4" height="2.4" fill="${k}"/>`,
  archive: (k, c) => `<rect x="3.4" y="4.2" width="8.8" height="8.4" fill="${k}"/><rect x="3.4" y="6.4" width="8.8" height="1" fill="${c}"/><rect x="7" y="6.4" width="1.6" height="2.4" fill="${c}"/>`,
  text: (k) => `<path d="M3.6 4.4h8M3.6 6.9h6M3.6 9.4h8M3.6 11.9h4.6" ${stroke(k, 1.2)}/>`,
  license: (k, c) => `<path d="M7.8 3.2l3.6 2v4l-3.6 2-3.6-2v-4z" fill="${k}"/><rect x="7" y="6.4" width="1.6" height="1.6" fill="${c}"/><path d="M5.6 10.4 4.8 13.2l1.6-.8 1 1.1M10 10.4l.8 2.8-1.6-.8" ${stroke(k, 1.1)}/>`,
  readme: (k) => `<path d="M6 3.3h3.6l2.6 2.6v3.6l-2.6 2.6H6L3.4 9.5V5.9z" ${stroke(k, 1.1)}/><rect x="7" y="7.1" width="1.6" height="3.4" fill="${k}"/><rect x="7" y="5" width="1.6" height="1.5" fill="${k}"/>`,
  changelog: (k) => `<rect x="3.4" y="4" width="1.6" height="1.6" fill="${k}"/><rect x="3.4" y="7.6" width="1.6" height="1.6" fill="${k}"/><rect x="3.4" y="11.2" width="1.6" height="1.6" fill="${k}"/><path d="M6.4 4.8h5.8M6.4 8.4h5.8M6.4 12h3.6" ${stroke(k, 1.2)}/>`,
  classified: (k) => `<rect x="3.2" y="3.6" width="6" height="1.8" fill="${k}"/><rect x="5.2" y="7" width="7.2" height="1.8" fill="${k}"/><rect x="3.2" y="10.4" width="7.6" height="1.8" fill="${k}"/>`,
  test: (k) => `<path d="M7.8 3.2l4.2 2.4v4.8l-4.2 2.4-4.2-2.4V5.6z" ${stroke(k, 1.2)}/><path d="M5.8 8.2l1.4 1.4 2.8-2.9" ${stroke(k, 1.3)}/>`,
  diff: (k) => `<path d="M5.6 3.6v4.6M3.3 5.9h4.6M8.4 11h4.4" ${stroke(k, 1.4)}/>`,
  grid: (k) => `<path d="M3.4 4h8.8v8.4H3.4zM3.4 6.8h8.8M3.4 9.6h8.8M6.4 4v8.4M9.3 4v8.4" ${stroke(k, 0.9)}/>`,
  cube: (k) => `<path d="M7.8 3.2l4.2 2.4v4.8l-4.2 2.4-4.2-2.4V5.6zM3.6 5.6l4.2 2.4 4.2-2.4M7.8 8v4.8" ${stroke(k, 1.1)}/>`,
  key: (k) => `<rect x="3.2" y="4.2" width="4.6" height="4.6" fill="${k}"/><path d="M7.4 8.2l4.6 4.6M10.2 11l1.4-1.4" ${stroke(k, 1.4)}/>`,
  docker: (k) => `<rect x="3.2" y="8" width="2.6" height="2.4" fill="${k}"/><rect x="6.4" y="8" width="2.6" height="2.4" fill="${k}"/><rect x="9.6" y="8" width="2.6" height="2.4" fill="${k}"/><rect x="6.4" y="5" width="2.6" height="2.4" fill="${k}"/><path d="M3 11.4h9.6l-1 1.4H4z" fill="${k}"/>`,
  board: (k) => `<rect x="4.4" y="3.6" width="6.8" height="1.4" fill="${k}"/><path d="M3.4 6.2h8.8l-4.4 6.6z" fill="${k}"/>`,
  terminal: (k) => `<path d="M3.8 5l2.8 2.6-2.8 2.6" ${stroke(k, 1.4)}/><rect x="7.6" y="10.4" width="4.6" height="1.5" fill="${k}"/>`,
  gear: (k, c) => `<path d="M7.8 3.4l4 2.3v4.6l-4 2.3-4-2.3V5.7z" fill="${k}"/><path d="M7.8 6.6l1.4.8v1.6l-1.4.8-1.4-.8V7.4z" fill="${c}"/>`,
  globe: (k) => `<path d="M5.8 3.4h4l2.8 2.8v4l-2.8 2.8h-4l-2.8-2.8v-4zM3 8.2h9.6M7.8 3.4v9.6" ${stroke(k, 1)}/>`,
  shield: (k) => `<path d="M7.8 3.2l4.4 1.6v3.6c0 2.2-1.8 3.6-4.4 4.6-2.6-1-4.4-2.4-4.4-4.6V4.8z" fill="${k}"/>`,
  workspace: (k) => `<path d="M3.4 4.2h8.8v8.2H3.4zM3.4 6.4h8.8M7 6.4v6" ${stroke(k, 1)}/>`,
};

// --- Emblemas de carpeta (abajo a la derecha; zona ≈ 8.2–14.6 × 7.6–13.4) ---------------

/** @type {Record<string, (k: string, c: string) => string>} */
const EMBLEM = {
  code: (k) => `<path d="M9.9 8.5 8.5 10.6l1.4 2.1M12.9 8.5l1.4 2.1-1.4 2.1" ${stroke(k, 1.2)}/>`,
  check: (k) => `<path d="M8.7 10.7l1.6 1.6 3.4-3.6" ${stroke(k, 1.4)}/>`,
  docs: (k) => `<path d="M8.7 8.6h5.2M8.7 10.5h5.2M8.7 12.4h3.2" ${stroke(k, 1.1)}/>`,
  image: (k) => `<path d="M8.4 13l2.2-3.2 1.5 1.8 1-1.2 1.6 2.6z" fill="${k}"/><rect x="12.4" y="7.9" width="1.5" height="1.5" fill="${k}"/>`,
  wave: (k) => [2.4, 5, 3.6, 1.8].map((h, i) => `<rect x="${8.6 + i * 1.5}" y="${10.6 - h / 2}" width="1" height="${h}" fill="${k}"/>`).join(''),
  play: (k) => `<path d="M9.8 8.2v5l4-2.5z" fill="${k}"/>`,
  pyramid: (k) => `<path d="M8.4 8.2h6l-3 5z" fill="${k}"/>`,
  gear: (k, c) => `<path d="M11.4 7.7l2.7 1.5v3l-2.7 1.5-2.7-1.5v-3z" fill="${k}"/><path d="M11.4 9.9l.8.5v.9l-.8.5-.8-.5v-.9z" fill="${c}"/>`,
  cube: (k) => `<path d="M11.4 7.9l2.7 1.5v3l-2.7 1.5-2.7-1.5v-3zM8.7 9.4l2.7 1.5 2.7-1.5M11.4 10.9v2.9" ${stroke(k, 0.9)}/>`,
  box: (k, c) => `<rect x="8.6" y="8.4" width="5.8" height="4.8" fill="${k}"/><rect x="8.6" y="9.7" width="5.8" height=".8" fill="${c}"/>`,
  blocks: (k) => `<rect x="8.7" y="8.1" width="2.4" height="2.4" fill="${k}"/><rect x="11.8" y="8.1" width="2.4" height="2.4" fill="${k}"/><rect x="8.7" y="11.1" width="2.4" height="2.4" fill="${k}"/><rect x="11.8" y="11.1" width="2.4" height="2.4" fill="${k}"/>`,
  sliders: (k) => `<path d="M8.6 8.8h5.8M8.6 10.8h5.8M8.6 12.8h5.8" ${stroke(k, 0.8)} stroke-opacity=".6"/><rect x="12" y="8" width="1.6" height="1.6" fill="${k}"/><rect x="9.2" y="10" width="1.6" height="1.6" fill="${k}"/><rect x="10.8" y="12" width="1.6" height="1.6" fill="${k}"/>`,
  globe: (k) => `<path d="M10.2 8h2.4l1.7 1.7v2.4l-1.7 1.7h-2.4l-1.7-1.7V9.7zM8.5 10.9h5.8M11.4 8v5.8" ${stroke(k, 0.9)}/>`,
  star: (k) => `<path d="M11.4 7.8l.9 2 2.1.2-1.6 1.4.5 2.1-1.9-1.1-1.9 1.1.5-2.1-1.6-1.4 2.1-.2z" fill="${k}"/>`,
  database: (k) => `<path d="M8.8 8.8c0-.7 1.2-1.1 2.6-1.1s2.6.4 2.6 1.1v3.6c0 .7-1.2 1.1-2.6 1.1s-2.6-.4-2.6-1.1z" fill="${k}"/>`,
  plug: (k) => `<rect x="9.2" y="9.6" width="4.4" height="2.4" fill="${k}"/><rect x="9.8" y="7.8" width="1" height="1.8" fill="${k}"/><rect x="12" y="7.8" width="1" height="1.8" fill="${k}"/><rect x="10.9" y="12" width="1" height="1.6" fill="${k}"/>`,
  wrench: (k) => `<path d="M8.9 13.1l3.4-3.4" ${stroke(k, 1.4)}/><path d="M12 7.8h2.3v2.3l-.9.9h-2.3V8.7z" fill="${k}"/>`,
  bolt: (k) => `<path d="M11.9 7.6 9.2 11.1h1.9l-.6 2.5 3.1-3.8h-2z" fill="${k}"/>`,
  shield: (k) => `<path d="M11.4 7.7l2.8 1v2.2c0 1.4-1.1 2.3-2.8 2.9-1.7-.6-2.8-1.5-2.8-2.9V8.7z" fill="${k}"/>`,
  person: (k) => `<rect x="10.4" y="7.8" width="2" height="2" fill="${k}"/><path d="M8.8 13.4l.6-2.6h4l.6 2.6z" fill="${k}"/>`,
  window: (k) => `<path d="M8.7 8.3h5.6v4.9H8.7zM8.7 9.9h5.6" ${stroke(k, 1)}/>`,
  diamond: (k) => `<path d="M11.4 7.8l2.8 2.8-2.8 2.8-2.8-2.8z" ${stroke(k, 1.1)}/>`,
  clock: (k) => `<path d="M10.2 8h2.4l1.7 1.7v2.4l-1.7 1.7h-2.4l-1.7-1.7V9.7zM11.4 9.2v1.8h1.3" ${stroke(k, 0.9)}/>`,
  flask: (k) => `<path d="M10.4 7.8h2v2l1.8 3.4H8.6l1.8-3.4z" fill="${k}"/>`,
  board: (k) => `<rect x="9.2" y="7.7" width="4.4" height="1" fill="${k}"/><path d="M8.5 9.4h5.8l-2.9 4.2z" fill="${k}"/>`,
  loop: (k) => `<path d="M9 12.8V9h4.4M13.8 9.4v3.8H9.4" ${stroke(k, 1.1)}/><path d="M12.6 7.6l1.6 1.4-1.6 1.4zM10.2 14.6l-1.6-1.4 1.6-1.4z" fill="${k}"/>`,
  phone: (k) => `<path d="M9.6 7.8h3.6v5.6H9.6z" ${stroke(k, 1)}/><rect x="10.9" y="11.6" width="1" height="1" fill="${k}"/>`,
  font: (k) => `<path d="M8.8 13.4l2.6-5.6 2.6 5.6M9.8 11.6h3.2" ${stroke(k, 1.1)}/>`,
  arrow: (k) => `<path d="M8.6 10.6h5M12 8.8l1.8 1.8-1.8 1.8" ${stroke(k, 1.2)}/>`,
  layers: (k) => `<path d="M8.6 9.2h5.6M9.2 11h5.2M8.6 12.8h5.6" ${stroke(k, 1.2)}/>`,
  target: (k) => `<path d="M8.7 8.1h5.4v5.4H8.7z" ${stroke(k, 1)}/><rect x="10.7" y="10.1" width="1.4" height="1.4" fill="${k}"/>`,
  key: (k) => `<rect x="8.6" y="8" width="2.6" height="2.6" fill="${k}"/><path d="M10.8 10.4l3 3" ${stroke(k, 1.2)}/>`,
  palette: (k) => `<path d="M11.4 7.7l2.6 3.2c0 1.6-1.2 2.6-2.6 2.6s-2.6-1-2.6-2.6z" fill="${k}"/>`,
  terminal: (k) => `<path d="M8.8 8.6l1.8 1.8-1.8 1.8" ${stroke(k, 1.2)}/><rect x="11.4" y="12.2" width="2.8" height="1.1" fill="${k}"/>`,
  container: (k) => `<rect x="8.6" y="10.2" width="1.7" height="1.6" fill="${k}"/><rect x="10.6" y="10.2" width="1.7" height="1.6" fill="${k}"/><rect x="12.6" y="10.2" width="1.7" height="1.6" fill="${k}"/><rect x="10.6" y="8.2" width="1.7" height="1.6" fill="${k}"/><path d="M8.4 12.3h6.2l-.6 1H9z" fill="${k}"/>`,
};

// --- Plantillas ---------------------------------------------------------------------------

/** Hoja de expediente con etiqueta o pictograma. */
function fileIcon(/** @type {Spec} */ spec, /** @type {number} */ v) {
  const c = C[spec.color][v];
  // Franja de clasificación con la muesca de luz astral, en píxeles enteros
  // para que a 16 px quede nítida.
  const band = `<rect x="2" y="13" width="12" height="2" fill="${c}" fill-opacity=".85"/><rect x="2" y="13" width="3" height="2" fill="${NOTCH[v]}"/>`;
  if (spec.kind === 'picto') {
    // El pictograma, algo más grande y por encima de la franja. Se dibuja como
    // máscara para que sus recortes queden transparentes sobre cualquier fondo.
    const shape = PICTO[spec.value]('#fff', '#000');
    return svg(`<mask id="p"><g transform="translate(8 6.7) scale(1.2) translate(-7.85 -8.1)">${shape}</g></mask><rect width="16" height="12.6" fill="${c}" mask="url(#p)"/>${band}`);
  }
  const n = [...spec.value].length;
  const size = n === 1 ? 11 : n === 2 ? 8.8 : 6.8;
  const y = n === 1 ? 11.5 : n === 2 ? 10.9 : 10.2;
  return svg(`<text x="8" y="${y}" font-size="${size}" ${FONT} letter-spacing="${n > 2 ? -0.5 : -0.3}" fill="${c}">${esc(spec.value)}</text>${band}`);
}

/** Carpeta sólida con emblema. */
function folderIcon(/** @type {ColorName} */ color, /** @type {string | null} */ emblem, /** @type {boolean} */ open, /** @type {number} */ v) {
  const body = C[color][v];
  const back = darken(body, v === 0 ? 0.38 : 0.3);
  const k = KNOCK[v];
  let s = `<path d="M1 3h5.3l1.5 1.6H15v1.6H1z" fill="${back}"/>`;
  s += open ? `<path d="M1 6.2h14v1.2H1z" fill="${back}"/><path d="M2.7 7.6h12.9L13.9 14H1z" fill="${body}"/>` : `<path d="M1 6.2h14V14H1z" fill="${body}"/>`;
  if (emblem) s += EMBLEM[emblem](k, body);
  return svg(s);
}

/** Carpeta raíz: la pirámide invertida del Consejo, flotando en el Plano Astral. */
function board(/** @type {boolean} */ open, /** @type {number} */ v) {
  const tri = `<path d="M1.8 2.6h12.4L8 13.6z" fill="${BOARD.fill[v]}" stroke="${BOARD.stroke[v]}" stroke-linejoin="round"/>`;
  const line = `<path d="M3.6 4.4h8.8" stroke="${BOARD.line[v]}" stroke-width="1.2"/>`;
  const glow = open ? `<path d="M6 6.8h4L8 10.4z" fill="${BOARD.stroke[v]}" fill-opacity=".85"/>` : '';
  return svg(`${tri}${line}${glow}`);
}

// --- Catálogo -------------------------------------------------------------------------------

/** @typedef {{kind: 'label' | 'picto', value: string, color: ColorName}} Spec */
const L = (/** @type {string} */ value, /** @type {ColorName} */ color) => /** @type {Spec} */ ({ kind: 'label', value, color });
const P = (/** @type {keyof typeof PICTO} */ value, /** @type {ColorName} */ color) => /** @type {Spec} */ ({ kind: 'picto', value, color });

const DEFAULT_FILE = P('text', 'concrete');

/** Especificaciones con nombre (se reutilizan en extensiones, nombres y languageIds). */
const S = {
  ts: L('TS', 'steel'), dts: L('TS', 'concrete'), tsx: L('TX', 'steel'), js: L('JS', 'amber'), jsx: L('JX', 'amber'),
  json: L('{}', 'paper'), cs: L('C#', 'violet'), vb: L('VB', 'violet'), fs: L('F#', 'cyan'), razor: L('@', 'violet'), xaml: L('XA', 'ice'),
  c: L('C', 'steel'), cpp: L('C+', 'steel'), h: L('H', 'violet'), objc: L('OC', 'ice'), java: L('JV', 'red'), kotlin: L('KT', 'violet'),
  scala: L('SC', 'red'), groovy: L('GV', 'teal'), go: L('GO', 'cyan'), rust: L('RS', 'orange'), py: L('PY', 'ice'), nb: L('NB', 'amber'),
  ruby: L('RB', 'red'), php: L('PH', 'violet'), swift: L('SW', 'orange'), dart: L('DT', 'cyan'), lua: L('LU', 'steel'), r: L('R', 'ice'),
  julia: L('JL', 'violet'), elixir: L('EX', 'violet'), erlang: L('ER', 'red'), haskell: L('HS', 'violet'), clojure: L('CL', 'green'),
  elm: L('EL', 'cyan'), ocaml: L('ML', 'orange'), nim: L('NI', 'amber'), zig: L('ZG', 'amber'), vlang: L('V', 'steel'), solidity: L('SO', 'concrete'),
  asm: L('AS', 'concrete'), perl: L('PL', 'steel'), coffee: L('CF', 'paper'), haxe: L('HX', 'orange'), dlang: L('D', 'red'), crystal: L('CR', 'bone'),
  nix: L('NX', 'ice'), gdscript: L('GD', 'steel'), terraform: L('TF', 'violet'), powershell: L('>_', 'steel'), shell: L('$_', 'green'),
  bat: L('>_', 'concrete'), sql: P('database', 'amber'), graphql: L('GQ', 'rose'), proto: L('PB', 'teal'), wasm: L('WA', 'violet'),
  vue: L('V', 'green'), svelte: L('SV', 'orange'), astro: L('AT', 'orange'), html: L('<>', 'red'), css: L('#', 'teal'), scss: L('S', 'rose'),
  less: L('L', 'ice'), stylus: L('ST', 'green'), pug: L('PG', 'bone'), handlebars: L('HB', 'amber'), ejs: L('EJ', 'paper'), twig: L('TW', 'green'),
  liquid: L('LQ', 'teal'), jinja: L('JN', 'red'), md: L('MD', 'bone'), mdx: L('MX', 'amber'), rst: L('RT', 'bone'), adoc: L('AD', 'red'),
  tex: L('TEX', 'teal'), text: P('text', 'concrete'), log: P('text', 'paper'), xml: L('</>', 'orange'), svg: L('SVG', 'amber'), yaml: L('Y', 'rose'),
  config: P('config', 'concrete'), csv: P('grid', 'green'), sheet: L('X', 'green'), doc: L('W', 'steel'), slides: L('P', 'orange'), pdf: L('PDF', 'red'),
  epub: L('EP', 'paper'), image: P('image', 'green'), audio: P('audio', 'rose'), video: P('video', 'rose'), font: L('Aa', 'bone'),
  archive: P('archive', 'concrete'), jar: P('archive', 'orange'), apk: P('archive', 'green'), ipa: P('archive', 'steel'), installer: P('archive', 'dim'),
  binary: L('01', 'dim'), nupkg: P('archive', 'violet'), vsix: P('archive', 'red'), whl: P('archive', 'ice'), key: P('key', 'amber'), signature: P('key', 'green'),
  lock: P('lock', 'dim'), diff: P('diff', 'green'), db: P('database', 'paper'), env: P('classified', 'amber'), license: P('license', 'amber'),
  readme: P('readme', 'steel'), changelog: P('changelog', 'teal'), contributing: P('changelog', 'green'), conduct: P('changelog', 'violet'),
  security: P('shield', 'red'), todo: P('changelog', 'amber'), test: P('test', 'cyan'), ai: P('board', 'red'), docker: P('docker', 'ice'),
  git: P('git', 'orange'), npm: P('cube', 'red'), project: P('cube', 'violet'), dotnetConfig: P('config', 'violet'), npmConfig: P('config', 'red'),
  tsconfig: P('config', 'steel'), jsconfig: P('config', 'amber'), vite: L('VT', 'violet'), webpack: L('WP', 'ice'), rollup: L('RL', 'red'),
  babel: L('BB', 'amber'), eslint: L('ES', 'violet'), prettier: L('PR', 'teal'), stylelint: L('SL', 'bone'), jest: L('JE', 'red'),
  vitest: L('VI', 'green'), playwright: L('PW', 'green'), cypress: L('CY', 'concrete'), tailwind: L('TW', 'cyan'), postcss: L('PC', 'red'),
  next: L('NX', 'bone'), nuxt: L('NU', 'green'), angular: L('NG', 'red'), nest: L('NE', 'red'), turbo: L('TB', 'rose'), vercel: L('VC', 'bone'),
  netlify: L('NT', 'teal'), firebase: L('FB', 'amber'), make: L('MK', 'orange'), cmake: L('CM', 'teal'), bazel: L('BZ', 'green'),
  gradle: L('GR', 'teal'), maven: L('MV', 'red'), cargo: P('config', 'orange'), gomod: P('config', 'cyan'), pyconfig: P('config', 'ice'),
  requirements: P('changelog', 'ice'), gemfile: L('RB', 'red'), composer: L('CP', 'paper'), podfile: L('PD', 'red'), pubspec: L('DT', 'cyan'),
  procfile: L('PF', 'violet'), jenkins: L('JK', 'red'), ci: L('CI', 'orange'), prisma: L('PS', 'violet'), http: L('HT', 'green'),
  workspace: P('workspace', 'steel'), shellrc: L('$_', 'green'), favicon: P('image', 'red'), robots: P('text', 'green'), webConfig: P('config', 'steel'),
  nginx: L('NG', 'green'), editorconfig: P('config', 'bone'), browserslist: P('config', 'amber'), dotnetTool: P('cube', 'violet'),
};

/** Extensiones (sin punto; también vale «test.ts», «d.ts», «prompt.md»…). */
const EXTENSIONS = {
  ts: S.ts, mts: S.ts, cts: S.ts, 'd.ts': S.dts, 'd.mts': S.dts, 'd.cts': S.dts, tsx: S.tsx, js: S.js, mjs: S.js, cjs: S.js, jsx: S.jsx,
  json: S.json, jsonc: S.json, json5: S.json, jsonl: S.json, ndjson: S.json, geojson: S.json, webmanifest: S.json, har: S.json,
  cs: S.cs, csx: S.cs, vb: S.vb, vbs: S.vb, fs: S.fs, fsx: S.fs, fsi: S.fs, cshtml: S.razor, razor: S.razor, vbhtml: S.razor, xaml: S.xaml, axaml: S.xaml,
  csproj: S.project, fsproj: S.project, vbproj: S.project, sln: S.project, slnx: S.project, props: S.dotnetConfig, targets: S.dotnetConfig,
  c: S.c, cpp: S.cpp, cc: S.cpp, cxx: S.cpp, 'c++': S.cpp, ino: S.cpp, h: S.h, hpp: S.h, hh: S.h, hxx: S.h, inl: S.h, m: S.objc, mm: S.objc,
  java: S.java, kt: S.kotlin, kts: S.kotlin, scala: S.scala, sc: S.scala, sbt: S.scala, groovy: S.groovy, gvy: S.groovy, go: S.go, rs: S.rust,
  py: S.py, pyi: S.py, pyw: S.py, pyx: S.py, ipynb: S.nb, rb: S.ruby, erb: S.ruby, rake: S.ruby, gemspec: S.ruby, php: S.php, phtml: S.php,
  swift: S.swift, dart: S.dart, lua: S.lua, luau: S.lua, r: S.r, rmd: S.r, jl: S.julia, ex: S.elixir, exs: S.elixir, heex: S.elixir, erl: S.erlang,
  hrl: S.erlang, hs: S.haskell, lhs: S.haskell, clj: S.clojure, cljs: S.clojure, cljc: S.clojure, edn: S.clojure, elm: S.elm, ml: S.ocaml, mli: S.ocaml,
  nim: S.nim, zig: S.zig, v: S.vlang, sol: S.solidity, asm: S.asm, s: S.asm, nasm: S.asm, pl: S.perl, pm: S.perl, coffee: S.coffee, hx: S.haxe,
  d: S.dlang, cr: S.crystal, nix: S.nix, gd: S.gdscript, tf: S.terraform, tfvars: S.terraform, hcl: S.terraform, ps1: S.powershell, psm1: S.powershell,
  psd1: S.powershell, sh: S.shell, bash: S.shell, zsh: S.shell, fish: S.shell, ksh: S.shell, bat: S.bat, cmd: S.bat, sql: S.sql, psql: S.sql,
  mysql: S.sql, pgsql: S.sql, graphql: S.graphql, gql: S.graphql, proto: S.proto, wasm: S.wasm, wat: S.wasm, vue: S.vue, svelte: S.svelte,
  astro: S.astro, html: S.html, htm: S.html, xhtml: S.html, css: S.css, pcss: S.css, scss: S.scss, sass: S.scss, less: S.less, styl: S.stylus,
  pug: S.pug, jade: S.pug, hbs: S.handlebars, handlebars: S.handlebars, mustache: S.handlebars, ejs: S.ejs, twig: S.twig, liquid: S.liquid,
  njk: S.jinja, jinja: S.jinja, jinja2: S.jinja, j2: S.jinja, md: S.md, markdown: S.md, mdc: S.ai, mdx: S.mdx, rst: S.rst, adoc: S.adoc, asciidoc: S.adoc,
  tex: S.tex, latex: S.tex, bib: S.tex, cls: S.tex, sty: S.tex, txt: S.text, text: S.text, log: S.log, out: S.log,
  xml: S.xml, xsd: S.xml, xsl: S.xml, xslt: S.xml, plist: S.xml, resx: S.xml, config: S.xml, manifest: S.xml, svg: S.svg,
  yaml: S.yaml, yml: S.yaml, toml: S.config, ini: S.config, cfg: S.config, conf: S.config, properties: S.config, env: S.env,
  csv: S.csv, tsv: S.csv, psv: S.csv, xlsx: S.sheet, xls: S.sheet, xlsm: S.sheet, ods: S.sheet, numbers: S.sheet, docx: S.doc, doc: S.doc,
  odt: S.doc, rtf: S.doc, pages: S.doc, pptx: S.slides, ppt: S.slides, odp: S.slides, key: S.key, pdf: S.pdf, epub: S.epub, mobi: S.epub,
  png: S.image, jpg: S.image, jpeg: S.image, gif: S.image, webp: S.image, bmp: S.image, ico: S.image, icns: S.image, tif: S.image, tiff: S.image,
  avif: S.image, heic: S.image, psd: S.image, ai: S.image, xcf: S.image, fig: S.image, sketch: S.image, raw: S.image, cur: S.image,
  wav: S.audio, mp3: S.audio, ogg: S.audio, flac: S.audio, m4a: S.audio, aac: S.audio, opus: S.audio, mid: S.audio, midi: S.audio, aiff: S.audio,
  mp4: S.video, webm: S.video, mov: S.video, mkv: S.video, avi: S.video, wmv: S.video, flv: S.video, m4v: S.video,
  ttf: S.font, otf: S.font, woff: S.font, woff2: S.font, eot: S.font,
  zip: S.archive, tar: S.archive, gz: S.archive, tgz: S.archive, bz2: S.archive, xz: S.archive, '7z': S.archive, rar: S.archive, zst: S.archive,
  jar: S.jar, war: S.jar, ear: S.jar, apk: S.apk, aab: S.apk, ipa: S.ipa, deb: S.installer, rpm: S.installer, pkg: S.installer, dmg: S.installer,
  iso: S.installer, msi: S.installer, exe: S.installer, appimage: S.installer, snap: S.installer, dll: S.binary, so: S.binary, dylib: S.binary,
  lib: S.binary, a: S.binary, o: S.binary, obj: S.binary, pdb: S.binary, class: S.binary, pyc: S.binary, bin: S.binary, nupkg: S.nupkg,
  vsix: S.vsix, whl: S.whl, pem: S.key, crt: S.key, cer: S.key, der: S.key, pub: S.key, p12: S.key, pfx: S.key, jks: S.key, keystore: S.key,
  csr: S.key, asc: S.signature, gpg: S.signature, sig: S.signature, lock: S.lock, diff: S.diff, patch: S.diff, rej: S.diff,
  sqlite: S.db, sqlite3: S.db, db: S.db, mdb: S.db, accdb: S.db, prisma: S.prisma, http: S.http, rest: S.http, 'code-workspace': S.workspace,
  cmake: S.cmake, gradle: S.gradle, bazel: S.bazel, bzl: S.bazel,
  'test.ts': S.test, 'spec.ts': S.test, 'test.tsx': S.test, 'spec.tsx': S.test, 'test.js': S.test, 'spec.js': S.test, 'test.jsx': S.test,
  'spec.jsx': S.test, 'test.mjs': S.test, 'test.cjs': S.test, 'e2e.ts': S.test, 'e2e.js': S.test, 'cy.ts': S.test, 'cy.js': S.test,
  'tests.cs': S.test, 'test.cs': S.test, 'spec.rb': S.test, 'test.py': S.test,
  'prompt.md': S.ai, 'instructions.md': S.ai, 'agent.md': S.ai, 'chatmode.md': S.ai, 'prompt.yml': S.ai,
};

/** Nombres de archivo exactos (en minúsculas). */
const FILE_NAMES = {
  'package.json': S.npm, 'package-lock.json': S.lock, 'npm-shrinkwrap.json': S.lock, 'yarn.lock': S.lock, 'pnpm-lock.yaml': S.lock,
  'bun.lockb': S.lock, 'bun.lock': S.lock, 'cargo.lock': S.lock, 'composer.lock': S.lock, 'gemfile.lock': S.lock, 'poetry.lock': S.lock,
  'pipfile.lock': S.lock, 'packages.lock.json': S.lock, 'go.sum': S.lock, 'flake.lock': S.lock, 'mix.lock': S.lock, 'pubspec.lock': S.lock,
  '.npmrc': S.npmConfig, '.yarnrc': S.npmConfig, '.yarnrc.yml': S.npmConfig, '.npmignore': S.npmConfig, '.nvmrc': S.npmConfig, '.node-version': S.npmConfig,
  'pnpm-workspace.yaml': S.npmConfig, license: S.license, 'license.md': S.license, 'license.txt': S.license, licence: S.license, copying: S.license,
  notice: S.license, 'notice.md': S.license, 'readme.md': S.readme, readme: S.readme, 'readme.txt': S.readme, 'changelog.md': S.changelog,
  changelog: S.changelog, 'history.md': S.changelog, 'changes.md': S.changelog, 'contributing.md': S.contributing, 'code_of_conduct.md': S.conduct,
  'security.md': S.security, 'todo.md': S.todo, todo: S.todo, 'claude.md': S.ai, 'agents.md': S.ai, 'gemini.md': S.ai, '.cursorrules': S.ai,
  '.windsurfrules': S.ai, 'copilot-instructions.md': S.ai, 'llms.txt': S.ai,
  '.gitignore': S.git, '.gitattributes': S.git, '.gitmodules': S.git, '.gitkeep': S.git, '.mailmap': S.git, '.git-blame-ignore-revs': S.git,
  '.env': S.env, '.env.local': S.env, '.env.development': S.env, '.env.production': S.env, '.env.test': S.env, '.env.example': S.env,
  '.env.sample': S.env, '.env.staging': S.env, '.envrc': S.env, dockerfile: S.docker, containerfile: S.docker, 'docker-compose.yml': S.docker,
  'docker-compose.yaml': S.docker, 'compose.yml': S.docker, 'compose.yaml': S.docker, '.dockerignore': S.docker,
  'tsconfig.json': S.tsconfig, 'jsconfig.json': S.jsconfig, '.editorconfig': S.editorconfig, '.browserslistrc': S.browserslist, browserslist: S.browserslist,
  '.babelrc': S.babel, '.babelrc.json': S.babel, '.eslintrc': S.eslint, '.eslintrc.json': S.eslint, '.eslintrc.js': S.eslint, '.eslintrc.cjs': S.eslint,
  '.eslintrc.yml': S.eslint, '.eslintignore': S.eslint, '.prettierrc': S.prettier, '.prettierrc.json': S.prettier, '.prettierrc.yml': S.prettier,
  '.prettierignore': S.prettier, '.stylelintrc': S.stylelint, '.stylelintrc.json': S.stylelint, 'angular.json': S.angular, 'nest-cli.json': S.nest,
  'turbo.json': S.turbo, 'vercel.json': S.vercel, 'netlify.toml': S.netlify, 'firebase.json': S.firebase, '.firebaserc': S.firebase,
  makefile: S.make, gnumakefile: S.make, 'cmakelists.txt': S.cmake, 'meson.build': S.make, build: S.bazel, 'build.bazel': S.bazel,
  workspace: S.bazel, 'module.bazel': S.bazel, 'build.gradle': S.gradle, 'build.gradle.kts': S.gradle, 'settings.gradle': S.gradle,
  'settings.gradle.kts': S.gradle, gradlew: S.gradle, 'gradle.properties': S.gradle, 'pom.xml': S.maven, 'cargo.toml': S.cargo, 'go.mod': S.gomod,
  'go.work': S.gomod, 'requirements.txt': S.requirements, 'requirements-dev.txt': S.requirements, 'pyproject.toml': S.pyconfig, 'setup.py': S.pyconfig,
  'setup.cfg': S.pyconfig, pipfile: S.pyconfig, 'tox.ini': S.pyconfig, '.python-version': S.pyconfig, gemfile: S.gemfile, rakefile: S.gemfile,
  'composer.json': S.composer, podfile: S.podfile, 'pubspec.yaml': S.pubspec, procfile: S.procfile, jenkinsfile: S.jenkins, '.travis.yml': S.ci,
  '.gitlab-ci.yml': S.ci, 'azure-pipelines.yml': S.ci, 'appveyor.yml': S.ci, 'bitbucket-pipelines.yml': S.ci, '.drone.yml': S.ci,
  'global.json': S.dotnetConfig, 'nuget.config': S.dotnetConfig, 'directory.build.props': S.dotnetConfig, 'directory.build.targets': S.dotnetConfig,
  'directory.packages.props': S.dotnetConfig, 'launchsettings.json': S.dotnetConfig, 'appsettings.json': S.dotnetConfig,
  'appsettings.development.json': S.dotnetConfig, 'appsettings.production.json': S.dotnetConfig, 'dotnet-tools.json': S.dotnetTool,
  'web.config': S.webConfig, '.vscodeignore': S.config, '.bashrc': S.shellrc, '.zshrc': S.shellrc, '.profile': S.shellrc, '.bash_profile': S.shellrc,
  'favicon.ico': S.favicon, 'robots.txt': S.robots, 'nginx.conf': S.nginx, '.htaccess': S.config, 'manifest.json': S.config,
};

/** Archivos de configuración de herramientas que admiten varias extensiones (vite.config.ts, .js, .mjs…). */
const TOOL_CONFIGS = {
  vite: S.vite, vitest: S.vitest, webpack: S.webpack, rollup: S.rollup, babel: S.babel, 'eslint': S.eslint, prettier: S.prettier, jest: S.jest,
  playwright: S.playwright, cypress: S.cypress, tailwind: S.tailwind, postcss: S.postcss, next: S.next, nuxt: S.nuxt, svelte: S.svelte, astro: S.astro,
  stylelint: S.stylelint, turbo: S.turbo,
};
for (const [tool, spec] of Object.entries(TOOL_CONFIGS)) {
  for (const ext of ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'json']) /** @type {any} */ (FILE_NAMES)[`${tool}.config.${ext}`] = spec;
}

const LANGUAGE_IDS = {
  typescript: S.ts, typescriptreact: S.tsx, javascript: S.js, javascriptreact: S.jsx, json: S.json, jsonc: S.json, jsonl: S.json, csharp: S.cs,
  vb: S.vb, fsharp: S.fs, razor: S.razor, aspnetcorerazor: S.razor, html: S.html, css: S.css, scss: S.scss, sass: S.scss, less: S.less,
  markdown: S.md, mdx: S.mdx, python: S.py, sql: S.sql, xml: S.xml, xsl: S.xml, yaml: S.yaml, toml: S.config, ini: S.config, properties: S.config,
  shellscript: S.shell, powershell: S.powershell, bat: S.bat, plaintext: S.text, log: S.log, ignore: S.git, dockerfile: S.docker,
  dockercompose: S.docker, diff: S.diff, go: S.go, rust: S.rust, java: S.java, kotlin: S.kotlin, scala: S.scala, groovy: S.groovy, c: S.c,
  cpp: S.cpp, 'objective-c': S.objc, 'objective-cpp': S.objc, php: S.php, ruby: S.ruby, swift: S.swift, dart: S.dart, lua: S.lua, r: S.r,
  julia: S.julia, elixir: S.elixir, erlang: S.erlang, haskell: S.haskell, clojure: S.clojure, perl: S.perl, coffeescript: S.coffee,
  terraform: S.terraform, graphql: S.graphql, proto3: S.proto, vue: S.vue, svelte: S.svelte, astro: S.astro, pug: S.pug, handlebars: S.handlebars,
  twig: S.twig, latex: S.tex, bibtex: S.tex, makefile: S.make, cmake: S.cmake, prisma: S.prisma, http: S.http, dotenv: S.env, 'git-commit': S.git,
  'git-rebase': S.git, 'code-workspace': S.workspace, jupyter: S.nb, csv: S.csv, tsv: S.csv, prompt: S.ai, instructions: S.ai, chatagent: S.ai,
};

// --- Carpetas: nombre → [color, emblema] -------------------------------------------------------

/** @type {Record<string, [ColorName, keyof typeof EMBLEM]>} */
const FOLDER_KINDS = {
  source: ['red', 'code'], test: ['cyan', 'check'], docs: ['bone', 'docs'], images: ['green', 'image'], assets: ['green', 'star'],
  audio: ['rose', 'wave'], video: ['rose', 'play'], git: ['orange', 'pyramid'], ci: ['orange', 'loop'], vscode: ['steel', 'gear'],
  ide: ['violet', 'gear'], packages: ['violet', 'cube'], modules: ['dim', 'cube'], build: ['dim', 'box'], components: ['steel', 'blocks'],
  config: ['concrete', 'sliders'], i18n: ['teal', 'globe'], data: ['paper', 'database'], api: ['orange', 'plug'], utils: ['concrete', 'wrench'],
  hooks: ['amber', 'bolt'], security: ['red', 'shield'], users: ['ice', 'person'], views: ['ice', 'window'], types: ['violet', 'diamond'],
  temp: ['dim', 'clock'], logs: ['paper', 'docs'], mocks: ['teal', 'flask'], ai: ['red', 'board'], mobile: ['green', 'phone'], fonts: ['bone', 'font'],
  migrations: ['paper', 'arrow'], middleware: ['teal', 'layers'], services: ['violet', 'layers'], coverage: ['green', 'target'],
  secrets: ['amber', 'key'], styles: ['rose', 'palette'], scripts: ['amber', 'terminal'], infra: ['ice', 'container'], store: ['paper', 'database'],
};

const FOLDER_NAMES = /** @type {Record<string, keyof typeof FOLDER_KINDS>} */ ({
  src: 'source', source: 'source', sources: 'source', app: 'source', apps: 'source', lib: 'source', libs: 'source', core: 'source', main: 'source',
  test: 'test', tests: 'test', __tests__: 'test', spec: 'test', specs: 'test', e2e: 'test', integration: 'test', unit: 'test', cypress: 'test',
  playwright: 'test', 'test-workspace': 'test', testing: 'test',
  docs: 'docs', doc: 'docs', documentation: 'docs', wiki: 'docs', guides: 'docs', notes: 'docs', references: 'docs', manual: 'docs',
  images: 'images', image: 'images', img: 'images', imgs: 'images', icons: 'images', icon: 'images', pictures: 'images', photos: 'images',
  screenshots: 'images', sprites: 'images', graphics: 'images', media: 'images',
  assets: 'assets', asset: 'assets', public: 'assets', static: 'assets', resources: 'assets', res: 'assets', www: 'assets', wwwroot: 'assets',
  sounds: 'audio', sound: 'audio', audio: 'audio', music: 'audio', sfx: 'audio', video: 'video', videos: 'video', movies: 'video',
  '.git': 'git', '.github': 'git', '.gitlab': 'git', '.husky': 'git', '.githooks': 'git', githooks: 'git',
  workflows: 'ci', '.circleci': 'ci', ci: 'ci', pipelines: 'ci', '.azure-pipelines': 'ci', '.buildkite': 'ci',
  '.vscode': 'vscode', '.vscode-test': 'vscode', '.idea': 'ide', '.vs': 'ide', '.fleet': 'ide', '.devcontainer': 'infra',
  packages: 'packages', package: 'packages', plugins: 'packages', plugin: 'packages', extensions: 'packages', addons: 'packages',
  vendor: 'packages', third_party: 'packages', 'third-party': 'packages', external: 'packages', node_modules: 'modules', bower_components: 'modules',
  '.yarn': 'modules', '.pnpm-store': 'modules', jspm_packages: 'modules',
  dist: 'build', out: 'build', build: 'build', builds: 'build', release: 'build', releases: 'build', target: 'build', bin: 'build', obj: 'build',
  publish: 'build', artifacts: 'build', '.next': 'build', '.nuxt': 'build', '.output': 'build', '.svelte-kit': 'build', '.vercel': 'build',
  components: 'components', component: 'components', widgets: 'components', ui: 'components', elements: 'components', blocks: 'components',
  config: 'config', configs: 'config', configuration: 'config', settings: 'config', '.config': 'config', env: 'config', environments: 'config',
  i18n: 'i18n', l10n: 'i18n', locales: 'i18n', locale: 'i18n', lang: 'i18n', langs: 'i18n', languages: 'i18n', translations: 'i18n', intl: 'i18n',
  data: 'data', db: 'data', database: 'data', databases: 'data', sql: 'data', seeds: 'migrations', seeders: 'migrations', migrations: 'migrations',
  store: 'store', stores: 'store', state: 'store', redux: 'store', context: 'store', contexts: 'store',
  api: 'api', apis: 'api', server: 'api', backend: 'api', routes: 'api', router: 'api', routers: 'api', endpoints: 'api', controllers: 'api', handlers: 'api',
  utils: 'utils', util: 'utils', utilities: 'utils', helpers: 'utils', helper: 'utils', common: 'utils', shared: 'utils', tools: 'utils', misc: 'utils',
  hooks: 'hooks', events: 'hooks', listeners: 'hooks', signals: 'hooks', triggers: 'hooks',
  auth: 'security', security: 'security', guards: 'security', permissions: 'security', policies: 'security',
  users: 'users', user: 'users', accounts: 'users', profiles: 'users', people: 'users',
  views: 'views', view: 'views', pages: 'views', page: 'views', screens: 'views', layouts: 'views', layout: 'views', templates: 'views',
  partials: 'views', routes_ui: 'views',
  types: 'types', typings: 'types', '@types': 'types', interfaces: 'types', models: 'types', model: 'types', entities: 'types', schemas: 'types',
  schema: 'types', dto: 'types', dtos: 'types', domain: 'types',
  temp: 'temp', tmp: 'temp', cache: 'temp', '.cache': 'temp', '.temp': 'temp', '.tmp': 'temp',
  logs: 'logs', log: 'logs',
  mocks: 'mocks', __mocks__: 'mocks', mock: 'mocks', fixtures: 'mocks', stubs: 'mocks', samples: 'mocks', sample: 'mocks', examples: 'mocks',
  example: 'mocks', demo: 'mocks', demos: 'mocks', playground: 'mocks', sandbox: 'mocks',
  ai: 'ai', prompts: 'ai', agents: 'ai', '.claude': 'ai', '.cursor': 'ai', '.copilot': 'ai', llm: 'ai', '.windsurf': 'ai',
  android: 'mobile', ios: 'mobile', mobile: 'mobile', fonts: 'fonts', font: 'fonts', typography: 'fonts',
  middleware: 'middleware', middlewares: 'middleware', interceptors: 'middleware', pipes: 'middleware', filters: 'middleware',
  services: 'services', service: 'services', providers: 'services', provider: 'services',
  coverage: 'coverage', '.nyc_output': 'coverage', benchmarks: 'coverage', benchmark: 'coverage', reports: 'coverage',
  secrets: 'secrets', certs: 'secrets', certificates: 'secrets', keys: 'secrets', ssl: 'secrets', '.ssh': 'secrets',
  themes: 'styles', theme: 'styles', styles: 'styles', style: 'styles', css: 'styles', scss: 'styles', sass: 'styles', stylesheets: 'styles',
  scripts: 'scripts', script: 'scripts', cli: 'scripts', commands: 'scripts', tasks: 'scripts',
  docker: 'infra', '.docker': 'infra', k8s: 'infra', kubernetes: 'infra', helm: 'infra', deploy: 'infra', deployment: 'infra', infra: 'infra',
  infrastructure: 'infra', terraform: 'infra', ansible: 'infra',
  'product-icons': 'images',
});

// --- Generación ---------------------------------------------------------------------------

const specId = (/** @type {Spec} */ s) =>
  `f_${s.kind}_${s.kind === 'label' ? [...s.value].map((ch) => (/[a-z0-9]/i.test(ch) ? ch.toLowerCase() : ch.codePointAt(0)?.toString(16))).join('') : s.value}_${s.color}`;

function main() {
  fs.rmSync(SVG_DIR, { recursive: true, force: true });
  fs.mkdirSync(SVG_DIR, { recursive: true });

  /** @type {Record<string, {iconPath: string}>} */
  const defs = {};
  const write = (/** @type {string} */ id, /** @type {string} */ content) => {
    fs.writeFileSync(path.join(SVG_DIR, `${id}.svg`), content);
    defs[id] = { iconPath: `./svg/${id}.svg` };
  };

  /** @type {Map<string, Spec>} */
  const specs = new Map();
  for (const s of [DEFAULT_FILE, ...Object.values(EXTENSIONS), ...Object.values(FILE_NAMES), ...Object.values(LANGUAGE_IDS)]) specs.set(specId(s), s);

  for (const [v, suffix] of /** @type {const} */ ([[0, ''], [1, '_light']])) {
    for (const [id, s] of specs) write(`${id}${suffix}`, fileIcon(s, v));
    write(`folder${suffix}`, folderIcon('concrete', null, false, v));
    write(`folder_open${suffix}`, folderIcon('concrete', null, true, v));
    write(`root${suffix}`, board(false, v));
    write(`root_open${suffix}`, board(true, v));
    for (const [kind, [color, emblem]] of Object.entries(FOLDER_KINDS)) {
      write(`folder_${kind}${suffix}`, folderIcon(color, emblem, false, v));
      write(`folder_${kind}_open${suffix}`, folderIcon(color, emblem, true, v));
    }
  }

  const mapping = (/** @type {string} */ suffix) => ({
    file: `${specId(DEFAULT_FILE)}${suffix}`,
    folder: `folder${suffix}`,
    folderExpanded: `folder_open${suffix}`,
    rootFolder: `root${suffix}`,
    rootFolderExpanded: `root_open${suffix}`,
    fileExtensions: Object.fromEntries(Object.entries(EXTENSIONS).map(([ext, s]) => [ext, `${specId(s)}${suffix}`])),
    fileNames: Object.fromEntries(Object.entries(FILE_NAMES).map(([n, s]) => [n, `${specId(s)}${suffix}`])),
    languageIds: Object.fromEntries(Object.entries(LANGUAGE_IDS).map(([l, s]) => [l, `${specId(s)}${suffix}`])),
    folderNames: Object.fromEntries(Object.entries(FOLDER_NAMES).map(([n, k]) => [n, `folder_${k}${suffix}`])),
    folderNamesExpanded: Object.fromEntries(Object.entries(FOLDER_NAMES).map(([n, k]) => [n, `folder_${k}_open${suffix}`])),
  });

  const theme = { hidesExplorerArrows: false, iconDefinitions: defs, ...mapping(''), light: mapping('_light'), highContrast: mapping('') };
  fs.writeFileSync(path.join(OUT, 'bureau-icon-theme.json'), JSON.stringify(theme, null, 2) + '\n');
  console.log(
    `✔ icons/bureau-icon-theme.json (${Object.keys(defs).length} SVG · ${Object.keys(EXTENSIONS).length} extensiones · ${Object.keys(FILE_NAMES).length} nombres de archivo · ${Object.keys(LANGUAGE_IDS).length} lenguajes · ${Object.keys(FOLDER_NAMES).length} carpetas)`
  );
}

if (require.main === module) main();

module.exports = { EXTENSIONS, FILE_NAMES, LANGUAGE_IDS, FOLDER_NAMES, FOLDER_KINDS, PICTO, EMBLEM };
