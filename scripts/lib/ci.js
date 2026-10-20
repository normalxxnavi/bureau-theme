// @ts-check
'use strict';

/**
 * En GitHub Actions, un fallo también sale como anotación: se ve en el resumen
 * de la ejecución (y en la API pública) sin abrir el log, que pide iniciar
 * sesión. Fuera de la CI no hace nada.
 * @param {string} title
 * @param {string} message
 */
function ciError(title, message) {
  if (!process.env.GITHUB_ACTIONS) return;
  const escape = (/** @type {string} */ s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::error title=${escape(title).replace(/:/g, '%3A').replace(/,/g, '%2C')}::${escape(message)}`);
}

module.exports = { ciError };
