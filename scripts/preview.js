// @ts-check
'use strict';

/**
 * Vista previa de la sintaxis SIN abrir VS Code.
 *
 * Colorea las muestras de test-workspace/ (un archivo por lenguaje, en la raíz
 * y en languages/) con las gramáticas TextMate reales de tu instalación de
 * VS Code (y de la extensión de C# si está instalada) y con el mismo motor de
 * temas que usa VS Code (vscode-textmate). Los lenguajes que VS Code no trae
 * (Kotlin, Elixir, Zig, Vue…) usan las gramáticas de tm-grammars, las mismas
 * que publican sus extensiones.
 *
 *   npm run preview                 → HTML en .preview/ + informe de scopes sin color
 *   npm run preview -- --report     → solo el informe
 *   npm run preview -- --check      → falla si algún token se queda sin regla o si
 *                                     algún lenguaje de VS Code no tiene muestra
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
const { tmGrammarsDir } = require('./lib/scopes');

const WORKSPACE = path.join(ROOT, 'test-workspace');
const SAMPLES = [WORKSPACE, path.join(WORKSPACE, 'languages')];
const OUT = path.join(ROOT, '.preview');
const SENTINEL = '#FF00FF';

/**
 * Lenguajes de VS Code que no necesitan muestra propia: solo existen
 * incrustados en otros (fórmulas de Markdown, LaTeX dentro de C++).
 */
const EMBEDDED_ONLY = new Set(['cpp_embedded_latex', 'markdown-math', 'markdown_latex_combined']);

/**
 * Extensiones y nombres de archivo de las muestras de lenguajes que VS Code no
 * trae, cuando no coinciden con el nombre o un alias de su gramática en
 * tm-grammars (`.kt` → kotlin ya se deduce del alias).
 */
const EXTRA_EXTENSIONS = {
  '.ex': 'elixir', '.exs': 'elixir', '.ml': 'ocaml', '.rkt': 'racket', '.scm': 'scheme', '.pro': 'prolog', '.adb': 'ada',
  '.hx': 'haxe', '.cr': 'crystal', '.sv': 'system-verilog', '.vhd': 'vhdl', '.cob': 'cobol', '.asm': 'asm', '.sol': 'solidity',
  '.purs': 'purescript', '.ll': 'llvm', '.service': 'systemd', '.feature': 'gherkin', '.rq': 'sparql', '.pas': 'pascal',
  '.f90': 'fortran-free-form', '.tf': 'terraform', '.adoc': 'asciidoc', '.styl': 'stylus', '.wl': 'wolfram', '.nu': 'nushell',
};
const EXTRA_FILENAMES = { 'CMakeLists.txt': 'cmake', 'nginx.conf': 'nginx', justfile: 'just' };

/** Bits de los metadatos de tokenizeLine2 (vscode-textmate EncodedTokenAttributes). */
const FONT_STYLE_MASK = 0b00000000000000000111100000000000;
const FOREGROUND_MASK = 0b00000000111111111000000000000000;
const FONT_STYLE_OFFSET = 11;
const FOREGROUND_OFFSET = 15;

/**
 * Lee las gramáticas y lenguajes que declaran las extensiones (integradas y,
 * si existe, la de C#, que en la práctica gestiona los .cshtml) y, para lo
 * que no cubren, las de tm-grammars.
 * @param {string} appRoot
 */
