// @ts-check
'use strict';

/**
 * Lo que suena en el ordenador, leído del propio sistema (sin cuentas, sin
 * internet y con cualquier reproductor):
 *
 *   Windows → la sesión multimedia del sistema (la de las teclas multimedia y
 *             el panel de volumen) con un proceso de PowerShell que se queda
 *             abierto: Spotify, el navegador, Apple Music, VLC…
 *   macOS   → Spotify y Música por AppleScript (macOS pedirá permiso para
 *             controlarlos la primera vez).
 *   Linux   → cualquier reproductor MPRIS (Spotify, el navegador, Rhythmbox…)
 *             por D-Bus con gdbus.
 *
 * También play/pausa, siguiente y anterior. Sin `vscode`: lo usa music.js.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const parse = require('./music-parse');
const { which, systemPath } = require('./player');

/** @typedef {import('./music-parse').Track} Track */
/** @typedef {'playPause' | 'next' | 'previous'} MusicCommand */
/**
 * @typedef {{available: boolean, read(): Promise<Track | null>, cover(): Promise<string | null>, command(c: MusicCommand): Promise<void>, dispose(): void}} MusicSource
 *   `cover()`: portada de lo que suena como `data:` (solo local: Windows y archivos de Linux), o null.
 */

// --- Windows ---------------------------------------------------------------------

/**
 * PowerShell con la API de Windows (GlobalSystemMediaTransportControlsSessionManager).
 * Lee órdenes de stdin («read», «cover», «playPause», «next», «previous») y responde
 * con una línea JSON. Las órdenes son siempre una de esas palabras: nada de lo
 * que se escribe llega a ejecutarse como código.
 */
