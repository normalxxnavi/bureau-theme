// @ts-check
'use strict';

/**
 * Copia las capturas de VS Code a images/screenshots/ tal cual salen de la
 * ventana: sin fondos, marcos ni textos encima. Solo se recorta la vista previa
 * social de GitHub (1280 × 640) a partir de la captura de CONTROL Dark.
 *
 * Importante: la página de detalles (Marketplace y VS Code) no lee las imágenes
 * del .vsix: vsce cambia los enlaces del README por los de GitHub
 * (…/raw/HEAD/images/screenshots/…). Hasta que se suben, se ve lo que haya allí.
 *
 *   node publish.js <rawDir> <outDir> [solo,estas]   (lo lanza index.js)
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng, cropRgba } = require('../lib/png');

const [, , rawDir, outDir, only] = process.argv;
const IMAGES = ['control-dark', 'control-black', 'control-resonant', 'control-astral', 'sounds', 'icons-dark', 'icons-astral'];
const wanted = (/** @type {string} */ name) => !only || only.split(',').includes(name);

fs.mkdirSync(outDir, { recursive: true });
for (const name of IMAGES) {
  if (!wanted(name)) continue;
  const src = path.join(rawDir, `${name}.png`);
  if (!fs.existsSync(src)) throw new Error(`Falta la captura ${src}: ejecuta npm run screenshots sin argumentos.`);
  // Se vuelve a codificar (compresión máxima) en lugar de copiar el PNG de System.Drawing.
  const img = decodePng(fs.readFileSync(src));
  fs.writeFileSync(path.join(outDir, `${name}.png`), encodePng(img.width, img.height, img.rgba));
  console.log('✔', `${name}.png`, `${img.width}×${img.height}`);
}

if (wanted('social-preview')) {
  const img = decodePng(fs.readFileSync(path.join(rawDir, 'control-dark.png')));
  const crop = cropRgba(img, 0, 0, Math.min(1280, img.width), Math.min(640, img.height));
  fs.writeFileSync(path.join(outDir, 'social-preview.png'), encodePng(crop.width, crop.height, crop.rgba));
  console.log('✔ social-preview.png', `${crop.width}×${crop.height}`);
}
