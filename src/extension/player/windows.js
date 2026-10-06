// @ts-check
'use strict';

/**
 * Reproductor para Windows: UN proceso de PowerShell que se queda abierto y
 * recibe por stdin la ruta del archivo a reproducir.
 *
 * Lanzar PowerShell para cada sonido tarda unos 300 ms; manteniéndolo abierto
 * el sonido sale al instante. Usa System.Media.SoundPlayer (WAV), que viene con
 * Windows. Las rutas viajan en Base64 para que ningún carácter especial pueda
 * interpretarse como código.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$player = New-Object System.Media.SoundPlayer
[Console]::Out.WriteLine('ready')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  try {
    $file = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line))
    $player.Stop()
    $player.SoundLocation = $file
    $player.Load()
    $player.Play()
    [Console]::Out.WriteLine('ok')
  } catch {
    [Console]::Out.WriteLine('err ' + $_.Exception.Message)
  }
}
`;

const MAX_RESTARTS = 3;

/** Ruta absoluta a powershell.exe (no depende del PATH). */
function powershellPath() {
  const root = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

/** @param {import('./index').Log} log @returns {import('./index').Player} */
function createWindowsPlayer(log) {
  /** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
  let proc = null;
  let restarts = 0;
  let disposed = false;

  function start() {
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    const child = spawn(powershellPath(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (/** @type {string} */ chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.startsWith('err ')) log.warn(`PowerShell: ${line.slice(4)}`);
        else if (line === 'ready') log.debug('PowerShell audio player ready');
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (/** @type {string} */ d) => log.debug(`PowerShell stderr: ${d.trim()}`));
    child.on('error', (err) => log.warn(`Could not start PowerShell: ${err.message}`));
    child.on('exit', (code) => {
      if (proc === child) proc = null;
      if (!disposed) log.debug(`PowerShell audio player exited (code ${code})`);
    });
    child.stdin.on('error', () => {}); // el proceso pudo cerrarse entre dos sonidos
    return child;
  }

  return {
    available: true,
    play(file) {
      if (disposed) return;
      if (!proc) {
        if (restarts > MAX_RESTARTS) return;
        restarts++;
        proc = start();
      }
      proc.stdin.write(Buffer.from(file, 'utf8').toString('base64') + '\n');
    },
    dispose() {
      disposed = true;
      const child = proc;
      proc = null;
      if (!child) return;
      child.stdin.end();
      setTimeout(() => child.kill(), 500).unref();
    },
  };
}

module.exports = { createWindowsPlayer, SCRIPT, powershellPath };
