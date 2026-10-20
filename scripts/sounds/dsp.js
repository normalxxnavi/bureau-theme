// @ts-check
'use strict';

/**
 * Mini-sintetizador sin dependencias para crear los sonidos de la extensión.
 * Todo trabaja con Float32Array en mono a SAMPLE_RATE Hz, con valores en [-1, 1].
 *
 * Nada de esto copia audio de ningún juego: cada sonido se construye desde cero
 * con osciladores, ruido, filtros y envolventes. Es reproducible: el ruido usa
 * una semilla fija, así que `npm run sounds` genera siempre los mismos archivos.
 */

const SAMPLE_RATE = 32000;
const TAU = Math.PI * 2;

/** Generador pseudoaleatorio con semilla (mulberry32). @param {number} seed */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {number} seconds */
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SAMPLE_RATE));

/** Copia de `b` con `seconds` de silencio añadidos al final. */
function pad(/** @type {Float32Array} */ b, /** @type {number} */ seconds) {
  const out = new Float32Array(b.length + Math.ceil(seconds * SAMPLE_RATE));
  out.set(b);
  return out;
}

/**
 * Rellena `out` (o un buffer nuevo) sumando fn(t) desde `start` segundos.
 * @param {Float32Array} out @param {number} start @param {number} dur
 * @param {(t: number, i: number) => number} fn t = tiempo desde start
 */
function add(out, start, dur, fn) {
  const i0 = Math.max(0, Math.round(start * SAMPLE_RATE));
  const n = Math.min(out.length - i0, Math.round(dur * SAMPLE_RATE));
  for (let i = 0; i < n; i++) out[i0 + i] += fn(i / SAMPLE_RATE, i);
  return out;
}

/**
 * Oscilador con frecuencia variable (acumulador de fase, sin saltos).
 * @param {'sine'|'saw'|'square'|'triangle'} type
 * @param {number | ((t: number) => number)} freq
 */
function osc(type, freq) {
  let phase = 0;
  const f = typeof freq === 'function' ? freq : () => freq;
  return (/** @type {number} */ t) => {
    phase = (phase + f(t) / SAMPLE_RATE) % 1;
    switch (type) {
      case 'sine': return Math.sin(TAU * phase);
      case 'saw': return 2 * phase - 1;
      case 'square': return phase < 0.5 ? 1 : -1;
      case 'triangle': return 1 - 4 * Math.abs(phase - 0.5);
    }
  };
}

/**
 * Oscilador FM (síntesis tipo campana / cristal).
 * @param {number | ((t: number) => number)} carrier @param {number} ratio
 * @param {(t: number) => number} index
 */
function fm(carrier, ratio, index) {
  let pc = 0;
  let pm = 0;
  const f = typeof carrier === 'function' ? carrier : () => carrier;
  return (/** @type {number} */ t) => {
    const fc = f(t);
    pm = (pm + (fc * ratio) / SAMPLE_RATE) % 1;
    pc = (pc + fc / SAMPLE_RATE) % 1;
    return Math.sin(TAU * pc + index(t) * Math.sin(TAU * pm));
  };
}

/** Ruido blanco, rosa o marrón con semilla. @param {'white'|'pink'|'brown'} color @param {number} seed */
function noise(color, seed) {
  const r = rng(seed);
  let b0 = 0, b1 = 0, b2 = 0, brown = 0;
  return () => {
    const w = r() * 2 - 1;
    if (color === 'white') return w;
    if (color === 'brown') {
      brown = (brown + 0.02 * w) / 1.02;
      return brown * 3.5;
    }
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    return (b0 + b1 + b2 + w * 0.1848) * 0.2;
  };
}

/**
 * Filtro biquad (RBJ cookbook) con frecuencia que puede variar en el tiempo.
 * @param {'lowpass'|'highpass'|'bandpass'} type
 * @param {number | ((t: number) => number)} cutoff
 * @param {number} [q]
 */
function biquad(type, cutoff, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let lastF = -1;
  const f = typeof cutoff === 'function' ? cutoff : () => cutoff;
  const update = (/** @type {number} */ fc) => {
    const w = (TAU * Math.min(fc, SAMPLE_RATE * 0.45)) / SAMPLE_RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    } else {
      b0 = alpha; b1 = 0; b2 = -alpha;
    }
    b0 /= a0; b1 /= a0; b2 /= a0;
    a1 = (-2 * cos) / a0;
    a2 = (1 - alpha) / a0;
  };
  return (/** @type {number} */ x, /** @type {number} */ t) => {
    const fc = f(t);
    if (Math.abs(fc - lastF) > 0.5) {
      update(fc);
      lastF = fc;
    }
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/**
 * Envolvente por tramos lineales: [[t0, v0], [t1, v1], …].
 * @param {Array<[number, number]>} points
 */
function env(points) {
  return (/** @type {number} */ t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
      }
    }
    return points[points.length - 1][1];
  };
}

