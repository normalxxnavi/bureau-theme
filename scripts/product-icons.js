// @ts-check
'use strict';

/**
 * Genera el «Product Icon Theme» Bureau: sustituye iconos internos de VS Code
 * (barra de actividad, barra de estado, paneles, árboles, depuración, barra de
 * título…) por glifos propios.
 *
 *   npm run product-icons
 *
 * VS Code exige que los product icons vengan en una FUENTE (.woff): cada icono
 * es un glifo. Aquí se dibujan como formas rellenas (las fuentes no admiten
 * trazos) y se convierten con svgicons2svgfont → svg2ttf → ttf2woff.
 *
 * Nitidez: VS Code pinta los iconos a 16 px, así que los glifos se dibujan en
 * una rejilla de 16 × 16 con los bordes horizontales y verticales en píxeles
 * enteros (scripts/lib/glyph-kit.js); los de la barra de actividad, que se
 * pintan a 24 px, tienen su propia versión en 24 × 24. La fuente usa 1024
 * unidades por em (64 por píxel), así que esos bordes caen exactos.
 *
 * Estilo: geométrico y brutalista, trazos gruesos de esquina viva; los
 * círculos son octógonos y los puntos, cuadrados. Guiños de lore:
 *   - control de código fuente / rama de Git → la pirámide invertida,
 *   - Copilot, chat e IA (sparkle) → el Consejo (la pirámide que «habla»),
 *   - depurar y tests → el hexágono de la Hedron,
 *   - notificaciones → el teléfono de la Hotline,
 *   - paquetes → el cubo de un Objeto de Poder.
 *
 * Basta con sustituir los codicons base: VS Code resuelve los iconos
 * registrados (`panel-close`, `terminal-kill`, `folding-expanded`…) a partir
 * de su codicon por defecto, así que también cambian.
 *
 * Los iconos de otras extensiones que usan sus propias imágenes (por ejemplo
 * Claude Code) no se pueden sustituir: no son glifos con identificador.
 */

const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { addColorTables } = require('./lib/colr');
const K = require('./lib/glyph-kit');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'product-icons');
const SVG_DIR = path.join(OUT, 'svg');
const FONT_NAME = 'bureau-product-icons';

// --- Geometría -----------------------------------------------------------------
//
// Rejilla de 16 × 16 (VS Code pinta los iconos a 16 px): todos los bordes
// horizontales y verticales caen en píxeles enteros y el trazo estándar es de
// 2 px. Los iconos de la barra de actividad, que se pintan a 24 px, tienen su
// propia versión en una rejilla de 24 × 24 (GRID24).

/** @typedef {import('./lib/glyph-kit').Poly} Poly */
/** @typedef {Array<[string, Poly[]]>} Layers */

const { rect, poly, cut, cutRect, frame, octagon, octRing, stroke, ring, cross, star, move } = K;

/**
 * Colores reales de «Bureau Product Icons (Color)». Tonos medios: tienen que
 * leerse sobre el monolito oscuro y sobre CONTROL Astral (fondo claro).
 */
const REAL = {
  red: '#E0352B', // la Hotline (el teléfono rojo), el Hiss, el rojo del FBC
  orange: '#E07A2B', // Git, la gramola Songmaster, el pico del patito
  amber: '#C98A1E', // avisos, el Laberinto del Cenicero, la cinta de Ahti
  yellow: '#D9B02A', // Polaris, la luz del proyector, el patito de goma
  green: '#4FA05A', // ejecutar, añadir, correcto
  teal: '#2E9C8E',
  cyan: '#2FA7B8', // la Hedron, el Umbral, el Aberrante (Control Resonant)
  blue: '#4A8CD0',
  steel: '#6F93B8', // la interfaz de la Agencia: flechas, ventanas, menús
  violet: '#8C6BC8', // lo paranatural: el Consejo, los Objetos de Poder
  paper: '#C9A15C', // los expedientes de la Agencia
  brass: '#C2953F', // la placa del FBC, cerraduras, la televisión Benicoff
};
const R = REAL;

/** Un glifo de un solo color. @param {string} color @param {Poly[]} polys @returns {Layers} */
const one = (color, polys) => [[color, polys]];

/** Pirámide de la rama de Git, más pequeña y abajo a la izquierda para dejar sitio a una marca. */
const smallPyramid = () => [...ring([[2, 6], [11, 6], [6.5, 13.5]], 2), poly([5.2, 8], [7.8, 8], [6.5, 10])];
/** Polaris pequeña, abajo a la izquierda (deja sitio a una marca arriba a la derecha). */
const smallPolaris = () => [star(6.5, 9.5, 8, 6, 2, 4)];
/** El teléfono de la Hotline. `full` = con el auricular entero (sin marca). */
const hotline = (/** @type {boolean} */ full) => [
  rect(3, 2, full ? 10 : 7, 2),
  poly([1, 2], [5, 2], [5, 7], [3, 7], [1, 5]),
  full ? poly([11, 2], [15, 2], [15, 5], [13, 7], [11, 7]) : rect(8, 2, 2, 5),
  poly([4, 9], [12, 9], [14, 15], [2, 15]),
  cutRect(7, 11, 2, 2),
];

/** Marcas de esquina (arriba a la derecha, x 10–16 · y 0–6) para las variantes de estado. */
const MARK = {
  dot: () => [rect(12, 0, 4, 4)],
  plus: () => [rect(12, 0, 2, 6), rect(10, 2, 6, 2)],
  minus: () => [rect(10, 2, 6, 2)],
  alert: () => [poly([13, 0], [16, 3], [13, 6], [10, 3])],
  error: () => [cross(13, 3, 2.2, 1.6)],
  check: () => stroke([[10.4, 3.2], [12.2, 5], [15, 1.6]], 1.6),
  off: () => [...octRing(10, 0, 6, 6, 2, 1), ...stroke([[11, 5], [15, 1]], 1.4)],
  pause: () => [rect(11, 0, 2, 5), rect(14, 0, 2, 5)],
};

/** Ventana de los iconos de distribución (contorno de 1 px, como los de la barra de título). */
const win = () => frame(1, 2, 14, 12, 1);
/** Bandeja (subir / descargar). */
const tray = () => stroke([[2, 10], [2, 14], [14, 14], [14, 10]], 2);
/** Expediente de detrás (copiar, contraer). */
const backSheet = () => [rect(1, 1, 9, 2), rect(1, 1, 2, 9)];
/** Signo «+» de las insignias (nuevo archivo / carpeta). */
const badgePlus = () => [rect(12, 9, 2, 6), rect(10, 11, 6, 2)];
/** Hexágono de la Hedron (vértice arriba, lados verticales nítidos). */
const hedron = () => ring([[8, 1.5], [14, 5], [14, 11], [8, 14.5], [2, 11], [2, 5]], 2);

/**
 * Glifos: capas [color, polígonos], de abajo arriba. La fuente monocroma usa la
 * unión de todas; la de color, una capa por color (COLR/CPAL).
 * @type {Record<string, () => Layers>}
 */
