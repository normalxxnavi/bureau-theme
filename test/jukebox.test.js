'use strict';

/**
 * La gramola Songmaster (lógica pura): lo que cuenta cada sistema sobre la
 * música que suena, el texto de la barra de estado y los enlaces oficiales.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const P = require('../src/extension/music-parse');
const { macReadScript, macCommandScript, windowsSource } = require('../src/extension/music-source');

/**
 * Un PowerShell de mentira para la fuente de Windows: `answer(proceso, orden)`
 * decide qué contesta a cada orden (una línea, o null para no contestar).
 * @param {(p: any, cmd: string) => string | null} answer
 */
function fakePowerShell(answer) {
  /** @type {Array<EventEmitter & {n: number, killed: boolean, stdout: PassThrough, stdin: any, kill(): void}>} */
  const started = [];
  const spawn = () => {
    const p = /** @type {any} */ (new EventEmitter());
    p.n = started.length + 1;
    p.killed = false;
    p.stdout = new PassThrough();
    p.stdin = new EventEmitter();
    p.stdin.write = (/** @type {string} */ data) => {
      const line = answer(p, data.trim());
      if (line !== null) setImmediate(() => p.stdout.write(`${line}\n`));
      return true;
    };
    p.kill = () => {
      p.killed = true;
      setImmediate(() => p.emit('exit', null));
    };
    setImmediate(() => p.stdout.write('{"ready":true}\n'));
    started.push(p);
    return p;
  };
  return { spawn, started };
}

const SONG = (/** @type {string} */ title) => JSON.stringify({ app: 'Spotify', title, artist: 'Old Gods of Asgard', album: '', playing: true });

