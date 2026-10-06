// @ts-check
'use strict';

/**
 * Reproductor genérico para macOS y Linux: lanza un programa del sistema por
 * cada sonido (afplay, paplay…). Arrancan muy rápido, así que no hace falta
 * mantener un proceso abierto. Un sonido nuevo corta el anterior, igual que en
 * Windows.
 */

const { spawn } = require('node:child_process');

/**
 * @param {string} command ruta absoluta del reproductor
 * @param {(file: string) => string[]} args
 * @param {import('./index').Log} log
 * @returns {import('./index').Player}
 */
function createProcessPlayer(command, args, log) {
  /** @type {import('node:child_process').ChildProcess | null} */
  let current = null;
  let disposed = false;

  return {
    available: true,
    play(file) {
      if (disposed) return;
      if (current && current.exitCode === null) current.kill();
      const child = spawn(command, args(file), { stdio: 'ignore' });
      child.on('error', (err) => log.warn(`Could not play with ${command}: ${err.message}`));
      child.on('exit', () => {
        if (current === child) current = null;
      });
      current = child;
    },
    dispose() {
      disposed = true;
      if (current && current.exitCode === null) current.kill();
      current = null;
    },
  };
}

module.exports = { createProcessPlayer };
