// @ts-check
'use strict';

/**
 * Genera el tema de iconos de archivo «Bureau Icons» en icons/.
 *
 *   npm run icons
 *
 * Nitidez: todo se dibuja en la rejilla de 16 × 16 píxeles con los bordes
 * horizontales y verticales en coordenadas enteras (scripts/lib/glyph-kit.js),
 * y las etiquetas usan letras propias de 6 × 10 px (scripts/lib/label-font.js):
 * a 16 px se ven nítidas también en pantallas al 100 %.
 *
 * Diseño:
 *   - ARCHIVOS: la etiqueta de un expediente del Bureau: el código (TS, C#,
 *     {}…) o un pictograma en el color del lenguaje, sobre la franja de
 *     clasificación con su muesca. Sin hoja de fondo, para que a 16 px se lea.
 *   - CARPETAS: carpeta sólida del color de su categoría con un EMBLEMA (</> en
 *     src, check en test, montaña en images, onda en sounds, laberinto en .git…).
 *   - Carpeta raíz: la Casa Inmemorial (torre brutalista).
 * Guiños de lore: los .env son un documento clasificado (tachado), los tests
 * llevan el hexágono de la Hedron y los archivos de IA (CLAUDE.md, AGENTS.md,
 * *.prompt.md…) llevan a Polaris, la luz que guía a Jesse.
 *
 * Cada icono tiene dos variantes: temas oscuros y temas claros (CONTROL Astral).
 * Todo es original: no se usan logos de terceros.
 */

const fs = require('node:fs');
const path = require('node:path');
const K = require('./lib/glyph-kit');
const { label } = require('./lib/label-font');

/** @typedef {import('./lib/glyph-kit').Poly} Poly */

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'icons');
const SVG_DIR = path.join(OUT, 'svg');

/** Colores [tema oscuro, tema claro]. */
const C = {
  red: ['#E5675D', '#B3261E'],
  amber: ['#E6B04F', '#8A6100'],
  paper: ['#CDB68C', '#7A5A16'],
  steel: ['#79A9D1', '#1F5F99'],
  ice: ['#9CC2E6', '#2867A4'],
  cyan: ['#6FCFDC', '#1D6F73'],
  teal: ['#8FC1BE', '#2A6B66'],
  green: ['#86B57E', '#2A7334'],
  violet: ['#B79AE0', '#6A4A9E'],
  rose: ['#DDA9C8', '#8E3A7A'],
  orange: ['#E6904F', '#A84C0E'],
  bone: ['#D9D6CF', '#3A3936'],
  concrete: ['#8E8B85', '#5F5D57'],
  dim: ['#6E6C68', '#97948B'],
};
/** @typedef {keyof typeof C} ColorName */

/** Muesca de la franja de clasificación: luz astral (oscuro) o tinta (claro). */
const NOTCH = ['#F2EFE8', '#1A1A1C'];
/** La Casa Inmemorial: hormigón, contorno de luz astral, ventanas y la línea roja del FBC. */
const BOARD = { fill: ['#0D0E0F', '#151517'], stroke: ['#F2EFE8', '#151517'], line: ['#E0352B', '#C8261C'], windows: ['#F2EFE8', '#FAF9F6'] };

const svg = (/** @type {string} */ body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>\n`;
const path_ = (/** @type {string} */ fill, /** @type {Poly[]} */ polys, extra = '') => (polys.length ? `<path fill="${fill}"${extra} d="${K.toPath(polys)}"/>` : '');

/** Oscurece un color (mezcla con negro). */
function darken(/** @type {string} */ hex, /** @type {number} */ t) {
  const n = parseInt(hex.slice(1), 16);
  const f = (/** @type {number} */ v) => Math.round(v * (1 - t)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`.toUpperCase();
}

// --- Pictogramas de archivo --------------------------------------------------------------
// Zona: x 1–15, y 1–12 (debajo va la franja de clasificación, y 13–15). Bordes
// horizontales y verticales en píxeles enteros. `dim` se pinta a media opacidad.

/** @typedef {{fill: Poly[], dim?: Poly[]}} Picto */

/** @type {Record<string, () => Picto>} */
const PICTO = {
  text: () => ({ fill: [K.rect(1, 1, 14, 2), K.rect(1, 4, 10, 2), K.rect(1, 7, 14, 2), K.rect(1, 10, 8, 2)] }),
  image: () => ({ fill: [...K.frame(1, 1, 14, 11, 1), K.poly([2, 11], [6, 6], [9, 9], [11, 7], [14, 10], [14, 11]), K.rect(9, 3, 2, 2)] }),
  audio: () => ({ fill: [3, 7, 11, 5, 3].map((h, i) => K.rect(1 + i * 3, 6.5 - h / 2, 2, h)) }),
  video: () => ({ fill: [...K.frame(1, 1, 14, 11, 1), K.poly([6, 3.5], [11, 6.5], [6, 9.5])] }),
  database: () => ({
    fill: [0, 4, 8].flatMap((y) => K.move(K.art(`
      ..J##########L..
      ..############..
      ..7##########F..`), 0, 1 + y)),
  }),
  lock: () => ({ fill: [...K.stroke([[5, 7], [5, 2], [11, 2], [11, 7]], 2), K.rect(3, 6, 10, 6), K.cutRect(7, 8, 2, 2)] }),
  git: () => ({ fill: K.stroke([[3, 12], [3, 2], [13, 2], [13, 11], [7, 11], [7, 6], [10, 6]], 2) }),
  config: () => ({ fill: [K.rect(9, 1, 3, 3), K.rect(3, 5, 3, 3), K.rect(6, 9, 3, 3)], dim: [K.rect(1, 2, 14, 1), K.rect(1, 6, 14, 1), K.rect(1, 10, 14, 1)] }),
  archive: () => ({ fill: [K.rect(1, 1, 14, 3), K.rect(2, 5, 12, 7), K.cutRect(6, 7, 4, 2)] }),
  license: () => ({
    fill: [K.octagon(4, 1, 8, 8, 2), K.cutRect(7, 4, 2, 2), K.poly([5, 8], [7, 8], [7, 12], [6, 11], [5, 12]), K.poly([9, 8], [11, 8], [11, 12], [10, 11], [9, 12])],
  }),
  readme: () => ({ fill: [K.octagon(2, 1, 12, 11, 3), K.cutRect(7, 3, 2, 2), K.cutRect(7, 6, 2, 4)] }),
  changelog: () => ({ fill: [K.rect(1, 1, 2, 2), K.rect(1, 5, 2, 2), K.rect(1, 9, 2, 2), K.rect(4, 1, 11, 2), K.rect(4, 5, 11, 2), K.rect(4, 9, 7, 2)] }),
  classified: () => ({ fill: [K.rect(1, 1, 9, 3), K.rect(4, 5, 11, 3), K.rect(1, 9, 12, 3)] }),
  test: () => ({ fill: [...K.ring([[5, 2], [11, 2], [14, 6.5], [11, 11], [5, 11], [2, 6.5]], 2), ...K.stroke([[5.2, 6.4], [7.2, 8.4], [10.8, 4.8]], 2)] }),
  diff: () => ({ fill: [K.rect(4, 1, 2, 6), K.rect(2, 3, 6, 2), K.rect(8, 9, 6, 2)] }),
  grid: () => ({ fill: [K.rect(1, 1, 14, 3), ...K.frame(1, 1, 14, 11, 1), K.rect(1, 7, 14, 1), K.rect(5, 1, 1, 11), K.rect(10, 1, 1, 11)] }),
  cube: () => ({
    fill: [K.poly([8, 1], [14, 4], [8, 7], [2, 4]), K.poly([2, 5.2], [7, 7.7], [7, 12], [2, 9.5]), K.poly([14, 5.2], [9, 7.7], [9, 12], [14, 9.5])],
  }),
  key: () => ({ fill: [...K.frame(1, 1, 7, 7, 2), ...K.stroke([[7, 7], [11.6, 11.6]], 2), ...K.stroke([[9.2, 9.2], [11.2, 7.2]], 2), ...K.stroke([[11, 11], [13, 9]], 2)] }),
  docker: () => ({ fill: [K.rect(6, 1, 3, 2), K.rect(2, 4, 3, 2), K.rect(6, 4, 3, 2), K.rect(10, 4, 3, 2), K.poly([1, 7], [15, 7], [13, 12], [3, 12])] }),
  polaris: () => ({ fill: [K.star(8, 6.5, 8, 6.4, 2.2, 4.4)] }),
  shield: () => ({ fill: [K.poly([8, 1], [14, 3], [14, 7], [8, 12], [2, 7], [2, 3]), K.cutRect(7, 4, 2, 5)] }),
  workspace: () => ({ fill: [...K.frame(1, 1, 14, 11, 1), K.rect(1, 1, 14, 3), K.rect(6, 4, 1, 8)] }),
  vector: () => ({
    fill: K.art(`
      ................
      ......####......
      ......####......
      ....J######L....
      ...J########L...
      ...####..####...
      ...####..####...
      ...7###..###F...
      ....7##..##F....
      .....7#..#F.....
      ......7..F......
      ................
      ................
      ................
      ................
      ................`, 16),
  }),
};

