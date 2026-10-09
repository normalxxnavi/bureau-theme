// @ts-check
'use strict';

/**
 * Genera las «chapas» del README: pequeñas etiquetas de shields.io con un glifo
 * propio de Bureau Product Icons, repartidas por las descripciones de los
 * temas, las tablas y las secciones.
 *
 *   npm run badges
 *
 * El README las usa como imágenes de referencia (`![The Oldest House][oldest-house]`)
 * y este script escribe las definiciones al final, entre `<!-- chips -->` y
 * `<!-- /chips -->`. Se sirven por https, así que también se ven en la página de
 * detalles de VS Code. No se usa ningún logo de Remedy: solo glifos originales.
 */

const fs = require('node:fs');
const path = require('node:path');
const { GLYPHS, REAL, toSvg } = require('./product-icons');

const ROOT = path.resolve(__dirname, '..');
const README = path.join(ROOT, 'README.md');

/** Logo de un glifo, en blanco o en negro según el fondo de la chapa. */
function glyphLogo(/** @type {string} */ glyph, /** @type {string} */ ink) {
  const svg = toSvg(GLYPHS[glyph]()).trim().replace('<path ', `<path fill="${ink}" `);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Luminancia relativa (WCAG) de un color `RRGGBB`. */
function luminance(/** @type {string} */ hex) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Escapa un texto para la ruta de una insignia estática de shields.io. */
const part = (/** @type {string} */ s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));

/**
 * Chapa de un solo bloque de color con el glifo a la izquierda.
 * @param {string} text
 * @param {string} color `RRGGBB`
 * @param {{glyph?: string, logo?: string}} icon glifo propio o logo de simple-icons
 */
function chip(text, color, { glyph, logo }) {
  const dark = luminance(color) > 0.35;
  const q = new URLSearchParams({ style: 'flat-square' });
  if (glyph) q.set('logo', glyphLogo(glyph, dark ? '#111113' : '#F2EFE8'));
  if (logo) {
    q.set('logo', logo);
    q.set('logoColor', dark ? '111113' : 'F2EFE8');
  }
  return `https://img.shields.io/badge/${part(text)}-${color}?${q.toString()}`;
}

const hex = (/** @type {string} */ c) => c.replace('#', '').toUpperCase();
const RED = hex(REAL.red);

/**
 * Catálogo: id → [glifo, inglés, español, color]. Cada id genera `id` (inglés) e `id-es`.
 * @type {Record<string, [string, string, string, string]>}
 */
