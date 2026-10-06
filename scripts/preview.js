// @ts-check
'use strict';

/**
 * Vista previa de la sintaxis SIN abrir VS Code.
 *
 * Colorea los archivos de test-workspace/ con las gramáticas TextMate reales de
 * tu instalación de VS Code (y de la extensión de C# si está instalada) y con
 * el mismo motor de temas que usa VS Code (vscode-textmate).
 *
 *   npm run preview                 → HTML en .preview/ + informe de scopes sin color
 *   npm run preview -- --report     → solo el informe
 *
 * Limitación: no incluye semantic tokens (los generan los servidores de
 * lenguaje en ejecución). Para eso, F5 y "Developer: Inspect Editor Tokens".
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');
const { palettes, buildTheme, ROOT } = require('../src/theme/build');
const { findAppRoot } = require('./lib/vscode-install');

const WORKSPACE = path.join(ROOT, 'test-workspace');
const OUT = path.join(ROOT, '.preview');
const SENTINEL = '#FF00FF';

/** Bits de los metadatos de tokenizeLine2 (vscode-textmate EncodedTokenAttributes). */
const FONT_STYLE_MASK = 0b00000000000000000111100000000000;
const FOREGROUND_MASK = 0b00000000111111111000000000000000;
const FONT_STYLE_OFFSET = 11;
const FOREGROUND_OFFSET = 15;

/**
 * Lee las gramáticas y lenguajes que declaran las extensiones (integradas y,
 * si existe, la de C#, que en la práctica gestiona los .cshtml).
 * @param {string} appRoot
 */
function loadGrammarCatalog(appRoot) {
  const extDirs = fs.readdirSync(path.join(appRoot, 'extensions')).map((d) => path.join(appRoot, 'extensions', d));
  const userExt = path.join(os.homedir(), '.vscode', 'extensions');
  if (fs.existsSync(userExt)) {
    for (const d of fs.readdirSync(userExt)) if (d.startsWith('ms-dotnettools.csharp-')) extDirs.push(path.join(userExt, d));
  }

  /** @type {Map<string, string>} */ const scopeToPath = new Map();
  /** @type {Map<string, string>} */ const languageToScope = new Map();
  /** @type {Map<string, string>} */ const extToLanguage = new Map();
  /** @type {Map<string, string[]>} */ const injections = new Map();

  for (const dir of extDirs) {
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const c = JSON.parse(fs.readFileSync(manifest, 'utf8')).contributes ?? {};
    for (const g of c.grammars ?? []) {
      scopeToPath.set(g.scopeName, path.join(dir, g.path));
      if (g.language) languageToScope.set(g.language, g.scopeName);
      for (const target of g.injectTo ?? []) injections.set(target, [...(injections.get(target) ?? []), g.scopeName]);
    }
    for (const l of c.languages ?? []) for (const e of l.extensions ?? []) extToLanguage.set(e.toLowerCase(), l.id);
  }
  return { scopeToPath, languageToScope, extToLanguage, injections };
}

async function createRegistry(/** @type {ReturnType<typeof loadGrammarCatalog>} */ catalog) {
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
  await oniguruma.loadWASM(wasm);
  return new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      const file = catalog.scopeToPath.get(scopeName);
      if (!file || !fs.existsSync(file)) return null;
      return vsctm.parseRawGrammar(fs.readFileSync(file, 'utf8'), file);
    },
    getInjections: (scopeName) => catalog.injections.get(scopeName),
  });
}

/** @param {any} theme @param {string} defaultFg */
function rawTheme(theme, defaultFg) {
  return {
    name: theme.name,
    settings: [{ settings: { foreground: defaultFg, background: theme.colors['editor.background'] } }, ...theme.tokenColors],
  };
}

const escapeHtml = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Tokeniza un archivo y devuelve líneas de spans {text, color, fontStyle, scopes}.
 * @param {vsctm.IGrammar} grammar @param {string} text @param {string[]} colorMap
 */
function tokenize(grammar, text, colorMap) {
  let stack = vsctm.INITIAL;
  const lines = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const r2 = grammar.tokenizeLine2(line, stack);
    const r1 = grammar.tokenizeLine(line, stack);
    const spans = [];
    for (let i = 0; i < r2.tokens.length; i += 2) {
      const start = r2.tokens[i];
      const end = i + 2 < r2.tokens.length ? r2.tokens[i + 2] : line.length;
      const meta = r2.tokens[i + 1];
      const fg = colorMap[(meta & FOREGROUND_MASK) >>> FOREGROUND_OFFSET];
      const fontStyle = (meta & FONT_STYLE_MASK) >>> FONT_STYLE_OFFSET;
      const t1 = r1.tokens.find((t) => t.startIndex <= start && t.endIndex > start);
      spans.push({ text: line.slice(start, end), color: fg, fontStyle, scopes: t1 ? t1.scopes : [] });
    }
    lines.push(spans);
    stack = r2.ruleStack;
  }
  return lines;
}

