// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade el módulo de sonidos opcional (desactivado
 * por defecto) y las tipografías opcionales inspiradas en los juegos.
 */

const vscode = require('vscode');
const { SoundController } = require('./controller');
const { FontController } = require('./fonts');

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = vscode.window.createOutputChannel('CONTROL Theme', { log: true });
  const controller = new SoundController(context, log);
  const fonts = new FontController(context, log);

  context.subscriptions.push(
    log,
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
