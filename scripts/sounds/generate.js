// @ts-check
'use strict';

/**
 * Genera los sonidos originales de los dos packs en sounds/control y
 * sounds/resonant.
 *
 *   npm run sounds
 *
 * Son RECREACIONES originales inspiradas en el ambiente de los juegos: nada se
 * extrae ni se copia de ellos. La descripción de cada sonido está en
 * docs/sound-design.md.
 *
 * Pack Control  → analógico e institucional: timbres, teléfonos, máquinas de
 *                 escribir, alarmas y la reverb de una sala de hormigón.
 * Pack Resonant → sintético y «cósmico»: tonos de cristal (FM), caídas de
 *                 tono por gravedad y ecos que se repiten (el Patterning).
 */

const fs = require('node:fs');
const path = require('node:path');
const D = require('./dsp');

const ROOT = path.resolve(__dirname, '..', '..');

// --- Piezas reutilizables ----------------------------------------------------

/**
 * Campana o placa metálica: suma de parciales con caída exponencial.
 * @param {Float32Array} out @param {number} start @param {number} f0
 * @param {Array<[number, number, number]>} partials [ratio, amplitud, tau]
 * @param {number} [gain]
 */
function bell(out, start, f0, partials, gain = 1) {
  for (const [ratio, amp, tau] of partials) {
    const o = D.osc('sine', f0 * ratio);
    const e = D.strike(0.002, tau);
    D.add(out, start, tau * 6, (t) => o(t) * e(t) * amp * gain);
  }
  return out;
}

/** Clic seco (ruido agudo muy corto + resonancia). */
function click(/** @type {Float32Array} */ out, /** @type {number} */ start, { freq = 2500, tau = 0.004, gain = 1, seed = 1 } = {}) {
  const n = D.noise('white', seed);
  const hp = D.biquad('highpass', 1800);
  const bp = D.biquad('bandpass', freq, 6);
  const e = D.strike(0.0005, tau);
  D.add(out, start, tau * 8, (t) => {
    const x = n() * e(t);
    return (hp(x, t) * 0.6 + bp(x, t) * 2.2) * gain;
  });
  return out;
}

/** Golpe grave con caída de tono (sello, «thunk», impacto). */
function thump(/** @type {Float32Array} */ out, /** @type {number} */ start, { from = 140, to = 60, tau = 0.04, gain = 1, noiseGain = 0.3, seed = 2 } = {}) {
  const o = D.osc('sine', D.glide(from, to, tau * 2));
  const n = D.noise('white', seed);
  const lp = D.biquad('lowpass', 900);
  const e = D.strike(0.002, tau);
  const en = D.strike(0.001, tau * 0.4);
  D.add(out, start, tau * 7, (t) => (o(t) * e(t) + lp(n(), t) * en(t) * noiseGain) * gain);
  return out;
}

/**
 * Susurro: ruido filtrado por dos «formantes» con sílabas irregulares.
 * Evoca el murmullo del Hiss sin usar voces.
 */
function whisper(/** @type {Float32Array} */ out, /** @type {number} */ start, /** @type {Array<[number, number]>} */ syllables, { center = 2600, gain = 1, seed = 7, rise = 1.15 } = {}) {
  const n = D.noise('white', seed);
  const r = D.rng(seed + 100);
  const total = Math.max(...syllables.map(([s, d]) => s + d)) + 0.05;
  const f1 = D.biquad('bandpass', (t) => center * (1 + (rise - 1) * (t / total)), 3.5);
  const f2 = D.biquad('bandpass', (t) => center * 1.62 * (1 + (rise - 1) * (t / total)), 4.5);
  const hp = D.biquad('highpass', 5000);
  const shapes = syllables.map(([s, d]) => ({ s, d, peak: 0.6 + r() * 0.4 }));
  D.add(out, start, total, (t) => {
    let a = 0;
    for (const { s, d, peak } of shapes) {
      if (t >= s && t <= s + d) a = Math.max(a, peak * Math.max(0, Math.sin((Math.PI * (t - s)) / d)) ** 1.5);
    }
    const x = n();
    return (f1(x, t) * 1.4 + f2(x, t) * 1.0 + hp(x, t) * 0.25) * a * gain;
  });
  return out;
}

