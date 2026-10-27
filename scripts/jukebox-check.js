// @ts-check
'use strict';

/**
 * La gramola Songmaster contra el sistema de verdad (los tests unitarios solo
 * comprueban cómo se interpreta la salida de cada sistema):
 *
 *   npm run test:jukebox
 *
 * - Windows: el PowerShell lee la sesión multimedia (y la portada) sin fallar.
 * - macOS: los AppleScript de leer y de los controles compilan con el
 *   diccionario real de Música (y de Spotify, si está instalado) y la lectura
 *   funciona. macOS no da portadas en local.
 * - Linux: gdbus lee los reproductores MPRIS de la sesión.
 *
 * Solo lee: nunca toca la música que estés escuchando. Con `--test-player`
 * (solo Linux; la CI y Docker) arranca un reproductor de prueba (mpv con
 * mpv-mpris, en un D-Bus propio) con una canción y una portada generadas, y
 * comprueba la canción, la portada y que pausar y reanudar funcionan.
 * Necesita mpv, mpv-mpris, ffmpeg, dbus y gdbus (libglib2.0-bin).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { createMusicSource, macReadScript, macCommandScript, macApps } = require('../src/extension/music-source');
const H = require('../src/extension/hover');
const { ciError } = require('./lib/ci');

const TEST_TRACK = { title: 'Take Control', artist: 'Old Gods of Asgard', album: 'Take Control' };
const CI_TITLE = `Songmaster jukebox (${process.platform})`;

/** @param {string} message */
function fail(message) {
  console.error(`✘ ${message}`);
  ciError(CI_TITLE, message);
  process.exitCode = 1;
}

