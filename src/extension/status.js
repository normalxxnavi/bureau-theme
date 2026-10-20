// @ts-check
'use strict';

/**
 * El icono de la Casa Inmemorial en la barra de estado. Al pulsarlo se abre
 * la Casa Inmemorial (tema, iconos, tipografía, sonidos, música y protocolos
 * de la Agencia), así nadie tiene que tocar settings.json. Se puede ocultar con el
 * ajuste `bureauTheme.statusBarItem`, desde la propia Casa, con el comando
 * «Mostrar/ocultar el icono de la Casa Inmemorial» o con el menú contextual de la barra.
 *
 * Es lo único de la Casa Inmemorial que existe al arrancar: el menú se carga
 * la primera vez que se abre.
 */

const vscode = require('vscode');
const { SECTION, PROTOCOL_SWITCHES, MUSIC, STATUS_BAR_ITEM, LEGACY_STATUS_BAR_ITEM } = require('./config');
const H = require('./hover');

/** Accesos directos que se pueden pulsar desde el popup. */
const POPUP_COMMANDS = ['bureauTheme.openOldestHouse', 'bureauTheme.soundMenu', 'bureauTheme.musicMenu', 'bureauTheme.boardSettings'];
const RED = '#E0352B';
const TEAL = '#2E9C8E';
const BADGE = { background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)' };

class ControlStatus {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    /** @type {vscode.StatusBarItem | undefined} */
    this.item = undefined;
  }

  init() {
    this.migrate();
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('bureauTheme')) this.refresh();
      }),
      { dispose: () => this.item?.dispose() }
    );
    this.refresh();
  }

  /** Quien había ocultado el antiguo icono de sonido tampoco ve el nuevo. */
  migrate() {
    const c = vscode.workspace.getConfiguration();
    if (c.inspect(LEGACY_STATUS_BAR_ITEM)?.globalValue === false && c.inspect(STATUS_BAR_ITEM)?.globalValue === undefined) {
      c.update(STATUS_BAR_ITEM, false, vscode.ConfigurationTarget.Global).then(undefined, () => {});
    }
  }

  visible() {
    return vscode.workspace.getConfiguration().get(STATUS_BAR_ITEM) !== false;
  }

  async setVisible(/** @type {boolean} */ show) {
    await vscode.workspace.getConfiguration().update(STATUS_BAR_ITEM, show, vscode.ConfigurationTarget.Global);
  }

  refresh() {
    if (!this.visible()) {
      this.item?.dispose();
      this.item = undefined;
      return;
    }
    if (!this.item) {
      this.item = vscode.window.createStatusBarItem('bureauTheme.panel', vscode.StatusBarAlignment.Right, -100);
      this.item.name = vscode.l10n.t('The Oldest House');
      this.item.command = 'bureauTheme.openOldestHouse';
      this.item.text = '$(bureau-house)';
      this.item.accessibilityInformation = { label: vscode.l10n.t('The Oldest House'), role: 'button' };
    }
    const c = vscode.workspace.getConfiguration();
    const soundsOn = c.get(`${SECTION}.enabled`) === true;
    const musicOn = c.get(`${MUSIC}.enabled`) === true;
    const state = (/** @type {string} */ name, /** @type {boolean} */ on) =>
      on ? H.pill(`${name} · ${vscode.l10n.t('ON')}`, TEAL) : H.pill(`${name} · ${vscode.l10n.t('OFF')}`, BADGE.background, BADGE.color);
    const protocols = /** @type {const} */ ([
      ['classified', vscode.l10n.t('Classified mode')],
      ['alertLevel', vscode.l10n.t('Alert level')],
      ['board', vscode.l10n.t('Board comments')],
      ['boardRandom', vscode.l10n.t('Board messages')],
    ])
      .filter(([key]) => c.get(PROTOCOL_SWITCHES[key]) === true)
      .map(([, name]) => H.pill(name, RED));
    const tooltip = new vscode.MarkdownString(
      H.card({
        image: H.hoverImage(this.context.extensionPath, 'oldest-house'),
        imageSize: 64,
        title: vscode.l10n.t('The Oldest House'),
        lines: [
          `<small>${H.escapeHtml(vscode.l10n.t('Theme, icons, typography, sounds, music and Bureau protocols in one place.'))}</small>`,
          `${state(vscode.l10n.t('Sounds'), soundsOn)} ${state(vscode.l10n.t('Jukebox'), musicOn)}`,
          protocols.length ? protocols.join(' ') : `<i>${H.escapeHtml(vscode.l10n.t('No Bureau protocols on'))}</i>`,
        ],
        rows: [
          [
            H.button('bureau-house', vscode.l10n.t('Open'), 'bureauTheme.openOldestHouse'),
            H.button('bureau-resonance', vscode.l10n.t('Sounds'), 'bureauTheme.soundMenu'),
            H.button('bureau-jukebox', vscode.l10n.t('Jukebox'), 'bureauTheme.musicMenu'),
            H.button('bureau-board', vscode.l10n.t('The Board'), 'bureauTheme.boardSettings'),
          ],
        ],
      }),
      true
    );
    tooltip.supportHtml = true;
    tooltip.isTrusted = { enabledCommands: POPUP_COMMANDS };
    H.setItem(this.item, { tooltip, visible: true });
  }
}

module.exports = { ControlStatus };
