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
const pkg = require('../package.json');

/**
 * La sección de `version` sin su título. Las capturas y los enlaces del
 * CHANGELOG van con ruta relativa (vsce los cambia para la página de detalles),
 * pero las notas de una release de GitHub no los resuelven: apuntan al tag.
 * @param {string} changelog @param {string} version @param {string} repo URL del repositorio en GitHub
 * @returns {string | null} null si el CHANGELOG no tiene esa versión
 */
function releaseNotes(changelog, version, repo) {
  const start = changelog.indexOf(`## [${version}]`);
  if (start < 0) return null;
  const next = changelog.indexOf('\n## [', start + 1);
  const section = changelog.slice(start, next < 0 ? undefined : next);
  const base = `${repo.replace(/\.git$/, '').replace(/\/$/, '')}`;
  const tag = `v${version}`;
  const relative = (/** @type {string} */ link) => !/^([a-z]+:|#)/i.test(link);
  // Sin la línea del título: la release ya lleva el nombre de la versión.
  return section
    .split('\n')
    .slice(1)
    .join('\n')
    .trim()
    .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (all, bang, text, link) => (relative(link) ? `${bang}[${text}](${base}/${bang ? 'raw' : 'blob'}/${tag}/${link})` : all))
    .replace(/(<img [^>]*src=")([^"]+)"/g, (all, head, link) => (relative(link) ? `${head}${base}/raw/${tag}/${link}"` : all));
}

if (require.main === module) {
  const version = process.argv[2];
  if (!version) {
    console.error('Uso: node scripts/release-notes.js <versión>');
    process.exit(1);
  }
  const notes = releaseNotes(fs.readFileSync(path.resolve(__dirname, '..', 'CHANGELOG.md'), 'utf8'), version, pkg.repository.url);
  if (notes === null) {
    console.error(`El CHANGELOG no tiene la versión ${version}`);
    process.exit(1);
  }
  console.log(notes);
}

module.exports = { releaseNotes };