async function loadGrammarCatalog(appRoot) {
  const builtinDirs = fs.readdirSync(path.join(appRoot, 'extensions')).map((d) => path.join(appRoot, 'extensions', d));
  const extDirs = [...builtinDirs];
  const userExt = path.join(os.homedir(), '.vscode', 'extensions');
  if (fs.existsSync(userExt)) {
    for (const d of fs.readdirSync(userExt)) if (d.startsWith('ms-dotnettools.csharp-')) extDirs.push(path.join(userExt, d));
  }

  /** @type {Map<string, string>} */ const scopeToPath = new Map();
  /** @type {Map<string, string>} */ const languageToScope = new Map();
  /** @type {Map<string, string>} extensión (en minúsculas, con punto) → lenguaje */ const extToLanguage = new Map();
  /** @type {Map<string, string>} */ const fileToLanguage = new Map();
  /** @type {Map<string, string[]>} */ const injections = new Map();
  /** Lenguajes de VS Code con gramática propia (los que deben tener muestra). */
  /** @type {Map<string, string>} */ const builtin = new Map();
  /**
   * Los mismos mapas solo con los lenguajes de VS Code: una extensión (la de
   * C# con los .cshtml) puede quedarse la extensión de archivo de uno integrado.
   */
  const builtinLookup = { extToLanguage: new Map(), fileToLanguage: new Map() };

  for (const dir of extDirs) {
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const c = JSON.parse(fs.readFileSync(manifest, 'utf8')).contributes ?? {};
    for (const g of c.grammars ?? []) {
      scopeToPath.set(g.scopeName, path.join(dir, g.path));
      if (g.language) languageToScope.set(g.language, g.scopeName);
      if (g.language && builtinDirs.includes(dir)) builtin.set(g.language, g.scopeName);
      for (const target of g.injectTo ?? []) injections.set(target, [...(injections.get(target) ?? []), g.scopeName]);
    }
    for (const l of c.languages ?? []) {
      for (const e of l.extensions ?? []) {
        extToLanguage.set(e.toLowerCase(), l.id);
        if (builtinDirs.includes(dir)) builtinLookup.extToLanguage.set(e.toLowerCase(), l.id);
      }
      for (const f of l.filenames ?? []) {
        fileToLanguage.set(f, l.id);
        if (builtinDirs.includes(dir)) builtinLookup.fileToLanguage.set(f, l.id);
      }
    }
  }

  // tm-grammars: solo para los scopes y lenguajes que VS Code no tiene.
  const tmDir = tmGrammarsDir();
  const tm = /** @type {{grammars: any[], injections: any[]}} */ (await import('tm-grammars'));
  for (const g of [...tm.grammars, ...tm.injections]) {
    if (!scopeToPath.has(g.scopeName)) scopeToPath.set(g.scopeName, path.join(tmDir, `${g.name}.json`));
    for (const target of g.injectTo ?? []) injections.set(target, [...(injections.get(target) ?? []), g.scopeName]);
  }
  for (const g of tm.grammars) {
    const id = `tm:${g.name}`;
    languageToScope.set(id, g.scopeName);
    for (const name of [g.name, ...(g.aliases ?? [])]) if (!extToLanguage.has(`.${name}`)) extToLanguage.set(`.${name}`, id);
  }
  for (const [ext, name] of Object.entries(EXTRA_EXTENSIONS)) if (!extToLanguage.has(ext)) extToLanguage.set(ext, `tm:${name}`);
  for (const [file, name] of Object.entries(EXTRA_FILENAMES)) fileToLanguage.set(file, `tm:${name}`);
  // Vue: las directivas y la interpolación se inyectan en su plantilla.
  injections.set('text.html.vue', [...(injections.get('text.html.vue') ?? []), ...(injections.get('source.vue') ?? [])]);

  return { scopeToPath, languageToScope, extToLanguage, fileToLanguage, injections, builtin, builtinLookup };
}

/**
 * Lenguaje de un archivo como lo decide VS Code: primero el nombre exacto
 * (Dockerfile, Makefile…) y después la extensión más larga (`.prompt.md` antes que `.md`).
 * @param {{fileToLanguage: Map<string, string>, extToLanguage: Map<string, string>}} catalog @param {string} file
 */
function languageOf(catalog, file) {
  const base = path.basename(file);
  const byName = catalog.fileToLanguage.get(base);
  if (byName) return byName;
  const lower = base.toLowerCase();
  for (let i = lower.indexOf('.'); i !== -1; i = lower.indexOf('.', i + 1)) {
    const lang = catalog.extToLanguage.get(lower.slice(i));
    if (lang) return lang;
  }
  return undefined;
}

