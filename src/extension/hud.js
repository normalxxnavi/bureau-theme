// @ts-check
'use strict';

/**
 * El HUD del Bureau (`bureauTheme.hud.enabled`, desactivado por defecto): la
 * posición del cursor, la sangría, la codificación, el fin de línea y el
 * lenguaje del archivo en un solo elemento de la barra de estado, con el
 * diseño del tema (`13:1 │ ␣2 │ UTF-8 · LF │ {▪} MARKDOWN`), y un popup de
 * expediente con el logotipo del lenguaje de Bureau Icons y botones a los
 * mismos cambios que los de VS Code. Al pulsarlo, un menú con esos cambios.
 *
 * VS Code no deja que una extensión oculte sus propios elementos de la barra
 * de estado: para no verlos dos veces, se ocultan con su menú contextual (se
 * avisa la primera vez que se activa).
 */

const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const H = require('./hover');
const { HUD } = require('./config');
const { hudText, fileText } = require('./hud-text');

/** Los cambios que se pueden pulsar desde el popup (los mismos comandos que usan los elementos de VS Code). */
const ACTIONS = {
  gotoLine: 'workbench.action.gotoLine',
  spaces: 'editor.action.indentUsingSpaces',
  tabs: 'editor.action.indentUsingTabs',
  encoding: 'workbench.action.editor.changeEncoding',
  eol: 'workbench.action.editor.changeEOL',
  language: 'workbench.action.editor.changeLanguageMode',
};
const HINT_KEY = 'hudHintShown';

