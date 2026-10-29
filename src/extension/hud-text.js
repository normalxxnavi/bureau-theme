// @ts-check
'use strict';

/**
 * El texto del HUD del Bureau (hud.js), sin `vscode`: los tests le dan datos
 * inventados.
 */

/** Codificación como la escribe VS Code en su barra de estado (utf8 → UTF-8). @param {string} id */
function encodingName(id) {
  const known = { utf8: 'UTF-8', utf8bom: 'UTF-8 BOM', utf16le: 'UTF-16 LE', utf16be: 'UTF-16 BE' };
  return /** @type {Record<string, string>} */ (known)[id] ?? id.toUpperCase().replace(/^(WINDOWS|ISO|CP)(\d)/, '$1-$2');
}

/**
 * @typedef {{line: number, column: number, lines: number, selected: number, cursors: number, insertSpaces: boolean, tabSize: number, encoding: string | undefined, eol: 'LF' | 'CRLF', language: string}} HudState
 */

/**
 * El elemento de la barra de estado: `13:1 │ ␣2 │ UTF-8 · LF │ {▪} MARKDOWN`
 * (␣ son espacios y ⇥ tabuladores; con selección, los caracteres entre
 * paréntesis; con varios cursores, cuántos más hay).
 * @param {HudState} s
 */
function hudText(s) {
  const cursor = `${s.line}:${s.column}${s.cursors > 1 ? ` +${s.cursors - 1}` : s.selected ? ` (${s.selected})` : ''}`;
  const indent = `${s.insertSpaces ? '␣' : '⇥'}${s.tabSize}`;
  return `$(bureau-dossier) ${cursor} │ ${indent} │ ${fileText(s)} │ $(bracket) ${s.language.replace(/\$\(/g, '$​(').toUpperCase()}`;
}

/** Codificación y fin de línea: «UTF-8 · LF» (sin la codificación en VS Code anteriores a la 1.100). @param {HudState} s */
const fileText = (s) => [s.encoding ? encodingName(s.encoding) : '', s.eol].filter(Boolean).join(' · ');

module.exports = { hudText, encodingName, fileText };