const DEFS = {
  // ── Lore ──────────────────────────────────────────────────────────────────
  // Expediente del Bureau: documento con la esquina cortada, franja de clasificación y otro expediente detrás.
  dossier: () => [[R.paper, [...backSheet(), ...ring([[6, 6], [11, 6], [14, 9], [14, 14], [6, 14]], 2)]], [R.red, [rect(8, 9, 4, 2)]]],
  // Lupa cuadrada y brutalista.
  lens: () => [[R.steel, frame(1, 1, 10, 10, 2)], [R.brass, stroke([[10, 10], [14.6, 14.6]], 2.6)]],
  // Pirámide invertida con su núcleo: control de código fuente y rama de Git.
  pyramid: () => one(R.orange, [...ring([[2.5, 3], [13.5, 3], [8, 13]], 2), poly([6.4, 6], [9.6, 6], [8, 9])]),
  // Variantes de la rama de Git: pirámide algo menor con una marca en la esquina.
  pyramidDot: () => [[R.orange, smallPyramid()], [R.amber, MARK.dot()]],
  pyramidPlus: () => [[R.orange, smallPyramid()], [R.green, MARK.plus()]],
  pyramidMinus: () => [[R.orange, smallPyramid()], [R.red, MARK.minus()]],
  pyramidAlert: () => [[R.orange, smallPyramid()], [R.red, MARK.alert()]],
  // El Consejo: pirámide maciza con una ranura, y la línea con la que «habla».
  board: () => [[R.red, [rect(4, 1, 8, 2)]], [R.violet, [poly([1, 5], [15, 5], [8, 15]), cutRect(5, 7, 6, 2)]]],
  // Hexágono de la Hedron con «play» (ejecutar y depurar) o con un check (tests).
  hedronPlay: () => one(R.cyan, [...hedron(), poly([6, 5], [11, 8], [6, 11])]),
  hedronCheck: () => [[R.cyan, hedron()], [R.green, stroke([[5, 8], [7, 10], [11, 6]], 2)]],
  // Bloques de hormigón; uno está «alterado» (desplazado y hueco).
  blocks: () => [[R.blue, [rect(1, 9, 6, 6)]], [R.teal, [rect(9, 9, 6, 6)]], [R.steel, [rect(1, 1, 6, 6)]], [R.red, frame(10, 0, 6, 6, 2)]],
  // Credencial del Bureau con el emblema de la pirámide.
  badge: () => [[R.brass, frame(3, 1, 10, 14, 2)], [R.red, [poly([5, 4], [11, 4], [8, 8])]], [R.brass, [rect(5, 10, 6, 2)]]],
  // Tuerca hexagonal (ajustes).
  hexNut: () => [[R.steel, nut(8, 8, 6, 3)], [R.brass, [rect(7, 7, 2, 2)]]],
  // El teléfono de la Hotline (notificaciones).
  hotline: () => one(R.red, hotline(true)),
  hotlineDot: () => [[R.red, hotline(false)], [R.amber, MARK.dot()]],
  // Cubo de un Objeto de Poder (paquetes): tres caras separadas.
  cube: () => one(R.violet, [poly([8, 1], [15, 4.5], [8, 8], [1, 4.5]), poly([1, 6], [7, 9.2], [7, 15], [1, 11.8]), poly([15, 6], [9, 9.2], [9, 15], [15, 11.8])]),
  // Polaris, la luz que guía a Jesse: los asistentes de IA (Copilot, chat).
  polaris: () => one(R.yellow, [star(8, 8, 8, 7.6, 2.6, 5)]),
  // Estados de Copilot y del chat: Polaris con una marca (trabajando, aviso, error, listo, sin conexión, en pausa).
  polarisDot: () => [[R.yellow, smallPolaris()], [R.amber, MARK.dot()]],
  polarisAlert: () => [[R.yellow, smallPolaris()], [R.amber, MARK.alert()]],
  polarisError: () => [[R.yellow, smallPolaris()], [R.red, MARK.error()]],
  polarisCheck: () => [[R.yellow, smallPolaris()], [R.green, MARK.check()]],
  polarisOff: () => [[R.yellow, smallPolaris()], [R.red, MARK.off()]],
  polarisPause: () => [[R.yellow, smallPolaris()], [R.steel, MARK.pause()]],
  // La Hotline en «no molestar» (notificaciones silenciadas).
  hotlineOff: () => [[R.red, hotline(false)], [R.steel, MARK.off()]],
  // El Laberinto del Cenicero (Ashtray Maze): control de código fuente, caminos que se bifurcan.
  maze: () => one(R.amber, stroke([[2, 15], [2, 2], [14, 2], [14, 14], [6, 14], [6, 6], [10, 6], [10, 10]], 2)),
  // El patito de goma que se teletransporta (Objeto Alterado): depurar, «rubber duck debugging».
  duck: () => [
    [R.yellow, [octagon(5, 1, 7, 7, 2), cutRect(8, 3, 2, 2), rect(6, 7, 4, 3), poly([1, 7], [4, 10], [11, 10], [13, 9], [15, 10], [15, 12], [13, 15], [4, 15], [1, 12])]],
    [R.orange, [poly([12, 3], [14, 3], [16, 4.5], [14, 6], [12, 6])]],
  ],
  // Disquete de 8 pulgadas (Objeto de Poder): guardar.
  floppy: () => [
    [R.blue, [poly([1, 1], [12, 1], [15, 4], [15, 15], [1, 15]), cutRect(4, 3, 7, 4), cutRect(4, 9, 8, 6)]],
    [R.steel, [rect(8, 4, 2, 2)]],
    [R.paper, [rect(5, 10, 6, 1), rect(5, 12, 4, 1)]],
  ],
  // La cinta de Ahti (la puerta trasera del Laberinto): la línea de tiempo.
  cassette: () => [
    [R.amber, [rect(1, 3, 14, 11), cutRect(3, 5, 10, 4), cut([5, 11], [11, 11], [12, 14], [4, 14])]],
    [R.steel, [rect(5, 6, 2, 2), rect(9, 6, 2, 2)]],
  ],
  // La televisión Benicoff (Objeto de Poder): la consola de depuración.
  tv: () => [[R.steel, stroke([[4.8, 0.8], [8, 4], [11.2, 0.8]], 1.6)], [R.brass, [rect(1, 4, 14, 11), cutRect(3, 6, 8, 7), cutRect(12, 7, 2, 2), cutRect(12, 10, 2, 2)]]],
  // El proyector de diapositivas (Objeto de Poder): la salida.
  projector: () => [
    [R.steel, [octagon(1, 1, 4, 4, 1), octagon(6, 1, 4, 4, 1), rect(1, 5, 10, 7), cutRect(4, 7, 3, 3), rect(2, 12, 2, 3), rect(8, 12, 2, 3)]],
    [R.yellow, [poly([11, 7], [15, 5], [15, 13], [11, 11])]],
  ],
  // La caja fuerte (Objeto de Poder del Escudo): confianza del espacio de trabajo, archivar.
  safe: () => [[R.steel, [...frame(1, 1, 14, 12, 2), rect(2, 13, 3, 2), rect(11, 13, 3, 2)]], [R.brass, octRing(5, 4, 6, 6, 2, 2)]],
  // El cubo y la fregona de Ahti, el conserje: limpiar todo.
  mop: () => [
    [R.blue, [poly([5, 8], [15, 8], [14, 15], [6, 15]), cutRect(7, 10, 6, 1)]],
    [R.paper, stroke([[1, 1], [8, 8]], 2)],
    [R.steel, stroke([[6, 8], [10, 5], [14, 8]], 1.4)],
  ],
  // La llave del Motel Oceanview con su llavero de rombo: claves y atajos de teclado.
  key: () => [
    [R.red, [poly([5, 0], [10, 5], [5, 10], [0, 5]), cutRect(4, 4, 2, 2)]],
    [R.brass, [...stroke([[8, 8], [14.3, 14.3]], 2), ...stroke([[10.5, 10.5], [13, 8]], 1.8), ...stroke([[12.8, 12.8], [15, 10.6]], 1.8)]],
  ],
  // La Casa Inmemorial: torre brutalista con su remate volado (inicio).
  oldestHouse: () => [
    [R.steel, [poly([1, 1], [15, 1], [15, 5], [12, 5], [12, 13], [4, 13], [4, 5], [1, 5]), cutRect(3, 3, 10, 1), cutRect(5, 7, 2, 5), cutRect(9, 7, 2, 5)]],
    [R.red, [rect(1, 14, 14, 2)]],
  ],
  // El Umbral (Threshold): la puerta entre mundos, conexiones remotas.
  threshold: () => [[R.steel, stroke([[4, 14], [4, 2], [12, 2], [12, 14]], 2)], [R.cyan, [poly([5, 3], [10, 4.5], [10, 14], [5, 12.5])]], [R.steel, [rect(1, 14, 14, 2)]]],
  // El Aberrante, el arma que cambia de forma de Dylan (Control Resonant): herramientas.
  hammer: () => [
    [R.cyan, [poly([1, 2], [10, 2], [12, 4], [12, 6], [10, 8], [1, 8]), cutRect(3, 4, 5, 2), poly([12, 4], [15, 2.5], [15, 7.5], [12, 6])]],
    [R.steel, [rect(6, 8, 3, 8)]],
  ],
  // Resonancia: el sonido de la extensión (icono de la barra de estado).
  resonance: () =>
    one(R.cyan, [
      poly([1, 6], [4, 6], [8, 2], [8, 14], [4, 10], [1, 10]),
      ...stroke([[9.5, 4.5], [11, 6], [11, 10], [9.5, 11.5]], 2),
      ...stroke([[11.5, 1.5], [14, 4], [14, 12], [11.5, 14.5]], 2),
    ]),
  resonanceOff: () => [[R.steel, [poly([1, 6], [4, 6], [8, 2], [8, 14], [4, 10], [1, 10])]], [R.red, [cross(12.5, 8, 2.6, 1.8)]]],
  // La gramola Songmaster (Objeto de Poder): música y packs de sonido.
  jukebox: () =>
    one(R.orange, [poly([2, 5], [5, 1], [11, 1], [14, 5], [14, 15], [2, 15]), cut([4, 6], [6, 3], [10, 3], [12, 6], [12, 8], [4, 8]), cutRect(4, 10, 8, 1), cutRect(4, 12, 8, 1)]),

  // ── Terminal, puertos ─────────────────────────────────────────────────────────
  prompt: () => one(R.green, [...stroke([[2, 3], [7, 8], [2, 13]], 2), rect(9, 12, 6, 2)]),
  plug: () => one(R.teal, [rect(3, 5, 10, 6), rect(5, 1, 2, 4), rect(9, 1, 2, 4), rect(7, 11, 2, 4)]),

  // ── Navegación ──────────────────────────────────────────────────────────────
  chevronRight: () => one(R.steel, stroke([[6, 3], [11, 8], [6, 13]], 2)),
  chevronLeft: () => one(R.steel, stroke([[10, 3], [5, 8], [10, 13]], 2)),
  chevronDown: () => one(R.steel, stroke([[3, 6], [8, 11], [13, 6]], 2)),
  chevronUp: () => one(R.steel, stroke([[3, 10], [8, 5], [13, 10]], 2)),
  arrowLeft: () => one(R.steel, [rect(4, 7, 10, 2), ...stroke([[8, 3], [3, 8], [8, 13]], 2)]),
  arrowRight: () => one(R.steel, [rect(2, 7, 10, 2), ...stroke([[8, 3], [13, 8], [8, 13]], 2)]),
  arrowUp: () => one(R.steel, [rect(7, 4, 2, 10), ...stroke([[3, 8], [8, 3], [13, 8]], 2)]),
  arrowDown: () => one(R.steel, [rect(7, 2, 2, 10), ...stroke([[3, 8], [8, 13], [13, 8]], 2)]),
  triangleRight: () => one(R.steel, [poly([5, 3], [11, 8], [5, 13])]),
  triangleDown: () => one(R.steel, [poly([3, 5], [13, 5], [8, 11])]),

  // ── Acciones ────────────────────────────────────────────────────────────────
  close: () => one(R.red, [cross(8, 8, 5, 2)]),
  add: () => one(R.green, [rect(7, 2, 2, 12), rect(2, 7, 12, 2)]),
  remove: () => one(R.red, [rect(2, 7, 12, 2)]),
  check: () => one(R.green, stroke([[2, 8], [6, 12], [14, 4]], 2)),
  checkAll: () => one(R.green, [...stroke([[1, 8], [4.5, 11.5], [10, 6]], 2), ...stroke([[8, 11.5], [14.5, 5]], 2)]),
  ellipsis: () => one(R.steel, [rect(2, 7, 2, 2), rect(7, 7, 2, 2), rect(12, 7, 2, 2)]),
  kebab: () => one(R.steel, [rect(7, 2, 2, 2), rect(7, 7, 2, 2), rect(7, 12, 2, 2)]),
  menu: () => one(R.steel, [rect(2, 3, 12, 2), rect(2, 7, 12, 2), rect(2, 11, 12, 2)]),
  trash: () => one(R.red, [rect(2, 3, 12, 2), rect(6, 1, 4, 2), poly([3, 6], [13, 6], [12, 15], [4, 15]), cut([5, 8], [11, 8], [10.6, 13], [5.4, 13]), rect(7, 9, 2, 3)]),
  edit: () => [
    [R.amber, stroke([[4.2, 11.8], [11, 5]], 3)],
    [R.steel, [poly([1.2, 14.8], [2.1, 10.8], [5.2, 13.9])]],
    [R.red, stroke([[12, 4], [14.5, 1.5]], 3)],
  ],
  filter: () => one(R.teal, [poly([1, 2], [15, 2], [10, 8], [10, 14], [6, 12], [6, 8])]),
  collapseAll: () => [[R.steel, [...backSheet(), ...frame(5, 5, 10, 10, 2)]], [R.blue, [rect(7, 9, 6, 2)]]],
  expandAll: () => [[R.steel, [...backSheet(), ...frame(5, 5, 10, 10, 2)]], [R.blue, [rect(7, 9, 6, 2), rect(9, 7, 2, 6)]]],
  newFile: () => [[R.paper, stroke([[9, 14], [3, 14], [3, 2], [8, 2], [11, 5], [11, 8]], 2)], [R.green, badgePlus()]],
  newFolder: () => [[R.amber, stroke([[9, 13], [2, 13], [2, 3], [6, 3], [8, 5], [14, 5], [14, 8]], 2)], [R.green, badgePlus()]],
  file: () => one(R.paper, ring([[3, 2], [9, 2], [13, 6], [13, 14], [3, 14]], 2)),
  folder: () => one(R.amber, ring([[2, 3], [6, 3], [8, 5], [14, 5], [14, 13], [2, 13]], 2)),
  folderOpened: () => one(R.amber, [...stroke([[2, 11], [2, 3], [6, 3], [8, 5], [12, 5], [12, 7]], 2), ...ring([[4, 8], [14, 8], [12, 14], [2, 14]], 2)]),
  copy: () => one(R.blue, [...backSheet(), ...frame(5, 5, 10, 10, 2)]),
  pin: () => one(R.red, [rect(5, 1, 6, 6), rect(3, 7, 10, 2), rect(7, 9, 2, 6)]),
  lock: () => one(R.brass, [...stroke([[5, 7], [5, 3], [11, 3], [11, 7]], 2), rect(3, 7, 10, 8), cutRect(7, 10, 2, 3)]),
  unlock: () => one(R.brass, [...stroke([[5, 7], [5, 3], [11, 3], [11, 5]], 2), rect(3, 7, 10, 8), cutRect(7, 10, 2, 3)]),
  eye: () => [[R.blue, ring([[1.8, 8], [5, 4], [11, 4], [14.2, 8], [11, 12], [5, 12]], 2)], [R.cyan, [rect(6, 6, 4, 4)]]],
  eyeClosed: () => one(R.steel, [...stroke([[1, 6], [5, 10], [11, 10], [15, 6]], 2), ...stroke([[4, 11], [2.5, 13.8]], 1.6), rect(7, 11, 2, 3), ...stroke([[12, 11], [13.5, 13.8]], 1.6)]),
  lightbulb: () => [[R.yellow, ring([[5, 2], [11, 2], [13, 4], [13, 7], [10, 10], [6, 10], [3, 7], [3, 4]], 2)], [R.steel, [rect(5, 12, 6, 2), rect(6, 15, 4, 1)]]],
  zap: () => one(R.yellow, [poly([9, 1], [3, 9], [7, 9], [6, 15], [13, 6], [9, 6])]),
  comment: () => one(R.blue, [...frame(1, 1, 14, 11, 2), poly([4, 12], [7, 12], [4, 15])]),
  history: () => [[R.steel, octRing(1, 1, 14, 14, 4, 2)], [R.red, [rect(7, 4, 2, 5), rect(7, 7, 5, 2)]]],
  starFull: () => one(R.yellow, [star(8, 8.6, 5, 7.6, 3.1)]),
  starEmpty: () => one(R.yellow, [star(8, 8.6, 5, 7.6, 3.1), K.hole(star(8, 8.6, 5, 3.8, 1.55))]),
  circleFilled: () => one(R.amber, [octagon(4, 4, 8, 8, 2)]),
  loading: () => one(R.cyan, stroke([[3, 8], [3, 5], [5, 3], [11, 3], [13, 5], [13, 11], [11, 13], [8, 13]], 2)),

  // ── Estado y diagnósticos ─────────────────────────────────────────────────────
  error: () => one(R.red, [...octRing(1, 1, 14, 14, 4, 2), cross(8, 8, 2.8, 2)]),
  warning: () => one(R.amber, [poly([8, 1], [15, 15], [1, 15]), cutRect(7, 6, 2, 5), cutRect(7, 12, 2, 2)]),
  info: () => one(R.blue, [...frame(1, 1, 14, 14, 2), rect(7, 4, 2, 2), rect(7, 7, 2, 5)]),

  // ── Control de código fuente ───────────────────────────────────────────────────
  gitCommit: () => one(R.orange, [rect(1, 7, 4, 2), rect(11, 7, 4, 2), ...frame(5, 5, 6, 6, 2)]),
  gitPullRequest: () => one(R.green, [rect(2, 1, 4, 4), rect(3, 5, 2, 6), rect(2, 11, 4, 4), rect(10, 11, 4, 4), ...stroke([[12, 11], [12, 4], [8, 4]], 2), poly([8, 1], [5, 4], [8, 7])]),
  sync: () =>
    one(R.teal, [
      ...stroke([[3, 11], [3, 6], [6, 3], [9, 3]], 2),
      poly([9, 0], [12, 3], [9, 6]),
      ...stroke([[13, 5], [13, 10], [10, 13], [7, 13]], 2),
      poly([7, 10], [4, 13], [7, 16]),
    ]),
  refresh: () => one(R.teal, [...stroke([[3, 7], [3, 11], [5, 13], [11, 13], [13, 11], [13, 5], [11, 3], [8, 3]], 2), poly([8, 0], [5, 3], [8, 6])]),
  cloudUpload: () => one(R.blue, [...tray(), rect(7, 3, 2, 9), ...stroke([[4, 6], [8, 2], [12, 6]], 2)]),
  cloudDownload: () => one(R.blue, [...tray(), rect(7, 1, 2, 9), ...stroke([[4, 6], [8, 10], [12, 6]], 2)]),
  discard: () => one(R.amber, [...stroke([[13, 13], [13, 6], [6, 6]], 2), poly([6, 2], [2, 6], [6, 10])]),
  listFlat: () => one(R.steel, [rect(1, 3, 2, 2), rect(4, 3, 11, 2), rect(1, 7, 2, 2), rect(4, 7, 11, 2), rect(1, 11, 2, 2), rect(4, 11, 11, 2)]),
  listTree: () => one(R.steel, [rect(2, 2, 12, 2), rect(2, 4, 2, 10), rect(4, 7, 10, 2), rect(4, 12, 10, 2)]),

  // ── Depuración y ejecución ────────────────────────────────────────────────────
  play: () => one(R.green, [poly([4, 2], [14, 8], [4, 14])]),
  debugContinue: () => one(R.green, [rect(2, 3, 2, 10), poly([6, 3], [14, 8], [6, 13])]),
  debugPause: () => one(R.amber, [rect(3, 2, 4, 12), rect(9, 2, 4, 12)]),
  debugStop: () => one(R.red, [rect(3, 3, 10, 10)]),
  debugDisconnect: () => one(R.red, frame(3, 3, 10, 10, 2)),
  debugStepOver: () => [[R.blue, [...stroke([[3, 9], [3, 4], [13, 4], [13, 7]], 2), poly([10, 7], [16, 7], [13, 10])]], [R.amber, [rect(6, 12, 4, 4)]]],
  debugStepInto: () => [[R.blue, [rect(7, 1, 2, 5), poly([4, 6], [12, 6], [8, 10])]], [R.amber, [rect(6, 12, 4, 4)]]],
  debugStepOut: () => [[R.blue, [rect(7, 5, 2, 5), poly([4, 5], [12, 5], [8, 1])]], [R.amber, [rect(6, 12, 4, 4)]]],

  // ── Ventana y distribución (contornos de 1 px, como la barra de título) ─────────
  screenFull: () => one(R.steel, [rect(1, 1, 5, 2), rect(1, 1, 2, 5), rect(10, 1, 5, 2), rect(13, 1, 2, 5), rect(1, 13, 5, 2), rect(1, 10, 2, 5), rect(10, 13, 5, 2), rect(13, 10, 2, 5)]),
  screenNormal: () => one(R.steel, [rect(1, 4, 5, 2), rect(4, 1, 2, 5), rect(10, 4, 5, 2), rect(10, 1, 2, 5), rect(1, 10, 5, 2), rect(4, 10, 2, 5), rect(10, 10, 5, 2), rect(10, 10, 2, 5)]),
  chromeMinimize: () => one(R.steel, [rect(3, 8, 10, 1)]),
  chromeMaximize: () => one(R.steel, frame(3, 3, 10, 10, 1)),
  chromeRestore: () => one(R.steel, [...frame(3, 5, 8, 8, 1), rect(5, 3, 8, 1), rect(12, 3, 1, 8)]),
  chromeClose: () => one(R.red, [cross(8, 8, 5, 1.2)]),
  layoutSidebarLeft: () => [[R.steel, win()], [R.blue, [rect(2, 3, 4, 10)]]],
  layoutSidebarLeftOff: () => [[R.steel, win()], [R.blue, [rect(5, 3, 1, 10)]]],
  layoutSidebarRight: () => [[R.steel, win()], [R.blue, [rect(10, 3, 4, 10)]]],
  layoutSidebarRightOff: () => [[R.steel, win()], [R.blue, [rect(10, 3, 1, 10)]]],
  layoutPanel: () => [[R.steel, win()], [R.blue, [rect(2, 9, 12, 4)]]],
  layoutPanelOff: () => [[R.steel, win()], [R.blue, [rect(2, 9, 12, 1)]]],
  layout: () => [[R.steel, win()], [R.blue, [rect(5, 3, 1, 10), rect(6, 9, 8, 1)]]],
  splitHorizontal: () => [[R.steel, win()], [R.blue, [rect(7, 3, 2, 10)]]],
  splitVertical: () => [[R.steel, win()], [R.blue, [rect(2, 7, 12, 2)]]],

  // ── Barra de actividad: versiones dibujadas en 24 × 24 (se pintan a 24 px) ──────
  dossierBar: () => [[R.paper, [rect(2, 2, 12, 2), rect(2, 2, 2, 16), ...ring([[8, 8], [16, 8], [21, 13], [21, 22], [8, 22]], 2)]], [R.red, [rect(11, 15, 7, 2)]]],
  lensBar: () => [[R.steel, frame(2, 2, 14, 14, 2)], [R.brass, stroke([[15, 15], [21.6, 21.6]], 3.2)]],
  mazeBar: () => one(R.amber, stroke([[3, 22], [3, 3], [21, 3], [21, 21], [8, 21], [8, 8], [16, 8], [16, 16], [12, 16], [12, 12]], 2)),
  duckBar: () => [
    [R.yellow, [octagon(8, 2, 10, 10, 3), cutRect(13, 5, 2, 2), rect(9, 11, 7, 4), poly([2, 10], [6, 15], [16, 15], [19, 13], [22, 14], [22, 18], [18, 22], [6, 22], [2, 18])]],
    [R.orange, [poly([18, 5], [20, 5], [23, 7.5], [20, 10], [18, 10])]],
  ],
  blocksBar: () => [[R.blue, [rect(2, 13, 9, 9)]], [R.teal, [rect(13, 13, 9, 9)]], [R.steel, [rect(2, 2, 9, 9)]], [R.red, frame(14, 1, 9, 9, 2)]],
  hedronCheckBar: () => [[R.cyan, ring([[12, 2], [21, 7], [21, 17], [12, 22], [3, 17], [3, 7]], 2)], [R.green, stroke([[7.5, 12], [10.5, 15], [16.5, 9]], 2.4)]],
  badgeBar: () => [[R.brass, frame(4, 2, 16, 20, 2)], [R.red, [poly([8, 6], [16, 6], [12, 11.5])]], [R.brass, [rect(8, 14, 8, 2), rect(8, 18, 5, 2)]]],
  hexNutBar: () => [[R.steel, nut(12, 12, 9, 3)], [R.brass, [nut(12, 12, 2)[0]]]],
  thresholdBar: () => [[R.steel, stroke([[6, 21], [6, 3], [18, 3], [18, 21]], 2)], [R.cyan, [poly([7, 4], [15, 6.5], [15, 21], [7, 18.5])]], [R.steel, [rect(2, 21, 20, 2)]]],
};

