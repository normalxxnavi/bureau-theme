// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade el módulo de sonidos opcional (desactivado
 * por defecto) y el indicador de lore de la barra de estado.
 */

const vscode = require('vscode');
const { SoundController } = require('./controller');
const { registerLocationIndicator } = require('./location');

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = vscode.window.createOutputChannel('CONTROL Theme', { log: true });
  const controller = new SoundController(context, log);

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('bureauTheme.toggleSounds', () => controller.toggle()),
    vscode.commands.registerCommand('bureauTheme.previewSounds', () => controller.preview()),
    vscode.commands.registerCommand('bureauTheme.openSoundSettings', () => controller.openSettings())
  );

  controller.init();
  const location = registerLocationIndicator(context);

  // API interna para el test de integración (test/integration). No es pública.
  return {
    get soundHistory() {
      return controller.history;
    },
    get soundsStarted() {
      return controller.started;
    },
    get locationText() {
      return location.text;
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
