// @ts-check
'use strict';

/**
 * Reporter de `node --test` para la CI: cada test que falla sale también como
 * anotación de GitHub Actions, con su nombre y el error. Así se ve en el
 * resumen de la ejecución y en la API pública sin abrir el log (que pide
 * iniciar sesión). Fuera de la CI no escribe nada; el resultado normal lo da
 * el reporter «spec», que va a la vez (ver "test" en package.json).
 *
 * @param {AsyncIterable<{type: string, data: any}>} source
 */
module.exports = async function* ghaReporter(source) {
  const ci = Boolean(process.env.GITHUB_ACTIONS);
  const escape = (/** @type {string} */ s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  for await (const { type, data } of source) {
    if (!ci || type !== 'test:fail') continue;
    const error = data.details?.error;
    // Un archivo que falla entero (un error al cargarlo) llega como un test con el nombre del archivo.
    if (error?.failureType === 'subtestsFailed') continue;
    const cause = error?.cause ?? error;
    const message = String(cause?.message ?? cause ?? 'falló').split('\n').slice(0, 12).join('\n');
    const title = escape(`Unit test (${process.platform})`).replace(/:/g, '%3A').replace(/,/g, '%2C');
    yield `::error title=${title}::${escape(`${data.name}: ${message}`)}\n`;
  }
};
