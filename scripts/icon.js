// @ts-check
'use strict';

/**
 * Genera images/icon.png (256×256) por código.
 *
 *   npm run icon
 *
 * Diseño propio, sin logos ni arte de los juegos: el Consejo tal y como aparece
 * en Control, una pirámide invertida de piedra negra mate flotando en el vacío
 * blanco del Plano Astral. Se ve desde abajo y algo girada: dos caras (una
 * iluminada por la luz astral y otra en sombra), la arista central y un filo de
 * luz en el borde superior.
 */

const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./lib/png');
const { parse } = require('../src/theme/color');

const SIZE = 256;
const SS = 4; // supermuestreo por eje (antialiasing)

/** @typedef {{r: number, g: number, b: number}} RGB */
/** @typedef {[number, number]} Pt */
const VOID_CENTER = parse('#FCFBF8');
const VOID_EDGE = parse('#D9D8D2');
const HAZE = parse('#B4B3AD');
const LIT_TOP = parse('#4A4A4F');
const LIT_BOTTOM = parse('#18181B');
const DARK_TOP = parse('#0E0E10');
const DARK_BOTTOM = parse('#050506');
const BOUNCE = parse('#232326');
const RIM = parse('#E9E7E1');
const RIDGE = parse('#5C5C61');

const lerp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ t) => a + (b - a) * t;
const mixRGB = (/** @type {RGB} */ a, /** @type {RGB} */ b, /** @type {number} */ t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
const clamp01 = (/** @type {number} */ v) => Math.max(0, Math.min(1, v));

// Pirámide invertida vista desde abajo: la esquina delantera de la base (F)
// queda por encima de las laterales (L, R) y la arista F→P separa las caras.
/** @type {Pt} */ const L = [30, 76];
/** @type {Pt} */ const F = [108, 54];
/** @type {Pt} */ const R = [228, 74];
/** @type {Pt} */ const P = [126, 234];
const LIT = [L, F, P];
const DARK = [F, R, P];

/** Distancia con signo a la recta p→q. */
function edge(/** @type {Pt} */ p, /** @type {Pt} */ q, /** @type {number} */ x, /** @type {number} */ y) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  return ((x - p[0]) * dy - (y - p[1]) * dx) / Math.hypot(dx, dy);
}

/** Distancia al interior de un triángulo (positiva dentro, negativa fuera), sin importar el sentido. */
function inside(/** @type {Pt[]} */ [a, b, c], /** @type {number} */ x, /** @type {number} */ y) {
  const s = Math.sign(edge(a, b, c[0], c[1]));
  return Math.min(s * edge(a, b, x, y), s * edge(b, c, x, y), s * edge(c, a, x, y));
}

/** Distancia de un punto a un segmento. */
function segment(/** @type {Pt} */ p, /** @type {Pt} */ q, /** @type {number} */ x, /** @type {number} */ y) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const t = clamp01(((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy));
  return Math.hypot(x - (p[0] + t * dx), y - (p[1] + t * dy));
}

function grain(/** @type {number} */ x, /** @type {number} */ y) {
  const n = Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 3;
}

/** @returns {RGB} */
function shade(/** @type {number} */ x, /** @type {number} */ y) {
  const t = clamp01((y - F[1]) / (P[1] - F[1])); // 0 en la base, 1 en el vértice

  const dLit = inside(LIT, x, y);
  const dDark = inside(DARK, x, y);
  if (dLit >= 0 || dDark >= 0) {
    let c;
    if (dLit >= dDark) {
      // Cara iluminada: la luz astral entra por arriba a la izquierda.
      c = mixRGB(LIT_TOP, LIT_BOTTOM, Math.pow(t, 0.7));
      c = mixRGB(c, LIT_BOTTOM, clamp01((x - L[0]) / 260) * 0.5);
    } else {
      // Cara en sombra, con un leve rebote de luz junto al borde derecho.
      c = mixRGB(DARK_TOP, DARK_BOTTOM, t);
      c = mixRGB(c, BOUNCE, Math.exp(-Math.max(0, -edge(R, P, x, y)) / 10) * 0.55 * (1 - t));
    }
    // Arista central.
    const ridge = segment(F, P, x, y);
    if (ridge < 1.4) c = mixRGB(c, RIDGE, (1 - ridge / 1.4) * (1 - t * 0.7));
    // Filo de luz en el borde superior (más fuerte en el lado iluminado).
    const rimLit = segment(L, F, x, y);
    const rimDark = segment(F, R, x, y);
    if (rimLit < 2.2) c = mixRGB(c, RIM, (1 - rimLit / 2.2) * 0.9);
    if (rimDark < 1.8) c = mixRGB(c, RIM, (1 - rimDark / 1.8) * 0.45);
    return c;
  }

  // El vacío del Plano Astral: blanco, más luminoso detrás del Consejo.
  const r = Math.hypot((x - 128) / 1.15, y - 118) / 190;
  let c = mixRGB(VOID_CENTER, VOID_EDGE, clamp01(r * r * 1.6));
  // Bruma alrededor de la silueta para que flote.
  const out = Math.max(-dLit, -dDark) < 0 ? 0 : Math.min(-dLit, -dDark);
  c = mixRGB(c, HAZE, Math.exp(-out / 16) * 0.32);
  // Sombra difusa bajo el vértice.
  c = mixRGB(c, HAZE, Math.exp(-Math.hypot((x - 128) / 3.2, (y - 246) / 1.2) / 6) * 0.5);
  const g = grain(x, y);
  return { r: c.r + g, g: c.g + g, b: c.b + g };
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
