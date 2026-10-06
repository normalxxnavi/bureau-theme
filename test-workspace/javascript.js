// Archivo de prueba del tema: JavaScript (también sirve para probar la depuración:
// pon un breakpoint en la línea de `const report` y pulsa F5 → "Depurar javascript.js").
'use strict';

const EventEmitter = require('node:events');

const HOTLINE_NUMBER = 0x7f3a;
const ringPattern = /ring(?:-ring)?/u;

class Hotline extends EventEmitter {
  #calls = 0;

  constructor(owner = 'Director') {
    super();
    this.owner = owner;
    this.connected = false;
  }

  ring(times = 3) {
    for (let i = 0; i < times; i++) {
      this.#calls += 1;
      this.emit('ring', { call: this.#calls, number: HOTLINE_NUMBER });
    }
    return this;
  }

  answer() {
    if (this.connected) return null;
    this.connected = true;
    return `Línea abierta para ${this.owner}`;
  }
}

const hotline = new Hotline();
hotline.on('ring', ({ call, number }) => {
  console.log(`Llamada ${call} desde ${number.toString(16)} → ${ringPattern.test('ring-ring')}`);
});

const report = hotline.ring(2).answer() ?? 'sin respuesta';
const delays = [100, 250.5, 1e3].map((ms) => Math.round(ms / 10) * 10);
const isQuiet = delays.every((d) => d < 2_000) && !hotline.connected === false;

module.exports = { Hotline, report, delays, isQuiet, undefinedValue: undefined, nothing: null };
console.log(report, delays, isQuiet);
