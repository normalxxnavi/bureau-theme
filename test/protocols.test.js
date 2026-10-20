'use strict';

/**
 * Protocolos de la Agencia (lógica pura): Modo Clasificado, nivel de alerta
 * y mensajes del Consejo.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classifiedSpans, isEnvFile, normalizeKeywords, normalizeFilePatterns, mergeSpans } = require('../src/extension/redact');
const { alertLevel } = require('../src/extension/alert-rules');
const { LINES, MOMENTS, pickLine, isLateNight } = require('../src/extension/board-lines');
const S = require('../src/extension/board-schedule');

test('Consejo al azar: horario (también cruzando la medianoche) y mal escrito = todo el día', () => {
  assert.deepEqual(S.parseHours('09:00-18:00'), { start: 540, end: 1080 });
  assert.deepEqual(S.parseHours(' 22:00 - 02:30 '), { start: 1320, end: 150 });
  for (const v of ['', '9-18', '25:00-26:00', '10:00-10:00', 42]) assert.equal(S.parseHours(v), null, String(v));
  const at = (/** @type {number} */ h, m = 0) => new Date(2026, 9, 16, h, m);
  assert.ok(S.inHours(at(12), S.parseHours('09:00-18:00')));
  assert.ok(!S.inHours(at(18), S.parseHours('09:00-18:00')), 'la hora de fin ya no cuenta');
  assert.ok(S.inHours(at(1), S.parseHours('22:00-02:00')));
  assert.ok(!S.inHours(at(12), S.parseHours('22:00-02:00')));
  assert.ok(S.inHours(at(4), null), 'sin horario, siempre');
  assert.equal(S.msUntilHours(at(12), S.parseHours('09:00-18:00')), 0);
  assert.equal(S.msUntilHours(at(7, 30), S.parseHours('09:00-18:00')), 90 * 60_000);
  assert.equal(S.msUntilHours(at(20), S.parseHours('09:00-18:00')), 13 * 3600_000, 'hasta mañana a las 9');
});

test('Consejo al azar: N al día se reparten por el horario, al azar entre 0,5× y 1,5× la media', () => {
  const hours = S.parseHours('09:00-18:00'); // 540 min
  assert.equal(S.nextDelayMs(3, hours, () => 0.5), 180 * 60_000, 'media: 3 h');
  assert.equal(S.nextDelayMs(3, hours, () => 0), 90 * 60_000);
  assert.equal(S.nextDelayMs(3, hours, () => 0.999999), Math.round(180 * 1.499999 * 60_000));
  assert.equal(S.nextDelayMs(3, null, () => 0.5), 200 * 60_000, 'sin horario: un día de 10 h');
  assert.equal(S.nextDelayMs(0, null, () => 0.5), S.nextDelayMs(3, null, () => 0.5), 'un número no válido usa 3');
});

test('Consejo al azar: mensajes del Consejo, propios o los dos', () => {
  const custom = S.normalizeCustom(['  <<BEBE AGUA, AGENTE.>>  ', '', 7, 'x'.repeat(500)]);
  assert.equal(custom.length, 2);
  assert.equal(custom[0], '<<BEBE AGUA, AGENTE.>>');
  assert.equal(custom[1].length, 240);
  const board = S.messagePool('board', custom, 'es', false);
  assert.equal(board.length, LINES.general.length);
  assert.equal(board[0], LINES.general[0][1], 'en español');
  assert.deepEqual(S.messagePool('custom', custom, 'en', false), custom);
  assert.equal(S.messagePool('custom', [], 'en', false).length, LINES.general.length, 'sin mensajes propios, los del Consejo');
  assert.equal(S.messagePool('all', custom, 'en', true).length, LINES.general.length + LINES.lateNight.length + 2);
  assert.notEqual(S.pickFrom(['a', 'b'], () => 0, 'a'), 'a', 'no repite el anterior');
  assert.equal(S.pickFrom([], () => 0), '');
  assert.equal(S.dayKey(new Date(2026, 9, 16, 23, 59)), '2026-10-16');
});

/** Textos tapados. @param {string} text @param {Parameters<typeof classifiedSpans>[1]} [options] */
const hidden = (text, options) => classifiedSpans(text, options).map((s) => text.slice(s.start, s.end));

test('Modo Clasificado: .env tapa el valor de todas las variables', () => {
  const env = fs.readFileSync(path.join(__dirname, '..', 'test-workspace', 'languages', 'sample.env'), 'utf8');
  const values = hidden(env, { envFile: true });
  assert.deepEqual(values, [
    'research',
    '8080',
    'false',
    '555-0100',
    'postgres://jesse:astral-plane-42@localhost:5432/bureau',
    'sk-fbc-0000-not-a-real-key',
    '<<THE_BOARD_SEES_ALL>>',
    'Welcome to the ${SECTOR} sector',
  ]);
  assert.ok(!values.some((v) => v.includes('#')), 'los comentarios no se tapan');
  const lines = 'A=1 # comentario\r\nB=\nexport C="x y"\n';
  assert.deepEqual(hidden(lines, { envFile: true }), ['1', 'x y'], 'saltos de línea de Windows, valores vacíos y export');
  assert.deepEqual(hidden(lines), [], 'fuera de un .env solo se tapan los valores con nombre de secreto');
});

