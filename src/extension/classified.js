// @ts-check
'use strict';

/**
 * Modo Clasificado: tapa con barras de censura los secretos de los archivos
 * de configuración (.env, claves, appsettings…) para compartir pantalla o
 * hacer streaming sin enseñarlos. Se carga solo si está activado
 * (`bureauTheme.classified.enabled`).
 *
 * - Las barras son decoraciones: el archivo no cambia y el valor sigue ahí al
 *   copiar, buscar o guardar.
 * - Se revela la línea en la que pones el cursor con el teclado o el ratón,
 *   para poder editarla. Al abrir un archivo no se revela ninguna (el cursor
 *   empieza en la primera línea).
 * - El icono de la barra de estado desclasifica el archivo activo hasta que
 *   lo vuelves a pulsar o cierras el archivo.
 */

const vscode = require('vscode');
const { classifiedSpans, isEnvFile, normalizeKeywords, normalizeFilePatterns } = require('./redact');
const { CLASSIFIED } = require('./config');
const H = require('./hover');

/** Comandos que se pueden pulsar desde los popups. */
const POPUP_COMMANDS = ['bureauTheme.declassify', 'bureauTheme.toggleClassified'];
const AMBER = '#C98A1E';

/** Pausa tras una edición antes de volver a buscar secretos. */
const UPDATE_DELAY_MS = 100;