// --- Emblemas de carpeta: 10 × 6 px, calados en la carpeta (x 3–13, y 7–13) ---------------

/** @type {Record<string, () => Poly[]>} */
const EMBLEM = {
  code: () => K.art(`
    ..........
    .J#F..7#L.
    J#F....7#L
    7#L....J#F
    .7#L..J#F.
    ..........`),
  check: () => K.art(`
    ........J#
    .......J#F
    ......J#F.
    7#L..J#F..
    .7#LJ#F...
    ..7##F....`),
  docs: () => K.art(`
    ##########
    ..........
    ##########
    ..........
    ######....
    ..........`),
  image: () => K.art(`
    ........##
    ...JL...##
    ..J##L....
    .J####L...
    J######L..
    ##########`),
  wave: () => K.art(`
    ....##....
    .##.##.##.
    .##.##.##.
    .##.##.##.
    .##.##.##.
    ....##....`),
  play: () => [K.poly([3, 0], [8, 3], [3, 6])],
  maze: () => K.art(`
    ##########
    .........#
    #######..#
    #.....#..#
    #.###.####
    #.#.......`),
  gear: () => [K.poly([3, 0], [7, 0], [9, 3], [7, 6], [3, 6], [1, 3]), K.cutRect(4, 2, 2, 2)],
  cube: () => K.art(`
    ...J##L...
    .J######L.
    #L.J##L.J#
    ###L##J###
    7#######F.
    ...7##F...`),
  box: () => K.art(`
    ##########
    ##########
    ..........
    .########.
    .########.
    .########.`),
  blocks: () => K.art(`
    ###.###...
    ###.###...
    ..........
    ###.###.##
    ###.###.##
    ........##`),
  sliders: () => K.art(`
    ......##..
    ##########
    ..##......
    ##########
    ....##....
    ##########`),
  globe: () => K.art(`
    ..J####L..
    .J#.##.#L.
    ##########
    ##########
    .7#.##.#F.
    ..7####F..`),
  star: () => [K.poly([5, 0], [6, 2.2], [10, 3], [6, 3.8], [5, 6], [4, 3.8], [0, 3], [4, 2.2])],
  database: () => K.art(`
    .J######L.
    .7######F.
    ..........
    .J######L.
    .########.
    .7######F.`),
  // Dos flechas (⇄): las API reciben y devuelven.
  plug: () => [K.rect(0, 1, 6, 1), K.poly([6, 0], [9, 1.5], [6, 3]), K.rect(4, 4, 6, 1), K.poly([4, 3], [1, 4.5], [4, 6])],
  wrench: () => K.art(`
    ......J##L
    ......####
    .....J###F
    ...J#F7#F.
    .J#F......
    J#F.......`),
  bolt: () => [K.poly([6.5, 0], [1.5, 4], [4.5, 4], [3.5, 6], [8.5, 2], [5.5, 2])],
  shield: () => [K.poly([3, 0], [7, 0], [8, 1], [8, 3], [5, 6], [2, 3], [2, 1])],
  person: () => K.art(`
    ....##....
    ....##....
    ..........
    ..J####L..
    .J######L.
    .########.`),
  window: () => K.art(`
    ##########
    ##########
    #........#
    #........#
    #........#
    ##########`),
  diamond: () => K.art(`
    ....JL....
    ..J#77#L..
    J#F....7#L
    7#L....J#F
    ..7#LJ#F..
    ....7F....`),
  clock: () => K.art(`
    ..J####L..
    .J#.##.#L.
    ##..##..##
    ##..####.#
    .7#....#F.
    ..7####F..`),
  flask: () => K.art(`
    ...####...
    ...####...
    ...#..#...
    ..J#..#L..
    .J######L.
    ##########`),
  // Polaris y su destello: los asistentes de IA.
  polaris: () => [
    K.poly([4, 0], [4.9, 2.1], [7.5, 3], [4.9, 3.9], [4, 6], [3.1, 3.9], [0.5, 3], [3.1, 2.1]),
    K.poly([8.5, 0], [8.9, 1.1], [10, 1.5], [8.9, 1.9], [8.5, 3], [8.1, 1.9], [7, 1.5], [8.1, 1.1]),
  ],
  loop: () => K.art(`
    7#L..7#L..
    .7#L..7#L.
    ..7#L..7#L
    ..J#F..J#F
    .J#F..J#F.
    J#F..J#F..`),
  phone: () => K.art(`
    ...####...
    ...#..#...
    ...#..#...
    ...#..#...
    ...####...
    ...####...`),
  font: () => K.art(`
    ...J##L...
    ..J#..#L..
    ..##..##..
    ..######..
    ..##..##..
    ..##..##..`),
  arrow: () => K.art(`
    ......#L..
    ......##L.
    #########L
    #########F
    ......##F.
    ......#F..`),
  layers: () => K.art(`
    ##########
    ..........
    .########.
    ..........
    ..######..
    ..........`),
  target: () => K.art(`
    ##########
    #........#
    #...##...#
    #...##...#
    #........#
    ##########`),
  key: () => K.art(`
    ####......
    #..#......
    #..#######
    ####..#.#.
    ..........
    ..........`),
  palette: () => K.art(`
    ...J##L...
    ..J####L..
    .J######L.
    .########.
    .########.
    ..7####F..`),
  terminal: () => K.art(`
    J#F.......
    .J#F......
    ..##......
    .7#L......
    7#L.######
    ....######`),
  container: () => K.art(`
    ...###....
    ..........
    ###.###.##
    ..........
    ##########
    .7######F.`),
};

