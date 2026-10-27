// @ts-check
'use strict';

/**
 * Popups con diseño (los tooltips de la barra de estado y de las barras del
 * Modo Clasificado): una tarjeta con imagen a la izquierda y el texto a la
 * derecha, «pastillas» de estado de color y botones que se pueden pulsar.
 * Sin `vscode`: devuelve el Markdown con HTML que admite un MarkdownString con
 * `supportHtml`.
 *
 * Lo que VS Code deja pasar en un popup (comprobado en su sanitizador): tablas,
 * imágenes con `width`/`height` (también `data:`, así la portada no necesita
 * red), `<b>`, `<i>`, `<small>`, `<br>`, líneas `---` y, en `<span>`, solo el
 * estilo «color:…;background-color:…;display:inline-block;border-radius:Npx;»
 * en ese orden, con colores `#hex` o `var(--vscode-…)`.
 */

const fs = require('node:fs');
const path = require('node:path');

/** Colores admitidos en el estilo de un `<span>` de un popup. */
const COLOR = /^(#[0-9a-fA-F]{3,8}|var\(--vscode(-[a-zA-Z0-9]+)+\))$/;

/**
 * Colores de pastilla que siguen al tema activo: el acento (el de sus botones:
 * rojo en CONTROL Dark, Black y Astral; cian de la Hedron en CONTROL Resonant,
 * donde el rojo es solo del Siseo) y uno neutro.
 */
const ACCENT = { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' };
const NEUTRAL = { background: 'var(--vscode-keybindingLabel-background)', color: 'var(--vscode-keybindingLabel-foreground)' };

/**
 * VS Code corta el Markdown de un popup a los 100 000 caracteres: una imagen
 * `data:` cortada deja el HTML roto y el popup sale vacío.
 */
const MAX_MARKDOWN = 100_000;

/**
 * Texto de fuera (títulos de canciones, mensajes) seguro dentro del HTML: sin
 * etiquetas y sin la sintaxis de iconos `$(…)`.
 * @param {unknown} s
 */
const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\$/g, '&#36;');

/** Texto de un enlace Markdown (sin corchetes que lo rompan). @param {string} s */
const linkText = (s) => s.replace(/[[\]\\]/g, (c) => `\\${c}`);

/**
 * Pastilla de estado.
 * @param {string} text @param {string} background @param {string} [color]
 */
function pill(text, background, color = '#ffffff') {
  if (!COLOR.test(background) || !COLOR.test(color)) throw new Error(`Color no admitido en un popup: ${background} / ${color}`);
  return `<span style="color:${color};background-color:${background};border-radius:3px;">&nbsp;${escapeHtml(text)}&nbsp;</span>`;
}

/**
 * Botón: enlace a un comando, con su icono. Hay que permitir el comando en
 * `isTrusted.enabledCommands` del MarkdownString.
 * @param {string} icon id del icono (sin `$( )`) @param {string} label @param {string} command @param {unknown[]} [args]
 */
function button(icon, label, command, args) {
  const query = args ? `?${encodeURIComponent(JSON.stringify(args))}` : '';
  return `[$(${icon}) ${linkText(label)}](command:${command}${query})`;
}

/**
 * La tarjeta: imagen a la izquierda (opcional), título y líneas a la derecha
 * y, debajo, filas de botones separadas por una línea.
 * @param {{image?: string, fallbackImage?: string, imageSize?: number, title: string, lines?: string[], rows?: string[][]}} card
 *   `lines` es HTML ya preparado (usa `escapeHtml` y `pill`). Si con `image`
 *   no cabe en un popup, va `fallbackImage` (y si tampoco, sin imagen).
 * @returns {string}
 */
function card({ image, fallbackImage, imageSize = 72, title, lines = [], rows = [] }) {
  const picture = image ? `<td><img src="${image}" width="${imageSize}" height="${imageSize}"></td><td>&nbsp;&nbsp;</td>` : '';
  const text = [`<b>${escapeHtml(title)}</b>`, ...lines].join('<br>');
  let md = `<table><tr>${picture}<td>${text}</td></tr></table>\n\n`;
  for (const row of rows.filter((r) => r.length)) md += `---\n\n${row.join(' &nbsp;&nbsp; ')}\n\n`;
  if (md.length > MAX_MARKDOWN && image) return card({ image: fallbackImage, imageSize, title, lines, rows });
  return md;
}

/** @type {Map<string, string>} */
const images = new Map();

/**
 * Imagen de `media/hover/` de la extensión como `data:` (se lee una vez).
 * @param {string} extensionPath @param {string} name sin extensión
 */
function hoverImage(extensionPath, name) {
  const key = `${extensionPath}|${name}`;
  let uri = images.get(key);
  if (uri === undefined) {
    try {
      const svg = fs.readFileSync(path.join(extensionPath, 'media', 'hover', `${name}.svg`));
      uri = `data:image/svg+xml;base64,${svg.toString('base64')}`;
    } catch {
      uri = '';
    }
    images.set(key, uri);
  }
  return uri || undefined;
}

/** Lo último que se puso en cada elemento de la barra de estado. @type {WeakMap<object, Map<string, string>>} */
const applied = new WeakMap();

/**
 * Valor comparable: un MarkdownString por su contenido (sus campos son
 * getters y no salen en JSON). @param {unknown} v
 */
function sameKey(v) {
  if (v && typeof v === 'object' && 'value' in v) {
    const md = /** @type {{value: string, supportHtml?: boolean, supportThemeIcons?: boolean, isTrusted?: unknown}} */ (v);
    return JSON.stringify(['md', md.value, md.supportHtml, md.supportThemeIcons, md.isTrusted]);
  }
  return JSON.stringify(v) ?? 'undefined';
}

/**
 * Pone en un elemento de la barra de estado solo lo que ha cambiado (y lo
 * muestra u oculta con `visible`). VS Code reenvía el elemento entero, popup
 * incluido, cada vez que se toca cualquier propiedad y, como el `isTrusted`
 * de los popups llega como un objeto nuevo, cree que el popup es otro y lo
 * vuelve a pintar: parpadea mientras lo miras.
 * @param {{show(): void, hide(): void}} item @param {Record<string, unknown> & {visible?: boolean}} props
 */
function setItem(item, props) {
  let last = applied.get(item);
  if (!last) applied.set(item, (last = new Map()));
  for (const [name, value] of Object.entries(props)) {
    const key = sameKey(value);
    if (last.get(name) === key) continue;
    last.set(name, key);
    if (name === 'visible') value ? item.show() : item.hide();
    else /** @type {any} */ (item)[name] = value;
  }
}

module.exports = { escapeHtml, pill, button, card, hoverImage, setItem, COLOR, ACCENT, NEUTRAL, MAX_MARKDOWN };
