// @ts-check
'use strict';

/**
 * Genera la fuente de iconos del prompt de la terminal Bureau:
 * fonts/prompt/BureauPromptIcons.ttf («Bureau Prompt Icons»).
 *
 *   npm run prompt-icons
 *
 * Las terminales no cargan fuentes de una extensión: se instala para el
 * usuario (como las tipografías) y va detrás de su fuente en
 * `terminal.integrated.fontFamily`, así que solo pinta estos glifos. Están en
 * el área de uso privado de Unicode (puntos de código en
 * src/extension/prompt-config.js), que la terminal de VS Code no reescala: el
 * icono mide 1 em y ocupa también el espacio que lleva siempre detrás, y va
 * centrado en esas dos celdas.
 *
 * Los glifos son los de Bureau Product Icons (la carpeta, la cinta de la rama,
 * el reloj, el error, Polaris, el Consejo, el expediente) y los iconos de
 * sistema, en la misma rejilla de 16 × 16 y con el lore de la Agencia:
 *   - Windows: las cuatro ventanas como cuatro Puntos de Control, o la Casa
 *     Inmemorial (que no tiene ventanas) con cuatro;
 *   - macOS: el ⌘ hecho de cuatro Puntos de Control unidos por un anillo, o
 *     una manzana con la geometría del Bureau (sin curvas);
 *   - Linux: Tux con octógonos, ojos cuadrados y barriga, o Tux con la fregona
 *     de Ahti, el conserje finlandés (Linux también nació en Finlandia).
 */

const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const K = require('./lib/glyph-kit');
const { GLYPHS } = require('./product-icons');
const { ICON_CODES, PROMPT_FONT } = require('../src/extension/prompt-config');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'fonts', PROMPT_FONT.file);
/** Avance de cada glifo en unidades (1024 por em). */
const ADVANCE = 614;
/** Las dos celdas del icono (la suya y el espacio de detrás) en la rejilla de 16. */
const BOX = (16 * 2 * ADVANCE) / 1024;

/** El glifo en un lienzo de dos celdas de ancho (la fuente lo centra en él). @param {Poly[]} polys */
const toBoxSvg = (polys) => `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX}" height="16" viewBox="0 0 ${BOX} 16"><path d="${K.toPath(polys)}"/></svg>\n`;

/** @typedef {import('./lib/glyph-kit').Poly} Poly */

const { rect, poly, cut, cutRect, frame } = K;

/** Los iconos de sistema (16 × 16, bordes en píxeles enteros). @type {Record<'controlPoints' | 'house' | 'command' | 'apple' | 'tux' | 'tuxMop', () => Poly[]>} */
const OS_GLYPHS = {
  controlPoints: () => [...frame(1, 1, 6, 6), ...frame(9, 1, 6, 6), ...frame(1, 9, 6, 6), ...frame(9, 9, 6, 6)],
  house: () => [rect(3, 1, 10, 15), cutRect(5, 4, 2, 3), cutRect(9, 4, 2, 3), cutRect(5, 9, 2, 3), cutRect(9, 9, 2, 3), rect(7, 0, 2, 1)],
  command: () => [...frame(0, 0, 6, 6), ...frame(10, 0, 6, 6), ...frame(0, 10, 6, 6), ...frame(10, 10, 6, 6), ...frame(4, 4, 8, 8)],
  apple: () => [
    poly([4, 5], [7, 5], [8, 6], [9, 5], [12, 5], [14, 7], [12, 7], [12, 11], [14, 11], [14, 12], [11, 15], [9, 15], [8, 14], [7, 15], [5, 15], [2, 12], [2, 7]),
    poly([8, 4], [8, 3], [10, 1], [11, 1], [11, 2], [9, 4]),
  ],
  tux: () => [
    poly([6, 0], [10, 0], [12, 2], [12, 5], [14, 7], [14, 12], [12, 14], [4, 14], [2, 12], [2, 7], [4, 5], [4, 2]),
    cutRect(5, 2, 2, 2),
    cutRect(9, 2, 2, 2),
    cut([6, 5], [8, 7], [10, 5]),
    cut([7, 8], [6, 9], [6, 12], [7, 13], [9, 13], [10, 12], [10, 9], [9, 8]),
    rect(3, 14, 4, 2),
    rect(9, 14, 4, 2),
  ],
  tuxMop: () => [
    poly([4, 0], [8, 0], [10, 2], [10, 5], [11, 6], [11, 12], [9, 14], [3, 14], [1, 12], [1, 6], [2, 5], [2, 2]),
    cutRect(4, 2, 1, 2),
    cutRect(7, 2, 1, 2),
    cut([4, 5], [6, 7], [8, 5]),
    cut([5, 8], [4, 9], [4, 12], [5, 13], [7, 13], [8, 12], [8, 9], [7, 8]),
    rect(2, 14, 3, 2),
    rect(7, 14, 3, 2),
    rect(13, 0, 2, 11),
    rect(11, 11, 5, 2),
    rect(11, 13, 1, 3),
    rect(13, 13, 1, 3),
    rect(15, 13, 1, 3),
  ],
};

