// @ts-check
'use strict';

/**
 * Regenera las imágenes del README (images/screenshots/) desde cero:
 *
 *   npm run screenshots                         → todas
 *   npm run screenshots -- control-dark,icons-dark → solo copiar esas (con las capturas ya hechas)
 *
 * 1. Empaqueta la extensión y una pequeña extensión auxiliar (cmd-probe) que
 *    abre la consola de sonido para su captura.
 * 2. shots.js: instala el .vsix en un perfil limpio de VS Code, crea un
 *    proyecto de demostración (con Git y una tarea de tests) y captura la
 *    ventana con cada tema (PrintWindow, capture.ps1).
 * 3. publish.js: copia las capturas tal cual a images/screenshots/ (sin
 *    fondos ni textos: son la ventana real de VS Code).
 *
 * Solo Windows. Abre y cierra varias ventanas de VS Code: no toques el ratón
 * mientras se capturan (unos 5 minutos).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { WORK } = require('./env');

const ROOT = path.resolve(__dirname, '..', '..');
const only = process.argv[2];

if (process.platform !== 'win32') {
  console.error('Las capturas usan la API de ventanas de Windows (PrintWindow): solo funcionan en Windows.');
  process.exit(1);
}

/** @param {string[]} args @param {string} [cwd] */
function node(args, cwd = ROOT) {
  const r = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const vsce = path.join(ROOT, 'node_modules', '@vscode', 'vsce', 'vsce');
const raw = path.join(WORK, 'raw');
fs.mkdirSync(raw, { recursive: true });

if (!only) {
  const vsix = path.join(WORK, 'bureau-theme.vsix');
  const probe = path.join(WORK, 'cmd-probe.vsix');
  node([vsce, 'package', '--out', vsix]);
  node([vsce, 'package', '--no-dependencies', '--allow-missing-repository', '--skip-license', '--out', probe], path.join(__dirname, 'cmd-probe'));
  node([path.join(__dirname, 'shots.js'), ROOT, raw, path.join(WORK, 'profile'), vsix, probe]);
}
node([path.join(__dirname, 'publish.js'), raw, path.join(ROOT, 'images', 'screenshots'), ...(only ? [only] : [])]);
console.log(`\n✔ images/screenshots/ actualizado (trabajo en ${WORK})`);
