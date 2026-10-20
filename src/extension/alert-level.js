// @ts-check
'use strict';

/**
 * Nivel de alerta de la Agencia en la barra de estado: de «Despejado» a
 * «Incursión del Siseo» según los errores y avisos del área de trabajo. Al
 * pulsarlo se abre el panel Problemas. Se carga solo si está activado
 * (`bureauTheme.alertLevel.enabled`).
 */

const vscode = require('vscode');
const { alertLevel } = require('./alert-rules');
const { LINES } = require('./board-lines');
const { ALERT } = require('./config');
const H = require('./hover');

/** Color de la pastilla de cada nivel: verde, ámbar, naranja y el rojo del Siseo. */
const LEVEL_COLORS = ['#4FA05A', '#C98A1E', '#E07A2B', '#E0352B'];

/** Pausa tras el último cambio de diagnósticos (los servidores de lenguaje publican a ráfagas). */
const UPDATE_DELAY_MS = 300;

/** Lo que dice el Consejo en cada nivel: [momento, índice] de board-lines.js. */
const QUOTES = /** @type {const} */ ([
  ['allClear', 1],
  ['newError', 0],
  ['newError', 3],
  ['newError', 1],
]);

/** @param {import('./alert-rules').AlertLevel} level */
function levelName(level) {
  switch (level) {
    case 0: return vscode.l10n.t('Clear');
    case 1: return vscode.l10n.t('Anomaly');
    case 2: return vscode.l10n.t('Alert');
    case 3: return vscode.l10n.t('Hiss Incursion');
  }
}

function countDiagnostics() {
  let errors = 0;
  let warnings = 0;
  for (const [, diagnostics] of vscode.languages.getDiagnostics()) {
    for (const d of diagnostics) {
      if (d.severity === vscode.DiagnosticSeverity.Error) errors++;
      else if (d.severity === vscode.DiagnosticSeverity.Warning) warnings++;
    }
  }
  return { errors, warnings };
}

class AlertLevelStatus {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    /** @type {vscode.StatusBarItem | undefined} */
    this.item = undefined;
    /** @type {vscode.Disposable | undefined} */
    this.listener = undefined;
    /** @type {NodeJS.Timeout | undefined} */
    this.timer = undefined;
    /** @type {import('./alert-rules').AlertLevel | undefined} */
    this.level = undefined;
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(ALERT)) this.refresh();
      }),
      { dispose: () => this.stop() }
    );
    this.refresh();
  }

  refresh() {
    if (vscode.workspace.getConfiguration(ALERT).get('enabled') !== true) {
      this.stop();
      return;
    }
    if (!this.item) {
      this.item = vscode.window.createStatusBarItem('bureauTheme.alertLevel', vscode.StatusBarAlignment.Left, -1);
      this.item.name = vscode.l10n.t('CONTROL Alert Level');
      this.item.command = 'workbench.actions.view.problems';
      this.listener = vscode.languages.onDidChangeDiagnostics(() => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.update(), UPDATE_DELAY_MS);
      });
    }
    this.update();
  }

  stop() {
    clearTimeout(this.timer);
    this.listener?.dispose();
    this.listener = undefined;
    this.item?.dispose();
    this.item = undefined;
    this.level = undefined;
  }

  update() {
    if (!this.item) return;
    const { errors, warnings } = countDiagnostics();
    const threshold = Number(vscode.workspace.getConfiguration(ALERT).get('incursionThreshold'));
    const level = alertLevel(errors, warnings, threshold);
    this.level = level;
    const name = levelName(level);
    const lang = vscode.env.language.toLowerCase().startsWith('es') ? 1 : 0;
    const [moment, index] = QUOTES[level];
    const tooltip = new vscode.MarkdownString(
      H.card({
        image: H.hoverImage(this.context.extensionPath, 'alarm'),
        imageSize: 64,
        title: vscode.l10n.t('Bureau alert level {0}: {1}', String(level), name),
        lines: [
          H.pill(name.toLocaleUpperCase(), LEVEL_COLORS[level]),
          H.escapeHtml(vscode.l10n.t('{0} errors · {1} warnings', String(errors), String(warnings))),
          `<i>${H.escapeHtml(LINES[moment][index][lang])}</i>`,
        ],
        rows: [[H.button('warning', vscode.l10n.t('Open the Problems panel'), 'workbench.actions.view.problems')]],
      }),
      true
    );
    tooltip.supportHtml = true;
    tooltip.isTrusted = { enabledCommands: ['workbench.actions.view.problems'] };
    H.setItem(this.item, {
      text: `$(bureau-alert) ${name.toLocaleUpperCase()}`,
      tooltip,
      backgroundColor:
        level === 3 ? new vscode.ThemeColor('statusBarItem.errorBackground') : level === 2 ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined,
      accessibilityInformation: {
        label: `${vscode.l10n.t('Bureau alert level {0}: {1}', String(level), name)}. ${vscode.l10n.t('{0} errors · {1} warnings', String(errors), String(warnings))}`,
        role: 'button',
      },
      visible: true,
    });
  }
}

module.exports = { AlertLevelStatus };