/** Ráfaga de ruido con un filtro que barre (whoosh). */
function whoosh(/** @type {Float32Array} */ out, /** @type {number} */ start, /** @type {number} */ dur, /** @type {(t: number) => number} */ cutoff, { type = /** @type {'lowpass'|'bandpass'} */ ('bandpass'), q = 1.2, gain = 1, seed = 11, shape = D.env([[0, 0], [0.3, 1], [1, 0]]) } = {}) {
  const n = D.noise('pink', seed);
  const f = D.biquad(type, cutoff, q);
  D.add(out, start, dur, (t) => f(n(), t) * shape(t / dur) * gain);
  return out;
}

/** Nota de «cristal» con FM (tonos de la Hedron). */
function glass(/** @type {Float32Array} */ out, /** @type {number} */ start, /** @type {number} */ freq, { tau = 0.45, gain = 1, ratio = 3.5, index = 2.2 } = {}) {
  const e = D.strike(0.004, tau);
  const o = D.fm(freq, ratio, (t) => index * Math.exp(-t / (tau * 0.5)));
  const s = D.osc('sine', freq * 2);
  D.add(out, start, tau * 6, (t) => (o(t) * 0.8 + s(t) * 0.15) * e(t) * gain);
  return out;
}

// --- Pack Control: The Oldest House ------------------------------------------

