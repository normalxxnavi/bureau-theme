// @ts-check
'use strict';

/**
 * Utilidades de color sin dependencias. Trabajan con HEX `#RRGGBB` o `#RRGGBBAA`.
 * Las usan el generador de temas, el comprobador de contraste y los tests.
 */

/** @param {string} hex */
function parse(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`Color HEX no válido: ${hex}`);
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: m[2] === undefined ? 1 : parseInt(m[2], 16) / 255,
  };
}

/** @param {number} v */
const hex2 = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');

/** @param {{r:number,g:number,b:number,a?:number}} c */
function format({ r, g, b, a = 1 }) {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
  return a >= 1 ? base : `${base}${hex2(a * 255)}`.toUpperCase();
}

/**
 * Devuelve el color con la opacidad indicada (0–1).
 * @param {string} hex @param {number} a
 */
function alpha(hex, a) {
  const c = parse(hex);
  return format({ ...c, a });
}

/**
 * Mezcla opaca: `t = 0` devuelve `a`, `t = 1` devuelve `b`.
 * @param {string} a @param {string} b @param {number} t
 */
function mix(a, b, t) {
  const x = parse(a);
  const y = parse(b);
  return format({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/**
 * Compone un color semitransparente sobre un fondo opaco (lo que ve el ojo).
 * @param {string} top @param {string} bottom
 */
function over(top, bottom) {
  const t = parse(top);
  return mix(bottom, format({ ...t, a: 1 }), t.a);
}

/** Luminancia relativa WCAG 2.x. @param {string} hex */
function luminance(hex) {
  const { r, g, b } = parse(hex);
  const lin = (/** @type {number} */ v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste WCAG entre dos colores opacos. @param {string} a @param {string} b */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** HSL (h en grados, s y l en 0–1). @param {string} hex */
function hsl(hex) {
  const { r, g, b } = parse(hex);
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/**
 * ¿Es un rojo reconocible? Tono cercano a 0°, saturado y ni casi negro ni casi blanco.
 * Lo usa la regla «en Resonant el rojo es del Hiss».
 * @param {string} hex
 */
function isRed(hex) {
  const { h, s, l } = hsl(hex);
  return (h <= 15 || h >= 345) && s >= 0.45 && l >= 0.25 && l <= 0.8;
}

module.exports = { parse, format, alpha, mix, over, luminance, contrast, hsl, isRed };