const WINDOWS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asStream = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' } | Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  if (-not $task.Wait(3000)) { return $null }
  return $task.Result
}
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$onlySpotify = $env:BUREAU_ONLY_SPOTIFY -eq '1'
function Pick-Session {
  $sessions = @($manager.GetSessions())
  if ($onlySpotify) { $sessions = @($sessions | Where-Object { $_.SourceAppUserModelId -match 'spotify' }) }
  if ($sessions.Count -eq 0) { return $null }
  $playing = @($sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' })
  if ($playing.Count -gt 0) { return $playing[0] }
  $current = $manager.GetCurrentSession()
  foreach ($s in $sessions) { if ($current -and $s.SourceAppUserModelId -eq $current.SourceAppUserModelId) { return $s } }
  return $sessions[0]
}
# Portada a 160 px como mucho (el popup la enseña a 80) en JPEG: unos 10 KB.
function Shrink-Cover([byte[]]$bytes) {
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromStream((New-Object System.IO.MemoryStream (, $bytes)))
  try {
    $scale = [Math]::Min(1.0, 160.0 / [Math]::Max($img.Width, $img.Height))
    $w = [Math]::Max(1, [int]($img.Width * $scale))
    $h = [Math]::Max(1, [int]($img.Height * $scale))
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Black)
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    $jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
    $quality = New-Object System.Drawing.Imaging.EncoderParameters 1
    $quality.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]85)
    $small = New-Object System.IO.MemoryStream
    $bmp.Save($small, $jpeg, $quality)
    $bmp.Dispose()
    return , $small.ToArray()
  } finally { $img.Dispose() }
}
[Console]::Out.WriteLine('{"ready":true}')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  try {
    $s = Pick-Session
    if ($line -eq 'read') {
      if ($null -eq $s) { [Console]::Out.WriteLine('{}') }
      else {
        $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $o = [ordered]@{ app = $s.SourceAppUserModelId; title = $p.Title; artist = $p.Artist; album = $p.AlbumTitle; playing = ($s.GetPlaybackInfo().PlaybackStatus -eq 'Playing') }
        [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress))
      }
    } elseif ($line -eq 'cover') {
      # La miniatura llega como objeto COM sin propiedades visibles en PowerShell:
      # se lee con AsStreamForRead por reflexión (como mucho 768 KB) y se reduce.
      $out = '{}'
      if ($null -ne $s) {
        $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        if ($null -ne $p -and $null -ne $p.Thumbnail) {
          $stream = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          if ($null -ne $stream) {
            $net = $asStream.Invoke($null, @($stream))
            $ms = New-Object System.IO.MemoryStream
            $buffer = New-Object byte[] 65536
            while (($n = $net.Read($buffer, 0, $buffer.Length)) -gt 0 -and $ms.Length -le 786432) { $ms.Write($buffer, 0, $n) }
            $net.Dispose()
            if ($ms.Length -gt 0 -and $ms.Length -le 786432) {
              $bytes = $ms.ToArray()
              try { $bytes = Shrink-Cover $bytes } catch { }
              if ($bytes.Length -le ${parse.MAX_COVER_BYTES}) { $out = (@{ data = [Convert]::ToBase64String($bytes) } | ConvertTo-Json -Compress) }
            }
          }
        }
      }
      [Console]::Out.WriteLine($out)
    } elseif ($null -ne $s -and $line -eq 'playPause') { $null = Await ($s.TryTogglePlayPauseAsync()) ([bool]); [Console]::Out.WriteLine('{"ok":true}') }
    elseif ($null -ne $s -and $line -eq 'next') { $null = Await ($s.TrySkipNextAsync()) ([bool]); [Console]::Out.WriteLine('{"ok":true}') }
    elseif ($null -ne $s -and $line -eq 'previous') { $null = Await ($s.TrySkipPreviousAsync()) ([bool]); [Console]::Out.WriteLine('{"ok":true}') }
    else { [Console]::Out.WriteLine('{"ok":false}') }
  } catch {
    [Console]::Out.WriteLine((@{ error = $_.Exception.Message } | ConvertTo-Json -Compress))
  }
}
`;

/** Ruta absoluta a powershell.exe (no depende del PATH). */
function powershellPath() {
  const root = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

/** Espera m\u00E1xima a una respuesta, y a la primera (PowerShell tarda en arrancar y cargar la API). */
const ANSWER_MS = 8000;
const FIRST_ANSWER_MS = 20000;
/** Tras un fallo, la siguiente vez que se arranca PowerShell: cada vez el doble, hasta 5 minutos. */
const RETRY_MS = 4000;
const MAX_RETRY_MS = 5 * 60_000;

/**
 * @typedef {{p: import('node:child_process').ChildProcessWithoutNullStreams, waiting: Array<(line: string) => void>, buffer: string, ready: boolean, dead: boolean}} WindowsChild
 *   Un proceso de PowerShell con sus peticiones en espera, en orden: responde una l\u00EDnea a cada una.
 */

/**
 * @param {{onlySpotify: boolean}} o
 * @param {{spawn?: (...args: any[]) => any, now?: () => number, answerMs?: number, firstAnswerMs?: number}} [deps] para los tests
 * @returns {MusicSource}
 */
function windowsSource({ onlySpotify }, deps = {}) {
  const run = deps.spawn ?? spawn;
  const now = deps.now ?? Date.now;
  const answerMs = deps.answerMs ?? ANSWER_MS;
  const firstAnswerMs = deps.firstAnswerMs ?? FIRST_ANSWER_MS;
  /** @type {WindowsChild | null} */
  let child = null;
  let disposed = false;
  let failures = 0;
  let retryAt = 0;

  /**
   * Este proceso ya no vale (no responde o se ha cerrado): se cierra con sus
   * peticiones y el siguiente se arranca m\u00E1s tarde. Si siguiera, una respuesta
   * que llega tarde se la llevar\u00EDa la petici\u00F3n siguiente, y todas ir\u00EDan
   * desfasadas (la canci\u00F3n como portada, la portada como canci\u00F3n\u2026).
   * @param {WindowsChild} c
   */
  const drop = (c) => {
    if (c.dead) return;
    c.dead = true;
    if (child === c) child = null;
    if (!disposed) {
      failures++;
      retryAt = now() + Math.min(MAX_RETRY_MS, RETRY_MS * 2 ** (failures - 1));
    }
    c.p.kill();
    for (const w of c.waiting.splice(0)) w('{}');
  };

  /** @returns {WindowsChild} */
  const start = () => {
    const encoded = Buffer.from(WINDOWS_SCRIPT, 'utf16le').toString('base64');
    const p = /** @type {import('node:child_process').ChildProcessWithoutNullStreams} */ (
      run(powershellPath(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        windowsHide: true,
        // Sin leer stderr, un error largo llenar\u00EDa la tuber\u00EDa y PowerShell se quedar\u00EDa parado.
        stdio: ['pipe', 'pipe', 'ignore'],
        env: { ...process.env, BUREAU_ONLY_SPOTIFY: onlySpotify ? '1' : '0' },
      })
    );
    /** @type {WindowsChild} */
    const c = { p, waiting: [], buffer: '', ready: false, dead: false };
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (chunk) => {
      // Lo que diga un proceso ya descartado (una respuesta tardía) no cuenta.
      if (c.dead) return;
      c.buffer += chunk;
      let i;
      while ((i = c.buffer.indexOf('\n')) !== -1) {
        const line = c.buffer.slice(0, i).replace(/^\uFEFF/, '').trim();
        c.buffer = c.buffer.slice(i + 1);
        if (!line) continue;
        if (line.startsWith('{"ready"')) c.ready = true;
        else {
          failures = 0;
          c.waiting.shift()?.(line);
        }
      }
    });
    // Escribir a un proceso que acaba de cerrarse da EPIPE: sin este listener, el error saltar\u00EDa en el host de extensiones.
    p.stdin.on('error', () => {});
    p.on('error', () => drop(c));
    p.on('exit', () => drop(c));
    child = c;
    return c;
  };

  /** @param {string} cmd @returns {Promise<string>} */
  const send = (cmd) =>
    new Promise((resolve) => {
      if (disposed || now() < retryAt) return resolve('{}');
      const c = child ?? start();
      const done = (/** @type {string} */ line) => {
        clearTimeout(timer);
        resolve(line);
      };
      const timer = setTimeout(() => drop(c), c.ready ? answerMs : firstAnswerMs);
      c.waiting.push(done);
      c.p.stdin.write(`${cmd}\n`);
    });

  return {
    available: true,
    read: async () => parse.parseWindowsLine(await send('read')),
    cover: async () => parse.parseCover(await send('cover')),
    command: async (c) => {
      await send(c);
    },
    dispose() {
      disposed = true;
      if (child) drop(child);
    },
  };
}

// --- macOS ----------------------------------------------------------------------

/** Apps que se leen en macOS (las dos tienen el mismo diccionario de AppleScript). */
const MAC_APPS = [
  { name: 'Spotify', bundle: 'Spotify.app' },
  { name: 'Music', bundle: 'Music.app' },
];

/** ¿Está instalada? Así AppleScript nunca pregunta «¿Dónde está Spotify?». @param {string} bundle */
const macInstalled = (bundle) =>
  ['/Applications', '/System/Applications', path.join(os.homedir(), 'Applications')].some((d) => fs.existsSync(path.join(d, bundle)));

/**
 * Las variables llevan el prefijo «bureau»: con nombres cortos se choca con
 * palabras reservadas de AppleScript («st», de 1st, no compila) o con términos
 * del diccionario de la app.
 * @param {string[]} apps
 */
function macReadScript(apps) {
  const blocks = apps.map(
    (app) => `if application "${app}" is running then
  tell application "${app}"
    set bureauState to player state as string
    if bureauState is not "stopped" then set bureauOut to bureauOut & "${app}" & tab & bureauState & tab & (name of current track) & tab & (artist of current track) & tab & (album of current track) & linefeed
  end tell
