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
 * es un glifo. Aquí se dibujan como formas rellenas en una cuadrícula de 24×24
 * (las fuentes no admiten trazos) y se convierten con svgicons2svgfont →
 * svg2ttf → ttf2woff.
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

/** Línea quebrada gruesa: segmentos + una junta cuadrada en cada vértice interior. */
function polyline(/** @type {Poly} */ pts, /** @type {number} */ w) {
  /** @type {Poly[]} */
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w));
  for (let i = 1; i < pts.length - 1; i++) out.push(regular(pts[i][0], pts[i][1], w / 2 / Math.cos(Math.PI / 8), 8, 22.5));
  return out;
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

/** Puntos de un octógono (para arcos «brutalistas»). Ángulos en grados, y hacia abajo. */
const octPoints = (/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number[]} */ angles) =>
  /** @type {Poly} */ (angles.map((a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]));

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

/** Contornos huecos (escalados desde el centro). */
function frameTriangle(/** @type {Poly} */ tri, /** @type {number} */ w) {
  const { cx, cy, r } = incircle(tri);
  return [solid(tri), hole(scale(tri, (r - w) / r, cx, cy))];
}
function frameRegular(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number} */ n, /** @type {number} */ w, rot = -90) {
  const apothem = r * Math.cos(Math.PI / n);
  const k = (apothem - w) / apothem;
  return [regular(cx, cy, r, n, rot), hole(scale(regular(cx, cy, r, n, rot), k, cx, cy))];
}
const frameOct = (/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number} */ w) => frameRegular(cx, cy, r, 8, w, 22.5);
function frameRect(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {number} */ t) {
  return [rect(x, y, w, h), hole(rect(x + t, y + t, w - 2 * t, h - 2 * t))];
}
/** Contorno hueco de un polígono cualquiera dado su interior a mano. */
const framePoly = (/** @type {Poly} */ outer, /** @type {Poly} */ inner) => [solid(outer), hole(inner)];

const W = 2.4; // grosor de trazo estándar

/** Ventana genérica (layouts, dividir). */
const windowFrame = () => frameRect(2, 4, 20, 16, 2);
/** Bandeja (subir / descargar). */
const tray = () => polyline([[3.2, 14], [3.2, 20.2], [20.8, 20.2], [20.8, 14]], W);
/** Documento con esquina cortada, recortado abajo a la derecha para dejar sitio a un «+». */
const docWithBadge = () =>
  framePoly(
    [[2, 1.5], [10.5, 1.5], [15, 6], [15, 11.5], [11.5, 11.5], [11.5, 19.5], [2, 19.5]],
    [[4.1, 3.6], [9.6, 3.6], [12.9, 6.9], [12.9, 9.4], [9.4, 9.4], [9.4, 17.4], [4.1, 17.4]]
  );
const folderWithBadge = () =>
  framePoly(
    [[1.5, 3.5], [8, 3.5], [10, 5.5], [19, 5.5], [19, 11.5], [11.5, 11.5], [11.5, 19.5], [1.5, 19.5]],
    [[3.6, 5.6], [7.1, 5.6], [9.1, 7.6], [16.9, 7.6], [16.9, 9.4], [9.4, 9.4], [9.4, 17.4], [3.6, 17.4]]
  );
const badgePlus = () => [rect(16.8, 13.2, 2.4, 9.6), rect(13.2, 16.8, 9.6, 2.4)];
/** Pirámide de la rama de Git, más pequeña y desplazada para dejar sitio a una marca. */
function smallPyramid() {
  /** @type {Poly} */
  const tri = [[0.8, 6.6], [17.4, 6.6], [9.1, 21.8]];
  const { cx, cy } = incircle(tri);
  return [...frameTriangle(tri, 2.1), solid(scale(tri, 0.3, cx, cy))];
}

/** Polaris (ocho rayos). `r` radio de los rayos largos. */
function polarisStar(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r) {
  /** @type {Poly} */
  const p = [];
  for (let i = 0; i < 16; i++) {
    const rr = i % 2 ? r * 0.28 : i % 4 === 0 ? r : r * 0.63;
    const a = ((-90 + 22.5 * i) * Math.PI) / 180;
    p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return solid(p);
}

/** Marcas de esquina (arriba a la derecha) para las variantes de estado de un glifo. */
const MARK = {
  dot: () => [rect(17.6, 0.8, 5, 5)],
  alert: () => [solid([[20.1, 0.4], [23.6, 3.9], [20.1, 7.4], [16.6, 3.9]])],
  error: () => [bar(17.2, 1.2, 23, 7, 1.9), bar(23, 1.2, 17.2, 7, 1.9)],
  check: () => polyline([[16.9, 4.2], [19.1, 6.4], [23.2, 1.6]], 1.9),
  off: () => [...frameOct(20.1, 3.9, 3.6, 1.3), bar(18.2, 6, 22.2, 1.8, 1.3)],
  pause: () => [rect(17.6, 1, 2, 6), rect(20.8, 1, 2, 6)],
};
/** Polaris pequeña, desplazada abajo a la izquierda para dejar sitio a la marca. */
const smallPolaris = () => [polarisStar(9.6, 13.4, 10.4)];

/** Estrella de cinco puntas. */
function star(/** @type {number} */ k) {
  /** @type {Poly} */
  const p = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4.3 * k : 10.5 * k;
    const a = ((-90 + 36 * i) * Math.PI) / 180;
    p.push([12 + r * Math.cos(a), 12.6 + r * Math.sin(a)]);
  }
  return p;
}

