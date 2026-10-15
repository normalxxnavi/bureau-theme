// @ts-check
'use strict';

/**
 * Nitidez de los iconos: VS Code los pinta a 16 px (24 px en la barra de
 * actividad). Un borde horizontal o vertical que no cae justo entre dos
 * píxeles se ve borroso en una pantalla al 100 %. Estos tests recorren todos
 * los SVG de Bureau Icons y todos los glifos de Bureau Product Icons.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse, trace, union, subtract, toText } = require('../scripts/lib/pixel-art');

const ROOT = path.resolve(__dirname, '..');
const EPS = 1e-6;
const isInt = (/** @type {number} */ v) => Math.abs(v - Math.round(v)) < EPS;

/**
 * Bordes horizontales o verticales fuera de la rejilla de una lista de polígonos.
 * @param {Array<Array<[number, number]>>} polys @param {number} size
 */
function offGrid(polys, size) {
  const bad = [];
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % p.length];
      if (Math.abs(y1 - y2) < EPS && !isInt(y1)) bad.push(`horizontal y=${y1}`);
      if (Math.abs(x1 - x2) < EPS && !isInt(x1)) bad.push(`vertical x=${x1}`);
      for (const v of [x1, y1]) if (v < -EPS || v > size + EPS) bad.push(`fuera del icono (${x1}, ${y1})`);
    }
  }
  return bad;
}

/** Polígonos de los atributos `d` (solo M, L y Z, como los genera glyph-kit) y de los `<rect>`. @param {string} svg */
function svgPolys(svg) {
  /** @type {Array<Array<[number, number]>>} */
  const polys = [];
  for (const [, d] of svg.matchAll(/ d="([^"]*)"/g)) {
    assert.match(d, /^[MLZ0-9 .-]*$/, `path con comandos inesperados: ${d.slice(0, 40)}`);
    for (const sub of d.split('Z').filter(Boolean)) {
      const nums = sub.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
      /** @type {Array<[number, number]>} */
      const p = [];
      for (let i = 0; i < nums.length; i += 2) p.push([nums[i], nums[i + 1]]);
      polys.push(p);
    }
  }
  for (const [tag] of svg.matchAll(/<rect [^>]*>/g)) {
    const a = (/** @type {string} */ k) => Number(tag.match(new RegExp(` ${k}="([^"]*)"`))?.[1] ?? 0);
    const [x, y, w, h] = [a('x'), a('y'), a('width'), a('height')];
    polys.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  }
  return polys;
}

test('Bureau Icons: todos los bordes rectos de los 498 SVG caen en píxeles enteros', () => {
  const dir = path.join(ROOT, 'icons', 'svg');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
  assert.ok(files.length > 400);
  for (const f of files) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!svg.includes('<text'), `${f}: el texto SVG se ve borroso a 16 px; usa scripts/lib/label-font.js`);
    assert.ok(!/transform=/.test(svg), `${f}: las transformaciones sacan los bordes de la rejilla`);
    assert.deepEqual(offGrid(svgPolys(svg), 16), [], f);
  }
});

test('Bureau Product Icons: todos los bordes rectos de cada glifo caen en píxeles enteros (16 px; 24 px en la barra de actividad)', () => {
  const { GLYPHS, GRID24, MAPPING } = require('../scripts/product-icons');
  for (const [name, glyph] of Object.entries(GLYPHS)) {
    assert.deepEqual(offGrid(glyph(), GRID24.has(name) ? 24 : 16), [], name);
  }
  // La barra de actividad usa las versiones de 24 px.
  for (const id of ['explorer-view-icon', 'search-view-icon', 'source-control-view-icon', 'run-view-icon', 'extensions-view-icon']) {
    assert.ok(GRID24.has(/** @type {Record<string, string>} */ (MAPPING)[id]), id);
  }
});

test('pixel-art: dibujo → contornos (relleno horario, huecos antihorarios) y operaciones', () => {
  const area = (/** @type {Array<[number, number]>} */ p) => p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0) / 2;
  // Marco de 4 × 4 con hueco de 2 × 2: un contorno exterior y uno interior.
  const ringArt = parse('####\n#..#\n#..#\n####');
  const polys = trace(ringArt);
  assert.equal(polys.length, 2);
  assert.deepEqual(polys.map(area).sort((a, b) => a - b), [-4, 16]);
  // Medios píxeles: un rombo de 2 × 2 tiene área 2 y bordes a 45°.
  const diamond = trace(parse('JL\n7F'));
  assert.equal(diamond.length, 1);
  assert.equal(area(diamond[0]), 2);
  // Unión y resta.
  const full = parse('####\n####\n####\n####');
  assert.equal(toText(union(ringArt, parse('....\n.##.\n.##.\n....'))), toText(full));
  assert.equal(toText(subtract(full, ringArt)), '....\n.##.\n.##.\n....');
  assert.throws(() => parse('#x'), /Carácter no válido/);
});

test('las etiquetas de Bureau Icons tienen todas sus letras', () => {
  const { label } = require('../scripts/lib/label-font');
  for (const text of ['TS', 'C#', '{}', '</>', '@', 'Aa', '01', '>_', '$_', 'MW', 'NQ', 'VXYZ'.slice(0, 2), 'KR']) {
    assert.deepEqual(offGrid(label(text), 16), [], text);
  }
  assert.throws(() => label('ABC'), /máximo 2/);
});
