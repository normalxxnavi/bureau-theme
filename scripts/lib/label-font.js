// @ts-check
'use strict';

/**
 * Letras de las etiquetas de «Bureau Icons» (TS, C#, {}…).
 *
 * Antes eran texto SVG de 8,8 px: cada sistema lo dibujaba con su fuente y, a
 * 16 px, salía borroso. Ahora son letras propias, condensadas y de trazo grueso
 * (como la señalética del Bureau), dibujadas en una rejilla de 6 × 10 píxeles
 * con trazos de 2 px: a 16 px quedan nítidas en cualquier pantalla.
 *
 * Cada letra es un dibujo de pixel-art.js (más algún polígono para las
 * diagonales que no van a 45°).
 */

const { parse, trace } = require('./pixel-art');
const K = require('./glyph-kit');

/** @typedef {import('./glyph-kit').Poly} Poly */

const W = 6;
const H = 10;

/**
 * @param {string} s dibujo de 6 × 10
 * @param {Poly[]} [extra] polígonos que se añaden
 * @returns {Poly[]}
 */
function g(s, extra = []) {
  const m = parse(s);
  if (m.w !== W || m.h !== H) throw new Error(`Letra de ${m.w}×${m.h}:\n${s}`);
  return [...trace(m), ...extra];
}

/** @type {Record<string, () => Poly[]>} */
const GLYPHS = {
  A: () => g(`
    J####L
    ######
    ##..##
    ##..##
    ######
    ######
    ##..##
    ##..##
    ##..##
    ##..##`),
  B: () => g(`
    #####L
    ######
    ##..##
    ##..##
    #####F
    #####L
    ##..##
    ##..##
    ######
    #####F`),
  C: () => g(`
    J#####
    ######
    ##....
    ##....
    ##....
    ##....
    ##....
    ##....
    ######
    7#####`),
  D: () => g(`
    #####L
    ######
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    #####F`),
  E: () => g(`
    ######
    ######
    ##....
    ##....
    #####.
    #####.
    ##....
    ##....
    ######
    ######`),
  F: () => g(`
    ######
    ######
    ##....
    ##....
    #####.
    #####.
    ##....
    ##....
    ##....
    ##....`),
  G: () => g(`
    J#####
    ######
    ##....
    ##....
    ##.###
    ##.###
    ##..##
    ##..##
    ######
    7####F`),
  H: () => g(`
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    ######
    ##..##
    ##..##
    ##..##
    ##..##`),
  I: () => g(`
    ######
    ######
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ######
    ######`),
  J: () => g(`
    ....##
    ....##
    ....##
    ....##
    ....##
    ....##
    ##..##
    ##..##
    ######
    7####F`),
  K: () => g(`
    ##..J#
    ##.J#F
    ##J#F.
    ###F..
    ##F...
    ##L...
    ###L..
    ##7#L.
    ##.7#L
    ##..7#`),
  L: () => g(`
    ##....
    ##....
    ##....
    ##....
    ##....
    ##....
    ##....
    ##....
    ######
    ######`),
  M: () => g(`
    #L..J#
    ##LJ##
    ######
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##`),
  N: () => [K.poly([0, 0], [2, 0], [4, 6], [4, 0], [6, 0], [6, 10], [4, 10], [2, 4], [2, 10], [0, 10])],
  O: () => g(`
    J####L
    ######
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    7####F`),
  P: () => g(`
    #####L
    ######
    ##..##
    ##..##
    ######
    #####F
    ##....
    ##....
    ##....
    ##....`),
  Q: () => g(
    `
    J####L
    ######
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    7####F`,
    [K.poly([3, 7], [5, 7], [7, 10], [5, 10])]
  ),
  R: () => g(`
    #####L
    ######
    ##..##
    ##..##
    #####F
    ###L..
    ##7#L.
    ##.7#L
    ##..##
    ##..##`),
  S: () => g(`
    J#####
    ######
    ##....
    ##....
    #####L
    7#####
    ....##
    ....##
    ######
    #####F`),
  T: () => g(`
    ######
    ######
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..`),
  U: () => g(`
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    7####F`),
  V: () => [K.poly([0, 0], [2, 0], [3, 7], [4, 0], [6, 0], [4, 10], [2, 10])],
  W: () => g(`
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    ##7F##
    #7..F#`),
  X: () => [K.poly([0, 0], [2, 0], [3, 2.5], [4, 0], [6, 0], [4, 5], [6, 10], [4, 10], [3, 7.5], [2, 10], [0, 10], [2, 5])],
  Y: () => [K.poly([0, 0], [2, 0], [3, 3.5], [4, 0], [6, 0], [4, 5.5], [4, 10], [2, 10], [2, 5.5])],
  Z: () => [K.rect(0, 0, 6, 2), K.rect(0, 8, 6, 2), K.poly([4, 2], [6, 2], [2, 8], [0, 8])],
  0: () => g(`
    J####L
    ######
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ##..##
    ######
    7####F`),
  1: () => g(`
    .J##..
    J###..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ..##..
    ######
    ######`),
  a: () => g(`
    ......
    ......
    ......
    ......
    #####L
    ....##
    J#####
    ##..##
    ##..##
    7#####`),
  '#': () => g(`
    .#..#.
    .#..#.
    ######
    ######
    .#..#.
    .#..#.
    ######
    ######
    .#..#.
    .#..#.`),
  '+': () => g(`
    ......
    ......
    ..##..
    ..##..
    ######
    ######
    ..##..
    ..##..
    ......
    ......`),
  '{': () => g(`
    ...J##
    ..####
    ..##..
    ..##..
    .J#F..
    .7#L..
    ..##..
    ..##..
    ..####
    ...7##`),
  '}': () => g(`
    ##L...
    ####..
    ..##..
    ..##..
    ..7#L.
    ..J#F.
    ..##..
    ..##..
    ####..
    ##F...`),
  '<': () => K.stroke([[5.5, 1], [1.5, 5], [5.5, 9]], 2),
  '>': () => K.stroke([[0.5, 1], [4.5, 5], [0.5, 9]], 2),
  '/': () => [K.poly([4, 0], [6, 0], [2, 10], [0, 10])],
  _: () => [K.rect(0, 8, 6, 2)],
  $: () => g(`
    J#####
    ######
    ####..
    ####..
    #####L
    7#####
    ..####
    ..####
    ######
    #####F`),
};

