// @ts-check
'use strict';

/**
 * Dibujos en rejilla de píxeles → contornos vectoriales.
 *
 * Los iconos se ven a 16 px (24 px en la barra de actividad). Si sus bordes no
 * caen justo entre dos píxeles, en una pantalla al 100 % se ven borrosos o
 * «pixelados». Por eso se dibujan en ASCII, un carácter por píxel, y este
 * módulo los convierte en polígonos limpios (vectoriales: en pantallas retina
 * siguen siendo nítidos).
 *
 *   #        píxel lleno
 *   . o ' '  vacío
 *   L J F 7  medio píxel en diagonal; la letra marca la esquina llena:
 *            L ◣ (abajo-izquierda)  J ◢ (abajo-derecha)  F ◤ (arriba-izquierda)  7 ◥ (arriba-derecha)
 *
 * Las diagonales a 45° pasan por las esquinas de los píxeles: a 16 px se ven
 * suavizadas y simétricas, y a mayor resolución son rectas perfectas.
 */

/** @typedef {Array<[number, number]>} Poly */
/** @typedef {{w: number, h: number, m: Uint8Array}} Mask */

// Cada píxel se parte en 4 triángulos por sus diagonales.
const T = 1;
const R = 2;
const B = 4;
const LEFT = 8;
const FULL = T | R | B | LEFT;

/** @type {Record<string, number>} */
const CELL = { '#': FULL, '.': 0, ' ': 0, L: LEFT | B, J: B | R, F: T | LEFT, 7: T | R };

/**
 * Lee un dibujo. Las líneas vacías del principio y del final se ignoran y la
 * sangría común se quita, para poder escribirlo en una plantilla indentada.
 * @param {string} art
 * @param {number} [size] ancho y alto esperados (comprueba que no falte nada)
 * @returns {Mask}
 */
function parse(art, size) {
  const lines = art.replace(/\r/g, '').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.map((l) => l.match(/^ */)?.[0].length ?? 0));
  const rows = lines.map((l) => l.slice(indent).replace(/\s+$/, ''));
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  if (size !== undefined && (w > size || h !== size)) throw new Error(`Dibujo de ${w}×${h}, se esperaba ${size}×${size}:\n${rows.join('\n')}`);
  const W = size ?? w;
  const m = new Uint8Array(W * h);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const v = CELL[ch];
      if (v === undefined) throw new Error(`Carácter no válido «${ch}» en (${x}, ${y}):\n${rows.join('\n')}`);
      m[y * W + x] = v;
    })
  );
  return { w: W, h, m };
}

/** @param {Mask[]} masks */
function union(...masks) {
  const [a] = masks;
  const m = new Uint8Array(a.m.length);
  for (const k of masks) {
    if (k.w !== a.w || k.h !== a.h) throw new Error('union: tamaños distintos');
    for (let i = 0; i < m.length; i++) m[i] |= k.m[i];
  }
  return { w: a.w, h: a.h, m };
}

/** `a` sin lo que tape `b` (para recortes transparentes). @param {Mask} a @param {Mask} b */
function subtract(a, b) {
  if (a.w !== b.w || a.h !== b.h) throw new Error('subtract: tamaños distintos');
  return { w: a.w, h: a.h, m: a.m.map((v, i) => v & ~b.m[i]) };
}

/** @param {Mask} k */
const isEmpty = (k) => k.m.every((v) => v === 0);

/**
 * Contornos del dibujo: exteriores en sentido horario y huecos en antihorario
 * (coordenadas SVG, y hacia abajo), listos para la regla de relleno nonzero.
 * @param {Mask} k
 * @returns {Poly[]}
 */
