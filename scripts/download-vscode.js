// @ts-check
'use strict';

/**
 * Descarga un VS Code limpio en .vscode-test/ (para la CI o para probar sin
 * tocar tu instalación) e imprime la ruta del ejecutable.
 *
 *   npm run download-vscode            → VS Code estable
 *   npm run download-vscode -- 1.93.0  → una versión concreta
 *
 * En GitHub Actions deja además en $GITHUB_ENV VSCODE_EXECUTABLE (para
 * `npm run test:integration`) y VSCODE_PATH (para `npm run preview` y
 * `npm run validate`, que leen sus gramáticas y claves de color).
 */

const fs = require('node:fs');
const path = require('node:path');
const { downloadAndUnzipVSCode } = require('@vscode/test-electron');

/**
 * Carpeta de la instalación que contiene `resources/app`:
 *   Windows y Linux → la del ejecutable (Code.exe, code)
 *   macOS           → «Visual Studio Code.app/Contents» (el ejecutable está en Contents/MacOS)
 * @param {string} exe
 */
const installDir = (exe) => (process.platform === 'darwin' ? path.resolve(exe, '..', '..') : path.dirname(exe));

downloadAndUnzipVSCode(process.argv[2] || 'stable')
  .then((exe) => {
    console.log(exe);
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `VSCODE_EXECUTABLE=${exe}\nVSCODE_PATH=${installDir(exe)}\n`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
