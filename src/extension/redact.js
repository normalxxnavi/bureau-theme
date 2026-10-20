// @ts-check
'use strict';

/**
 * Modo Clasificado (lógica pura, sin `vscode`): qué trozos de un archivo se
 * tapan con barras de censura.
 *
 *   - Archivos de variables de entorno (.env, .env.local, prod.env, .envrc):
 *     el valor de todas las variables.
 *   - En cualquier archivo clasificado:
 *       · los valores cuyo nombre parece un secreto (password, token, apiKey…)
 *         en JSON, YAML, TOML, INI, properties, .npmrc y XML;
 *       · la contraseña de las cadenas de conexión (`Password=…;`) y de las
 *         URL (`usuario:contraseña@servidor`);
 *       · el contenido de las claves y certificados PEM.
 *
 * Las palabras que delatan un secreto vienen de un ajuste, pero nunca como
 * expresión regular: un patrón mal escrito (o malicioso, en un área de
 * trabajo que no es de confianza) podría bloquear VS Code.
 */

/** Palabras (sin mayúsculas, guiones ni espacios) que delatan un secreto en el nombre de un valor. */
const DEFAULT_KEYWORDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'accesskey',
  'privatekey',
  'clientsecret',
  'connectionstring',
  'credential',
  'signature',
  'dsn',
];

/** Más allá de este tamaño no se analiza (no es un archivo de configuración). */
const MAX_LENGTH = 512 * 1024;

/** @typedef {{start: number, end: number}} Span posiciones en el texto, [start, end) */

/** @param {string} key */
const normalize = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Lista de palabras limpia (de un ajuste escrito a mano).
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeKeywords(value) {
  if (!Array.isArray(value)) return DEFAULT_KEYWORDS;
  return value
    .filter((w) => typeof w === 'string')
    .map((w) => normalize(w).slice(0, 64))
    .filter(Boolean)
    .slice(0, 100);
}

/** @param {string} key @param {string[]} keywords */
const isSecretKey = (key, keywords) => {
  const k = normalize(key);
  return keywords.some((w) => k.includes(w));
};

/** ¿Es un archivo de variables de entorno? (.env, .env.*, *.env, .envrc, .flaskenv) @param {string} fileName */
function isEnvFile(fileName) {
  const base = (fileName.split(/[\\/]/).pop() ?? '').toLowerCase();
  return /^\.env(\..+)?$/.test(base) || base.endsWith('.env') || base === '.envrc' || base === '.flaskenv';
}

/**
 * Trozo del valor que empieza en `from` (después de `=` o `:`): lo de dentro
 * de las comillas si las hay; si no, hasta un comentario ` #` o el final de
 * la línea, sin la coma final.
 * @param {string} line @param {number} from
 * @returns {[number, number] | null} [inicio, fin) dentro de la línea
 */