// --- Glifos (cuadrícula 24×24) ---------------------------------------------------

/** @type {Record<string, () => Poly[]>} */
const GLYPHS = {
  // ── Lore ──────────────────────────────────────────────────────────────────
  // Expediente del Bureau: documento con la esquina cortada, franja de clasificación y otro expediente detrás.
  dossier: () => [rect(3, 2, 10, 2), rect(3, 2, 2, 15), ...framePoly([[7, 6], [16, 6], [21, 11], [21, 22], [7, 22]], [[9, 8], [15.2, 8], [19, 11.8], [19, 20], [9, 20]]), rect(11, 15.5, 6, 2.2)],
  // Lupa cuadrada y brutalista.
  lens: () => [...frameRect(2, 2, 14, 14, W), bar(14.2, 14.2, 21.6, 21.6, 3.4)],
  // Pirámide invertida con su núcleo: control de código fuente y rama de Git.
  pyramid: () => {
    /** @type {Poly} */
    const tri = [[1.8, 3.2], [22.2, 3.2], [12, 21.6]];
    const { cx, cy } = incircle(tri);
    return [...frameTriangle(tri, 2.3), solid(scale(tri, 0.3, cx, cy))];
  },
  // Variantes de la rama de Git: pirámide algo menor con una marca en la esquina.
  pyramidDot: () => [...smallPyramid(), rect(17.6, 0.8, 5, 5)],
  pyramidPlus: () => [...smallPyramid(), rect(19.1, 0.6, 2, 7), rect(16.6, 3.1, 7, 2)],
  pyramidMinus: () => [...smallPyramid(), rect(16.6, 3.1, 7, 2)],
  pyramidAlert: () => [...smallPyramid(), solid([[20.1, 0.4], [23.6, 3.9], [20.1, 7.4], [16.6, 3.9]])],
  // El Consejo: pirámide maciza con una ranura, y la línea con la que «habla».
  board: () => [rect(5, 2, 14, W), solid([[2.5, 7.5], [21.5, 7.5], [12, 22.5]]), hole(rect(8.4, 10.6, 7.2, 1.8))],
  // Hexágono de la Hedron con «play» (ejecutar y depurar) o con un check (tests).
  hedronPlay: () => [...frameRegular(12, 12, 10.6, 6, 2.2), solid([[9.4, 7.6], [16.8, 12], [9.4, 16.4]])],
  hedronCheck: () => [...frameRegular(12, 12, 10.6, 6, 2.2), ...polyline([[7.6, 12.2], [10.6, 15.2], [16.8, 8.6]], 2.6)],
  // Bloques de hormigón; uno está «alterado» (desplazado y hueco).
  blocks: () => [rect(2, 13, 9, 9), rect(13, 13, 9, 9), rect(2, 2, 9, 9), ...frameRect(14, 1, 9, 9, 2.2)],
  // Credencial del Bureau con el emblema de la pirámide.
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
    rect(4, 3.5, 13, 3.4),
    solid([[1.5, 3.5], [7.5, 3.5], [7.5, 10.5], [4, 10.5], [1.5, 8]]),
    solid([[16.5, 3.5], [18.5, 3.5], [18.5, 10.5], [16.5, 10.5]]),
    solid([[6.5, 12.5], [17.5, 12.5], [20.5, 21.5], [3.5, 21.5]]),
    hole(rect(10, 15.5, 4, 3)),
    rect(19.2, 0.6, 4.2, 4.2),
  ],
  // Cubo de un Objeto de Poder (paquetes).
  cube: () => [...frameRegular(12, 12, 10.6, 6, 2.2), bar(12, 12, 12, 22, 2.2), bar(12, 12, 3.6, 7.2, 2.2), bar(12, 12, 20.4, 7.2, 2.2)],
  // Polaris, la luz que guía a Jesse: los asistentes de IA (Copilot, chat).
  polaris: () => {
    /** @type {Poly} */
    const p = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 3.1 : i % 4 === 0 ? 11.2 : 7;
      const a = ((-90 + 22.5 * i) * Math.PI) / 180;
      p.push([12 + r * Math.cos(a), 12 + r * Math.sin(a)]);
    }
    return [solid(p)];
  },
  // Estados de Copilot y del chat: Polaris con una marca (trabajando, aviso, error, listo, sin conexión, en pausa).
  polarisDot: () => [...smallPolaris(), ...MARK.dot()],
  polarisAlert: () => [...smallPolaris(), ...MARK.alert()],
  polarisError: () => [...smallPolaris(), ...MARK.error()],
  polarisCheck: () => [...smallPolaris(), ...MARK.check()],
  polarisOff: () => [...smallPolaris(), ...MARK.off()],
  polarisPause: () => [...smallPolaris(), ...MARK.pause()],
  // La Hotline en «no molestar» (notificaciones silenciadas).
  hotlineOff: () => [...GLYPHS.hotlineDot().slice(0, -1), ...MARK.off()],
  // El Laberinto del Cenicero (Ashtray Maze): control de código fuente, caminos que se bifurcan.
  maze: () => polyline([[3, 21], [3, 3], [21, 3], [21, 21], [8, 21], [8, 8], [16, 8], [16, 16], [12, 16], [12, 12.4]], 2.3),
  // El patito de goma que se teletransporta (Objeto Alterado): depurar, «rubber duck debugging».
  duck: () => [
    solid([[1.5, 9.5], [5.5, 13], [16, 13], [18.5, 11], [22.5, 12], [22, 16.5], [18, 21.5], [6, 21.5], [2.5, 17.5]]),
    regular(9.8, 8, 5.2, 8, 22.5),
    hole(rect(9.8, 5.5, 1.9, 1.9)),
    solid([[14.4, 7], [19.8, 8.4], [14.4, 10.6]]),
  ],
  // Disquete de 8 pulgadas (Objeto de Poder): guardar.
  floppy: () => [
    solid([[2.5, 2.5], [18, 2.5], [21.5, 6], [21.5, 21.5], [2.5, 21.5]]),
    hole(rect(7, 4.5, 10, 5.2)),
    hole(rect(5.6, 12.4, 12.8, 7.2)),
    rect(13, 5.4, 2.4, 3.4),
    rect(7.4, 14, 9.2, 4),
  ],
  // La cinta de Ahti (la puerta trasera del Laberinto): la línea de tiempo.
  cassette: () => [
    rect(1.5, 4.5, 21, 15.5),
    hole(rect(4.6, 7.4, 14.8, 6.6)),
    hole(solid([[6.4, 16.2], [17.6, 16.2], [16.4, 20], [7.6, 20]])),
    regular(8.8, 10.7, 2.3, 8, 22.5),
    regular(15.2, 10.7, 2.3, 8, 22.5),
  ],
  // La televisión Benicoff (Objeto de Poder): la consola de depuración.
  tv: () => [...polyline([[7, 1.8], [12, 6.6], [17, 1.8]], 2), rect(1.5, 6.6, 21, 15.4), hole(rect(3.8, 8.9, 12.6, 10.8)), hole(rect(18.3, 10, 2.4, 2.4)), hole(rect(18.3, 14.4, 2.4, 2.4))],
  // El proyector de diapositivas (Objeto de Poder): la salida.
  projector: () => [
    regular(5.6, 6.2, 3.2, 8, 22.5),
    regular(12, 6.2, 3.2, 8, 22.5),
    rect(1.5, 9, 14, 10),
    hole(regular(8.5, 14, 2.6, 8, 22.5)),
    rect(3, 19, 2.4, 2.6),
    rect(11.1, 19, 2.4, 2.6),
    solid([[16.5, 11.2], [22.8, 7.6], [22.8, 20.4], [16.5, 16.8]]),
  ],
  // La caja fuerte (Objeto de Poder del Escudo): confianza del espacio de trabajo, archivar.
  safe: () => [...frameRect(2.5, 2.5, 19, 16.5, 2.2), ...frameOct(12, 10.75, 4.6, 2), rect(11.1, 9.85, 1.8, 1.8), rect(4.5, 19, 3.6, 2.8), rect(15.9, 19, 3.6, 2.8)],
  // El cubo y la fregona de Ahti, el conserje: limpiar todo.
  mop: () => [
    solid([[7, 11.5], [21.5, 11.5], [19.5, 22], [9, 22]]),
    hole(rect(9.2, 14.6, 10.4, 1.8)),
    bar(3, 1.8, 13.6, 13.8, 2.4),
    ...polyline([[8.6, 11.5], [14.25, 7.4], [19.9, 11.5]], 1.8),
  ],
  // La llave del Motel Oceanview con su llavero de rombo: claves y atajos de teclado.
  key: () => [solid([[7, 1], [13, 7], [7, 13], [1, 7]]), hole(regular(7, 7, 1.8, 4, 0)), bar(10.5, 10.5, 21, 21, 2.6), bar(15, 15, 17.6, 12.4, 2.2), bar(18.4, 18.4, 21, 15.8, 2.2)],
  // La Casa Inmemorial: torre brutalista con su remate volado (inicio).
  oldestHouse: () => [
    solid([[1.5, 2.5], [22.5, 2.5], [22.5, 8], [18.5, 8], [18.5, 20], [5.5, 20], [5.5, 8], [1.5, 8]]),
    hole(rect(3.6, 4.6, 16.8, 1.4)),
    hole(rect(8.4, 10.4, 2.2, 7.6)),
    hole(rect(13.4, 10.4, 2.2, 7.6)),
    rect(1, 20, 22, 2.2),
  ],
  // El Umbral (Threshold): la puerta entre mundos, conexiones remotas.
  threshold: () => [...frameRect(5, 1.5, 14, 19.5, 2.2), solid([[7.2, 3.7], [14, 5.8], [14, 21], [7.2, 18.8]]), rect(1.5, 21, 21, 1.8)],
  // El Aberrante, el arma que cambia de forma de Dylan (Control Resonant): herramientas.
  hammer: () => [
    solid([[2, 3], [16, 3], [19, 6], [19, 8.5], [16, 11], [2, 11]]),
    hole(rect(4.4, 6, 9, 2)),
    rect(9.6, 11, 3, 11.5),
    solid([[19, 6], [22.5, 4], [22.5, 10.5], [19, 8.5]]),
  ],
  // Resonancia: el sonido de la extensión (icono de la barra de estado).
  resonance: () => [
    solid([[2, 8.8], [6.6, 8.8], [12, 3.8], [12, 20.2], [6.6, 15.2], [2, 15.2]]),
    ...polyline(octPoints(12, 12, 5, [-45, 0, 45]), 2.2),
    ...polyline(octPoints(12, 12, 9.4, [-55, -27.5, 0, 27.5, 55]), 2.2),
  ],
  resonanceOff: () => [solid([[2, 8.8], [6.6, 8.8], [12, 3.8], [12, 20.2], [6.6, 15.2], [2, 15.2]]), bar(15, 8.6, 21.8, 15.4, 2.4), bar(21.8, 8.6, 15, 15.4, 2.4)],
  // La gramola Songmaster (Objeto de Poder): música y packs de sonido.
  jukebox: () => [
    solid([[3.5, 8.5], [7, 2.5], [17, 2.5], [20.5, 8.5], [20.5, 22], [3.5, 22]]),
    hole(solid([[6.2, 8.8], [8.6, 5], [15.4, 5], [17.8, 8.8], [17.8, 12.4], [6.2, 12.4]])),
    hole(rect(6.2, 14.8, 11.6, 1.6)),
    hole(rect(6.2, 18, 11.6, 1.6)),
  ],

  // ── Terminal, puertos ─────────────────────────────────────────────────────────
  prompt: () => [...polyline([[4, 6], [10.5, 12], [4, 18]], 2.8), rect(12.5, 17, 8.5, 2.8)],
  plug: () => [rect(6.5, 8, 11, 8.5), rect(8.5, 2.5, 2.4, 5.5), rect(13.1, 2.5, 2.4, 5.5), bar(12, 16.5, 12, 22.5, W)],

  // ── Navegación ──────────────────────────────────────────────────────────────
  chevronRight: () => polyline([[9, 5.5], [15.5, 12], [9, 18.5]], 2.6),
  chevronLeft: () => polyline([[15, 5.5], [8.5, 12], [15, 18.5]], 2.6),
  chevronDown: () => polyline([[5.5, 9], [12, 15.5], [18.5, 9]], 2.6),
  chevronUp: () => polyline([[5.5, 15], [12, 8.5], [18.5, 15]], 2.6),
  arrowLeft: () => [bar(20, 12, 6, 12, 2.6), ...polyline([[11.5, 6], [5.5, 12], [11.5, 18]], 2.6)],
  arrowRight: () => [bar(4, 12, 18, 12, 2.6), ...polyline([[12.5, 6], [18.5, 12], [12.5, 18]], 2.6)],
  arrowUp: () => [bar(12, 20, 12, 6, 2.6), ...polyline([[6, 11.5], [12, 5.5], [18, 11.5]], 2.6)],
  arrowDown: () => [bar(12, 4, 12, 18, 2.6), ...polyline([[6, 12.5], [12, 18.5], [18, 12.5]], 2.6)],
  triangleRight: () => [solid([[8.5, 5.5], [16.5, 12], [8.5, 18.5]])],
  triangleDown: () => [solid([[5.5, 8.5], [18.5, 8.5], [12, 16.5]])],

  // ── Acciones ────────────────────────────────────────────────────────────────
  close: () => [bar(5.5, 5.5, 18.5, 18.5, 2.6), bar(18.5, 5.5, 5.5, 18.5, 2.6)],
  add: () => [rect(10.7, 4, 2.6, 16), rect(4, 10.7, 16, 2.6)],
  remove: () => [rect(4, 10.7, 16, 2.6)],
  check: () => polyline([[4, 12.5], [9.5, 18], [20, 6.5]], 2.8),
  checkAll: () => [...polyline([[1.5, 12.5], [6, 17], [14.5, 7.5]], 2.4), ...polyline([[10.5, 17], [20.5, 7]], 2.4), bar(8.5, 15, 10.5, 17, 2.4)],
  ellipsis: () => [rect(2.5, 10.2, 3.6, 3.6), rect(10.2, 10.2, 3.6, 3.6), rect(17.9, 10.2, 3.6, 3.6)],
  kebab: () => [rect(10.2, 2.5, 3.6, 3.6), rect(10.2, 10.2, 3.6, 3.6), rect(10.2, 17.9, 3.6, 3.6)],
  menu: () => [rect(3.5, 5, 17, W), rect(3.5, 10.8, 17, W), rect(3.5, 16.6, 17, W)],
  trash: () => [rect(3.5, 4.8, 17, 2.2), rect(9, 2, 6, 2.8), ...framePoly([[5.8, 8.5], [18.2, 8.5], [17.2, 22], [6.8, 22]], [[8, 10.7], [16, 10.7], [15.2, 19.8], [8.8, 19.8]]), rect(11, 12, 2, 6)],
  edit: () => [bar(5.5, 18.5, 17.5, 6.5, 3.4), solid([[2.5, 21.5], [3.3, 16.9], [7.1, 20.7]]), bar(17.2, 2.6, 21.4, 6.8, 3.4)],
  filter: () => [solid([[2.5, 4], [21.5, 4], [14, 12.5], [14, 20.5], [10, 18.3], [10, 12.5]])],
  collapseAll: () => [rect(2, 2, 13, 2.2), rect(2, 2, 2.2, 13), ...frameRect(6.5, 6.5, 15, 15, 2.2), rect(9.8, 12.9, 8.4, 2.2)],
  expandAll: () => [rect(2, 2, 13, 2.2), rect(2, 2, 2.2, 13), ...frameRect(6.5, 6.5, 15, 15, 2.2), rect(9.8, 12.9, 8.4, 2.2), rect(12.9, 9.8, 2.2, 8.4)],
  newFile: () => [...docWithBadge(), ...badgePlus()],
  newFolder: () => [...folderWithBadge(), ...badgePlus()],
  file: () => framePoly([[4, 1.5], [13.5, 1.5], [20, 8], [20, 22.5], [4, 22.5]], [[6.2, 3.7], [12.6, 3.7], [17.8, 8.9], [17.8, 20.3], [6.2, 20.3]]),
  folder: () => framePoly([[1.5, 4], [8.5, 4], [10.5, 6], [22.5, 6], [22.5, 20], [1.5, 20]], [[3.7, 6.2], [7.6, 6.2], [9.6, 8.2], [20.3, 8.2], [20.3, 17.8], [3.7, 17.8]]),
  folderOpened: () => [...polyline([[3.2, 15], [3.2, 5.2], [8, 5.2], [10, 7.2], [17.8, 7.2], [17.8, 9.5]], 2.2), ...framePoly([[1.5, 20.5], [5.6, 10.5], [23, 10.5], [18.9, 20.5]], [[4.7, 18.3], [7, 12.7], [19.8, 12.7], [17.4, 18.3]])],
  copy: () => [rect(2.5, 2.5, 13, 2.2), rect(2.5, 2.5, 2.2, 13), ...frameRect(7.5, 7.5, 14, 14, 2.2)],
  pin: () => [rect(8, 2.5, 8, 8.5), rect(5, 11, 14, W), rect(10.9, 13.4, 2.2, 8.6)],
  lock: () => [rect(4, 10, 16, 12), hole(rect(10.8, 13.5, 2.4, 5)), ...polyline([[7.5, 10], [7.5, 4], [16.5, 4], [16.5, 10]], W)],
  unlock: () => [rect(4, 10, 16, 12), hole(rect(10.8, 13.5, 2.4, 5)), ...polyline([[7.5, 10], [7.5, 4], [16.5, 4], [16.5, 6.5]], W)],
  eye: () => [...framePoly([[1.5, 12], [7.5, 5.5], [16.5, 5.5], [22.5, 12], [16.5, 18.5], [7.5, 18.5]], [[4.5, 12], [8.5, 7.7], [15.5, 7.7], [19.5, 12], [15.5, 16.3], [8.5, 16.3]]), rect(9.6, 9.6, 4.8, 4.8)],
  eyeClosed: () => [...polyline([[1.5, 9], [7.5, 14.5], [16.5, 14.5], [22.5, 9]], W), bar(6, 15.5, 4, 20, 2.2), bar(12, 16, 12, 21, 2.2), bar(18, 15.5, 20, 20, 2.2)],
  lightbulb: () => [...framePoly([[7, 2], [17, 2], [20.5, 6.5], [20.5, 11], [16, 15.5], [8, 15.5], [3.5, 11], [3.5, 6.5]], [[8, 4.2], [16, 4.2], [18.3, 7.2], [18.3, 10.1], [15.1, 13.3], [8.9, 13.3], [5.7, 10.1], [5.7, 7.2]]), rect(8.5, 17, 7, 2.2), rect(9.8, 20.2, 4.4, 2.2)],
  zap: () => [solid([[13.5, 1.5], [4.5, 13.5], [10.8, 13.5], [9, 22.5], [19.5, 9.8], [13, 9.8]])],
  comment: () => framePoly([[2, 3], [22, 3], [22, 16.5], [10.5, 16.5], [5, 21.5], [5, 16.5], [2, 16.5]], [[4.2, 5.2], [19.8, 5.2], [19.8, 14.3], [9.7, 14.3], [7.2, 16.6], [7.2, 14.3], [4.2, 14.3]]),
  history: () => [...frameOct(12, 12, 10.4, 2.2), rect(10.9, 6, 2.2, 7.1), rect(10.9, 10.9, 6, 2.2)],
  starFull: () => [solid(star(1))],
  starEmpty: () => [solid(star(1)), hole(scale(star(1), 0.5, 12, 12.6))],
  circleFilled: () => [regular(12, 12, 5.6, 8, 22.5)],
  loading: () => polyline(octPoints(12, 12, 8.6, [-90, -45, 0, 45, 90, 135, 180]), 2.6),

  // ── Estado y diagnósticos ─────────────────────────────────────────────────────
  error: () => [...frameOct(12, 12, 10.6, 2.2), bar(8.4, 8.4, 15.6, 15.6, 2.4), bar(15.6, 8.4, 8.4, 15.6, 2.4)],
  warning: () => [...frameTriangle([[12, 1.8], [22.8, 21], [1.2, 21]], 2.2), rect(10.9, 8.6, 2.2, 6.4), rect(10.9, 16.3, 2.2, 2.2)],
  info: () => [...frameRect(2.5, 2.5, 19, 19, 2.2), rect(10.9, 10.3, 2.2, 7.4), rect(10.9, 6.3, 2.2, 2.2)],

  // ── Control de código fuente ───────────────────────────────────────────────────
  gitCommit: () => [rect(1.5, 10.8, 5.5, W), rect(17, 10.8, 5.5, W), ...frameRect(7, 7, 10, 10, W)],
  gitPullRequest: () => [...frameRect(2.5, 2, 6.5, 6.5, 2), ...frameRect(2.5, 15.5, 6.5, 6.5, 2), rect(4.75, 8.5, 2, 7), ...frameRect(15, 15.5, 6.5, 6.5, 2), ...polyline([[18.25, 15.5], [18.25, 5.25], [13.5, 5.25]], 2), solid([[14.5, 1.8], [10, 5.25], [14.5, 8.7]])],
  sync: () => [
    ...polyline(octPoints(12, 12, 8.6, [180, 225, 270, 315]), 2.4),
    solid([[16, 2.6], [22.5, 5.5], [17.6, 10.6]]),
    ...polyline(octPoints(12, 12, 8.6, [0, 45, 90, 135]), 2.4),
    solid([[8, 21.4], [1.5, 18.5], [6.4, 13.4]]),
  ],
  refresh: () => [...polyline(octPoints(12, 12.5, 8.4, [-45, 0, 45, 90, 135, 180, 225, 270]), 2.4), solid([[11.6, 0.6], [18.2, 4.1], [11.6, 7.6]])],
  cloudUpload: () => [...tray(), bar(12, 16.5, 12, 5, W), ...polyline([[6.8, 9.5], [12, 4.3], [17.2, 9.5]], W)],
  cloudDownload: () => [...tray(), bar(12, 3, 12, 15, W), ...polyline([[6.8, 10.2], [12, 15.4], [17.2, 10.2]], W)],
  discard: () => [...polyline([[19.5, 18], [19.5, 9], [8, 9]], W), solid([[9.5, 3.8], [3, 9], [9.5, 14.2]])],
  listFlat: () => [rect(3, 5, 18, 2.2), rect(3, 10.9, 18, 2.2), rect(3, 16.8, 18, 2.2)],
  listTree: () => [rect(3, 4, 18, 2.2), rect(7.5, 10.9, 13.5, 2.2), rect(7.5, 17.8, 13.5, 2.2), rect(3, 6.2, 2.2, 12.8), rect(3, 10.9, 4.5, 2.2), rect(3, 17.8, 4.5, 2.2)],

  // ── Depuración y ejecución ────────────────────────────────────────────────────
  play: () => [solid([[6.5, 4], [19.5, 12], [6.5, 20]])],
  debugContinue: () => [rect(4, 4.5, 2.8, 15), solid([[9.5, 4.5], [20.5, 12], [9.5, 19.5]])],
  debugPause: () => [rect(5.5, 4.5, 4.4, 15), rect(14.1, 4.5, 4.4, 15)],
  debugStop: () => [rect(5, 5, 14, 14)],
  debugDisconnect: () => frameRect(5, 5, 14, 14, 2.6),
  debugStepOver: () => [...polyline([[4, 13], [4, 6.5], [19.5, 6.5], [19.5, 10.5]], W), solid([[15.6, 10], [23.4, 10], [19.5, 14.8]]), rect(9.8, 16.5, 4.4, 4.4)],
  debugStepInto: () => [bar(12, 1.5, 12, 10, W), solid([[7.5, 9], [16.5, 9], [12, 14]]), rect(9.8, 17, 4.4, 4.4)],
  debugStepOut: () => [bar(12, 15, 12, 6, W), solid([[7.5, 7], [16.5, 7], [12, 2]]), rect(9.8, 17, 4.4, 4.4)],

  // ── Ventana y distribución ────────────────────────────────────────────────────
  screenFull: () => [rect(3, 3, 7, W), rect(3, 3, W, 7), rect(14, 3, 7, W), rect(18.6, 3, W, 7), rect(3, 18.6, 7, W), rect(3, 14, W, 7), rect(14, 18.6, 7, W), rect(18.6, 14, W, 7)],
  screenNormal: () => [rect(3, 7.6, 7, W), rect(7.6, 3, W, 7), rect(14, 7.6, 7, W), rect(14, 3, W, 7), rect(3, 14, 7, W), rect(7.6, 14, W, 7), rect(14, 14, 7, W), rect(14, 14, W, 7)],
  chromeMinimize: () => [rect(5, 11.2, 14, 1.6)],
  chromeMaximize: () => frameRect(5, 5, 14, 14, 1.6),
  chromeRestore: () => [...frameRect(5, 8.5, 10.5, 10.5, 1.6), rect(8.5, 5, 10.5, 1.6), rect(17.4, 5, 1.6, 10.5)],
  chromeClose: () => [bar(5.5, 5.5, 18.5, 18.5, 1.7), bar(18.5, 5.5, 5.5, 18.5, 1.7)],
  layoutSidebarLeft: () => [...windowFrame(), rect(4, 6, 5.5, 12)],
  layoutSidebarLeftOff: () => [...windowFrame(), rect(8.5, 4, 2, 16)],
  layoutSidebarRight: () => [...windowFrame(), rect(14.5, 6, 5.5, 12)],
  layoutSidebarRightOff: () => [...windowFrame(), rect(13.5, 4, 2, 16)],
  layoutPanel: () => [...windowFrame(), rect(4, 12.5, 16, 5.5)],
  layoutPanelOff: () => [...windowFrame(), rect(2, 12, 20, 2)],
  layout: () => [...windowFrame(), rect(8.5, 4, 2, 16), rect(10.5, 12, 11.5, 2)],
  splitHorizontal: () => [...windowFrame(), rect(11, 4, 2, 16)],
  splitVertical: () => [...windowFrame(), rect(2, 11, 20, 2)],
};

