'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FONT_SETS, FONT_SETTINGS, settingsFor, resolveFontSet, isApplied, registryName, fontStack, fallbackFonts, isOwnValue } = require('../src/extension/fontsets');
const { installFonts, uninstallFonts, uninstallAllFonts, REG_KEY } = require('../src/extension/font-installer');

const ROOT = path.resolve(__dirname, '..');

test('settingsFor: monoespaciada en editor/terminal/código y proporcional en chat/Markdown', () => {
  const s = settingsFor('bureau');
  assert.equal(s['editor.fontFamily'], "'Interstate Mono', 'Overpass Mono', monospace");
  assert.equal(s['terminal.integrated.fontFamily'], s['editor.fontFamily']);
  assert.equal(s['chat.fontFamily'], "'Interstate', 'Overpass', sans-serif");
  assert.equal(settingsFor('resonant')['editor.fontFamily'], "'Space Mono', monospace");
  assert.deepEqual(Object.keys(s).sort(), Object.keys(FONT_SETTINGS).sort());
  assert.equal(fontStack(['A B'], 'serif'), "'A B', serif");
});

test('resolveFontSet', () => {
  assert.equal(resolveFontSet('none', 'CONTROL Dark'), null);
  assert.equal(resolveFontSet('bureau', 'Default Dark Modern'), 'bureau', 'un juego fijo se aplica con cualquier tema');
  assert.equal(resolveFontSet('resonant', 'CONTROL Dark'), 'resonant');
  assert.equal(resolveFontSet('auto', 'CONTROL Resonant'), 'resonant');
  assert.equal(resolveFontSet('auto', 'CONTROL Astral'), 'bureau');
  assert.equal(resolveFontSet('auto', 'Default Dark Modern'), null, 'según el tema: con otros temas, la del usuario');
  assert.equal(resolveFontSet('auto', undefined), null);
});

// Valores por defecto de VS Code 1.142 en Windows.
const DEFAULTS = {
  'editor.fontFamily': "Consolas, 'Courier New', monospace",
  'terminal.integrated.fontFamily': '',
  'debug.console.fontFamily': 'default',
  'chat.editor.fontFamily': 'default',
  'chat.fontFamily': 'default',
  'markdown.preview.fontFamily': "-apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif",
};

test('la fuente anterior va detrás: al desinstalar (sin las fuentes) VS Code vuelve sola a ella', () => {
  const none = fallbackFonts({}, DEFAULTS);
  assert.equal(none['editor.fontFamily'], DEFAULTS['editor.fontFamily']);
  assert.equal(none['terminal.integrated.fontFamily'], DEFAULTS['editor.fontFamily'], '"" en la terminal es «la del editor»');
  assert.equal(none['chat.editor.fontFamily'], DEFAULTS['editor.fontFamily'], '«default» es «la del editor»');
  assert.equal(none['chat.fontFamily'], 'system-ui', 'el chat usa la fuente de la interfaz');
  const s = settingsFor('bureau', none);
  assert.equal(s['editor.fontFamily'], "'Interstate Mono', 'Overpass Mono', Consolas, 'Courier New', monospace");
  assert.equal(s['chat.fontFamily'], "'Interstate', 'Overpass', system-ui, sans-serif");
  assert.equal(s['markdown.preview.fontFamily'], `'Interstate', 'Overpass', ${DEFAULTS['markdown.preview.fontFamily']}`);

  const mine = fallbackFonts({ 'editor.fontFamily': "'Fira Code', monospace", 'terminal.integrated.fontFamily': null }, DEFAULTS);
  assert.equal(mine['terminal.integrated.fontFamily'], "'Fira Code', monospace", 'la terminal sigue a la fuente del usuario en el editor');
  assert.equal(fontStack(['Space Mono'], 'monospace', "'Space Mono', Menlo"), "'Space Mono', Menlo, monospace", 'sin repetir fuentes y con la genérica al final');
  assert.equal(fontStack(['A B'], 'serif', 'C, serif'), "'A B', C, serif");
});

test('isOwnValue: lo que escribe la extensión, con la fuente anterior detrás o sin ella (hasta la 0.7)', () => {
  const fallbacks = fallbackFonts({}, DEFAULTS);
  assert.ok(isOwnValue('editor.fontFamily', settingsFor('resonant', fallbacks)['editor.fontFamily'], fallbacks));
  assert.ok(isOwnValue('editor.fontFamily', "'Interstate Mono', 'Overpass Mono', monospace", fallbacks), 'valor de la 0.7');
  assert.ok(!isOwnValue('editor.fontFamily', "'Fira Code', monospace", fallbacks), 'una fuente del usuario no es de la extensión');
  assert.ok(!isOwnValue('editor.fontFamily', null, fallbacks));
});

