// @ts-check
'use strict';

/**
 * Descarga un VS Code limpio en .vscode-test/ (para la CI o para probar sin
 * tocar tu instalación) e imprime la ruta del ejecutable.
 *
 *   npm run download-vscode            → VS Code estable
 *   npm run download-vscode -- 1.93.0  → una versión concreta
 *
 * En GitHub Actions deja además VSCODE_EXECUTABLE en $GITHUB_ENV para que
 * `npm run test:integration` lo use en los pasos siguientes.
 */

const fs = require('node:fs');
const { downloadAndUnzipVSCode } = require('@vscode/test-electron');

downloadAndUnzipVSCode(process.argv[2] || 'stable')
  .then((exe) => {
    console.log(exe);
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `VSCODE_EXECUTABLE=${exe}\n`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