test('Windows: lee la línea JSON del PowerShell (y lo vacío no es una canción)', () => {
  const t = P.parseWindowsLine('{"app":"SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify","title":"Take Control","artist":"Old Gods of Asgard","album":"Take Control","playing":true}');
  assert.deepEqual(t, { app: 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', title: 'Take Control', artist: 'Old Gods of Asgard', album: 'Take Control', playing: true });
  assert.equal(P.parseWindowsLine('{}'), null);
  assert.equal(P.parseWindowsLine('{"error":"x"}'), null);
  assert.equal(P.parseWindowsLine('no es JSON'), null);
  assert.equal(P.parseWindowsLine('{"title":"a\\u0007b","artist":null}')?.title, 'a b', 'sin caracteres de control');
});

test('macOS: una línea por app con estado, título, artista y álbum', () => {
  const tracks = P.parseMacOutput('Spotify\tpaused\tEt Ratio Principalis\tPetri Alanko\tControl (Original Soundtrack)\nMusic\tplaying\tSong\tArtist\tAlbum\n');
  assert.equal(tracks.length, 2);
  assert.equal(P.pickTrack(tracks)?.app, 'Music', 'la que suena va primero');
  assert.equal(P.pickTrack(tracks.slice(0, 1))?.title, 'Et Ratio Principalis', 'si ninguna suena, la que está en pausa');
  assert.equal(P.pickTrack([]), null);
});

test('Windows: la portada se reduce antes de salir y nunca pasa del máximo', () => {
  const { WINDOWS_SCRIPT } = require('../src/extension/music-source');
  assert.match(WINDOWS_SCRIPT, /function Shrink-Cover/);
  assert.match(WINDOWS_SCRIPT, /\$bytes = Shrink-Cover \$bytes/);
  assert.ok(WINDOWS_SCRIPT.includes(`$bytes.Length -le ${P.MAX_COVER_BYTES}`));
  assert.equal(P.clip('Plakito (feat. El General Gadiel)', 10), 'Plakito (…');
  assert.equal(P.clip('Corta', 10), 'Corta');
});

test('macOS: el AppleScript solo pregunta a las apps abiertas (no las arranca)', () => {
  const script = macReadScript(['Spotify', 'Music']);
  assert.match(script, /if application "Spotify" is running then/);
  assert.match(script, /if application "Music" is running then/);
  // «st» es palabra reservada en AppleScript: con ella el script no compilaba (lo vio la CI de macOS).
  assert.doesNotMatch(script, /\bset (st|out) to\b/);
  assert.equal(macCommandScript('Spotify', 'next'), 'if application "Spotify" is running then tell application "Spotify" to next track');
});

test('Linux: reproductores MPRIS y sus datos en la salida de gdbus (GVariant)', () => {
  const names = P.parseGdbusNames("(['org.freedesktop.DBus', ':1.42', 'org.mpris.MediaPlayer2.spotify', 'org.mpris.MediaPlayer2.firefox.instance_1_23'],)");
  assert.deepEqual(names, ['org.mpris.MediaPlayer2.spotify', 'org.mpris.MediaPlayer2.firefox.instance_1_23']);
  const out =
    "({'CanPlay': <true>, 'Metadata': <{'mpris:trackid': <'/com/spotify/track/1'>, 'xesam:album': <'CONTROL Resonant (Original Soundtrack)'>, 'xesam:artist': <['Petri Alanko', 'Amelia Jones']>, 'xesam:title': <\"The One I Once Knew (feat. Amelia Jones)\">}>, 'PlaybackStatus': <'Playing'>, 'Volume': <1.0>},)";
  assert.deepEqual(P.parseGdbusPlayer(out, 'org.mpris.MediaPlayer2.spotify'), {
    app: 'org.mpris.MediaPlayer2.spotify',
    title: 'The One I Once Knew (feat. Amelia Jones)',
    artist: 'Petri Alanko',
    album: 'CONTROL Resonant (Original Soundtrack)',
    playing: true,
  });
  const escaped = "({'Metadata': <{'xesam:title': <'It\\'s Control'>}>, 'PlaybackStatus': <'Paused'>},)";
  assert.equal(P.parseGdbusPlayer(escaped, 'x')?.title, "It's Control");
  assert.equal(P.parseGdbusPlayer("({'PlaybackStatus': <'Stopped'>},)", 'x'), null, 'parado no cuenta');
});

test('barra de estado: «Título — Artista» recortado y sin iconos colados', () => {
  const t = { app: 'Spotify', title: 'Take Control', artist: 'Old Gods of Asgard', album: '', playing: true };
  assert.equal(P.statusText(t), 'Take Control — Old Gods of Asgard', 'primero la canción y después el artista');
  assert.equal(P.statusText({ ...t, artist: '' }), 'Take Control');
  const long = P.statusText({ ...t, title: 'A'.repeat(80) });
  assert.ok(long.length <= 42 && long.endsWith('…'));
  assert.ok(!P.statusText({ ...t, title: '$(bureau-house) hack' }).includes('$('), 'el título no puede pintar iconos');
});

test('nombre de la app y enlaces a las bandas sonoras', () => {
  assert.equal(P.appName('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'), 'Spotify');
  assert.equal(P.appName('org.mpris.MediaPlayer2.firefox.instance_1_23'), 'Firefox');
  assert.equal(P.appName('Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic'), 'Media Player');
  assert.equal(P.appName('MSEdge'), 'Edge');
  assert.equal(P.appName('vlc.exe'), 'VLC');
  assert.equal(P.appName('308046B0AF4A39CB'), 'Firefox', 'Firefox en Windows, por el identificador de su instalación');
  assert.equal(P.appName('com.github.th-ch.youtube-music'), 'YouTube Music');
  assert.equal(P.appName('org.mpris.MediaPlayer2.chromium.instance42'), 'Chromium');
  assert.ok(P.isSpotify('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'));
  const ids = P.SOUNDTRACKS.map((s) => s.id);
  assert.deepEqual(ids, ['control', 'resonant', 'zoe', 'takeControl', 'rebirth']);
  for (const s of P.SOUNDTRACKS) assert.match(s.spotify, /^[0-9A-Za-z]{22}$/, `${s.id}: id de álbum de Spotify`);
  assert.equal(P.soundtrackUri('0cS6rif4qDxklIaFKME68N', true), 'spotify:album:0cS6rif4qDxklIaFKME68N');
  assert.equal(P.soundtrackUri('0cS6rif4qDxklIaFKME68N', false), 'https://open.spotify.com/album/0cS6rif4qDxklIaFKME68N');
});

test('logotipo del reproductor en el popup de la gramola (o su nombre, si no hay)', () => {
  const { LOGOS, logoUri } = require('../src/extension/player-logos');
  /** @type {Array<[string, string | null]>} identificador del sistema → logotipo */
  const cases = [
    ['SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', 'spotify'],
    ['Spotify', 'spotify'],
    ['org.mpris.MediaPlayer2.spotify', 'spotify'],
    ['Chrome', 'chrome'],
    ['org.mpris.MediaPlayer2.firefox.instance_1_23', 'firefox'],
    ['308046B0AF4A39CB', 'firefox'],
    ['AppleInc.AppleMusicWin_nzyj5cx40ttqa!App', 'appleMusic'],
    ['Music', 'appleMusic'],
    ['org.mpris.MediaPlayer2.vlc', 'vlc'],
    ['org.mpris.MediaPlayer2.mpv', 'mpv'],
    ['MSEdge', null],
    ['Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic', null],
    ['org.mpris.MediaPlayer2.rhythmbox', null],
    ['DesconocidoPlayer', null],
  ];
  for (const [app, logo] of cases) assert.equal(P.appLogo(app), logo, app);
  assert.equal(P.appLogo('impvlayer'), null, 'mpv solo como nombre completo');
  for (const [id, l] of Object.entries(LOGOS)) {
    assert.match(l.color, /^#[0-9A-F]{6}$/, `${id}: color`);
    assert.match(l.d, /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/, `${id}: solo un trazado, sin nada que ejecutar`);
    const svg = Buffer.from(/** @type {string} */ (logoUri(id)).split(',')[1], 'base64').toString();
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24"><path fill="#[0-9A-F]{6}" d="[^"]+"\/><\/svg>$/, id);
  }
  assert.equal(logoUri(null), null);
  // Cada logotipo que nombra la lista de reproductores existe.
  for (const app of ['Spotify', 'Chrome', 'firefox', 'brave', 'opera', 'vlc', 'itunes', 'Music', 'foobar2000', 'TIDAL', 'Deezer', 'youtube-music', 'mpv', 'Winamp', 'Plexamp', 'Kodi', 'Pandora']) {
    assert.ok(LOGOS[/** @type {string} */ (P.appLogo(app))], app);
  }
});

test('portada: solo imágenes locales razonables (Windows en Base64, Linux file://)', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]).toString('base64');
  assert.equal(P.parseCover(JSON.stringify({ data: png })), `data:image/png;base64,${png}`);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]).toString('base64');
  assert.match(String(P.parseCover(JSON.stringify({ data: jpg }))), /^data:image\/jpeg;base64,/);
  assert.equal(P.parseCover(JSON.stringify({ data: Buffer.from('<svg onload=x>').toString('base64') })), null, 'no es una imagen');
  assert.equal(P.parseCover(JSON.stringify({ data: 'no es base64!' })), null);
  assert.equal(P.parseCover('{}'), null);
  assert.equal(P.parseCover(JSON.stringify({ data: 'A'.repeat(2_000_000) })), null, 'demasiado grande');
  const justOver = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(P.MAX_COVER_BYTES)]).toString('base64');
  assert.equal(P.parseCover(JSON.stringify({ data: justOver })), null, 'más de MAX_COVER_BYTES no cabe en un popup');
  assert.equal(P.coverType('/tmp/cover.JPG'), 'image/jpeg');
  assert.equal(P.coverType('/tmp/cover.svg'), null);
  const withArt = "({'Metadata': <{'mpris:artUrl': <'file:///tmp/firefox-art.png'>, 'xesam:title': <'Song'>}>, 'PlaybackStatus': <'Playing'>},)";
  assert.equal(P.parseGdbusPlayer(withArt, 'x')?.artUrl, 'file:///tmp/firefox-art.png');
  const remote = "({'Metadata': <{'mpris:artUrl': <'https://i.scdn.co/image/abc'>, 'xesam:title': <'Song'>}>, 'PlaybackStatus': <'Playing'>},)";
  assert.equal(P.parseGdbusPlayer(remote, 'x')?.artUrl, undefined, 'las portadas en internet no se usan');
});