/** @param {() => Promise<boolean>} check @param {number} ms */
async function waitFor(check, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** @template T @param {Promise<T>} p @param {string} what @returns {Promise<T>} */
const inTime = (p, what) =>
  Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what}: sin respuesta en 20 s`)), 20000))]);

/** macOS: cada AppleScript de la gramola compila con el diccionario de la app. */
function compileMacScripts() {
  const apps = macApps({ onlySpotify: false });
  console.log(`Apps de música instaladas: ${apps.join(', ') || 'ninguna'}`);
  if (!apps.includes('Music')) fail('Música (Music.app) no está: viene con macOS');
  const out = path.join(os.tmpdir(), 'bureau-jukebox.scpt');
  /** @type {Array<[string, string]>} */
  const scripts = [['leer', macReadScript(apps)]];
  for (const app of apps) for (const c of /** @type {const} */ (['playPause', 'next', 'previous'])) scripts.push([`${app} ${c}`, macCommandScript(app, c)]);
  for (const [name, script] of scripts) {
    try {
      execFileSync('/usr/bin/osacompile', ['-o', out, '-e', script], { stdio: 'pipe', timeout: 20000 });
      console.log(`✔ AppleScript «${name}» compila`);
    } catch (e) {
      fail(`AppleScript «${name}» no compila: ${String(/** @type {any} */ (e).stderr || e)}`);
    }
  }
  fs.rmSync(out, { force: true });
}

/**
 * Linux: un D-Bus de sesión propio con mpv tocando una canción generada (con
 * etiquetas y `cover.jpg` al lado, que mpv-mpris publica como portada).
 * @returns {() => void} para pararlo
 */
function startTestPlayer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-jukebox-'));
  const ffmpeg = (/** @type {string[]} */ args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  ffmpeg(['-f', 'lavfi', '-i', 'color=c=0xE0352B:s=300x300', '-frames:v', '1', path.join(dir, 'cover.jpg')]);
  ffmpeg([
    '-f', 'lavfi', '-i', 'sine=frequency=220:duration=60', '-c:a', 'libmp3lame', '-b:a', '64k',
    '-metadata', `title=${TEST_TRACK.title}`, '-metadata', `artist=${TEST_TRACK.artist}`, '-metadata', `album=${TEST_TRACK.album}`,
    path.join(dir, 'take-control.mp3'),
  ]);
  const [address, pid] = execFileSync('dbus-daemon', ['--session', '--fork', '--print-address=1', '--print-pid=1'], { encoding: 'utf8' }).trim().split('\n');
  process.env.DBUS_SESSION_BUS_ADDRESS = address.trim();
  const mpv = spawn('mpv', ['--no-terminal', '--ao=null', '--vo=null', '--loop-file=inf', path.join(dir, 'take-control.mp3')], { stdio: 'ignore', env: process.env });
  console.log(`Reproductor de prueba: mpv (pid ${mpv.pid}) en ${process.env.DBUS_SESSION_BUS_ADDRESS}`);
  return () => {
    mpv.kill();
    try {
      process.kill(Number(pid));
    } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
  };
}

async function main() {
  const testPlayer = process.argv.includes('--test-player');
  if (testPlayer && process.platform !== 'linux') throw new Error('--test-player solo funciona en Linux');
  console.log(`Gramola Songmaster en ${process.platform} (${os.release()})`);
  if (process.platform === 'darwin') compileMacScripts();
  const stop = testPlayer ? startTestPlayer() : () => {};
  const source = createMusicSource({ onlySpotify: false });
  try {
    console.log(`Fuente disponible: ${source.available ? 'sí' : 'no'}`);
    if (process.platform !== 'win32' && !source.available) fail('la fuente de música no está disponible');

    /** @type {import('../src/extension/music-parse').Track | null} */
    let track = await inTime(source.read(), 'leer');
    if (testPlayer) {
      await waitFor(async () => (track = await source.read())?.title === TEST_TRACK.title, 15000);
      if (!track) return fail('no se ve el reproductor de prueba');
      for (const key of /** @type {const} */ (['title', 'artist', 'album'])) {
        if (track[key] !== TEST_TRACK[key]) fail(`${key}: «${track[key]}», se esperaba «${TEST_TRACK[key]}»`);
      }
      if (!track.playing) fail('el reproductor de prueba no está sonando');
    }
    console.log(track ? `✔ Suena: ${track.title} — ${track.artist} (${track.album}) en ${track.app}, ${track.playing ? 'sonando' : 'en pausa'}` : '✔ Lectura correcta (no suena nada)');

    const cover = track ? await inTime(source.cover(), 'portada') : null;
    if (cover !== null && !/^data:image\/(png|jpeg|gif|webp|bmp);base64,/.test(cover)) fail(`portada no válida: ${cover.slice(0, 40)}`);
    if (testPlayer && !cover?.startsWith('data:image/jpeg;base64,')) fail('el reproductor de prueba tiene portada (cover.jpg) y no se ha leído');
    if (cover) {
      const md = H.card({ image: cover, imageSize: 80, title: track?.title ?? '', lines: [track?.artist ?? ''] });
      if (md.length > H.MAX_MARKDOWN) fail(`la portada no cabe en el popup (${md.length} caracteres)`);
      console.log(`✔ Portada: ${cover.slice(5, cover.indexOf(';'))}, ${cover.length} caracteres (el popup admite ${H.MAX_MARKDOWN})`);
    } else if (track) console.log('· Sin portada');

    if (testPlayer) {
      await source.command('playPause');
      if (!(await waitFor(async () => (await source.read())?.playing === false, 5000))) fail('pausar no ha pausado el reproductor de prueba');
      else console.log('✔ Pausar');
      await source.command('playPause');
      if (!(await waitFor(async () => (await source.read())?.playing === true, 5000))) fail('reanudar no ha reanudado el reproductor de prueba');
      else console.log('✔ Reanudar');
      await source.command('next');
      await source.command('previous');
      console.log('✔ Siguiente y anterior responden');
    }
  } finally {
    source.dispose();
    stop();
  }
  console.log(process.exitCode ? '✘ Gramola: hay fallos' : '✔ Gramola correcta');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    ciError(CI_TITLE, String(e?.stack || e));
    process.exit(1);
  });
}

// El reproductor de prueba lo usa también la prueba de los popups (scripts/popup-check.js).
module.exports = { startTestPlayer, TEST_TRACK };
