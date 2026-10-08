// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade el módulo de sonidos opcional (desactivado
 * por defecto), su consola en la barra de estado y las tipografías opcionales.
 *
 * Arranque mínimo: `activate` solo registra comandos y listeners y vuelve
 * enseguida. El motor de sonido (`./controller`) se carga cuando los sonidos
 * están activados o se usa un comando de sonido, la consola (`./sound-menu`)
 * cuando se abre, y el canal de log la primera vez que se escribe en él.
 * En el paquete son archivos separados (scripts/bundle.js).
 */

const vscode = require('vscode');
const { SECTION } = require('./config');
const { FontController } = require('./fonts');
const { SoundStatus } = require('./sound-status');

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
  const fonts = new FontController(context, log);
  const status = new SoundStatus(context);

  /** @type {import('./controller').SoundController | undefined} */
  let controller;
  /** El motor de sonido, creado la primera vez que hace falta. */
  const sounds = () => {
    if (!controller) {
      const { SoundController } = require('./controller');
      controller = new SoundController(context, log);
      controller.init();
    }
    return controller;
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('bureauTheme.toggleSounds', () => sounds().toggle()),
    vscode.commands.registerCommand('bureauTheme.previewSounds', () => sounds().preview()),
    vscode.commands.registerCommand('bureauTheme.openSoundSettings', () => sounds().openSettings()),
    vscode.commands.registerCommand('bureauTheme.soundMenu', () => require('./sound-menu').openSoundMenu(sounds(), status)),
    vscode.commands.registerCommand('bureauTheme.toggleSoundStatusBar', () => status.setVisible(!status.visible())),
    vscode.commands.registerCommand('bureauTheme.chooseFont', () => fonts.choose()),
    vscode.commands.registerCommand('bureauTheme.removeFonts', () => fonts.removeFonts())
  );

  // Con los sonidos desactivados (lo normal) solo se vigila el interruptor.
  const enabled = () => vscode.workspace.getConfiguration(SECTION).get('enabled') === true;
  if (enabled()) sounds();
  else {
    const watch = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`${SECTION}.enabled`) && enabled()) {
        watch.dispose();
        sounds();
      }
    });
    context.subscriptions.push(watch);
  }

  fonts.init();
  status.init();

  // API interna para el test de integración (test/integration). No es pública.
  return {
    get soundHistory() {
      return controller?.history ?? [];
    },
    get soundsStarted() {
      return controller?.started ?? false;
    },
    /** Espera a que termine la sincronización de tipografías en curso. */
    fontsIdle() {
      return fonts.queue;
    },
    /** Texto del icono de sonido de la barra de estado (undefined si está oculto). */
    get soundStatusText() {
      return status.item?.text;
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
