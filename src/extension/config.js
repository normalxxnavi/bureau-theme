// @ts-check
'use strict';

const { EVENTS } = require('./catalog');

/** Prefijo de todos los ajustes. Cambiarlo después de publicar borra los ajustes de los usuarios. */
const SECTION = 'bureauTheme.sounds';

/**
 * @typedef {Object} SoundConfig
 * @property {boolean} enabled
 * @property {'auto'|'control'|'resonant'} pack
 * @property {number} volume 0–200 (por encima de 100 se amplifica)
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
    volume: Math.round(clamp(/** @type {number} */ (get('volume')), 0, 200, 80)),
    onlyWithControlTheme: get('onlyWithControlTheme') !== false,
    errorTrigger: trigger === 'live' ? 'live' : 'onSave',
    cooldownMs: clamp(/** @type {number} */ (get('cooldownMs')), 0, 10000, 1500),
    customFolder: typeof get('customFolder') === 'string' ? String(get('customFolder')).trim() : '',
    events,
  };
}

/**
 * Tipografía: ajuste y claves de estado (globalState). Están aquí y no en
 * fonts.js para que extension.js pueda decidir al arrancar si hace falta cargar
 * el módulo de tipografías sin cargarlo.
 */
const FONT_SETTING = 'bureauTheme.font';
const FONT_APPLIED_KEY = 'fontApplied';
/** true cuando los ajustes de fuente llevan detrás la fuente anterior del usuario (desde la 0.8). */
const FONT_FALLBACK_KEY = 'fontFallback';

/** Protocolos de la Agencia: Modo Clasificado, nivel de alerta y comentarios del Consejo. */
const CLASSIFIED = 'bureauTheme.classified';
const ALERT = 'bureauTheme.alertLevel';
const BOARD = 'bureauTheme.board';
/** Interruptor de cada protocolo (están todos apagados por defecto). */
const PROTOCOL_SWITCHES = {
  classified: `${CLASSIFIED}.enabled`,
  alertLevel: `${ALERT}.enabled`,
  board: `${BOARD}.comments`,
  boardRandom: `${BOARD}.random`,
};

/** La gramola Songmaster (la música que suena en el ordenador). */
const MUSIC = 'bureauTheme.music';

/**
 * La terminal Bureau: el estilo del prompt (`off` = apagado) y claves de estado
 * (globalState). Aquí para que extension.js decida al arrancar si carga el
 * módulo sin cargarlo, y para que las tipografías sepan de su fuente de iconos.
 */
const TERMINAL_PROMPT = 'bureauTheme.terminal.prompt';
/** Hay algo de la terminal Bureau aplicado (perfil predeterminado, fuente…) que deshacer. */
const TERMINAL_ACTIVE_KEY = 'terminalActive';
/** Versión de la extensión con la que se instaló la fuente de iconos del prompt. */
const TERMINAL_FONT_INSTALLED_KEY = 'terminalIconFontInstalled';

/** Icono CONTROL de la barra de estado (abre el panel). Antes era solo de sonido y se llamaba así: */
const STATUS_BAR_ITEM = 'bureauTheme.statusBarItem';
const LEGACY_STATUS_BAR_ITEM = 'bureauTheme.sounds.statusBarItem';

module.exports = {
  SECTION,
  normalizeConfig,
  FONT_SETTING,
  FONT_APPLIED_KEY,
  FONT_FALLBACK_KEY,
  CLASSIFIED,
  ALERT,
  BOARD,
  PROTOCOL_SWITCHES,
  MUSIC,
  TERMINAL_PROMPT,
  TERMINAL_ACTIVE_KEY,
  TERMINAL_FONT_INSTALLED_KEY,
  STATUS_BAR_ITEM,
  LEGACY_STATUS_BAR_ITEM,
};
