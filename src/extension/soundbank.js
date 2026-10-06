// @ts-check
'use strict';

/**
 * Decide qué archivo .wav suena: el de la carpeta personalizada del usuario si
 * existe, y si no, el del pack incluido en la extensión.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Expande `~` y `${userHome}` y exige una ruta absoluta. Devuelve null si la
 * carpeta no es usable.
 * @param {string} folder
 */
function normalizeCustomFolder(folder) {
  if (!folder) return null;
  let f = folder.trim();
  if (f === '~' || f.startsWith('~/') || f.startsWith('~\\')) f = path.join(os.homedir(), f.slice(1));
  f = f.replace(/\$\{userHome\}/g, os.homedir());
  if (!path.isAbsolute(f)) return null;
  return path.normalize(f);
}

/**
 * @param {{extensionPath: string, pack: import('./catalog').Pack, customFolder: string, file: string}} o
 * @returns {{path: string, source: 'custom' | 'pack'}}
 */
function resolveSoundFile({ extensionPath, pack, customFolder, file }) {
  const custom = normalizeCustomFolder(customFolder);
  if (custom) {
    const candidate = path.join(custom, file);
    if (fs.existsSync(candidate)) return { path: candidate, source: 'custom' };
  }
  return { path: path.join(extensionPath, 'sounds', pack, file), source: 'pack' };
}

module.exports = { normalizeCustomFolder, resolveSoundFile };