/** @type {Record<string, {describe: string, rmsDb: number, render: () => Float32Array}>} */
const control = {
  'startup.wav': {
    describe: 'Zumbido grave de la Oldest House: un drone de hormigón que respira, con una resonancia lejana.',
    rmsDb: -14,
    render() {
      const b = D.buffer(3.2);
      const tones = [[55, 0.5], [55.35, 0.35], [110, 0.3], [165.2, 0.16], [220.7, 0.08]].map(([f, a]) => [D.osc('sine', f), a]);
      const swell = D.env([[0, 0], [0.9, 1], [2.1, 0.85], [3.0, 0]]);
      D.add(b, 0, 3.2, (t) => tones.reduce((s, [o, a]) => s + /** @type {any} */ (o)(t) * /** @type {number} */ (a), 0) * swell(t));
      D.saturate(b, 1.6);
      const air = D.noise('pink', 3);
      const airLp = D.biquad('lowpass', 900);
      D.add(b, 0, 3.2, (t) => airLp(air(), t) * 0.05 * swell(t));
      const res = D.osc('sine', (t) => 880 * (1 + 0.002 * Math.sin(D.TAU * 0.7 * t)));
      const resEnv = D.env([[0, 0], [0.6, 0], [1.4, 1], [2.4, 0.6], [3.0, 0]]);
      D.add(b, 0, 3.2, (t) => res(t) * (0.6 + 0.4 * Math.sin(D.TAU * 5.5 * t)) * resEnv(t) * 0.07);
      return D.reverb(b, { mix: 0.35, size: 1.3 });
    },
  },

  'theme.wav': {
    describe: 'La Hotline: el timbre de un teléfono antiguo (dos campanillas golpeadas por un badajo) en una sala de hormigón.',
    rmsDb: -15,
    render() {
      const b = D.buffer(1.6);
      const partials = /** @type {Array<[number, number, number]>} */ ([[1, 1, 0.12], [1.48, 0.45, 0.08], [2.02, 0.35, 0.06], [2.66, 0.2, 0.04], [3.2, 0.1, 0.03]]);
      const r = D.rng(5);
      for (let i = 0, t = 0; t < 0.95; i++, t += 1 / 22) {
        bell(b, t, i % 2 ? 1180 : 1262, partials, 0.35 * (0.8 + r() * 0.4) * (t > 0.8 ? 1 - (t - 0.8) / 0.15 : 1));
      }
      return D.reverb(D.filter(b, D.biquad('lowpass', 5200)), { mix: 0.22, size: 0.8 });
    },
  },

  'save.wav': {
    describe: 'Sello de archivo: un golpe seco de goma sobre papel. Muy discreto.',
    rmsDb: -18,
    render() {
      const b = D.buffer(0.2);
      click(b, 0, { freq: 3200, tau: 0.003, gain: 0.35, seed: 21 });
      thump(b, 0.004, { from: 125, to: 70, tau: 0.03, noiseGain: 0.5, seed: 22 });
      return b;
    },
  },

  'error.wav': {
    describe: 'Susurro del Hiss: murmullos de ruido filtrado y un tono grave disonante (segunda menor) que crece.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.5);
      whisper(b, 0.03, [[0, 0.18], [0.2, 0.14], [0.36, 0.22], [0.62, 0.3]], { center: 2600, gain: 0.9, seed: 31 });
      const lo1 = D.osc('saw', 98);
      const lo2 = D.osc('saw', 103.8);
      const lp = D.biquad('lowpass', 480);
      const swell = D.env([[0, 0], [0.5, 1], [0.95, 0.8], [1.3, 0]]);
      D.add(b, 0, 1.4, (t) => lp((lo1(t) + lo2(t)) * 0.5, t) * swell(t) * 0.55);
      return D.reverb(b, { mix: 0.3, size: 1.2 });
    },
  },

  'clear.wav': {
    describe: 'Control Point purificado: un barrido de aire que sube y un acorde mayor que se abre, con una campanilla.',
    rmsDb: -13,
    render() {
      const b = D.buffer(1.8);
      whoosh(b, 0, 0.7, D.glide(300, 6000, 0.5), { type: 'lowpass', q: 0.9, gain: 0.5, seed: 41, shape: D.env([[0, 0], [0.6, 1], [1, 0]]) });
      const chord = [220, 329.63, 440, 554.37];
      chord.forEach((f, i) => {
        const o = D.osc('sine', (t) => f * D.semis(-1 + Math.min(1, t / 0.3)));
        const e = D.env([[0, 0], [0.25, 1], [0.9, 0.7], [1.45 - i * 0.05, 0]]);
        D.add(b, 0.08 + i * 0.06, 1.5, (t) => o(t) * e(t) * 0.22);
      });
      bell(b, 0.38, 1760, [[1, 0.5, 0.25], [2.76, 0.12, 0.12], [5.4, 0.05, 0.06]]);
      return D.reverb(b, { mix: 0.35, size: 1.2 });
    },
  },

  'build-ok.wav': {
    describe: 'Campana de ascensor: dos notas ascendentes (sol–do), limpias y breves.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.4);
      const tube = /** @type {Array<[number, number, number]>} */ ([[1, 1, 0.42], [2.0, 0.28, 0.25], [2.76, 0.14, 0.15], [5.4, 0.04, 0.06]]);
      bell(b, 0, 783.99, tube, 0.7);
      bell(b, 0.16, 1046.5, tube, 0.8);
      return D.reverb(b, { mix: 0.25 });
    },
  },

  'build-fail.wav': {
    describe: 'Alerta del Bureau: dos toques graves de sirena filtrada que resuenan en un pasillo de hormigón.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.5);
      for (const start of [0, 0.42]) {
        const a = D.osc('saw', (t) => 233 * D.semis(-0.3 * Math.min(1, t / 0.3)));
        const c = D.osc('saw', (t) => 277.2 * D.semis(-0.3 * Math.min(1, t / 0.3)));
        const lp = D.biquad('lowpass', 1300, 0.9);
        const e = D.env([[0, 0], [0.012, 1], [0.27, 0.85], [0.32, 0]]);
        D.add(b, start, 0.33, (t) => lp((a(t) + c(t)) * 0.5, t) * e(t));
      }
      D.saturate(b, 1.4);
      return D.reverb(b, { mix: 0.32, size: 1.3 });
    },
  },

  'terminal-fail.wav': {
    describe: 'Estática de radio: un chasquido de interferencias con un pitido apagado.',
    rmsDb: -17,
    render() {
      const b = D.buffer(0.6);
      const n = D.noise('white', 51);
      const bp = D.biquad('bandpass', 1800, 0.7);
      const r = D.rng(52);
      let level = 0;
      const e = D.env([[0, 0], [0.02, 1], [0.4, 0.8], [0.55, 0]]);
      D.add(b, 0, 0.56, (t, i) => {
        if (i % 480 === 0) level = 0.4 + r() * 0.6; // cambios bruscos cada 15 ms
        const crackle = r() < 0.004 ? (r() * 2 - 1) * 3 : 0;
        return (bp(n(), t) * level + crackle * 0.3) * e(t);
      });
      const tone = D.osc('sine', 1000);
      D.add(b, 0.05, 0.12, (t) => tone(t) * 0.12 * Math.sin((Math.PI * t) / 0.12));
      return b;
    },
  },

  'debug.wav': {
    describe: 'Transformación del Service Weapon: un trinquete mecánico que acelera, energía que sube y un cierre metálico.',
    rmsDb: -13,
    render() {
      const b = D.buffer(1.0);
      [0, 0.07, 0.13, 0.18, 0.22, 0.255, 0.285, 0.31].forEach((t, i) => click(b, t, { freq: 2600 + i * 120, tau: 0.004, gain: 0.5, seed: 60 + i }));
      whoosh(b, 0, 0.36, D.glide(400, 2500, 0.36), { gain: 0.5, seed: 61 });
      const energy = D.osc('saw', D.glide(150, 600, 0.36));
      const lp = D.biquad('lowpass', 1500);
      D.add(b, 0, 0.37, (t) => lp(energy(t), t) * (t / 0.37) * 0.25);
      thump(b, 0.36, { from: 90, to: 48, tau: 0.08, noiseGain: 0.4, seed: 62 });
      bell(b, 0.36, 2200, [[1, 0.25, 0.1], [1.41, 0.18, 0.08]]);
      return D.reverb(b, { mix: 0.2 });
    },
  },

  'breakpoint.wav': {
    describe: 'Proyector de diapositivas: «ka-chunk», el carro avanza y la diapositiva cae en su sitio.',
    rmsDb: -18,
    render() {
      const b = D.buffer(0.32);
      click(b, 0, { freq: 2200, tau: 0.006, gain: 0.8, seed: 71 });
      const n = D.noise('pink', 72);
      const lp = D.biquad('lowpass', 1500);
      D.add(b, 0.03, 0.09, (t) => lp(n(), t) * 0.15 * Math.sin((Math.PI * t) / 0.09));
      thump(b, 0.12, { from: 140, to: 80, tau: 0.035, noiseGain: 0.6, seed: 73 });
      return D.reverb(b, { mix: 0.1, size: 0.6 });
    },
  },

  'commit.wav': {
    describe: 'Máquina de escribir y timbre del carro: tres teclas y la campanilla de fin de línea.',
    rmsDb: -15,
    render() {
      const b = D.buffer(1.0);
      [0, 0.09, 0.17].forEach((t, i) => {
        click(b, t, { freq: 1800, tau: 0.012, gain: 0.6, seed: 80 + i });
        thump(b, t + 0.002, { from: 220, to: 160, tau: 0.015, noiseGain: 0.2, gain: 0.5, seed: 85 + i });
      });
      bell(b, 0.3, 2637, [[1, 0.6, 0.35], [2.4, 0.2, 0.15], [3.9, 0.08, 0.08]]);
      return D.reverb(b, { mix: 0.12, size: 0.7 });
    },
  },
};