/** Posición del emblema dentro de la carpeta. */
const EMBLEM_AT = /** @type {const} */ ([3, 7]);

// --- Plantillas ---------------------------------------------------------------------------

/** Franja de clasificación con su muesca, en píxeles enteros. */
const band = (/** @type {string} */ c, /** @type {number} */ v) =>
  `<rect x="2" y="13" width="12" height="2" fill="${c}" fill-opacity=".85"/><rect x="2" y="13" width="3" height="2" fill="${NOTCH[v]}"/>`;

/** Etiqueta de expediente: código o pictograma sobre la franja de clasificación. */
function fileIcon(/** @type {Spec} */ spec, /** @type {number} */ v) {
  const c = C[spec.color][v];
  if (spec.kind === 'picto') {
    const p = PICTO[spec.value]();
    return svg(`${path_(c, p.fill)}${path_(c, p.dim ?? [], ' fill-opacity=".5"')}${band(c, v)}`);
  }
  return svg(`${path_(c, label(spec.value))}${band(c, v)}`);
}

/** Carpeta sólida del color de su categoría con el emblema calado. */
function folderIcon(/** @type {ColorName} */ color, /** @type {string | null} */ emblem, /** @type {boolean} */ open, /** @type {number} */ v) {
  const body = C[color][v];
  const back = darken(body, v === 0 ? 0.38 : 0.3);
  const cutout = emblem ? K.invert(K.move(EMBLEM[emblem](), EMBLEM_AT[0], EMBLEM_AT[1])) : [];
  if (open) {
    return svg(
      path_(back, [K.poly([1, 2], [6, 2], [8, 4], [14, 4], [14, 6], [3, 6], [1, 13])]) +
        path_(body, [K.poly([3, 6], [16, 6], [14, 14], [1, 14]), ...cutout])
    );
  }
  return svg(path_(back, [K.poly([1, 2], [6, 2], [8, 4], [15, 4], [15, 6], [1, 6])]) + path_(body, [K.rect(1, 6, 14, 8), ...cutout]));
}

/**
 * Carpeta raíz: la Casa Inmemorial como se ve en el juego, el monolito de
 * hormigón sin ventanas (cara frontal a la luz, lateral en sombra) con sus
 * rejillas y la antena roja. Abierta, las rejillas se encienden en rojo.
 */
const HOUSE = {
  front: ['#D9D4CA', '#3A3A40'],
  side: ['#8D8880', '#1A1A1C'],
  slots: ['#0D0E0F', '#FAF9F6'],
};
function oldestHouse(/** @type {boolean} */ open, /** @type {number} */ v) {
  const slots = [K.rect(5, 3, 1, 1), K.rect(8, 3, 1, 1), K.rect(11, 3, 1, 1), K.rect(11, 8, 1, 2)];
  return svg(
    path_(HOUSE.front[v], [K.rect(4, 2, 6, 14)]) +
      path_(HOUSE.side[v], [K.rect(10, 2, 3, 14)]) +
      path_(open ? BOARD.line[v] : HOUSE.slots[v], slots) +
      path_(BOARD.line[v], [K.rect(7, 0, 1, 2)])
  );
}

// --- Catálogo -------------------------------------------------------------------------------

/** @typedef {{kind: 'label' | 'picto', value: string, color: ColorName}} Spec */
const L = (/** @type {string} */ value, /** @type {ColorName} */ color) => /** @type {Spec} */ ({ kind: 'label', value, color });
const P = (/** @type {keyof typeof PICTO} */ value, /** @type {ColorName} */ color) => /** @type {Spec} */ ({ kind: 'picto', value, color });

const DEFAULT_FILE = P('text', 'concrete');