function trace(k) {
  const { w, h, m } = k;
  const at = (/** @type {number} */ x, /** @type {number} */ y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  // Coordenadas dobladas: el centro de un píxel también es un punto entero.
  /** @type {Map<string, Array<{to: [number, number], used: boolean}>>} */
  const out = new Map();
  const add = (/** @type {[number, number]} */ a, /** @type {[number, number]} */ b) => {
    const key = `${a[0]},${a[1]}`;
    if (!out.has(key)) out.set(key, []);
    out.get(/** @type {string} */ (key))?.push({ to: b, used: false });
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = m[y * w + x];
      if (!v) continue;
      /** @type {[number, number]} */ const tl = [2 * x, 2 * y];
      /** @type {[number, number]} */ const tr = [2 * x + 2, 2 * y];
      /** @type {[number, number]} */ const br = [2 * x + 2, 2 * y + 2];
      /** @type {[number, number]} */ const bl = [2 * x, 2 * y + 2];
      /** @type {[number, number]} */ const c = [2 * x + 1, 2 * y + 1];
      // Cada triángulo en sentido horario; una arista es borde si al otro lado no hay relleno.
      if (v & T) {
        if (!(at(x, y - 1) & B)) add(tl, tr);
        if (!(v & R)) add(tr, c);
        if (!(v & LEFT)) add(c, tl);
      }
      if (v & R) {
        if (!(at(x + 1, y) & LEFT)) add(tr, br);
        if (!(v & B)) add(br, c);
        if (!(v & T)) add(c, tr);
      }
      if (v & B) {
        if (!(at(x, y + 1) & T)) add(br, bl);
        if (!(v & LEFT)) add(bl, c);
        if (!(v & R)) add(c, br);
      }
      if (v & LEFT) {
        if (!(at(x - 1, y) & R)) add(bl, tl);
        if (!(v & T)) add(tl, c);
        if (!(v & B)) add(c, bl);
      }
    }
  }

  /** @type {Poly[]} */
  const polys = [];
  for (const [startKey, edges] of out) {
    for (const first of edges) {
      if (first.used) continue;
      first.used = true;
      const start = /** @type {[number, number]} */ (startKey.split(',').map(Number));
      /** @type {Poly} */
      const pts = [start];
      let prev = start;
      let cur = first.to;
      while (!(cur[0] === start[0] && cur[1] === start[1])) {
        pts.push(cur);
        const options = (out.get(`${cur[0]},${cur[1]}`) ?? []).filter((e) => !e.used);
        if (!options.length) throw new Error('trace: contorno abierto');
        // En un vértice compartido (dos píxeles que se tocan en diagonal) se gira
        // lo más posible a la derecha: así cada pieza queda en su propio contorno.
        const dx = cur[0] - prev[0];
        const dy = cur[1] - prev[1];
        const turn = (/** @type {{to: [number, number]}} */ e) => {
          const ex = e.to[0] - cur[0];
          const ey = e.to[1] - cur[1];
          return Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey);
        };
        const next = options.reduce((best, e) => (turn(e) > turn(best) ? e : best));
        next.used = true;
        prev = cur;
        cur = next.to;
      }
      polys.push(simplify(pts).map(([x, y]) => /** @type {[number, number]} */ ([x / 2, y / 2])));
    }
  }
  return polys;
}

/** Quita los vértices intermedios de los tramos rectos. @param {Poly} pts */
function simplify(pts) {
  const n = pts.length;
  return pts.filter((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

const fmt = (/** @type {number} */ n) => String(Math.round(n * 1000) / 1000);
/** Polígonos → atributo `d` de un path SVG. @param {Poly[]} polys */
const toPath = (polys) => polys.map((p) => `M${p.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');

/** Dibujo en texto (para depurar y para los tests). @param {Mask} k */
function toText(k) {
  const ch = Object.fromEntries(Object.entries(CELL).filter(([c]) => c !== ' ').map(([c, v]) => [v, c]));
  const rows = [];
  for (let y = 0; y < k.h; y++) rows.push([...k.m.slice(y * k.w, (y + 1) * k.w)].map((v) => ch[v] ?? '?').join(''));
  return rows.join('\n');
}

module.exports = { parse, union, subtract, isEmpty, trace, toPath, toText, FULL };
