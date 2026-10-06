// @ts-check
'use strict';

/**
 * CONTROL Resonant — *Control Resonant* (2026), Manhattan bajo el Patterning.
 *
 * Asfalto mojado, hierro y ladrillo en grises FRÍOS (frente al gris cálido del
 * Dark). El acento es el cian pálido de la Hedron, la entidad opuesta al Hiss.
 *
 * Regla de arte tomada del juego: «el rojo pertenece al Hiss». Aquí el rojo
 * SOLO aparece en errores, diagnósticos, Git eliminado y el rojo ANSI de la
 * terminal. `npm run contrast` lo comprueba automáticamente.
 *
 * @type {import('../build').Palette}
 */
module.exports = {
  id: 'control-resonant',
  label: 'CONTROL Resonant',
  game: 'Control Resonant (2026) — Patterned Manhattan',
  type: 'dark',
  location: 'PATTERNED MANHATTAN',

  bg: {
    editor: '#15171B',
    sidebar: '#101215',
    elevated: '#1C1F24',
    input: '#1E2127',
    chrome: '#0B0D10', // hierro y asfalto de noche
  },
  border: '#272B31',

  fg: {
    bright: '#F1F2F0',
    main: '#D5D8DC',
    muted: '#8A9099',
    placeholder: '#737A84',
    disabled: '#5A6069',
    onAccent: '#FFFFFF',
    chrome: '#D5D8DC',
    chromeMuted: '#8A9099',
    chromeActive: '#FFFFFF',
  },

  accent: {
    main: '#6FCFDC', // la Hedron
    line: '#6FCFDC',
    solid: '#24707B',
    text: '#6FCFDC',
    onChrome: '#6FCFDC',
  },

  selectionAlpha: 0.15,

  status: {
    error: '#FF5A4E', // el Hiss: el único rojo del tema
    warning: '#E3B341', // farolas de sodio
    info: '#8AA8E8',
    success: '#8CC08A',
  },

  link: '#6FCFDC',

  git: {
    added: '#8CC08A',
    modified: '#8AA8E8',
    deleted: '#E0625A',
    untracked: '#A9D4A6',
    renamed: '#A3C99A',
    conflict: '#E39A5C',
    ignored: '#5A6069',
    submodule: '#8A9099',
  },

  syntax: {
    text: '#D5D8DC',
    function: '#F1F2F0',
    property: '#B4BAC2',
    type: '#A7B4E0', // neón frío
    namespace: '#AAB2C8',
    keyword: '#6FCFDC', // Hedron
    storage: '#8FB9BF', // Hedron apagada
    string: '#D6C27E', // taxis y luz de farola
    number: '#D7906E', // ladrillo de Manhattan
    attribute: '#A3C99A',
    regexp: '#A3C99A',
    tag: '#A7B4E0',
    operator: '#8A9099',
    punctuation: '#959BA4',
    comment: '#80868F',
    commentTag: '#959BA4',
    heading: '#6FCFDC',
  },

  brackets: ['#6FCFDC', '#D6C27E', '#A7B4E0'],

  ansi: {
    black: '#272B31',
    red: '#FF5A4E',
    green: '#8CC08A',
    yellow: '#D6C27E',
    blue: '#8AA8E8',
    magenta: '#B79AE0',
    cyan: '#6FCFDC',
    white: '#D5D8DC',
    brightBlack: '#737A84',
    brightRed: '#FF7F75',
    brightGreen: '#A9D4A6',
    brightYellow: '#E8D69A',
    brightBlue: '#A9C0F0',
    brightMagenta: '#CDB6EE',
    brightCyan: '#9DE0EA',
    brightWhite: '#F1F2F0',
  },
};