/** Scope "significativo" más interno (ignora meta.*, source.*, text.*). */
function meaningfulScope(/** @type {string[]} */ scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i];
    if (!/^(meta|source|text)\./.test(s) && !/^(source|text)$/.test(s)) return s;
  }
  return null;
}

async function main() {
  const reportOnly = process.argv.includes('--report');
  const appRoot = findAppRoot();
  if (!appRoot) {
    console.error('No se encontró VS Code. Define VSCODE_PATH.');
    process.exit(1);
  }
  const catalog = loadGrammarCatalog(appRoot);
  const registry = await createRegistry(catalog);

  const files = fs
    .readdirSync(WORKSPACE)
    .filter((f) => fs.statSync(path.join(WORKSPACE, f)).isFile() && f !== 'README.md')
    .sort();

  // 1) Informe: tokens que NINGUNA regla del tema colorea (se pintan con un color centinela).
  const darkTheme = buildTheme(palettes[0]);
  registry.setTheme(rawTheme(darkTheme, SENTINEL));
  /** @type {Map<string, {count: number, sample: string, files: Set<string>}>} */
  const unstyled = new Map();
  /** @type {Map<string, string>} */
  const fileScopes = new Map();
  for (const file of files) {
    const lang = catalog.extToLanguage.get(path.extname(file).toLowerCase());
    const scope = lang && catalog.languageToScope.get(lang);
    if (!scope) {
      console.warn(`  (sin gramática para ${file})`);
      continue;
    }
    fileScopes.set(file, scope);
    const grammar = await registry.loadGrammar(scope);
    if (!grammar) continue;
    const colorMap = registry.getColorMap();
    for (const spans of tokenize(grammar, fs.readFileSync(path.join(WORKSPACE, file), 'utf8'), colorMap)) {
      for (const s of spans) {
        if (s.color?.toUpperCase() !== SENTINEL || !s.text.trim()) continue;
        const key = meaningfulScope(s.scopes);
        if (!key) continue;
        const entry = unstyled.get(key) ?? { count: 0, sample: s.text.trim(), files: new Set() };
        entry.count++;
        entry.files.add(file);
        unstyled.set(key, entry);
      }
    }
  }
  console.log(unstyled.size ? `Scopes sin regla propia (usan el color de texto por defecto): ${unstyled.size}` : '✔ Todos los tokens significativos tienen una regla');
  for (const [scope, e] of [...unstyled].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${String(e.count).padStart(3)}  ${scope.padEnd(60)} «${e.sample.slice(0, 24)}»  ${[...e.files].join(', ')}`);
  }
  if (reportOnly) return;

  // 2) HTML por tema y archivo.
  fs.mkdirSync(OUT, { recursive: true });
  for (const p of palettes) {
    const theme = buildTheme(p);
    registry.setTheme(rawTheme(theme, theme.colors['editor.foreground']));
    const c = theme.colors;
    for (const [file, scope] of fileScopes) {
      const grammar = await registry.loadGrammar(scope);
      if (!grammar) continue;
      const lines = tokenize(grammar, fs.readFileSync(path.join(WORKSPACE, file), 'utf8'), registry.getColorMap());
      const body = lines
        .map((spans, i) => {
          const code = spans
            .map((s) => {
              const st = [`color:${s.color}`];
              if (s.fontStyle & 1) st.push('font-style:italic');
              if (s.fontStyle & 2) st.push('font-weight:bold');
              if (s.fontStyle & 4) st.push('text-decoration:underline');
              if (s.fontStyle & 8) st.push('text-decoration:line-through');
              return `<span style="${st.join(';')}" title="${escapeHtml(s.scopes.join(' '))}">${escapeHtml(s.text)}</span>`;
            })
            .join('');
          return `<div class="l"><span class="n">${i + 1}</span>${code || ' '}</div>`;
        })
        .join('\n');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.label} — ${file}</title><style>
  body{margin:0;background:${c['editor.background']};color:${c['editor.foreground']};font:14px/1.55 'Cascadia Code',Consolas,monospace}
  header{background:${c['editorGroupHeader.tabsBackground']};border-bottom:1px solid ${c['editorGroupHeader.tabsBorder']};display:flex}
  .tab{padding:8px 16px;color:${c['tab.activeForeground']};background:${c['tab.activeBackground']};border-top:2px solid ${c['tab.activeBorderTop']};font-family:'Segoe UI',sans-serif;font-size:13px}
  .tab small{color:${c['tab.inactiveForeground']};margin-left:12px}
  main{padding:8px 0}.l{white-space:pre;padding-right:24px}.n{display:inline-block;width:48px;padding-right:16px;text-align:right;color:${c['editorLineNumber.foreground']}}
</style></head><body><header><div class="tab">${escapeHtml(file)}<small>${p.label}</small></div></header><main>
${body}
</main></body></html>`;
      fs.writeFileSync(path.join(OUT, `${p.id}--${file}.html`), html);
    }
  }
  console.log(`\n✔ Vistas previas en ${path.relative(ROOT, OUT)}/ (${palettes.length} temas × ${fileScopes.size} archivos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
