// @ts-check
'use strict';

/**
 * Tipografías de los juegos: oferta al instalar, comando para elegir, modo
 * «según el tema» y restauración de la tipografía anterior.
 *
 * Flujo: ajuste `bureauTheme.font` (none | bureau | resonant | auto) →
 * se instalan las fuentes para el usuario → se cambian los ajustes de fuente
 * de VS Code (editor, terminal, consola de depuración, chat y vista previa de
 * Markdown) guardando antes una copia de los valores del usuario.
 */

const vscode = require('vscode');
const path = require('node:path');
const { FONT_SETS, FONT_SETTINGS, settingsFor, resolveFontSet } = require('./fontsets');
const { installFonts, uninstallFonts } = require('./font-installer');
const { readActiveThemeLabel, THEME_SETTING_KEYS } = require('./theme-state');

const SETTING = 'bureauTheme.font';
const BACKUP_KEY = 'fontBackup';
const APPLIED_KEY = 'fontApplied';
const OFFER_KEY = 'fontOfferShown';
const MODES = ['none', 'bureau', 'resonant', 'auto'];

class FontController {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {vscode.LogOutputChannel} log
   */
  constructor(context, log) {
    this.context = context;
    this.log = log;
    this.fontsRoot = path.join(context.extensionPath, 'fonts');
    /** Evita que dos sincronizaciones se pisen. */
    this.queue = Promise.resolve();
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(SETTING)) this.sync();
        else if (this.mode() === 'auto' && THEME_SETTING_KEYS.some((k) => e.affectsConfiguration(k))) this.sync({ quiet: true });
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        if (this.mode() === 'auto') this.sync({ quiet: true });
      })
    );
    this.sync({ quiet: true });
    this.offerOnce();
  }

  /** @returns {import('./fontsets').FontMode} */
  mode() {
    const v = vscode.workspace.getConfiguration().get(SETTING);
    return /** @type {any} */ (MODES.includes(/** @type {string} */ (v)) ? v : 'none');
  }

  /** Aplica o restaura según el modo y el tema activo. */
  sync(options = {}) {
    this.queue = this.queue.then(() => this.syncNow(options)).catch((err) => this.log.error(`Fonts: ${err.message}`));
    return this.queue;
  }

  /** @param {{quiet?: boolean}} options */
  async syncNow({ quiet = false }) {
    const target = resolveFontSet(this.mode(), readActiveThemeLabel());
    const applied = this.context.globalState.get(APPLIED_KEY);
    if (target === applied) return;
    if (target) await this.apply(target, quiet);
    else await this.restore(quiet);
  }

  /** @param {import('./fontsets').FontSetId} id @param {boolean} quiet */
  async apply(id, quiet) {
    try {
      const installed = installFonts(this.fontsRoot, FONT_SETS[id].files);
      this.log.info(`Fonts installed for the current user: ${installed.join(', ')}`);
    } catch (err) {
      vscode.window.showErrorMessage(vscode.l10n.t('CONTROL Theme could not install the fonts: {0}', /** @type {Error} */ (err).message));
      return;
    }

    const config = vscode.workspace.getConfiguration();
    if (!this.context.globalState.get(BACKUP_KEY)) {
      /** @type {Record<string, unknown>} */
      const backup = {};
      for (const key of Object.keys(FONT_SETTINGS)) backup[key] = config.inspect(key)?.globalValue ?? null;
      await this.context.globalState.update(BACKUP_KEY, backup);
    }
    for (const [key, value] of Object.entries(settingsFor(id))) await config.update(key, value, vscode.ConfigurationTarget.Global);
    await this.context.globalState.update(APPLIED_KEY, id);
    this.log.info(`Typography applied: ${id}`);

    if (quiet) return;
    // Sin await: la notificación no debe bloquear la cola de sincronización.
    const reload = vscode.l10n.t('Reload Window');
    vscode.window
      .showInformationMessage(
        vscode.l10n.t(
          'Typography "{0}" applied to the editor, terminal and chat. If you still see the previous font, restart VS Code: new fonts are loaded when it starts.',
          id === 'bureau' ? 'Bureau' : 'Resonant'
        ),
        reload
      )
      .then((choice) => {
        if (choice === reload) vscode.commands.executeCommand('workbench.action.reloadWindow');
      });
  }

  /** Devuelve los ajustes que tenía el usuario (solo los que no ha cambiado él después). */
  async restore(quiet = false) {
    const applied = /** @type {import('./fontsets').FontSetId | undefined} */ (this.context.globalState.get(APPLIED_KEY));
    if (!applied) return;
    const backup = /** @type {Record<string, unknown>} */ (this.context.globalState.get(BACKUP_KEY) ?? {});
    const ours = settingsFor(applied);
    const config = vscode.workspace.getConfiguration();
    for (const key of Object.keys(FONT_SETTINGS)) {
      if (config.inspect(key)?.globalValue !== ours[key]) continue; // el usuario lo cambió: se respeta
      await config.update(key, backup[key] ?? undefined, vscode.ConfigurationTarget.Global);
    }
    await this.context.globalState.update(APPLIED_KEY, undefined);
    await this.context.globalState.update(BACKUP_KEY, undefined);
    this.log.info('Typography restored to the previous settings');
    if (!quiet) vscode.window.showInformationMessage(vscode.l10n.t('Your previous typography has been restored.'));
  }

  /** @param {import('./fontsets').FontMode} mode */
  async setMode(mode) {
    await vscode.workspace.getConfiguration().update(SETTING, mode, vscode.ConfigurationTarget.Global);
  }

  async choose() {
    /** @type {Array<vscode.QuickPickItem & {mode?: import('./fontsets').FontMode, remove?: boolean}>} */
    const items = [
      { label: '$(symbol-text) Bureau — Control', description: 'Overpass Mono · Overpass', detail: vscode.l10n.t('Inspired by Interstate, the signage of the Federal Bureau of Control. Uses Interstate if you have it installed.'), mode: 'bureau' },
      { label: '$(symbol-text) Resonant — Control Resonant', description: 'Space Mono · Space Grotesk', detail: vscode.l10n.t('Geometric and retro-futuristic, for the patterned Manhattan.'), mode: 'resonant' },
      { label: `$(sync) ${vscode.l10n.t('Follow the theme')}`, detail: vscode.l10n.t('Resonant with CONTROL Resonant, Bureau with the other CONTROL themes, your own font with any other theme.'), mode: 'auto' },
      { label: `$(discard) ${vscode.l10n.t('Keep my font')}`, detail: vscode.l10n.t('Restores the font you had before.'), mode: 'none' },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: `$(trash) ${vscode.l10n.t('Remove installed fonts')}`, detail: vscode.l10n.t('Restores your font and deletes the fonts this extension installed.'), remove: true },
    ];
    const current = this.mode();
    for (const item of items) if (item.mode === current) item.description = `${item.description ? `${item.description} · ` : ''}${vscode.l10n.t('current')}`;
    const pick = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('CONTROL: Choose Typography'), placeHolder: vscode.l10n.t('Font for the editor, terminal and chat') });
    if (!pick) return;
    if (pick.remove) await this.removeFonts();
    else if (pick.mode) await this.setMode(pick.mode);
  }

  async removeFonts() {
    await this.setMode('none');
    await this.queue;
    await this.restore(true);
    let removed = 0;
    for (const set of Object.values(FONT_SETS)) removed += uninstallFonts(set.files);
    this.log.info(`Fonts removed: ${removed}`);
    vscode.window.showInformationMessage(vscode.l10n.t('The CONTROL fonts have been removed. Some files are only deleted after restarting your computer if they are in use.'));
  }

  /** La primera vez que se activa la extensión, ofrece la tipografía. */
  async offerOnce() {
    if (this.context.globalState.get(OFFER_KEY)) return;
    await this.context.globalState.update(OFFER_KEY, true);
    if (this.mode() !== 'none') return;
    const bureau = 'Bureau (Control)';
    const resonant = 'Resonant';
    const auto = vscode.l10n.t('Follow the theme');
    const no = vscode.l10n.t('No, thanks');
    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t('CONTROL Theme: do you want to use a typography inspired by the games in the editor, terminal and chat? You can change it at any time with "CONTROL: Choose Typography".'),
      bureau,
      resonant,
      auto,
      no
    );
    if (choice === bureau) await this.setMode('bureau');
    else if (choice === resonant) await this.setMode('resonant');
    else if (choice === auto) await this.setMode('auto');
  }
}

module.exports = { FontController, SETTING };
