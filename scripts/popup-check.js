// @ts-check
'use strict';

/**
 * Los popups con diseño en un VS Code de verdad (hover.js solo se prueba con
 * tests unitarios y el sanitizador copiado de VS Code):
 *
 *   npm run test:popups                   # la Casa Inmemorial
 *   npm run test:popups -- --test-player  # y la gramola con el reproductor de prueba (solo Linux)
 *
 * Arranca VS Code con un perfil temporal y el puerto de depuración de
 * Chromium, pone el ratón (virtual, sin mover el tuyo) sobre la Casa
 * Inmemorial y, con `--test-player`, sobre la gramola, y comprueba que el
 * popup sale con su texto y su imagen cargada. Guarda una captura de cada uno
 * en .popup-check/ (en la CI, en los artefactos del run).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { codeExecutable } = require('./lib/vscode-install');
const { ciError } = require('./lib/ci');
const { connect } = require('./screenshots/cdp');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.popup-check');
const PORT = 9339;
const CI_TITLE = `Popups (${process.platform})`;

/** Por dónde va la comprobación: si se agota el tiempo, el error lo dice. */
let phase = 'arrancando';

/** @param {string} message */
function fail(message) {
  console.error(`✘ ${message}`);
  ciError(CI_TITLE, message);
  process.exitCode = 1;
}

async function main() {
  const testPlayer = process.argv.includes('--test-player');
  if (testPlayer && process.platform !== 'linux') throw new Error('--test-player solo funciona en Linux');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  // El reproductor va antes que VS Code: los dos tienen que estar en el mismo D-Bus.
  const { startTestPlayer, TEST_TRACK } = require('./jukebox-check');
  const stopPlayer = testPlayer ? startTestPlayer() : () => {};

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-popups-'));
  const userData = path.join(tmp, 'user-data');
  fs.mkdirSync(path.join(userData, 'User'), { recursive: true });
  const settings = {
    'bureauTheme.music.enabled': testPlayer,
    'workbench.startupEditor': 'none',
    'workbench.tips.enabled': false,
    'update.mode': 'none',
    'telemetry.telemetryLevel': 'off',
    'chat.disableAIFeatures': true,
    'security.workspace.trust.enabled': false,
  };
  fs.writeFileSync(path.join(userData, 'User', 'settings.json'), JSON.stringify(settings, null, 2));
  const args = [
    `--user-data-dir=${userData}`,
    // Carpeta de extensiones vacía (sin --disable-extensions: su aviso taparía la barra de estado).
    `--extensions-dir=${path.join(tmp, 'extensions')}`,
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-telemetry',
    '--new-window',
    `--extensionDevelopmentPath=${ROOT}`,
    `--remote-debugging-port=${PORT}`,
    // Sin pantalla de verdad (los runners de la CI), Chromium da la ventana por
    // tapada y deja de pintarla: ni el ratón virtual ni las capturas avanzarían.
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ];
  // Igual que el test de integración: en Linux de la CI, sin sandbox ni GPU.
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox', '--disable-gpu');
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k === 'ELECTRON_RUN_AS_NODE' || k.startsWith('VSCODE_')) delete env[k];
  const exe = codeExecutable();
  console.log(`Lanzando ${exe}`);
  const code = spawn(exe, args, { env, stdio: 'ignore', detached: process.platform !== 'win32' });

  /** @type {Awaited<ReturnType<typeof connect>> | undefined} */
  let cdp;
  try {
    phase = 'conectando con la ventana de VS Code';
    cdp = await connect(PORT, 90000);
    /** @type {Array<{id: string, file: string, expect: string[]}>} */
    const checks = [{ id: 'bureauTheme.panel', file: 'oldest-house.png', expect: ['The Oldest House'] }];
    if (testPlayer) checks.push({ id: 'bureauTheme.music', file: 'jukebox.png', expect: [TEST_TRACK.title, TEST_TRACK.artist, TEST_TRACK.album] });
    for (const c of checks) {
      try {
        phase = `el ratón sobre ${c.id}`;
        await cdp.hoverStatusItem(c.id, 60000);
        phase = `leyendo el popup de ${c.id}`;
        const p = await cdp.popup();
        phase = `captura del popup de ${c.id}`;
        await cdp.screenshot(path.join(OUT, c.file));
        for (const text of c.expect) if (!p.text.includes(text)) fail(`${c.id}: el popup no dice «${text}»`);
        if (!p.images || p.loaded !== p.images) fail(`${c.id}: ${p.loaded} de ${p.images} imágenes cargadas`);
        if (!process.exitCode) console.log(`✔ Popup de ${c.id}: ${p.text.split('\n').filter(Boolean).slice(0, 3).join(' · ')} (${p.images} imagen)`);
      } catch (e) {
        await cdp.screenshot(path.join(OUT, `error-${c.file}`)).catch(() => {});
        fail(`${c.id}: ${/** @type {Error} */ (e).message}`);
      }
    }
  } finally {
    phase = 'cerrando VS Code';
    cdp?.close();
    try {
      // SIGKILL: en macOS VS Code no siempre se cierra con SIGTERM, y la comprobación se quedaba esperándolo.
      if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(code.pid), '/T', '/F'], { stdio: 'ignore' });
      else if (code.pid) process.kill(-code.pid, 'SIGKILL');
    } catch {}
    code.unref();
    stopPlayer();
  }
  console.log(process.exitCode ? '✘ Popups: hay fallos' : `✔ Popups correctos (capturas en ${OUT})`);
}

// Pase lo que pase, la comprobación termina: un VS Code que no contesta no puede dejar la CI parada.
const WATCHDOG_MS = 5 * 60_000;
setTimeout(() => {
  fail(`la comprobación no ha terminado en ${WATCHDOG_MS / 60_000} minutos (iba por: ${phase})`);
  process.exit(1);
}, WATCHDOG_MS).unref();

// Al acabar se sale ya, sin esperar a los procesos de VS Code que queden.
main().then(
  () => process.exit(process.exitCode ?? 0),
  (e) => {
    console.error(e);
    ciError(CI_TITLE, String(e?.stack || e));
    process.exit(1);
  }
);
