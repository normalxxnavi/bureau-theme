// @ts-check
'use strict';

/**
 * Versión de la beta (hasta la 1.0.0): 0.<intento>.<intento><DDMMAAAA>.
 *
 * El número menor cuenta los intentos de subida (cada tag de versión; sigue
 * desde la 0.6.0) y el de parche es ese mismo número seguido de la fecha de la
 * subida, sin barras (una versión solo admite números): el intento 7 el
 * 16/10/2026 es la 0.7.716102026. Por precaución, el parche no pasa de
 * 2 147 483 647 (el mayor entero de 32 bits): no está confirmado que el
 * Marketplace admita más. Con todas las fechas cabe hasta el intento 21.
 *
 *   npm run version:next                                  # siguiente intento, con la fecha de hoy
 *   npm run version:next -- --dry-run                     # solo la enseña
 *   npm run version:next -- --attempt 8 --date 17/10/2026
 *   node scripts/version.js --check 0.7.716102026         # (workflow de release)
 *
 * Sin --dry-run escribe la versión en package.json y package-lock.json y cambia
 * «## [Unreleased]» del CHANGELOG.md por «## [versión] — AAAA-MM-DD». Si no hay
 * «Unreleased» pero la versión de package.json aún no tiene tag, vuelve a
 * fechar esa sección (la versión se deja puesta en develop al acabar cada
 * ronda, y la subida puede ser otro día).
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_PART = 2_147_483_647;

/** @typedef {{ day: number, month: number, year: number }} Day */

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/** @param {Day} d */
function isDay({ day, month, year }) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 9999 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * @param {number} attempt
 * @param {Day} d
 */
function betaVersion(attempt, d) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error(`El intento tiene que ser un número entero desde 1 (no ${attempt})`);
  if (!isDay(d)) throw new Error(`La fecha ${d.day}/${d.month}/${d.year} no existe`);
  const patch = `${attempt}${pad(d.day)}${pad(d.month)}${d.year}`;
  if (Number(patch) > MAX_PART) throw new Error(`0.${attempt}.${patch}: el parche pasa de ${MAX_PART}, y no está confirmado que el Marketplace lo admita`);
  return `0.${attempt}.${patch}`;
}

/**
 * Por qué una versión no sigue el esquema de la beta, o null si lo sigue.
 * Desde la 1.0.0 el esquema ya no se aplica.
 * @param {string} version
 */
function versionProblem(version) {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!m) return `${version} no es X.Y.Z con números`;
  const [, major, attempt, patch] = m;
  if (major !== '0') return null;
  const date = patch.slice(attempt.length);
  if (!patch.startsWith(attempt) || !/^\d{8}$/.test(date)) return `${version}: el parche tiene que ser el intento (${attempt}) seguido de la fecha DDMMAAAA`;
  const day = { day: Number(date.slice(0, 2)), month: Number(date.slice(2, 4)), year: Number(date.slice(4)) };
  try {
    betaVersion(Number(attempt), day);
  } catch (err) {
    return `${version}: ${/** @type {Error} */ (err).message}`;
  }
  return null;
}

/** @param {string} pattern */
const tags = (pattern) => execFileSync('git', ['tag', '--list', pattern], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((t) => t.trim()).filter(Boolean);

/** El último intento subido: el mayor número menor de los tags v0.*. */
function lastAttempt() {
  const attempts = tags('v0.*').map((t) => /^v0\.(\d+)\.\d+$/.exec(t)?.[1]).filter((a) => a !== undefined);
  return Math.max(0, ...attempts.map(Number));
}

/**
 * Pone el título de la versión en el CHANGELOG: en «## [Unreleased]» o, si no
 * lo hay, en la sección de `pending` (una versión puesta antes y aún sin tag).
 * @param {string} changelog
 * @param {string} title «## [0.7.716102026] — 2026-10-16»
 * @param {string | null} pending
 */
function retitle(changelog, title, pending) {
  for (const name of ['Unreleased', pending]) {
    const start = name === null ? -1 : changelog.indexOf(`\n## [${name}]`);
    if (start < 0) continue;
    const end = changelog.indexOf('\n', start + 1);
    return changelog.slice(0, start + 1) + title + (end < 0 ? '' : changelog.slice(end));
  }
  throw new Error(`El CHANGELOG.md no tiene la sección «## [Unreleased]»${pending ? ` ni la de la ${pending}` : ''}`);
}

/** @param {string} text */
function parseDay(text) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!m) throw new Error(`--date va como DD/MM/AAAA (no ${text})`);
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}

/**
 * @param {string} version
 * @param {Day} d
 */
function write(version, d) {
  const files = {
    pkg: path.join(ROOT, 'package.json'),
    lock: path.join(ROOT, 'package-lock.json'),
    changelog: path.join(ROOT, 'CHANGELOG.md'),
  };
  const pkgText = fs.readFileSync(files.pkg, 'utf8');
  const pkg = pkgText.replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${version}"`);
  const lock = JSON.parse(fs.readFileSync(files.lock, 'utf8'));
  lock.version = version;
  lock.packages[''].version = version;
  const changelog = fs.readFileSync(files.changelog, 'utf8');
  const current = JSON.parse(pkgText).version;
  const pending = changelog.includes('\n## [Unreleased]') || tags(`v${current}`).length ? null : current;
  const nextChangelog = retitle(changelog, `## [${version}] — ${d.year}-${pad(d.month)}-${pad(d.day)}`, pending);
  // Todo se comprueba antes de escribir: o cambian los tres archivos o ninguno.
  fs.writeFileSync(files.pkg, pkg);
  fs.writeFileSync(files.lock, `${JSON.stringify(lock, null, 2)}\n`);
  fs.writeFileSync(files.changelog, nextChangelog);
}

function main() {
  const args = process.argv.slice(2);
  /** @param {string} name */
  const option = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1] ?? '';
  };
  const check = option('--check');
  if (check !== undefined) {
    const problem = versionProblem(check);
    if (problem) throw new Error(problem);
    console.log(`${check} sigue el versionado de la beta`);
    return;
  }
  const attemptArg = option('--attempt');
  const attempt = attemptArg === undefined ? lastAttempt() + 1 : Number(attemptArg);
  const dateArg = option('--date');
  const now = new Date();
  const d = dateArg === undefined ? { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() } : parseDay(dateArg);
  const version = betaVersion(attempt, d);
  if (args.includes('--dry-run')) {
    console.log(version);
    return;
  }
  write(version, d);
  console.log(`Versión ${version}: package.json, package-lock.json y CHANGELOG.md actualizados`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(/** @type {Error} */ (err).message);
    process.exitCode = 1;
  }
}

module.exports = { betaVersion, versionProblem, retitle, MAX_PART };