/** Tamaño de rejilla de cada glifo (16 salvo los de la barra de actividad). */
const GRID24 = new Set(['dossierBar', 'lensBar', 'mazeBar', 'duckBar', 'blocksBar', 'hedronCheckBar', 'badgeBar', 'hexNutBar', 'thresholdBar']);

/**
 * Tuerca hexagonal (lados planos arriba y abajo, en filas enteras): `half` es la
 * distancia del centro a los lados planos y `t` el grosor (sin `t`, maciza).
 * @param {number} cx @param {number} cy @param {number} half @param {number} [t]
 * @returns {Poly[]}
 */
function nut(cx, cy, half, t) {
  const hex = (/** @type {number} */ h) => K.regular(cx, cy, h / Math.sin(Math.PI / 3), 6, 0);
  return t ? [hex(half), K.hole(hex(half - t))] : [hex(half)];
}

/** Glifos (unión de capas) para la fuente monocroma. @type {Record<string, () => Poly[]>} */
const GLYPHS = Object.fromEntries(Object.entries(DEFS).map(([name, def]) => [name, () => def().flatMap(([, polys]) => polys)]));
/** Capas de color de TODOS los glifos (el test comprueba que no falta ninguno). @type {Record<string, () => Layers>} */
const COLOR = DEFS;