/** Especificaciones con nombre (se reutilizan en extensiones, nombres y languageIds). */
const S = {
  ts: L('TS', 'steel'), dts: L('TS', 'concrete'), tsx: L('TX', 'steel'), js: L('JS', 'amber'), jsx: L('JX', 'amber'),
  json: L('{}', 'paper'), cs: L('C#', 'violet'), vb: L('VB', 'violet'), fs: L('F#', 'cyan'), razor: L('@', 'violet'), xaml: L('XA', 'ice'),
  c: L('C', 'steel'), cpp: L('C+', 'steel'), h: L('H', 'violet'), objc: L('OC', 'ice'), java: L('JV', 'red'), kotlin: L('KT', 'violet'),
  scala: L('SC', 'red'), groovy: L('GV', 'teal'), go: L('GO', 'cyan'), rust: L('RS', 'orange'), py: L('PY', 'ice'), nb: L('NB', 'amber'),
  ruby: L('RB', 'red'), php: L('PH', 'violet'), swift: L('SW', 'orange'), dart: L('DT', 'cyan'), lua: L('LU', 'steel'), r: L('R', 'ice'),
  julia: L('JL', 'violet'), elixir: L('EX', 'violet'), erlang: L('ER', 'red'), haskell: L('HS', 'violet'), clojure: L('CL', 'green'),
  elm: L('EL', 'cyan'), ocaml: L('ML', 'orange'), nim: L('NI', 'amber'), zig: L('ZG', 'amber'), vlang: L('V', 'steel'), solidity: L('SO', 'concrete'),
  asm: L('AS', 'concrete'), perl: L('PL', 'steel'), coffee: L('CF', 'paper'), haxe: L('HX', 'orange'), dlang: L('D', 'red'), crystal: L('CR', 'bone'),
  nix: L('NX', 'ice'), gdscript: L('GD', 'steel'), terraform: L('TF', 'violet'), powershell: L('>_', 'steel'), shell: L('$_', 'green'),
  bat: L('>_', 'concrete'), sql: P('database', 'amber'), graphql: L('GQ', 'rose'), proto: L('PB', 'teal'), wasm: L('WA', 'violet'),
  vue: L('V', 'green'), svelte: L('SV', 'orange'), astro: L('AT', 'orange'), html: L('<>', 'red'), css: L('#', 'teal'), scss: L('S', 'rose'),
  less: L('L', 'ice'), stylus: L('ST', 'green'), pug: L('PG', 'bone'), handlebars: L('HB', 'amber'), ejs: L('EJ', 'paper'), twig: L('TW', 'green'),
  liquid: L('LQ', 'teal'), jinja: L('JN', 'red'), md: L('MD', 'bone'), mdx: L('MX', 'amber'), rst: L('RT', 'bone'), adoc: L('AD', 'red'),
  tex: L('TE', 'teal'), text: P('text', 'concrete'), log: P('text', 'paper'), xml: L('</>', 'orange'), svg: P('vector', 'amber'), yaml: L('Y', 'rose'),
  config: P('config', 'concrete'), csv: P('grid', 'green'), sheet: L('X', 'green'), doc: L('W', 'steel'), slides: L('P', 'orange'), pdf: L('PD', 'red'),
  epub: L('EP', 'paper'), image: P('image', 'green'), audio: P('audio', 'rose'), video: P('video', 'rose'), font: L('Aa', 'bone'),
  archive: P('archive', 'concrete'), jar: P('archive', 'orange'), apk: P('archive', 'green'), ipa: P('archive', 'steel'), installer: P('archive', 'dim'),
  binary: L('01', 'dim'), nupkg: P('archive', 'violet'), vsix: P('archive', 'red'), whl: P('archive', 'ice'), key: P('key', 'amber'), signature: P('key', 'green'),
  lock: P('lock', 'dim'), diff: P('diff', 'green'), db: P('database', 'paper'), env: P('classified', 'amber'), license: P('license', 'amber'),
  readme: P('readme', 'steel'), changelog: P('changelog', 'teal'), contributing: P('changelog', 'green'), conduct: P('changelog', 'violet'),
  security: P('shield', 'red'), todo: P('changelog', 'amber'), test: P('test', 'cyan'), ai: P('polaris', 'amber'), docker: P('docker', 'ice'),
  git: P('git', 'orange'), npm: P('cube', 'red'), project: P('cube', 'violet'), dotnetConfig: P('config', 'violet'), npmConfig: P('config', 'red'),
  tsconfig: P('config', 'steel'), jsconfig: P('config', 'amber'), vite: L('VT', 'violet'), webpack: L('WP', 'ice'), rollup: L('RL', 'red'),
  babel: L('BB', 'amber'), eslint: L('ES', 'violet'), prettier: L('PR', 'teal'), stylelint: L('SL', 'bone'), jest: L('JE', 'red'),
  vitest: L('VI', 'green'), playwright: L('PW', 'green'), cypress: L('CY', 'concrete'), tailwind: L('TW', 'cyan'), postcss: L('PC', 'red'),
  next: L('NX', 'bone'), nuxt: L('NU', 'green'), angular: L('NG', 'red'), nest: L('NE', 'red'), turbo: L('TB', 'rose'), vercel: L('VC', 'bone'),
  netlify: L('NT', 'teal'), firebase: L('FB', 'amber'), make: L('MK', 'orange'), cmake: L('CM', 'teal'), bazel: L('BZ', 'green'),
  gradle: L('GR', 'teal'), maven: L('MV', 'red'), cargo: P('config', 'orange'), gomod: P('config', 'cyan'), pyconfig: P('config', 'ice'),
  requirements: P('changelog', 'ice'), gemfile: L('RB', 'red'), composer: L('CP', 'paper'), podfile: L('PO', 'red'), pubspec: L('DT', 'cyan'),
  procfile: L('PF', 'violet'), jenkins: L('JK', 'red'), ci: L('CI', 'orange'), prisma: L('PS', 'violet'), http: L('HT', 'green'),
  workspace: P('workspace', 'steel'), shellrc: L('$_', 'green'), favicon: P('image', 'red'), robots: P('text', 'green'), webConfig: P('config', 'steel'),
  nginx: L('NG', 'green'), editorconfig: P('config', 'bone'), browserslist: P('config', 'amber'), dotnetTool: P('cube', 'violet'),
};