/** Iconos de VS Code → glifo. Las claves son codicons o identificadores de iconos registrados. */
const MAPPING = {
  // Barra de actividad
  'explorer-view-icon': 'dossier', files: 'dossier', book: 'dossier',
  'search-view-icon': 'lens', search: 'lens', 'search-large': 'lens',
  'source-control-view-icon': 'maze', 'source-control': 'maze', repo: 'maze', 'git-merge': 'maze', 'git-branch': 'pyramid',
  'git-branch-compact': 'pyramid', 'git-branch-changes': 'pyramidDot', 'git-branch-staged-changes': 'pyramidPlus',
  'git-branch-conflicts': 'pyramidAlert', 'git-branch-create': 'pyramidPlus', 'git-branch-delete': 'pyramidMinus',
  'run-view-icon': 'duck', 'debug-alt': 'duck', 'debug-alt-small': 'duck', debug: 'duck', bug: 'duck',
  'extensions-view-icon': 'blocks', extensions: 'blocks',
  'test-view-icon': 'hedronCheck', beaker: 'hedronCheck', pass: 'hedronCheck', 'pass-filled': 'hedronCheck',
  'accounts-view-bar-icon': 'badge', account: 'badge', person: 'badge',
  'settings-view-bar-icon': 'hexNut', 'settings-gear': 'hexNut', manage: 'hexNut', gear: 'hexNut', settings: 'hexNut',
  'chat-view-icon': 'polaris', 'chat-sparkle': 'polaris', copilot: 'polaris', 'copilot-logo': 'polaris', sparkle: 'polaris', 'sparkle-filled': 'polaris',
  law: 'board',
  bell: 'hotline', 'bell-dot': 'hotlineDot',
  package: 'cube', home: 'oldestHouse', save: 'floppy', 'save-all': 'floppy', 'save-as': 'floppy',
  shield: 'safe', 'workspace-trusted': 'safe', 'workspace-untrusted': 'safe', 'workspace-unknown': 'safe', archive: 'safe',
  key: 'key', keyboard: 'key', 'record-keys': 'key', music: 'jukebox', unmute: 'resonance', mute: 'resonanceOff',
  'remote-explorer-view-icon': 'threshold', 'remote-explorer': 'threshold', remote: 'threshold',
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

// --- Versión a color -------------------------------------------------------------

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

/** @typedef {Array<[string, Poly[]]>} Layers */
/** Todo el glifo de un color. */
const one = (/** @type {string} */ c) => (/** @type {Poly[]} */ p) => /** @type {Layers} */ ([[c, p]]);
/** Las primeras `n` formas (o todas menos las últimas `-n`) de un color y el resto de otro. */
const two = (/** @type {number} */ n, /** @type {string} */ a, /** @type {string} */ b) => (/** @type {Poly[]} */ p) =>
  /** @type {Layers} */ ([[a, p.slice(0, n)], [b, p.slice(n)]]);
/** Tramos de formas: [[color, hasta], …]; el último llega al final. Los huecos van con su forma. */
const spans = (/** @type {Array<[string, number?]>} */ parts) => (/** @type {Poly[]} */ p) => {
  /** @type {Layers} */
  const out = [];
  let from = 0;
  for (const [color, to] of parts) {
    out.push([color, p.slice(from, to ?? p.length)]);
    from = to ?? p.length;
  }
  return out;
};

const R = REAL;

/**
 * Capas de color de TODOS los glifos (el test comprueba que no falta ninguno y
 * que ninguna capa se queda con el color del tema).
 * @type {Record<string, (p: Poly[]) => Layers>}
 */
const COLOR = {
  // Lore
  dossier: two(-1, R.paper, R.red),
  lens: two(2, R.steel, R.brass),
  pyramid: one(R.orange),
  pyramidDot: two(-1, R.orange, R.amber),
  pyramidPlus: two(-2, R.orange, R.green),
  pyramidMinus: two(-1, R.orange, R.red),
  pyramidAlert: two(-1, R.orange, R.red),
  board: two(1, R.red, R.violet),
  hedronPlay: one(R.cyan),
  hedronCheck: two(2, R.cyan, R.green),
  blocks: spans([[R.blue, 1], [R.teal, 2], [R.steel, 3], [R.red]]),
  badge: spans([[R.brass, -3], [R.red, -2], [R.brass]]),
  hexNut: two(2, R.steel, R.brass),
  hotline: one(R.red),
  hotlineDot: two(-1, R.red, R.amber),
  cube: one(R.violet),
  polaris: one(R.yellow),
  polarisDot: two(1, R.yellow, R.amber),
  polarisAlert: two(1, R.yellow, R.amber),
  polarisError: two(1, R.yellow, R.red),
  polarisCheck: two(1, R.yellow, R.green),
  polarisOff: two(1, R.yellow, R.red),
  polarisPause: two(1, R.yellow, R.steel),
  hotlineOff: two(5, R.red, R.steel),
  maze: one(R.amber),
  duck: two(-1, R.yellow, R.orange),
  floppy: spans([[R.blue, 3], [R.steel, 4], [R.paper]]),
  cassette: two(3, R.amber, R.steel),
  tv: two(3, R.steel, R.brass),
  projector: two(-1, R.steel, R.yellow),
  safe: spans([[R.steel, 2], [R.brass, 5], [R.steel]]),
  mop: spans([[R.blue, 2], [R.paper, 3], [R.steel]]),
  key: two(2, R.red, R.brass),
  oldestHouse: two(-1, R.steel, R.red),
  threshold: spans([[R.steel, 2], [R.cyan, 3], [R.steel]]),
  hammer: spans([[R.cyan, 2], [R.steel, 3], [R.cyan]]),
  resonance: one(R.cyan),
  resonanceOff: two(1, R.steel, R.red),
  jukebox: one(R.orange),
  // Terminal y puertos
  prompt: one(R.green),
  plug: one(R.teal),
  // Navegación
  chevronRight: one(R.steel),
  chevronLeft: one(R.steel),
  chevronDown: one(R.steel),
  chevronUp: one(R.steel),
  arrowLeft: one(R.steel),
  arrowRight: one(R.steel),
  arrowUp: one(R.steel),
  arrowDown: one(R.steel),
  triangleRight: one(R.steel),
  triangleDown: one(R.steel),
  // Acciones
  close: one(R.red),
  add: one(R.green),
  remove: one(R.red),
  check: one(R.green),
  checkAll: one(R.green),
  ellipsis: one(R.steel),
  kebab: one(R.steel),
  menu: one(R.steel),
  trash: one(R.red),
  edit: spans([[R.amber, 1], [R.steel, 2], [R.red]]),
  filter: one(R.teal),
  collapseAll: two(-1, R.steel, R.blue),
  expandAll: two(-2, R.steel, R.blue),
  newFile: two(-2, R.paper, R.green),
  newFolder: two(-2, R.amber, R.green),
  file: one(R.paper),
  folder: one(R.amber),
  folderOpened: one(R.amber),
  copy: one(R.blue),
  pin: one(R.red),
  lock: one(R.brass),
  unlock: one(R.brass),
  eye: two(2, R.blue, R.cyan),
  eyeClosed: one(R.steel),
  lightbulb: two(2, R.yellow, R.steel),
  zap: one(R.yellow),
  comment: one(R.blue),
  history: two(2, R.steel, R.red),
  starFull: one(R.yellow),
  starEmpty: one(R.yellow),
  circleFilled: one(R.amber),
  loading: one(R.cyan),
  // Estado
  error: one(R.red),
  warning: one(R.amber),
  info: one(R.blue),
  // Control de código fuente
  gitCommit: one(R.orange),
  gitPullRequest: one(R.green),
  sync: one(R.teal),
  refresh: one(R.teal),
  cloudUpload: one(R.blue),
  cloudDownload: one(R.blue),
  discard: one(R.amber),
  listFlat: one(R.steel),
  listTree: one(R.steel),
  // Depuración
  play: one(R.green),
  debugContinue: one(R.green),
  debugPause: one(R.amber),
  debugStop: one(R.red),
  debugDisconnect: one(R.red),
  debugStepOver: two(-1, R.blue, R.amber),
  debugStepInto: two(-1, R.blue, R.amber),
  debugStepOut: two(-1, R.blue, R.amber),
  // Ventana
  screenFull: one(R.steel),
  screenNormal: one(R.steel),
  chromeMinimize: one(R.steel),
  chromeMaximize: one(R.steel),
  chromeRestore: one(R.steel),
  chromeClose: one(R.red),
  layoutSidebarLeft: two(2, R.steel, R.blue),
  layoutSidebarLeftOff: two(2, R.steel, R.blue),
  layoutSidebarRight: two(2, R.steel, R.blue),
  layoutSidebarRightOff: two(2, R.steel, R.blue),
  layoutPanel: two(2, R.steel, R.blue),
  layoutPanelOff: two(2, R.steel, R.blue),
  layout: two(2, R.steel, R.blue),
  splitHorizontal: two(2, R.steel, R.blue),
  splitVertical: two(2, R.steel, R.blue),
};

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

const fmt = (/** @type {number} */ n) => String(Math.round(n * 1000) / 1000);
const toPath = (/** @type {Poly[]} */ polys) => polys.map((p) => `M${p.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');
const toSvg = (/** @type {Poly[]} */ polys) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${toPath(polys)}"/></svg>\n`;

/** Fuente TrueType con los glifos dados. */
async function buildTtf(/** @type {Array<{name: string, svg: string, code: number}>} */ glyphs) {
  const { SVGIcons2SVGFontStream } = await import('svgicons2svgfont');
  const svg2ttf = require('svg2ttf');

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
  return Buffer.from(svg2ttf(svgFont, { description: 'Bureau product icons (original, MIT)', url: 'https://github.com/Normalxxnavi/bureau-theme' }).buffer);
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
  fs.writeFileSync(path.join(OUT, json), JSON.stringify(theme, null, 2) + '\n');
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

  for (const [id, glyph] of Object.entries(MAPPING)) if (!(glyph in GLYPHS)) throw new Error(`${id} → glifo inexistente: ${glyph}`);

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
    const layers = layersOf(GLYPHS[name]()).map(([color, polys], i) => {
      if (polys.length === 0) throw new Error(`COLOR: capa vacía en ${name}`);
      if (!color) throw new Error(`COLOR: capa sin color en ${name}`);
      const code = 0xe800 + layerGlyphs.length;
      layerGlyphs.push({ name: `${name}-${i}`, svg: toSvg(polys), code });
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

module.exports = { GLYPHS, MAPPING, COLOR, REAL, CONTRIBUTED, toSvg, area };
