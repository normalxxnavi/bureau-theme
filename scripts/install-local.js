// @ts-check
'use strict';

/**
 * Empaqueta la extensión y la instala en TU VS Code, sin publicar nada.
 *
 *   npm run install:local
 *
 * Después, en VS Code: Ctrl+Shift+P → «Developer: Reload Window» y elige el
 * tema con Ctrl+K Ctrl+T. Repite el comando cada vez que cambies algo.
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const pkg = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const vsix = path.join(ROOT, `${pkg.name}-${pkg.version}.vsix`);

/** @param {string} cmd @param {string[]} args */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1) Empaquetar (antes ejecuta build, contraste y tests: vscode:prepublish).
run(process.execPath, [path.join(ROOT, 'node_modules', '@vscode', 'vsce', 'vsce'), 'package', '--out', vsix]);

// 2) Instalar o reinstalar en el VS Code del usuario. En Windows `code` es un .cmd.
if (process.platform === 'win32') run('cmd.exe', ['/d', '/c', 'code', '--install-extension', vsix, '--force']);
else run('code', ['--install-extension', vsix, '--force']);

console.log('\n✔ Instalada. En VS Code: Ctrl+Shift+P → «Developer: Reload Window» y luego Ctrl+K Ctrl+T para elegir el tema.');
