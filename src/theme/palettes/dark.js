// @ts-check
'use strict';

/**
 * CONTROL Dark — *Control* (2019), The Oldest House.
 *
 * Hormigón brutalista en grises carbón ligeramente cálidos, texto color hueso
 * (documentos del Bureau) y el rojo FBC como acento de interfaz.
 *
 * Es la paleta de referencia: CONTROL Black hereda de ella y CONTROL Resonant
 * define exactamente los mismos roles.
 *
 * @type {import('../build').Palette}
 */
module.exports = {
  id: 'control-dark',
  label: 'CONTROL Dark',
  game: 'Control (2019) — The Oldest House',

  bg: {
    editor: '#17181A',
    sidebar: '#121315', // sidebar, activity bar, panel, barras de título y estado
    elevated: '#1E1F22', // hover, sugerencias, Command Palette, menús
    input: '#202125',
  },
  border: '#2A2B2F',

  fg: {
    bright: '#F2EFE8',
    main: '#D9D6CF',
    muted: '#8E8B85',
    placeholder: '#77746E',
    disabled: '#5E5C59',
    onAccent: '#FFFFFF',
  },

  accent: {
    main: '#E0352B', // Rojo FBC: cursor, foco, pestaña activa, indicadores
    solid: '#C42B22', // fondo de badges y botones (texto blanco encima)
    text: '#E5675D', // acento usado como texto (coincidencias de búsqueda…)
  },

  /** Opacidad del acento en la selección del editor. */
  selectionAlpha: 0.2,

  status: {
    error: '#FF6B6B', // más claro y rosado que el acento: activo ≠ roto
    warning: '#E6B04F',
    info: '#79A9D1',
    success: '#86B57E',
  },

  link: '#79A9D1',

  git: {
    added: '#86B57E',
    modified: '#79A9D1',
    deleted: '#C46A62', // tercer rojo, apagado (ni acento ni error)
    untracked: '#A3C99A',
    renamed: '#8FC1BE',
    conflict: '#E6904F',
    ignored: '#5E5C59',
    submodule: '#8E8B85',
  },

  syntax: {
    text: '#D9D6CF', // variables
    function: '#F2EFE8', // funciones y métodos: lo más claro (Astral Plane)
    property: '#BEBAB2',
    type: '#9FB6C9', // tipos y clases: señalética fluorescente fría
    namespace: '#AEB8C0',
    keyword: '#E5675D', // control de flujo: el rojo FBC dentro del código
    storage: '#C7A39A', // declaraciones y modificadores: hormigón teñido de rojo
    string: '#CDB68C', // papel envejecido
    number: '#E2A55A', // números y constantes: luz de sodio
    attribute: '#8FC1BE', // atributos, decoradores, atributos HTML
    regexp: '#8FC1BE',
    tag: '#9FB6C9',
    operator: '#8E8B85',
    punctuation: '#99968F',
    comment: '#827F78',
    commentTag: '#9A968E',
    heading: '#E5675D',
  },

  /** Colorización de corchetes por nivel: rojo suave, papel y acero. */
  brackets: ['#E08A82', '#CDB68C', '#9FB6C9'],

  ansi: {
    black: '#2A2B2F',
    red: '#E0524A',
    green: '#86B57E',
    yellow: '#E6B04F',
    blue: '#79A9D1',
    magenta: '#C58FB0',
    cyan: '#8FC1BE',
    white: '#D9D6CF',
    brightBlack: '#77746E',
    brightRed: '#FF6B6B',
    brightGreen: '#A3CC9A',
    brightYellow: '#F2C878',
    brightBlue: '#9CC2E6',
    brightMagenta: '#DDA9C8',
    brightCyan: '#AEDAD6',
    brightWhite: '#F2EFE8',
  },
};