test('Modo Clasificado: valores con nombre de secreto en JSON, YAML, TOML, INI, .npmrc y XML', () => {
  const json = '{\n  "Logging": { "Level": "Debug" },\n  "ApiKey": "abc123",\n  "user": "jesse", "client_secret": "s3cr3t",\n  "Port": 8080\n}';
  assert.deepEqual(hidden(json), ['abc123', 's3cr3t']);
  assert.deepEqual(hidden('db:\n  host: localhost\n  password: hunter2 # no\n  token: >\n'), ['hunter2']);
  assert.deepEqual(hidden('[auth]\naccess_key = "AKIA0000"\nregion = eu-west-1\n'), ['AKIA0000']);
  assert.deepEqual(hidden('//registry.npmjs.org/:_authToken=npm_0000\nregistry=https://registry.npmjs.org/\n'), ['npm_0000']);
  assert.deepEqual(hidden('<add key="DbPassword" value="p@ss" />\n<add key="Theme" value="dark" />\n<secret>x1</secret>\n<connection password="y2" host="h" />'), [
    'p@ss',
    'x1',
    'y2',
  ]);
});

test('Modo Clasificado: contraseñas en cadenas de conexión, URL y claves PEM', () => {
  assert.deepEqual(hidden('"Default": "Server=db;User Id=sa;Password=Astral42;Encrypt=true"'), ['Astral42']);
  assert.deepEqual(hidden('url: postgres://jesse:hiss-777@localhost/bureau'), ['hiss-777']);
  const pem = 'name: cert\n-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n  kqhkiG9w0BAQEF\n-----END PRIVATE KEY-----\nafter: 1\n';
  assert.deepEqual(hidden(pem), ['MIIEvQIBADANBg', 'kqhkiG9w0BAQEF']);
  // Nada que tapar en un archivo sin secretos.
  assert.deepEqual(hidden('name: bureau\nversion: 1\n'), []);
});

test('Modo Clasificado: palabras clave, nombres de archivo y patrones', () => {
  assert.deepEqual(normalizeKeywords(['Api-Key', '', 3, 'PIN']), ['apikey', 'pin']);
  assert.equal(normalizeKeywords('no es una lista').length > 5, true);
  assert.deepEqual(hidden('pin: 1234\npassword: x', { keywords: ['pin'] }), ['1234']);
  for (const f of ['.env', '/p/.env.local', 'C:\\p\\prod.env', '.envrc']) assert.ok(isEnvFile(f), f);
  for (const f of ['env.js', '/p/environment.ts', '.envoy']) assert.ok(!isEnvFile(f), f);
  assert.deepEqual(normalizeFilePatterns(['.env', 'config/*.json', '  ', 42]), ['**/.env', 'config/*.json']);
  assert.deepEqual(mergeSpans([{ start: 5, end: 8 }, { start: 1, end: 3 }, { start: 2, end: 6 }]), [{ start: 1, end: 8 }]);
});

test('Modo Clasificado: un archivo enorme no se analiza (no bloquea el editor)', () => {
  assert.deepEqual(classifiedSpans('password: x\n'.repeat(60000)), []);
});

test('nivel de alerta: despejado, anomalía, alerta e incursión', () => {
  assert.equal(alertLevel(0, 0), 0);
  assert.equal(alertLevel(0, 3), 1);
  assert.equal(alertLevel(1, 0), 2);
  assert.equal(alertLevel(9, 50), 2);
  assert.equal(alertLevel(10, 0), 3);
  assert.equal(alertLevel(3, 0, 3), 3);
  assert.equal(alertLevel(3, 0, 0), 2, 'un umbral no válido usa el de por defecto');
});

test('mensajes del Consejo: originales, en inglés y español y con el formato <<…>>', () => {
  const all = MOMENTS.flatMap((m) => LINES[m]);
  assert.ok(LINES.general.length >= 40, 'al menos 40 mensajes generales');
  for (const [en, es] of all) {
    for (const text of [en, es]) {
      assert.match(text, /^<<[^<>]+>>$/, text);
      assert.equal(text, text.toUpperCase(), `en mayúsculas: ${text}`);
    }
  }
  const unique = new Set(all.flatMap((pair) => pair));
  assert.equal(unique.size, all.length * 2, 'sin mensajes repetidos');
});

test('mensajes del Consejo: idioma, no repite el anterior y de madrugada', () => {
  const [en, es] = LINES.commit[0];
  assert.equal(pickLine('commit', 'en', () => 0), en);
  assert.equal(pickLine('commit', 'es-ES', () => 0), es);
  assert.equal(pickLine('commit', 'fr', () => 0), en, 'otros idiomas usan el inglés');
  assert.notEqual(pickLine('commit', 'en', () => 0, en), en);
  assert.ok(isLateNight(new Date(2026, 9, 16, 3, 0)));
  assert.ok(!isLateNight(new Date(2026, 9, 16, 9, 0)));
});
