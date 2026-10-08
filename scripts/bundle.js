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

esbuild
  .build({
    entryPoints: [path.join(ROOT, 'src', 'extension', 'extension.js')],
    outfile: path.join(ROOT, 'dist', 'extension.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
    minify: true,
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  })
  .then((r) => {
    const out = Object.values(r.metafile.outputs)[0];
    console.log(`✔ dist/extension.js (${Object.keys(r.metafile.inputs).length} módulos, ${(out.bytes / 1024).toFixed(1)} KB)`);
  })
  .catch(() => process.exit(1));
