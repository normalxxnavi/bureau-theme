// @ts-check
'use strict';

/**
 * Herramientas y carpetas de trabajo para las capturas (solo Windows).
 * Ruta de VS Code detectada o forzada con VSCODE_PATH.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findAppRoot } = require('../lib/vscode-install');

/** Carpeta de trabajo (perfil temporal y capturas en bruto). */
const WORK = path.join(os.tmpdir(), 'bureau-screenshots');

/** VS Code instalado: ejecutable, `cli.js` y carpeta `out` (iconos codicon, bundle). */
function vscode() {
  const appRoot = findAppRoot();
  if (!appRoot) throw new Error('No se encontró VS Code. Define VSCODE_PATH con la carpeta de instalación.');
  const exe = ['../../..', '../..'].map((up) => path.resolve(appRoot, up, 'Code.exe')).find((p) => fs.existsSync(p));
  if (!exe) throw new Error('No se encontró Code.exe');
  return { exe, cliJs: path.join(appRoot, 'out', 'cli.js'), out: path.join(appRoot, 'out') };
}

/** Entorno para lanzar VS Code desde una terminal de VS Code sin que se conecte a la ventana actual. */
function cleanEnv() {
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k === 'ELECTRON_RUN_AS_NODE' || k.startsWith('VSCODE_')) delete env[k];
  return env;
}

module.exports = { WORK, vscode, cleanEnv };