/** Iconos de VS Code → glifo. Las claves son codicons o identificadores de iconos registrados. */
const MAPPING = {
  // Barra de actividad
  'explorer-view-icon': 'dossierBar', files: 'dossier', book: 'dossier',
  'search-view-icon': 'lensBar', search: 'lens', 'search-large': 'lens',
  'source-control-view-icon': 'mazeBar', 'source-control': 'maze', repo: 'maze', 'git-merge': 'maze', 'git-branch': 'pyramid',
  'git-branch-compact': 'pyramid', 'git-branch-changes': 'pyramidDot', 'git-branch-staged-changes': 'pyramidPlus',
  'git-branch-conflicts': 'pyramidAlert', 'git-branch-create': 'pyramidPlus', 'git-branch-delete': 'pyramidMinus',
  'run-view-icon': 'duckBar', 'debug-alt': 'duck', 'debug-alt-small': 'duck', debug: 'duck', bug: 'duck',
  'extensions-view-icon': 'blocksBar', extensions: 'blocks',
  'test-view-icon': 'hedronCheckBar', beaker: 'hedronCheck', pass: 'hedronCheck', 'pass-filled': 'hedronCheck',
  'accounts-view-bar-icon': 'badgeBar', account: 'badge', person: 'badge',
  'settings-view-bar-icon': 'hexNutBar', 'settings-gear': 'hexNut', manage: 'hexNut', gear: 'hexNut', settings: 'hexNut',
  'chat-view-icon': 'polaris', 'chat-sparkle': 'polaris', copilot: 'polaris', 'copilot-logo': 'polaris', sparkle: 'polaris', 'sparkle-filled': 'polaris',
  law: 'board',
  bell: 'hotline', 'bell-dot': 'hotlineDot',
  package: 'cube', home: 'oldestHouse', save: 'floppy', 'save-all': 'floppy', 'save-as': 'floppy',
  shield: 'safe', 'workspace-trusted': 'safe', 'workspace-untrusted': 'safe', 'workspace-unknown': 'safe', archive: 'safe',
  key: 'key', keyboard: 'key', 'record-keys': 'key', music: 'jukebox', unmute: 'resonance', mute: 'resonanceOff',
  'remote-explorer-view-icon': 'thresholdBar', 'remote-explorer': 'threshold', remote: 'threshold',
  // Terminal, salida, consola, puertos, tareas
  'terminal-view-icon': 'prompt', terminal: 'prompt', 'terminal-powershell': 'prompt', 'terminal-cmd': 'prompt', 'terminal-bash': 'prompt',
  'terminal-linux': 'prompt', 'terminal-ubuntu': 'prompt', 'terminal-debian': 'prompt', 'terminal-git-bash': 'prompt', 'terminal-tmux': 'prompt',
  'output-view-icon': 'projector', output: 'projector',
  'debug-console-view-icon': 'tv', 'debug-console': 'tv',
  'ports-view-icon': 'plug', plug: 'plug',
  tools: 'hammer',
  // Navegación y árboles
  'chevron-right': 'chevronRight', 'chevron-left': 'chevronLeft', 'chevron-down': 'chevronDown', 'chevron-up': 'chevronUp',
  'tree-item-expanded': 'chevronDown',
  'arrow-left': 'arrowLeft', 'arrow-right': 'arrowRight', 'arrow-up': 'arrowUp', 'arrow-down': 'arrowDown',
  'triangle-right': 'triangleRight', 'triangle-down': 'triangleDown',
  // Acciones
  close: 'close', 'close-all': 'close', x: 'close', add: 'add', plus: 'add', remove: 'remove', dash: 'remove',
  check: 'check', 'check-all': 'checkAll',
  ellipsis: 'ellipsis', more: 'ellipsis', 'toolbar-more': 'ellipsis', 'kebab-horizontal': 'ellipsis', 'kebab-vertical': 'kebab', menu: 'menu',
  trash: 'trash', edit: 'edit', pencil: 'edit', filter: 'filter', 'filter-filled': 'filter', 'clear-all': 'mop',
  'collapse-all': 'collapseAll', 'expand-all': 'expandAll', 'new-file': 'newFile', 'new-folder': 'newFolder',
  file: 'file', 'go-to-file': 'file', folder: 'folder', 'folder-opened': 'folderOpened', 'folder-active': 'folderOpened',
  copy: 'copy', pin: 'pin', pinned: 'pin', lock: 'lock', unlock: 'unlock', 'lock-small': 'lock',
  eye: 'eye', 'eye-closed': 'eyeClosed', lightbulb: 'lightbulb', 'lightbulb-autofix': 'lightbulb', 'lightbulb-sparkle': 'lightbulb',
  zap: 'zap', comment: 'comment', 'comment-discussion': 'comment', feedback: 'comment', history: 'cassette', 'timeline-view-icon': 'cassette', watch: 'history',
  star: 'starEmpty', 'star-empty': 'starEmpty', 'star-full': 'starFull', 'circle-filled': 'circleFilled', loading: 'loading',
  // Estado y diagnósticos
  error: 'error', warning: 'warning', info: 'info',
  // Control de código fuente
  'git-commit': 'gitCommit', 'git-pull-request': 'gitPullRequest', sync: 'sync', refresh: 'refresh',
  'cloud-upload': 'cloudUpload', 'cloud-download': 'cloudDownload', discard: 'discard', 'list-flat': 'listFlat', 'list-tree': 'listTree',
  // Depuración y ejecución
  play: 'play', run: 'play', 'run-all': 'play', 'debug-start': 'hedronPlay', 'debug-continue': 'debugContinue', 'debug-pause': 'debugPause',
  'debug-stop': 'debugStop', 'debug-disconnect': 'debugDisconnect', 'debug-restart': 'refresh', 'debug-step-over': 'debugStepOver',
  'debug-step-into': 'debugStepInto', 'debug-step-out': 'debugStepOut',
  // Ventana y distribución
  'screen-full': 'screenFull', 'screen-normal': 'screenNormal', 'chrome-minimize': 'chromeMinimize', 'chrome-maximize': 'chromeMaximize',
  'chrome-restore': 'chromeRestore', 'chrome-close': 'chromeClose', 'layout-sidebar-left': 'layoutSidebarLeft', 'layout-sidebar-left-off': 'layoutSidebarLeftOff',
  'layout-sidebar-right': 'layoutSidebarRight', 'layout-sidebar-right-off': 'layoutSidebarRightOff', 'layout-panel': 'layoutPanel', 'layout-panel-off': 'layoutPanelOff',
  layout: 'layout', 'split-horizontal': 'splitHorizontal', 'split-vertical': 'splitVertical',
  // Estados de Copilot, del chat y de los agentes (barra de estado y vista de chat).
  'copilot-large': 'polaris', 'copilot-compact': 'polaris', agent: 'polaris', 'agent-compact': 'polaris',
  'copilot-dot': 'polarisDot', 'copilot-dot-compact': 'polarisDot', 'copilot-in-progress': 'polarisDot',
  'copilot-warning': 'polarisAlert', 'copilot-warning-large': 'polarisAlert', 'chat-sparkle-warning': 'polarisAlert',
  'copilot-error': 'polarisError', 'chat-sparkle-error': 'polarisError', 'copilot-success': 'polarisCheck',
  'copilot-not-connected': 'polarisOff', 'copilot-unavailable': 'polarisOff', 'copilot-blocked': 'polarisOff', 'copilot-snooze': 'polarisPause',
  // Notificaciones en «no molestar».
  'bell-slash': 'hotlineOff', 'bell-slash-dot': 'hotlineOff',
};

