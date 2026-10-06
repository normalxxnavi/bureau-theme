// @ts-check
'use strict';

/**
 * Comprueba que cada clave de color de los temas existe en la instalación
 * local de VS Code. Una clave mal escrita no da error: VS Code simplemente la
 * ignora, así que hay que buscarla a propósito.
 *
 *   npm run validate
 *   VSCODE_PATH="C:\ruta\a\Microsoft VS Code" npm run validate
 *
 * También detecta claves duplicadas en src/theme/workbench.js (en un objeto JS
 * la segunda gana sin avisar).
 */

const fs = require('node:fs');
const path = require('node:path');
const { palettes, buildTheme, ROOT } = require('../src/theme/build');
const { findAppRoot } = require('./lib/vscode-install');

function checkDuplicateKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'theme', 'workbench.js'), 'utf8');
  /** @type {Map<string, number>} */
  const seen = new Map();
  const dups = [];
  for (const m of src.matchAll(/^\s*'([\w.-]+)':/gm)) {
    const key = m[1];
    seen.set(key, (seen.get(key) || 0) + 1);
    if (seen.get(key) === 2) dups.push(key);
  }
  return dups;
}

/** Colores que aportan las extensiones integradas (gitDecoration.*, por ejemplo). */
function contributedColors(/** @type {string} */ appRoot) {
  const dir = path.join(appRoot, 'extensions');
  const ids = new Set();
  for (const ext of fs.readdirSync(dir)) {
    const manifest = path.join(dir, ext, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    for (const c of JSON.parse(fs.readFileSync(manifest, 'utf8')).contributes?.colors ?? []) ids.add(c.id);
  }
  return ids;
}

function main() {
  let failed = false;

  const dups = checkDuplicateKeys();
  if (dups.length) {
    failed = true;
    console.error(`✘ Claves duplicadas en workbench.js: ${dups.join(', ')}`);
  } else {
    console.log('✔ Sin claves duplicadas en workbench.js');
  }

  const appRoot = findAppRoot();
  if (!appRoot) {
    console.warn('⚠ No se encontró la instalación de VS Code. Define VSCODE_PATH para validar las claves.');
    process.exit(failed ? 1 : 0);
  }
  const bundle = fs.readFileSync(path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'), 'utf8');
  const contributed = contributedColors(appRoot);
  const version = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).version;
  console.log(`  VS Code ${version}: ${appRoot}`);

  const keys = Object.keys(buildTheme(palettes[0]).colors);
  const unknown = keys.filter((k) => !contributed.has(k) && !bundle.includes(`"${k}"`));
  if (unknown.length) {
    failed = true;
    console.error(`✘ ${unknown.length} claves de color que esta versión de VS Code no conoce:`);
    for (const k of unknown) console.error(`    ${k}`);
  } else {
    console.log(`✔ Las ${keys.length} claves de color existen en VS Code`);
  }

  process.exit(failed ? 1 : 0);
}

main();
