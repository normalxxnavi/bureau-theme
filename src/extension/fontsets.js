// @ts-check
'use strict';

/**
 * Tipografías inspiradas en los juegos (lógica pura, sin `vscode`).
 *
 * Las fuentes originales son comerciales y no se pueden redistribuir:
 *   - Control: Interstate (señalética e interfaz), ITC Avant Garde Gothic
 *     (títulos) y Akzidenz-Grotesk (documentos).
 *   - Control Resonant: no están documentadas públicamente.
 * Por eso se incluyen alternativas libres (SIL OFL 1.1):
 *   - Bureau → Overpass Mono / Overpass, derivadas de Highway Gothic, la misma
 *     base que Interstate. Si el usuario tiene Interstate instalada, se usa
 *     primero.
 *   - Resonant → Space Mono / Space Grotesk, geométricas y retrofuturistas.
 */

/** @typedef {'bureau' | 'resonant'} FontSetId */
/** @typedef {'none' | 'bureau' | 'resonant' | 'auto'} FontMode */

/**
 * @type {Record<FontSetId, {mono: string[], text: string[], files: Array<{file: string, family: string, style: string}>}>}
 */
const FONT_SETS = {
  bureau: {
    mono: ['Interstate Mono', 'Overpass Mono'],
    text: ['Interstate', 'Overpass'],
    files: [
      { file: 'bureau/OverpassMono-Variable.ttf', family: 'Overpass Mono', style: '' },
      { file: 'bureau/Overpass-Variable.ttf', family: 'Overpass', style: '' },
      { file: 'bureau/Overpass-Italic-Variable.ttf', family: 'Overpass', style: 'Italic' },
    ],
  },
  resonant: {
    mono: ['Space Mono'],
    text: ['Space Grotesk'],
    files: [
      { file: 'resonant/SpaceMono-Regular.ttf', family: 'Space Mono', style: '' },
      { file: 'resonant/SpaceMono-Bold.ttf', family: 'Space Mono', style: 'Bold' },
      { file: 'resonant/SpaceMono-Italic.ttf', family: 'Space Mono', style: 'Italic' },
      { file: 'resonant/SpaceMono-BoldItalic.ttf', family: 'Space Mono', style: 'Bold Italic' },
      { file: 'resonant/SpaceGrotesk-Variable.ttf', family: 'Space Grotesk', style: '' },
    ],
  },
};

/**
 * Ajustes de VS Code que cambia la tipografía y qué tipo de fuente usa cada
 * uno. La interfaz de VS Code (menús, pestañas…) no tiene ajuste de fuente.
 * @type {Record<string, 'mono' | 'text'>}
 */
const FONT_SETTINGS = {
  'editor.fontFamily': 'mono',
  'terminal.integrated.fontFamily': 'mono',
  'debug.console.fontFamily': 'mono',
  'chat.editor.fontFamily': 'mono',
  'chat.fontFamily': 'text',
  'markdown.preview.fontFamily': 'text',
};

/** Lista de fuentes en formato CSS, con una genérica al final. */
const fontStack = (/** @type {string[]} */ names, /** @type {string} */ generic) => [...names.map((n) => `'${n}'`), generic].join(', ');

/**
 * Valores de los ajustes para un juego de fuentes.
 * @param {FontSetId} id
 * @returns {Record<string, string>}
 */
function settingsFor(id) {
  const set = FONT_SETS[id];
  return Object.fromEntries(
    Object.entries(FONT_SETTINGS).map(([key, kind]) => [key, kind === 'mono' ? fontStack(set.mono, 'monospace') : fontStack(set.text, 'sans-serif')])
  );
}

/**
 * Qué juego de fuentes corresponde al modo elegido y al tema activo.
 * `null` = usar la tipografía del usuario (la que tenía antes).
 * @param {FontMode} mode
 * @param {string | undefined} themeLabel
 * @returns {FontSetId | null}
 */
function resolveFontSet(mode, themeLabel) {
  if (mode === 'bureau' || mode === 'resonant') return mode;
  if (mode !== 'auto' || !themeLabel || !themeLabel.startsWith('CONTROL ')) return null;
  return themeLabel === 'CONTROL Resonant' ? 'resonant' : 'bureau';
}

/**
 * ¿Los ajustes actuales ya son los de este juego de fuentes?
 * @param {Record<string, unknown>} current @param {FontSetId} id
 */
function isApplied(current, id) {
  const wanted = settingsFor(id);
  return Object.keys(wanted).every((k) => current[k] === wanted[k]);
}

/** Nombre del valor en el registro de Windows («Overpass Mono (TrueType)»). */
const registryName = (/** @type {{family: string, style: string}} */ f) => `${f.family}${f.style ? ` ${f.style}` : ''} (TrueType)`;

module.exports = { FONT_SETS, FONT_SETTINGS, fontStack, settingsFor, resolveFontSet, isApplied, registryName };
