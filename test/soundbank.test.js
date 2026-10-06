'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeCustomFolder, resolveSoundFile } = require('../src/extension/soundbank');
const { which } = require('../src/extension/player');

test('normalizeCustomFolder', () => {
  assert.equal(normalizeCustomFolder(''), null);
  assert.equal(normalizeCustomFolder('relativa/sonidos'), null, 'las rutas relativas no se aceptan');
  assert.equal(normalizeCustomFolder('~/sonidos'), path.join(os.homedir(), 'sonidos'));
  assert.equal(normalizeCustomFolder('${userHome}/sonidos'), path.join(os.homedir(), 'sonidos'));
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
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('which encuentra ejecutables en el PATH indicado', () => {
  const node = which(path.basename(process.execPath), path.dirname(process.execPath));
  assert.equal(node && path.resolve(node), path.resolve(process.execPath));
  assert.equal(which('programa-que-no-existe-123', path.dirname(process.execPath)), null);
});
