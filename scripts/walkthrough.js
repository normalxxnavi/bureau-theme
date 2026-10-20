// @ts-check
'use strict';

/**
 * Genera las imágenes de la guía de bienvenida (contributes.walkthroughs) y de los popups:
 * media/walkthrough/*.svg, una por paso.
 *
 *   npm run walkthrough
 *
 * Todo es arte propio hecho con piezas del proyecto: los glifos del lore de
 * Bureau Product Icons (en sus colores reales), los colores de los cuatro
 * temas y los SVG de Bureau Icons. Sin texto (la guía está en dos idiomas y el
 * texto va en la descripción de cada paso), salvo la muestra «Aa» de las
 * tipografías.
 *
 * VS Code pinta estas imágenes dentro de la guía con las variables de color
 * del tema activo (`var(--vscode-…)`) y la clase `vscode-light` en temas
 * claros, así que la tarjeta se adapta a cualquier tema.
 */

const fs = require('node:fs');
const path = require('node:path');
const K = require('./lib/glyph-kit');
const { COLOR, REAL, GRID24 } = require('./product-icons');
const { palettes, buildTheme } = require('../src/theme/build');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'media', 'walkthrough');
const ICONS = path.join(ROOT, 'icons');
const W = 480;
const H = 300;
const FG = 'var(--vscode-foreground, #e6e2d8)';
const BG = 'var(--vscode-editor-background, #16171a)';
const RED = '#E0352B';

/** @param {number} n */
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Un glifo de color en (x, y) con `size` píxeles de lado.
 * @param {string} name @param {number} x @param {number} y @param {number} size
 */
function glyph(name, x, y, size) {
  const grid = GRID24.has(name) ? 24 : 16;
  const layers = COLOR[name]();
  const paths = layers.map(([color, polys]) => `<path fill="${color}" d="${K.toPath(polys)}"/>`).join('');
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(size / grid * 1000) / 1000})">${paths}</g>`;
}

/**
 * Un SVG de Bureau Icons (variante oscura y clara) en (x, y).
 * @param {string} key extensión, nombre de archivo o carpeta del tema de iconos
 * @param {number} x @param {number} y @param {number} size
 */
