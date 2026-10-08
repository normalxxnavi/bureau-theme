// @ts-check
'use strict';

/**
 * Genera las insignias del README (shields.io) entre los marcadores
 * `<!-- badges:fan -->` y `<!-- badges:built -->`.
 *
 *   npm run badges
 *
 * Las insignias se sirven por https, así que se ven también en la página de
 * detalles de VS Code. Los emblemas «fan» usan glifos propios de Bureau
 * Product Icons (no logos de Remedy).
 */

const fs = require('node:fs');
const path = require('node:path');
const { GLYPHS, toSvg } = require('./product-icons');
const pkg = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const MONOLITH = '0D0E0F';

/** Escapa un texto para la ruta de una insignia estática de shields.io. */
const part = (/** @type {string} */ s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));

/** Logo propio en blanco a partir de las formas de un glifo. */
function glyphLogo(/** @type {import('./product-icons').Poly[]} */ polys) {
  const svg = toSvg(polys).trim().replace('<path ', '<path fill="#F2EFE8" ');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * @param {{label: string, message: string, color: string, logo?: string, alt?: string, link?: string}} b
 */
function badge({ label, message, color, logo, alt, link }) {
  const q = new URLSearchParams({ style: 'flat-square', labelColor: MONOLITH });
  if (logo) q.set('logo', logo);
  const url = `https://img.shields.io/badge/${part(label)}-${part(message)}-${color}?${q.toString()}`;
  const img = `![${alt ?? `${label}: ${message}`}](${url})`;
  return link ? `[${img}](${link})` : img;
}

const FAN = [
  badge({ label: 'CONTROL', message: 'Fan Edition', color: 'E0352B', logo: glyphLogo(GLYPHS.board()), alt: 'CONTROL — Fan Edition' }),
  badge({ label: 'CONTROL Resonant', message: 'Fan Edition', color: '2FA7B8', logo: glyphLogo(GLYPHS.hedronPlay().slice(0, -1)), alt: 'CONTROL Resonant — Fan Edition' }),
  badge({ label: 'Federal Bureau of Control', message: 'Clearance 5', color: 'C2953F', logo: glyphLogo(GLYPHS.badge()), alt: 'Federal Bureau of Control — Clearance 5' }),
  badge({ label: 'Hotline', message: 'ringing', color: 'E0352B', logo: glyphLogo(GLYPHS.hotline()), alt: 'The Hotline is ringing' }),
  badge({ label: 'The Board', message: '<<approved>>', color: 'F2EFE8', logo: glyphLogo(GLYPHS.pyramid()), alt: 'The Board: approved' }),
];

const BUILT = [
  badge({ label: 'version', message: pkg.version, color: 'E0352B', logo: glyphLogo(GLYPHS.cube()) }),
  badge({ label: 'VS Code', message: pkg.engines.vscode.replace('^', '≥ '), color: '2F80ED', logo: glyphLogo(GLYPHS.prompt()) }),
  badge({ label: 'made with', message: 'JavaScript', color: 'D9B54A', logo: 'javascript' }),
  badge({ label: 'generated with', message: 'Node.js', color: '4FA05A', logo: 'nodedotjs' }),
  badge({ label: 'bundled with', message: 'esbuild', color: 'C98A1E', logo: 'esbuild' }),
  badge({ label: 'built with', message: 'Claude Code', color: 'D97757', logo: 'claude' }),
  badge({ label: 'runtime dependencies', message: '0', color: '4FA05A' }),
  badge({ label: 'contrast', message: 'WCAG AA · AAA', color: '4A8CD0', logo: glyphLogo(GLYPHS.hedronCheck()) }),
  badge({ label: 'languages', message: 'EN · ES', color: '8E8B85' }),
  badge({ label: 'license', message: 'MIT', color: '8E8B85', link: 'LICENSE' }),
];

/** Sustituye el contenido entre `<!-- badges:id -->` y `<!-- /badges:id -->`. */
function fill(/** @type {string} */ text, /** @type {string} */ id, /** @type {string[]} */ badges) {
  const re = new RegExp(`(<!-- badges:${id} -->)[\\s\\S]*?(<!-- /badges:${id} -->)`, 'g');
  if (!re.test(text)) throw new Error(`Faltan los marcadores <!-- badges:${id} --> en el README`);
  return text.replace(re, `$1\n${badges.join('\n')}\n$2`);
}

let readme = fs.readFileSync(README, 'utf8');
readme = fill(readme, 'fan', FAN);
readme = fill(readme, 'built', BUILT);
fs.writeFileSync(README, readme);
console.log(`✔ README.md (${FAN.length} emblemas fan, ${BUILT.length} insignias técnicas)`);
