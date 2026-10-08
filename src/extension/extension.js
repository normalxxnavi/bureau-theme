// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade el módulo de sonidos opcional (desactivado
 * por defecto) y las tipografías opcionales inspiradas en los juegos.
 *
 * `activate` solo registra comandos y listeners y vuelve enseguida: el trabajo
 * inicial se hace en el siguiente turno y el motor de sonido, el instalador de
 * fuentes y el canal de log se cargan la primera vez que hacen falta.
 */

const vscode = require('vscode');
const { SoundController } = require('./controller');
const { FontController } = require('./fonts');

/**
 * Canal de log que se crea la primera vez que se escribe en él (en un arranque
 * normal, con los sonidos desactivados, no se escribe nada).
 * @param {vscode.ExtensionContext} context
 * @returns {vscode.LogOutputChannel}
 */
function lazyLog(context) {
  /** @type {vscode.LogOutputChannel | undefined} */
  let channel;
  const get = () => {
    if (!channel) {
      channel = vscode.window.createOutputChannel('CONTROL Theme', { log: true });
      context.subscriptions.push(channel);
    }
    return channel;
  };
  return /** @type {any} */ ({
    trace: (/** @type {string} */ m) => get().trace(m),
    debug: (/** @type {string} */ m) => get().debug(m),
    info: (/** @type {string} */ m) => get().info(m),
    warn: (/** @type {string} */ m) => get().warn(m),
    error: (/** @type {string | Error} */ m) => get().error(m),
    show: () => get().show(),
  });
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = lazyLog(context);
  const controller = new SoundController(context, log);
  const fonts = new FontController(context, log);

  context.subscriptions.push(
    vscode.commands.registerCommand('bureauTheme.toggleSounds', () => controller.toggle()),
    vscode.commands.registerCommand('bureauTheme.previewSounds', () => controller.preview()),
    vscode.commands.registerCommand('bureauTheme.openSoundSettings', () => controller.openSettings()),
    vscode.commands.registerCommand('bureauTheme.chooseFont', () => fonts.choose()),
    vscode.commands.registerCommand('bureauTheme.removeFonts', () => fonts.removeFonts())
  );

  controller.init();
  fonts.init();

  // API interna para el test de integración (test/integration). No es pública.
  return {
    get soundHistory() {
      return controller.history;
    },
    get soundsStarted() {
      return controller.started;
    },
    /** Espera a que termine la sincronización de tipografías en curso. */
    fontsIdle() {
      return fonts.queue;
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
