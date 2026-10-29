// @ts-check
'use strict';

/**
 * Lo que comprueba el workflow de release, en tu equipo y antes de subir el
 * tag: si algo falla aquí, fallaría también en GitHub Actions.
 *
 *   npm run release:check                      # todo, con el test de integración
 *   npm run release:check -- --no-integration  # sin abrir VS Code
 *
 * Firmas y vulnerabilidades de las dependencias (npm audit cambia cualquier
 * día aunque no toques nada), la versión con el esquema de la beta, `npm run
 * check`, los archivos generados al día y el test de integración en tu VS Code.
 * Otro sistema (macOS, Linux) no se puede probar aquí: para eso está la
 * candidata (tag vX.Y.Z.rc-N).
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const version = require('../package.json').version;
/** Lo que regenera `npm run generate` (igual que en el workflow). */
const GENERATED = ['themes', 'icons', 'product-icons', 'fonts/prompt', 'media', 'package.json'];

/** @param {string} cmd @param {string[]} args @param {boolean} [capture] */
function run(cmd, args, capture = false) {
  // npm.cmd solo arranca con shell en Windows (Node lo exige desde la 20.12).
  return spawnSync(cmd, args, { cwd: ROOT, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: cmd === npm && process.platform === 'win32' });
}

/** Los cambios sin commit en lo generado (los tuyos pueden estar, pero `generate` no debe añadir más). */
const generatedDiff = () => run('git', ['diff', '--', ...GENERATED], true).stdout;

/** @type {Array<[string, () => boolean]>} */
const steps = [
  ['Dependencias firmadas por el registro', () => run(npm, ['audit', 'signatures']).status === 0],
  ['Dependencias sin vulnerabilidades conocidas (si falla: npm audit fix)', () => run(npm, ['audit', '--audit-level=moderate']).status === 0],
  ['La versión sigue el esquema de la beta', () => run(process.execPath, ['scripts/version.js', '--check', version]).status === 0],
  ['npm run check', () => run(npm, ['run', 'check']).status === 0],
  [
    'Los archivos generados están al día (si falla: npm run generate y commit)',
    () => {
      const before = generatedDiff();
      return run(npm, ['run', 'generate']).status === 0 && generatedDiff() === before;
    },
  ],
];
if (!process.argv.includes('--no-integration')) steps.push(['Test de integración en VS Code', () => run(npm, ['run', 'test:integration']).status === 0]);

for (const [name, check] of steps) {
  console.log(`\n▶ ${name}`);
  if (!check()) {
    console.error(`\n✘ ${name}: falla. Arréglalo antes de subir el tag.`);
    process.exit(1);
  }
}
console.log(`\n✔ ${version} pasa en este equipo lo que comprueba el workflow de release. Lo de los otros sistemas, con una candidata (vX.Y.Z.rc-N).`);