/** Símbolos compuestos que ocupan el ancho de dos letras. */
const WIDE = {
  /** «@» (Razor) en 10 px de ancho: va sola en su etiqueta. */
  '@': () =>
    K.move(
      trace(
        parse(`
          J########L
          ##########
          ##......##
          ##.J##L.##
          ##.#..#.##
          ##.#..#.##
          ##.7####F#
          ##........
          ##########
          7#########`)
      ),
      2,
      0
    ),
  /** «</>» (XML) en 14 px de ancho. */
  '</>': () => [
    ...K.stroke([[4, 1], [1, 5], [4, 9]], 2),
    K.poly([8, 0], [10, 0], [6, 10], [4, 10]),
    ...K.stroke([[10, 1], [13, 5], [10, 9]], 2),
  ],
};

/**
 * Etiqueta centrada en un icono de 16 × 16 (letras de 6 × 10, separadas 2 px,
 * desde y = 1). Siempre en píxeles enteros.
 * @param {string} text 1 o 2 caracteres, o uno de los símbolos de `WIDE`
 * @param {number} [top] fila de arriba de las letras
 * @returns {Poly[]}
 */
function label(text, top = 1) {
  if (text in WIDE) return K.move(WIDE[/** @type {keyof typeof WIDE} */ (text)](), 1, top);
  const chars = [...text];
  if (chars.length < 1 || chars.length > 2) throw new Error(`Etiqueta de ${chars.length} caracteres: «${text}» (máximo 2)`);
  const width = chars.length * W + (chars.length - 1) * 2;
  const left = Math.floor((16 - width) / 2);
  return chars.flatMap((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`Falta la letra «${ch}» en label-font.js`);
    return K.move(glyph(), left + i * (W + 2), top);
  });
}

module.exports = { label, GLYPHS, WIDE, W, H };
