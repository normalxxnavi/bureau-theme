// @ts-check
'use strict';

/**
 * Genera el «Product Icon Theme» Bureau: sustituye iconos internos de VS Code
 * (barra de actividad, rama de Git, Copilot, campana…) por glifos propios.
 *
 *   npm run product-icons
 *
 * VS Code exige que los product icons vengan en una FUENTE (.woff): cada icono
 * es un glifo. Aquí se dibujan como formas rellenas en una cuadrícula de 24×24
 * (las fuentes no admiten trazos) y se convierten con svgicons2svgfont →
 * svg2ttf → ttf2woff.
 *
 * Diseño original, geométrico y brutalista. Guiños de lore:
 *   - control de código fuente / rama de Git → la pirámide invertida,
 *   - Copilot y chat → el Consejo (la pirámide que «habla»),
 *   - depurar y tests → el hexágono de la Hedron,
 *   - notificaciones → el teléfono de la Hotline.
 *
 * Los iconos de otras extensiones que usan sus propias imágenes (por ejemplo
 * Claude Code) no se pueden sustituir: no son glifos con identificador.
 */

const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'product-icons');
const SVG_DIR = path.join(OUT, 'svg');
const FONT_NAME = 'bureau-product-icons';

// --- Geometría -----------------------------------------------------------------

/** @typedef {Array<[number, number]>} Poly */

/** Área con signo (coordenadas SVG, y hacia abajo): > 0 = sentido horario. */
const area = (/** @type {Poly} */ p) => p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0) / 2;

/** Polígono relleno (siempre horario). */
const solid = (/** @type {Poly} */ p) => (area(p) < 0 ? [...p].reverse() : p);
/** Contorno de hueco (siempre antihorario, para recortar con la regla nonzero). */
const hole = (/** @type {Poly} */ p) => (area(p) > 0 ? [...p].reverse() : p);

const rect = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h) =>
  solid([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

/** Segmento grueso como polígono. */
function bar(/** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ x2, /** @type {number} */ y2, /** @type {number} */ w) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (-(y2 - y1) / len) * (w / 2);
  const ny = ((x2 - x1) / len) * (w / 2);
  return solid([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
}

/** Polígono regular. `rot` en grados. */
function regular(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number} */ n, rot = -90) {
  /** @type {Poly} */
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return solid(p);
}

/** Escala un polígono respecto a un punto. */
const scale = (/** @type {Poly} */ p, /** @type {number} */ k, /** @type {number} */ cx, /** @type {number} */ cy) =>
  /** @type {Poly} */ (p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]));

/** Incentro y radio inscrito de un triángulo. */
function incircle(/** @type {Poly} */ [a, b, c]) {
  const la = Math.hypot(b[0] - c[0], b[1] - c[1]);
  const lb = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const lc = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const s = la + lb + lc;
  const cx = (la * a[0] + lb * b[0] + lc * c[0]) / s;
  const cy = (la * a[1] + lb * b[1] + lc * c[1]) / s;
  return { cx, cy, r: Math.abs(area([a, b, c])) / (s / 2) };
}

/** Contorno hueco de un polígono convexo con grosor `w` (escalado desde el incentro). */
function frameTriangle(/** @type {Poly} */ tri, /** @type {number} */ w) {
  const { cx, cy, r } = incircle(tri);
  return [solid(tri), hole(scale(tri, (r - w) / r, cx, cy))];
}
function frameRegular(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number} */ n, /** @type {number} */ w, rot = -90) {
  const apothem = r * Math.cos(Math.PI / n);
  const k = (apothem - w) / apothem;
  return [regular(cx, cy, r, n, rot), hole(scale(regular(cx, cy, r, n, rot), k, cx, cy))];
}
function frameRect(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {number} */ t) {
  return [rect(x, y, w, h), hole(rect(x + t, y + t, w - 2 * t, h - 2 * t))];
}

// --- Glifos (cuadrícula 24×24) ---------------------------------------------------

