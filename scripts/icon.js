// @ts-check
'use strict';

/**
 * Genera images/icon.png (256×256) por código.
 *
 *   npm run icon
 *
 * Diseño propio, sin logos ni arte de los juegos: dos bloques de hormigón
 * brutalista con una rendija de luz roja (la Oldest House, rojo FBC) y una
 * línea cian en el suelo (la Hedron de Control Resonant).
 */

const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./lib/png');
const { parse } = require('../src/theme/color');

const SIZE = 256;
const SS = 4; // supermuestreo por eje (antialiasing)

const BG = parse('#121315');
const CONCRETE_TOP = parse('#3C3D42');
const CONCRETE_BOTTOM = parse('#1F2023');
const RED = parse('#E0352B');
const RED_HOT = parse('#FF6A52');
const RED_DARK = parse('#5E1410');
const CYAN = parse('#6FCFDC');

const SLAB_TOP = 40;
const SLAB_BOTTOM = 212;
const LEFT = [44, 114];
const RIGHT = [142, 212];
const GAP = [LEFT[1], RIGHT[0]];
const LINE = { y0: 226, y1: 231, x0: 44, x1: 212 };

/** @typedef {{r: number, g: number, b: number}} RGB */
const lerp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ t) => a + (b - a) * t;
const mixRGB = (/** @type {RGB} */ a, /** @type {RGB} */ b, /** @type {number} */ t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
const clamp01 = (/** @type {number} */ v) => Math.max(0, Math.min(1, v));

/** Textura de hormigón determinista (ruido por celdas). */
function grain(/** @type {number} */ x, /** @type {number} */ y) {
  const n = Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 6;
}

/** Color en un punto continuo (x, y). @returns {RGB} */
function shade(/** @type {number} */ x, /** @type {number} */ y) {
  const inSlabY = y >= SLAB_TOP && y < SLAB_BOTTOM;
  const vy = clamp01((y - SLAB_TOP) / (SLAB_BOTTOM - SLAB_TOP));

  // Fondo con el resplandor rojo que sale de la rendija.
  const dx = Math.abs(x - (GAP[0] + GAP[1]) / 2);
  const glowV = clamp01(1 - Math.abs(y - 150) / 120);
  let c = mixRGB(BG, RED, clamp01(Math.exp(-dx / 34) * glowV * 0.45));

  // Bloques de hormigón.
  const inLeft = x >= LEFT[0] && x < LEFT[1];
  const inRight = x >= RIGHT[0] && x < RIGHT[1];
  if (inSlabY && (inLeft || inRight)) {
    c = mixRGB(CONCRETE_TOP, CONCRETE_BOTTOM, vy);
    const g = grain(x, y);
    c = { r: c.r + g, g: c.g + g, b: c.b + g };
    if (y - SLAB_TOP < 4) c = mixRGB(c, { r: 255, g: 255, b: 255 }, 0.12); // arista superior iluminada
    const distToGap = inLeft ? GAP[0] - x : x - GAP[1];
    c = mixRGB(c, RED, clamp01(1 - distToGap / 16) * 0.55 * (0.4 + 0.6 * vy)); // reflejo rojo en las caras interiores
  }

  // La rendija: luz roja, más intensa abajo y en el centro.
  if (inSlabY && x >= GAP[0] && x < GAP[1]) {
    const center = 1 - Math.abs(x - (GAP[0] + GAP[1]) / 2) / ((GAP[1] - GAP[0]) / 2);
    c = mixRGB(RED_DARK, RED, clamp01(0.25 + vy * 0.9));
    c = mixRGB(c, RED_HOT, clamp01(center * vy * 0.8));
  }

  // Derrame de luz en el suelo bajo la rendija.
  if (y >= SLAB_BOTTOM && y < LINE.y0) {
    const spread = 14 + (y - SLAB_BOTTOM) * 2.2;
    const t = clamp01(1 - dx / spread) * clamp01(1 - (y - SLAB_BOTTOM) / (LINE.y0 - SLAB_BOTTOM));
    c = mixRGB(c, RED, t * 0.6);
  }

  // Línea de la Hedron.
  if (y >= LINE.y0 && y < LINE.y1 && x >= LINE.x0 && x < LINE.x1) c = CYAN;
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