function valueSpan(line, from) {
  let i = from;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
  if (i >= line.length) return null;
  const quote = line[i];
  if (quote === '"' || quote === "'" || quote === '`') {
    let j = i + 1;
    while (j < line.length && line[j] !== quote) j += line[j] === '\\' ? 2 : 1;
    const end = Math.min(j, line.length); // sin comilla de cierre: hasta el final
    return end > i + 1 ? [i + 1, end] : null;
  }
  // El valor es una estructura que sigue en las líneas siguientes.
  if ('{[|>'.includes(quote) && line.slice(i).trim().length <= 2) return null;
  let end = line.length;
  const comment = line.slice(i).search(/\s#/);
  if (comment !== -1) end = i + comment;
  while (end > i && /[\s,]/.test(line[end - 1])) end--;
  return end > i ? [i, end] : null;
}

const ENV_LINE = /^\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*=/;
/** `clave: valor` (YAML) y `"clave": valor` (JSON en una línea por clave). */
const COLON_KEY = /^\s*(?:-\s+)?["']?([\w.-]{1,200})["']?\s*:(?!\/\/)/;
/** `clave = valor` (INI, TOML, properties, .npmrc con claves como //registry/:_authToken). */
const EQUALS_KEY = /^\s*([^=\s#;[][^=#;]{0,199}?)\s*=/;
/** Pares JSON o YAML con la clave entre comillas en cualquier punto de la línea. */
const QUOTED_PAIR = /(["'])([^"'\\\n]{1,200})\1\s*:\s*/g;
/** `<password>valor</password>` */
const XML_ELEMENT = /<([A-Za-z_][\w.:-]{0,100})>([^<]+)<\/\1>/g;
/** `password="valor"` y `<add key="DbPassword" value="valor" />` */
const XML_ATTRIBUTE = /([A-Za-z_][\w.:-]{0,100})\s*=\s*"([^"]*)"/g;
const XML_KEY_VALUE = /\bkey\s*=\s*"([^"]{1,200})"\s+value\s*=\s*"([^"]*)"/g;
/** `Password=…;` dentro de una cadena de conexión. */
const CONNECTION_PASSWORD = /\b(?:password|pwd|passwd)\s*=\s*([^;"'\s]+)/gi;
/** `esquema://usuario:contraseña@servidor` */
const URL_PASSWORD = /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s:/@]{1,200}:([^\s@/]{1,200})@/gi;
const PEM_BEGIN = /^\s*-----BEGIN [A-Z0-9 ]{1,60}-----\s*$/;
const PEM_END = /^\s*-----END [A-Z0-9 ]{1,60}-----\s*$/;

/**
 * Trozos que se tapan.
 * @param {string} text
 * @param {{envFile?: boolean, keywords?: string[]}} [options]
 * @returns {Span[]}
 */
function classifiedSpans(text, options = {}) {
  if (text.length > MAX_LENGTH) return [];
  const keywords = options.keywords ?? DEFAULT_KEYWORDS;
  /** @type {Span[]} */
  const spans = [];
  let inPem = false;
  let offset = 0;

  for (const raw of text.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const add = (/** @type {[number, number] | null} */ s) => {
      if (s && s[1] > s[0]) spans.push({ start: offset + s[0], end: offset + s[1] });
    };
    const trimmed = line.trim();

    if (inPem) {
      if (PEM_END.test(line)) inPem = false;
      else if (trimmed) add([line.length - line.trimStart().length, line.trimEnd().length]);
    } else if (PEM_BEGIN.test(line)) {
      inPem = true;
    } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith(';')) {
      if (options.envFile && ENV_LINE.test(line)) {
        add(valueSpan(line, line.indexOf('=') + 1));
      } else {
        const colon = COLON_KEY.exec(line);
        if (colon && isSecretKey(colon[1], keywords)) add(valueSpan(line, colon[0].length));
        const equals = EQUALS_KEY.exec(line);
        if (equals && isSecretKey(equals[1], keywords)) add(valueSpan(line, equals[0].length));
      }
      for (const m of line.matchAll(QUOTED_PAIR)) if (isSecretKey(m[2], keywords)) add(valueSpan(line, /** @type {number} */ (m.index) + m[0].length));
      if (line.includes('<')) {
        for (const m of line.matchAll(XML_ELEMENT)) {
          if (isSecretKey(m[1], keywords)) {
            const start = /** @type {number} */ (m.index) + m[1].length + 2;
            add([start, start + m[2].length]);
          }
        }
        for (const m of line.matchAll(XML_KEY_VALUE)) {
          if (isSecretKey(m[1], keywords)) {
            const start = /** @type {number} */ (m.index) + m[0].length - m[2].length - 1;
            add([start, start + m[2].length]);
          }
        }
        for (const m of line.matchAll(XML_ATTRIBUTE)) {
          if (isSecretKey(m[1], keywords)) {
            const start = /** @type {number} */ (m.index) + m[0].length - m[2].length - 1;
            add([start, start + m[2].length]);
          }
        }
      }
    }
    if (!inPem) {
      for (const m of line.matchAll(CONNECTION_PASSWORD)) {
        const start = /** @type {number} */ (m.index) + m[0].length - m[1].length;
        add([start, start + m[1].length]);
      }
      for (const m of line.matchAll(URL_PASSWORD)) {
        const start = /** @type {number} */ (m.index) + m[0].length - m[1].length - 1;
        add([start, start + m[1].length]);
      }
    }
    offset += raw.length + 1;
  }
  return mergeSpans(spans);
}

/** Ordena y une los trozos que se solapan. @param {Span[]} spans */
function mergeSpans(spans) {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  /** @type {Span[]} */
  const merged = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged;
}

/**
 * Los patrones del ajuste `bureauTheme.classified.files` como globs de VS Code
 * («.env» → «**\/.env»: cualquier carpeta).
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeFilePatterns(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => p.trim().replace(/\\/g, '/'))
    .map((p) => (p.includes('/') ? p : `**/${p}`))
    .slice(0, 200);
}

module.exports = { DEFAULT_KEYWORDS, MAX_LENGTH, classifiedSpans, isEnvFile, isSecretKey, normalizeKeywords, normalizeFilePatterns, mergeSpans };
