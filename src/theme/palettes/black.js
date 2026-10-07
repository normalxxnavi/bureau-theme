// @ts-check
'use strict';

const dark = require('./dark');

/**
 * CONTROL Black — *Control* (2019), Black Rock.
 *
 * Hereda la jerarquía de CONTROL Dark, pero tiene identidad propia: es el
 * «Plano Astral en negativo». Sobre negro, las líneas de señalética, el cursor
 * y los resplandores son de LUZ ASTRAL (blanco hueso), como el HUD del juego;
 * el rojo FBC queda para la selección, las píldoras activas, los badges y las
 * keywords.
 *
 * No es `#000000` puro en el editor: en pantallas OLED el negro absoluto
 * provoca «black smear» al hacer scroll. El texto se atenúa un poco para evitar
 * el halo del blanco sobre negro. El marco (monolito) sí es negro puro: no se
 * desplaza, así que no hay smear.
 *
 * @type {import('../build').Palette}
 */
module.exports = {
  ...dark,
  id: 'control-black',
  label: 'CONTROL Black',
  game: 'Control (2019) — Black Rock',

  bg: {
    editor: '#0A0A0B',
    sidebar: '#070708',
    elevated: '#111113',
    input: '#141416',
    chrome: '#000000',
  },
  border: '#1C1C1F',

  fg: { ...dark.fg, main: '#CFCCC5', chrome: '#CFCCC5' },

  accent: {
    ...dark.accent,
    line: '#ECEAE4', // luz astral: líneas, cursor y resplandores
  },

  // Rojo todavía más contenido.
  selectionAlpha: 0.15,

  syntax: { ...dark.syntax, text: '#CFCCC5' },

  ansi: { ...dark.ansi, black: '#1C1C1F', white: '#CFCCC5' },
};