/** Extensiones (sin punto; también vale «test.ts», «d.ts», «prompt.md»…). */
const EXTENSIONS = {
  ts: S.ts, mts: S.ts, cts: S.ts, 'd.ts': S.dts, 'd.mts': S.dts, 'd.cts': S.dts, tsx: S.tsx, js: S.js, mjs: S.js, cjs: S.js, jsx: S.jsx,
  json: S.json, jsonc: S.json, json5: S.json, jsonl: S.json, ndjson: S.json, geojson: S.json, webmanifest: S.json, har: S.json,
  cs: S.cs, csx: S.cs, vb: S.vb, vbs: S.vb, fs: S.fs, fsx: S.fs, fsi: S.fs, cshtml: S.razor, razor: S.razor, vbhtml: S.razor, xaml: S.xaml, axaml: S.xaml,
  csproj: S.project, fsproj: S.project, vbproj: S.project, sln: S.project, slnx: S.project, props: S.dotnetConfig, targets: S.dotnetConfig,
  c: S.c, cpp: S.cpp, cc: S.cpp, cxx: S.cpp, 'c++': S.cpp, ino: S.cpp, h: S.h, hpp: S.h, hh: S.h, hxx: S.h, inl: S.h, m: S.objc, mm: S.objc,
  java: S.java, kt: S.kotlin, kts: S.kotlin, scala: S.scala, sc: S.scala, sbt: S.scala, groovy: S.groovy, gvy: S.groovy, go: S.go, rs: S.rust,
  py: S.py, pyi: S.py, pyw: S.py, pyx: S.py, ipynb: S.nb, rb: S.ruby, erb: S.ruby, rake: S.ruby, gemspec: S.ruby, php: S.php, phtml: S.php,
  swift: S.swift, dart: S.dart, lua: S.lua, luau: S.lua, r: S.r, rmd: S.r, jl: S.julia, ex: S.elixir, exs: S.elixir, heex: S.elixir, erl: S.erlang,
  hrl: S.erlang, hs: S.haskell, lhs: S.haskell, clj: S.clojure, cljs: S.clojure, cljc: S.clojure, edn: S.clojure, elm: S.elm, ml: S.ocaml, mli: S.ocaml,
  nim: S.nim, zig: S.zig, v: S.vlang, sol: S.solidity, asm: S.asm, s: S.asm, nasm: S.asm, pl: S.perl, pm: S.perl, coffee: S.coffee, hx: S.haxe,
  d: S.dlang, cr: S.crystal, nix: S.nix, gd: S.gdscript, tf: S.terraform, tfvars: S.terraform, hcl: S.terraform, ps1: S.powershell, psm1: S.powershell,
  psd1: S.powershell, sh: S.shell, bash: S.shell, zsh: S.shell, fish: S.shell, ksh: S.shell, bat: S.bat, cmd: S.bat, sql: S.sql, psql: S.sql,
  mysql: S.sql, pgsql: S.sql, graphql: S.graphql, gql: S.graphql, proto: S.proto, wasm: S.wasm, wat: S.wasm, vue: S.vue, svelte: S.svelte,
  astro: S.astro, html: S.html, htm: S.html, xhtml: S.html, css: S.css, pcss: S.css, scss: S.scss, sass: S.scss, less: S.less, styl: S.stylus,
  pug: S.pug, jade: S.pug, hbs: S.handlebars, handlebars: S.handlebars, mustache: S.handlebars, ejs: S.ejs, twig: S.twig, liquid: S.liquid,
  njk: S.jinja, jinja: S.jinja, jinja2: S.jinja, j2: S.jinja, md: S.md, markdown: S.md, mdc: S.ai, mdx: S.mdx, rst: S.rst, adoc: S.adoc, asciidoc: S.adoc,
  tex: S.tex, latex: S.tex, bib: S.tex, cls: S.tex, sty: S.tex, txt: S.text, text: S.text, log: S.log, out: S.log,
  xml: S.xml, xsd: S.xml, xsl: S.xml, xslt: S.xml, plist: S.xml, resx: S.xml, config: S.xml, manifest: S.xml, svg: S.svg,
  yaml: S.yaml, yml: S.yaml, toml: S.config, ini: S.config, cfg: S.config, conf: S.config, properties: S.config, env: S.env,
  csv: S.csv, tsv: S.csv, psv: S.csv, xlsx: S.sheet, xls: S.sheet, xlsm: S.sheet, ods: S.sheet, numbers: S.sheet, docx: S.doc, doc: S.doc,
  odt: S.doc, rtf: S.doc, pages: S.doc, pptx: S.slides, ppt: S.slides, odp: S.slides, key: S.key, pdf: S.pdf, epub: S.epub, mobi: S.epub,
  png: S.image, jpg: S.image, jpeg: S.image, gif: S.image, webp: S.image, bmp: S.image, ico: S.image, icns: S.image, tif: S.image, tiff: S.image,
  avif: S.image, heic: S.image, psd: S.image, ai: S.image, xcf: S.image, fig: S.image, sketch: S.image, raw: S.image, cur: S.image,
  wav: S.audio, mp3: S.audio, ogg: S.audio, flac: S.audio, m4a: S.audio, aac: S.audio, opus: S.audio, mid: S.audio, midi: S.audio, aiff: S.audio,
  mp4: S.video, webm: S.video, mov: S.video, mkv: S.video, avi: S.video, wmv: S.video, flv: S.video, m4v: S.video,
  ttf: S.font, otf: S.font, woff: S.font, woff2: S.font, eot: S.font,
  zip: S.archive, tar: S.archive, gz: S.archive, tgz: S.archive, bz2: S.archive, xz: S.archive, '7z': S.archive, rar: S.archive, zst: S.archive,
  jar: S.jar, war: S.jar, ear: S.jar, apk: S.apk, aab: S.apk, ipa: S.ipa, deb: S.installer, rpm: S.installer, pkg: S.installer, dmg: S.installer,
  iso: S.installer, msi: S.installer, exe: S.installer, appimage: S.installer, snap: S.installer, dll: S.binary, so: S.binary, dylib: S.binary,
  lib: S.binary, a: S.binary, o: S.binary, obj: S.binary, pdb: S.binary, class: S.binary, pyc: S.binary, bin: S.binary, nupkg: S.nupkg,
  vsix: S.vsix, whl: S.whl, pem: S.key, crt: S.key, cer: S.key, der: S.key, pub: S.key, p12: S.key, pfx: S.key, jks: S.key, keystore: S.key,
  csr: S.key, asc: S.signature, gpg: S.signature, sig: S.signature, lock: S.lock, diff: S.diff, patch: S.diff, rej: S.diff,
  sqlite: S.db, sqlite3: S.db, db: S.db, mdb: S.db, accdb: S.db, prisma: S.prisma, http: S.http, rest: S.http, 'code-workspace': S.workspace,
  cmake: S.cmake, gradle: S.gradle, bazel: S.bazel, bzl: S.bazel,
  'test.ts': S.test, 'spec.ts': S.test, 'test.tsx': S.test, 'spec.tsx': S.test, 'test.js': S.test, 'spec.js': S.test, 'test.jsx': S.test,
  'spec.jsx': S.test, 'test.mjs': S.test, 'test.cjs': S.test, 'e2e.ts': S.test, 'e2e.js': S.test, 'cy.ts': S.test, 'cy.js': S.test,
  'tests.cs': S.test, 'test.cs': S.test, 'spec.rb': S.test, 'test.py': S.test,
  'prompt.md': S.ai, 'instructions.md': S.ai, 'agent.md': S.ai, 'chatmode.md': S.ai, 'prompt.yml': S.ai,
};

