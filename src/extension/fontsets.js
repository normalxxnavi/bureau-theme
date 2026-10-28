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

const { PROMPT_FONT, withPromptIcons } = require('./prompt-config');

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

/**
 * Lista de fuentes en formato CSS, con una genérica al final. `fallback` (otra
 * lista CSS, la que tenía el usuario) va detrás de las del juego: si esas
 * fuentes ya no están (al desinstalar la extensión se borran), VS Code usa la
 * del usuario sin tocar sus ajustes.
 * @param {string[]} names @param {string} generic @param {string} [fallback]
 */
function fontStack(names, generic, fallback = '') {
  const unquote = (/** @type {string} */ f) => f.replace(/^(['"])(.*)\1$/, '$2');
  const rest = fallback
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f && !names.includes(unquote(f)));
  if (!rest.includes(generic)) rest.push(generic);
  return [...names.map((n) => `'${n}'`), ...rest].join(', ');
}

/**
 * La fuente que había antes en cada ajuste: el valor del usuario o, si no lo
 * cambió, el de VS Code. «default» y "" no son fuentes: significan «la del
 * editor» (o la de la interfaz, en el chat y la vista previa).
 * @param {Record<string, unknown>} backup valores del usuario antes de aplicar la tipografía
 * @param {Record<string, unknown>} defaults valores por defecto de VS Code
 * @returns {Record<string, string>}
 */
function fallbackFonts(backup, defaults) {
  const stack = (/** @type {unknown} */ v) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'default' ? v.trim() : '');
  const editor = stack(backup['editor.fontFamily']) || stack(defaults['editor.fontFamily']);
  return Object.fromEntries(
    Object.entries(FONT_SETTINGS).map(([key, kind]) => [key, stack(backup[key]) || stack(defaults[key]) || (kind === 'mono' ? editor : 'system-ui')])
  );
}

/**
 * Valores de los ajustes para un juego de fuentes.
 * @param {FontSetId} id
 * @param {Record<string, string>} [fallbacks] la fuente anterior de cada ajuste (`fallbackFonts`)
 * @returns {Record<string, string>}
 */
function settingsFor(id, fallbacks = {}) {
  const set = FONT_SETS[id];
  return Object.fromEntries(
    Object.entries(FONT_SETTINGS).map(([key, kind]) => [
      key,
      kind === 'mono' ? fontStack(set.mono, 'monospace', fallbacks[key]) : fontStack(set.text, 'sans-serif', fallbacks[key]),
    ])
  );
}

/**
 * ¿Es este valor uno de los que escribe la extensión en el ajuste? Con la
 * fuente anterior detrás o sin ella (como hasta la 0.7).
 * @param {string} key @param {unknown} value @param {Record<string, string>} fallbacks
 */
function isOwnValue(key, value, fallbacks) {
  // La fuente de iconos de la terminal Bureau puede ir en la lista: no cuenta.
  const v = withoutPromptIcons(value);
  return /** @type {FontSetId[]} */ (Object.keys(FONT_SETS)).some((id) => v === settingsFor(id, fallbacks)[key] || v === settingsFor(id)[key]);
}

/** El valor de un ajuste de fuente sin la fuente de iconos del prompt. @param {unknown} value */
const withoutPromptIcons = (value) => (typeof value === 'string' && value.includes(PROMPT_FONT.family) ? withPromptIcons(value, false) : value);

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
 * @param {Record<string, unknown>} current @param {FontSetId} id @param {Record<string, string>} [fallbacks]
 */
function isApplied(current, id, fallbacks = {}) {
  const wanted = settingsFor(id, fallbacks);
  return Object.keys(wanted).every((k) => current[k] === wanted[k]);
}

/** Nombre del valor en el registro de Windows («Overpass Mono (TrueType)»). */
const registryName = (/** @type {{family: string, style: string}} */ f) => `${f.family}${f.style ? ` ${f.style}` : ''} (TrueType)`;

module.exports = { FONT_SETS, FONT_SETTINGS, fontStack, fallbackFonts, settingsFor, isOwnValue, withoutPromptIcons, resolveFontSet, isApplied, registryName };
