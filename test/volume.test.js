'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseWav, gainForVolume, softLimit, scaleWav, getScaledFile, pruneCache, MAX_WAV_BYTES } = require('../src/extension/volume');

/**
 * WAV mínimo con las muestras dadas.
 * @param {{format?: number, bits: number, samples: number[], extensible?: boolean, extraChunk?: boolean}} o
 */
function makeWav({ format = 1, bits, samples, extensible = false, extraChunk = false }) {
  const bytes = bits / 8;
  const data = Buffer.alloc(samples.length * bytes);
  samples.forEach((s, i) => {
    const o = i * bytes;
    if (format === 3) data.writeFloatLE(s, o);
    else if (bits === 8) data.writeUInt8(s, o);
    else if (bits === 16) data.writeInt16LE(s, o);
    else if (bits === 24) data.writeIntLE(s, o, 3);
    else data.writeInt32LE(s, o);
  });
  const fmtSize = extensible ? 40 : 16;
  const fmt = Buffer.alloc(8 + fmtSize);
  fmt.write('fmt ', 0);
  fmt.writeUInt32LE(fmtSize, 4);
  fmt.writeUInt16LE(extensible ? 0xfffe : format, 8);
  fmt.writeUInt16LE(1, 10);
  fmt.writeUInt32LE(8000, 12);
  fmt.writeUInt32LE(8000 * bytes, 16);
  fmt.writeUInt16LE(bytes, 20);
  fmt.writeUInt16LE(bits, 22);
  if (extensible) {
    fmt.writeUInt16LE(22, 24);
    fmt.writeUInt16LE(format, 32); // primeros 2 bytes del GUID de subformato
  }
  // Chunk extra de 3 bytes (impar → relleno) para comprobar la alineación.
  const list = extraChunk ? Buffer.from([...Buffer.from('LIST'), 3, 0, 0, 0, 1, 2, 3, 0]) : Buffer.alloc(0);
  const dataHeader = Buffer.alloc(8);
  dataHeader.write('data', 0);
  dataHeader.writeUInt32LE(data.length, 4);
  const body = Buffer.concat([Buffer.from('WAVE'), fmt, list, dataHeader, data]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0);
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

const samplesOf = (/** @type {Buffer} */ buf, /** @type {(b: Buffer, o: number) => number} */ read, /** @type {number} */ bytes) => {
  const { dataOffset, dataLength } = parseWav(buf);
  const out = [];
  for (let o = dataOffset; o < dataOffset + dataLength; o += bytes) out.push(read(buf, o));
  return out;
};

test('parseWav lee la cabecera, salta chunks extra y entiende WAVE_FORMAT_EXTENSIBLE', () => {
  const w = parseWav(makeWav({ bits: 16, samples: [1, 2, 3], extraChunk: true }));
  assert.equal(w.format, 1);
  assert.equal(w.bitsPerSample, 16);
  assert.equal(w.dataLength, 6);
  assert.equal(parseWav(makeWav({ bits: 16, samples: [1], extensible: true })).format, 1);
  assert.throws(() => parseWav(Buffer.from('no es un wav')), /RIFF/);
});

test('parseWav rechaza cabeceras incompletas o con formatos imposibles', () => {
  // Chunk «fmt » de 4 bytes: antes se leían bytes de fuera del chunk.
  const short = Buffer.concat([Buffer.from('RIFF'), Buffer.from([20, 0, 0, 0]), Buffer.from('WAVEfmt '), Buffer.from([4, 0, 0, 0, 1, 0, 1, 0])]);
  assert.throws(() => parseWav(short), /incompleto/);
  const zeroBits = makeWav({ bits: 16, samples: [1] });
  zeroBits.writeUInt16LE(0, 34); // bitsPerSample = 0
  assert.throws(() => parseWav(zeroBits), /no soportado/);
  const noChannels = makeWav({ bits: 16, samples: [1] });
  noChannels.writeUInt16LE(0, 22); // canales = 0
  assert.throws(() => parseWav(noChannels), /no soportado/);
});

test('gainForVolume usa una curva perceptiva hasta 100 y amplifica hasta 200 (+6 dB)', () => {
  assert.equal(gainForVolume(0), 0);
  assert.equal(gainForVolume(100), 1);
  assert.equal(gainForVolume(50), 0.25);
  assert.equal(gainForVolume(150), 1.5);
  assert.equal(gainForVolume(200), 2);
  assert.equal(gainForVolume(500), 2, 'nunca más de 200');
});

test('scaleWav 16 bits', () => {
  const out = scaleWav(makeWav({ bits: 16, samples: [1000, -2000, 32767] }), 0.5);
  assert.deepEqual(samplesOf(out, (b, o) => b.readInt16LE(o), 2), [500, -1000, 16384]);
});

test('scaleWav 8 bits (sin signo, centrado en 128)', () => {
  const out = scaleWav(makeWav({ bits: 8, samples: [128, 228, 28] }), 0.5);
  assert.deepEqual(samplesOf(out, (b, o) => b.readUInt8(o), 1), [128, 178, 78]);
});

test('scaleWav 24 bits y float 32', () => {
  const pcm24 = scaleWav(makeWav({ bits: 24, samples: [4000000, -4000000] }), 0.25);
  assert.deepEqual(samplesOf(pcm24, (b, o) => b.readIntLE(o, 3), 3), [1000000, -1000000]);
  const f32 = scaleWav(makeWav({ format: 3, bits: 32, samples: [0.5, -1] }), 0.5);
  assert.deepEqual(samplesOf(f32, (b, o) => b.readFloatLE(o), 4), [0.25, -0.5]);
});

test('scaleWav no modifica el original y, amplificado, redondea los picos sin desbordar', () => {
  const original = makeWav({ bits: 16, samples: [30000, 8000, -30000] });
  const copy = Buffer.from(original);
  const out = scaleWav(original, 2);
  assert.deepEqual(original, copy);
  const [peak, quiet, negative] = samplesOf(out, (b, o) => b.readInt16LE(o), 2);
  assert.equal(quiet, 16000, 'por debajo de la rodilla solo se amplifica');
  assert.ok(peak > 0.95 * 32768 && peak < 32767, `pico redondeado bajo el techo (${peak})`);
  assert.equal(negative, -peak, 'simétrico');
});

test('softLimit: transparente bajo la rodilla, nunca pasa del techo y es continuo', () => {
  assert.equal(softLimit(0.5), 0.5);
  assert.equal(softLimit(-0.7), -0.7);
  assert.ok(softLimit(10) <= 0.98 && softLimit(10) > 0.97);
  assert.ok(Math.abs(softLimit(0.7001) - 0.7001) < 1e-3);
  for (let x = 0; x < 3; x += 0.05) assert.ok(softLimit(x + 0.05) >= softLimit(x), 'creciente');
});

test('getScaledFile usa la caché y pruneCache borra otros volúmenes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-volume-'));
  try {
    const src = path.join(dir, 'save.wav');
    fs.writeFileSync(src, makeWav({ bits: 16, samples: [1000, 2000] }));
    const cache = path.join(dir, 'cache');

    assert.equal(getScaledFile(src, 100, cache), src, 'volumen 100 = original');
    const loud = getScaledFile(src, 150, cache);
    assert.notEqual(loud, src, 'por encima de 100 es una copia amplificada');
    assert.deepEqual(samplesOf(fs.readFileSync(loud), (b, o) => b.readInt16LE(o), 2), [1500, 3000]);
    const a = getScaledFile(src, 50, cache);
    assert.notEqual(a, src);
    assert.ok(fs.existsSync(a));
    assert.equal(getScaledFile(src, 50, cache), a, 'segunda vez sale de la caché');
    const b = getScaledFile(src, 30, cache);
    assert.notEqual(a, b);

    assert.equal(pruneCache(cache, 30), 2);
    assert.ok(!fs.existsSync(a));
    assert.ok(fs.existsSync(b));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('getScaledFile rechaza WAV demasiado grandes antes de leerlos (también a volumen 100)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-volume-'));
  try {
    const big = path.join(dir, 'error.wav');
    const fd = fs.openSync(big, 'w');
    fs.writeSync(fd, Buffer.from([0]), 0, 1, MAX_WAV_BYTES); // archivo disperso de 16 MB + 1 byte
    fs.closeSync(fd);
    assert.throws(() => getScaledFile(big, 50, path.join(dir, 'cache')), /too large/);
    assert.throws(() => getScaledFile(big, 100, path.join(dir, 'cache')), /too large/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