test('Windows: cada respuesta va a su petición (una que llega tarde no desfasa las siguientes)', async () => {
  let clock = 0;
  // El primer proceso no contesta la portada a tiempo; la respuesta llega después, cuando el test quiere.
  const ps = fakePowerShell((p, cmd) => {
    if (p.n === 1 && cmd === 'cover') return null;
    return cmd === 'read' ? SONG(`Canción ${p.n}`) : '{}';
  });
  // Sin tiempos justos: lo que contesta tiene 10 s (en un runner cargado, 20 ms no bastan); la portada que no llega agota 50 ms.
  const source = windowsSource({ onlySpotify: false }, { spawn: ps.spawn, now: () => clock, answerMs: 50, firstAnswerMs: 10_000 });
  assert.equal((await source.read())?.title, 'Canción 1');
  assert.equal(await source.cover(), null, 'sin respuesta a tiempo: sin portada');
  assert.ok(ps.started[0].killed, 'el proceso que no contesta se cierra');
  ps.started[0].stdout.write('{"data":"tarde"}\n');
  await new Promise((r) => setImmediate(r));
  assert.equal(await source.read(), null, 'justo después del fallo espera antes de volver a arrancar PowerShell');
  clock += 60_000;
  assert.equal((await source.read())?.title, 'Canción 2', 'un proceso nuevo, y la canción (no la portada que llegó tarde)');
  source.dispose();
});

