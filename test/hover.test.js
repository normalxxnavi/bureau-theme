'use strict';

/**
 * Popups con diseño (hover.js): lo que se genera tiene que pasar el
 * sanitizador de VS Code, o VS Code lo quitaría sin avisar.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../src/extension/hover');

const ROOT = path.resolve(__dirname, '..');
/** El estilo que VS Code deja en un <span> de un popup (copiado de su sanitizador de Markdown). */
const VSCODE_SPAN_STYLE =
  /^(color\:(#[0-9a-fA-F]+|var\(--vscode(-[a-zA-Z0-9]+)+\));)?(background-color\:(#[0-9a-fA-F]+|var\(--vscode(-[a-zA-Z0-9]+)+\));)?(display\:inline-block;)?(border-radius:[0-9]+px;)?$/;

test('pastillas: el estilo pasa el sanitizador de VS Code y el texto va escapado', () => {
  for (const [bg, fg] of [['#E0352B', '#ffffff'], ['var(--vscode-badge-background)', 'var(--vscode-badge-foreground)'], ['#2E9C8E', '#fff']]) {
    const html = H.pill('<b>SONANDO</b>', bg, fg);
    const style = /style="([^"]*)"/.exec(html)?.[1];
    assert.ok(style && VSCODE_SPAN_STYLE.test(style), style);
    assert.ok(!html.includes('<b>'), 'sin etiquetas del texto');
  }
  assert.throws(() => H.pill('x', 'red'), /Color no admitido/);
  assert.throws(() => H.pill('x', '#fff', 'rgb(0,0,0)'), /Color no admitido/);
});

test('texto de fuera: sin HTML ni iconos $(…)', () => {
  assert.equal(H.escapeHtml('<img src=x> & "$(bureau-house)"'), '&lt;img src=x&gt; &amp; &quot;&#36;(bureau-house)&quot;');
  assert.equal(H.escapeHtml(undefined), '');
});

test('botones: enlace a un comando con sus argumentos codificados', () => {
  assert.equal(H.button('play', 'Reproducir', 'bureauTheme.musicPlayPause'), '[$(play) Reproducir](command:bureauTheme.musicPlayPause)');
  assert.equal(
    H.button('bureau-cassette', 'Control [OST]', 'bureauTheme.openSoundtrack', ['control']),
    '[$(bureau-cassette) Control \\[OST\\]](command:bureauTheme.openSoundtrack?%5B%22control%22%5D)'
  );
});

test('tarjeta: imagen a la izquierda, texto a la derecha y filas de botones', () => {
  const md = H.card({ image: 'data:image/png;base64,AAAA', imageSize: 80, title: 'Rakata & co', lines: ['Wisin'], rows: [['a', 'b'], [], ['c']] });
  assert.match(md, /^<table><tr><td><img src="data:image\/png;base64,AAAA" width="80" height="80"><\/td>/);
  assert.match(md, /<b>Rakata &amp; co<\/b><br>Wisin/);
  assert.equal(md.split('---').length - 1, 2, 'una línea por fila no vacía');
  assert.ok(!H.card({ title: 'x' }).includes('<img'), 'sin imagen, sin columna de imagen');
});

test('tamaño: una portada que no cabe en el popup (VS Code lo corta) se cambia por la de reserva', () => {
  const huge = `data:image/png;base64,${'A'.repeat(H.MAX_MARKDOWN)}`;
  const md = H.card({ image: huge, fallbackImage: 'data:image/svg+xml;base64,BBBB', title: 'x' });
  assert.ok(md.length <= H.MAX_MARKDOWN);
  assert.match(md, /<img src="data:image\/svg\+xml;base64,BBBB"/);
  assert.ok(!H.card({ image: huge, title: 'x' }).includes('<img'), 'sin reserva, sin imagen');
});

