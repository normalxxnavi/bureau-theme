// @ts-check
'use strict';

/**
 * Elige el reproductor según el sistema operativo.
 *
 * VS Code no ofrece ninguna API de audio a las extensiones, así que se usa el
 * reproductor que trae cada sistema:
 *   Windows → PowerShell + System.Media.SoundPlayer (proceso persistente)
 *   macOS   → afplay
 *   Linux   → paplay (PulseAudio/PipeWire), pw-play o aplay (ALSA)
 */

const fs = require('node:fs');
const path = require('node:path');
const { createWindowsPlayer } = require('./windows');
const { createProcessPlayer } = require('./process-player');

/**
 * @typedef {{debug(msg: string): void, info(msg: string): void, warn(msg: string): void}} Log
 * @typedef {{available: boolean, play(file: string): void, dispose(): void}} Player
 */

/**
 * Busca un ejecutable en el PATH y devuelve su ruta absoluta.
 *
 * Solo se miran carpetas con ruta absoluta: una entrada relativa del PATH
 * («.», «node_modules/.bin»…) se resolvería contra la carpeta actual, que puede
 * ser la del proyecto abierto, y un proyecto malicioso podría colar ahí su
 * propio «paplay».
 * @param {string} name
 * @param {string} [envPath]
 */
function which(name, envPath = process.env.PATH || '') {
  for (const dir of envPath.split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir)) continue;
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // siguiente
    }
  }
  return null;
}

/** PATH para los programas del sistema: primero sus carpetas de siempre y después el del usuario. */
const systemPath = () => ['/usr/bin', '/bin', '/usr/local/bin', process.env.PATH || ''].join(path.delimiter);

/** @type {Player} */
const UNAVAILABLE = { available: false, play() {}, dispose() {} };

/**
 * @param {Log} log
 * @param {NodeJS.Platform} [platform]
 * @returns {Player}
 */
function createPlayer(log, platform = process.platform) {
  if (platform === 'win32') return createWindowsPlayer(log);

  if (platform === 'darwin') {
    return createProcessPlayer('/usr/bin/afplay', (file) => [file], log);
  }

  const linuxPlayers = /** @type {const} */ ([
    ['paplay', (/** @type {string} */ file) => [file]],
    ['pw-play', (/** @type {string} */ file) => [file]],
    ['aplay', (/** @type {string} */ file) => ['-q', file]],
  ]);
  for (const [name, args] of linuxPlayers) {
    const bin = which(name, systemPath());
    if (bin) {
      log.debug(`Audio player: ${bin}`);
      return createProcessPlayer(bin, args, log);
    }
  }
  return UNAVAILABLE;
}

module.exports = { createPlayer, which, systemPath };
