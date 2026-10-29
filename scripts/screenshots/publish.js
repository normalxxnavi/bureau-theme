// @ts-check
'use strict';

/**
 * Copia las capturas de VS Code a images/screenshots/ tal cual salen de la
 * ventana, sin fondos ni textos encima. Solo se les añade un borde gris de un
 * píxel de VS Code (2 de la imagen), como el de las ventanas de Windows: sin él,
 * CONTROL Black se funde con la página en modo oscuro y CONTROL Astral con la
 * página en modo claro. La vista previa social de GitHub (1280 × 640) es un
 * recorte de la captura de CONTROL Dark, a la mitad de resolución.
 *
 * Importante: la página de detalles (Marketplace y VS Code) no lee las imágenes
 * del .vsix: vsce cambia los enlaces del README por los de GitHub
 * (…/raw/<tag>/images/screenshots/…). Hasta que se suben, se ve lo que haya allí.
 *
 *   node publish.js <rawDir> <outDir> [solo,estas]   (lo lanza index.js)
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng, cropRgba, halveRgba, edgeRgba } = require('../lib/png');

const [, , rawDir, outDir, only] = process.argv;
const IMAGES = ['control-dark', 'control-black', 'control-resonant', 'control-astral', 'sounds', 'icons-dark', 'icons-astral', 'icons-lore', 'icons-languages', 'oldest-house', 'jukebox', 'hud', 'classified', 'welcome', 'terminal-styles'];
/** @type {[number, number, number]} */
const EDGE = [0x55, 0x55, 0x55];
const wanted = (/** @type {string} */ name) => !only || only.split(',').includes(name);

fs.mkdirSync(outDir, { recursive: true });
for (const name of IMAGES) {
  if (!wanted(name)) continue;
  const src = path.join(rawDir, `${name}.png`);
  if (!fs.existsSync(src)) throw new Error(`Falta la captura ${src}: ejecuta npm run screenshots sin argumentos.`);
  // Se vuelve a codificar (compresión máxima) en lugar de copiar el PNG de Chromium.
  const img = edgeRgba(decodePng(fs.readFileSync(src)), EDGE, 2);
  fs.writeFileSync(path.join(outDir, `${name}.png`), encodePng(img.width, img.height, img.rgba));
  console.log('✔', `${name}.png`, `${img.width}×${img.height}`);
}

if (wanted('social-preview')) {
  const img = decodePng(fs.readFileSync(path.join(rawDir, 'control-dark.png')));
  const half = halveRgba(cropRgba(img, 0, 0, Math.min(2560, img.width), Math.min(1280, img.height)));
  fs.writeFileSync(path.join(outDir, 'social-preview.png'), encodePng(half.width, half.height, half.rgba));
  console.log('✔ social-preview.png', `${half.width}×${half.height}`);
}
