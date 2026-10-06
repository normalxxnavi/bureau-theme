// @ts-check
'use strict';

const { EVENTS } = require('./catalog');

/** Prefijo de todos los ajustes. Cambiarlo después de publicar borra los ajustes de los usuarios. */
const SECTION = 'bureauTheme.sounds';

/**
 * @typedef {Object} SoundConfig
 * @property {boolean} enabled
 * @property {'auto'|'control'|'resonant'} pack
 * @property {number} volume 0–100
 * @property {boolean} onlyWithControlTheme
 * @property {'onSave'|'live'} errorTrigger
 * @property {number} cooldownMs
 * @property {string} customFolder
 * @property {Record<import('./catalog').SoundEvent, boolean>} events
 */

/** @param {number} v @param {number} min @param {number} max @param {number} fallback */
const clamp = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);

/**
 * Normaliza los valores leídos (pueden venir mal escritos a mano en settings.json).
 * @param {(key: string) => unknown} get lector de `bureauTheme.sounds.<key>`
 * @returns {SoundConfig}
 */
function normalizeConfig(get) {
  const pack = get('pack');
  const trigger = get('errorTrigger');
  /** @type {any} */
  const events = {};
  for (const e of EVENTS) events[e] = get(`events.${e}`) === true;
  return {
    enabled: get('enabled') === true,
    pack: pack === 'control' || pack === 'resonant' ? pack : 'auto',
    volume: Math.round(clamp(/** @type {number} */ (get('volume')), 0, 100, 50)),
    onlyWithControlTheme: get('onlyWithControlTheme') !== false,
    errorTrigger: trigger === 'live' ? 'live' : 'onSave',
    cooldownMs: clamp(/** @type {number} */ (get('cooldownMs')), 0, 10000, 1500),
    customFolder: typeof get('customFolder') === 'string' ? String(get('customFolder')).trim() : '',
    events,
  };
}

module.exports = { SECTION, normalizeConfig };