/**
 * Variantes de tamaño o de matiz de VS Code que deben verse igual que su icono
 * base (si no, se quedaban con el dibujo original en medio del tema). Lista
 * sacada de los codicons registrados en VS Code 1.141.
 */
const ALIASES = {
  'add-compact': 'add', 'add-small': 'add', 'arrow-small-down': 'arrow-down', 'arrow-small-left': 'arrow-left', 'arrow-small-right': 'arrow-right',
  'arrow-small-up': 'arrow-up', 'arrow-up-compact': 'arrow-up', 'arrow-circle-down': 'arrow-down', 'arrow-circle-left': 'arrow-left',
  'arrow-circle-right': 'arrow-right', 'arrow-circle-up': 'arrow-up', 'arrow-circle-up-sparkle': 'arrow-up', 'beaker-compact': 'beaker', 'book-compact': 'book',
  'check-compact': 'check', 'chevron-down-compact': 'chevron-down', 'chevron-left-compact': 'chevron-left', 'chevron-right-compact': 'chevron-right',
  'chevron-up-compact': 'chevron-up', 'circle-filled-compact': 'circle-filled', 'circle-small-filled': 'circle-filled', 'circle-small-filled-compact': 'circle-filled',
  'circle-large-filled': 'circle-filled', 'close-compact': 'close', 'close-small': 'close', 'close-dirty': 'circle-filled', 'remove-close': 'close', 'remove-small': 'remove',
  'cloud-download-compact': 'cloud-download', 'cloud-upload-compact': 'cloud-upload', 'collapse-all-compact': 'collapse-all',
  'comment-add': 'comment', 'comment-compact': 'comment', 'comment-discussion-quote': 'comment', 'comment-discussion-sparkle': 'comment', 'comment-draft': 'comment',
  'comment-unresolved': 'comment', 'comment-unresolved-compact': 'comment', 'debug-continue-small': 'debug-continue', 'debug-disconnect-compact': 'debug-disconnect',
  'debug-rerun': 'refresh', 'debug-restart-frame': 'refresh', 'edit-code': 'edit', 'edit-compact': 'edit', 'edit-session': 'edit', 'edit-sparkle': 'edit',
  'error-compact': 'error', 'error-small': 'error', 'warning-compact': 'warning', 'extensions-large': 'extensions', 'eye-watch': 'eye', 'eye-unwatch': 'eye-closed',
  'file-add': 'new-file', 'file-code': 'file', 'file-text': 'file', 'file-binary': 'file', 'file-media': 'file', 'file-media-compact': 'file', 'file-pdf': 'file',
  'file-zip': 'file', 'file-submodule': 'file', 'file-symlink-file': 'file', 'file-directory': 'folder', 'file-directory-create': 'new-folder',
  'file-symlink-directory': 'folder', 'folder-compact': 'folder', 'folder-library': 'folder', 'folder-opened-compact': 'folder-opened', 'gear-compact': 'gear',
  'settings-compact': 'settings-gear', 'git-compare': 'source-control', 'git-fork-private': 'source-control', 'git-fetch': 'cloud-download',
  'git-stash': 'archive', 'git-stash-apply': 'archive', 'git-stash-pop': 'archive', 'git-pull-request-create': 'git-pull-request',
  'git-pull-request-draft': 'git-pull-request', 'git-pull-request-done': 'git-pull-request', 'git-pull-request-closed': 'git-pull-request',
  'git-pull-request-new-changes': 'git-pull-request', 'git-pull-request-go-to-changes': 'git-pull-request', 'go-to-search': 'search',
  'layout-activitybar-left': 'layout-sidebar-left', 'layout-activitybar-right': 'layout-sidebar-right', 'layout-sidebar-left-dock': 'layout-sidebar-left',
  'layout-sidebar-right-dock': 'layout-sidebar-right', 'layout-panel-center': 'layout-panel', 'layout-panel-justify': 'layout-panel', 'layout-panel-left': 'layout-panel',
  'layout-panel-right': 'layout-panel', 'layout-panel-dock': 'layout-panel', 'layout-statusbar': 'layout-panel', 'layout-menubar': 'layout', 'layout-centered': 'layout',
  'lightbulb-compact': 'lightbulb', 'lightbulb-empty': 'lightbulb', 'lightbulb-sparkle-autofix': 'lightbulb', 'list-filter': 'filter', 'list-ordered': 'list-flat',
  'list-unordered': 'list-flat', 'list-selection': 'list-flat', 'loading-compact': 'loading', 'pass-compact': 'pass', 'pass-filled-compact': 'pass',
  'person-add': 'person', 'person-filled': 'person', 'person-outline': 'person', 'person-follow': 'person', 'pinned-dirty': 'pin', 'play-circle': 'play',
  'record-keys-compact': 'record-keys', 'refresh-compact': 'refresh', 'remote-compact': 'remote', 'repo-compact': 'repo', 'repo-clone': 'repo', 'repo-forked': 'repo',
  'repo-forked-compact': 'repo', 'repo-selected': 'repo', 'repo-pinned': 'repo', 'repo-push': 'cloud-upload', 'repo-force-push': 'cloud-upload',
  'repo-pull': 'cloud-download', 'repo-fetch': 'cloud-download', 'repo-sync': 'sync', 'repo-delete': 'trash', 'run-compact': 'play', 'run-above': 'play',
  'run-below': 'play', 'run-coverage': 'play', 'run-all-coverage': 'play', 'run-errors': 'play', 'run-with-deps': 'play', 'search-compact': 'search',
  'search-fuzzy': 'search', 'search-save': 'search', 'search-sparkle': 'search', 'shield-compact': 'shield', 'sparkle-compact': 'sparkle',
  'star-add': 'star-empty', 'star-delete': 'star-empty', 'star-half': 'star-full', 'sync-compact': 'sync', 'sync-ignored': 'sync', 'terminal-compact': 'terminal',
  'terminal-secure': 'terminal', 'workspace-unspecified': 'workspace-unknown',
};
for (const [alias, base] of Object.entries(ALIASES)) {
  if (!(base in MAPPING)) throw new Error(`ALIASES: ${alias} → ${base} no está en MAPPING`);
  /** @type {Record<string, string>} */ (MAPPING)[alias] = /** @type {Record<string, string>} */ (MAPPING)[base];
}

