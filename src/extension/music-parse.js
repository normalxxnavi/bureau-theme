// @ts-check
'use strict';

/**
 * La gramola Songmaster (lógica pura, sin `vscode`): interpreta lo que cuenta
 * cada sistema sobre la música que suena, elige qué mostrar y prepara el texto
 * de la barra de estado. Y los enlaces a las bandas sonoras oficiales.
 */

/** @typedef {{app: string, title: string, artist: string, album: string, playing: boolean, artUrl?: string}} Track `artUrl`: portada local (file://) que da el reproductor en Linux */

/**
 * Bandas sonoras oficiales en Spotify. Solo enlaces: el audio es de Remedy y
 * de sus autores y no se incluye en la extensión.
 */
const SOUNDTRACKS = [
  { id: 'control', name: 'Control (Original Soundtrack)', artist: 'Petri Alanko, Martin Stig Andersen', spotify: '0cS6rif4qDxklIaFKME68N' },
  { id: 'resonant', name: 'CONTROL Resonant (Original Soundtrack)', artist: 'Petri Alanko', spotify: '5LxLCAfp8l1USzUOSIbgHP' },
  { id: 'zoe', name: "Zoe's Mixtape", artist: 'CONTROL Resonant', spotify: '3tvQ7tUbztcIdUMHQDXkT7' },
  { id: 'takeControl', name: 'Take Control', artist: 'Old Gods of Asgard', spotify: '3Xcl0pytPYqJUSTi2S8jtI' },
  { id: 'rebirth', name: 'Rebirth – Greatest Hits', artist: 'Old Gods of Asgard', spotify: '0LZhC50aIf7O233yj7IH4Z' },
];

/**
 * Enlace a un álbum: en la app de Spotify si es la que suena (o se sabe que
 * está), y si no, en la web (que ofrece abrir la app).
 * @param {string} albumId @param {boolean} app
 */
const soundtrackUri = (albumId, app) => (app ? `spotify:album:${albumId}` : `https://open.spotify.com/album/${albumId}`);

/** @param {unknown} v */
const text = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) : '');

/**
 * Una canción válida (con título) o null.
 * @param {Partial<Track>} t
 * @returns {Track | null}
 */
function track(t) {
  const title = text(t.title);
  if (!title) return null;
  /** @type {Track} */
  const out = { app: text(t.app), title, artist: text(t.artist), album: text(t.album), playing: t.playing === true };
  if (typeof t.artUrl === 'string' && t.artUrl.startsWith('file://')) out.artUrl = t.artUrl;
  return out;
}

/** Respuesta del PowerShell de Windows (una línea JSON). @param {string} line */
function parseWindowsLine(line) {
  try {
    const o = JSON.parse(line);
    return o && typeof o === 'object' ? track(o) : null;
  } catch {
    return null;
  }
}

/**
 * Salida del AppleScript de macOS: una línea por app con
 * «app⇥estado⇥título⇥artista⇥álbum».
 * @param {string} out
 * @returns {Track[]}
 */
function parseMacOutput(out) {
  /** @type {Track[]} */
  const tracks = [];
  for (const line of out.split(/\r?\n/)) {
    const [app, state, title, artist, album] = line.split('\t');
    const t = track({ app, title, artist, album, playing: state === 'playing' });
    if (t) tracks.push(t);
  }
  return tracks;
}

/** Nombres de los reproductores MPRIS en la salida de gdbus ListNames. @param {string} out */
function parseGdbusNames(out) {
  return [...out.matchAll(/'(org\.mpris\.MediaPlayer2\.[\w.-]+)'/g)].map((m) => m[1]);
}

/** Desescapa un texto de GVariant ('…' o "…"). @param {string} s */
const unescapeGVariant = (s) => s.replace(/\\(.)/g, (_, c) => (c === 'n' ? ' ' : c));

/**
 * Valor de texto de una clave en la salida de gdbus (GVariant), sea un texto
 * o el primero de una lista (los artistas).
 * @param {string} out @param {string} key
 */
function gvariantString(out, key) {
  const k = key.replace(/[.:]/g, (c) => `\\${c}`);
  const m = new RegExp(`'${k}': <\\[?(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`).exec(out);
  return m ? unescapeGVariant(m[1] ?? m[2] ?? '') : '';
}

/**
 * Reproductor MPRIS (salida de Properties.GetAll de org.mpris.MediaPlayer2.Player).
 * @param {string} out @param {string} name nombre D-Bus del reproductor
 * @returns {Track | null}
 */
