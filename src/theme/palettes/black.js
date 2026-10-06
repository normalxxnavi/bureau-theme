// @ts-check
'use strict';

const dark = require('./dark');

/**
 * CONTROL Black — *Control* (2019), Black Rock.
 *
 * Hereda TODO de CONTROL Dark y solo cambia lo necesario para un fondo casi
 * negro. No es `#000000` puro: en pantallas OLED el negro absoluto provoca
 * «black smear» al hacer scroll. El texto se atenúa un poco para evitar el
 * halo del blanco sobre negro.
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
  },
  border: '#1C1C1F',

  fg: { ...dark.fg, main: '#CFCCC5' },

  // Rojo todavía más contenido.
  selectionAlpha: 0.15,

  syntax: { ...dark.syntax, text: '#CFCCC5' },

  ansi: { ...dark.ansi, black: '#1C1C1F', white: '#CFCCC5' },
};