/** Nombres de archivo exactos (en minúsculas). */
const FILE_NAMES = {
  'package.json': S.npm, 'package-lock.json': S.lock, 'npm-shrinkwrap.json': S.lock, 'yarn.lock': S.lock, 'pnpm-lock.yaml': S.lock,
  'bun.lockb': S.lock, 'bun.lock': S.lock, 'cargo.lock': S.lock, 'composer.lock': S.lock, 'gemfile.lock': S.lock, 'poetry.lock': S.lock,
  'pipfile.lock': S.lock, 'packages.lock.json': S.lock, 'go.sum': S.lock, 'flake.lock': S.lock, 'mix.lock': S.lock, 'pubspec.lock': S.lock,
  '.npmrc': S.npmConfig, '.yarnrc': S.npmConfig, '.yarnrc.yml': S.npmConfig, '.npmignore': S.npmConfig, '.nvmrc': S.npmConfig, '.node-version': S.npmConfig,
  'pnpm-workspace.yaml': S.npmConfig, license: S.license, 'license.md': S.license, 'license.txt': S.license, licence: S.license, copying: S.license,
  notice: S.license, 'notice.md': S.license, 'readme.md': S.readme, readme: S.readme, 'readme.txt': S.readme, 'changelog.md': S.changelog,
  changelog: S.changelog, 'history.md': S.changelog, 'changes.md': S.changelog, 'contributing.md': S.contributing, 'code_of_conduct.md': S.conduct,
  'security.md': S.security, 'todo.md': S.todo, todo: S.todo, 'claude.md': S.ai, 'agents.md': S.ai, 'gemini.md': S.ai, '.cursorrules': S.ai,
  '.windsurfrules': S.ai, 'copilot-instructions.md': S.ai, 'llms.txt': S.ai,
  '.gitignore': S.git, '.gitattributes': S.git, '.gitmodules': S.git, '.gitkeep': S.git, '.mailmap': S.git, '.git-blame-ignore-revs': S.git,
  '.env': S.env, '.env.local': S.env, '.env.development': S.env, '.env.production': S.env, '.env.test': S.env, '.env.example': S.env,
  '.env.sample': S.env, '.env.staging': S.env, '.envrc': S.env, dockerfile: S.docker, containerfile: S.docker, 'docker-compose.yml': S.docker,
  'docker-compose.yaml': S.docker, 'compose.yml': S.docker, 'compose.yaml': S.docker, '.dockerignore': S.docker,
  'tsconfig.json': S.tsconfig, 'jsconfig.json': S.jsconfig, '.editorconfig': S.editorconfig, '.browserslistrc': S.browserslist, browserslist: S.browserslist,
  '.babelrc': S.babel, '.babelrc.json': S.babel, '.eslintrc': S.eslint, '.eslintrc.json': S.eslint, '.eslintrc.js': S.eslint, '.eslintrc.cjs': S.eslint,
  '.eslintrc.yml': S.eslint, '.eslintignore': S.eslint, '.prettierrc': S.prettier, '.prettierrc.json': S.prettier, '.prettierrc.yml': S.prettier,
  '.prettierignore': S.prettier, '.stylelintrc': S.stylelint, '.stylelintrc.json': S.stylelint, 'angular.json': S.angular, 'nest-cli.json': S.nest,
  'turbo.json': S.turbo, 'vercel.json': S.vercel, 'netlify.toml': S.netlify, 'firebase.json': S.firebase, '.firebaserc': S.firebase,
  makefile: S.make, gnumakefile: S.make, 'cmakelists.txt': S.cmake, 'meson.build': S.make, build: S.bazel, 'build.bazel': S.bazel,
  workspace: S.bazel, 'module.bazel': S.bazel, 'build.gradle': S.gradle, 'build.gradle.kts': S.gradle, 'settings.gradle': S.gradle,
  'settings.gradle.kts': S.gradle, gradlew: S.gradle, 'gradle.properties': S.gradle, 'pom.xml': S.maven, 'cargo.toml': S.cargo, 'go.mod': S.gomod,
  'go.work': S.gomod, 'requirements.txt': S.requirements, 'requirements-dev.txt': S.requirements, 'pyproject.toml': S.pyconfig, 'setup.py': S.pyconfig,
  'setup.cfg': S.pyconfig, pipfile: S.pyconfig, 'tox.ini': S.pyconfig, '.python-version': S.pyconfig, gemfile: S.gemfile, rakefile: S.gemfile,
  'composer.json': S.composer, podfile: S.podfile, 'pubspec.yaml': S.pubspec, procfile: S.procfile, jenkinsfile: S.jenkins, '.travis.yml': S.ci,
  '.gitlab-ci.yml': S.ci, 'azure-pipelines.yml': S.ci, 'appveyor.yml': S.ci, 'bitbucket-pipelines.yml': S.ci, '.drone.yml': S.ci,
  'global.json': S.dotnetConfig, 'nuget.config': S.dotnetConfig, 'directory.build.props': S.dotnetConfig, 'directory.build.targets': S.dotnetConfig,
  'directory.packages.props': S.dotnetConfig, 'launchsettings.json': S.dotnetConfig, 'appsettings.json': S.dotnetConfig,
  'appsettings.development.json': S.dotnetConfig, 'appsettings.production.json': S.dotnetConfig, 'dotnet-tools.json': S.dotnetTool,
  'web.config': S.webConfig, '.vscodeignore': S.config, '.bashrc': S.shellrc, '.zshrc': S.shellrc, '.profile': S.shellrc, '.bash_profile': S.shellrc,
  'favicon.ico': S.favicon, 'robots.txt': S.robots, 'nginx.conf': S.nginx, '.htaccess': S.config, 'manifest.json': S.config,
};

/** Archivos de configuración de herramientas que admiten varias extensiones (vite.config.ts, .js, .mjs…). */
const TOOL_CONFIGS = {
  vite: S.vite, vitest: S.vitest, webpack: S.webpack, rollup: S.rollup, babel: S.babel, 'eslint': S.eslint, prettier: S.prettier, jest: S.jest,
  playwright: S.playwright, cypress: S.cypress, tailwind: S.tailwind, postcss: S.postcss, next: S.next, nuxt: S.nuxt, svelte: S.svelte, astro: S.astro,
  stylelint: S.stylelint, turbo: S.turbo,
};
for (const [tool, spec] of Object.entries(TOOL_CONFIGS)) {
  for (const ext of ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'json']) /** @type {any} */ (FILE_NAMES)[`${tool}.config.${ext}`] = spec;
}

const LANGUAGE_IDS = {
  typescript: S.ts, typescriptreact: S.tsx, javascript: S.js, javascriptreact: S.jsx, json: S.json, jsonc: S.json, jsonl: S.json, csharp: S.cs,
  vb: S.vb, fsharp: S.fs, razor: S.razor, aspnetcorerazor: S.razor, html: S.html, css: S.css, scss: S.scss, sass: S.scss, less: S.less,
  markdown: S.md, mdx: S.mdx, python: S.py, sql: S.sql, xml: S.xml, xsl: S.xml, yaml: S.yaml, toml: S.config, ini: S.config, properties: S.config,
  shellscript: S.shell, powershell: S.powershell, bat: S.bat, plaintext: S.text, log: S.log, ignore: S.git, dockerfile: S.docker,
  dockercompose: S.docker, diff: S.diff, go: S.go, rust: S.rust, java: S.java, kotlin: S.kotlin, scala: S.scala, groovy: S.groovy, c: S.c,
  cpp: S.cpp, 'objective-c': S.objc, 'objective-cpp': S.objc, php: S.php, ruby: S.ruby, swift: S.swift, dart: S.dart, lua: S.lua, r: S.r,
  julia: S.julia, elixir: S.elixir, erlang: S.erlang, haskell: S.haskell, clojure: S.clojure, perl: S.perl, coffeescript: S.coffee,
  terraform: S.terraform, graphql: S.graphql, proto3: S.proto, vue: S.vue, svelte: S.svelte, astro: S.astro, pug: S.pug, handlebars: S.handlebars,
  twig: S.twig, latex: S.tex, bibtex: S.tex, makefile: S.make, cmake: S.cmake, prisma: S.prisma, http: S.http, dotenv: S.env, 'git-commit': S.git,
  'git-rebase': S.git, 'code-workspace': S.workspace, jupyter: S.nb, csv: S.csv, tsv: S.csv, prompt: S.ai, instructions: S.ai, chatagent: S.ai,
};

