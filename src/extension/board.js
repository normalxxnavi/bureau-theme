// @ts-check
'use strict';

/**
 * El Consejo (the Board):
 *   - un mensaje cuando lo pides (comando «Mensaje del Consejo»);
 *   - mensajes al azar a lo largo del día (`bureauTheme.board.random`): cuántos
 *     al día, en qué horario, dónde aparecen y con qué mensajes (los del
 *     Consejo, los tuyos o los dos);
 *   - comentarios discretos en la barra de estado al hacer commit, terminar
 *     una tarea, empezar a depurar o corregir el último error, y el primer
 *     arranque de cada día (`bureauTheme.board.comments`);
 *   - el menú para configurarlo todo.
 * Los textos del Consejo están en board-lines.js; el reparto, en board-schedule.js.
 */

const vscode = require('vscode');
const { pickLine, isLateNight } = require('./board-lines');
const S = require('./board-schedule');
const rules = require('./rules');
const { BOARD } = require('./config');

const Global = vscode.ConfigurationTarget.Global;

/** Tiempo que un comentario se queda en la barra de estado. */
const COMMENT_MS = 8000;
/** Los mensajes al azar en la barra de estado duran algo más: no los has pedido. */
const RANDOM_STATUS_MS = 12000;
/** Separación mínima entre dos comentarios: el Consejo no interrumpe. */
const COMMENT_GAP_MS = 20000;
/** Espera a que los diagnósticos se calmen después de guardar. */
const ERROR_SETTLE_MS = 1500;
/** Si estás depurando, el mensaje espera. */
const DEBUG_RETRY_MS = 10 * 60_000;
const DAY_KEY = 'boardLastDay';
/** Mensajes al azar de hoy (compartido entre ventanas): {day, count, lastAt}. */
const RANDOM_KEY = 'boardRandom';
/** «Hoy no más»: el día silenciado. */
const MUTED_KEY = 'boardMutedDay';

/** @type {string | undefined} */
let previous;

/** @param {import('./board-lines').BoardMoment} moment */
function line(moment) {
  previous = pickLine(moment, vscode.env.language, Math.random, previous);
  return previous;
}

/** Ajustes de los mensajes del Consejo, ya limpios. */
function readBoardConfig() {
  const c = vscode.workspace.getConfiguration(BOARD);
  const display = c.get('display');
  const source = c.get('source');
  return {
    random: c.get('random') === true,
    comments: c.get('comments') === true,
    timesPerDay: Math.min(24, Math.max(1, Math.floor(Number(c.get('timesPerDay')) || 3))),
    hours: S.parseHours(c.get('hours')),
    hoursText: String(c.get('hours') ?? ''),
    display: /** @type {'notification' | 'statusBar' | 'both'} */ (display === 'statusBar' || display === 'both' ? display : 'notification'),
    source: /** @type {import('./board-schedule').MessageSource} */ (source === 'board' || source === 'custom' ? source : 'all'),
    custom: S.normalizeCustom(c.get('customMessages')),
  };
}

/** Un mensaje del Consejo (o tuyo, según `bureauTheme.board.source`). */
function pickMessage() {
  const cfg = readBoardConfig();
  const pool = S.messagePool(cfg.source, cfg.custom, vscode.env.language, isLateNight(new Date()));
  previous = S.pickFrom(pool, Math.random, previous);
  return previous;
}

