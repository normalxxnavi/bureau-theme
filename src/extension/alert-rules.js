// @ts-check
'use strict';

/**
 * Nivel de alerta de la Agencia (lógica pura, sin `vscode`): resume los
 * errores y avisos del área de trabajo en cuatro niveles.
 *
 *   0 Despejado          sin errores ni avisos
 *   1 Anomalía           solo avisos
 *   2 Alerta             algún error
 *   3 Incursión del Siseo tantos errores como el umbral (10 por defecto)
 */

/** @typedef {0 | 1 | 2 | 3} AlertLevel */

const DEFAULT_THRESHOLD = 10;

/**
 * @param {number} errors
 * @param {number} warnings
 * @param {number} [threshold] errores desde los que hay una incursión
 * @returns {AlertLevel}
 */
function alertLevel(errors, warnings, threshold = DEFAULT_THRESHOLD) {
  const limit = Number.isFinite(threshold) && threshold >= 1 ? Math.floor(threshold) : DEFAULT_THRESHOLD;
  if (errors >= limit) return 3;
  if (errors > 0) return 2;
  if (warnings > 0) return 1;
  return 0;
}

module.exports = { alertLevel, DEFAULT_THRESHOLD };
