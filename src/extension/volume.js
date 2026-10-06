// @ts-check
'use strict';

/**
 * Volumen aplicado en Node escalando las muestras del WAV.
 *
 * Así el volumen funciona igual en Windows, macOS y Linux, aunque el
 * reproductor de Windows (System.Media.SoundPlayer) no tenga control de
 * volumen. El resultado se guarda en una caché por nivel de volumen.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const WAVE_FORMAT_PCM = 1;
const WAVE_FORMAT_IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;

/**
 * Lee la cabecera de un WAV (RIFF). Lanza un error si no es un WAV válido.
 * @param {Buffer} buf
 */
function parseWav(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('No es un archivo WAV (RIFF/WAVE)');
  }
  let offset = 12;
  /** @type {{format: number, channels: number, sampleRate: number, bitsPerSample: number} | null} */
  let fmt = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      let format = buf.readUInt16LE(body);
      if (format === WAVE_FORMAT_EXTENSIBLE && size >= 26) format = buf.readUInt16LE(body + 24);
      fmt = {
        format,
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      if (!fmt) throw new Error('Chunk "data" antes de "fmt "');
      return { ...fmt, dataOffset: body, dataLength: Math.min(size, buf.length - body) };
    }
    offset = body + size + (size % 2); // los chunks se alinean a 2 bytes
  }
  throw new Error('WAV sin chunk "data"');
}

/**
 * Curva de volumen perceptiva (0–100 → ganancia 0–1). Con una curva lineal,
 * casi todo el recorrido del control sonaría igual de fuerte.
 * @param {number} volume
 */
function gainForVolume(volume) {
  const v = Math.min(100, Math.max(0, volume)) / 100;
  return v * v;
}

/**
 * Devuelve una copia del WAV con las muestras multiplicadas por `gain`.
 * Soporta PCM de 8, 16, 24 y 32 bits y float de 32 bits.
 * @param {Buffer} buf @param {number} gain
 */
function scaleWav(buf, gain) {
  const info = parseWav(buf);
  const out = Buffer.from(buf);
  const { dataOffset, dataLength, bitsPerSample, format } = info;
  const end = dataOffset + dataLength;
  const bytes = bitsPerSample / 8;

  if (format === WAVE_FORMAT_IEEE_FLOAT && bitsPerSample === 32) {
    for (let i = dataOffset; i + 4 <= end; i += 4) out.writeFloatLE(buf.readFloatLE(i) * gain, i);
    return out;
  }
  if (format !== WAVE_FORMAT_PCM) throw new Error(`Formato WAV no soportado (${format})`);

  const clampInt = (/** @type {number} */ v, /** @type {number} */ bits) => {
    const max = 2 ** (bits - 1) - 1;
    return Math.max(-max - 1, Math.min(max, Math.round(v)));
  };
  for (let i = dataOffset; i + bytes <= end; i += bytes) {
    switch (bitsPerSample) {
      case 8: // sin signo, centrado en 128
        out.writeUInt8(Math.max(0, Math.min(255, Math.round((buf.readUInt8(i) - 128) * gain + 128))), i);
        break;
      case 16:
        out.writeInt16LE(clampInt(buf.readInt16LE(i) * gain, 16), i);
        break;
      case 24:
        out.writeIntLE(clampInt(buf.readIntLE(i, 3) * gain, 24), i, 3);
        break;
      case 32:
        out.writeInt32LE(clampInt(buf.readInt32LE(i) * gain, 32), i);
        break;
      default:
        throw new Error(`Profundidad de bits no soportada (${bitsPerSample})`);
    }
  }
  return out;
}

/**
 * Ruta de una copia del WAV con el volumen aplicado (la crea si no existe).
 * Con volumen 100 devuelve el original.
 * @param {string} source @param {number} volume @param {string} cacheDir
 */
function getScaledFile(source, volume, cacheDir) {
  if (volume >= 100) return source;
  const stat = fs.statSync(source);
  const key = crypto.createHash('sha1').update(`${path.resolve(source)}|${stat.size}|${stat.mtimeMs}`).digest('hex').slice(0, 16);
  const target = path.join(cacheDir, `${key}-v${volume}.wav`);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, scaleWav(fs.readFileSync(source), gainForVolume(volume)));
    fs.renameSync(tmp, target);
  }
  return target;
}

/**
 * Borra de la caché las copias de otros niveles de volumen.
 * @param {string} cacheDir @param {number} keepVolume
 */
function pruneCache(cacheDir, keepVolume) {
  if (!fs.existsSync(cacheDir)) return 0;
  let removed = 0;
  for (const f of fs.readdirSync(cacheDir)) {
    if (f.endsWith('.wav') && !f.endsWith(`-v${keepVolume}.wav`)) {
      fs.rmSync(path.join(cacheDir, f), { force: true });
      removed++;
    }
  }
  return removed;
}

module.exports = { parseWav, gainForVolume, scaleWav, getScaledFile, pruneCache };