function fileIcon(key, x, y, size) {
  const theme = JSON.parse(fs.readFileSync(path.join(ICONS, 'bureau-icon-theme.json'), 'utf8'));
  /** @param {any} t */
  const idOf = (t) => (key === 'folder' ? t.folder : key.startsWith('folder:') ? t.folderNames[key.slice(7)] : t.fileExtensions[key] ?? t.fileNames[key]);
  const darkId = idOf(theme);
  const lightId = idOf(theme.light) ?? darkId;
  /** @param {string} id @param {string} cls */
  const nested = (id, cls) => {
    const svg = fs.readFileSync(path.join(ICONS, theme.iconDefinitions[id].iconPath), 'utf8').trim();
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<svg class="${cls}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16">${inner}</svg>`;
  };
  return nested(darkId, 'on-dark') + nested(lightId, 'on-light');
}

/** Una línea de «texto» (barra redondeada). @param {number} x @param {number} y @param {number} w @param {string} fill @param {number} [opacity] @param {number} [h] */
const bar = (x, y, w, fill, opacity = 1, h = 6) =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${h}" rx="1" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`;

/** La tarjeta: un expediente con su franja de clasificación roja. @param {string} body */
function card(body) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">`,
    '<style>body.vscode-light .on-dark,body.vscode-high-contrast-light .on-dark{display:none}',
    'body:not(.vscode-light):not(.vscode-high-contrast-light) .on-light{display:none}</style>',
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="${BG}" stroke="${FG}" stroke-opacity=".2"/>`,
    `<rect x="1" y="1" width="${W - 2}" height="6" fill="${RED}"/>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

/** Colores de un tema ya generado. */
const themes = palettes.map((p) => ({ p, c: buildTheme(p).colors }));

/**
 * Una ventana en miniatura de un tema: barra de título, pestaña con su línea
 * de acento y líneas de código en sus colores.
 * @param {(typeof themes)[number]} t @param {number} x @param {number} y @param {number} w @param {number} h
 */
function miniWindow({ p, c }, x, y, w, h) {
  const s = p.syntax;
  /** @type {Array<Array<[string, number]>>} filas de código: [color, fracción del ancho] */
  const rows = [
    [[s.keyword, 0.18], [s.function, 0.34], [s.punctuation, 0.06]],
    [[s.storage, 0.16], [s.text, 0.2], [s.operator, 0.05], [s.string, 0.36]],
    [[s.storage, 0.16], [s.property, 0.24], [s.operator, 0.05], [s.number, 0.14]],
    [[s.comment, 0.7]],
    [[s.keyword, 0.12], [s.text, 0.18], [s.operator, 0.05], [s.type, 0.3]],
    [[s.function, 0.4], [s.punctuation, 0.06], [s.string, 0.24]],
    [[s.keyword, 0.2], [s.number, 0.1]],
  ];
  const out = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c['editor.background']}"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="12" fill="${c['titleBar.activeBackground']}"/>`,
    `<rect x="${x}" y="${y + 12}" width="${r1(w * 0.55)}" height="2" fill="${c['tab.activeBorderTop'] ?? p.accent.main}"/>`,
    `<rect x="${x}" y="${y + h - 10}" width="${w}" height="10" fill="${c['statusBar.background']}"/>`,
  ];
  const inner = w - 20;
  rows.forEach((row, i) => {
    let cx = x + 10 + (i === 2 || i === 4 ? 8 : 0);
    const cy = y + 26 + i * ((h - 46) / rows.length);
    for (const [color, part] of row) {
      out.push(bar(cx, cy, inner * part, color));
      cx += inner * part + 4;
    }
  });
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${FG}" stroke-opacity=".25"/>`);
  return out.join('');
}