/** El texto de un mensaje no puede colar iconos (`$(…)`) en la barra de estado. @param {string} text */
const safe = (text) => text.replace(/\$\(/g, '$​(');

/** Un mensaje del Consejo cuando lo pides. */
async function showBoardMessage() {
  const another = vscode.l10n.t('Another message');
  const choice = await vscode.window.showInformationMessage(pickMessage(), another);
  if (choice === another) await showBoardMessage();
}

function countErrors() {
  let n = 0;
  for (const [, diagnostics] of vscode.languages.getDiagnostics()) {
    for (const d of diagnostics) if (d.severity === vscode.DiagnosticSeverity.Error) n++;
  }
  return n;
}

// --- Mensajes al azar ------------------------------------------------------------

class BoardRandom {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.started = false;
    /** @type {NodeJS.Timeout | undefined} */
    this.timer = undefined;
    /** @type {vscode.Disposable | undefined} */
    this.waitFocus = undefined;
    /** Últimos mensajes mostrados (los lee el test de integración). @type {string[]} */
    this.history = [];
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(BOARD)) this.refresh();
      }),
      { dispose: () => this.stop() }
    );
    this.refresh();
  }

  refresh() {
    if (!readBoardConfig().random) {
      this.stop();
      return;
    }
    // Cambiar cuántos al día o el horario reprograma el siguiente.
    this.stop();
    this.started = true;
    this.schedule(true);
  }

  stop() {
    this.started = false;
    clearTimeout(this.timer);
    this.waitFocus?.dispose();
    this.waitFocus = undefined;
  }

  /** @param {boolean} [first] el primero de la sesión llega antes */
  schedule(first = false) {
    clearTimeout(this.timer);
    if (!this.started) return;
    const cfg = readBoardConfig();
    const delay = S.nextDelayMs(cfg.timesPerDay, cfg.hours) * (first ? 0.5 : 1);
    this.timer = setTimeout(() => this.fire(), delay);
  }

  /** @param {number} ms */
  retryIn(ms) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fire(), ms);
  }

  fire() {
    if (!this.started) return;
    const cfg = readBoardConfig();
    const now = new Date();
    const today = S.dayKey(now);
    // Fuera del horario: al empezar el siguiente (y un rato al azar).
    if (!S.inHours(now, cfg.hours)) return this.retryIn(S.msUntilHours(now, cfg.hours) + Math.random() * 30 * 60_000);
    const stats = /** @type {{day?: string, count?: number, lastAt?: number}} */ (this.context.globalState.get(RANDOM_KEY) ?? {});
    const count = stats.day === today ? stats.count ?? 0 : 0;
    // Ya tocaron los de hoy, o «hoy no más»: mañana.
    if (count >= cfg.timesPerDay || this.context.globalState.get(MUTED_KEY) === today) return this.retryIn(this.msUntilTomorrow(now, cfg.hours));
    // Otra ventana acaba de enseñar uno: este se salta.
    const average = S.nextDelayMs(cfg.timesPerDay, cfg.hours, () => 0.5);
    if (stats.lastAt && Date.now() - stats.lastAt < average / 3) return this.schedule();
    if (vscode.debug.activeDebugSession) return this.retryIn(DEBUG_RETRY_MS);
    // Con la ventana en segundo plano espera a que vuelvas.
    if (!vscode.window.state.focused) {
      this.waitFocus?.dispose();
      this.waitFocus = vscode.window.onDidChangeWindowState((state) => {
        if (!state.focused) return;
        this.waitFocus?.dispose();
        this.waitFocus = undefined;
        this.retryIn(3000);
      });
      return;
    }
    this.show(today, count);
    this.schedule();
  }

  /** @param {Date} now @param {import('./board-schedule').Hours | null} hours */
  msUntilTomorrow(now, hours) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return tomorrow.getTime() - now.getTime() + S.msUntilHours(tomorrow, hours) + Math.random() * 60 * 60_000;
  }

  /** Un mensaje ya, sin esperar ni mirar el horario (lo usa el test de integración). */
  showNow() {
    const today = S.dayKey(new Date());
    const stats = /** @type {{day?: string, count?: number}} */ (this.context.globalState.get(RANDOM_KEY) ?? {});
    this.show(today, stats.day === today ? stats.count ?? 0 : 0);
  }

  /** @param {string} today @param {number} count */
  show(today, count) {
    const cfg = readBoardConfig();
    const text = pickMessage();
    if (!text) return;
    this.context.globalState.update(RANDOM_KEY, { day: today, count: count + 1, lastAt: Date.now() });
    this.history.push(text);
    if (this.history.length > 20) this.history.shift();
    if (cfg.display !== 'notification') vscode.window.setStatusBarMessage(`$(bureau-board) ${safe(text)}`, RANDOM_STATUS_MS);
    if (cfg.display === 'statusBar') return;
    const another = vscode.l10n.t('Another message');
    const notToday = vscode.l10n.t('No more today');
    vscode.window.showInformationMessage(text, another, notToday).then((choice) => {
      if (choice === another) showBoardMessage();
      if (choice === notToday) this.context.globalState.update(MUTED_KEY, today);
    });
  }
}

