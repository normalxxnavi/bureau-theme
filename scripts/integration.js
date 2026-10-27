// @ts-check
'use strict';

/**
 * Lanza el test de integración (test/integration) en tu VS Code instalado,
 * pero con un perfil TEMPORAL y aislado: no toca tus ajustes ni tus
 * extensiones, y trabaja sobre una copia temporal de test-workspace.
 *
 *   npm run test:integration
 *
 * Se abre una ventana de VS Code durante unos segundos y se cierra sola.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { codeExecutable } = require('./lib/vscode-install');
const { ciError } = require('./lib/ci');

const CI_TITLE = `Integration test (${process.platform})`;

const ROOT = path.resolve(__dirname, '..');

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-it-'));
  const workspace = path.join(tmp, 'workspace');
  fs.cpSync(path.join(ROOT, 'test-workspace'), workspace, {
    recursive: true,
    filter: (src) => !/[\\/](bin|obj)([\\/]|$)/.test(src),
  });
  const report = path.join(tmp, 'report.txt');

  // La copia es su propio repositorio de Git (temporal) para probar el sonido
  // de commit sin tocar el repositorio del proyecto.
  const git = (/** @type {string[]} */ ...a) => execFileSync('git', a, { cwd: workspace, stdio: 'ignore' });
  try {
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'Integration Test');
    git('config', 'user.email', 'integration@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    git('add', '-A');
    git('commit', '-q', '-m', 'Estado inicial');
  } catch {
    console.warn('⚠ git no está disponible: se omitirá el paso del commit');
  }

  const args = [
    `--user-data-dir=${path.join(tmp, 'user-data')}`,
    `--extensions-dir=${path.join(tmp, 'extensions')}`,
    '--disable-extensions',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-telemetry',
    '--new-window',
    `--extensionDevelopmentPath=${ROOT}`,
    `--extensionTestsPath=${path.join(ROOT, 'test', 'integration', 'index.js')}`,
    workspace,
  ];
  // Linux en la CI: Ubuntu 24.04 no deja a Electron crear su sandbox (AppArmor
  // limita los user namespaces) y la pantalla virtual (xvfb) no tiene GPU.
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox', '--disable-gpu');

  // Variables heredadas de la terminal integrada de VS Code que harían que el
  // ejecutable se comportara como Node o se conectara a la ventana actual.
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, BUREAU_INTEGRATION_REPORT: report };
  for (const k of Object.keys(env)) if (k === 'ELECTRON_RUN_AS_NODE' || k.startsWith('VSCODE_')) delete env[k];

  const exe = codeExecutable();
  console.log(`Lanzando ${exe}\n  perfil temporal: ${tmp}`);
  const child = spawn(exe, args, { env, stdio: 'inherit' });
  const timer = setTimeout(() => {
    console.error('✘ Tiempo agotado (4 min)');
    ciError(CI_TITLE, 'Tiempo agotado (4 min)');
    child.kill();
  }, 240000);
  child.on('exit', (code) => {
    clearTimeout(timer);
    const lines = fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : '';
    if (lines) console.log(lines);
    if (code !== 0) {
      console.log(`✘ Test de integración fallido (código ${code}). Logs: ${path.join(tmp, 'user-data', 'logs')}`);
      const failed = lines.split('\n').filter((l) => l.trim().startsWith('✘'));
      ciError(CI_TITLE, failed.length ? failed.map((l) => l.trim()).join('\n') : `VS Code salió con el código ${code}${lines ? '' : ' sin escribir el informe'}`);
      process.exit(code ?? 1);
    }
    console.log('✔ Test de integración superado');
    try {
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // VS Code puede tardar en soltar algún archivo; es una carpeta temporal.
    }
    process.exit(0);
  });
}

main();
