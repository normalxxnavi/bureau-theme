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
  const isLight = p.type === 'light';
  // En un tema claro el texto fino se «lava»: el texto exige nivel AAA. El
  // código se queda en AA (4,5:1) para que los colores se distingan del negro.
  const MIN_TEXT = isLight ? 15 : MIN.text;
  const MIN_CODE = MIN.code;
  const MIN_COMMENT = isLight ? MIN.code : MIN.comment;
  const selection = over(`${accent.main}${Math.round(p.selectionAlpha * 255).toString(16).padStart(2, '0')}`, bg.editor);
  const listActive = mix(bg.sidebar, accent.main, isLight ? 0.12 : 0.2);
  const sectionHeader = over(isLight ? '#00000009' : '#FFFFFF09', bg.sidebar);
  const terminal = bg.sidebar;
  const block = (/** @type {string} */ c, t = 0.55) => mix(bg.chrome, c, t);

  const checks = [
    { group: 'Texto', label: 'texto / editor', fg: fg.main, bg: bg.editor, min: MIN_TEXT },
    { group: 'Texto', label: 'texto / sidebar', fg: fg.main, bg: bg.sidebar, min: MIN_TEXT },
    { group: 'Texto', label: 'texto / widgets', fg: fg.main, bg: bg.elevated, min: MIN.text },
    { group: 'Texto', label: 'secundario / sidebar (pestañas inactivas, status bar)', fg: fg.muted, bg: bg.sidebar, min: MIN.ui },
    { group: 'Texto', label: 'secundario / widgets', fg: fg.muted, bg: bg.elevated, min: MIN.ui },
    { group: 'Texto', label: 'placeholder / input', fg: fg.placeholder, bg: bg.input, min: MIN.placeholder },
    { group: 'Texto', label: 'deshabilitado / editor (números de línea)', fg: fg.disabled, bg: bg.editor, min: MIN.disabled },

    { group: 'Selección', label: 'texto / selección', fg: fg.main, bg: selection, min: MIN.text },
    { group: 'Selección', label: 'comentario / selección', fg: s.comment, bg: selection, min: 3.5 },
    { group: 'Selección', label: 'subrayado de error / selección', fg: status.error, bg: selection, min: MIN.graphic },
    { group: 'Selección', label: 'texto / fila activa en listas', fg: fg.bright, bg: listActive, min: MIN.text },
    { group: 'Selección', label: 'texto / pestaña activa (modern UI)', fg: fg.bright, bg: mix(bg.editor, accent.main, isLight ? 0.1 : 0.14), min: MIN.text },
    { group: 'Selección', label: 'texto / pestaña activa del panel (modern UI)', fg: fg.bright, bg: mix(bg.sidebar, accent.main, isLight ? 0.12 : 0.18), min: MIN.text },
    { group: 'Selección', label: 'coincidencia / fila activa', fg: accent.text, bg: listActive, min: MIN.graphic },

    { group: 'Laterales', label: 'texto del monolito (título, barra de título)', fg: fg.chrome, bg: bg.chrome, min: MIN.text },
    { group: 'Laterales', label: 'texto secundario del monolito (barra de estado)', fg: fg.chromeMuted, bg: bg.chrome, min: MIN.ui },
    { group: 'Laterales', label: 'luz astral / monolito (título de la sidebar)', fg: fg.chromeActive, bg: bg.chrome, min: MIN.text },
    { group: 'Laterales', label: 'icono activo / placa de la Activity Bar', fg: fg.chromeActive, bg: mix(bg.chrome, accent.line, 0.3), min: MIN.ui },
    { group: 'Laterales', label: 'línea del acento / monolito', fg: accent.line, bg: bg.chrome, min: MIN.graphic },
    { group: 'Laterales', label: 'línea del acento / sidebar', fg: accent.line, bg: bg.sidebar, min: MIN.graphic },
    { group: 'Laterales', label: 'cabecera de sección / sidebar', fg: fg.bright, bg: sectionHeader, min: MIN.text },
    { group: 'Laterales', label: 'acento como texto / sidebar', fg: accent.text, bg: bg.sidebar, min: MIN.ui },

    { group: 'Acento', label: 'acento (cursor, bordes) / editor', fg: accent.line, bg: bg.editor, min: MIN.graphic },
    { group: 'Acento', label: 'blanco / acento sólido (badges, botones)', fg: fg.onAccent, bg: accent.solid, min: MIN.ui },
    { group: 'Acento', label: 'coincidencias / widgets', fg: accent.text, bg: bg.elevated, min: MIN.ui },
    { group: 'Acento', label: 'enlaces / widgets', fg: p.link, bg: bg.elevated, min: MIN.ui },
    { group: 'Acento', label: 'acento ≠ error (diferencia de luminosidad)', fg: accent.main, bg: status.error, min: 1.3 },
  ];

  for (const [k, v] of Object.entries(status)) {
    checks.push({ group: 'Estados', label: `${k} / editor`, fg: v, bg: bg.editor, min: MIN.ui });
  }
  checks.push({ group: 'Estados', label: 'blanco / item de error en status bar', fg: fg.onAccent, bg: block(status.error), min: MIN.ui });
  checks.push({ group: 'Estados', label: 'blanco / item de warning en status bar', fg: fg.onAccent, bg: block(status.warning, 0.45), min: MIN.ui });

  for (const [k, v] of Object.entries(git)) {
    checks.push({ group: 'Git', label: `${k} / sidebar`, fg: v, bg: bg.sidebar, min: k === 'ignored' || k === 'submodule' ? MIN.disabled : MIN.ui });
  }

  for (const [k, v] of Object.entries(s)) {
    const min = k === 'comment' ? MIN_COMMENT : MIN_CODE;
    checks.push({ group: 'Sintaxis', label: `${k} / editor`, fg: v, bg: bg.editor, min });
  }
  p.brackets.forEach((b, i) => checks.push({ group: 'Sintaxis', label: `corchetes nivel ${i + 1}`, fg: b, bg: bg.editor, min: MIN_CODE }));

  // El color ANSI que hace de «fondo» depende del tema: negro en los oscuros,
  // blanco en el claro. Ese no se comprueba como texto.
  const backgroundLike = isLight ? ['white', 'brightWhite'] : ['black'];
  const dimmed = isLight ? 'white' : 'brightBlack';
  for (const [k, v] of Object.entries(p.ansi)) {
    if (backgroundLike.includes(k)) continue;
    const min = k === dimmed || k === 'brightBlack' ? MIN.placeholder : MIN.code;
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
      `Mínimos de los temas oscuros (CONTROL Astral exige texto ≥ 15, código ≥ 7 y comentarios ≥ 6,5): texto ≥ ${MIN.text}, código y UI ≥ ${MIN.code}, comentarios ≥ ${MIN.comment}, elementos gráficos ≥ ${MIN.graphic}, placeholder ≥ ${MIN.placeholder}, deshabilitado ≥ ${MIN.disabled}.`,
      '',
    ];
    fs.writeFileSync(path.join(ROOT, 'docs', 'palette.md'), [...header, ...md].join('\n'));
    console.log('\n✔ docs/palette.md actualizado');
  }

  console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ Todas las comprobaciones pasan');
  process.exit(failures ? 1 : 0);
}

main();