async function createRegistry(/** @type {Awaited<ReturnType<typeof loadGrammarCatalog>>} */ catalog) {
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

/**
 * Regiones de gramáticas de extensiones con nombres propios: marcan un trozo
 * de código (el cuerpo de una arquitectura de VHDL, la línea de petición de
 * HTTP, la primera columna de un CSV), no un token, y ningún tema las colorea.
 */
const REGIONS = new Set([
  'support.block.architecture',
  'symbol.unrecognized.wolfram',
  'markup.math.typst',
  'rainbow1',
  'rainbowgroup',
  'sass.script.maps',
  'sass.use',
  'entity.function.definition.apl',
  'http.filevariable',
  'http.requestline',
  'http.version',
  'markup.admonition.asciidoc',
]);

/**
 * Scope "significativo" más interno: ignora meta.*, source.*, text.*, la raíz
 * de la gramática, las regiones y los que la gramática deja en el color de
 * texto a propósito (el texto de una lista o de una tabla, código incrustado).
 */
function meaningfulScope(/** @type {string[]} */ scopes) {
  for (let i = scopes.length - 1; i >= 1; i--) {
    const s = scopes[i];
    if (/^(meta|source|text|markup\.list|markup\.table|markup\.fenced_code|markup\.code|markup\.other|markup\.paragraph)\./.test(s)) continue;
    if (/^(source|text)$/.test(s) || REGIONS.has(s)) continue;
    return s;
  }
  return null;
}

/** Muestras: archivos de test-workspace/ y test-workspace/languages/ (sin los README). */
function sampleFiles() {
  return SAMPLES.filter((dir) => fs.existsSync(dir))
    .flatMap((dir) => fs.readdirSync(dir).map((f) => path.join(dir, f)))
    .filter((f) => fs.statSync(f).isFile() && path.basename(f) !== 'README.md')
    .sort();
}

async function main() {
  const reportOnly = process.argv.includes('--report');
  const check = process.argv.includes('--check');
  const appRoot = findAppRoot();
  if (!appRoot) {
    console.error('No se encontró VS Code. Define VSCODE_PATH.');
    process.exit(1);
  }
  const catalog = await loadGrammarCatalog(appRoot);
  const registry = await createRegistry(catalog);
  const rel = (/** @type {string} */ f) => path.relative(WORKSPACE, f).replace(/\\/g, '/');
  let failed = false;

  // 1) Informe: tokens que NINGUNA regla del tema colorea (se pintan con un color centinela).
  const darkTheme = buildTheme(palettes[0]);
  registry.setTheme(rawTheme(darkTheme, SENTINEL));
  /** @type {Map<string, {count: number, sample: string, files: Set<string>}>} */
  const unstyled = new Map();
  /** @type {Map<string, string>} archivo → scope de su gramática */
  const fileScopes = new Map();
  /** @type {Set<string>} */
  const sampleLanguages = new Set();
  /** @type {string[]} */
  const unknown = [];
  for (const file of sampleFiles()) {
    const lang = languageOf(catalog, file);
    const scope = lang && catalog.languageToScope.get(lang);
    const grammar = scope ? await registry.loadGrammar(scope) : null;
    if (!scope || !grammar) {
      // Texto plano (git-conflict.txt) no tiene gramática a propósito.
      if (!file.endsWith('.txt')) unknown.push(rel(file));
      continue;
    }
    fileScopes.set(file, scope);
    sampleLanguages.add(/** @type {string} */ (lang));
    const builtinLang = languageOf(catalog.builtinLookup, file);
    if (builtinLang) sampleLanguages.add(builtinLang);
    const colorMap = registry.getColorMap();
    for (const spans of tokenize(grammar, fs.readFileSync(file, 'utf8'), colorMap)) {
      for (const s of spans) {
        // Con cursiva o negrita (Markdown, énfasis) el color de texto es el correcto.
        if (s.color?.toUpperCase() !== SENTINEL || s.fontStyle || !s.text.trim()) continue;
        const key = meaningfulScope(s.scopes);
        if (!key) continue;
        const entry = unstyled.get(key) ?? { count: 0, sample: s.text.trim(), files: new Set() };
        entry.count++;
        entry.files.add(rel(file));
        unstyled.set(key, entry);
      }
    }
  }

  const scopesWithSample = new Set(fileScopes.values());
  const missing = [...catalog.builtin]
    .filter(([lang, scope]) => !EMBEDDED_ONLY.has(lang) && !sampleLanguages.has(lang) && !scopesWithSample.has(scope))
    .map(([lang]) => lang);
  const builtinCount = [...catalog.builtin].filter(([lang, s]) => sampleLanguages.has(lang) || scopesWithSample.has(s)).length;
  const extraCount = new Set([...fileScopes.values()].filter((s) => ![...catalog.builtin.values()].includes(s))).size;
  console.log(`${fileScopes.size} muestras: ${builtinCount} lenguajes de VS Code y ${extraCount} con las gramáticas de sus extensiones (tm-grammars, C#)`);

  if (unknown.length) {
    failed = true;
    console.log(`✘ Muestras sin gramática: ${unknown.join(', ')}`);
  }
  if (missing.length) {
    failed = true;
    console.log(`✘ Lenguajes de VS Code sin muestra en test-workspace/languages/: ${missing.join(', ')}`);
  }
  if (unstyled.size) {
    failed = true;
    console.log(`✘ Scopes sin regla propia (usan el color de texto por defecto): ${unstyled.size}`);
  } else {
    console.log('✔ Todos los tokens significativos tienen una regla');
  }
  for (const [scope, e] of [...unstyled].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${String(e.count).padStart(3)}  ${scope.padEnd(60)} «${e.sample.slice(0, 24)}»  ${[...e.files].join(', ')}`);
  }
  if (check) process.exit(failed ? 1 : 0);
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
      const lines = tokenize(grammar, fs.readFileSync(file, 'utf8'), registry.getColorMap());
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
      const name = rel(file);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.label} — ${escapeHtml(name)}</title><style>
  body{margin:0;background:${c['editor.background']};color:${c['editor.foreground']};font:14px/1.55 'Cascadia Code',Consolas,monospace}
  header{background:${c['editorGroupHeader.tabsBackground']};border-bottom:1px solid ${c['editorGroupHeader.tabsBorder']};display:flex}
  .tab{padding:8px 16px;color:${c['tab.activeForeground']};background:${c['tab.activeBackground']};border-top:2px solid ${c['tab.activeBorderTop']};font-family:'Segoe UI',sans-serif;font-size:13px}
  .tab small{color:${c['tab.inactiveForeground']};margin-left:12px}
  main{padding:8px 0}.l{white-space:pre;padding-right:24px}.n{display:inline-block;width:48px;padding-right:16px;text-align:right;color:${c['editorLineNumber.foreground']}}
</style></head><body><header><div class="tab">${escapeHtml(name)}<small>${p.label}</small></div></header><main>
${body}
</main></body></html>`;
      fs.writeFileSync(path.join(OUT, `${p.id}--${name.replace(/\//g, '_')}.html`), html);
    }
  }
  console.log(`\n✔ Vistas previas en ${path.relative(ROOT, OUT)}/ (${palettes.length} temas × ${fileScopes.size} archivos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