/** @type {Record<string, () => Poly[]>} */
const GLYPHS = {
  // Expediente del Bureau: documento con la esquina cortada, franja de
  // clasificación y otro expediente detrás.
  dossier: () => [
    rect(3, 2, 10, 2),
    rect(3, 2, 2, 15),
    solid([[7, 6], [16, 6], [21, 11], [21, 22], [7, 22]]),
    hole([[9, 8], [15.2, 8], [19, 11.8], [19, 20], [9, 20]]),
    rect(11, 15.5, 6, 2.2),
  ],
  // Lupa cuadrada y brutalista.
  lens: () => [...frameRect(2, 2, 14, 14, 2.4), bar(14.2, 14.2, 21.6, 21.6, 3.4)],
  // Pirámide invertida con su núcleo: control de código fuente y rama de Git.
  pyramid: () => {
    /** @type {Poly} */
    const tri = [[1.8, 3.2], [22.2, 3.2], [12, 21.6]];
    const { cx, cy } = incircle(tri);
    return [...frameTriangle(tri, 2.3), solid(scale(tri, 0.3, cx, cy))];
  },
  // El Consejo: pirámide maciza con una ranura, y la línea con la que «habla».
  board: () => {
    /** @type {Poly} */
    const tri = [[2.5, 7.5], [21.5, 7.5], [12, 22.5]];
    return [rect(5, 2, 14, 2.4), solid(tri), hole(rect(8.4, 10.6, 7.2, 1.8))];
  },
  // Hexágono de la Hedron con «play»: ejecutar y depurar.
  hedronPlay: () => [...frameRegular(12, 12, 10.6, 6, 2.2), solid([[9.4, 7.6], [16.8, 12], [9.4, 16.4]])],
  // Hexágono de la Hedron con un check: tests.
  hedronCheck: () => [...frameRegular(12, 12, 10.6, 6, 2.2), bar(7.6, 12.2, 10.8, 15.4, 2.6), bar(10, 15.4, 16.8, 8.6, 2.6)],
  // Bloques de hormigón; uno está «alterado» (desplazado y hueco).
  blocks: () => [rect(2, 13, 9, 9), rect(13, 13, 9, 9), rect(2, 2, 9, 9), ...frameRect(14, 1, 9, 9, 2.2)],
  // Credencial del Bureau: tarjeta con el emblema de la pirámide.
  badge: () => [...frameRect(4, 1.5, 16, 21, 2.2), solid([[8.4, 5.6], [15.6, 5.6], [12, 11]]), rect(8, 14, 8, 2.2), rect(8, 17.6, 5, 2.2)],
  // Tuerca hexagonal (ajustes).
  hexNut: () => [...frameRegular(12, 12, 10.8, 6, 3.4, 0), regular(12, 12, 2.6, 6, 0)],
  // El teléfono de la Hotline (notificaciones).
  hotline: () => [
    rect(4, 3.5, 16, 3.4),
    solid([[1.5, 3.5], [7.5, 3.5], [7.5, 10.5], [4, 10.5], [1.5, 8]]),
    solid([[16.5, 3.5], [22.5, 3.5], [22.5, 8], [20, 10.5], [16.5, 10.5]]),
    solid([[6.5, 12.5], [17.5, 12.5], [20.5, 21.5], [3.5, 21.5]]),
    hole(rect(10, 15.5, 4, 3)),
  ],
  hotlineDot: () => [
    ...GLYPHS.hotline().filter((_, i) => i !== 2),
    solid([[16.5, 3.5], [18.5, 3.5], [18.5, 10.5], [16.5, 10.5]]),
    rect(19.2, 0.6, 4.2, 4.2),
  ],
  // Terminal: >_
  prompt: () => [bar(4, 6, 10.5, 12, 2.8), bar(10.5, 12, 4, 18, 2.8), rect(12.5, 17, 8.5, 2.8)],
};

