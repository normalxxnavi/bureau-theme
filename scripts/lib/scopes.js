// @ts-check
'use strict';

/**
 * Cobertura de scopes TextMate sin abrir VS Code ni escribir una muestra por
 * lenguaje: se leen TODOS los scopes que puede producir una gramática y se
 * comprueba que alguna regla del tema los colorea.
 *
 * Solo cuentan las familias estándar de TextMate (las que los temas colorean;
 * https://macromates.com/manual/en/language_grammars#naming_conventions). Los
 * nombres propios de cada gramática («functionline.ahk», «case-clause.expr.ts»…)
 * son estructura interna y ningún tema los usa.
 *
 * Familias que se quedan con el color de texto a propósito: `markup.list`
 * (el texto de una lista, no su viñeta), `markup.other`, `markup.fenced_code` y
 * `markup.code` (bloques de código incrustado, que colorea su propio lenguaje).
 */

const fs = require('node:fs');
const path = require('node:path');

/** Raíces que siempre deben tener color (todas tienen regla general en tokens.js). */
const ALWAYS = ['comment', 'constant', 'invalid', 'keyword', 'storage', 'string', 'variable', 'punctuation'];
/** Raíces en las que solo las subfamilias estándar deben tener color. */
const PARTIAL = {
  entity: ['name', 'other'],
  support: ['function', 'class', 'type', 'constant', 'variable', 'other'],
  markup: ['heading', 'bold', 'italic', 'underline', 'strikethrough', 'quote', 'raw', 'inserted', 'deleted', 'changed'],
};

/** ¿Es un scope de una familia estándar que el tema debe colorear? @param {string} scope */
function isStandard(scope) {
  const [root, second] = scope.split('.');
  if (ALWAYS.includes(root)) return true;
  const subs = /** @type {Record<string, string[]>} */ (PARTIAL)[root];
  return Boolean(subs && second && subs.includes(second));
}

/**
 * Todos los scopes que nombra una gramática (`name`, `contentName` y las
 * capturas), sin los que dependen de una captura (`$1`…).
 * @param {any} grammar
 * @returns {Set<string>}
 */
function grammarScopes(grammar) {
  /** @type {Set<string>} */
  const scopes = new Set();
  /** @param {any} node @param {boolean} root */
  const walk = (node, root) => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n, false);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      // El `name` de la raíz es el nombre del lenguaje, no un scope.
      if ((key === 'name' || key === 'contentName') && typeof value === 'string') {
        if (root && key === 'name') continue;
        for (const s of value.split(/\s+/)) if (s && !s.includes('$')) scopes.add(s);
      } else {
        walk(value, false);
      }
    }
  };
  walk(grammar, true);
  return scopes;
}

/**
 * Función que dice si alguna regla del tema (de un solo scope, sin contexto)
 * da color o estilo a un scope. VS Code compara por prefijos de segmentos:
 * la regla `entity.name` colorea `entity.name.section.ada`.
 * @param {Array<{scope: string | string[], settings: {foreground?: string, fontStyle?: string}}>} tokenColors
 */
function themeMatcher(tokenColors) {
  /** @type {Set<string>} */
  const selectors = new Set();
  for (const rule of tokenColors) {
    if (!rule.settings.foreground && rule.settings.fontStyle === undefined) continue;
    for (const s of [rule.scope].flat()) if (!s.includes(' ')) selectors.add(s.trim());
  }
  return (/** @type {string} */ scope) => {
    const parts = scope.split('.');
    for (let i = parts.length; i > 0; i--) if (selectors.has(parts.slice(0, i).join('.'))) return true;
    return false;
  };
}

/** Carpeta con las gramáticas de tm-grammars (dependencia de desarrollo). */
function tmGrammarsDir() {
  return path.dirname(require.resolve('tm-grammars/grammars/json.json'));
}

/**
 * Lee las gramáticas de tm-grammars: [nombre del archivo, gramática].
 * @returns {Array<[string, any]>}
 */
function loadTmGrammars() {
  const dir = tmGrammarsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]);
}

/**
 * Scopes estándar sin color: Map scope → lenguajes que lo usan.
 * @param {Parameters<typeof themeMatcher>[0]} tokenColors
 * @param {Array<[string, any]>} grammars
 */
function uncoveredScopes(tokenColors, grammars) {
  const covered = themeMatcher(tokenColors);
  /** @type {Map<string, string[]>} */
  const missing = new Map();
  for (const [name, grammar] of grammars) {
    for (const scope of grammarScopes(grammar)) {
      if (!isStandard(scope) || covered(scope)) continue;
      missing.set(scope, [...(missing.get(scope) ?? []), name]);
    }
  }
  return missing;
}

module.exports = { isStandard, grammarScopes, themeMatcher, tmGrammarsDir, loadTmGrammars, uncoveredScopes };
