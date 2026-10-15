// @ts-check
'use strict';

/**
 * Instala las fuentes incluidas SOLO PARA EL USUARIO ACTUAL (sin permisos de
 * administrador), porque VS Code no puede cargar fuentes desde una extensión:
 * el editor solo usa fuentes instaladas en el sistema.
 *
 *   Windows → %LOCALAPPDATA%\Microsoft\Windows\Fonts + registro HKCU
 *   macOS   → ~/Library/Fonts
 *   Linux   → ~/.local/share/fonts/bureau-theme (+ fc-cache)
 *
 * Todo se puede deshacer con `uninstallFonts` (comando «Quitar las tipografías
 * instaladas»). Las rutas son fijas: nunca se escribe donde diga un ajuste.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { registryName } = require('./fontsets');

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';

/**
 * @typedef {{platform?: NodeJS.Platform, fontsDir?: string, run?: (cmd: string, args: string[]) => {status: number | null}, fcCache?: string | null}} InstallerOptions
 *   `fontsDir`, `run` y `fcCache` existen para los tests (carpeta temporal y comandos falsos).
 */

/** fc-cache con ruta absoluta (nunca uno de la carpeta del proyecto abierto), o null si no hay. */
function fcCachePath() {
  const { which, systemPath } = require('./player');
  return which('fc-cache', systemPath());
}

/** ¿Tienen los dos archivos el mismo contenido? @param {string} a @param {string} b */
function sameFile(a, b) {
  try {
    return fs.statSync(a).size === fs.statSync(b).size && fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

/** Carpeta de fuentes del usuario según el sistema. */
function userFontsDir(platform = process.platform) {
  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(local, 'Microsoft', 'Windows', 'Fonts');
  }
  if (platform === 'darwin') return path.join(os.homedir(), 'Library', 'Fonts');
  return path.join(os.homedir(), '.local', 'share', 'fonts', 'bureau-theme');
}

/** @param {string} cmd @param {string[]} args */
const defaultRun = (cmd, args) => spawnSync(cmd, args, { stdio: 'ignore', windowsHide: true });

function regExe() {
  return path.join(process.env.SystemRoot || process.env.windir || 'C:\\Windows', 'System32', 'reg.exe');
}

/**
 * Copia las fuentes y las registra. Devuelve las rutas instaladas.
 * @param {string} fontsRoot carpeta `fonts/` de la extensión
 * @param {Array<{file: string, family: string, style: string}>} files
 * @param {InstallerOptions} [o]
 */
function installFonts(fontsRoot, files, o = {}) {
  const platform = o.platform ?? process.platform;
  const dir = o.fontsDir ?? userFontsDir(platform);
  const run = o.run ?? defaultRun;
  fs.mkdirSync(dir, { recursive: true });

  /** @type {string[]} */
  const installed = [];
  for (const f of files) {
    const src = path.join(fontsRoot, f.file);
    const dest = path.join(dir, `BureauTheme-${path.basename(f.file)}`);
    // Se compara el contenido, no solo el tamaño: una versión nueva de la fuente siempre se copia.
    if (!sameFile(src, dest)) fs.copyFileSync(src, dest);
    if (platform === 'win32') {
      const r = run(regExe(), ['add', REG_KEY, '/v', registryName(f), '/t', 'REG_SZ', '/d', dest, '/f']);
      if (r.status !== 0) throw new Error(`No se pudo registrar ${registryName(f)} en Windows`);
    }
    installed.push(dest);
  }
  refreshFontCache(platform, dir, run, o);
  return installed;
}

/**
 * Borra las fuentes instaladas por la extensión.
 * @param {Array<{file: string, family: string, style: string}>} files
 * @param {InstallerOptions} [o]
 */
function uninstallFonts(files, o = {}) {
  const platform = o.platform ?? process.platform;
  const dir = o.fontsDir ?? userFontsDir(platform);
  const run = o.run ?? defaultRun;
  let removed = 0;
  for (const f of files) {
    const dest = path.join(dir, `BureauTheme-${path.basename(f.file)}`);
    if (platform === 'win32') run(regExe(), ['delete', REG_KEY, '/v', registryName(f), '/f']);
    try {
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { force: true });
        removed++;
      }
    } catch {
      // Windows puede tener la fuente abierta hasta reiniciar: se queda para la próxima vez.
    }
  }
  refreshFontCache(platform, dir, run, o);
  return removed;
}

/**
 * En Linux, avisa a fontconfig de las fuentes nuevas.
 * @param {NodeJS.Platform} platform @param {string} dir
 * @param {NonNullable<InstallerOptions['run']>} run @param {InstallerOptions} o
 */
function refreshFontCache(platform, dir, run, o) {
  if (platform !== 'linux') return;
  const bin = o.fcCache === undefined ? fcCachePath() : o.fcCache;
  if (bin) run(bin, ['-f', dir]);
}

module.exports = { installFonts, uninstallFonts, userFontsDir, REG_KEY };