end if`
  );
  return `set bureauOut to ""\n${blocks.join('\n')}\nreturn bureauOut`;
}

/** @param {string} app @param {MusicCommand} c */
const macCommandScript = (app, c) =>
  `if application "${app}" is running then tell application "${app}" to ${{ playPause: 'playpause', next: 'next track', previous: 'previous track' }[c]}`;

/** Apps de música de macOS instaladas (de las que sabe leer la gramola). @param {{onlySpotify: boolean}} o */
const macApps = ({ onlySpotify }) => MAC_APPS.filter((a) => (!onlySpotify || a.name === 'Spotify') && macInstalled(a.bundle)).map((a) => a.name);

/** @param {string} script @returns {Promise<string>} */
const osascript = (script) =>
  new Promise((resolve) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 5000 }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });

/** @param {{onlySpotify: boolean}} o @returns {MusicSource} */
function macSource({ onlySpotify }) {
  const apps = macApps({ onlySpotify });
  /** App de la última canción leída (a la que van los controles). */
  let last = apps[0];
  return {
    available: apps.length > 0,
    async read() {
      const track = parse.pickTrack(parse.parseMacOutput(await osascript(macReadScript(apps))));
      if (track) last = track.app;
      return track;
    },
    // macOS no da la portada en local (Spotify solo da un enlace a sus servidores).
    cover: async () => null,
    async command(c) {
      if (!last || !apps.includes(last)) return;
      await osascript(macCommandScript(last, c));
    },
    dispose() {},
  };
}

// --- Linux ----------------------------------------------------------------------

/** @param {string} bin @param {string[]} prefix @param {string[]} args @returns {Promise<string>} */
const run = (bin, prefix, args) =>
  new Promise((resolve) => {
    execFile(bin, [...prefix, ...args], { timeout: 4000 }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });

/** @param {{onlySpotify: boolean}} o @returns {MusicSource} */
function linuxSource({ onlySpotify }) {
  // gdbus viene con GLib (escritorios GNOME, KDE…). En un Flatpak, el del sistema.
  let bin = which('gdbus', systemPath());
  /** @type {string[]} */
  let prefix = [];
  if (!bin && (process.env.FLATPAK_ID || fs.existsSync('/.flatpak-info'))) {
    bin = which('flatpak-spawn', systemPath());
    prefix = ['--host', 'gdbus'];
  }
  /** @type {string | null} */
  let last = null;
  /** @type {string | undefined} */
  let lastArt;
  const gdbus = (/** @type {string[]} */ args) => (bin ? run(bin, prefix, ['call', '--session', ...args]) : Promise.resolve(''));
  const methods = { playPause: 'PlayPause', next: 'Next', previous: 'Previous' };
  return {
    available: Boolean(bin),
    async read() {
      const names = parse
        .parseGdbusNames(await gdbus(['--dest', 'org.freedesktop.DBus', '--object-path', '/org/freedesktop/DBus', '--method', 'org.freedesktop.DBus.ListNames']))
        .filter((n) => !onlySpotify || /spotify/i.test(n));
      /** @type {Track[]} */
      const tracks = [];
      for (const name of names.slice(0, 8)) {
        const out = await gdbus(['--dest', name, '--object-path', '/org/mpris/MediaPlayer2', '--method', 'org.freedesktop.DBus.Properties.GetAll', 'org.mpris.MediaPlayer2.Player']);
        const track = parse.parseGdbusPlayer(out, name);
        if (track) tracks.push(track);
      }
      const track = parse.pickTrack(tracks);
      last = track ? track.app : null;
      lastArt = track?.artUrl;
      return track;
    },
    // Solo portadas que son archivos locales (Firefox, Rhythmbox…); las de Spotify son enlaces a sus servidores.
    async cover() {
      if (!lastArt) return null;
      try {
        const file = fileURLToPath(lastArt);
        const type = parse.coverType(file);
        const stat = fs.statSync(file);
        if (!type || !stat.isFile() || stat.size > parse.MAX_COVER_BYTES) return null;
        return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
      } catch {
        return null;
      }
    },
    async command(c) {
      if (!last) return;
      await gdbus(['--dest', last, '--object-path', '/org/mpris/MediaPlayer2', '--method', `org.mpris.MediaPlayer2.Player.${methods[c]}`]);
    },
    dispose() {},
  };
}

/**
 * @param {{onlySpotify: boolean}} options
 * @param {NodeJS.Platform} [platform]
 * @returns {MusicSource}
 */
function createMusicSource(options, platform = process.platform) {
  if (platform === 'win32') return windowsSource(options);
  if (platform === 'darwin') return macSource(options);
  return linuxSource(options);
}

module.exports = { createMusicSource, windowsSource, WINDOWS_SCRIPT, macReadScript, macCommandScript, macApps };