// --- Carpetas: nombre → [color, emblema] -------------------------------------------------------

/** @type {Record<string, [ColorName, keyof typeof EMBLEM]>} */
const FOLDER_KINDS = {
  source: ['red', 'code'], test: ['cyan', 'check'], docs: ['bone', 'docs'], images: ['green', 'image'], assets: ['green', 'star'],
  audio: ['rose', 'wave'], video: ['rose', 'play'], git: ['orange', 'maze'], ci: ['orange', 'loop'], vscode: ['steel', 'gear'],
  ide: ['violet', 'gear'], packages: ['violet', 'cube'], modules: ['dim', 'cube'], build: ['dim', 'box'], components: ['steel', 'blocks'],
  config: ['concrete', 'sliders'], i18n: ['teal', 'globe'], data: ['paper', 'database'], api: ['orange', 'plug'], utils: ['concrete', 'wrench'],
  hooks: ['amber', 'bolt'], security: ['red', 'shield'], users: ['ice', 'person'], views: ['ice', 'window'], types: ['violet', 'diamond'],
  temp: ['dim', 'clock'], logs: ['paper', 'docs'], mocks: ['teal', 'flask'], ai: ['amber', 'polaris'], mobile: ['green', 'phone'], fonts: ['bone', 'font'],
  migrations: ['paper', 'arrow'], middleware: ['teal', 'layers'], services: ['violet', 'layers'], coverage: ['green', 'target'],
  secrets: ['amber', 'key'], styles: ['rose', 'palette'], scripts: ['amber', 'terminal'], infra: ['ice', 'container'], store: ['paper', 'database'],
};

const FOLDER_NAMES = /** @type {Record<string, keyof typeof FOLDER_KINDS>} */ ({
  src: 'source', source: 'source', sources: 'source', app: 'source', apps: 'source', lib: 'source', libs: 'source', core: 'source', main: 'source',
  test: 'test', tests: 'test', __tests__: 'test', spec: 'test', specs: 'test', e2e: 'test', integration: 'test', unit: 'test', cypress: 'test',
  playwright: 'test', 'test-workspace': 'test', testing: 'test',
  docs: 'docs', doc: 'docs', documentation: 'docs', wiki: 'docs', guides: 'docs', notes: 'docs', references: 'docs', manual: 'docs',
  images: 'images', image: 'images', img: 'images', imgs: 'images', icons: 'images', icon: 'images', pictures: 'images', photos: 'images',
  screenshots: 'images', sprites: 'images', graphics: 'images', media: 'images',
  assets: 'assets', asset: 'assets', public: 'assets', static: 'assets', resources: 'assets', res: 'assets', www: 'assets', wwwroot: 'assets',
  sounds: 'audio', sound: 'audio', audio: 'audio', music: 'audio', sfx: 'audio', video: 'video', videos: 'video', movies: 'video',
  '.git': 'git', '.github': 'git', '.gitlab': 'git', '.husky': 'git', '.githooks': 'git', githooks: 'git',
  workflows: 'ci', '.circleci': 'ci', ci: 'ci', pipelines: 'ci', '.azure-pipelines': 'ci', '.buildkite': 'ci',
  '.vscode': 'vscode', '.vscode-test': 'vscode', '.idea': 'ide', '.vs': 'ide', '.fleet': 'ide', '.devcontainer': 'infra',
  packages: 'packages', package: 'packages', plugins: 'packages', plugin: 'packages', extensions: 'packages', addons: 'packages',
  vendor: 'packages', third_party: 'packages', 'third-party': 'packages', external: 'packages', node_modules: 'modules', bower_components: 'modules',
  '.yarn': 'modules', '.pnpm-store': 'modules', jspm_packages: 'modules',
  dist: 'build', out: 'build', build: 'build', builds: 'build', release: 'build', releases: 'build', target: 'build', bin: 'build', obj: 'build',
  publish: 'build', artifacts: 'build', '.next': 'build', '.nuxt': 'build', '.output': 'build', '.svelte-kit': 'build', '.vercel': 'build',
  components: 'components', component: 'components', widgets: 'components', ui: 'components', elements: 'components', blocks: 'components',
  config: 'config', configs: 'config', configuration: 'config', settings: 'config', '.config': 'config', env: 'config', environments: 'config',
  i18n: 'i18n', l10n: 'i18n', locales: 'i18n', locale: 'i18n', lang: 'i18n', langs: 'i18n', languages: 'i18n', translations: 'i18n', intl: 'i18n',
  data: 'data', db: 'data', database: 'data', databases: 'data', sql: 'data', seeds: 'migrations', seeders: 'migrations', migrations: 'migrations',
  store: 'store', stores: 'store', state: 'store', redux: 'store', context: 'store', contexts: 'store',
  api: 'api', apis: 'api', server: 'api', backend: 'api', routes: 'api', router: 'api', routers: 'api', endpoints: 'api', controllers: 'api', handlers: 'api',
  utils: 'utils', util: 'utils', utilities: 'utils', helpers: 'utils', helper: 'utils', common: 'utils', shared: 'utils', tools: 'utils', misc: 'utils',
  hooks: 'hooks', events: 'hooks', listeners: 'hooks', signals: 'hooks', triggers: 'hooks',
  auth: 'security', security: 'security', guards: 'security', permissions: 'security', policies: 'security',
  users: 'users', user: 'users', accounts: 'users', profiles: 'users', people: 'users',
  views: 'views', view: 'views', pages: 'views', page: 'views', screens: 'views', layouts: 'views', layout: 'views', templates: 'views',
  partials: 'views', routes_ui: 'views',
  types: 'types', typings: 'types', '@types': 'types', interfaces: 'types', models: 'types', model: 'types', entities: 'types', schemas: 'types',
  schema: 'types', dto: 'types', dtos: 'types', domain: 'types',
  temp: 'temp', tmp: 'temp', cache: 'temp', '.cache': 'temp', '.temp': 'temp', '.tmp': 'temp',
  logs: 'logs', log: 'logs',
  mocks: 'mocks', __mocks__: 'mocks', mock: 'mocks', fixtures: 'mocks', stubs: 'mocks', samples: 'mocks', sample: 'mocks', examples: 'mocks',
  example: 'mocks', demo: 'mocks', demos: 'mocks', playground: 'mocks', sandbox: 'mocks',
  ai: 'ai', prompts: 'ai', agents: 'ai', '.claude': 'ai', '.cursor': 'ai', '.copilot': 'ai', llm: 'ai', '.windsurf': 'ai',
  android: 'mobile', ios: 'mobile', mobile: 'mobile', fonts: 'fonts', font: 'fonts', typography: 'fonts',
  middleware: 'middleware', middlewares: 'middleware', interceptors: 'middleware', pipes: 'middleware', filters: 'middleware',
  services: 'services', service: 'services', providers: 'services', provider: 'services',
  coverage: 'coverage', '.nyc_output': 'coverage', benchmarks: 'coverage', benchmark: 'coverage', reports: 'coverage',
  secrets: 'secrets', certs: 'secrets', certificates: 'secrets', keys: 'secrets', ssl: 'secrets', '.ssh': 'secrets',
  themes: 'styles', theme: 'styles', styles: 'styles', style: 'styles', css: 'styles', scss: 'styles', sass: 'styles', stylesheets: 'styles',
  scripts: 'scripts', script: 'scripts', cli: 'scripts', commands: 'scripts', tasks: 'scripts',
  docker: 'infra', '.docker': 'infra', k8s: 'infra', kubernetes: 'infra', helm: 'infra', deploy: 'infra', deployment: 'infra', infra: 'infra',
  infrastructure: 'infra', terraform: 'infra', ansible: 'infra',
  'product-icons': 'images',
});

