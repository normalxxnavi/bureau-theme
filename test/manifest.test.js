'use strict';

/**
 * Coherencia entre package.json, traducciones, catálogo de sonidos y archivos.
 * Estos fallos no los detecta nadie hasta que un usuario abre los ajustes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SOUNDS, EVENTS, PACKS } = require('../src/extension/catalog');
const { SECTION } = require('../src/extension/config');
const { parseWav } = require('../src/extension/volume');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const readJson = (/** @type {string} */ f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const properties = Object.assign({}, ...pkg.contributes.configuration.map((/** @type {any} */ c) => c.properties));

test('cada evento del catálogo tiene su ajuste y viceversa', () => {
  const fromPkg = Object.keys(properties)
    .filter((k) => k.startsWith(`${SECTION}.events.`))
    .map((k) => k.slice(`${SECTION}.events.`.length))
    .sort();
  assert.deepEqual(fromPkg, [...EVENTS].sort());
});

test('los sonidos están desactivados por defecto', () => {
  assert.equal(properties[`${SECTION}.enabled`].default, false);
});

test('la carpeta personalizada solo se puede fijar en los ajustes de usuario', () => {
  assert.equal(properties[`${SECTION}.customFolder`].scope, 'application');
});

test('cada pack tiene todos los sonidos y son WAV PCM válidos', () => {
  for (const pack of PACKS) {
    for (const { file } of Object.values(SOUNDS)) {
      const p = path.join(ROOT, 'sounds', pack, file);
      assert.ok(fs.existsSync(p), `falta sounds/${pack}/${file}`);
      const info = parseWav(fs.readFileSync(p));
      assert.equal(info.format, 1, `${pack}/${file}: PCM`);
      assert.equal(info.bitsPerSample, 16, `${pack}/${file}: 16 bits`);
    }
  }
});

test('la descripción de customFolder lista exactamente los archivos del catálogo', () => {
  const nls = readJson('package.nls.json');
  const listed = [...nls['config.sounds.customFolder'].matchAll(/`([\w-]+\.wav)`/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, Object.values(SOUNDS).map((s) => s.file).sort());
});

test('package.nls.json y package.nls.es.json tienen las mismas claves y cubren package.json', () => {
  const en = readJson('package.nls.json');
  const es = readJson('package.nls.es.json');
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  const used = [...JSON.stringify(pkg).matchAll(/"%([\w.]+)%"/g)].map((m) => m[1]);
  for (const key of used) assert.ok(key in en, `falta "${key}" en package.nls.json`);
});

test('todos los textos de vscode.l10n.t tienen traducción al español', () => {
  const bundle = readJson('l10n/bundle.l10n.es.json');
  const dir = path.join(ROOT, 'src', 'extension');
  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.js'));
  const strings = new Set();
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, String(f)), 'utf8');
    for (const m of src.matchAll(/l10n\.t\(\s*'((?:[^'\\]|\\.)*)'/g)) strings.add(m[1].replace(/\\'/g, "'"));
  }
  assert.ok(strings.size > 10);
  for (const s of strings) assert.ok(s in bundle, `sin traducción: "${s}"`);
  for (const key of Object.keys(bundle)) assert.ok(strings.has(key), `traducción que ya no se usa: "${key}"`);
});

test('los temas de package.json apuntan a archivos generados y coinciden con las paletas', () => {
  const { palettes } = require('../src/theme/build');
  const themes = pkg.contributes.themes;
  assert.deepEqual(themes.map((/** @type {any} */ t) => t.label), palettes.map((p) => p.label));
  for (const t of themes) {
    assert.ok(fs.existsSync(path.join(ROOT, t.path)), t.path);
    assert.equal(readJson(t.path).name, t.label);
  }
});

test('los comandos declarados se registran en extension.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'extension', 'extension.js'), 'utf8');
  for (const c of pkg.contributes.commands) assert.ok(src.includes(`'${c.command}'`), c.command);
});

test('el tema de iconos apunta a SVG que existen y son válidos', () => {
  const iconTheme = pkg.contributes.iconThemes[0];
  const file = path.join(ROOT, iconTheme.path);
  const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(file);
  for (const [id, def] of Object.entries(theme.iconDefinitions)) {
    const svgPath = path.join(dir, /** @type {any} */ (def).iconPath);
    assert.ok(fs.existsSync(svgPath), `${id}: falta ${svgPath}`);
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 16 16">[\s\S]*<\/svg>\n$/, id);
    for (const tag of svg.matchAll(/<\w+([^>]*)>/g)) {
      const attrs = [...tag[1].matchAll(/ ([\w-]+)=/g)].map((m) => m[1]);
      assert.equal(new Set(attrs).size, attrs.length, `${id}: atributo duplicado en ${tag[0]}`);
    }
    assert.ok(!/<text[^>]*>[^<]*[<>&][^<]*<\/text>/.test(svg.replace(/&(amp|lt|gt);/g, '')), `${id}: texto sin escapar`);
  }
  const used = new Set();
  const collect = (/** @type {any} */ m) => {
    for (const v of Object.values(m)) {
      if (typeof v === 'string') used.add(v);
      else if (v && typeof v === 'object') collect(v);
    }
  };
  collect({ ...theme, iconDefinitions: undefined, hidesExplorerArrows: undefined });
  for (const id of used) assert.ok(id in theme.iconDefinitions, `referencia a un icono inexistente: ${id}`);
  assert.ok(theme.light && theme.light.file, 'debe tener variante para temas claros');
});

test('el indicador de la barra de estado conoce el lugar de cada tema', () => {
  const { palettes } = require('../src/theme/build');
  const src = fs.readFileSync(path.join(ROOT, 'src', 'extension', 'location.js'), 'utf8');
  for (const p of palettes) {
    assert.ok(src.includes(`'${p.label}': {\n    location: '${p.location}'`), `${p.label} → ${p.location}`);
  }
  assert.equal(properties['bureauTheme.statusBar.showLocation'].default, true);
  assert.ok(pkg.contributes.colors.some((/** @type {any} */ c) => c.id === 'bureauTheme.statusBar.location'));
});
