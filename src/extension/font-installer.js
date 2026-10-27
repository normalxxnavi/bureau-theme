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

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { FONT_SETS, registryName } = require('./fontsets');
const { PROMPT_FONT } = require('./prompt-config');

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';

/**
 * @typedef {{platform?: NodeJS.Platform, fontsDir?: string, run?: (cmd: string, args: string[]) => {status: number | null}, fcCache?: string | null, copy?: (src: string, dest: string) => void}} InstallerOptions
 *   `fontsDir`, `run`, `fcCache` y `copy` existen para los tests (carpeta temporal, comandos falsos y una fuente abierta).
 */

/** Huella corta del contenido de un archivo. @param {string} file */
function fingerprint(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

/** @param {string} s */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Las copias instaladas de una fuente: la de siempre y las que se pusieron al
 * lado, con su huella en el nombre, porque Windows tenía abierta la anterior.
 * @param {string} dir @param {{file: string}} f
 */
function installedCopies(dir, f) {
  const { name, ext } = path.parse(`BureauTheme-${path.basename(f.file)}`);
  const re = new RegExp(`^${escapeRegExp(name)}(\\.[0-9a-f]{8})?${escapeRegExp(ext)}$`, 'i');
  try {
    return fs
      .readdirSync(dir)
      .filter((n) => re.test(n))
      .map((n) => path.join(dir, n));
  } catch {
    return [];
  }
}

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
  const copy = o.copy ?? fs.copyFileSync;
  fs.mkdirSync(dir, { recursive: true });

  /** @type {string[]} */
  const installed = [];
  for (const f of files) {
    const src = path.join(fontsRoot, f.file);
    let dest = path.join(dir, `BureauTheme-${path.basename(f.file)}`);
    // Se compara el contenido, no solo el tamaño: una versión nueva de la fuente siempre se copia.
    if (!sameFile(src, dest)) {
      try {
        copy(src, dest);
      } catch (err) {
        // Windows no deja reemplazar una fuente abierta (la terminal la está
        // usando): la nueva va al lado, con su huella en el nombre.
        if (platform !== 'win32') throw err;
        const { name, ext } = path.parse(dest);
        dest = path.join(dir, `${name}.${fingerprint(src)}${ext}`);
        if (!sameFile(src, dest)) copy(src, dest);
      }
    }
    if (platform === 'win32') {
      const r = run(regExe(), ['add', REG_KEY, '/v', registryName(f), '/t', 'REG_SZ', '/d', dest, '/f']);
      if (r.status !== 0) throw new Error(`No se pudo registrar ${registryName(f)} en Windows`);
    }
    for (const old of installedCopies(dir, f)) {
      if (old === dest) continue;
      try {
        fs.rmSync(old, { force: true });
      } catch {
        // Aún abierta: se borra en otra ocasión.
      }
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
    if (platform === 'win32') run(regExe(), ['delete', REG_KEY, '/v', registryName(f), '/f']);
    for (const dest of installedCopies(dir, f)) {
      try {
        fs.rmSync(dest, { force: true });
        removed++;
      } catch {
        // Windows puede tener la fuente abierta hasta reiniciar: se queda para la próxima vez.
      }
    }
  }
  refreshFontCache(platform, dir, run, o);
  return removed;
}

/**
 * Borra las fuentes de todos los juegos y la de iconos de la terminal Bureau
 * (comando «Quitar las tipografías instaladas» y script de desinstalación,
 * src/extension/uninstall.js).
 * @param {InstallerOptions & {keepPromptIcons?: boolean}} [o] keepPromptIcons: con la terminal Bureau encendida, su fuente se queda
 */
function uninstallAllFonts(o = {}) {
  let removed = 0;
  for (const set of Object.values(FONT_SETS)) removed += uninstallFonts(set.files, o);
  if (!o.keepPromptIcons) removed += uninstallFonts([PROMPT_FONT], o);
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

module.exports = { installFonts, uninstallFonts, uninstallAllFonts, userFontsDir, fingerprint, REG_KEY };