test('tamaño: el popup de la gramola con la portada más grande admitida cabe', () => {
  const { MAX_COVER_BYTES, clip } = require('../src/extension/music-parse');
  const cover = `data:image/jpeg;base64,${Buffer.alloc(MAX_COVER_BYTES).toString('base64')}`;
  const long = clip('Ñ'.repeat(5000), 120);
  const md = H.card({
    image: cover,
    imageSize: 80,
    title: long,
    lines: [H.escapeHtml(long), `<i>${H.escapeHtml(long)}</i>`, `${H.pill('● SONANDO', '#E0352B')} ${H.pill('SPOTIFY', '#3a3d41')}`],
    rows: [[H.button('chevron-left', 'Anterior', 'bureauTheme.musicPrevious'), H.button('play', 'Reproducir', 'bureauTheme.musicPlayPause'), H.button('chevron-right', 'Siguiente', 'bureauTheme.musicNext')], [H.button('bureau-cassette', 'Bandas sonoras oficiales de CONTROL…', 'bureauTheme.openSoundtrack')]],
  });
  assert.ok(md.includes(cover), 'con su portada');
  assert.ok(md.length < H.MAX_MARKDOWN * 0.9, `${md.length} caracteres`);
});

test('barra de estado: solo se toca lo que cambia (si no, el popup abierto parpadea)', () => {
  /** Como vscode.MarkdownString: los campos son getters (no salen en JSON). */
  class Md {
    #value;
    /** @param {string} value */
    constructor(value) {
      this.#value = value;
      this.supportHtml = true;
      this.isTrusted = { enabledCommands: ['bureauTheme.musicNext'] };
    }
    get value() {
      return this.#value;
    }
  }
  /** @type {string[]} */
  const writes = [];
  const item = {
    show: () => writes.push('show'),
    hide: () => writes.push('hide'),
    set text(/** @type {string} */ v) {
      writes.push(`text=${v}`);
    },
    set tooltip(/** @type {unknown} */ v) {
      writes.push(`tooltip=${v instanceof Md ? v.value : v}`);
    },
  };
  H.setItem(item, { text: 'A', tooltip: new Md('<b>Rakata</b>'), visible: true });
  assert.deepEqual(writes, ['text=A', 'tooltip=<b>Rakata</b>', 'show']);
  writes.length = 0;
  H.setItem(item, { text: 'A', tooltip: new Md('<b>Rakata</b>'), visible: true });
  assert.deepEqual(writes, [], 'el mismo popup (con otro isTrusted igual) no se reenvía');
  H.setItem(item, { text: 'A', tooltip: new Md('<b>Plakito</b>'), visible: false });
  assert.deepEqual(writes, ['tooltip=<b>Plakito</b>', 'hide']);
});

test('imágenes de los popups: existen y se leen como data: SVG', () => {
  for (const name of ['jukebox', 'oldest-house', 'alarm', 'classified']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'media', 'hover', `${name}.svg`)), name);
    assert.match(String(H.hoverImage(ROOT, name)), /^data:image\/svg\+xml;base64,/);
  }
  assert.equal(H.hoverImage(ROOT, 'no-existe'), undefined);
});

test('los botones de los popups usan comandos que existen y que el popup permite pulsar', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const ours = new Set(pkg.contributes.commands.map((/** @type {any} */ c) => c.command));
  const dir = path.join(ROOT, 'src', 'extension');
  for (const f of ['music.js', 'status.js', 'alert-level.js', 'classified.js']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // Comandos permitidos: POPUP_COMMANDS o el enabledCommands en línea.
    const allowed = new Set([...src.matchAll(/(?:POPUP_COMMANDS = \[|enabledCommands: \[)([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([\w.]+)'/g)].map((x) => x[1])));
    const used = src
      .split('\n')
      .filter((l) => l.includes('H.button('))
      .flatMap((l) => [...l.matchAll(/'((?:bureauTheme|workbench)\.[\w.]+)'/g)].map((m) => m[1]));
    assert.ok(used.length > 0, `${f}: sin botones`);
    for (const cmd of used) {
      assert.ok(ours.has(cmd) || cmd.startsWith('workbench.'), `${f}: comando inexistente ${cmd}`);
      assert.ok(allowed.has(cmd), `${f}: ${cmd} no está en enabledCommands (no se podría pulsar)`);
    }
  }
});
