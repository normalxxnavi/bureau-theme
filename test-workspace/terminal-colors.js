// Muestra los 16 colores ANSI de la terminal con el tema activo:
//   node terminal-colors.js
'use strict';

const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const swatch = (code, label) => `\x1b[${code}m${label.padEnd(9)}\x1b[0m`;

console.log('\x1b[1mFederal Bureau of Control — colores de la terminal\x1b[0m\n');
console.log('normal  ' + names.map((n, i) => swatch(30 + i, n)).join(' '));
console.log('bright  ' + names.map((n, i) => swatch(90 + i, n)).join(' '));
console.log('fondo   ' + names.map((n, i) => `\x1b[${40 + i}m\x1b[${i === 0 ? 97 : 30}m ${n.padEnd(7)} \x1b[0m`).join(' '));
console.log('');
console.log(`\x1b[32m✔\x1b[0m Sector de Investigación sellado      \x1b[90m(12 ms)\x1b[0m`);
console.log(`\x1b[33m⚠\x1b[0m Aviso: anomalía en el proyector        \x1b[90m(sector 3)\x1b[0m`);
console.log(`\x1b[31m✘ Error:\x1b[0m brecha de contención en \x1b[36mmaintenance/boiler.ts\x1b[0m:\x1b[33m42\x1b[0m`);
console.log(`\x1b[34mℹ\x1b[0m \x1b[35mobjeto\x1b[0m OOP-0042 · \x1b[1mPROJECTOR\x1b[0m · \x1b[2mregistrado por el Bureau\x1b[0m`);