/** @type {Record<string, () => string>} */
const MEDIA = {
  // Los cuatro sectores: una ventana por tema.
  theme: () => card(themes.map((t, i) => miniWindow(t, 24 + i * 111, 34, 99, 240)).join('')),

  // El equipo completo: la credencial de la Agencia, los temas y los Objetos de Poder.
  fullSet: () =>
    card(
      [
        glyph('badgeBar', 36, 54, 168),
        ...themes.map((t, i) => miniWindow(t, 236 + i * 56, 54, 48, 92)),
        ...['dossier', 'hotline', 'duck', 'polaris', 'maze'].map((g, i) => glyph(g, 238 + i * 44, 186, 32)),
        bar(238, 240, 206, FG, 0.15),
        bar(238, 254, 140, FG, 0.15),
      ].join('')
    ),

  // Iconos: un explorador de archivos con Bureau Icons y la barra de actividad con los del lore.
  icons: () => {
    const files = [
      ['folder:src', 0, 0.46],
      ['ts', 1, 0.5],
      ['cs', 1, 0.42],
      ['py', 1, 0.38],
      ['rs', 1, 0.34],
      ['json', 1, 0.44],
      ['md', 1, 0.3],
      ['.env', 1, 0.24],
    ];
    const explorer = files.map(([key, indent, w], i) => {
      const y = 36 + i * 30;
      const x = 34 + Number(indent) * 18;
      return fileIcon(String(key), x, y, 20) + bar(x + 30, y + 7, 160 * Number(w), FG, 0.55);
    });
    const bar24 = ['dossierBar', 'lensBar', 'mazeBar', 'duckBar', 'hedronCheckBar', 'blocksBar'];
    const activity = bar24.map((g, i) => glyph(g, 300 + (i % 2) * 70, 40 + Math.floor(i / 2) * 70, 44));
    const status = ['pyramid', 'hotline', 'polaris'].map((g, i) => glyph(g, 300 + i * 50, 250, 22));
    return card([...explorer, `<rect x="276" y="24" width="1" height="260" fill="${FG}" fill-opacity=".2"/>`, ...activity, ...status].join(''));
  },

  // Claro de día, oscuro de noche: Astral y Dark a cada lado del Umbral.
  followSystem: () => {
    const astral = themes.find((t) => t.p.id === 'control-astral') ?? themes[3];
    const dark = themes[0];
    return card(
      [
        miniWindow(astral, 24, 34, 200, 240),
        miniWindow(dark, 256, 34, 200, 240),
        `<rect x="186" y="96" width="108" height="116" rx="2" fill="${BG}" stroke="${FG}" stroke-opacity=".25"/>`,
        glyph('thresholdBar', 196, 106, 88),
      ].join('')
    );
  },

  // La señalética: «Aa» con las dos tipografías (si no están instaladas, las del sistema).
  typography: () =>
    card(
      [
        `<text x="56" y="168" font-family="Overpass, Interstate, 'Segoe UI', sans-serif" font-size="96" font-weight="700" fill="${FG}">Aa</text>`,
        `<text x="56" y="214" font-family="'Overpass Mono', 'Interstate Mono', Consolas, monospace" font-size="22" fill="${FG}" fill-opacity=".75">{ 0O 1lI }</text>`,
        `<rect x="239" y="40" width="1" height="220" fill="${FG}" fill-opacity=".2"/>`,
        `<text x="270" y="168" font-family="'Space Grotesk', 'Segoe UI', sans-serif" font-size="96" font-weight="500" fill="${FG}">Aa</text>`,
        `<text x="270" y="214" font-family="'Space Mono', Consolas, monospace" font-size="22" fill="${FG}" fill-opacity=".75">{ 0O 1lI }</text>`,
        bar(56, 238, 120, RED, 1, 4),
        bar(270, 238, 120, REAL.cyan, 1, 4),
      ].join('')
    ),

  // La centralita: la gramola Songmaster y una onda de resonancia.
  sounds: () => {
    const wave = [];
    for (let i = 0; i < 34; i++) {
      const h = 6 + Math.round(Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 70);
      wave.push(`<rect x="${230 + i * 7}" y="${150 - h / 2}" width="4" height="${h}" rx="1" fill="${REAL.cyan}" fill-opacity="${r1(0.45 + (h / 76) * 0.55)}"/>`);
    }
    return card([glyph('jukebox', 40, 60, 168), ...wave, glyph('resonance', 400, 226, 40)].join(''));
  },

  // La gramola Songmaster: el Objeto de Poder, un vinilo y la canción en la barra de estado.
  music: () => {
    const vinyl = [
      `<circle cx="330" cy="120" r="78" fill="#111214" stroke="${FG}" stroke-opacity=".25"/>`,
      ...[66, 56, 46, 36].map((r) => `<circle cx="330" cy="120" r="${r}" fill="none" stroke="#2a2c31" stroke-width="1.5"/>`),
      `<circle cx="330" cy="120" r="22" fill="${RED}"/>`,
      `<circle cx="330" cy="120" r="3" fill="${BG}"/>`,
    ];
    const statusBar = [
      `<rect x="24" y="242" width="432" height="26" rx="2" fill="${FG}" fill-opacity=".08"/>`,
      glyph('jukebox', 36, 247, 16),
      bar(60, 252, 190, FG, 0.6),
      glyph('chevronLeft', 330, 247, 16),
      glyph('debugPause', 358, 247, 16),
      glyph('chevronRight', 386, 247, 16),
      glyph('oldestHouse', 424, 247, 16),
    ];
    return card([glyph('jukebox', 44, 40, 160), ...vinyl, ...statusBar].join(''));
  },

  // Modo Clasificado: un .env con sus valores tachados.
  classified: () => {
    const s = themes[0].p.syntax;
    const rows = [
      [0.22, 0.2, false],
      [0.3, 0.42, true],
      [0.18, 0.5, true],
      [0.26, 0.28, true],
      [0.2, 0.16, false],
      [0.34, 0.38, true],
    ];
    const lines = rows.map(([k, v, secret], i) => {
      const y = 52 + i * 34;
      const kw = 250 * Number(k);
      const value = secret ? bar(70 + kw + 22, y - 3, 250 * Number(v), 'var(--vscode-editor-foreground, #e6e2d8)', 1, 12) : bar(70 + kw + 22, y, 250 * Number(v), s.string);
      return bar(40, y, 18, FG, 0.25) + bar(70, y, kw, s.property) + bar(70 + kw + 6, y, 10, s.operator) + value;
    });
    return card([...lines, glyph('classified', 352, 150, 104), glyph('safe', 378, 36, 52)].join(''));
  },

  // Nivel de alerta: la baliza y los cuatro niveles en la barra de estado.
  alertLevel: () => {
    const levels = [
      [REAL.green, 0.18],
      [REAL.amber, 0.24],
      ['var(--vscode-statusBarItem-warningBackground, #C98A1E)', 0.2],
      ['var(--vscode-statusBarItem-errorBackground, #E0352B)', 0.36],
    ];
    const pills = levels.map(([color, w], i) => {
      const y = 52 + i * 52;
      return `<rect x="232" y="${y}" width="208" height="34" rx="2" fill="${color}" fill-opacity="${i < 2 ? 0.18 : 1}"/>` + glyph('alarm', 242, y + 7, 20) + bar(272, y + 14, 150 * Number(w) / 0.36, i < 2 ? FG : '#ffffff', i < 2 ? 0.6 : 0.9);
    });
    return card([glyph('alarm', 40, 66, 168), ...pills].join(''));
  },

  // El Consejo: la pirámide invertida entre sus corchetes angulares.
  board: () => {
    const chevron = (/** @type {number} */ x, /** @type {number} */ dir) =>
      `<path d="M${x} 110 L${x + dir * 34} 150 L${x} 190" fill="none" stroke="${RED}" stroke-width="8"/>` +
      `<path d="M${x + dir * 24} 110 L${x + dir * 58} 150 L${x + dir * 24} 190" fill="none" stroke="${RED}" stroke-width="8"/>`;
    const echoes = [0, 1, 2].map((i) => `<rect x="${150 - i * 18}" y="${44 - i * 10}" width="${180 + i * 36}" height="${212 + i * 20}" fill="none" stroke="${FG}" stroke-opacity="${r1(0.22 - i * 0.06)}"/>`);
    return card([...echoes, chevron(98, -1), chevron(382, 1), glyph('board', 168, 66, 144)].join(''));
  },
};

