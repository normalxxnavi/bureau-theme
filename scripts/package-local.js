// @ts-check
'use strict';

/**
 * Empaqueta la extensión en bureau-theme-<versión>.vsix, en la raíz del repositorio,
 * y borra los .vsix de otras versiones para que el que haya esté siempre al día.
 *
 *   npm run package
 *
 * `npm run check` y `npm run generate` lo ejecutan al terminar. En la CI no hace
 * nada: el flujo de release empaqueta su propio .vsix con las URL de la versión.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const pkg = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const VSIX = path.join(ROOT, `${pkg.name}-${pkg.version}.vsix`);

/** Empaqueta (antes vsce ejecuta build, contraste y tests: vscode:prepublish). @returns {string} la ruta del .vsix */
function packageVsix() {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', '@vscode', 'vsce', 'vsce'), 'package', '--out', VSIX], { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
  for (const f of fs.readdirSync(ROOT)) {
    if (f.startsWith(`${pkg.name}-`) && f.endsWith('.vsix') && path.join(ROOT, f) !== VSIX) {
      fs.rmSync(path.join(ROOT, f));
      console.log(`Borrado el paquete de otra versión: ${f}`);
    }
  }
  return VSIX;
}

if (require.main === module) {
  if (process.env.CI) console.log('CI: no se empaqueta el .vsix local (lo hace el flujo de release).');
  else packageVsix();
}

module.exports = { packageVsix };
