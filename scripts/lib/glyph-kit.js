// @ts-check
'use strict';

/**
 * Geometría de los iconos (temas de iconos de archivo y de producto).
 *
 * Regla de nitidez: VS Code pinta los iconos a 16 px (24 px en la barra de
 * actividad). En una pantalla al 100 % un borde horizontal o vertical solo es
 * nítido si cae justo entre dos píxeles, así que todas las formas se dibujan en
 * una rejilla de 16 (o 24) unidades con esos bordes en coordenadas ENTERAS:
 * trazos de 2 px centrados en enteros, rectángulos con esquinas enteras… Las
 * diagonales pueden ir donde sea: el suavizado las dibuja igual de limpias.
 *
 * Todo devuelve polígonos (`Poly[]`): los rellenos en sentido horario y los
 * huecos en antihorario (coordenadas SVG, y hacia abajo), para la regla nonzero
 * de las fuentes y de SVG.
 */

const { parse, trace } = require('./pixel-art');

/** @typedef {[number, number]} Pt */
/** @typedef {Pt[]} Poly */

/** Área con signo (y hacia abajo): > 0 = sentido horario. @param {Poly} p */
const area = (p) => p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0) / 2;
/** Relleno (siempre horario). @param {Poly} p */
const solid = (p) => (area(p) < 0 ? [...p].reverse() : p);
/** Hueco (siempre antihorario). @param {Poly} p */
const hole = (p) => (area(p) > 0 ? [...p].reverse() : p);

