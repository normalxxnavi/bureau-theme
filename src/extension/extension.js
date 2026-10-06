// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color no necesitan código: VS Code los lee de package.json. Este
 * archivo solo existe para el módulo de sonidos opcional, que está desactivado
 * por defecto.
 */

const vscode = require('vscode');
const { SoundController } = require('./controller');

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
}

function deactivate() {}

module.exports = { activate, deactivate };
