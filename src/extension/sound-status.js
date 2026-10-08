// @ts-check
'use strict';

/**
 * Icono discreto de la barra de estado para los sonidos: la «resonancia»
 * (encendida o apagada). Al pulsarlo se abre la consola de sonido, así nadie
 * tiene que tocar settings.json. Se puede ocultar con el ajuste
 * `bureauTheme.sounds.statusBarItem`, desde la propia consola, con el comando
 * «Mostrar/ocultar el icono de sonido» o con el menú contextual de la barra.
 *
 * Es lo único del módulo de sonido que existe al arrancar: la consola se carga
 * la primera vez que se abre.
 */

const vscode = require('vscode');
const { SECTION } = require('./config');

const VISIBLE_KEY = 'statusBarItem';

class SoundStatus {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    /** @type {vscode.StatusBarItem | undefined} */
    this.item = undefined;
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(SECTION)) this.refresh();
      }),
      { dispose: () => this.item?.dispose() }
    );
    this.refresh();
  }

  visible() {
    return vscode.workspace.getConfiguration(SECTION).get(VISIBLE_KEY) !== false;
  }

  async setVisible(/** @type {boolean} */ show) {
    await vscode.workspace.getConfiguration(SECTION).update(VISIBLE_KEY, show, vscode.ConfigurationTarget.Global);
  }

  refresh() {
    if (!this.visible()) {
      this.item?.dispose();
      this.item = undefined;
      return;
    }
    if (!this.item) {
      this.item = vscode.window.createStatusBarItem('bureauTheme.sounds', vscode.StatusBarAlignment.Right, -100);
      this.item.name = vscode.l10n.t('CONTROL Sounds');
      this.item.command = 'bureauTheme.soundMenu';
    }
    const c = vscode.workspace.getConfiguration(SECTION);
    const on = c.get('enabled') === true;
    const state = on ? vscode.l10n.t('On') : vscode.l10n.t('Off');
    this.item.text = on ? '$(bureau-resonance)' : '$(bureau-resonance-off)';
    const tooltip = new vscode.MarkdownString(
      `**${vscode.l10n.t('CONTROL Sounds')}** · ${state}\n\n${vscode.l10n.t('Click to open the sound console: turn sounds on, pick a pack, volume and events.')}`
    );
    tooltip.supportThemeIcons = true;
    this.item.tooltip = tooltip;
    this.item.accessibilityInformation = { label: `${vscode.l10n.t('CONTROL Sounds')}: ${state}`, role: 'button' };
    this.item.show();
  }
}

module.exports = { SoundStatus, VISIBLE_KEY };
