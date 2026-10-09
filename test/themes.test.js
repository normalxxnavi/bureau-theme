'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { palettes, buildTheme, themeFile, leafPaths } = require('../src/theme/build');
const color = require('../src/theme/color');

const ROOT = path.resolve(__dirname, '..');

test('los JSON de themes/ están actualizados (npm run build)', () => {
  for (const p of palettes) {
    const expected = JSON.stringify(buildTheme(p));
    assert.equal(fs.readFileSync(themeFile(p), 'utf8'), expected, `${p.id}: ejecuta npm run build`);
  }
});

test('las tres paletas definen los mismos roles', () => {
  const ref = leafPaths(palettes[0]);
  for (const p of palettes) assert.deepEqual(leafPaths(p), ref, p.id);
});

test('todos los colores generados son HEX válidos', () => {
  for (const p of palettes) {
    const t = buildTheme(p);
    for (const [k, v] of Object.entries(t.colors)) assert.match(v, /^#[0-9A-F]{6}([0-9A-F]{2})?$/, `${p.id} ${k}`);
    for (const r of t.tokenColors) if (r.settings.foreground) assert.match(r.settings.foreground, /^#[0-9A-F]{6}$/i, `${p.id} ${r.name}`);
  }
});

test('npm run contrast pasa (contrastes WCAG y regla «el rojo es del Hiss»)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'contrast.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.split('\n').filter((l) => l.includes('✘')).join('\n'));
});

test('utilidades de color', () => {
  assert.equal(color.alpha('#E0352B', 0.2), '#E0352B33');
  assert.equal(color.mix('#000000', '#FFFFFF', 0.5), '#808080');
  assert.equal(color.over('#FFFFFF80', '#000000'), '#808080');
  assert.equal(Math.round(color.contrast('#FFFFFF', '#000000')), 21);
  assert.equal(color.isRed('#E0352B'), true);
  assert.equal(color.isRed('#FF5A4E'), true);
  assert.equal(color.isRed('#D7906E'), false, 'el ladrillo de Resonant no cuenta como rojo');
  assert.equal(color.isRed('#6FCFDC'), false);
});