/** Iconos de VS Code → glifo. Las claves son identificadores de icono o codicons. */
const MAPPING = {
  'explorer-view-icon': 'dossier',
  files: 'dossier',
  'search-view-icon': 'lens',
  search: 'lens',
  'search-large': 'lens',
  'source-control-view-icon': 'pyramid',
  'source-control': 'pyramid',
  'git-branch': 'pyramid',
  'run-view-icon': 'hedronPlay',
  'debug-alt': 'hedronPlay',
  'extensions-view-icon': 'blocks',
  extensions: 'blocks',
  'test-view-icon': 'hedronCheck',
  beaker: 'hedronCheck',
  'accounts-view-bar-icon': 'badge',
  account: 'badge',
  'settings-view-bar-icon': 'hexNut',
  'settings-gear': 'hexNut',
  manage: 'hexNut',
  'chat-view-icon': 'board',
  'chat-sparkle': 'board',
  copilot: 'board',
  'copilot-logo': 'board',
  bell: 'hotline',
  'bell-dot': 'hotlineDot',
  'terminal-view-icon': 'prompt',
  terminal: 'prompt',
};

// --- Generación ----------------------------------------------------------------

const fmt = (/** @type {number} */ n) => String(Math.round(n * 1000) / 1000);
const toPath = (/** @type {Poly[]} */ polys) => polys.map((p) => `M${p.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');
const toSvg = (/** @type {Poly[]} */ polys) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${toPath(polys)}"/></svg>\n`;

async function buildFont(/** @type {Array<{name: string, svg: string, code: number}>} */ glyphs) {
  const { SVGIcons2SVGFontStream } = await import('svgicons2svgfont');
  const svg2ttf = /** @type {any} */ (require('svg2ttf'));
  const ttf2woff = /** @type {any} */ (require('ttf2woff'));

  const svgFont = await new Promise((resolve, reject) => {
    let out = '';
    const stream = new SVGIcons2SVGFontStream({ fontName: FONT_NAME, fontHeight: 1000, normalize: true });
    stream.on('data', (/** @type {Buffer} */ d) => (out += d.toString()));
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
    for (const g of glyphs) {
      const s = /** @type {any} */ (Readable.from([g.svg]));
      s.metadata = { name: g.name, unicode: [String.fromCodePoint(g.code)] };
      stream.write(s);
    }
    stream.end();
  });
  const ttf = Buffer.from(svg2ttf(svgFont, { description: 'Bureau product icons (original, MIT)', url: 'https://github.com/JaviHexer/bureau-theme' }).buffer);
  return Buffer.from(ttf2woff(ttf).buffer);
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(SVG_DIR, { recursive: true });

  const names = Object.keys(GLYPHS);
  const glyphs = names.map((name, i) => {
    const svg = toSvg(GLYPHS[name]());
    fs.writeFileSync(path.join(SVG_DIR, `${name}.svg`), svg);
    return { name, svg, code: 0xe001 + i };
  });

  const woff = await buildFont(glyphs);
  fs.writeFileSync(path.join(OUT, `${FONT_NAME}.woff`), woff);

  const codeOf = Object.fromEntries(glyphs.map((g) => [g.name, g.code]));
  const theme = {
    fonts: [{ id: FONT_NAME, src: [{ path: `./${FONT_NAME}.woff`, format: 'woff' }], weight: 'normal', style: 'normal' }],
    iconDefinitions: Object.fromEntries(
      Object.entries(MAPPING).map(([id, glyph]) => [id, { fontCharacter: `\\${codeOf[glyph].toString(16).toUpperCase()}` }])
    ),
  };
  fs.writeFileSync(path.join(OUT, 'bureau-product-icon-theme.json'), JSON.stringify(theme, null, 2) + '\n');
  console.log(`✔ product-icons/ (${names.length} glifos, ${Object.keys(MAPPING).length} iconos de VS Code sustituidos, ${(woff.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { GLYPHS, MAPPING, toSvg, area };