/**
 * Iconos propios que la extensión registra (`contributes.icons`) para la barra
 * de estado y la consola de sonido. Salen de la fuente monocroma, así que
 * funcionan con cualquier tema de iconos de producto.
 */
const CONTRIBUTED = {
  'bureau-resonance': ['resonance', 'CONTROL: sounds on (Resonance)'],
  'bureau-resonance-off': ['resonanceOff', 'CONTROL: sounds off'],
  'bureau-jukebox': ['jukebox', 'CONTROL: sound pack (Songmaster Jukebox)'],
  'bureau-cassette': ['cassette', "CONTROL: preview sounds (Ahti's tape)"],
  'bureau-hotline': ['hotline', 'CONTROL: sound events (the Hotline)'],
  'bureau-dossier': ['dossier', 'CONTROL: custom sounds folder'],
  'bureau-hexnut': ['hexNut', 'CONTROL: sound settings'],
  'bureau-safe': ['safe', 'CONTROL: only with CONTROL themes'],
  'bureau-polaris': ['polaris', 'CONTROL: Polaris'],
};

// --- Generación ----------------------------------------------------------------

/** @param {Poly[]} polys @param {number} [size] lado de la rejilla (16, o 24 en la barra de actividad) */
const toSvg = (polys, size = 16) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${K.toPath(polys)}"/></svg>\n`;
const gridOf = (/** @type {string} */ name) => (GRID24.has(name) ? 24 : 16);

