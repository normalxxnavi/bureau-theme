// @ts-check
'use strict';

/**
 * Genera images/icon.png (256×256) por código.
 *
 *   npm run icon
 *
 * Diseño propio, sin logos ni arte de los juegos: la pirámide invertida del
 * Consejo (el símbolo de todo el pack: rama de Git, Copilot, carpeta raíz)
 * flotando sobre hormigón, delineada en luz astral, con la ranura roja del FBC,
 * la línea con la que «habla» y la línea cian de la Hedron (Control Resonant).
 */

const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./lib/png');
const { parse } = require('../src/theme/color');

const SIZE = 256;
const SS = 4; // supermuestreo por eje (antialiasing)

/** @typedef {{r: number, g: number, b: number}} RGB */
const BG_TOP = parse('#1A1B1E');
const BG_BOTTOM = parse('#0B0C0D');
const ASTRAL = parse('#F2EFE8');
const BOARD = parse('#060607');
const RED = parse('#E0352B');
const RED_HOT = parse('#FF6A52');
const CYAN = parse('#6FCFDC');

const lerp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ t) => a + (b - a) * t;
const mixRGB = (/** @type {RGB} */ a, /** @type {RGB} */ b, /** @type {number} */ t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
const clamp01 = (/** @type {number} */ v) => Math.max(0, Math.min(1, v));

// Pirámide invertida: vértices.
const A = [34, 70];
const B = [222, 70];
const Cv = [128, 230];
const OUTLINE = 7; // grosor del contorno de luz astral

/** Distancia con signo a una recta (positivo hacia dentro del triángulo). */
function edge(/** @type {number[]} */ p, /** @type {number[]} */ q, /** @type {number} */ x, /** @type {number} */ y) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  return ((x - p[0]) * dy - (y - p[1]) * dx) / Math.hypot(dx, dy);
}

/** Distancia (positiva) al interior del triángulo: mínimo de las tres aristas. */
function inside(/** @type {number} */ x, /** @type {number} */ y) {
  return Math.min(-edge(A, B, x, y), -edge(B, Cv, x, y), -edge(Cv, A, x, y));
}

function grain(/** @type {number} */ x, /** @type {number} */ y) {
  const n = Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 5;
}

/** @returns {RGB} */
function shade(/** @type {number} */ x, /** @type {number} */ y) {
  // Fondo: hormigón oscuro con grano y un resplandor rojo que sale de la ranura.
  let c = mixRGB(BG_TOP, BG_BOTTOM, y / SIZE);
  const g = grain(x, y);
  c = { r: c.r + g, g: c.g + g, b: c.b + g };
  const glow = Math.exp(-Math.hypot((x - 128) / 1.6, y - 112) / 46);
  c = mixRGB(c, RED, clamp01(glow * 0.35));

  // La línea con la que «habla» el Consejo.
  if (y >= 38 && y < 50 && x >= 70 && x < 186) c = ASTRAL;

  // La pirámide.
  const d = inside(x, y);
  if (d >= 0) {
    if (d < OUTLINE) c = ASTRAL;
    else {
      c = mixRGB(BOARD, { r: 30, g: 30, b: 34 }, clamp01((230 - y) / 260));
      // Ranura roja del FBC, más intensa en el centro.
      if (y >= 102 && y < 116 && Math.abs(x - 128) < 50) {
        c = mixRGB(RED, RED_HOT, clamp01(1 - Math.abs(x - 128) / 50));
      }
      // Reflejo rojo de la ranura sobre la cara interior.
      const below = y - 116;
      if (below > 0 && below < 40) c = mixRGB(c, RED, clamp01((1 - below / 40) * (1 - Math.abs(x - 128) / 70)) * 0.25);
    }
  }

  // Línea cian de la Hedron (Control Resonant).
  if (y >= 240 && y < 246 && x >= 40 && x < 216) c = CYAN;
  return c;
}

function main() {
  const rgba = new Uint8Array(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS);
          r += c.r; g += c.g; b += c.b;
        }
      }
      const i = (py * SIZE + px) * 4;
      const n = SS * SS;
      rgba[i] = Math.round(Math.max(0, Math.min(255, r / n)));
      rgba[i + 1] = Math.round(Math.max(0, Math.min(255, g / n)));
      rgba[i + 2] = Math.round(Math.max(0, Math.min(255, b / n)));
      rgba[i + 3] = 255;
    }
  }
  const out = path.resolve(__dirname, '..', 'images', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, encodePng(SIZE, SIZE, rgba));
  console.log(`✔ ${path.relative(process.cwd(), out)} (${SIZE}×${SIZE})`);
}

main();
