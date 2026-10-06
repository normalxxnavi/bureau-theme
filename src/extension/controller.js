// @ts-check
'use strict';

/**
 * Conecta los eventos de VS Code con el motor de sonido.
 *
 * Con los sonidos desactivados solo existe un listener (cambios de ajustes)
 * para detectar cuándo se activan: no hay más listeners ni procesos.
 */

const vscode = require('vscode');
const path = require('node:path');
const { SOUNDS, EVENTS, PACKS } = require('./catalog');
const { SECTION, normalizeConfig } = require('./config');
const rules = require('./rules');
const { resolveSoundFile } = require('./soundbank');
const { getScaledFile, pruneCache } = require('./volume');
const { createPlayer } = require('./player');

/** Espera tras el último cambio de diagnósticos antes de contar errores. */
const ERROR_SETTLE_MS = 1200;
/** Máximo que se espera a los diagnósticos después de guardar. */
const ERROR_MAX_WAIT_MS = 5000;
/** Pausa en modo `live` antes de contar errores. */
const LIVE_DEBOUNCE_MS = 1000;
/** Al activar: tiempo para que los servidores de lenguaje publiquen sus errores iniciales. */
const BASELINE_DELAY_MS = 4000;
/** Tras cerrar un archivo sus errores desaparecen: eso no es «todo resuelto». */
const CLOSE_SUPPRESS_MS = 2500;
const STARTUP_DELAY_MS = 1500;

const WORKBENCH_THEME_KEYS = [
  'workbench.colorTheme',
  'workbench.preferredDarkColorTheme',
  'workbench.preferredLightColorTheme',
  'workbench.preferredHighContrastColorTheme',
  'workbench.preferredHighContrastLightColorTheme',
  'window.autoDetectColorScheme',
];

/** @param {import('./catalog').SoundEvent} event */
function eventLabel(event) {
  switch (event) {
    case 'startup': return vscode.l10n.t('VS Code starts');
    case 'themeActivated': return vscode.l10n.t('CONTROL theme activated');
    case 'save': return vscode.l10n.t('File saved');
    case 'newError': return vscode.l10n.t('New errors');
    case 'allClear': return vscode.l10n.t('All errors fixed');
    case 'buildSuccess': return vscode.l10n.t('Task succeeded');
    case 'buildFail': return vscode.l10n.t('Task failed');
    case 'terminalFail': return vscode.l10n.t('Terminal command failed');
    case 'debugStart': return vscode.l10n.t('Debugging started');
    case 'breakpoint': return vscode.l10n.t('Breakpoint hit');
    case 'gitCommit': return vscode.l10n.t('Git commit');
  }
}

function countErrors() {
  let n = 0;
  for (const [, diagnostics] of vscode.languages.getDiagnostics()) {
    for (const d of diagnostics) if (d.severity === vscode.DiagnosticSeverity.Error) n++;
  }
  return n;
}

class SoundController {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {vscode.LogOutputChannel} log
   */
  constructor(context, log) {
    this.context = context;
    this.log = log;
    this.config = this.readConfig();
    this.gate = rules.createGate();
    this.themePacks = rules.themePacks(context.extension.packageJSON.contributes.themes);
    this.cacheDir = path.join(context.globalStorageUri.fsPath, 'volume-cache');
    /** @type {import('./player').Player | null} */
    this.player = null;
    /** @type {vscode.Disposable[]} */
    this.listeners = [];
    this.started = false;
    /** @type {number | undefined} */
    this.errorBaseline = undefined;
    /** @type {NodeJS.Timeout | undefined} */
    this.errorTimer = undefined;
    /** @type {NodeJS.Timeout | undefined} */
    this.baselineTimer = undefined;
    /** @type {number | null} */
    this.errorDeadline = null;
    this.suppressClearUntil = 0;
    /** @type {Set<string>} */
    this.manualSaves = new Set();
    this.lastThemeLabel = this.activeThemeLabel();
    this.playerWarned = false;
  }