// --- Pack Resonant: Patterned Manhattan --------------------------------------

/** @type {typeof control} */
const resonant = {
  'startup.wav': {
    describe: 'Manhattan a lo lejos, deformado: rumor de ciudad, un acorde que se hunde por la gravedad y un motivo de cristal que se repite.',
    rmsDb: -14,
    render() {
      const b = D.buffer(3.4);
      const rumble = D.noise('brown', 101);
      const rlp = D.biquad('lowpass', 250);
      const rEnv = D.env([[0, 0], [0.8, 1], [2.6, 0.8], [3.3, 0]]);
      D.add(b, 0, 3.4, (t) => rlp(rumble(), t) * rEnv(t) * 0.5);
      const bend = (/** @type {number} */ t) => D.semis(-0.3 * (t / 3.2));
      [146.83, 220, 329.63, 349.23].forEach((f, i) => {
        const a = D.osc('saw', (t) => f * bend(t) * D.semis(0.06));
        const c = D.osc('saw', (t) => f * bend(t) * D.semis(-0.06));
        const lp = D.biquad('lowpass', 1100);
        const e = D.env([[0, 0], [1.0 + i * 0.1, 1], [2.4, 0.8], [3.2, 0]]);
        D.add(b, 0, 3.3, (t) => lp((a(t) + c(t)) * 0.5, t) * e(t) * 0.12);
      });
      [0, 1, 2, 3].forEach((k) => glass(b, 0.5 + k * 0.45, 880 * D.semis(-k), { gain: 0.35 * Math.pow(0.65, k), tau: 0.35 }));
      return D.reverb(b, { mix: 0.4, size: 1.4 });
    },
  },

  'theme.wav': {
    describe: 'Pulso de la Hedron: dos tonos de cristal puros que se repiten tres veces, cada vez más lejos.',
    rmsDb: -15,
    render() {
      const b = D.buffer(1.5);
      [0, 1, 2].forEach((k) => {
        const g = [1, 0.55, 0.3][k];
        glass(b, k * 0.28, 659.25 * D.semis(k * 0.07), { gain: g * 0.6, ratio: 2, index: 2 });
        glass(b, k * 0.28 + 0.01, 987.77 * D.semis(k * 0.07), { gain: g * 0.4, ratio: 2, index: 1.5 });
      });
      return D.reverb(b, { mix: 0.35, size: 1.2 });
    },
  },

  'save.wav': {
    describe: 'Clic metálico: un «tic» sintético y breve. Muy discreto.',
    rmsDb: -18,
    render() {
      const b = D.buffer(0.15);
      const tick = D.fm(3200, 1.41, (t) => 3 * Math.exp(-t / 0.008));
      const e = D.strike(0.0005, 0.012);
      D.add(b, 0, 0.1, (t) => tick(t) * e(t) * 0.6);
      const lo = D.osc('sine', 400);
      const el = D.strike(0.001, 0.01);
      D.add(b, 0, 0.08, (t) => lo(t) * el(t) * 0.5);
      return b;
    },
  },

  'error.wav': {
    describe: 'El Hiss invade la ciudad: un susurro que se repite en ecos cada vez más graves y un tono distorsionado.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.5);
      [0, 1, 2, 3].forEach((k) => {
        whisper(b, 0.02 + k * 0.18, [[0, 0.16], [0.07, 0.14]], { center: 3000 * Math.pow(0.82, k), gain: 0.9 * Math.pow(0.6, k), seed: 130 + k });
      });
      const lo = D.osc('sine', 82.4);
      const lo2 = D.osc('sine', 87.3);
      const swell = D.env([[0, 0], [0.45, 1], [1.0, 0.7], [1.35, 0]]);
      const low = D.buffer(1.5);
      D.add(low, 0, 1.4, (t) => (lo(t) + lo2(t) * 0.7) * swell(t) * 0.5);
      D.mixInto(b, D.saturate(low, 2.5), 0, 0.6);
      return D.reverb(b, { mix: 0.25 });
    },
  },

  'clear.wav': {
    describe: 'Resonant derrotado: un impacto profundo, un acorde que se eleva y un brillo que se desvanece.',
    rmsDb: -13,
    render() {
      const b = D.buffer(1.9);
      thump(b, 0, { from: 70, to: 35, tau: 0.18, noiseGain: 0.35, gain: 0.9, seed: 141 });
      [164.81, 246.94, 329.63, 415.3].forEach((f, i) => {
        const o = D.osc('sine', f);
        const s = D.osc('saw', f);
        const lp = D.biquad('lowpass', 900);
        const e = D.env([[0, 0], [0.3, 1], [0.9, 0.7], [1.5 - i * 0.05, 0]]);
        D.add(b, 0.15 + i * 0.1, 1.6, (t) => (o(t) * 0.7 + lp(s(t), t) * 0.3) * e(t) * 0.2);
      });
      const sh1 = D.osc('sine', 2637);
      const sh2 = D.osc('sine', 3520);
      const se = D.env([[0, 0], [0.2, 1], [1.2, 0]]);
      D.add(b, 0.5, 1.3, (t) => (sh1(t) + sh2(t) * 0.6) * (0.5 + 0.5 * Math.sin(D.TAU * 7 * t)) * se(t) * 0.05);
      return D.reverb(b, { mix: 0.4, size: 1.3 });
    },
  },

  'build-ok.wav': {
    describe: 'Arpegio ascendente de cristal (mi–sol#–si) con un eco que lo repite más lejos.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.3);
      [659.25, 830.61, 987.77].forEach((f, i) => glass(b, i * 0.09, f, { gain: 0.5, tau: 0.4 }));
      return D.reverb(D.echo(b, { time: 0.32, feedback: 0.25, mix: 0.35, cutoff: 2500 }), { mix: 0.3 });
    },
  },

  'build-fail.wav': {
    describe: 'Distorsión gravitatoria: un tono que se desploma dos octavas mientras se rompe digitalmente, con un golpe sub.',
    rmsDb: -14,
    render() {
      const b = D.buffer(1.3);
      const o = D.osc('saw', (t) => 440 * Math.pow(0.25, Math.min(1, t / 0.8)));
      const lp = D.biquad('lowpass', (t) => 2500 - 1800 * Math.min(1, t / 0.8));
      const e = D.env([[0, 0], [0.02, 1], [0.7, 0.8], [0.95, 0]]);
      const tone = D.buffer(1.3);
      D.add(tone, 0, 1.0, (t) => lp(o(t), t) * e(t) * 0.6);
      D.mixInto(b, tone, 0, 0.6);
      D.mixInto(b, D.bitcrush(tone, 6, 4000), 0, 0.4);
      thump(b, 0, { from: 60, to: 40, tau: 0.12, noiseGain: 0.2, seed: 161 });
      D.saturate(b, 1.3);
      return D.reverb(b, { mix: 0.25 });
    },
  },

  'terminal-fail.wav': {
    describe: 'Estática con «glitch»: un fragmento de interferencia que se repite cuatro veces, como un patrón atascado.',
    rmsDb: -17,
    render() {
      const slice = D.buffer(0.04);
      const n = D.noise('white', 171);
      const bp = D.biquad('bandpass', 2000, 0.8);
      D.add(slice, 0, 0.04, (t) => bp(n(), t) * Math.sin((Math.PI * t) / 0.04));
      const b = D.buffer(0.5);
      [0, 0.055, 0.11, 0.165].forEach((t, k) => D.mixInto(b, slice, t, 1 - k * 0.15));
      const tail = D.noise('white', 172);
      const tbp = D.biquad('bandpass', 1500, 0.7);
      D.add(b, 0.22, 0.25, (t) => tbp(tail(), t) * Math.exp(-t / 0.06) * 0.5);
      return b;
    },
  },

  'debug.wav': {
    describe: 'El Aberrant cambia de forma: tres transformaciones sintéticas que suben de tono, cada una con su clic, y un cierre.',
    rmsDb: -13,
    render() {
      const b = D.buffer(1.1);
      [220, 330, 440].forEach((f, k) => {
        const start = k * 0.22;
        const o = D.fm(D.glide(f * 0.8, f, 0.18), 1.5 + k * 0.5, (t) => 3 * (1 - t / 0.2));
        const form = D.biquad('bandpass', D.glide(600, 2400, 0.2), 2);
        const e = D.env([[0, 0], [0.03, 1], [0.17, 0.7], [0.2, 0]]);
        D.add(b, start, 0.2, (t) => (form(o(t), t) * 1.5 + o(t) * 0.3) * e(t) * 0.5);
        click(b, start + 0.19, { freq: 3000 + k * 400, tau: 0.004, gain: 0.5, seed: 180 + k });
      });
      thump(b, 0.68, { from: 100, to: 50, tau: 0.08, noiseGain: 0.3, seed: 185 });
      return D.reverb(b, { mix: 0.2 });
    },
  },

  'breakpoint.wav': {
    describe: 'Shift: un desplazamiento rápido que cae y vuelve a subir, como cambiar de gravedad.',
    rmsDb: -18,
    render() {
      const b = D.buffer(0.4);
      const curve = D.env([[0, 3000], [0.12, 600], [0.3, 2000]]);
      whoosh(b, 0, 0.32, curve, { gain: 0.8, q: 2, seed: 191 });
      const s = D.osc('sine', D.env([[0, 800], [0.12, 400], [0.3, 600]]));
      D.add(b, 0, 0.3, (t) => s(t) * Math.sin((Math.PI * t) / 0.3) * 0.15);
      return D.reverb(b, { mix: 0.15 });
    },
  },

  'commit.wav': {
    describe: 'Golpe metálico con eco: una pieza de hierro golpeada cuyo sonido se repite en patrón.',
    rmsDb: -15,
    render() {
      const b = D.buffer(1.1);
      bell(b, 0, 523.25, [[1, 0.6, 0.3], [2.5, 0.35, 0.18], [3.99, 0.22, 0.1], [5.56, 0.12, 0.06]]);
      click(b, 0, { freq: 4000, tau: 0.003, gain: 0.3, seed: 201 });
      return D.reverb(D.echo(b, { time: 0.15, feedback: 0.45, mix: 0.5, cutoff: 1800 }), { mix: 0.15 });
    },
  },
};