// --- Comentarios en eventos ------------------------------------------------------

class BoardComments {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.started = false;
    /** @type {vscode.Disposable[]} */
    this.listeners = [];
    this.lastAt = 0;
    /** @type {ReturnType<typeof rules.createErrorTracker> | null} */
    this.errors = null;
    /** @type {NodeJS.Timeout | undefined} */
    this.errorTimer = undefined;
    this.checkPending = false;
    /** Cuántas veces se ha empezado a vigilar los commits (ver watchGitCommits). */
    this.gitRun = 0;
    /** Últimos comentarios (los lee el test de integración). @type {Array<{moment: string, text: string}>} */
    this.history = [];
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(BOARD)) this.refresh();
      }),
      { dispose: () => this.stop() }
    );
    this.refresh();
  }

  refresh() {
    if (readBoardConfig().comments) this.start();
    else this.stop();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.errors = rules.createErrorTracker(countErrors());
    this.listeners.push(
      vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution.task.isBackground) return;
        const result = rules.taskExitSound(e.exitCode);
        if (result) this.comment(result === 'buildSuccess' ? 'buildOk' : 'buildFail');
      }),
      vscode.debug.onDidStartDebugSession((session) => {
        if (!session.parentSession) this.comment('debug');
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length && e.document.uri.scheme !== 'output') this.errors?.edited();
      }),
      vscode.workspace.onDidSaveTextDocument(() => {
        this.checkPending = true;
        this.armErrorTimer();
      }),
      vscode.languages.onDidChangeDiagnostics(() => this.armErrorTimer())
    );
    this.watchGitCommits();

    // El primer arranque de cada día.
    const today = new Date().toDateString();
    if (this.context.globalState.get(DAY_KEY) !== today) {
      this.context.globalState.update(DAY_KEY, today);
      const t = setTimeout(() => this.comment(isLateNight(new Date()) ? 'lateNight' : 'startup', true), 2500);
      this.listeners.push({ dispose: () => clearTimeout(t) });
    }
  }

  stop() {
    this.started = false;
    for (const l of this.listeners.splice(0)) l.dispose();
    clearTimeout(this.errorTimer);
    this.errors = null;
  }

  armErrorTimer() {
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      if (!this.errors) return;
      const count = countErrors();
      if (this.checkPending) {
        this.checkPending = false;
        const change = this.errors.check(count);
        if (change === 'allClear') this.comment('allClear');
        else if (change === 'newError') this.comment('newError');
      } else {
        this.errors.settled(count, 'onSave');
      }
    }, ERROR_SETTLE_MS);
  }

  async watchGitCommits() {
    // Apagar y encender mientras Git arranca: solo cuenta el último encendido (si no, cada commit se comentaría dos veces).
    const run = ++this.gitRun;
    try {
      const ext = vscode.extensions.getExtension('vscode.git');
      if (!ext) return;
      const exports = ext.isActive ? ext.exports : await ext.activate();
      const api = exports?.getAPI?.(1);
      if (!api || !this.started || run !== this.gitRun) return;
      const watch = (/** @type {any} */ repo) => {
        if (typeof repo.onDidCommit === 'function') this.listeners.push(repo.onDidCommit(() => this.comment('commit')));
      };
      api.repositories.forEach(watch);
      this.listeners.push(api.onDidOpenRepository(watch));
    } catch {
      // Sin Git, sin comentarios de commit.
    }
  }

  /**
   * @param {import('./board-lines').BoardMoment} moment
   * @param {boolean} [greeting] el saludo del día: no espera ni hace esperar a los demás
   */
  comment(moment, greeting = false) {
    if (!this.started) return;
    const now = Date.now();
    if (!greeting) {
      if (now - this.lastAt < COMMENT_GAP_MS) return;
      this.lastAt = now;
    }
    const text = line(moment);
    vscode.window.setStatusBarMessage(`$(bureau-board) ${text}`, COMMENT_MS);
    this.history.push({ moment, text });
    if (this.history.length > 20) this.history.shift();
  }
}

