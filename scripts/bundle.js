// @ts-check
'use strict';

/**
 * Empaqueta el código de la extensión (src/extension) en un solo archivo
 * minificado, dist/extension.js, que es el que carga VS Code.
 *
 *   npm run bundle
 *
 * Un archivo en lugar de catorce: VS Code (y el antivirus) leen menos archivos
 * al activar la extensión. Los módulos que se cargan con `require` dentro de
 * una función (motor de sonido, instalador de fuentes) siguen evaluándose solo
 * cuando hacen falta.
 */

const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');

// Tres archivos: lo que se carga al arrancar, el motor de sonido (solo con los
// sonidos activados) y la consola de sonido (solo al abrirla). Cada uno lleva
// sus módulos pequeños compartidos (config, catálogo…): se duplican unos pocos
// cientos de bytes a cambio de no leer ni compilar código que no se usa.
const CHUNKS = ['controller', 'sound-menu'];

/** @param {string} name @param {string[]} external */
const build = (name, external) =>
  esbuild.build({
    entryPoints: [path.join(ROOT, 'src', 'extension', `${name}.js`)],
    outfile: path.join(ROOT, 'dist', `${name}.js`),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode', ...external],
    minify: true,
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  });

Promise.all([build('extension', CHUNKS.map((c) => `./${c}`)), ...CHUNKS.map((c) => build(c, []))])
  .then((results) => {
    const sizes = results.map((r) => {
      const [file, out] = Object.entries(r.metafile.outputs)[0];
      return `${path.basename(file)} ${(out.bytes / 1024).toFixed(1)} KB`;
    });
    console.log(`✔ dist/ (${sizes.join(' · ')})`);
  })
  .catch(() => process.exit(1));