// --- Generación --------------------------------------------------------------

// Teclear en el editor: tres variantes por pack (afinación y golpe distintos)
// para que una ráfaga de teclas no suene a metralleta.
for (const [i, pitch] of /** @type {Array<[number, number]>} */ ([[1, 1], [2, 1.07], [3, 0.94]])) {
  const name = i === 1 ? 'typing.wav' : `typing-${i}.wav`;
  control[name] = {
    describe: `Tecla de la máquina de escribir de la Agencia: clic metálico y golpe seco del tipo contra el rodillo (variante ${i}).`,
    rmsDb: -19,
    render() {
      const b = D.buffer(0.09);
      click(b, 0, { freq: 2600 * pitch, tau: 0.0025, gain: 0.5, seed: 40 + i });
      thump(b, 0.003, { from: 190 * pitch, to: 110 * pitch, tau: 0.012, noiseGain: 0.6, seed: 50 + i });
      click(b, 0.02, { freq: 1500 * pitch, tau: 0.002, gain: 0.16, seed: 60 + i });
      return b;
    },
  };
  resonant[name] = {
    describe: `Tic de resonancia: un golpe de cristal muy corto, como una tecla en el Manhattan alterado (variante ${i}).`,
    rmsDb: -19,
    render() {
      const b = D.buffer(0.12);
      glass(b, 0, 2100 * pitch, { tau: 0.03, gain: 0.5, ratio: 3.5, index: 1.2 });
      click(b, 0, { freq: 4200 * pitch, tau: 0.0015, gain: 0.2, seed: 70 + i });
      return b;
    },
  };
}