test('Windows: si PowerShell se cierra al arrancar, no se relanza en cada lectura (espera cada vez más)', async () => {
  let clock = 0;
  const ps = fakePowerShell((p) => {
    setImmediate(() => p.emit('exit', 1));
    return null;
  });
  const source = windowsSource({ onlySpotify: false }, { spawn: ps.spawn, now: () => clock, answerMs: 1000, firstAnswerMs: 1000 });
  /** Lee varias veces en un rato de `ms` (cada lectura, 3 s después de la anterior, como la gramola). @param {number} ms */
  const readFor = async (ms) => {
    for (const end = clock + ms; clock < end; clock += 3000) assert.equal(await source.read(), null);
  };
  await readFor(60_000);
  const inAMinute = ps.started.length;
  assert.ok(inAMinute <= 5, `en un minuto, ${inAMinute} arranques (antes, uno cada 3 s: 20)`);
  await readFor(30 * 60_000);
  assert.ok(ps.started.length - inAMinute <= 8, `y en media hora más, ${ps.started.length - inAMinute} (cada 5 minutos como mucho)`);
  // Cuando vuelve a funcionar, se recupera sola (no se queda apagada para toda la sesión).
  ps.started.length = 0;
  const ok = fakePowerShell((_p, cmd) => (cmd === 'read' ? SONG('De vuelta') : '{}'));
  const healthy = windowsSource({ onlySpotify: false }, { spawn: ok.spawn, now: () => clock, answerMs: 1000, firstAnswerMs: 1000 });
  assert.equal((await healthy.read())?.title, 'De vuelta');
  source.dispose();
  healthy.dispose();
});

test('Windows: las peticiones seguidas se contestan en orden y al cerrar no queda ninguna colgada', async () => {
  const ps = fakePowerShell((_p, cmd) => (cmd === 'read' ? SONG('Take Control') : '{"ok":true}'));
  const source = windowsSource({ onlySpotify: false }, { spawn: ps.spawn, answerMs: 1000, firstAnswerMs: 1000 });
  const [a, , b] = await Promise.all([source.read(), source.command('next'), source.read()]);
  assert.equal(a?.title, 'Take Control');
  assert.equal(b?.title, 'Take Control');
  assert.equal(ps.started.length, 1, 'un solo proceso');
  const slow = fakePowerShell(() => null);
  const hanging = windowsSource({ onlySpotify: false }, { spawn: slow.spawn, answerMs: 5000, firstAnswerMs: 5000 });
  const pending = hanging.read();
  hanging.dispose();
  assert.equal(await pending, null, 'cerrar la gramola contesta lo que estaba esperando');
  source.dispose();
});