/**
 * Imágenes de los popups (media/hover/): el Objeto de Poder en una tesela
 * oscura con la franja roja de la Agencia, como la portada de un expediente.
 * La de la gramola es la «portada» cuando el sistema no da la del álbum.
 * @type {Record<string, string>} archivo → glifo
 */
const HOVER = { jukebox: 'jukebox', 'oldest-house': 'oldestHouse', alarm: 'alarm', classified: 'classified' };
const HOVER_OUT = path.join(ROOT, 'media', 'hover');

/** @param {string} name glifo */
const hoverTile = (name) =>
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<rect width="64" height="64" rx="6" fill="#1B1C20"/>',
    `<rect x="6" y="57" width="52" height="3" fill="${RED}"/>`,
    glyph(name, 10, 8, 44),
    '</svg>',
    '',
  ].join('');

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, render] of Object.entries(MEDIA)) fs.writeFileSync(path.join(OUT, `${name}.svg`), render());
  fs.mkdirSync(HOVER_OUT, { recursive: true });
  for (const [file, name] of Object.entries(HOVER)) fs.writeFileSync(path.join(HOVER_OUT, `${file}.svg`), hoverTile(name));
  console.log(`✔ media/walkthrough/ (${Object.keys(MEDIA).length} imágenes) y media/hover/ (${Object.keys(HOVER).length})`);
}

if (require.main === module) main();

module.exports = { MEDIA };