class BureauHud {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.item = vscode.window.createStatusBarItem('bureauTheme.hud', vscode.StatusBarAlignment.Right, 100.6);
    this.item.name = vscode.l10n.t('Bureau HUD');
    this.item.command = 'bureauTheme.hudMenu';
    /** Nombres de los lenguajes («markdown» → «Markdown»), de las extensiones que los aportan. @type {Map<string, string> | null} */
    this.names = null;
    /** Logotipos de Bureau Icons por lenguaje y variante (`data:`). @type {Map<string, string>} */
    this.logos = new Map();
    /** @type {any} */
    this.iconTheme = undefined;
    /** @type {NodeJS.Timeout | undefined} */
    this.timer = undefined;
  }

  init() {
    const later = () => {
      clearTimeout(this.timer);
      // El cursor se mueve muchas veces seguidas: una actualización cada 50 ms basta.
      this.timer = setTimeout(() => this.update(), 50);
    };
    this.context.subscriptions.push(
      this.item,
      { dispose: () => clearTimeout(this.timer) },
      vscode.commands.registerCommand('bureauTheme.hudMenu', () => this.menu()),
      vscode.window.onDidChangeActiveTextEditor(later),
      vscode.window.onDidChangeTextEditorSelection(later),
      vscode.window.onDidChangeTextEditorOptions(later),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) later();
      }),
      vscode.workspace.onDidOpenTextDocument(later), // al cambiar de lenguaje, VS Code reabre el documento
      vscode.window.onDidChangeActiveColorTheme(later),
      vscode.extensions.onDidChange(() => {
        this.names = null;
        later();
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(HUD)) this.refresh();
      })
    );
    this.refresh();
  }

  refresh() {
    if (vscode.workspace.getConfiguration().get(HUD) !== true) {
      clearTimeout(this.timer);
      H.setItem(this.item, { visible: false });
      return;
    }
    this.update();
    this.hint();
  }

  /** La primera vez: cómo ocultar los elementos de VS Code que repite. */
  hint() {
    if (this.context.globalState.get(HINT_KEY)) return;
    void this.context.globalState.update(HINT_KEY, true);
    vscode.window.showInformationMessage(
      vscode.l10n.t(
        'Bureau HUD on. To avoid seeing the same thing twice, hide the items of VS Code: right-click the status bar and untick Editor Selection, Editor Indentation, Editor Encoding, Editor End of Line and Editor Language.'
      )
    );
  }

  /** El nombre de un lenguaje («csharp» → «C#»). @param {string} id */
  languageName(id) {
    if (!this.names) {
      this.names = new Map();
      for (const ext of vscode.extensions.all) {
        for (const l of ext.packageJSON?.contributes?.languages ?? []) {
          const alias = Array.isArray(l?.aliases) ? l.aliases.find((/** @type {unknown} */ a) => typeof a === 'string' && a) : undefined;
          if (typeof l?.id === 'string' && alias && !this.names.has(l.id)) this.names.set(l.id, alias);
        }
      }
    }
    return this.names.get(id) ?? id;
  }

  /**
   * El logotipo del lenguaje en Bureau Icons (el de los temas claros con
   * CONTROL Astral), como `data:`; undefined si no tiene.
   * @param {string} languageId @param {boolean} light
   */
  logo(languageId, light) {
    const key = `${languageId}|${light}`;
    if (!this.logos.has(key)) {
      let uri = '';
      try {
        this.iconTheme ??= JSON.parse(fs.readFileSync(path.join(this.context.extensionPath, 'icons', 'bureau-icon-theme.json'), 'utf8'));
        const id = (light ? this.iconTheme.light : this.iconTheme)?.languageIds?.[languageId];
        const file = id && this.iconTheme.iconDefinitions?.[id]?.iconPath;
        if (file) uri = `data:image/svg+xml;base64,${fs.readFileSync(path.join(this.context.extensionPath, 'icons', file)).toString('base64')}`;
      } catch {
        // Sin el tema de iconos, el popup va sin imagen.
      }
      this.logos.set(key, uri);
    }
    return this.logos.get(key) || undefined;
  }

  update() {
    if (vscode.workspace.getConfiguration().get(HUD) !== true) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      H.setItem(this.item, { visible: false });
      return;
    }
    const doc = editor.document;
    const sel = editor.selection;
    const selected = editor.selections.reduce((n, s) => n + (s.isEmpty ? 0 : doc.offsetAt(s.end) - doc.offsetAt(s.start)), 0);
    const tabSize = typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 4;
    // `encoding` existe desde VS Code 1.100.
    const encoding = /** @type {{encoding?: unknown}} */ (doc).encoding;
    const s = {
      line: sel.active.line + 1,
      column: sel.active.character + 1,
      lines: doc.lineCount,
      selected,
      cursors: editor.selections.length,
      insertSpaces: editor.options.insertSpaces !== false,
      tabSize,
      encoding: typeof encoding === 'string' ? encoding : undefined,
      eol: /** @type {'LF' | 'CRLF'} */ (doc.eol === vscode.EndOfLine.CRLF ? 'CRLF' : 'LF'),
      language: this.languageName(doc.languageId),
    };
    const light = [vscode.ColorThemeKind.Light, vscode.ColorThemeKind.HighContrastLight].includes(vscode.window.activeColorTheme.kind);
    const md = new vscode.MarkdownString(
      H.card({
        image: this.logo(doc.languageId, light),
        imageSize: 48,
        title: path.basename(doc.uri.path) || doc.uri.toString(),
        lines: [
          `<b>${H.escapeHtml(s.language)}</b>`,
          H.escapeHtml(vscode.l10n.t('Line {0} of {1}, column {2}', s.line, s.lines, s.column) + (s.selected ? ` · ${vscode.l10n.t('{0} selected', s.selected)}` : '')),
          H.escapeHtml(s.insertSpaces ? vscode.l10n.t('Indentation: {0} spaces', tabSize) : vscode.l10n.t('Indentation: tabs ({0})', tabSize)),
          H.escapeHtml(fileText(s)),
        ],
        rows: [
          [H.button('arrow-right', vscode.l10n.t('Go to line'), ACTIONS.gotoLine), H.button('bracket', vscode.l10n.t('Language'), ACTIONS.language)],
          [
            H.button('whitespace', vscode.l10n.t('Spaces'), ACTIONS.spaces),
            H.button('whitespace', vscode.l10n.t('Tabs'), ACTIONS.tabs),
            ...(s.encoding ? [H.button('file-binary', vscode.l10n.t('Encoding'), ACTIONS.encoding)] : []),
            H.button('newline', vscode.l10n.t('End of line'), ACTIONS.eol),
          ],
        ],
      }),
      true
    );
    md.supportHtml = true;
    md.isTrusted = { enabledCommands: Object.values(ACTIONS) };
    H.setItem(this.item, {
      text: hudText(s),
      tooltip: md,
      accessibilityInformation: { label: `${vscode.l10n.t('Bureau HUD')}: ${vscode.l10n.t('Line {0} of {1}, column {2}', s.line, s.lines, s.column)}, ${s.language}`, role: 'button' },
      visible: true,
    });
  }

  /** El menú del HUD: los mismos cambios que el popup. */
  async menu() {
    const items = [
      { label: `$(arrow-right) ${vscode.l10n.t('Go to line…')}`, command: ACTIONS.gotoLine },
      { label: `$(bracket) ${vscode.l10n.t('Language…')}`, command: ACTIONS.language },
      { label: `$(whitespace) ${vscode.l10n.t('Indent using spaces…')}`, command: ACTIONS.spaces },
      { label: `$(whitespace) ${vscode.l10n.t('Indent using tabs…')}`, command: ACTIONS.tabs },
      { label: `$(file-binary) ${vscode.l10n.t('Encoding…')}`, command: ACTIONS.encoding },
      { label: `$(newline) ${vscode.l10n.t('End of line…')}`, command: ACTIONS.eol },
    ];
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('CONTROL — Bureau HUD'), placeHolder: path.basename(vscode.window.activeTextEditor?.document.uri.path ?? '') });
    if (choice) await vscode.commands.executeCommand(choice.command);
  }
}

module.exports = { BureauHud };
