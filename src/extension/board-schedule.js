// @ts-check
'use strict';

/**
 * Mensajes del Consejo al azar durante el día (lógica pura, sin `vscode`):
 * horario, cuánto esperar hasta el siguiente y de qué mensajes se elige.
 */

const { LINES } = require('./board-lines');

/** Sin horario, se reparten como si VS Code estuviera abierto unas 10 horas al día. */
const DEFAULT_ACTIVE_MINUTES = 600;
const DAY = 24 * 60;

/** @typedef {{start: number, end: number}} Hours minutos desde medianoche; `end` puede ser menor que `start` (cruza la medianoche) */
/** @typedef {'all' | 'board' | 'custom'} MessageSource */

/**
 * «09:00-18:00» → {start: 540, end: 1080}. Vacío o mal escrito → null (todo el día).
 * @param {unknown} value
 * @returns {Hours | null}
 */
function parseHours(value) {
  if (typeof value !== 'string') return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (!m) return null;
  const [h1, m1, h2, m2] = m.slice(1).map(Number);
  if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) return null;
  const start = (h1 * 60 + m1) % DAY;
  const end = (h2 * 60 + m2) % DAY;
  return start === end ? null : { start, end };
}

/** @param {Date} date */
const minuteOf = (date) => date.getHours() * 60 + date.getMinutes();

/** ¿Está dentro del horario? (sin horario, siempre) @param {Date} date @param {Hours | null} hours */
function inHours(date, hours) {
  if (!hours) return true;
  const m = minuteOf(date);
  return hours.start < hours.end ? m >= hours.start && m < hours.end : m >= hours.start || m < hours.end;
}

/** Minutos del horario (o los de un día normal de trabajo si no hay). @param {Hours | null} hours */
const activeMinutes = (hours) => (hours ? (hours.end - hours.start + DAY) % DAY : DEFAULT_ACTIVE_MINUTES);

/**
 * Espera hasta el siguiente mensaje: de media, el horario repartido entre los
 * mensajes del día, al azar entre la mitad y vez y media.
 * @param {number} perDay @param {Hours | null} hours @param {() => number} [random]
 */
function nextDelayMs(perDay, hours, random = Math.random) {
  const n = Number.isFinite(perDay) && perDay >= 1 ? Math.min(48, Math.floor(perDay)) : 3;
  const average = activeMinutes(hours) / n;
  return Math.round(average * (0.5 + random()) * 60_000);
}

/**
 * Milisegundos hasta que vuelva a empezar el horario (0 si ya estamos dentro).
 * @param {Date} date @param {Hours | null} hours
 */
function msUntilHours(date, hours) {
  if (inHours(date, hours) || !hours) return 0;
  const minutes = (hours.start - minuteOf(date) + DAY) % DAY;
  return (minutes * 60 - date.getSeconds()) * 1000;
}

/**
 * Mensajes propios del ajuste, limpios.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeCustom(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === 'string')
    .map((v) => v.replace(/\s+/g, ' ').trim().slice(0, 240))
    .filter(Boolean)
    .slice(0, 200);
}

/**
 * Los mensajes entre los que se elige.
 * @param {MessageSource} source
 * @param {string[]} custom mensajes propios
 * @param {string} language `vscode.env.language`
 * @param {boolean} lateNight de madrugada se añaden los de dormir
 */
function messagePool(source, custom, language, lateNight) {
  const lang = language.toLowerCase().startsWith('es') ? 1 : 0;
  const board = [...LINES.general, ...(lateNight ? LINES.lateNight : [])].map((pair) => pair[lang]);
  if (source === 'custom') return custom.length ? custom : board;
  if (source === 'board') return board;
  return [...board, ...custom];
}

/**
 * Uno al azar, distinto del anterior.
 * @param {string[]} pool @param {() => number} [random] @param {string} [previous]
 */
function pickFrom(pool, random = Math.random, previous) {
  if (!pool.length) return '';
  let i = Math.floor(random() * pool.length) % pool.length;
  if (pool.length > 1 && pool[i] === previous) i = (i + 1) % pool.length;
  return pool[i];
}

/** Fecha local como texto (para contar los mensajes de cada día). @param {Date} date */
const dayKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

module.exports = { parseHours, inHours, activeMinutes, nextDelayMs, msUntilHours, normalizeCustom, messagePool, pickFrom, dayKey, DEFAULT_ACTIVE_MINUTES };