const PACKS = { control, resonant };

function main() {
  const rows = [];
  for (const [pack, sounds] of Object.entries(PACKS)) {
    const dir = path.join(ROOT, 'sounds', pack);
    fs.mkdirSync(dir, { recursive: true });
    for (const [file, spec] of Object.entries(sounds)) {
      const audio = D.finish(spec.render(), { rmsDb: spec.rmsDb });
      fs.writeFileSync(path.join(dir, file), D.toWav(audio));
      const peak = 20 * Math.log10(D.peakOf(audio));
      const rms = 20 * Math.log10(D.rmsOf(audio));
      rows.push({ pack, file, dur: audio.length / D.SAMPLE_RATE, peak, rms, kb: (audio.length * 2 + 44) / 1024 });
    }
  }
  console.log('pack      archivo             duración   pico      RMS      tamaño');
  for (const r of rows) {
    console.log(
      `${r.pack.padEnd(9)} ${r.file.padEnd(19)} ${r.dur.toFixed(2).padStart(5)} s  ${r.peak.toFixed(1).padStart(6)} dB ${r.rms.toFixed(1).padStart(6)} dB ${r.kb.toFixed(0).padStart(5)} KB`
    );
  }
  const total = rows.reduce((s, r) => s + r.kb, 0);
  writeDocs(rows);
  console.log(`\n✔ ${rows.length} sonidos generados (${(total / 1024).toFixed(2)} MB) + docs/sound-design.md + sounds/LICENSES.md`);
}

