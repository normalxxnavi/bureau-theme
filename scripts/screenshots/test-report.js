// @ts-nocheck
// Salida de ejemplo de una batería de tests (solo para las capturas).
const g = (s) => `\x1b[32m${s}\x1b[0m`, d = (s) => `\x1b[2m${s}\x1b[0m`, b = (s) => `\x1b[1m${s}\x1b[0m`, c = (s) => `\x1b[36m${s}\x1b[0m`, y = (s) => `\x1b[33m${s}\x1b[0m`;
const lines = [
  '',
  ` ${b(c('RUN'))}  ${d('bureau-archive · Federal Bureau of Control')}`,
  '',
  ` ${g('✓')} src/archive.test.ts ${d('(12 tests)')} ${y('41ms')}`,
  ` ${g('✓')} src/sectors.test.ts ${d('(8 tests)')} ${y('22ms')}`,
  ` ${g('✓')} src/hotline.test.ts ${d('(5 tests)')} ${y('17ms')}`,
  ` ${g('✓')} src/clearance.test.ts ${d('(9 tests)')} ${y('30ms')}`,
  '',
  ` ${d('Test Files')}  ${b(g('4 passed'))} ${d('(4)')}`,
  `      ${d('Tests')}  ${b(g('34 passed'))} ${d('(34)')}`,
  `   ${d('Duration')}  1.18s ${d('(collect 210ms, tests 110ms)')}`,
];
console.log(lines.join('\n'));
