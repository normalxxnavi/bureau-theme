// @ts-check
'use strict';

/**
 * Tipografías de los juegos: comando para elegir (y paso de la guía de bienvenida), modo
 * «según el tema» y restauración de la tipografía anterior.
 *
 * Flujo: ajuste `bureauTheme.font` (none | bureau | resonant | auto) →
 * se instalan las fuentes para el usuario → se cambian los ajustes de fuente
 * de VS Code (editor, terminal, consola de depuración, chat y vista previa de
 * Markdown) guardando antes una copia de los valores del usuario. Cada ajuste
 * lleva detrás la fuente que tenía el usuario: al desinstalar la extensión se
 * borran sus fuentes (src/extension/uninstall.js) y VS Code vuelve sola a esa.
 */

const vscode = require('vscode');
const path = require('node:path');
const { FONT_SETS, FONT_SETTINGS, fallbackFonts, settingsFor, isOwnValue, withoutPromptIcons, resolveFontSet } = require('./fontsets');
const { withPromptIcons, promptIconsWanted } = require('./prompt-config');
// El instalador (child_process, registro de Windows) se carga solo al instalar o quitar.
const { readActiveThemeLabel, THEME_SETTING_KEYS } = require('./theme-state');

const { FONT_SETTING: SETTING, FONT_APPLIED_KEY: APPLIED_KEY, FONT_FALLBACK_KEY: FALLBACK_KEY, TERMINAL_FONT_INSTALLED_KEY } = require('./config');
const BACKUP_KEY = 'fontBackup';
const MODES = ['none', 'bureau', 'resonant', 'auto'];
/** El ajuste que lleva detrás la fuente de iconos de la terminal Bureau (terminal-prompt.js), si está encendido. */
const TERMINAL_FONT = 'terminal.integrated.fontFamily';

/**
 * Los ajustes de fuente que existen en este VS Code: escribir uno que no está
 * registrado da error (chat.fontFamily no existe en las versiones antiguas, y
 * markdown.preview.fontFamily no está si se desactiva la extensión de Markdown).
 * @param {vscode.WorkspaceConfiguration} config
 */
const registeredKeys = (config) => Object.keys(FONT_SETTINGS).filter((key) => config.inspect(key)?.defaultValue !== undefined);

/**
 * La fuente anterior de cada ajuste, para ponerla detrás de la del juego.
 * @param {vscode.WorkspaceConfiguration} config @param {Record<string, unknown>} backup
 */
function fallbacksOf(config, backup) {
  const defaults = Object.fromEntries(Object.keys(FONT_SETTINGS).map((key) => [key, config.inspect(key)?.defaultValue]));
  return fallbackFonts(backup, defaults);
}

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
    // La comprobación inicial espera al siguiente turno: así activate() vuelve
    // en cuanto registra los listeners. (La tipografía se ofrece en la guía de
    // bienvenida, no con una notificación al instalar.)
    this.queue = new Promise((resolve) => setTimeout(resolve, 0));
    this.sync({ quiet: true });
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
    // Una tipografía aplicada antes de la 0.8 se vuelve a escribir (sin avisar) con la fuente anterior detrás.
    // Sus fuentes ya están instaladas: no se vuelven a registrar (reg.exe bloquea el arranque).
    if (target === applied && (!target || this.context.globalState.get(FALLBACK_KEY))) return;
    if (target) await this.apply(target, quiet || target === applied, target !== applied);
    else await this.restore(quiet);
  }

  /** @param {import('./fontsets').FontSetId} id @param {boolean} quiet @param {boolean} [install] */
  async apply(id, quiet, install = true) {
    if (install) {
      try {
        const installed = require('./font-installer').installFonts(this.fontsRoot, FONT_SETS[id].files);
        this.log.info(`Fonts installed for the current user: ${installed.join(', ')}`);
      } catch (err) {
        vscode.window.showErrorMessage(vscode.l10n.t('CONTROL Theme could not install the fonts: {0}', /** @type {Error} */ (err).message));
        return;
      }
    }

    const config = vscode.workspace.getConfiguration();
    const keys = registeredKeys(config);
    let backup = /** @type {Record<string, unknown> | undefined} */ (this.context.globalState.get(BACKUP_KEY));
    if (!backup) {
      backup = {};
      for (const key of keys) backup[key] = withoutPromptIcons(config.inspect(key)?.globalValue ?? null);
      await this.context.globalState.update(BACKUP_KEY, backup);
    }
    const fallbacks = fallbacksOf(config, backup);
    const values = settingsFor(id, fallbacks);
    if (promptIconsWanted((k) => config.get(k))) values[TERMINAL_FONT] = withPromptIcons(values[TERMINAL_FONT], true);
    for (const key of keys) {
      const current = config.inspect(key)?.globalValue ?? null;
      // Solo los ajustes que siguen como los tenía el usuario o como los dejó la extensión: si después lo cambió él, se respeta.
      if (withoutPromptIcons(current) !== (backup[key] ?? null) && !isOwnValue(key, current, fallbacks)) continue;
      await config.update(key, values[key], vscode.ConfigurationTarget.Global);
    }
    await this.context.globalState.update(APPLIED_KEY, id);
    await this.context.globalState.update(FALLBACK_KEY, true);
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
    const config = vscode.workspace.getConfiguration();
    const fallbacks = fallbacksOf(config, backup);
    const icons = promptIconsWanted((k) => config.get(k));
    for (const key of registeredKeys(config)) {
      if (!isOwnValue(key, config.inspect(key)?.globalValue, fallbacks)) continue; // el usuario lo cambió: se respeta
      let value = backup[key] ?? undefined;
      // Con la terminal Bureau, la fuente de iconos sigue detrás de tu fuente.
      if (key === TERMINAL_FONT && icons) value = withPromptIcons(typeof value === 'string' && value.trim() ? value : fallbacks[key], true);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
    await this.context.globalState.update(APPLIED_KEY, undefined);
    await this.context.globalState.update(BACKUP_KEY, undefined);
    await this.context.globalState.update(FALLBACK_KEY, undefined);
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
    const keepPromptIcons = promptIconsWanted((k) => vscode.workspace.getConfiguration().get(k));
    const removed = require('./font-installer').uninstallAllFonts({ keepPromptIcons });
    // Si se ha borrado, la terminal Bureau la vuelve a instalar cuando haga falta.
    if (!keepPromptIcons) await this.context.globalState.update(TERMINAL_FONT_INSTALLED_KEY, undefined);
    this.log.info(`Fonts removed: ${removed}`);
    vscode.window.showInformationMessage(vscode.l10n.t('The CONTROL fonts have been removed. Some files are only deleted after restarting your computer if they are in use.'));
  }
}

module.exports = { FontController, SETTING };