/** Evento de VS Code que usa cada archivo (para la documentación). */
const EVENT_OF = {
  'startup.wav': 'Arranque de VS Code',
  'theme.wav': 'Activar un tema CONTROL',
  'save.wav': 'Guardar (manual)',
  'typing.wav': 'Escribir en el editor',
  'typing-2.wav': 'Escribir en el editor',
  'typing-3.wav': 'Escribir en el editor',
  'error.wav': 'Errores nuevos',
  'clear.wav': 'Todos los errores corregidos',
  'build-ok.wav': 'Tarea terminada con éxito',
  'build-fail.wav': 'Tarea fallida',
  'terminal-fail.wav': 'Comando de terminal fallido',
  'debug.wav': 'Inicio de depuración',
  'breakpoint.wav': 'Breakpoint alcanzado',
  'commit.wav': 'Commit de Git',
};

/** @param {Array<{pack: string, file: string, dur: number, peak: number, rms: number}>} rows */
function writeDocs(rows) {
  const md = [
    '# Diseño de sonido',
    '',
    '> Archivo generado por `npm run sounds` a partir de `scripts/sounds/generate.js`. No lo edites a mano.',
    '',
    'Todos los sonidos son **recreaciones originales** sintetizadas con código (osciladores, ruido, filtros,',
    'envolventes, reverb y eco). No contienen audio, música ni voces de *Control* ni de *Control Resonant*.',
    '',
    'Reglas de diseño (plan, sección 5.5):',
    '',
    '- La parte audible dura menos de 1,5 s (el arranque, unos 3 s); el resto es una cola de reverb que se apaga.',
    '- Ataque suave, sin clics al empezar ni cortes al terminar (fundido final y recorte por debajo de −50 dBFS).',
    '- Pico normalizado por sonido: −4/−6 dBFS los importantes, −8/−12 dBFS los frecuentes (guardar, breakpoint, terminal).',
    '- Formato: WAV PCM 16 bits, mono, 32 kHz (lo entienden los reproductores de Windows, macOS y Linux).',
    '',
  ];
  for (const [pack, sounds] of Object.entries(PACKS)) {
    md.push(pack === 'control' ? '## Pack Control — The Oldest House' : '## Pack Resonant — Patterned Manhattan', '');
    md.push(
      pack === 'control'
        ? 'Analógico e institucional: timbres, teléfonos, máquinas de escribir, alarmas y la reverb de una sala de hormigón.'
        : 'Sintético y «cósmico»: tonos de cristal (FM), caídas de tono por gravedad y ecos que se repiten (el *Patterning*).',
      ''
    );
    md.push('| Evento | Archivo | Sonido | Duración | Pico |', '|---|---|---|---|---|');
    for (const [file, spec] of Object.entries(sounds)) {
      const r = rows.find((x) => x.pack === pack && x.file === file);
      md.push(`| ${/** @type {any} */ (EVENT_OF)[file]} | \`${file}\` | ${spec.describe} | ${r?.dur.toFixed(2)} s | ${r?.peak.toFixed(1)} dB |`);
    }
    md.push('');
  }
  md.push(
    '## Cambiar o añadir sonidos',
    '',
    '1. Edita la receta en `scripts/sounds/generate.js` (las piezas reutilizables están arriba: `bell`, `click`, `thump`, `whisper`, `whoosh`, `glass`).',
    '2. Ejecuta `npm run sounds` y escúchalos con el comando **CONTROL: Probar sonidos** (F5 → ventana de pruebas).',
    '3. Para usar archivos propios sin tocar el código: ajuste `bureauTheme.sounds.customFolder`.',
    ''
  );
  fs.writeFileSync(path.join(ROOT, 'docs', 'sound-design.md'), md.join('\n'));

  const lic = [
    '# Sound licenses',
    '',
    'All files in `sounds/control/` and `sounds/resonant/` are original works, synthesized from scratch by',
    '`scripts/sounds/generate.js` (oscillators, filtered noise, envelopes, reverb and echo). They contain no',
    'audio, music or voice recordings from *Control*, *Control Resonant* or any other third-party source.',
    '',
    'They are distributed under the same MIT license as the rest of this extension.',
    '',
    '| File | Source | License |',
    '|---|---|---|',
    ...rows.map((r) => `| \`${r.pack}/${r.file}\` | Synthesized by \`scripts/sounds/generate.js\` | MIT |`),
    '',
  ];
  fs.writeFileSync(path.join(ROOT, 'sounds', 'LICENSES.md'), lic.join('\n'));
}

if (require.main === module) main();

module.exports = { PACKS };