// --- Menú ----------------------------------------------------------------------

/**
 * @template T
 * @param {string} title @param {Array<{label: string, value: T, detail?: string}>} options @param {T} current
 * @returns {Promise<T | undefined>}
 */
async function pick(title, options, current) {
  const items = options.map((o) => ({ label: `${o.value === current ? '$(check)' : '$(blank)'} ${o.label}`, detail: o.detail, value: o.value }));
  const choice = await vscode.window.showQuickPick(items, { title, placeHolder: vscode.l10n.t('Esc goes back to the Board') });
  return choice?.value;
}

/** @param {'notification' | 'statusBar' | 'both'} d */
const displayName = (d) =>
  d === 'statusBar' ? vscode.l10n.t('Status bar') : d === 'both' ? vscode.l10n.t('Notification and status bar') : vscode.l10n.t('Notification');

/** @param {import('./board-schedule').MessageSource} s */
const sourceName = (s) => (s === 'board' ? vscode.l10n.t('Only the Board') : s === 'custom' ? vscode.l10n.t('Only mine') : vscode.l10n.t('The Board and mine'));

/** Resumen para la Casa Inmemorial. */
function boardSummary() {
  const cfg = readBoardConfig();
  if (!cfg.random && !cfg.comments) return vscode.l10n.t('Disabled');
  const parts = [];
  if (cfg.random) parts.push(vscode.l10n.t('{0} a day', String(cfg.timesPerDay)), cfg.hours ? cfg.hoursText.trim() : vscode.l10n.t('all day'));
  if (cfg.comments) parts.push(vscode.l10n.t('comments'));
  return parts.join(' · ');
}

/** Mis mensajes: añadir y quitar. */
async function editCustomMessages() {
  for (;;) {
    const c = vscode.workspace.getConfiguration(BOARD);
    const custom = S.normalizeCustom(c.get('customMessages'));
    /** @type {Array<vscode.QuickPickItem & {index?: number, add?: boolean}>} */
    const items = [
      { label: `$(add) ${vscode.l10n.t('Add a message…')}`, add: true },
      ...custom.map((text, index) => ({ label: `$(trash) ${text}`, detail: vscode.l10n.t('Select it to delete it'), index })),
    ];
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('My messages'), placeHolder: vscode.l10n.t('Your own messages mix with the ones from the Board') });
    if (!choice) return;
    if (choice.add) {
      const text = await vscode.window.showInputBox({
        title: vscode.l10n.t('Add a message'),
        prompt: vscode.l10n.t('A message of your own, for example <<DRINK WATER, AGENT.>>'),
        validateInput: (v) => (v.trim() ? undefined : vscode.l10n.t('Write something')),
      });
      if (text?.trim()) await c.update('customMessages', [...custom, text.trim()], Global);
    } else if (choice.index !== undefined) {
      await c.update('customMessages', custom.filter((_, i) => i !== choice.index), Global);
    }
  }
}

