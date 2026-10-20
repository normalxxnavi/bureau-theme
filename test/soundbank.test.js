'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeCustomFolder, resolveSoundFile } = require('../src/extension/soundbank');
const { which, linuxPlayer } = require('../src/extension/player');
const { isFilePath } = require('../src/extension/player/windows');

test('normalizeCustomFolder', () => {
  assert.equal(normalizeCustomFolder(''), null);
  assert.equal(normalizeCustomFolder('relativa/sonidos'), null, 'las rutas relativas no se aceptan');
  assert.equal(normalizeCustomFolder('~/sonidos'), path.join(os.homedir(), 'sonidos'));
  assert.equal(normalizeCustomFolder('${userHome}/sonidos'), path.join(os.homedir(), 'sonidos'));
  // Rutas de red y de dispositivo: nunca (abrirlas conecta con otro equipo).
  for (const p of ['\\\\servidor\\sonidos', '//servidor/sonidos', '\\\\?\\C:\\sonidos', '\\\\.\\pipe\\x']) assert.equal(normalizeCustomFolder(p), null, p);
});

test('el reproductor de Windows solo acepta rutas absolutas de archivo (nunca URL)', () => {
  assert.ok(isFilePath('C:\\Users\\jesse\\save.wav'));
  assert.ok(isFilePath('d:/sonidos/save.wav'));
  assert.ok(isFilePath('\\\\servidor\\perfiles\\jesse\\.vscode\\extensions\\save.wav'), 'la extensión puede estar en un perfil de red');
  for (const p of ['http://example.com/save.wav', 'file://C:/save.wav', 'save.wav', 'sonidos\\save.wav']) assert.ok(!isFilePath(p), p);
});

test('resolveSoundFile prefiere la carpeta personalizada y si no, el pack', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-sounds-'));
  try {
    fs.writeFileSync(path.join(dir, 'save.wav'), 'x');
    const ext = path.join(dir, 'extension');

    const custom = resolveSoundFile({ extensionPath: ext, pack: 'control', customFolder: dir, file: 'save.wav' });
    assert.deepEqual(custom, { path: path.join(dir, 'save.wav'), source: 'custom' });

    const fallback = resolveSoundFile({ extensionPath: ext, pack: 'resonant', customFolder: dir, file: 'error.wav' });
    assert.deepEqual(fallback, { path: path.join(ext, 'sounds', 'resonant', 'error.wav'), source: 'pack' });

    const none = resolveSoundFile({ extensionPath: ext, pack: 'control', customFolder: '', file: 'save.wav' });
    assert.equal(none.source, 'pack');

    // Una carpeta con el nombre de un sonido no se intenta leer.
    fs.mkdirSync(path.join(dir, 'commit.wav'));
    assert.equal(resolveSoundFile({ extensionPath: ext, pack: 'control', customFolder: dir, file: 'commit.wav' }).source, 'pack');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('which encuentra ejecutables en el PATH indicado', () => {
  const node = which(path.basename(process.execPath), path.dirname(process.execPath));
  assert.equal(node && path.resolve(node), path.resolve(process.execPath));
  assert.equal(which('programa-que-no-existe-123', path.dirname(process.execPath)), null);
  // Las entradas relativas del PATH se ignoran: apuntarían a la carpeta del proyecto abierto.
  const rel = path.relative(process.cwd(), path.dirname(process.execPath));
  if (rel && !path.isAbsolute(rel)) assert.equal(which(path.basename(process.execPath), rel), null);
  assert.equal(which(path.basename(process.execPath), '.'), null);
});

test('Linux: elige paplay, pw-play o aplay y, en Flatpak, el reproductor del sistema', () => {
  const only = (/** @type {string[]} */ names) => (/** @type {string} */ n) => (names.includes(n) ? `/usr/bin/${n}` : null);
  assert.equal(linuxPlayer(only(['paplay', 'aplay']), false)?.bin, '/usr/bin/paplay');
  assert.deepEqual(linuxPlayer(only(['aplay']), false)?.args('/s/a.wav'), ['-q', '/s/a.wav']);
  assert.equal(linuxPlayer(only([]), false), null);
  // Fuera de Flatpak, flatpak-spawn no se usa aunque exista.
  assert.equal(linuxPlayer(only(['flatpak-spawn']), false), null);
  const flatpak = linuxPlayer(only(['flatpak-spawn']), true);
  assert.equal(flatpak?.bin, '/usr/bin/flatpak-spawn');
  assert.deepEqual(flatpak?.args('/home/j/.vscode/a.wav'), ['--host', 'paplay', '/home/j/.vscode/a.wav']);
});
