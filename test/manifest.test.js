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

/**
 * Nivel momentáneo (máximo en ventanas de 100 ms) por encima de 200 Hz: lo que
 * suena en cualquier altavoz.
 * @param {Buffer} buf @param {ReturnType<typeof parseWav>} info
 */
function audibleDb(buf, info) {
  const D = require('../scripts/sounds/dsp');
  let b = new Float32Array(info.dataLength / 2);
  for (let k = 0; k < b.length; k++) b[k] = buf.readInt16LE(info.dataOffset + k * 2) / 32768;
  b = D.filter(D.filter(b, D.biquad('highpass', 200)), D.biquad('highpass', 200));
  const w = Math.round(0.1 * info.sampleRate);
  let best = 0;
  for (let i = 0; i === 0 || i + w <= b.length; i += Math.round(w / 4)) {
    let s = 0;
    const end = Math.min(b.length, i + w);
    for (let j = i; j < end; j++) s += b[j] * b[j];
    best = Math.max(best, s / (end - i));
  }
  return 10 * Math.log10(best || 1e-12);
}

test('cada pack tiene todos los sonidos (y sus variantes), son WAV PCM válidos y se oyen', () => {
  for (const pack of PACKS) {
    for (const { file, variants = 1 } of Object.values(SOUNDS)) {
      for (let n = 1; n <= variants; n++) {
        const name = n === 1 ? file : file.replace('.wav', `-${n}.wav`);
        const p = path.join(ROOT, 'sounds', pack, name);
        assert.ok(fs.existsSync(p), `falta sounds/${pack}/${name}`);
        const buf = fs.readFileSync(p);
        const info = parseWav(buf);
        assert.equal(info.format, 1, `${pack}/${name}: PCM`);
        assert.equal(info.bitsPerSample, 16, `${pack}/${name}: 16 bits`);
        // Nivel medio suficiente para oírse con música de fondo (antes había sonidos a -27 dBFS).
        let sum = 0;
        for (let i = info.dataOffset; i < info.dataOffset + info.dataLength; i += 2) sum += (buf.readInt16LE(i) / 32768) ** 2;
        const rmsDb = 10 * Math.log10(sum / (info.dataLength / 2));
        assert.ok(rmsDb > -20.5, `${pack}/${name}: demasiado bajo (${rmsDb.toFixed(1)} dBFS RMS)`);
        // Y se oye en un portátil o con auriculares pequeños: nivel momentáneo
        // (100 ms) por encima de 200 Hz. Antes había sonidos a -30 dB, casi todo graves.
        assert.ok(audibleDb(buf, info) > -22, `${pack}/${name}: casi todo graves (${audibleDb(buf, info).toFixed(1)} dB por encima de 200 Hz)`);
      }
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

/** Tablas de una fuente WOFF 1.0 (descomprimidas). */
function woffTables(/** @type {Buffer} */ woff) {
  const zlib = require('node:zlib');
  /** @type {Map<string, Buffer>} */
  const tables = new Map();
  for (let i = 0; i < woff.readUInt16BE(12); i++) {
    const at = 44 + i * 20;
    const offset = woff.readUInt32BE(at + 4);
    const comp = woff.readUInt32BE(at + 8);
    const orig = woff.readUInt32BE(at + 12);
    const data = woff.subarray(offset, offset + comp);
    tables.set(woff.toString('latin1', at, at + 4), comp < orig ? zlib.inflateSync(data) : data);
  }
  return tables;
}

test('los dos temas de iconos internos (product icons) apuntan a fuentes válidas y a glifos existentes', () => {
  const { GLYPHS, MAPPING, CONTRIBUTED } = require('../scripts/product-icons');
  const codes = new Set(Object.keys(GLYPHS).map((_, i) => (0xe001 + i).toString(16).toUpperCase()));
  assert.deepEqual(
    pkg.contributes.productIconThemes.map((/** @type {any} */ t) => t.id),
    ['bureau-product-icons', 'bureau-product-icons-color']
  );
  for (const entry of pkg.contributes.productIconThemes) {
    const file = path.join(ROOT, entry.path);
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    const woff = path.join(path.dirname(file), theme.fonts[0].src[0].path);
    assert.equal(fs.readFileSync(woff).toString('latin1', 0, 4), 'wOFF');
    for (const [id, def] of Object.entries(theme.iconDefinitions)) {
      assert.ok(codes.has(/** @type {any} */ (def).fontCharacter.slice(1)), `${id}: glifo inexistente`);
      assert.ok(id in MAPPING || id in CONTRIBUTED, id);
    }
    // La barra de actividad y la rama de Git están cubiertas.
    for (const id of ['explorer-view-icon', 'search-view-icon', 'source-control-view-icon', 'run-view-icon', 'extensions-view-icon', 'git-branch', 'copilot']) {
      assert.ok(id in theme.iconDefinitions, `${entry.id}: ${id}`);
    }
  }
});

test('la versión a color lleva tablas COLR/CPAL coherentes (capas y colores existentes)', () => {
  const { cmapLookup } = require('../scripts/lib/colr');
  const { GLYPHS, COLOR } = require('../scripts/product-icons');
  const tables = woffTables(fs.readFileSync(path.join(ROOT, 'product-icons', 'bureau-product-icons-color.woff')));
  const colr = /** @type {Buffer} */ (tables.get('COLR'));
  const cpal = /** @type {Buffer} */ (tables.get('CPAL'));
  assert.ok(colr && cpal, 'faltan las tablas COLR/CPAL');
  const numGlyphs = /** @type {Buffer} */ (tables.get('maxp')).readUInt16BE(4);
  const entries = cpal.readUInt16BE(2);
  const numBase = colr.readUInt16BE(2);
  const baseAt = colr.readUInt32BE(4);
  const layerAt = colr.readUInt32BE(8);
  const numLayers = colr.readUInt16BE(12);
  assert.equal(numBase, Object.keys(COLOR).length);

  let previous = -1;
  for (let i = 0; i < numBase; i++) {
    const gid = colr.readUInt16BE(baseAt + i * 6);
    assert.ok(gid > previous, 'los glifos base deben ir ordenados');
    previous = gid;
    const first = colr.readUInt16BE(baseAt + i * 6 + 2);
    const n = colr.readUInt16BE(baseAt + i * 6 + 4);
    assert.ok(n > 0 && first + n <= numLayers);
  }
  // TODOS los glifos tienen color y ninguna capa se queda con el color del tema (0xFFFF).
  assert.equal(numBase, Object.keys(GLYPHS).length, 'hay glifos sin color');
  for (let i = 0; i < numLayers; i++) {
    assert.ok(colr.readUInt16BE(layerAt + i * 4) < numGlyphs, 'capa con un glifo inexistente');
    const palette = colr.readUInt16BE(layerAt + i * 4 + 2);
    assert.ok(palette < entries, 'capa sin color real (sigue al tema) o con un color inexistente');
  }
  // El teléfono de la Hotline tiene color (es un glifo base de COLR).
  const gid = cmapLookup(/** @type {Buffer} */ (tables.get('cmap')));
  const hotline = gid(0xe001 + Object.keys(GLYPHS).indexOf('hotline'));
  const bases = Array.from({ length: numBase }, (_, i) => colr.readUInt16BE(baseAt + i * 6));
  assert.ok(bases.includes(hotline));
});

test('los iconos propios (barra de estado, consola de sonido) apuntan a glifos de la fuente', () => {
  const { GLYPHS, CONTRIBUTED } = require('../scripts/product-icons');
  const names = Object.keys(GLYPHS);
  const icons = pkg.contributes.icons;
  assert.deepEqual(Object.keys(icons).sort(), Object.keys(CONTRIBUTED).sort());
  for (const [id, [glyph]] of Object.entries(CONTRIBUTED)) {
    const def = icons[id].default;
    assert.ok(fs.existsSync(path.join(ROOT, def.fontPath)), `${id}: falta la fuente`);
    assert.equal(def.fontCharacter, `\\${(0xe001 + names.indexOf(glyph)).toString(16).toUpperCase()}`, `${id}: punto de código desfasado`);
  }
  // Los iconos que usan el código y los comandos existen.
  const used = new Set();
  const dir = path.join(ROOT, 'src', 'extension');
  for (const f of fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.js'))) {
    for (const m of fs.readFileSync(path.join(dir, String(f)), 'utf8').matchAll(/\$\((bureau-[a-z-]+)\)/g)) used.add(m[1]);
  }
  for (const c of pkg.contributes.commands) if (c.icon) used.add(c.icon.slice(2, -1));
  assert.ok(used.has('bureau-classified') && used.has('bureau-alert') && used.has('bureau-board'));
  for (const id of used) assert.ok(id in icons, `icono sin registrar: ${id}`);
});

test('la guía de bienvenida: cada paso tiene su imagen, una frase del Consejo y comandos que existen', () => {
  const [walkthrough] = pkg.contributes.walkthroughs;
  assert.equal(walkthrough.id, 'welcome', 'setup.js abre la guía con este id');
  const commands = new Set(pkg.contributes.commands.map((/** @type {any} */ c) => c.command));
  const builtin = ['workbench.action.selectIconTheme', 'workbench.action.selectProductIconTheme'];
  for (const nls of [readJson('package.nls.json'), readJson('package.nls.es.json')]) {
    for (const step of walkthrough.steps) {
      assert.ok(fs.existsSync(path.join(ROOT, step.media.svg)), `falta ${step.media.svg}`);
      const description = nls[step.description.slice(1, -1)];
      assert.match(description, /^<<[^<>]+>>\n/, `${step.id}: empieza con una frase del Consejo`);
      // Botones `[texto](command:id)` y `[texto](command:id?argumentos)`.
      const buttons = [...description.matchAll(/\]\(command:([\w.]+)(?:\?[^)]*)?\)/g)].map((m) => m[1]);
      assert.ok(buttons.length > 0, `${step.id}: sin botón`);
      for (const cmd of buttons) assert.ok(commands.has(cmd) || builtin.includes(cmd), `${step.id}: comando inexistente ${cmd}`);
    }
  }
  for (const step of walkthrough.steps) {
    for (const event of step.completionEvents) {
      const m = /^onCommand:(.+)$/.exec(event);
      if (m) assert.ok(commands.has(m[1]), event);
      else assert.match(event, /^onSettingChanged:[\w.]+$/, event);
    }
  }
  // Los temas de iconos que aplica «el set completo» existen.
  assert.ok(pkg.contributes.iconThemes.some((/** @type {any} */ t) => t.id === 'bureau-icons'));
  for (const id of ['bureau-product-icons', 'bureau-product-icons-color']) assert.ok(pkg.contributes.productIconThemes.some((/** @type {any} */ t) => t.id === id));
});

test('los protocolos de la Agencia están apagados por defecto y sus valores coinciden con el código', () => {
  const { PROTOCOL_SWITCHES } = require('../src/extension/config');
  const { DEFAULT_KEYWORDS } = require('../src/extension/redact');
  for (const key of Object.values(PROTOCOL_SWITCHES)) assert.equal(properties[key]?.default, false, key);
  assert.deepEqual(properties['bureauTheme.classified.keywords'].default, DEFAULT_KEYWORDS);
  assert.ok(properties['bureauTheme.classified.files'].default.includes('.env'));
  assert.equal(pkg.contributes.colors[0].id, 'bureauTheme.classifiedBar');
});

test('el icono de la Casa Inmemorial de la barra de estado la abre, se puede ocultar y está activado por defecto', () => {
  const { STATUS_BAR_ITEM, LEGACY_STATUS_BAR_ITEM } = require('../src/extension/config');
  const item = properties[STATUS_BAR_ITEM];
  assert.equal(item.type, 'boolean');
  assert.equal(item.default, true);
  assert.ok(!(LEGACY_STATUS_BAR_ITEM in properties), 'el ajuste antiguo (solo de sonido) ya no se declara');
  const src = fs.readFileSync(path.join(ROOT, 'src', 'extension', 'status.js'), 'utf8');
  assert.match(src, /command = 'bureauTheme\.openOldestHouse'/);
  assert.match(src, /text = '\$\(bureau-house\)'/);
});

test('la tipografía es opcional y solo se configura en los ajustes de usuario', () => {
  const font = properties['bureauTheme.font'];
  assert.equal(font.default, 'none');
  assert.equal(font.scope, 'application');
  assert.deepEqual(font.enum, ['none', 'bureau', 'resonant', 'auto']);
});

test('en áreas de trabajo no confiables se ignoran los ajustes de sonido del área de trabajo', () => {
  const untrusted = pkg.capabilities.untrustedWorkspaces;
  assert.equal(untrusted.supported, 'limited');
  assert.ok(untrusted.description, 'falta la explicación del modo restringido');
  // Todo ajuste de sonido que un área de trabajo pueda fijar está en la lista (los de ámbito «application» solo se leen del usuario).
  const expected = Object.entries(properties)
    .filter(([key, p]) => key.startsWith('bureauTheme.sounds.') && /** @type {any} */ (p).scope !== 'application')
    .map(([key]) => key)
    .sort();
  assert.deepEqual([...untrusted.restrictedConfigurations].sort(), expected);
  assert.equal(properties['bureauTheme.sounds.customFolder'].scope, 'application', 'la carpeta de sonidos propios solo en ajustes de usuario');
});

test('Marketplace: categorías válidas y como mucho 30 etiquetas (palabras clave + las que añade vsce)', () => {
  // Lista de https://code.visualstudio.com/api/references/extension-manifest (más «AI» y «Chat»).
  const allowed = ['Programming Languages', 'Snippets', 'Linters', 'Themes', 'Debuggers', 'Formatters', 'Keymaps', 'SCM Providers', 'Other', 'Extension Packs', 'Language Packs', 'Data Science', 'Machine Learning', 'Visualization', 'Notebooks', 'Education', 'Testing', 'AI', 'Chat'];
  for (const c of pkg.categories) assert.ok(allowed.includes(c), `categoría no válida: ${c}`);
  assert.ok(pkg.categories.includes('Themes'));
  const auto = ['theme', 'color-theme', 'icon-theme', 'product-icon-theme'];
  const tags = new Set([...pkg.keywords, ...auto]);
  assert.equal(tags.size, pkg.keywords.length + auto.length, 'palabras clave repetidas o iguales a una etiqueta automática');
  assert.ok(tags.size <= 30, `${tags.size} etiquetas: el Marketplace admite 30`);
});

test('las imágenes del README existen en el repositorio (la página de detalles las lee de GitHub)', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(images.length >= 5);
  for (const img of images) {
    assert.ok(!/^https?:/.test(img), `${img}: usa una ruta relativa del repositorio`);
    assert.ok(fs.existsSync(path.join(ROOT, img)), `falta ${img}`);
    assert.ok(img.endsWith('.png'), `${img}: el Marketplace no admite SVG propios`);
  }
});
