// @ts-check
'use strict';

/**
 * Catálogo de sonidos: qué archivo usa cada evento y su prioridad.
 *
 * Los identificadores coinciden con los ajustes `bureauTheme.sounds.events.<id>`
 * de package.json (un test lo comprueba). La prioridad decide qué pasa si dos
 * sonidos llegan casi a la vez: uno más importante puede interrumpir a uno
 * menos importante aunque no haya pasado el cooldown.
 */

/** @typedef {'startup'|'themeActivated'|'save'|'typing'|'newError'|'allClear'|'buildSuccess'|'buildFail'|'terminalFail'|'debugStart'|'breakpoint'|'gitCommit'} SoundEvent */
/** @typedef {'control'|'resonant'} Pack */

/**
 * `variants`: archivos alternativos `nombre-2.wav`, `nombre-3.wav`… que se eligen al azar.
 * @type {Record<SoundEvent, {file: string, priority: number, variants?: number}>}
 */
const SOUNDS = {
  startup: { file: 'startup.wav', priority: 3 },
  themeActivated: { file: 'theme.wav', priority: 3 },
  save: { file: 'save.wav', priority: 1 },
  // Al escribir: el más discreto, nunca interrumpe a otro sonido (ver SoundController.onTyping).
  typing: { file: 'typing.wav', priority: 0, variants: 3 },
  newError: { file: 'error.wav', priority: 5 },
  allClear: { file: 'clear.wav', priority: 4 },
  buildSuccess: { file: 'build-ok.wav', priority: 4 },
  buildFail: { file: 'build-fail.wav', priority: 5 },
  terminalFail: { file: 'terminal-fail.wav', priority: 3 },
  debugStart: { file: 'debug.wav', priority: 3 },
  breakpoint: { file: 'breakpoint.wav', priority: 2 },
  gitCommit: { file: 'commit.wav', priority: 3 },
};

/** @type {SoundEvent[]} */
const EVENTS = /** @type {SoundEvent[]} */ (Object.keys(SOUNDS));

/** @type {Pack[]} */
const PACKS = ['control', 'resonant'];

module.exports = { SOUNDS, EVENTS, PACKS };
