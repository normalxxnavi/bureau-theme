// @ts-check
'use strict';

/**
 * Localiza la instalación local de VS Code (para validar claves y reutilizar
 * sus gramáticas TextMate). Se puede forzar con la variable VSCODE_PATH.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const APP = path.join('resources', 'app');

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
    if (fs.existsSync(path.join(dir, APP, 'package.json'))) return path.join(dir, APP);
    for (const sub of fs.readdirSync(dir)) {
      const nested = path.join(dir, sub, APP);
      if (fs.existsSync(path.join(nested, 'package.json'))) return nested;
    }
  }
  return null;
}

module.exports = { findAppRoot };
