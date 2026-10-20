'use strict';

/**
 * La gramola Songmaster (lógica pura): lo que cuenta cada sistema sobre la
 * música que suena, el texto de la barra de estado y los enlaces oficiales.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/extension/music-parse');
const { macReadScript, macCommandScript } = require('../src/extension/music-source');

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

test('barra de estado: «Artista — Título» recortado y sin iconos colados', () => {
  const t = { app: 'Spotify', title: 'Take Control', artist: 'Old Gods of Asgard', album: '', playing: true };
  assert.equal(P.statusText(t), 'Old Gods of Asgard — Take Control');
  assert.equal(P.statusText({ ...t, artist: '' }), 'Take Control');
  const long = P.statusText({ ...t, title: 'A'.repeat(80) });
  assert.ok(long.length <= 42 && long.endsWith('…'));
  assert.ok(!P.statusText({ ...t, title: '$(bureau-house) hack' }).includes('$('), 'el título no puede pintar iconos');
});

test('nombre de la app y enlaces a las bandas sonoras', () => {
  assert.equal(P.appName('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'), 'Spotify');
  assert.equal(P.appName('org.mpris.MediaPlayer2.firefox.instance_1_23'), 'Firefox');
  assert.equal(P.appName('Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic'), 'Music');
  assert.equal(P.appName('MSEdge'), 'Edge');
  assert.equal(P.appName('vlc.exe'), 'VLC');
  assert.ok(P.isSpotify('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify'));
  const ids = P.SOUNDTRACKS.map((s) => s.id);
  assert.deepEqual(ids, ['control', 'resonant', 'zoe', 'takeControl', 'rebirth']);
  for (const s of P.SOUNDTRACKS) assert.match(s.spotify, /^[0-9A-Za-z]{22}$/, `${s.id}: id de álbum de Spotify`);
  assert.equal(P.soundtrackUri('0cS6rif4qDxklIaFKME68N', true), 'spotify:album:0cS6rif4qDxklIaFKME68N');
  assert.equal(P.soundtrackUri('0cS6rif4qDxklIaFKME68N', false), 'https://open.spotify.com/album/0cS6rif4qDxklIaFKME68N');
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
