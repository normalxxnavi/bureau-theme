// @ts-check
'use strict';

/**
 * La canción inventada de la captura de la gramola: «Patterning», de Hedron,
 * del álbum «Manhattan Incursion». Escribe su portada (la Hedron sobre el
 * Manhattan del Patterning, con los colores de CONTROL Resonant; arte propio
 * hecho con el kit de glifos) y un WAV en silencio para que la sesión
 * multimedia de prueba (media-session.ps1) «suene» sin que se oiga nada.
 *
 *   node cover.js <carpeta>   → cover.png y silence.wav
 */

const fs = require('node:fs');
const path = require('node:path');
const K = require('../lib/glyph-kit');
const { encodePng } = require('../lib/png');
const resonant = require('../../src/theme/palettes/resonant');

/** @typedef {import('../lib/glyph-kit').Poly} Poly */

const TRACK = { title: 'Patterning', artist: 'Hedron', album: 'Manhattan Incursion' };

/** @param {string} hex #RRGGBB o #RRGGBBAA @returns {[number, number, number, number]} */
function rgba(hex) {
  const n = (/** @type {number} */ i) => parseInt(hex.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), hex.length > 7 ? n(7) / 255 : 1];
}

/**
 * Pinta capas de polígonos (rejilla de 64) con regla de giro no nula y 4×4
 * muestras por píxel.
 * @param {number} size @param {string} bg @param {Array<[string, Poly[]]>} layers
 */
function rasterize(size, bg, layers) {
  const SS = 4;
  const N = size * SS;
  const k = N / 64;
  const img = new Float64Array(size * size * 3);
  const [br, bgr, bb] = rgba(bg);
  for (let i = 0; i < size * size; i++) img.set([br, bgr, bb], i * 3);
  for (const [color, polys] of layers) {
    const [r, g, b, a] = rgba(color);
    const cov = new Uint8Array(size * size);
    const edges = polys.flatMap((p) => p.map((pt, i) => [pt.map((v) => v * k), p[(i + 1) % p.length].map((v) => v * k)]));
    for (let sy = 0; sy < N; sy++) {
      const y = sy + 0.5;
      /** @type {Array<[number, number]>} */
      const xs = [];
      for (const [[x1, y1], [x2, y2]] of edges) {
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push([x1 + ((y - y1) * (x2 - x1)) / (y2 - y1), y2 > y1 ? 1 : -1]);
      }
      xs.sort((p, q) => p[0] - q[0]);
      let winding = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        winding += xs[i][1];
        if (winding === 0) continue;
        const end = Math.min(N, Math.ceil(xs[i + 1][0] - 0.5));
        for (let sx = Math.max(0, Math.ceil(xs[i][0] - 0.5)); sx < end; sx++) cov[Math.floor(sy / SS) * size + Math.floor(sx / SS)]++;
      }
    }
    for (let i = 0; i < size * size; i++) {
      const c = (Math.min(cov[i], SS * SS) / (SS * SS)) * a;
      if (!c) continue;
      img[i * 3] += (r - img[i * 3]) * c;
      img[i * 3 + 1] += (g - img[i * 3 + 1]) * c;
      img[i * 3 + 2] += (b - img[i * 3 + 2]) * c;
    }
  }
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) out.set([Math.round(img[i * 3]), Math.round(img[i * 3 + 1]), Math.round(img[i * 3 + 2]), 255], i * 4);
  return out;
}

/** La portada, en capas de la rejilla de 64. */
function coverLayers() {
  const hedron = resonant.accent.main;
  /** @type {Poly[]} */
  const pattern = [];
  // El Patterning: un panal de hexágonos que se repite por todo el cielo.
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 10; col++) pattern.push(...K.ring(K.regular(col * 7.4 + (row % 2) * 3.7, row * 6.4, 3.3, 6), 0.7));
  }
  // Manhattan: edificios de alturas distintas, con alguna ventana encendida (farolas de sodio).
  const heights = [16, 22, 12, 27, 18, 31, 14, 24, 19, 11, 21];
  /** @type {Poly[]} */
  const city = [];
  /** @type {Poly[]} */
  const windows = [];
  heights.forEach((h, i) => {
    const x = i * 6 - 1;
    city.push(K.rect(x, 64 - h, 5.4, h));
    for (let wy = 64 - h + 3; wy < 61; wy += 4) if ((i * 7 + wy) % 5 === 0) windows.push(K.rect(x + 1.6, wy, 1.4, 1.6));
  });
  // La Hedron: un hexágono que brilla con ecos del Patterning a su alrededor.
  const [cx, cy] = [32, 27];
  return /** @type {Array<[string, Poly[]]>} */ ([
    [resonant.bg.input, pattern],
    [`${hedron}22`, K.ring(K.regular(cx, cy, 24, 6), 1.2)],
    [`${hedron}44`, K.ring(K.regular(cx, cy, 19.5, 6), 1.2)],
    [resonant.accent.solid, [K.regular(cx, cy, 14, 6)]],
    [hedron, K.ring(K.regular(cx, cy, 15, 6), 1.8)],
    [hedron, [K.regular(cx, cy, 6, 6)]],
    [resonant.bg.editor, [K.regular(cx, cy, 2.6, 6)]],
    [resonant.bg.chrome, city],
    [resonant.status.warning, windows],
  ]);
}

/** WAV de 2 s en silencio (8 kHz, mono, 16 bits). */
function silence() {
  const data = Buffer.alloc(8000 * 2 * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(8000, 24);
  h.writeUInt32LE(16000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** @param {string} dir */
function writeCover(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const size = 320;
  const cover = path.join(dir, 'cover.png');
  const wav = path.join(dir, 'silence.wav');
  fs.writeFileSync(cover, encodePng(size, size, rasterize(size, resonant.bg.editor, coverLayers())));
  fs.writeFileSync(wav, silence());
  return { cover, wav };
}

if (require.main === module) console.log(writeCover(process.argv[2] ?? '.'));

module.exports = { TRACK, writeCover };
