// @ts-check
'use strict';

/**
 * CONTROL Astral — *Control* (2019), el Plano Astral.
 *
 * El único tema CLARO de la familia. El Plano Astral es un vacío blanco e
 * infinito donde flota una geometría negra (la pirámide invertida del Consejo).
 * Traducción:
 *   - fondo blanco roto (vacío astral, sin deslumbrar),
 *   - el «monolito» negro: Activity Bar, barra de estado y barra de título,
 *   - acento NEGRO para la estructura (cursor de selección, foco, píldoras),
 *   - el rojo FBC solo en DETALLES: líneas de señalética, badges, botones y
 *     keywords de control de flujo.
 *
 * Como el acento estructural es negro, el error (rojo) nunca se confunde con
 * un elemento activo.
 *
 * @type {import('../build').Palette}
 */
module.exports = {
  id: 'control-astral',
  label: 'CONTROL Astral',
  game: 'Control (2019) — The Astral Plane',
  type: 'light',
  location: 'ASTRAL PLANE',

  bg: {
    editor: '#F7F6F3',
    sidebar: '#EEEDE8',
    elevated: '#FFFFFF',
    input: '#FFFFFF',
    chrome: '#151517', // la geometría negra flotando en el vacío
  },
  border: '#D6D4CD',

  fg: {
    bright: '#000000',
    main: '#1E1E21',
    muted: '#5F5D57',
    placeholder: '#77756E',
    disabled: '#97948B',
    onAccent: '#FFFFFF',
    chrome: '#E9E8E3',
    chromeMuted: '#A3A19A',
    chromeActive: '#FFFFFF',
  },

  accent: {
    main: '#1A1A1C', // negro: estructura
    line: '#C8261C', // rojo FBC: detalles y señalética
    solid: '#B3241B',
    text: '#B3261E',
    onChrome: '#F0675C', // el rojo como texto sobre el monolito negro
  },

  selectionAlpha: 0.11,

  status: {
    error: '#C8102E',
    warning: '#9A6200',
    info: '#1F5F99',
    success: '#2E7D3A',
  },

  link: '#1F5F99',

  git: {
    added: '#2A7334',
    modified: '#1F5F99',
    deleted: '#A8322A',
    untracked: '#2D7638',
    renamed: '#2A6B66',
    conflict: '#A84C0E',
    ignored: '#97948B',
    submodule: '#5F5D57',
  },

  syntax: {
    text: '#2E2E31',
    function: '#000000', // lo más «oscuro» del código: la geometría del Consejo
    property: '#4A4844',
    type: '#2B5B7E',
    namespace: '#4D5F70',
    keyword: '#B3261E', // detalles rojos
    storage: '#7A5048',
    string: '#7A5A16',
    number: '#A34A0C',
    attribute: '#2A6B66',
    regexp: '#2A6B66',
    tag: '#2B5B7E',
    operator: '#64625C',
    punctuation: '#64625C',
    comment: '#6E6B64',
    commentTag: '#5F5D57',
    heading: '#B3261E',
  },

  brackets: ['#B3261E', '#7A5A16', '#2B5B7E'],

  ansi: {
    black: '#1E1E21',
    red: '#B3261E',
    green: '#2A7334',
    yellow: '#8A6100',
    blue: '#1F5F99',
    magenta: '#8E3A7A',
    cyan: '#1D6F73',
    white: '#A3A098',
    brightBlack: '#5F5D57',
    brightRed: '#C8102E',
    brightGreen: '#2D7638',
    brightYellow: '#87600A',
    brightBlue: '#2867A4',
    brightMagenta: '#A2468C',
    brightCyan: '#1C737C',
    brightWhite: '#C9C7BF',
  },
};