/** Golpe: ataque corto y caída exponencial. @param {number} attack @param {number} tau */
const strike = (attack, tau) => (/** @type {number} */ t) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

/** Interpola exponencialmente entre dos frecuencias (glissando natural). */
const glide = (/** @type {number} */ from, /** @type {number} */ to, /** @type {number} */ dur) => (/** @type {number} */ t) =>
  from * Math.pow(to / from, Math.min(1, t / dur));

/** Semitonos → ratio. @param {number} st */
const semis = (st) => Math.pow(2, st / 12);

/**
 * Reverb tipo Schroeder (4 combs en paralelo + 2 allpass en serie). Devuelve
 * un buffer nuevo, alargado para que la cola se apague sola.
 * @param {Float32Array} source @param {{mix?: number, size?: number, damp?: number}} [o]
 */
function reverb(source, { mix = 0.25, size = 1, damp = 0.35 } = {}) {
  const input = pad(source, 0.7 * size);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(Math.round((d * size * SAMPLE_RATE) / 44100)), i: 0, lp: 0 }));
  const allpasses = [225, 556].map((d) => ({ buf: new Float32Array(Math.round((d * SAMPLE_RATE) / 44100)), i: 0 }));
  const feedback = 0.84;
  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n++) {
    const x = input[n];
    let wet = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - damp) + c.lp * damp;
      c.buf[c.i] = x + c.lp * feedback;
      c.i = (c.i + 1) % c.buf.length;
      wet += y;
    }
    wet *= 0.25;
    for (const a of allpasses) {
      const y = a.buf[a.i];
      a.buf[a.i] = wet + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      wet = y - wet * 0.5;
    }
    out[n] = x * (1 - mix) + wet * mix;
  }
  return out;
}

/**
 * Eco con realimentación y un filtro paso bajo dentro del bucle (cada
 * repetición suena más apagada: el «Patterning» de Resonant).
 * @param {Float32Array} source @param {{time: number, feedback: number, mix: number, cutoff?: number}} o
 */
function echo(source, { time, feedback, mix, cutoff = 3000 }) {
  const input = pad(source, time * 5);
  const d = Math.round(time * SAMPLE_RATE);
  const line = new Float32Array(d);
  const lp = biquad('lowpass', cutoff);
  const out = new Float32Array(input.length);
  let i = 0;
  for (let n = 0; n < input.length; n++) {
    const delayed = line[i];
    line[i] = input[n] + lp(delayed, 0) * feedback;
    i = (i + 1) % d;
    out[n] = input[n] + delayed * mix;
  }
  return out;
}

/** Saturación suave. @param {Float32Array} b @param {number} drive */
function saturate(b, drive) {
  const k = Math.tanh(drive);
  for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * drive) / k;
  return b;
}

/** Reduce resolución y frecuencia de muestreo (efecto digital roto). */
function bitcrush(/** @type {Float32Array} */ b, /** @type {number} */ bits, /** @type {number} */ rate) {
  const step = Math.max(1, Math.round(SAMPLE_RATE / rate));
  const levels = 2 ** (bits - 1);
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) {
    const held = b[i - (i % step)];
    out[i] = Math.round(held * levels) / levels;
  }
  return out;
}

/** Aplica un filtro a todo un buffer. @param {Float32Array} b @param {(x: number, t: number) => number} f */
function filter(b, f) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = f(b[i], i / SAMPLE_RATE);
  return out;
}

/** Suma `src` dentro de `dest` a partir de `start` s con ganancia. */
function mixInto(/** @type {Float32Array} */ dest, /** @type {Float32Array} */ src, start = 0, gain = 1) {
  const i0 = Math.round(start * SAMPLE_RATE);
  for (let i = 0; i < src.length && i0 + i < dest.length; i++) dest[i0 + i] += src[i] * gain;
  return dest;
}

const dbToGain = (/** @type {number} */ db) => Math.pow(10, db / 20);
const peakOf = (/** @type {Float32Array} */ b) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rmsOf = (/** @type {Float32Array} */ b) => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);

