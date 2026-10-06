// @ts-check
'use strict';

/**
 * Genera `themes/*.json` a partir de las paletas.
 *
 *   npm run build   → genera una vez
 *   npm run watch   → regenera al guardar cualquier archivo de src/theme
 *
 * Los JSON generados NO se editan a mano.
 */

const fs = require('node:fs');
const path = require('node:path');
const workbench = require('./workbench');
const tokens = require('./tokens');
const semantic = require('./semantic');

/**
 * @typedef {Object} Palette
 * @property {string} id
 * @property {string} label
 * @property {string} game
 * @property {'dark' | 'light'} type
 * @property {string} location lugar del juego (barra de estado)
 * @property {{editor: string, sidebar: string, elevated: string, input: string, chrome: string}} bg
 * @property {string} border
 * @property {{bright: string, main: string, muted: string, placeholder: string, disabled: string, onAccent: string, chrome: string, chromeMuted: string, chromeActive: string}} fg
 * @property {{main: string, line: string, solid: string, text: string, onChrome: string}} accent
 * @property {number} selectionAlpha
 * @property {{error: string, warning: string, info: string, success: string}} status
 * @property {string} link
 * @property {{added: string, modified: string, deleted: string, untracked: string, renamed: string, conflict: string, ignored: string, submodule: string}} git
 * @property {Record<'text'|'function'|'property'|'type'|'namespace'|'keyword'|'storage'|'string'|'number'|'attribute'|'regexp'|'tag'|'operator'|'punctuation'|'comment'|'commentTag'|'heading', string>} syntax
 * @property {[string, string, string]} brackets
 * @property {Record<string, string>} ansi
 */

const ROOT = path.resolve(__dirname, '..', '..');
const THEMES_DIR = path.join(ROOT, 'themes');

/** @type {Palette[]} */
const palettes = [require('./palettes/dark'), require('./palettes/black'), require('./palettes/resonant'), require('./palettes/astral')];

/** Lista ordenada de las rutas de hojas de un objeto (`syntax.keyword`, `ansi.red`…). */
function leafPaths(/** @type {any} */ obj, prefix = '') {
  /** @type {string[]} */
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...leafPaths(v, key));
    else out.push(key);
  }
  return out.sort();
}

/** Las tres paletas deben definir exactamente los mismos roles. */
function checkSameRoles() {
  const [ref, ...rest] = palettes;
  const refKeys = leafPaths(ref).join('\n');
  for (const p of rest) {
    if (leafPaths(p).join('\n') !== refKeys) {
      const a = new Set(leafPaths(ref));
      const b = new Set(leafPaths(p));
      const missing = [...a].filter((k) => !b.has(k));
      const extra = [...b].filter((k) => !a.has(k));
      throw new Error(`La paleta ${p.id} no coincide con ${ref.id}. Faltan: ${missing.join(', ') || '—'}. Sobran: ${extra.join(', ') || '—'}`);
    }
  }
}

/** @param {Palette} p */
function buildTheme(p) {
  return {
    $schema: 'vscode://schemas/color-theme',
    name: p.label,
    type: p.type,
    semanticHighlighting: true,
    colors: workbench(p),
    tokenColors: tokens(p),
    semanticTokenColors: semantic(p),
  };
}

/** @param {Palette} p */
const themeFile = (p) => path.join(THEMES_DIR, `${p.id}-color-theme.json`);

function main() {
  checkSameRoles();
  fs.mkdirSync(THEMES_DIR, { recursive: true });
  for (const p of palettes) {
    const json = JSON.stringify(buildTheme(p), null, 2) + '\n';
    const file = themeFile(p);
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (previous !== json) fs.writeFileSync(file, json);
    const t = buildTheme(p);
    console.log(
      `${previous === json ? '·' : '✔'} ${path.relative(ROOT, file)}  (${Object.keys(t.colors).length} colores UI, ${t.tokenColors.length} reglas TextMate, ${Object.keys(t.semanticTokenColors).length} semánticas)`
    );
  }
}

if (require.main === module) main();

module.exports = { palettes, buildTheme, themeFile, leafPaths, ROOT };