class ClassifiedMode {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.started = false;
    /** @type {vscode.Disposable[]} */
    this.listeners = [];
    /** @type {vscode.TextEditorDecorationType | undefined} */
    this.decoration = undefined;
    /** @type {vscode.StatusBarItem | undefined} */
    this.item = undefined;
    /** @type {vscode.MarkdownString | undefined} */
    this.hover = undefined;
    /** @type {string[]} */
    this.patterns = [];
    /** @type {string[]} */
    this.keywords = [];
    /** @type {Map<string, {version: number, ranges: vscode.Range[]}>} */
    this.cache = new Map();
    /** @type {Map<string, boolean>} ¿documento clasificado? (los patrones solo se evalúan una vez) */
    this.matches = new Map();
    /** @type {Map<string, Set<number>>} líneas reveladas por documento */
    this.revealed = new Map();
    /** @type {Set<string>} documentos desclasificados con el icono */
    this.declassified = new Set();
    /** @type {Map<string, number>} barras pintadas por documento (para el test de integración) */
    this.applied = new Map();
    /** @type {Map<string, NodeJS.Timeout>} */
    this.timers = new Map();
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(CLASSIFIED)) this.refresh();
      }),
      { dispose: () => this.stop() }
    );
    this.refresh();
  }

  refresh() {
    const c = vscode.workspace.getConfiguration(CLASSIFIED);
    this.patterns = normalizeFilePatterns(c.get('files'));
    this.keywords = normalizeKeywords(c.get('keywords'));
    this.cache.clear();
    this.matches.clear();
    if (c.get('enabled') !== true) {
      this.stop();
      return;
    }
    this.start();
    // Los patrones o las palabras han podido cambiar: se repinta todo desde cero.
    for (const editor of vscode.window.visibleTextEditors) if (this.decoration) editor.setDecorations(this.decoration, []);
    this.applied.clear();
    this.updateAll();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.decoration = vscode.window.createTextEditorDecorationType({
      color: 'transparent',
      backgroundColor: new vscode.ThemeColor('bureauTheme.classifiedBar'),
      borderRadius: '1px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    this.item = vscode.window.createStatusBarItem('bureauTheme.classified', vscode.StatusBarAlignment.Right, -99);
    this.item.name = vscode.l10n.t('CONTROL Classified Mode');
    this.item.command = 'bureauTheme.declassify';
    // El popup de cada barra: la pastilla, cómo revelarla y un botón para desclasificar el archivo.
    this.hover = new vscode.MarkdownString(
      `${H.pill(vscode.l10n.t('CLASSIFIED'), H.ACCENT.background, H.ACCENT.color)} &nbsp;${H.escapeHtml(vscode.l10n.t('Put the cursor on this line to reveal it.'))}\n\n${H.button('bureau-declassified', vscode.l10n.t('Reveal this file'), 'bureauTheme.declassify')}`,
      true
    );
    this.hover.supportHtml = true;
    this.hover.isTrusted = { enabledCommands: POPUP_COMMANDS };
    this.listeners.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this.updateAll()),
      vscode.window.onDidChangeActiveTextEditor(() => this.updateStatus()),
      vscode.window.onDidChangeTextEditorSelection((e) => this.onSelection(e)),
      vscode.workspace.onDidChangeTextDocument((e) => this.schedule(e.document)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.forget(doc.uri.toString()))
    );
  }

  stop() {
    this.started = false;
    for (const l of this.listeners.splice(0)) l.dispose();
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.decoration?.dispose(); // quita todas las barras
    this.decoration = undefined;
    this.item?.dispose();
    this.item = undefined;
    this.cache.clear();
    this.matches.clear();
    this.revealed.clear();
    this.declassified.clear();
    this.applied.clear();
  }

  /** @param {string} key */
  forget(key) {
    this.cache.delete(key);
    this.matches.delete(key);
    this.revealed.delete(key);
    this.declassified.delete(key);
    this.applied.delete(key);
  }

  /** ¿Es un archivo clasificado (según `bureauTheme.classified.files`)? @param {vscode.TextDocument} doc */
  isClassified(doc) {
    const key = doc.uri.toString();
    let classified = this.matches.get(key);
    if (classified === undefined) {
      classified = this.patterns.length > 0 && vscode.languages.match(this.patterns.map((pattern) => ({ pattern })), doc) > 0;
      this.matches.set(key, classified);
    }
    return classified;
  }

  /** Barras de un documento (en caché por versión). @param {vscode.TextDocument} doc */
  rangesFor(doc) {
    const key = doc.uri.toString();
    const cached = this.cache.get(key);
    if (cached && cached.version === doc.version) return cached.ranges;
    const spans = classifiedSpans(doc.getText(), { envFile: isEnvFile(doc.fileName) || doc.languageId === 'dotenv', keywords: this.keywords });
    const ranges = spans.map((s) => new vscode.Range(doc.positionAt(s.start), doc.positionAt(s.end)));
    this.cache.set(key, { version: doc.version, ranges });
    return ranges;
  }

  updateAll() {
    for (const editor of vscode.window.visibleTextEditors) this.update(editor);
    this.updateStatus();
  }

  /** @param {vscode.TextEditor} editor */
  update(editor) {
    if (!this.decoration) return;
    const doc = editor.document;
    if (!this.isClassified(doc)) return; // nunca tiene barras: no hay nada que pintar ni quitar
    const key = doc.uri.toString();
    if (this.declassified.has(key)) {
      editor.setDecorations(this.decoration, []);
      this.applied.set(key, 0);
      return;
    }
    const lines = this.revealed.get(key);
    const ranges = this.rangesFor(doc).filter((r) => !lines?.has(r.start.line));
    editor.setDecorations(this.decoration, ranges.map((range) => ({ range, hoverMessage: this.hover })));
    this.applied.set(key, ranges.length);
  }

  /** @param {vscode.TextDocument} doc */
  schedule(doc) {
    if (!this.started || !this.isClassified(doc)) return;
    const key = doc.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        for (const editor of vscode.window.visibleTextEditors) if (editor.document === doc) this.update(editor);
      }, UPDATE_DELAY_MS)
    );
  }

  /**
   * Revela las líneas del cursor cuando lo mueves tú (teclado o ratón). Un
   * salto por comando («Ir a la definición»…) vuelve a taparlas todas.
   * @param {vscode.TextEditorSelectionChangeEvent} e
   */
  onSelection(e) {
    const doc = e.textEditor.document;
    if (!this.isClassified(doc)) return;
    const key = doc.uri.toString();
    const byUser = e.kind === vscode.TextEditorSelectionChangeKind.Keyboard || e.kind === vscode.TextEditorSelectionChangeKind.Mouse;
    /** @type {Set<number>} */
    const lines = new Set();
    if (byUser) for (const s of e.selections) for (let l = s.start.line; l <= s.end.line; l++) lines.add(l);
    const before = this.revealed.get(key);
    if (before && before.size === lines.size && [...lines].every((l) => before.has(l))) return;
    this.revealed.set(key, lines);
    for (const editor of vscode.window.visibleTextEditors) if (editor.document === doc) this.update(editor);
  }

  updateStatus() {
    if (!this.item) return;
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !this.isClassified(doc)) {
      H.setItem(this.item, { visible: false });
      return;
    }
    const open = this.declassified.has(doc.uri.toString());
    const tooltip = new vscode.MarkdownString(
      H.card({
        image: H.hoverImage(this.context.extensionPath, 'classified'),
        imageSize: 64,
        title: vscode.l10n.t('CONTROL Classified Mode'),
        lines: [
          open ? H.pill(vscode.l10n.t('DECLASSIFIED'), AMBER) : H.pill(vscode.l10n.t('CLASSIFIED'), H.ACCENT.background, H.ACCENT.color),
          H.escapeHtml(open ? vscode.l10n.t('The values of this file are visible.') : vscode.l10n.t('The secret values of this file are covered.')),
        ],
        rows: [
          [
            open
              ? H.button('bureau-classified', vscode.l10n.t('Cover them again'), 'bureauTheme.declassify')
              : H.button('bureau-declassified', vscode.l10n.t('Reveal this file'), 'bureauTheme.declassify'),
            H.button('close', vscode.l10n.t('Turn off Classified mode'), 'bureauTheme.toggleClassified'),
          ],
        ],
      }),
      true
    );
    tooltip.supportHtml = true;
    tooltip.isTrusted = { enabledCommands: POPUP_COMMANDS };
    H.setItem(this.item, {
      text: open ? `$(bureau-declassified) ${vscode.l10n.t('DECLASSIFIED')}` : `$(bureau-classified) ${vscode.l10n.t('CLASSIFIED')}`,
      tooltip,
      backgroundColor: open ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined,
      accessibilityInformation: { label: open ? vscode.l10n.t('DECLASSIFIED') : vscode.l10n.t('CLASSIFIED'), role: 'button' },
      visible: true,
    });
  }

  /** Desclasifica (o vuelve a clasificar) el archivo activo. */
  toggleActive() {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !this.isClassified(doc)) {
      vscode.window.showInformationMessage(vscode.l10n.t('The active file is not classified. Classified files are set in "bureauTheme.classified.files".'));
      return;
    }
    const key = doc.uri.toString();
    if (this.declassified.has(key)) this.declassified.delete(key);
    else this.declassified.add(key);
    this.updateAll();
  }
}

module.exports = { ClassifiedMode };
