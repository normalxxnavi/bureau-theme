'use strict';

/**
 * El HUD del Bureau (hud-text.js): el texto de la barra de estado con datos
 * inventados.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { hudText, encodingName, fileText } = require('../src/extension/hud-text');

const base = { line: 13, column: 1, lines: 240, selected: 0, cursors: 1, insertSpaces: true, tabSize: 2, encoding: 'utf8', eol: /** @type {'LF'} */ ('LF'), language: 'Markdown' };

test('HUD: posición, sangría, codificación, fin de línea y lenguaje en un solo elemento', () => {
  assert.equal(hudText(base), '$(bureau-dossier) 13:1 │ ␣2 │ UTF-8 · LF │ $(bracket) MARKDOWN');
  assert.equal(hudText({ ...base, insertSpaces: false, tabSize: 4, eol: 'CRLF' }), '$(bureau-dossier) 13:1 │ ⇥4 │ UTF-8 · CRLF │ $(bracket) MARKDOWN', 'tabuladores y CRLF');
  assert.ok(hudText({ ...base, selected: 12 }).includes(' 13:1 (12) │'), 'con selección, los caracteres');
  assert.ok(hudText({ ...base, selected: 12, cursors: 3 }).includes(' 13:1 +2 │'), 'con varios cursores, cuántos más');
  assert.equal(fileText({ ...base, encoding: undefined }), 'LF', 'VS Code anterior a la 1.100: sin la codificación');
  assert.ok(!hudText({ ...base, language: 'Evil $(bureau-house)' }).includes('$(bureau-house)'), 'un nombre de lenguaje no puede pintar iconos');
});

test('HUD: la codificación como en la barra de estado de VS Code', () => {
  assert.equal(encodingName('utf8'), 'UTF-8');
  assert.equal(encodingName('utf8bom'), 'UTF-8 BOM');
  assert.equal(encodingName('utf16le'), 'UTF-16 LE');
  assert.equal(encodingName('windows1252'), 'WINDOWS-1252');
  assert.equal(encodingName('iso88591'), 'ISO-88591');
  assert.equal(encodingName('shiftjis'), 'SHIFTJIS');
});