test('isApplied y registryName', () => {
  assert.equal(isApplied(settingsFor('bureau'), 'bureau'), true);
  assert.equal(isApplied({ ...settingsFor('bureau'), 'chat.fontFamily': 'Arial' }, 'bureau'), false);
  assert.equal(registryName({ family: 'Space Mono', style: 'Bold Italic' }), 'Space Mono Bold Italic (TrueType)');
  assert.equal(registryName({ family: 'Overpass Mono', style: '' }), 'Overpass Mono (TrueType)');
});

test('cada juego de fuentes incluye sus archivos y su licencia OFL', () => {
  for (const [id, set] of Object.entries(FONT_SETS)) {
    for (const f of set.files) {
      const p = path.join(ROOT, 'fonts', f.file);
      assert.ok(fs.existsSync(p), `falta fonts/${f.file}`);
      const tag = fs.readFileSync(p).readUInt32BE(0);
      assert.ok(tag === 0x00010000 || tag === 0x74727565, `${f.file} no es TrueType`);
    }
    const licenses = fs.readdirSync(path.join(ROOT, 'fonts', id)).filter((f) => f.startsWith('OFL'));
    assert.ok(licenses.length > 0, `falta la licencia OFL de ${id}`);
    for (const l of licenses) assert.match(fs.readFileSync(path.join(ROOT, 'fonts', id, l), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
  }
});

test('installFonts / uninstallFonts en Windows (carpeta temporal y registro simulado)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fonts-'));
  /** @type {string[][]} */
  const calls = [];
  const run = (/** @type {string} */ cmd, /** @type {string[]} */ args) => {
    calls.push([path.basename(cmd), ...args]);
    return { status: 0 };
  };
  try {
    const files = FONT_SETS.resonant.files;
    const installed = installFonts(path.join(ROOT, 'fonts'), files, { platform: 'win32', fontsDir: dir, run });
    assert.equal(installed.length, files.length);
    for (const p of installed) {
      assert.ok(fs.existsSync(p));
      assert.ok(path.basename(p).startsWith('BureauTheme-'), 'los archivos llevan prefijo para identificarlos');
    }
    const adds = calls.filter((c) => c[1] === 'add');
    assert.equal(adds.length, files.length);
    assert.deepEqual(adds[0].slice(0, 6), ['reg.exe', 'add', REG_KEY, '/v', 'Space Mono (TrueType)', '/t']);

    // Reinstalar no vuelve a copiar archivos idénticos.
    installFonts(path.join(ROOT, 'fonts'), files, { platform: 'win32', fontsDir: dir, run });

    assert.equal(uninstallFonts(files, { platform: 'win32', fontsDir: dir, run }), files.length);
    assert.equal(calls.filter((c) => c[1] === 'delete').length, files.length);
    assert.equal(fs.readdirSync(dir).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('al desinstalar se borran las copias de la extensión y nada más', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fonts-'));
  const run = () => ({ status: 0 });
  try {
    for (const set of Object.values(FONT_SETS)) installFonts(path.join(ROOT, 'fonts'), set.files, { platform: 'win32', fontsDir: dir, run });
    fs.writeFileSync(path.join(dir, 'Overpass-Regular.ttf'), 'del usuario');
    const all = Object.values(FONT_SETS).reduce((n, set) => n + set.files.length, 0);
    assert.equal(uninstallAllFonts({ platform: 'win32', fontsDir: dir, run }), all);
    assert.deepEqual(fs.readdirSync(dir), ['Overpass-Regular.ttf'], 'las fuentes que el usuario instaló por su cuenta se quedan');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts['vscode:uninstall'], 'node ./dist/uninstall.js');
  assert.match(fs.readFileSync(path.join(ROOT, 'scripts', 'bundle.js'), 'utf8'), /build\('uninstall'/, 'dist/uninstall.js se genera con el resto');
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src', 'extension', 'uninstall.js'), 'utf8'), /require\('vscode'\)/, 'al desinstalar no hay API de VS Code');
});

test('installFonts en Linux refresca la caché de fuentes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fonts-'));
  /** @type {string[]} */
  const cmds = [];
  try {
    const run = (/** @type {string} */ cmd) => (cmds.push(cmd), { status: 0 });
    installFonts(path.join(ROOT, 'fonts'), FONT_SETS.bureau.files, { platform: 'linux', fontsDir: dir, run, fcCache: '/usr/bin/fc-cache' });
    assert.deepEqual(cmds, ['/usr/bin/fc-cache'], 'fc-cache se lanza con su ruta absoluta');
    // Sin fc-cache en el sistema no se lanza nada (ni se busca en la carpeta del proyecto).
    installFonts(path.join(ROOT, 'fonts'), FONT_SETS.bureau.files, { platform: 'linux', fontsDir: dir, run, fcCache: null });
    assert.equal(cmds.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
