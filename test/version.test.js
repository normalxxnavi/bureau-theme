'use strict';

/**
 * Versionado de la beta (scripts/version.js): 0.<intento>.<intento><DDMMAAAA>.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { betaVersion, versionProblem, retitle, nextRcTag, MAX_PART } = require('../scripts/version');

test('el parche es el intento seguido de la fecha DDMMAAAA', () => {
  assert.equal(betaVersion(7, { day: 16, month: 10, year: 2026 }), '0.7.716102026');
  assert.equal(betaVersion(8, { day: 5, month: 1, year: 2027 }), '0.8.805012027', 'día y mes con cero delante');
  assert.equal(betaVersion(12, { day: 1, month: 12, year: 2026 }), '0.12.1201122026');
  assert.equal(betaVersion(21, { day: 31, month: 12, year: 2099 }), '0.21.2131122099', 'el intento 21 cabe con cualquier fecha');
  assert.throws(() => betaVersion(22, { day: 1, month: 1, year: 2027 }), new RegExp(String(MAX_PART)));
  assert.throws(() => betaVersion(7, { day: 31, month: 2, year: 2026 }), /no existe/);
  assert.throws(() => betaVersion(0, { day: 16, month: 10, year: 2026 }), /intento/);
});

test('el workflow de release solo acepta versiones con el esquema (hasta la 1.0.0)', () => {
  assert.equal(versionProblem('0.7.716102026'), null);
  assert.equal(versionProblem('0.10.1005112026'), null);
  assert.equal(versionProblem('1.0.0'), null, 'desde la 1.0.0 el esquema ya no se aplica');
  assert.equal(versionProblem('1.2.3'), null);
  assert.match(String(versionProblem('0.7.0')), /intento \(7\) seguido de la fecha/);
  assert.match(String(versionProblem('0.7.816102026')), /intento \(7\)/, 'el parche empieza por otro intento');
  assert.match(String(versionProblem('0.7.71610202')), /DDMMAAAA/, 'faltan cifras');
  assert.match(String(versionProblem('0.7.731022026')), /no existe/, '31 de febrero');
  assert.match(String(versionProblem('0.7.7-16102026')), /X\.Y\.Z/);
  assert.match(String(versionProblem('0.7.716/10/2026')), /X\.Y\.Z/);
});

test('CHANGELOG: «Unreleased» pasa a ser la versión, y una versión aún sin tag se vuelve a fechar', () => {
  const log = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- x\n\n## [0.6.0] — 2026-10-15\n';
  const v7 = retitle(log, '## [0.7.716102026] — 2026-10-16', null);
  assert.equal(v7, log.replace('## [Unreleased]', '## [0.7.716102026] — 2026-10-16'));
  const redated = retitle(v7, '## [0.7.717102026] — 2026-10-17', '0.7.716102026');
  assert.equal(redated, log.replace('## [Unreleased]', '## [0.7.717102026] — 2026-10-17'));
  assert.ok(redated.includes('## [0.6.0] — 2026-10-15'), 'las versiones publicadas no se tocan');
  assert.throws(() => retitle(v7, '## [0.8.817102026] — 2026-10-17', null), /Unreleased/);
});

test('candidatas: vX.Y.Z.rc-1, .rc-2… para cada versión', () => {
  assert.equal(nextRcTag('0.7.720102026', []), 'v0.7.720102026.rc-1');
  assert.equal(nextRcTag('0.7.720102026', ['v0.7.720102026.rc-1', 'v0.7.720102026.rc-3']), 'v0.7.720102026.rc-4');
});