function parseGdbusPlayer(out, name) {
  const status = /'PlaybackStatus': <'(\w+)'>/.exec(out)?.[1];
  if (!status || status === 'Stopped') return null;
  return track({
    app: name,
    title: gvariantString(out, 'xesam:title'),
    artist: gvariantString(out, 'xesam:artist'),
    album: gvariantString(out, 'xesam:album'),
    playing: status === 'Playing',
    artUrl: gvariantString(out, 'mpris:artUrl'),
  });
}

/** Tipos de imagen que se aceptan como portada. */
const COVER_TYPES = /^image\/(png|jpe?g|gif|bmp|webp)$/;
/**
 * Tamaño máximo de una portada: en Base64 (64 000 caracteres) tiene que caber
 * en un popup, que VS Code corta a los 100 000 (ver `hover.js`). En Windows la
 * portada se reduce antes a 160 px, unos 10 KB.
 */
const MAX_COVER_BYTES = 48 * 1024;

/**
 * Portada que devuelve el PowerShell de Windows ({data} en Base64) como
 * `data:` para el popup, o null si no hay o no es una imagen razonable. El
 * tipo se deduce de la cabecera del archivo (PNG, JPEG, GIF o WebP).
 * @param {string} line
 */
function parseCover(line) {
  try {
    const o = JSON.parse(line);
    const data = String(o?.data ?? '');
    if (!data || data.length > (MAX_COVER_BYTES * 4) / 3 + 4 || !/^[A-Za-z0-9+/]+=*$/.test(data)) return null;
    const type = sniffImage(Buffer.from(data.slice(0, 24), 'base64'));
    if (!type || !COVER_TYPES.test(type)) return null;
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

/** Tipo de imagen por sus primeros bytes. @param {Buffer} head */
function sniffImage(head) {
  if (head.length >= 4 && head.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.length >= 4 && head.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (head.length >= 12 && head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Tipo de imagen por la extensión de un archivo de portada (Linux). @param {string} file */
function coverType(file) {
  const ext = file.toLowerCase().split('.').pop();
  return ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : null;
}

/** La que suena; si ninguna suena, la primera en pausa. @param {Track[]} tracks */
const pickTrack = (tracks) => tracks.find((t) => t.playing) ?? tracks[0] ?? null;

/** Texto de fuera (títulos, artistas) sin que pueda colar iconos `$(…)` en la interfaz. @param {string} s */
const noIcons = (s) => s.replace(/\$\(/g, '$\u200B(');

/** ¿Es Spotify? @param {string} app */
const isSpotify = (app) => /spotify/i.test(app);

/**
 * «Artista — Título» para la barra de estado, recortado y sin que el texto de
 * la canción pueda colar iconos (`$(…)`).
 * @param {Track} t @param {number} [max]
 */
function statusText(t, max = 42) {
  return noIcons(clip(t.artist ? `${t.artist} — ${t.title}` : t.title, max));
}

/** Texto recortado a `max` caracteres con «…». @param {string} s @param {number} max */
function clip(s, max) {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Reproductores conocidos: [patrón del identificador, nombre]. */
const KNOWN_APPS = /** @type {const} */ ([
  [/spotify/i, 'Spotify'],
  [/msedge|edge/i, 'Edge'],
  [/chrom/i, 'Chrome'],
  [/firefox/i, 'Firefox'],
  [/brave/i, 'Brave'],
  [/opera/i, 'Opera'],
  [/vlc/i, 'VLC'],
  [/zunemusic|itunes|applemusic|^music$/i, 'Music'],
  [/foobar/i, 'foobar2000'],
  [/rhythmbox/i, 'Rhythmbox'],
]);

/**
 * Nombre corto de la app (Spotify, Chrome, VLC…) a partir de su identificador
 * (AppUserModelId de Windows, nombre D-Bus de Linux o nombre de la app en macOS).
 * @param {string} app
 */
function appName(app) {
  const id = app.replace(/^org\.mpris\.MediaPlayer2\./, '').replace(/\.exe$/i, '');
  const known = KNOWN_APPS.find(([re]) => re.test(id));
  if (known) return known[1];
  const parts = id.split(/[\\/!._]/).filter(Boolean);
  const name = parts[parts.length - 1] ?? app;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

module.exports = { MAX_COVER_BYTES, parseCover, sniffImage, coverType, SOUNDTRACKS, soundtrackUri, noIcons, parseWindowsLine, parseMacOutput, parseGdbusNames, parseGdbusPlayer, pickTrack, isSpotify, statusText, clip, appName };
