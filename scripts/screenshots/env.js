// @ts-check
'use strict';

/**
 * Herramientas y carpetas de trabajo para las capturas (solo Windows).
 * Rutas detectadas o forzadas con VSCODE_PATH / BROWSER_PATH.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findAppRoot } = require('../lib/vscode-install');

/** Carpeta de trabajo (perfiles temporales, capturas en bruto, HTML intermedio). */
const WORK = path.join(os.tmpdir(), 'bureau-screenshots');

/** VS Code instalado: ejecutable, `cli.js` y carpeta `out` (iconos codicon, bundle). */
function vscode() {
  const appRoot = findAppRoot();
  if (!appRoot) throw new Error('No se encontró VS Code. Define VSCODE_PATH con la carpeta de instalación.');
  const exe = ['../../..', '../..'].map((up) => path.resolve(appRoot, up, 'Code.exe')).find((p) => fs.existsSync(p));
  if (!exe) throw new Error('No se encontró Code.exe');
  return { exe, cliJs: path.join(appRoot, 'out', 'cli.js'), out: path.join(appRoot, 'out') };
}

/** Navegador Chromium para renderizar las composiciones HTML (Edge o Chrome). */
function browser() {
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidates = [
    process.env.BROWSER_PATH,
    path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  const found = candidates.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error('No se encontró Edge ni Chrome. Define BROWSER_PATH.');
  return found;
}

/** Entorno para lanzar VS Code desde una terminal de VS Code sin que se conecte a la ventana actual. */
function cleanEnv() {
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k === 'ELECTRON_RUN_AS_NODE' || k.startsWith('VSCODE_')) delete env[k];
  return env;
}

module.exports = { WORK, vscode, browser, cleanEnv };
