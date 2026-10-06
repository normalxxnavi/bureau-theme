// @ts-check
'use strict';

/**
 * Comprueba los contrastes críticos de las tres paletas y las reglas de diseño
 * del plan. Termina con código 1 si algo falla.
 *
 *   npm run contrast            → informe en consola
 *   npm run contrast -- --md    → además reescribe docs/palette.md
 */

const fs = require('node:fs');
const path = require('node:path');
const { contrast, over, mix, isRed, parse, format } = require('../src/theme/color');
const { palettes, buildTheme, ROOT } = require('../src/theme/build');

/** Mínimos (plan, sección 4). */
const MIN = { text: 7, code: 4.5, comment: 4.3, ui: 4.5, graphic: 3, placeholder: 3, disabled: 2.5 };

/**
 * @param {import('../src/theme/build').Palette} p
 * @returns {Array<{group: string, label: string, fg: string, bg: string, min: number}>}
 */
function checksFor(p) {
  const { bg, fg, accent, status, git, syntax: s } = p;
  const selection = over(`${accent.main}${Math.round(p.selectionAlpha * 255).toString(16).padStart(2, '0')}`, bg.editor);
  const listActive = mix(bg.sidebar, accent.main, 0.2);
  const terminal = bg.sidebar;

  const checks = [
    { group: 'Texto', label: 'texto / editor', fg: fg.main, bg: bg.editor, min: MIN.text },
    { group: 'Texto', label: 'texto / sidebar', fg: fg.main, bg: bg.sidebar, min: MIN.text },
    { group: 'Texto', label: 'texto / widgets', fg: fg.main, bg: bg.elevated, min: MIN.text },
    { group: 'Texto', label: 'secundario / sidebar (pestañas inactivas, status bar)', fg: fg.muted, bg: bg.sidebar, min: MIN.ui },
    { group: 'Texto', label: 'secundario / widgets', fg: fg.muted, bg: bg.elevated, min: MIN.ui },
    { group: 'Texto', label: 'placeholder / input', fg: fg.placeholder, bg: bg.input, min: MIN.placeholder },
    { group: 'Texto', label: 'deshabilitado / editor (números de línea)', fg: fg.disabled, bg: bg.editor, min: MIN.disabled },

    { group: 'Selección', label: 'texto / selección', fg: fg.main, bg: selection, min: MIN.text },
    { group: 'Selección', label: 'comentario / selección', fg: s.comment, bg: selection, min: 3.5 },
    { group: 'Selección', label: 'subrayado de error / selección', fg: status.error, bg: selection, min: MIN.graphic },
    { group: 'Selección', label: 'texto / fila activa en listas', fg: fg.bright, bg: listActive, min: MIN.text },
    { group: 'Selección', label: 'coincidencia / fila activa', fg: accent.text, bg: listActive, min: MIN.graphic },

    { group: 'Acento', label: 'acento (cursor, bordes) / editor', fg: accent.main, bg: bg.editor, min: MIN.graphic },
    { group: 'Acento', label: 'blanco / acento sólido (badges, botones)', fg: fg.onAccent, bg: accent.solid, min: MIN.ui },
    { group: 'Acento', label: 'coincidencias / widgets', fg: accent.text, bg: bg.elevated, min: MIN.ui },
    { group: 'Acento', label: 'enlaces / widgets', fg: p.link, bg: bg.elevated, min: MIN.ui },
    { group: 'Acento', label: 'acento ≠ error (diferencia de luminosidad)', fg: accent.main, bg: status.error, min: 1.3 },
  ];

  for (const [k, v] of Object.entries(status)) {
    checks.push({ group: 'Estados', label: `${k} / editor`, fg: v, bg: bg.editor, min: MIN.ui });
  }
  checks.push({ group: 'Estados', label: 'blanco / item de error en status bar', fg: fg.onAccent, bg: mix(bg.sidebar, status.error, 0.55), min: MIN.ui });
  checks.push({ group: 'Estados', label: 'blanco / item de warning en status bar', fg: fg.onAccent, bg: mix(bg.sidebar, status.warning, 0.45), min: MIN.ui });

  for (const [k, v] of Object.entries(git)) {
    checks.push({ group: 'Git', label: `${k} / sidebar`, fg: v, bg: bg.sidebar, min: k === 'ignored' || k === 'submodule' ? MIN.disabled : MIN.ui });
  }

  for (const [k, v] of Object.entries(s)) {
    const min = k === 'comment' ? MIN.comment : MIN.code;
    checks.push({ group: 'Sintaxis', label: `${k} / editor`, fg: v, bg: bg.editor, min });
  }
  p.brackets.forEach((b, i) => checks.push({ group: 'Sintaxis', label: `corchetes nivel ${i + 1}`, fg: b, bg: bg.editor, min: MIN.code }));

  for (const [k, v] of Object.entries(p.ansi)) {
    if (k === 'black') continue; // se usa como fondo
    const min = k === 'brightBlack' ? MIN.placeholder : MIN.code;
    checks.push({ group: 'Terminal', label: `ansi ${k}`, fg: v, bg: terminal, min });
  }
  return checks;
}