/**
 * Limitador con anticipación: baja la ganancia justo antes de cada pico que
 * pasaría del techo (ataque instantáneo dentro de la ventana de anticipación,
 * recuperación suave), así los picos no se recortan ni distorsionan.
 * @param {Float32Array} b @param {number} ceiling ganancia lineal del techo
 */
function limit(b, ceiling, { lookahead = 0.002, release = 0.06 } = {}) {
  const la = Math.max(1, Math.round(lookahead * SAMPLE_RATE));
  const rel = Math.exp(-1 / (release * SAMPLE_RATE));
  const need = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) need[i] = Math.min(1, ceiling / (Math.abs(b[i]) || 1e-9));
  const out = new Float32Array(b.length);
  let g = 1;
  for (let i = 0; i < b.length; i++) {
    let m = 1;
    for (let j = i, end = Math.min(b.length - 1, i + la); j <= end; j++) if (need[j] < m) m = need[j];
    g = m < g ? m : m + (g - m) * rel;
    out[i] = Math.max(-ceiling, Math.min(ceiling, b[i] * g));
  }
  return out;
}

/**
 * Masteriza el sonido para guardarlo: quita la componente continua, lo sube
 * hasta el nivel medio (RMS) pedido, deja los picos en el techo con el
 * limitador (como mucho `maxReductionDb` de reducción, para no aplastar los
 * ataques), recorta el silencio del final y aplica fundidos (1 ms al entrar,
 * para no comerse los golpes, y uno más largo al salir).
 *
 * Antes se normalizaba al pico y los sonidos quedaban 10-15 dB por debajo de
 * cualquier música: con Spotify sonando no se oían.
 * Con `lowCutHz` quita los graves profundos (24 dB/octava), que los altavoces
 * de un portátil o unos auriculares pequeños no reproducen y solo gastan
 * margen; con `audibleBandHz` el nivel se mide por encima de esa frecuencia
 * (lo que se oye en cualquier altavoz) y no con los graves.
 * @param {Float32Array} b
 * @param {{rmsDb: number, ceilingDb?: number, maxReductionDb?: number, lowCutHz?: number, audibleBandHz?: number}} o
 */
function finish(b, { rmsDb, ceilingDb = -1, maxReductionDb = 6, lowCutHz = 0, audibleBandHz = 0 }) {
  let out = filter(b, biquad('highpass', 25));
  if (lowCutHz) out = filter(filter(out, biquad('highpass', lowCutHz)), biquad('highpass', lowCutHz));
  const ceiling = dbToGain(ceilingDb);
  const level = audibleBandHz ? rmsOf(filter(out, biquad('highpass', audibleBandHz))) : rmsOf(out);
  const gain = Math.min(dbToGain(rmsDb) / (level || 1e-9), (ceiling * dbToGain(maxReductionDb)) / (peakOf(out) || 1e-9));
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  out = limit(out, ceiling);
  // Recorta el final por debajo de -50 dBFS.
  const floor = dbToGain(-50);
  let end = out.length;
  while (end > 1 && Math.abs(out[end - 1]) < floor) end--;
  out = out.slice(0, Math.min(out.length, end + Math.round(0.01 * SAMPLE_RATE)));
  const fadeIn = Math.round(0.001 * SAMPLE_RATE);
  const fadeOut = Math.round(Math.min(0.15, (out.length / SAMPLE_RATE) * 0.25) * SAMPLE_RATE);
  for (let i = 0; i < out.length; i++) {
    let g = 1;
    if (i < fadeIn) g *= i / fadeIn;
    const left = out.length - i;
    if (left < fadeOut) g *= 0.5 - 0.5 * Math.cos((Math.PI * left) / fadeOut);
    out[i] *= g;
  }
  return out;
}

/** WAV PCM 16 bits mono. @param {Float32Array} b */
function toWav(b) {
  const data = Buffer.alloc(b.length * 2);
  for (let i = 0; i < b.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b[i] * 32767))), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

module.exports = {
  SAMPLE_RATE,
  TAU,
  rng,
  buffer,
  pad,
  add,
  osc,
  fm,
  noise,
  biquad,
  env,
  strike,
  glide,
  semis,
  reverb,
  echo,
  saturate,
  bitcrush,
  filter,
  mixInto,
  dbToGain,
  peakOf,
  rmsOf,
  finish,
  limit,
  toWav,
};