/** Horario: todo el día, unos cuantos habituales o uno a mano. @param {string} current */
async function chooseHours(current) {
  const custom = vscode.l10n.t('Custom…');
  const value = await pick(
    vscode.l10n.t('Hours'),
    [
      { label: vscode.l10n.t('All day'), value: '' },
      { label: '08:00–16:00', value: '08:00-16:00' },
      { label: '09:00–18:00', value: '09:00-18:00' },
      { label: '10:00–20:00', value: '10:00-20:00' },
      { label: custom, value: custom },
    ],
    current
  );
  if (value !== custom) return value;
  return vscode.window.showInputBox({
    title: vscode.l10n.t('Hours'),
    prompt: vscode.l10n.t('From when to when, for example 09:00-18:00'),
    value: current,
    validateInput: (v) => (!v.trim() || S.parseHours(v) ? undefined : vscode.l10n.t('Use the format 09:00-18:00')),
  });
}

/** El menú del Consejo (desde la Casa Inmemorial o «CONTROL: Configurar el Consejo…»). */
async function openBoardMenu() {
  for (;;) {
    const c = vscode.workspace.getConfiguration(BOARD);
    const cfg = readBoardConfig();
    const on = (/** @type {boolean} */ v) => (v ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled'));
    /** @type {Array<vscode.QuickPickItem & {action?: string}>} */
    const items = [
      { label: `$(bureau-board) ${vscode.l10n.t('Random messages')}`, description: on(cfg.random), detail: vscode.l10n.t('The Board speaks at random moments of the day.'), action: 'random' },
      { label: `$(history) ${vscode.l10n.t('Times a day')}`, description: String(cfg.timesPerDay), action: 'times' },
      { label: `$(clock) ${vscode.l10n.t('Hours')}`, description: cfg.hours ? cfg.hoursText.trim() : vscode.l10n.t('All day'), action: 'hours' },
      { label: `$(comment) ${vscode.l10n.t('Where they appear')}`, description: displayName(cfg.display), action: 'display' },
      { label: `$(bureau-dossier) ${vscode.l10n.t('Which messages')}`, description: sourceName(cfg.source), action: 'source' },
      { label: `$(edit) ${vscode.l10n.t('My messages')}`, description: String(cfg.custom.length), action: 'custom' },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      {
        label: `$(bureau-hotline) ${vscode.l10n.t('Comments on commits, tasks and debugging')}`,
        description: on(cfg.comments),
        detail: vscode.l10n.t('Quietly, in the status bar.'),
        action: 'comments',
      },
      { label: `$(bureau-board) ${vscode.l10n.t('A message now')}`, action: 'now' },
    ];
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('CONTROL — The Board'), placeHolder: vscode.l10n.t('<<WE HAVE BEEN EXPECTING YOU.>>') });
    if (!choice?.action) return;
    switch (choice.action) {
      case 'random':
        await c.update('random', !cfg.random, Global);
        break;
      case 'times': {
        const v = await pick(vscode.l10n.t('Times a day'), [1, 2, 3, 4, 6, 8, 12].map((n) => ({ label: String(n), value: n })), cfg.timesPerDay);
        if (v !== undefined) await c.update('timesPerDay', v, Global);
        break;
      }
      case 'hours': {
        const v = await chooseHours(cfg.hoursText);
        if (v !== undefined) await c.update('hours', v.trim(), Global);
        break;
      }
      case 'display': {
        const v = await pick(
          vscode.l10n.t('Where they appear'),
          /** @type {Array<'notification' | 'statusBar' | 'both'>} */ (['notification', 'statusBar', 'both']).map((d) => ({ label: displayName(d), value: d })),
          cfg.display
        );
        if (v) await c.update('display', v, Global);
        break;
      }
      case 'source': {
        const v = await pick(
          vscode.l10n.t('Which messages'),
          /** @type {Array<import('./board-schedule').MessageSource>} */ (['all', 'board', 'custom']).map((s) => ({ label: sourceName(s), value: s })),
          cfg.source
        );
        if (v) await c.update('source', v, Global);
        break;
      }
      case 'custom':
        await editCustomMessages();
        break;
      case 'comments':
        await c.update('comments', !cfg.comments, Global);
        break;
      case 'now':
        void showBoardMessage();
        return;
    }
  }
}

module.exports = { showBoardMessage, openBoardMenu, boardSummary, BoardComments, BoardRandom };