/**
 * Regla de Resonant: «el rojo pertenece al Hiss». Recorre el JSON generado y
 * lista cada color rojo que aparezca en una clave que no sea de peligro.
 * @param {import('../src/theme/build').Palette} p
 */
function redOutsideDanger(p) {
  const allowed = /error|Error|deleted|Deleted|Deletions|noMatches|removed|Removed|uncovered|ansiRed|ansiBrightRed|charts\.red|stop|disconnect|exception|Exception|iconFailed|iconErrored|testing\.peek|unexpectedBracket|invalid|Invalid|Diff deleted|Log error/;
  const theme = buildTheme(p);
  const offenders = [];
  const opaque = (/** @type {string} */ hex) => format({ ...parse(hex), a: 1 });
  for (const [key, value] of Object.entries(theme.colors)) {
    if (isRed(opaque(value)) && !allowed.test(key)) offenders.push(`colors["${key}"] = ${value}`);
  }
  for (const rule of theme.tokenColors) {
    const fg = rule.settings.foreground;
    if (fg && isRed(fg) && !allowed.test(rule.name)) offenders.push(`tokenColors["${rule.name}"] = ${fg}`);
  }
  for (const [key, value] of Object.entries(theme.semanticTokenColors)) {
    const fg = typeof value === 'string' ? value : /** @type {any} */ (value).foreground;
    if (fg && isRed(fg) && !allowed.test(key)) offenders.push(`semanticTokenColors["${key}"] = ${fg}`);
  }
  return offenders;
}

function main() {
  const writeMd = process.argv.includes('--md');
  let failures = 0;
  /** @type {string[]} */
  const md = [];

  for (const p of palettes) {
    const checks = checksFor(p);
    console.log(`\n${p.label}  —  ${p.game}`);
    md.push(`## ${p.label}`, '', `*${p.game}*`, '');
    let group = '';
    for (const c of checks) {
      const ratio = contrast(c.fg, c.bg);
      const ok = ratio >= c.min;
      if (!ok) failures++;
      if (c.group !== group) {
        group = c.group;
        console.log(`  ${group}`);
        md.push(`### ${group}`, '', '| Comprobación | Color | Fondo | Ratio | Mínimo |', '|---|---|---|---|---|');
      }
      console.log(`    ${ok ? '✔' : '✘'} ${c.label.padEnd(52)} ${c.fg} / ${c.bg}  ${ratio.toFixed(2).padStart(5)}  (≥ ${c.min})`);
      md.push(`| ${c.label} | \`${c.fg}\` | \`${c.bg}\` | ${ok ? '' : '❌ '}${ratio.toFixed(2)} | ${c.min} |`);
      const next = checks[checks.indexOf(c) + 1];
      if (!next || next.group !== group) md.push('');
    }

    if (p.id === 'control-resonant') {
      const offenders = redOutsideDanger(p);
      if (offenders.length) {
        failures += offenders.length;
        console.log('  ✘ Rojo fuera de errores/diagnósticos/Git (regla «el rojo es del Hiss»):');
        for (const o of offenders) console.log(`      ${o}`);
      } else {
        console.log('  ✔ El rojo solo aparece en errores, diagnósticos, Git eliminado y ANSI rojo («el rojo es del Hiss»)');
      }
      md.push('### Regla «el rojo es del Hiss»', '', offenders.length ? `❌ ${offenders.length} usos de rojo fuera de peligro.` : '✅ El rojo solo aparece en errores, diagnósticos, Git eliminado y ANSI rojo.', '');
    }
  }

  if (writeMd) {
    const header = [
      '# Paletas — contrastes calculados',
      '',
      '> Archivo generado por `npm run contrast -- --md`. No lo edites a mano: cambia `src/theme/palettes/*.js` y vuelve a generarlo.',
      '',
      `Mínimos: texto ≥ ${MIN.text}, código y UI ≥ ${MIN.code}, comentarios ≥ ${MIN.comment}, elementos gráficos ≥ ${MIN.graphic}, placeholder ≥ ${MIN.placeholder}, deshabilitado ≥ ${MIN.disabled}.`,
      '',
    ];
    fs.writeFileSync(path.join(ROOT, 'docs', 'palette.md'), [...header, ...md].join('\n'));
    console.log('\n✔ docs/palette.md actualizado');
  }

  console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ Todas las comprobaciones pasan');
  process.exit(failures ? 1 : 0);
}

main();
