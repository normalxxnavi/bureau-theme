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
 *   - acento NEGRO para la estructura (selección, foco, píldoras),
 *   - el rojo FBC solo en DETALLES: líneas de señalética, badges, botones y
 *     keywords de control de flujo.
 *
 * Legibilidad: en un tema claro el texto fino se «lava» con facilidad, así que
 * Astral cumple mínimos más altos que los oscuros (código ≥ 7:1, nivel AAA;
 * texto ≥ 15:1). `npm run contrast` lo comprueba.
 *
 * @type {import('../build').Palette}
 */
module.exports = {
  id: 'control-astral',
  label: 'CONTROL Astral',
  game: 'Control (2019) — The Astral Plane',
  type: 'light',

  bg: {
    editor: '#FAF9F6',
    sidebar: '#F1F0EB',
    elevated: '#FFFFFF',
    input: '#FFFFFF',
    chrome: '#151517', // la geometría negra flotando en el vacío
  },
  border: '#D3D1C9',

  fg: {
    bright: '#000000',
    main: '#111113',
    muted: '#4D4B45',
    placeholder: '#65625B',
    disabled: '#8A877E',
    onAccent: '#FFFFFF',
    chrome: '#ECEBE6',
    chromeMuted: '#ABA9A2',
    chromeActive: '#FFFFFF',
  },

  accent: {
    main: '#1A1A1C', // negro: estructura
    line: '#C8261C', // rojo FBC: detalles y señalética
    solid: '#B3241B',
    text: '#A31A12',
  },

  selectionAlpha: 0.11,

  status: {
    error: '#B5091F',
    warning: '#835200',
    info: '#174F86',
    success: '#21672D',
  },

  link: '#174F86',

  git: {
    added: '#21672D',
    modified: '#174F86',
    deleted: '#962A22',
    untracked: '#246B30',
    renamed: '#175A55',
    conflict: '#924006',
    ignored: '#8A877E',
    submodule: '#4D4B45',
  },

  syntax: {
    text: '#18181B',
    function: '#000000', // lo más «oscuro» del código: la geometría del Consejo
    property: '#6B5A3E',
    type: '#1F6AAD',
    namespace: '#46698C',
    keyword: '#C4271D', // detalles rojos
    storage: '#9C4433',
    string: '#7F6400',
    number: '#B1500C',
    attribute: '#0F7F78',
    regexp: '#0F7F78',
    tag: '#1F6AAD',
    operator: '#66635C',
    punctuation: '#66635C',
    comment: '#73706A',
    commentTag: '#5E5B54',
    heading: '#C4271D',
  },

  brackets: ['#C4271D', '#7F6400', '#1F6AAD'],

  ansi: {
    black: '#18181B',
    red: '#A31A12',
    green: '#21672D',
    yellow: '#7A5200',
    blue: '#174F86',
    magenta: '#7E2E6B',
    cyan: '#155F63',
    white: '#A3A098',
    brightBlack: '#4D4B45',
    brightRed: '#B5091F',
    brightGreen: '#246B30',
    brightYellow: '#7A5800',
    brightBlue: '#1D5C99',
    brightMagenta: '#8E3A7A',
    brightCyan: '#1A6870',
    brightWhite: '#C9C7BF',
  },
};