const CHIPS = {
  // Portada y temas
  fan: ['board', 'CONTROL · Fan Edition', 'CONTROL · Edición fan', RED],
  'fan-resonant': ['hammer', 'CONTROL Resonant · Fan Edition', 'CONTROL Resonant · Edición fan', hex(REAL.cyan)],
  'oldest-house': ['oldestHouse', 'The Oldest House', 'La Casa Inmemorial', RED],
  fbc: ['badge', 'Federal Bureau of Control', 'Agencia Federal de Control', hex(REAL.brass)],
  'fbc-red': ['dossier', 'FBC red #E0352B', 'Rojo FBC #E0352B', RED],
  'astral-negative': ['threshold', 'Astral Plane in negative', 'Plano Astral en negativo', 'ECEAE4'],
  oled: ['screenFull', 'True black for OLED', 'Negro puro para OLED', '2A2B2F'],
  manhattan: ['blocks', 'Patterned Manhattan', 'Manhattan alterado', '8AA8E8'],
  aberrant: ['hammer', 'The Aberrant', 'El Aberrante', hex(REAL.cyan)],
  hiss: ['error', 'Red belongs to the Hiss', 'El rojo es del Siseo', RED],
  'astral-plane': ['board', 'The Astral Plane', 'El Plano Astral', 'F2EFE8'],
  'wcag-aaa': ['hedronCheck', 'Text WCAG AAA', 'Texto WCAG AAA', hex(REAL.blue)],
  wcag: ['hedronCheck', 'WCAG contrast checked', 'Contraste WCAG verificado', hex(REAL.blue)],
  // Qué incluye
  themes: ['cube', '4 colour themes', '4 temas de color', RED],
  'file-icons': ['dossier', 'Bureau Icons', 'Bureau Icons', hex(REAL.paper)],
  'product-icons': ['badge', 'Bureau Product Icons', 'Bureau Product Icons', hex(REAL.brass)],
  typography: ['edit', 'Typography', 'Tipografía', '8E8B85'],
  sounds: ['resonance', 'Sound console', 'Consola de sonido', hex(REAL.cyan)],
  clearance: ['key', 'Clearance granted', 'Acceso autorizado', RED],
  // Lore → iconos de VS Code
  'lore-polaris': ['polaris', 'Polaris', 'Polaris', hex(REAL.yellow)],
  'lore-maze': ['maze', 'Ashtray Maze', 'Laberinto del Cenicero', hex(REAL.amber)],
  'lore-duck': ['duck', 'Rubber duck', 'Patito de goma', hex(REAL.yellow)],
  'lore-hedron': ['hedronCheck', 'Hedron', 'Hedrón', hex(REAL.cyan)],
  'lore-board': ['pyramid', 'The Board', 'El Consejo', hex(REAL.orange)],
  'lore-hotline': ['hotline', 'The Hotline', 'La Línea Directa', RED],
  'lore-badge': ['badge', 'FBC badge', 'Placa de la FBC', hex(REAL.brass)],
  'lore-dossier': ['dossier', 'Bureau dossier', 'Expediente', hex(REAL.paper)],
  'lore-floppy': ['floppy', 'Floppy disk', 'Disquete', hex(REAL.blue)],
  'lore-cassette': ['cassette', "Ahti's tape", 'La cinta de Ahti', hex(REAL.amber)],
  'lore-tv': ['tv', 'Benicoff TV', 'Televisión Benicoff', hex(REAL.brass)],
  'lore-projector': ['projector', 'Slide projector', 'Proyector de diapositivas', hex(REAL.steel)],
  'lore-safe': ['safe', 'Home safe', 'Caja fuerte', hex(REAL.steel)],
  'lore-mop': ['mop', "Ahti's mop", 'La fregona de Ahti', hex(REAL.blue)],
  'lore-key': ['key', 'Oceanview Motel key', 'Llave del Motel Oceanview', RED],
  'lore-house': ['oldestHouse', 'The Oldest House', 'La Casa Inmemorial', hex(REAL.steel)],
  'lore-threshold': ['threshold', 'The Threshold', 'El Umbral', hex(REAL.cyan)],
  'lore-aberrant': ['hammer', 'The Aberrant', 'El Aberrante', hex(REAL.cyan)],
  'lore-jukebox': ['jukebox', 'Songmaster Jukebox', 'Gramola Songmaster', hex(REAL.orange)],
  'lore-resonance': ['resonance', 'Resonance', 'Resonancia', hex(REAL.cyan)],
  'lore-cube': ['cube', 'Object of Power', 'Objeto de Poder', hex(REAL.violet)],
};

/** Herramientas (logos de simple-icons): id → [logo, texto, color]. */
const TOOLS = {
  'tool-js': ['javascript', 'JavaScript', 'D9B54A'],
  'tool-node': ['nodedotjs', 'Node.js', '4FA05A'],
  'tool-esbuild': ['esbuild', 'esbuild', 'C98A1E'],
  'tool-claude': ['claude', 'Claude Code', 'D97757'],
};

const defs = [];
for (const [id, [glyph, en, es, color]] of Object.entries(CHIPS)) {
  if (!(glyph in GLYPHS)) throw new Error(`${id}: glifo inexistente ${glyph}`);
  defs.push(`[${id}]: ${chip(en, color, { glyph })}`, `[${id}-es]: ${chip(es, color, { glyph })}`);
}
for (const [id, [logo, text, color]] of Object.entries(TOOLS)) defs.push(`[${id}]: ${chip(text, color, { logo })}`);
defs.push(`[tool-deps]: ${chip('0 runtime dependencies', hex(REAL.green), { glyph: 'cube' })}`, `[tool-deps-es]: ${chip('0 dependencias', hex(REAL.green), { glyph: 'cube' })}`);

let readme = fs.readFileSync(README, 'utf8');
const used = new Set([...readme.matchAll(/!\[[^\]]*\]\[([a-z0-9-]+)\]/g)].map((m) => m[1]));
const defined = new Set(defs.map((d) => d.slice(1, d.indexOf(']'))));
for (const id of used) if (!defined.has(id)) throw new Error(`El README usa una chapa que no existe: ${id}`);
const block = `<!-- chips -->\n${defs.filter((d) => used.has(d.slice(1, d.indexOf(']')))).join('\n')}\n<!-- /chips -->`;
readme = /<!-- chips -->[\s\S]*?<!-- \/chips -->/.test(readme) ? readme.replace(/<!-- chips -->[\s\S]*?<!-- \/chips -->/, block) : `${readme.trimEnd()}\n\n${block}\n`;
fs.writeFileSync(README, readme);
console.log(`✔ README.md (${used.size} chapas)`);