/** Fuente TrueType con los glifos dados. */
async function buildTtf(/** @type {Array<{name: string, svg: string, code: number}>} */ glyphs) {
  const { SVGIcons2SVGFontStream } = await import('svgicons2svgfont');
  const svg2ttf = require('svg2ttf');

  const svgFont = await new Promise((resolve, reject) => {
    let out = '';
    const stream = new SVGIcons2SVGFontStream({ fontName: FONT_NAME, fontHeight: 1024, normalize: true });
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
  // Fecha fija (no la de hoy): así la fuente sale idéntica en cada compilación y la CI puede comprobar que está al día.
  return Buffer.from(svg2ttf(svgFont, { description: 'Bureau product icons (original, MIT)', url: 'https://github.com/Normalxxnavi/bureau-theme', ts: 1767225600 }).buffer);
}

const toWoff = (/** @type {Buffer} */ ttf) => Buffer.from(require('ttf2woff')(ttf).buffer);

/**
 * Escribe la fuente y el JSON de un product icon theme.
 * @param {string} fontId nombre de la fuente (y del .woff)
 * @param {string} json nombre del archivo del tema
 * @param {Buffer} woff
 * @param {Record<string, number>} codeOf glifo → punto de código
 */
function writeTheme(fontId, json, woff, codeOf) {
  fs.writeFileSync(path.join(OUT, `${fontId}.woff`), woff);
  const theme = {
    fonts: [{ id: fontId, src: [{ path: `./${fontId}.woff`, format: 'woff' }], weight: 'normal', style: 'normal' }],
    // También los iconos propios de la extensión (barra de estado, consola de
    // sonido): así en la versión a color salen con sus colores.
    iconDefinitions: Object.fromEntries(
      [...Object.entries(MAPPING), ...Object.entries(CONTRIBUTED).map(([id, [glyph]]) => [id, glyph])].map(([icon, glyph]) => [
        icon,
        { fontCharacter: `\\${codeOf[glyph].toString(16).toUpperCase()}` },
      ])
    ),
  };
  fs.writeFileSync(path.join(OUT, json), JSON.stringify(theme)); // compacto: se lee al arrancar
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(SVG_DIR, { recursive: true });

  const names = Object.keys(GLYPHS);
  const glyphs = names.map((name, i) => {
    const svg = toSvg(GLYPHS[name](), gridOf(name));
    fs.writeFileSync(path.join(SVG_DIR, `${name}.svg`), svg);
    return { name, svg, code: 0xe001 + i };
  });

  for (const [id, glyph] of Object.entries(MAPPING)) if (!(glyph in GLYPHS)) throw new Error(`${id} → glifo inexistente: ${glyph}`);
  // svgicons2svgfont funde los glifos idénticos: dos iguales dejarían un punto de código sin glifo propio.
  const seen = new Map();
  for (const g of glyphs) {
    const d = g.svg.replace(/^<svg[^>]*>/, '');
    if (seen.has(d)) throw new Error(`Glifos idénticos: ${seen.get(d)} y ${g.name}`);
    seen.set(d, g.name);
  }

  const codeOf = Object.fromEntries(glyphs.map((g) => [g.name, g.code]));
  const mono = toWoff(await buildTtf(glyphs));
  writeTheme(FONT_NAME, 'bureau-product-icon-theme.json', mono, codeOf);

  // Versión a color: los mismos glifos (respaldo monocromo) más un glifo por
  // capa, unidos con las tablas COLR/CPAL.
  /** @type {Array<{name: string, svg: string, code: number}>} */
  const layerGlyphs = [];
  /** @type {import('./lib/colr').ColorGlyph[]} */
  const colorGlyphs = [];
  for (const name of names) if (!(name in COLOR)) throw new Error(`COLOR: falta el color de ${name}`);
  for (const [name, layersOf] of Object.entries(COLOR)) {
    if (!(name in GLYPHS)) throw new Error(`COLOR: glifo inexistente ${name}`);
    // Capas seguidas del mismo color van en un solo glifo.
    /** @type {Layers} */
    const merged = [];
    for (const [color, polys] of layersOf()) {
      const last = merged[merged.length - 1];
      if (last && last[0] === color) last[1].push(...polys);
      else merged.push([color, [...polys]]);
    }
    const layers = merged.map(([color, polys], i) => {
      if (polys.length === 0) throw new Error(`COLOR: capa vacía en ${name}`);
      if (!color) throw new Error(`COLOR: capa sin color en ${name}`);
      const code = 0xe800 + layerGlyphs.length;
      layerGlyphs.push({ name: `${name}-${i}`, svg: toSvg(polys, gridOf(name)), code });
      return { code, color };
    });
    colorGlyphs.push({ code: codeOf[name], layers });
  }
  const color = toWoff(addColorTables(await buildTtf([...glyphs, ...layerGlyphs]), colorGlyphs));
  writeTheme(`${FONT_NAME}-color`, 'bureau-product-icon-theme-color.json', color, codeOf);

  // Iconos propios de la extensión (barra de estado, consola de sonido): sus
  // puntos de código cambian si cambian los glifos, así que se escriben aquí.
  const pkgFile = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  pkg.contributes.icons = Object.fromEntries(
    Object.entries(CONTRIBUTED).map(([id, [glyph, description]]) => [
      id,
      { description, default: { fontPath: `./product-icons/${FONT_NAME}.woff`, fontCharacter: `\\${codeOf[glyph].toString(16).toUpperCase()}` } },
    ])
  );
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

  console.log(
    `✔ product-icons/ (${names.length} glifos, ${Object.keys(MAPPING).length} iconos de VS Code sustituidos, ${(mono.length / 1024).toFixed(1)} KB; ` +
      `a color: ${colorGlyphs.length} glifos con color real, ${(color.length / 1024).toFixed(1)} KB)`
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { GLYPHS, MAPPING, COLOR, REAL, CONTRIBUTED, GRID24, toSvg };
