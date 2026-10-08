// @ts-check
'use strict';

/**
 * Añade color a una fuente TrueType con las tablas COLR (v0) y CPAL (v0), sin
 * dependencias. Cada glifo «base» se pinta como una pila de capas: otros glifos
 * de la misma fuente, cada uno con un color de la paleta o con el color del
 * texto (0xFFFF). Los programas sin soporte de color siguen viendo el glifo
 * base, que se deja tal cual (versión monocroma).
 *
 * Chromium (y por tanto VS Code) dibuja COLR en fuentes web desde hace años.
 */

/** Color del texto: la capa sigue al tema, como un icono normal. */
const FOREGROUND = 0xffff;

/**
 * @typedef {{code: number, layers: Array<{code: number, color: string | null}>}} ColorGlyph
 *   `code` y `layers[].code` son puntos de código (los glifos se buscan en `cmap`);
 *   `color` es `#RRGGBB` o `null` para el color del texto.
 */

/** @param {Buffer} font */
function readTables(font) {
  const numTables = font.readUInt16BE(4);
  /** @type {Map<string, Buffer>} */
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = font.toString('latin1', rec, rec + 4);
    const offset = font.readUInt32BE(rec + 8);
    const length = font.readUInt32BE(rec + 12);
    tables.set(tag, font.subarray(offset, offset + length));
  }
  return { sfntVersion: font.readUInt32BE(0), tables };
}

/** Punto de código → id de glifo, con la subtabla de formato 4 (BMP) de `cmap`. */
function cmapLookup(/** @type {Buffer} */ cmap) {
  const n = cmap.readUInt16BE(2);
  let sub = -1;
  for (let i = 0; i < n; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(offset) === 4 && (platform === 3 || platform === 0) && (encoding === 1 || platform === 0)) sub = offset;
  }
  if (sub < 0) throw new Error('cmap sin subtabla de formato 4');
  const segX2 = cmap.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  return (/** @type {number} */ code) => {
    for (let s = 0; s < segX2; s += 2) {
      if (code > cmap.readUInt16BE(ends + s)) continue;
      const start = cmap.readUInt16BE(starts + s);
      if (code < start) return 0;
      const delta = cmap.readInt16BE(deltas + s);
      const range = cmap.readUInt16BE(ranges + s);
      if (range === 0) return (code + delta) & 0xffff;
      const g = cmap.readUInt16BE(ranges + s + range + (code - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
}

function checksum(/** @type {Buffer} */ b) {
  const padded = Buffer.alloc((b.length + 3) & ~3);
  b.copy(padded);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

/** Vuelve a montar el sfnt con las tablas dadas (orden, alineación y sumas de control). */
function writeFont(/** @type {number} */ sfntVersion, /** @type {Map<string, Buffer>} */ tables) {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  const pow = 2 ** Math.floor(Math.log2(n));
  const header = Buffer.alloc(12 + n * 16);
  header.writeUInt32BE(sfntVersion, 0);
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(Math.log2(pow), 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);

  // `head.checkSumAdjustment` se calcula al final, con el valor a 0.
  const head = Buffer.from(/** @type {Buffer} */ (tables.get('head')));
  head.writeUInt32BE(0, 8);
  tables.set('head', head);

  /** @type {Buffer[]} */
  const body = [];
  let offset = header.length;
  tags.forEach((tag, i) => {
    const data = /** @type {Buffer} */ (tables.get(tag));
    const rec = 12 + i * 16;
    header.write(tag, rec, 'latin1');
    header.writeUInt32BE(checksum(data), rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(data.length, rec + 12);
    const padded = Buffer.alloc((data.length + 3) & ~3);
    data.copy(padded);
    body.push(padded);
    offset += padded.length;
  });
  const font = Buffer.concat([header, ...body]);
  const headOffset = font.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headOffset + 8);
  return font;
}

/**
 * Devuelve una copia de `ttf` con las tablas COLR y CPAL.
 * @param {Buffer} ttf
 * @param {ColorGlyph[]} glyphs
 */
function addColorTables(ttf, glyphs) {
  const { sfntVersion, tables } = readTables(ttf);
  const gid = cmapLookup(/** @type {Buffer} */ (tables.get('cmap')));
  const numGlyphs = /** @type {Buffer} */ (tables.get('maxp')).readUInt16BE(4);
  const lookup = (/** @type {number} */ code) => {
    const g = gid(code);
    if (g <= 0 || g >= numGlyphs) throw new Error(`Glifo no encontrado para U+${code.toString(16).toUpperCase()}`);
    return g;
  };

  // Paleta: un color por entrada, en el orden en que aparecen.
  /** @type {string[]} */
  const palette = [];
  const paletteIndex = (/** @type {string | null} */ c) => {
    if (c === null) return FOREGROUND;
    const hex = c.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex)) throw new Error(`Color no válido: ${c}`);
    if (!palette.includes(hex)) palette.push(hex);
    return palette.indexOf(hex);
  };

  const bases = glyphs.map((g) => ({ gid: lookup(g.code), layers: g.layers.map((l) => ({ gid: lookup(l.code), palette: paletteIndex(l.color) })) }));
  bases.sort((a, b) => a.gid - b.gid);

  const numLayers = bases.reduce((s, b) => s + b.layers.length, 0);
  const colr = Buffer.alloc(14 + bases.length * 6 + numLayers * 4);
  colr.writeUInt16BE(0, 0);
  colr.writeUInt16BE(bases.length, 2);
  colr.writeUInt32BE(14, 4);
  colr.writeUInt32BE(14 + bases.length * 6, 8);
  colr.writeUInt16BE(numLayers, 12);
  let layer = 0;
  bases.forEach((b, i) => {
    colr.writeUInt16BE(b.gid, 14 + i * 6);
    colr.writeUInt16BE(layer, 16 + i * 6);
    colr.writeUInt16BE(b.layers.length, 18 + i * 6);
    for (const l of b.layers) {
      const at = 14 + bases.length * 6 + layer * 4;
      colr.writeUInt16BE(l.gid, at);
      colr.writeUInt16BE(l.palette, at + 2);
      layer++;
    }
  });

  const cpal = Buffer.alloc(14 + palette.length * 4);
  cpal.writeUInt16BE(0, 0); // versión
  cpal.writeUInt16BE(palette.length, 2); // entradas por paleta
  cpal.writeUInt16BE(1, 4); // una paleta
  cpal.writeUInt16BE(palette.length, 6); // registros de color
  cpal.writeUInt32BE(14, 8);
  cpal.writeUInt16BE(0, 12); // la paleta 0 empieza en el registro 0
  palette.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    cpal.writeUInt8(n & 0xff, 14 + i * 4); // azul
    cpal.writeUInt8((n >> 8) & 0xff, 15 + i * 4); // verde
    cpal.writeUInt8(n >> 16, 16 + i * 4); // rojo
    cpal.writeUInt8(0xff, 17 + i * 4); // alfa
  });

  tables.set('COLR', colr);
  tables.set('CPAL', cpal);
  return writeFont(sfntVersion, tables);
}

module.exports = { addColorTables, readTables, cmapLookup, FOREGROUND };