/** Glifo de cada icono del prompt. @type {Record<keyof typeof ICON_CODES, () => Poly[]>} */
const PROMPT_GLYPHS = {
  ...OS_GLYPHS,
  folder: GLYPHS.folderOpened,
  branch: GLYPHS.branch,
  time: GLYPHS.history,
  error: GLYPHS.error,
  clear: GLYPHS.polarisCheck,
  anomaly: GLYPHS.polarisAlert,
  alert: GLYPHS.polarisError,
  incursion: GLYPHS.polarisOff,
  board: GLYPHS.board,
  classified: GLYPHS.classified,
};

/** La fuente TrueType. Fecha fija: sale idéntica en cada compilación. */
async function buildTtf() {
  const { SVGIcons2SVGFontStream } = await import('svgicons2svgfont');
  const svg2ttf = require('svg2ttf');
  const svgFont = await new Promise((resolve, reject) => {
    let out = '';
    // 1 em = 16 px de la rejilla. El descenso deja el icono centrado en las mayúsculas del texto
    // y centerHorizontally centra el dibujo en sus dos celdas: en un bloque, el mismo margen a cada lado.
    const stream = new SVGIcons2SVGFontStream({ fontName: PROMPT_FONT.family, fontHeight: 1024, descent: 160, normalize: true, centerHorizontally: true });
    stream.on('data', (/** @type {Buffer} */ d) => (out += d.toString()));
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
    for (const [name, code] of Object.entries(ICON_CODES)) {
      const s = /** @type {any} */ (Readable.from([toBoxSvg(PROMPT_GLYPHS[/** @type {keyof typeof ICON_CODES} */ (name)]())]));
      s.metadata = { name, unicode: [String.fromCodePoint(code)] };
      stream.write(s);
    }
    stream.end();
  });
  // Avance de una celda monoespaciada (0,6 em, como Overpass Mono, Space Mono
  // o Cascadia): el dibujo, de 1 em y centrado en dos celdas, desborda sobre
  // el espacio que lleva detrás, como las fuentes de iconos de terminal.
  const monoCell = /** @type {string} */ (svgFont).replace(/horiz-adv-x="[\d.]+"/g, `horiz-adv-x="${ADVANCE}"`);
  return Buffer.from(svg2ttf(monoCell, { description: 'Bureau prompt icons (original, MIT)', url: 'https://github.com/Normalxxnavi/bureau-theme', ts: 1767225600 }).buffer);
}

async function main() {
  for (const name of Object.keys(ICON_CODES)) if (!(name in PROMPT_GLYPHS)) throw new Error(`Falta el glifo de ${name}`);
  const ttf = await buildTtf();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, ttf);
  console.log(`✔ fonts/${PROMPT_FONT.file} (${Object.keys(ICON_CODES).length} glifos, ${(ttf.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { OS_GLYPHS, PROMPT_GLYPHS };
