'use strict';

/**
 * Cobertura de lenguajes: los cuatro temas dan color a todos los scopes
 * estándar de TextMate que usan las gramáticas de unos 240 lenguajes
 * (paquete tm-grammars, el que usa Shiki; solo en desarrollo). Así un lenguaje
 * poco común no se queda con partes de su código en el color de texto.
 *
 * Los lenguajes que trae VS Code se comprueban además token a token con sus
 * muestras de test-workspace/ (npm run preview -- --check).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { palettes, buildTheme } = require('../src/theme/build');
const { loadTmGrammars, uncoveredScopes, grammarScopes, isStandard, themeMatcher } = require('../scripts/lib/scopes');

const grammars = loadTmGrammars();

test('hay gramáticas de más de 200 lenguajes para comprobar', () => {
  assert.ok(grammars.length > 200, `solo ${grammars.length} gramáticas: ¿está instalado tm-grammars?`);
  for (const name of ['rust', 'go', 'kotlin', 'swift', 'haskell', 'elixir', 'zig', 'vue', 'svelte', 'terraform', 'cobol', 'fortran-free-form']) {
    assert.ok(grammars.some(([n]) => n === name), `falta la gramática de ${name}`);
  }
});

for (const p of palettes) {
  test(`${p.label}: todos los scopes estándar de todas las gramáticas tienen color`, () => {
    const missing = uncoveredScopes(buildTheme(p).tokenColors, grammars);
    const list = [...missing].map(([scope, langs]) => `${scope} (${langs.slice(0, 3).join(', ')})`);
    assert.deepEqual(list, []);
  });
}

test('el analizador de scopes distingue familias estándar y prefijos', () => {
  assert.ok(isStandard('entity.name.section.ada'));
  assert.ok(isStandard('keyword.control.zig'));
  assert.ok(!isStandard('meta.function.go'));
  assert.ok(!isStandard('markup.list.numbered.markdown'), 'el texto de las listas va con el color de texto');
  assert.ok(!isStandard('functionline.ahk'));
  const covered = themeMatcher([{ scope: ['entity.name'], settings: { foreground: '#ffffff' } }]);
  assert.ok(covered('entity.name.section.ada'));
  assert.ok(!covered('entity.named'));
  const scopes = grammarScopes({ name: 'Lang', patterns: [{ name: 'a.b $1.c', captures: { 1: { name: 'd.e' } } }] });
  assert.deepEqual([...scopes].sort(), ['a.b', 'd.e']);
});
