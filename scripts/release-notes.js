// @ts-check
'use strict';

/**
 * Imprime la sección del CHANGELOG de una versión (para las notas de la
 * release de GitHub).
 *
 *   node scripts/release-notes.js 0.8.0
 */

const fs = require('node:fs');
const path = require('node:path');

const version = process.argv[2];
if (!version) {
  console.error('Uso: node scripts/release-notes.js <versión>');
  process.exit(1);
}
const changelog = fs.readFileSync(path.resolve(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) {
  console.error(`El CHANGELOG no tiene la versión ${version}`);
  process.exit(1);
}
const next = changelog.indexOf('\n## [', start + 1);
const section = changelog.slice(start, next < 0 ? undefined : next);
// Sin la línea del título: la release ya lleva el nombre de la versión.
console.log(section.split('\n').slice(1).join('\n').trim());