// --- Generación ---------------------------------------------------------------------------

const specId = (/** @type {Spec} */ s) =>
  `f_${s.kind}_${s.kind === 'label' ? [...s.value].map((ch) => (/[a-z0-9]/i.test(ch) ? ch.toLowerCase() : ch.codePointAt(0)?.toString(16))).join('') : s.value}_${s.color}`;

function main() {
  fs.rmSync(SVG_DIR, { recursive: true, force: true });
  fs.mkdirSync(SVG_DIR, { recursive: true });

  /** @type {Record<string, {iconPath: string}>} */
  const defs = {};
  const write = (/** @type {string} */ id, /** @type {string} */ content) => {
    fs.writeFileSync(path.join(SVG_DIR, `${id}.svg`), content);
    defs[id] = { iconPath: `./svg/${id}.svg` };
  };

  /** @type {Map<string, Spec>} */
  const specs = new Map();
  for (const s of [DEFAULT_FILE, ...Object.values(EXTENSIONS), ...Object.values(FILE_NAMES), ...Object.values(LANGUAGE_IDS)]) specs.set(specId(s), s);

  for (const [v, suffix] of /** @type {const} */ ([[0, ''], [1, '_light']])) {
    for (const [id, s] of specs) write(`${id}${suffix}`, fileIcon(s, v));
    write(`folder${suffix}`, folderIcon('concrete', null, false, v));
    write(`folder_open${suffix}`, folderIcon('concrete', null, true, v));
    write(`root${suffix}`, oldestHouse(false, v));
    write(`root_open${suffix}`, oldestHouse(true, v));
    for (const [kind, [color, emblem]] of Object.entries(FOLDER_KINDS)) {
      write(`folder_${kind}${suffix}`, folderIcon(color, emblem, false, v));
      write(`folder_${kind}_open${suffix}`, folderIcon(color, emblem, true, v));
    }
  }

  const mapping = (/** @type {string} */ suffix) => ({
    file: `${specId(DEFAULT_FILE)}${suffix}`,
    folder: `folder${suffix}`,
    folderExpanded: `folder_open${suffix}`,
    rootFolder: `root${suffix}`,
    rootFolderExpanded: `root_open${suffix}`,
    fileExtensions: Object.fromEntries(Object.entries(EXTENSIONS).map(([ext, s]) => [ext, `${specId(s)}${suffix}`])),
    fileNames: Object.fromEntries(Object.entries(FILE_NAMES).map(([n, s]) => [n, `${specId(s)}${suffix}`])),
    languageIds: Object.fromEntries(Object.entries(LANGUAGE_IDS).map(([l, s]) => [l, `${specId(s)}${suffix}`])),
    folderNames: Object.fromEntries(Object.entries(FOLDER_NAMES).map(([n, k]) => [n, `folder_${k}${suffix}`])),
    folderNamesExpanded: Object.fromEntries(Object.entries(FOLDER_NAMES).map(([n, k]) => [n, `folder_${k}_open${suffix}`])),
  });

  // VS Code lee este JSON al arrancar para pintar el explorador: se escribe
  // compacto y con identificadores cortos (192 KB → ~84 KB). Sin sección
  // `highContrast`: era una copia de la principal, que es la que VS Code usa
  // cuando no existe. Los nombres descriptivos siguen en los archivos SVG.
  const short = new Map(Object.keys(defs).map((id, i) => [id, i.toString(36)]));
  /** @param {Record<string, any>} m @returns {Record<string, any>} */
  const shorten = (m) =>
    Object.fromEntries(
      Object.entries(m).map(([k, v]) => {
        if (typeof v !== 'string') return [k, shorten(v)];
        const id = short.get(v);
        if (!id) throw new Error(`Icono sin definir: ${v}`);
        return [k, id];
      })
    );
  const theme = {
    hidesExplorerArrows: false,
    iconDefinitions: Object.fromEntries(Object.entries(defs).map(([id, d]) => [short.get(id), d])),
    ...shorten(mapping('')),
    light: shorten(mapping('_light')),
  };
  fs.writeFileSync(path.join(OUT, 'bureau-icon-theme.json'), JSON.stringify(theme));
  console.log(
    `✔ icons/bureau-icon-theme.json (${Object.keys(defs).length} SVG · ${Object.keys(EXTENSIONS).length} extensiones · ${Object.keys(FILE_NAMES).length} nombres de archivo · ${Object.keys(LANGUAGE_IDS).length} lenguajes · ${Object.keys(FOLDER_NAMES).length} carpetas)`
  );
}

if (require.main === module) main();

module.exports = { EXTENSIONS, FILE_NAMES, LANGUAGE_IDS, FOLDER_NAMES, FOLDER_KINDS, PICTO, EMBLEM };