  // --- Ciclo de vida --------------------------------------------------------

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => this.onConfigurationChanged(e)),
      { dispose: () => this.stop() }
    );
    if (this.config.enabled) {
      this.start();
      if (this.config.events.startup) {
        const t = setTimeout(() => this.play('startup'), STARTUP_DELAY_MS);
        this.context.subscriptions.push({ dispose: () => clearTimeout(t) });
      }
    }
  }

  start() {
    if (this.started) return;
    this.started = true;
    const d = this.listeners;

    d.push(
      vscode.workspace.onWillSaveTextDocument((e) => {
        if (e.reason === vscode.TextDocumentSaveReason.Manual) this.manualSaves.add(e.document.uri.toString());
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this.manualSaves.delete(doc.uri.toString())) this.play('save');
        if (this.config.errorTrigger === 'onSave') this.scheduleErrorCheck();
      }),
      vscode.workspace.onDidCloseTextDocument(() => {
        this.suppressClearUntil = Date.now() + CLOSE_SUPPRESS_MS;
      }),
      vscode.languages.onDidChangeDiagnostics(() => this.onDiagnosticsChanged()),
      vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution.task.isBackground) return;
        const sound = rules.taskExitSound(e.exitCode);
        if (sound) this.play(sound);
      }),
      vscode.debug.onDidStartDebugSession((session) => {
        if (!session.parentSession) this.play('debugStart');
      }),
      vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker: () => ({
          onDidSendMessage: (/** @type {any} */ m) => {
            if (m?.type === 'event' && m.event === 'stopped' && rules.isBreakpointStop(m.body?.reason)) this.play('breakpoint');
          },
        }),
      }),
      vscode.window.onDidChangeActiveColorTheme(() => this.onThemeChanged())
    );

    // Disponible desde VS Code 1.93 y solo con shell integration activa.
    if (typeof vscode.window.onDidEndTerminalShellExecution === 'function') {
      d.push(
        vscode.window.onDidEndTerminalShellExecution((e) => {
          const sound = rules.terminalExitSound(e.exitCode);
          if (sound) this.play(sound);
        })
      );
    }

    this.watchGitCommits();
    this.baselineTimer = setTimeout(() => {
      if (this.errorBaseline === undefined) this.errorBaseline = countErrors();
    }, BASELINE_DELAY_MS);

    this.log.info(`Sounds enabled (pack: ${this.config.pack}, volume: ${this.config.volume}, errors: ${this.config.errorTrigger})`);
  }

  stop() {
    if (this.started) this.log.info('Sounds disabled');
    this.started = false;
    for (const l of this.listeners.splice(0)) l.dispose();
    clearTimeout(this.errorTimer);
    clearTimeout(this.baselineTimer);
    this.errorDeadline = null;
    this.errorBaseline = undefined;
    this.manualSaves.clear();
    this.player?.dispose();
    this.player = null;
  }

  // --- Ajustes y tema -------------------------------------------------------

  readConfig() {
    const c = vscode.workspace.getConfiguration(SECTION);
    return normalizeConfig((key) => c.get(key));
  }

  /** @param {vscode.ConfigurationChangeEvent} e */
  onConfigurationChanged(e) {
    if (WORKBENCH_THEME_KEYS.some((k) => e.affectsConfiguration(k))) this.onThemeChanged();
    if (!e.affectsConfiguration(SECTION)) return;

    const previous = this.config;
    this.config = this.readConfig();
    if (previous.volume !== this.config.volume) {
      try {
        pruneCache(this.cacheDir, this.config.volume);
      } catch (err) {
        this.log.debug(`Could not prune volume cache: ${/** @type {Error} */ (err).message}`);
      }
    }
    if (!previous.enabled && this.config.enabled) {
      this.start();
      this.showAccessibilityNoticeOnce();
    } else if (previous.enabled && !this.config.enabled) {
      this.stop();
    }
  }

  activeThemeLabel() {
    const c = vscode.workspace.getConfiguration();
    return rules.activeThemeLabel(
      {
        autoDetect: c.get('window.autoDetectColorScheme') === true,
        colorTheme: c.get('workbench.colorTheme'),
        preferredDark: c.get('workbench.preferredDarkColorTheme'),
        preferredLight: c.get('workbench.preferredLightColorTheme'),
        preferredHighContrast: c.get('workbench.preferredHighContrastColorTheme'),
        preferredHighContrastLight: c.get('workbench.preferredHighContrastLightColorTheme'),
      },
      vscode.window.activeColorTheme.kind
    );
  }

  /** @returns {import('./catalog').Pack | null} */
  activeThemePack() {
    const label = this.activeThemeLabel();
    return label ? this.themePacks.get(label) ?? null : null;
  }

  onThemeChanged() {
    const label = this.activeThemeLabel();
    if (label === this.lastThemeLabel) return;
    this.lastThemeLabel = label;
    if (label && this.themePacks.has(label)) this.play('themeActivated');
  }

  // --- Errores --------------------------------------------------------------

  scheduleErrorCheck() {
    this.errorDeadline = Date.now() + ERROR_MAX_WAIT_MS;
    this.armErrorTimer(ERROR_SETTLE_MS);
  }

  /** @param {number} ms */
  armErrorTimer(ms) {
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => this.checkErrors(), ms);
  }

  onDiagnosticsChanged() {
    if (this.config.errorTrigger === 'live') {
      this.armErrorTimer(LIVE_DEBOUNCE_MS);
    } else if (this.errorDeadline !== null) {
      // Después de guardar: esperar a que los diagnósticos dejen de cambiar.
      const remaining = this.errorDeadline - Date.now();
      this.armErrorTimer(Math.max(0, Math.min(ERROR_SETTLE_MS, remaining)));
    }
  }

  checkErrors() {
    this.errorDeadline = null;
    const current = countErrors();
    const change = rules.classifyErrorChange(this.errorBaseline, current);
    this.log.debug(`Errors: ${this.errorBaseline ?? '—'} → ${current}`);
    this.errorBaseline = current;
    if (change === 'allClear' && Date.now() < this.suppressClearUntil) return;
    if (change) this.play(change);
  }

  // --- Git ------------------------------------------------------------------

  async watchGitCommits() {
    try {
      const ext = vscode.extensions.getExtension('vscode.git');
      if (!ext) return;
      const exports = ext.isActive ? ext.exports : await ext.activate();
      if (!this.started) return;
      const api = exports?.getAPI?.(1);
      if (!api) return;
      const watch = (/** @type {any} */ repo) => {
        if (typeof repo.onDidCommit === 'function') this.listeners.push(repo.onDidCommit(() => this.play('gitCommit')));
      };
      api.repositories.forEach(watch);
      this.listeners.push(api.onDidOpenRepository(watch));
    } catch (err) {
      this.log.debug(`Git API not available: ${/** @type {Error} */ (err).message}`);
    }
  }

  // --- Reproducción ---------------------------------------------------------

  ensurePlayer() {
    if (!this.player) this.player = createPlayer(this.log);
    if (!this.player.available && !this.playerWarned) {
      this.playerWarned = true;
      vscode.window.showWarningMessage(
        vscode.l10n.t('CONTROL Theme: no audio player was found on this system (paplay, pw-play or aplay). Sounds are disabled for this session.')
      );
    }
    return this.player;
  }

  /**
   * @param {import('./catalog').SoundEvent} event
   * @param {{force?: boolean, pack?: import('./catalog').Pack}} [options]
   *   `force` reproduce aunque los sonidos estén desactivados (comando Probar sonidos).
   */
  play(event, options = {}) {
    const cfg = this.config;
    if (!options.force) {
      if (!rules.shouldPlay(cfg, event, this.activeThemePack() !== null)) return;
      if (!this.gate.tryPass(SOUNDS[event].priority, cfg.cooldownMs)) {
        this.log.debug(`${event}: skipped (cooldown)`);
        return;
      }
    }
    const pack = options.pack ?? rules.resolvePack(cfg.pack, this.activeThemePack());
    const resolved = resolveSoundFile({ extensionPath: this.context.extensionPath, pack, customFolder: cfg.customFolder, file: SOUNDS[event].file });
    try {
      const volume = options.force && cfg.volume === 0 ? 50 : cfg.volume;
      const file = getScaledFile(resolved.path, volume, this.cacheDir);
      const player = this.ensurePlayer();
      if (!player.available) return;
      player.play(file);
      this.log.info(`♪ ${event} · ${resolved.source === 'custom' ? 'custom folder' : pack} · ${path.basename(resolved.path)} · volume ${volume}`);
    } catch (err) {
      this.log.warn(`${event}: ${/** @type {Error} */ (err).message}`);
    }
  }

  // --- Comandos -------------------------------------------------------------

  async toggle() {
    const c = vscode.workspace.getConfiguration(SECTION);
    const next = !this.config.enabled;
    await c.update('enabled', next, vscode.ConfigurationTarget.Global);

    const inspect = c.inspect('enabled');
    if (inspect?.workspaceValue !== undefined || inspect?.workspaceFolderValue !== undefined) {
      vscode.window.showWarningMessage(
        vscode.l10n.t('The workspace settings override "bureauTheme.sounds.enabled", so this change only applies outside this workspace.')
      );
      return;
    }
    if (!next) {
      vscode.window.showInformationMessage(vscode.l10n.t('CONTROL sounds disabled.'));
      return;
    }
    const preview = vscode.l10n.t('Preview Sounds');
    const settings = vscode.l10n.t('Settings');
    const message =
      this.config.onlyWithControlTheme && this.activeThemePack() === null
        ? vscode.l10n.t('CONTROL sounds enabled. They will play while a CONTROL theme is active.')
        : vscode.l10n.t('CONTROL sounds enabled.');
    const choice = await vscode.window.showInformationMessage(message, preview, settings);
    if (choice === preview) await this.preview();
    if (choice === settings) await this.openSettings();
  }

  async preview() {
    /** @type {vscode.QuickPick<vscode.QuickPickItem & {event?: import('./catalog').SoundEvent, pack?: import('./catalog').Pack}>} */
    const qp = vscode.window.createQuickPick();
    qp.title = vscode.l10n.t('CONTROL: Preview Sounds');
    qp.placeholder = vscode.l10n.t('Press Enter on a sound to play it. Esc closes the list.');
    qp.matchOnDescription = true;
    qp.ignoreFocusOut = true;
    const packNames = { control: 'Control — The Oldest House', resonant: 'Control Resonant — Patterned Manhattan' };
    const items = [];
    for (const pack of PACKS) {
      items.push({ label: packNames[pack], kind: vscode.QuickPickItemKind.Separator });
      for (const event of EVENTS) items.push({ label: `$(play) ${eventLabel(event)}`, description: SOUNDS[event].file, event, pack });
    }
    qp.items = items;
    qp.onDidAccept(() => {
      const item = qp.selectedItems[0];
      if (item?.event) this.play(item.event, { force: true, pack: item.pack });
    });
    qp.onDidHide(() => qp.dispose());
    qp.show();
  }

  async openSettings() {
    await vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${this.context.extension.id}`);
  }

  showAccessibilityNoticeOnce() {
    const key = 'accessibilityNoticeShown';
    if (this.context.globalState.get(key)) return;
    if (vscode.workspace.getConfiguration('editor').get('accessibilitySupport') !== 'on') return;
    this.context.globalState.update(key, true);
    vscode.window.showInformationMessage(
      vscode.l10n.t('VS Code has its own accessibility signals. CONTROL sounds may overlap with them; you can turn each event off in the settings.')
    );
  }
}

module.exports = { SoundController };