/** @param {number} x @param {number} y @param {number} w @param {number} h */
const rect = (x, y, w, h) => solid([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
/** Polígono relleno. @param {...Pt} pts */
const poly = (...pts) => solid(pts);
/** Polígono hueco. @param {...Pt} pts */
const cut = (...pts) => hole(pts);
/** Rectángulo hueco. @param {number} x @param {number} y @param {number} w @param {number} h */
const cutRect = (x, y, w, h) => hole(rect(x, y, w, h));

/** Marco rectangular de grosor `t`. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} [t] */
const frame = (x, y, w, h, t = 2) => [rect(x, y, w, h), cutRect(x + t, y + t, w - 2 * t, h - 2 * t)];

/**
 * Octógono (los círculos del estilo brutalista) dentro de la caja x,y,w,h con
 * chaflanes de `c` unidades (enteros: los lados rectos quedan nítidos).
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c
 * @returns {Poly}
 */
const octagon = (x, y, w, h, c) =>
  solid([[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]]);

/**
 * Octógono hueco de grosor `t`. El chaflán interior se ajusta para que las
 * diagonales tengan el mismo grosor que los lados rectos.
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c @param {number} [t]
 */
function octRing(x, y, w, h, c, t = 2) {
  const ci = Math.max(0, c - t * (Math.SQRT2 - 1));
  return [octagon(x, y, w, h, c), hole(octagon(x + t, y + t, w - 2 * t, h - 2 * t, ci))];
}

/** Intersección de dos rectas (punto + dirección). @param {Pt} p @param {Pt} d @param {Pt} q @param {Pt} e @returns {Pt | null} */
function intersect(p, d, q, e) {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

/**
 * Contorno de un lado de una línea quebrada desplazada `off` (positivo = a la
 * izquierda del sentido de avance en pantalla), con esquinas en inglete.
 * @param {Poly} pts @param {number} off @param {boolean} closed
 */
function offsetSide(pts, off, closed) {
  const n = pts.length;
  const segs = [];
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d = /** @type {Pt} */ ([(b[0] - a[0]) / len, (b[1] - a[1]) / len]);
    const nrm = /** @type {Pt} */ ([d[1], -d[0]]);
    segs.push({ a: /** @type {Pt} */ ([a[0] + nrm[0] * off, a[1] + nrm[1] * off]), b: /** @type {Pt} */ ([b[0] + nrm[0] * off, b[1] + nrm[1] * off]), d });
  }
  /** @type {Poly} */
  const out = [];
  if (!closed) out.push(segs[0].a);
  for (let i = closed ? 0 : 1; i < segs.length; i++) {
    const prev = segs[(i - 1 + segs.length) % segs.length];
    const cur = segs[i];
    out.push(intersect(prev.a, prev.d, cur.a, cur.d) ?? cur.a);
  }
  if (!closed) out.push(segs[segs.length - 1].b);
  return out;
}

/**
 * Trazo de grosor `w` a lo largo de una línea quebrada, con esquinas en
 * inglete. `cap: 'square'` alarga los extremos medio grosor (como
 * stroke-linecap="square"). Con centro en enteros y grosor 2, los tramos
 * horizontales y verticales quedan nítidos.
 * @param {Poly} pts @param {number} [w] @param {{cap?: 'butt' | 'square'}} [o]
 * @returns {Poly[]}
 */
function stroke(pts, w = 2, o = {}) {
  let p = pts;
  if (o.cap === 'square') {
    const ext = (/** @type {Pt} */ a, /** @type {Pt} */ b) => {
      const len = Math.hypot(a[0] - b[0], a[1] - b[1]);
      return /** @type {Pt} */ ([a[0] + ((a[0] - b[0]) / len) * (w / 2), a[1] + ((a[1] - b[1]) / len) * (w / 2)]);
    };
    p = [ext(pts[0], pts[1]), ...pts.slice(1, -1), ext(pts[pts.length - 1], pts[pts.length - 2])];
  }
  const left = offsetSide(p, w / 2, false);
  const right = offsetSide(p, -w / 2, false);
  return [solid([...left, ...right.reverse()])];
}

/**
 * Contorno cerrado (marco) de grosor `w` siguiendo un polígono.
 * @param {Poly} pts @param {number} [w]
 * @returns {Poly[]}
 */
function ring(pts, w = 2) {
  const a = offsetSide(pts, w / 2, true);
  const b = offsetSide(pts, -w / 2, true);
  const [outer, inner] = Math.abs(area(a)) > Math.abs(area(b)) ? [a, b] : [b, a];
  return [solid(outer), hole(inner)];
}

/**
 * Aspa (X) como un solo polígono: sirve también como hueco sin que los dos
 * brazos se pisen. Centro, semilado `L` (hasta la punta de cada brazo) y grosor `w`.
 * @param {number} cx @param {number} cy @param {number} L @param {number} w
 */
function cross(cx, cy, L, w) {
  const a = w / Math.SQRT2;
  const h = w / 2 / Math.SQRT2;
  return poly(
    [cx, cy - a], [cx + L - h, cy - L - h], [cx + L + h, cy - L + h], [cx + a, cy],
    [cx + L + h, cy + L - h], [cx + L - h, cy + L + h], [cx, cy + a],
    [cx - L + h, cy + L + h], [cx - L - h, cy + L - h], [cx - a, cy],
    [cx - L - h, cy - L + h], [cx - L + h, cy - L - h]
  );
}

/**
 * Estrella de `n` puntas: radios exterior `r` e interior `ri`; con `rm`, las
 * puntas alternas (las diagonales de Polaris) miden `rm`.
 * @param {number} cx @param {number} cy @param {number} n @param {number} r @param {number} ri @param {number} [rm]
 */
function star(cx, cy, n, r, ri, rm = r) {
  /** @type {Poly} */
  const p = [];
  for (let i = 0; i < 2 * n; i++) {
    const rr = i % 2 ? ri : i % 4 === 0 ? r : rm;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return solid(p);
}

/** Polígono regular. `rot` en grados. @param {number} cx @param {number} cy @param {number} r @param {number} n @param {number} [rot] */
function regular(cx, cy, r, n, rot = -90) {
  /** @type {Poly} */
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return solid(p);
}

/** Desplaza polígonos. @param {Poly[]} polys @param {number} dx @param {number} dy @returns {Poly[]} */
const move = (polys, dx, dy) => polys.map((p) => p.map(([x, y]) => /** @type {Pt} */ ([x + dx, y + dy])));
/** Escala polígonos desde el origen (para pasar de una rejilla a otra). @param {Poly[]} polys @param {number} k @returns {Poly[]} */
const scale = (polys, k) => polys.map((p) => p.map(([x, y]) => /** @type {Pt} */ ([x * k, y * k])));

/** Dibujo ASCII de pixel-art.js → polígonos. @param {string} s @param {number} [size] */
const art = (s, size) => trace(parse(s, size));

const fmt = (/** @type {number} */ n) => String(Math.round(n * 1000) / 1000);
/** Polígonos → atributo `d` de un path SVG. */
const toPath = (/** @type {Poly[]} */ polys) => polys.map((p) => `M${p.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');

/** Invierte polígonos: lo relleno pasa a hueco y al revés (para calar una forma en otra). @param {Poly[]} polys */
const invert = (polys) => polys.map((p) => /** @type {Poly} */ ([...p].reverse()));

module.exports = { area, solid, hole, rect, poly, cut, cutRect, frame, octagon, octRing, stroke, ring, cross, star, regular, move, scale, invert, art, toPath };
