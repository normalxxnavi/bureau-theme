'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FONT_SETS, FONT_SETTINGS, settingsFor, resolveFontSet, isApplied, registryName, fontStack } = require('../src/extension/fontsets');
const { installFonts, uninstallFonts, REG_KEY } = require('../src/extension/font-installer');

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
