// @ts-check
'use strict';

/**
 * Localiza la instalación local de VS Code (para validar claves y reutilizar
 * sus gramáticas TextMate) y su ejecutable (tests de integración y de popups).
 * Se puede forzar con la variable VSCODE_PATH.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/** `resources/app` en Windows y Linux; `Resources/app` en macOS (su disco puede distinguir mayúsculas). */
const APPS = [path.join('resources', 'app'), path.join('Resources', 'app')];

function candidates() {
  const dirs = [];
  if (process.env.VSCODE_PATH) dirs.push(process.env.VSCODE_PATH);
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    dirs.push(path.join(local, 'Programs', 'Microsoft VS Code'), 'C:\\Program Files\\Microsoft VS Code');
  } else if (process.platform === 'darwin') {
    dirs.push('/Applications/Visual Studio Code.app/Contents');
  } else {
    dirs.push('/usr/share/code', '/opt/visual-studio-code');
  }
  return dirs;
}

/**
 * Devuelve la carpeta `resources/app` de VS Code o `null`. Las versiones
 * recientes en Windows la guardan dentro de una subcarpeta con hash.
 */
function findAppRoot() {
  for (const dir of candidates()) {
    if (!fs.existsSync(dir)) continue;
    for (const app of APPS) if (fs.existsSync(path.join(dir, app, 'package.json'))) return path.join(dir, app);
    for (const sub of fs.readdirSync(dir)) {
      for (const app of APPS) {
        const nested = path.join(dir, sub, app);
        if (fs.existsSync(path.join(nested, 'package.json'))) return nested;
      }
    }
  }
  return null;
}

/** El ejecutable de VS Code: el de VSCODE_EXECUTABLE (la CI descarga uno limpio) o el de la instalación local. */
function codeExecutable() {
  if (process.env.VSCODE_EXECUTABLE) return process.env.VSCODE_EXECUTABLE;
  const appRoot = findAppRoot();
  if (!appRoot) throw new Error('No se encontró VS Code. Define VSCODE_PATH o VSCODE_EXECUTABLE (npm run download-vscode).');
  if (process.platform === 'win32') {
    // <instalación>/<hash>/resources/app → <instalación>/Code.exe (o <hash>/Code.exe)
    for (const up of ['../../..', '../..']) {
      const exe = path.resolve(appRoot, up, 'Code.exe');
      if (fs.existsSync(exe)) return exe;
    }
  } else if (process.platform === 'darwin') {
    // <app>/Contents/Resources/app → <app>/Contents/MacOS/Code (Electron en versiones antiguas)
    for (const name of ['Code', 'Electron']) {
      const exe = path.resolve(appRoot, '..', '..', 'MacOS', name);
      if (fs.existsSync(exe)) return exe;
    }
  } else {
    return path.resolve(appRoot, '..', '..', 'code');
  }
  throw new Error('No se encontró el ejecutable de VS Code');
}

module.exports = { findAppRoot, codeExecutable };
