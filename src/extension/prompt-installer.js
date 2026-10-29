// @ts-check
'use strict';

/**
 * Archivos del prompt Bureau de la terminal (sin `vscode`, para los tests y para
 * el script de desinstalación):
 *
 *   - la carpeta de datos (`dataDir`): los scripts de `terminal/`, `prompt.conf`,
 *     `bureau.gitconfig` (los colores de Git), los mensajes del Consejo y el
 *     icono; los usa el perfil Bureau de VS Code;
 *   - «también fuera de VS Code»: un bloque marcado al final del perfil de
 *     PowerShell (profile.ps1), ~/.bashrc y ~/.zshrc, un archivo en conf.d de
 *     fish, la variable PROMPT de tu usuario para cmd y un fragmento de Windows
 *     Terminal. Quitarlo deja cada archivo como estaba (y PROMPT con su valor
 *     anterior).
 *
 * Solo se toca el perfil de los shells instalados, y en bash y zsh solo si ya
 * tienes ese archivo o es tu shell. Las rutas son fijas: nunca se escribe donde
 * diga un ajuste.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFile } = require('node:child_process');
const P = require('./prompt-config');

/** Scripts de `terminal/` que se copian (los de zsh van a `zsh/` con su punto). */
const SCRIPTS = ['bureau-prompt.ps1', 'bureau-prompt.bash', 'bureau-init.bash', 'bureau-prompt.zsh', 'bureau-prompt.fish'];
const ZSH_FILES = ['zshenv', 'zprofile', 'zshrc', 'zlogin'];
const STATE_FILE = 'installed.json';
/** Los colores de Git del Bureau: los shells lo incluyen con GIT_CONFIG_KEY_n=include.path. */
const GIT_COLORS_FILE = 'bureau.gitconfig';

/**
 * @typedef {{
 *   platform?: NodeJS.Platform,
 *   home?: string,
 *   env?: NodeJS.ProcessEnv,
 *   find?: (name: string) => string | null,
 *   run?: (cmd: string, args: string[], env?: NodeJS.ProcessEnv) => {status: number | null, stdout: string},
 *   runAsync?: (cmd: string, args: string[], env?: NodeJS.ProcessEnv) => Promise<{status: number | null, stdout: string}>,
 * }} InstallerOptions
 *   Todo se puede cambiar en los tests (carpeta personal temporal, programas falsos).
 *   `runAsync` es lo que se usa al cambiar de tema o de estilo, para no parar
 *   el host de extensiones mientras arranca PowerShell; con solo `run`, se usa ese.
 */

/** @param {InstallerOptions} o */
function resolve(o = {}) {
  const platform = o.platform ?? process.platform;
  const home = o.home ?? os.homedir();
  const env = o.env ?? process.env;
  const find = o.find ?? ((/** @type {string} */ name) => require('./player').which(platform === 'win32' ? `${name}.exe` : name, platform === 'win32' ? env.PATH : require('./player').systemPath()));
  const run =
    o.run ??
    ((/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {NodeJS.ProcessEnv | undefined} */ extraEnv) => {
      const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, timeout: 15000, env: extraEnv ? { ...process.env, ...extraEnv } : process.env });
      return { status: r.status, stdout: r.stdout ?? '' };
    });
  const runAsync =
    o.runAsync ??
    (o.run
      ? (/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {NodeJS.ProcessEnv | undefined} */ extraEnv) => Promise.resolve(run(cmd, args, extraEnv))
      : (/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {NodeJS.ProcessEnv | undefined} */ extraEnv) =>
          /** @type {Promise<{status: number | null, stdout: string}>} */ (
            new Promise((done) => {
              execFile(cmd, args, { encoding: 'utf8', windowsHide: true, timeout: 15000, env: extraEnv ? { ...process.env, ...extraEnv } : process.env }, (err, stdout) => {
                const code = err ? (typeof (/** @type {any} */ (err).code) === 'number' ? /** @type {any} */ (err).code : 1) : 0;
                done({ status: code, stdout: String(stdout ?? '') });
              });
            })
          ));
  return { platform, home, env, find, run, runAsync, dir: P.dataDir(platform, env, home) };
}

/** ¿Tienen los dos archivos el mismo contenido? @param {string} a @param {Buffer | string} content */
function sameContent(a, content) {
  try {
    return fs.readFileSync(a).equals(Buffer.isBuffer(content) ? content : Buffer.from(content));
  } catch {
    return false;
  }
}

/** Escribe un archivo solo si cambia (los shells lo leen antes de cada prompt). @param {string} file @param {Buffer | string} content */
function writeIfChanged(file, content) {
  if (sameContent(file, content)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

/**
 * Copia los scripts a la carpeta de datos y escribe la configuración.
 * @param {string} extensionPath
 * @param {{conf: string, board: string[], git?: string}} data `prompt.conf`, los mensajes del
 *   Consejo y `bureau.gitconfig` (si no viene, se deja el que haya)
 * @param {InstallerOptions} [o]
 */
function prepare(extensionPath, data, o = {}) {
  const { dir } = resolve(o);
  const src = path.join(extensionPath, 'terminal');
  for (const name of SCRIPTS) writeIfChanged(path.join(dir, name), fs.readFileSync(path.join(src, name)));
  for (const name of ZSH_FILES) writeIfChanged(path.join(dir, 'zsh', `.${name}`), fs.readFileSync(path.join(src, 'zsh', name)));
  const icon = path.join(extensionPath, 'images', 'icon.png');
  if (fs.existsSync(icon)) writeIfChanged(path.join(dir, 'icon.png'), fs.readFileSync(icon));
  writeIfChanged(path.join(dir, 'board.txt'), `${data.board.join('\n')}\n`);
  writeIfChanged(path.join(dir, 'prompt.conf'), data.conf);
  if (data.git !== undefined) writeIfChanged(path.join(dir, GIT_COLORS_FILE), data.git);
  return dir;
}

/** Solo actualiza `prompt.conf` (ajustes y tema). @param {string} conf @param {InstallerOptions} [o] */
function writeConf(conf, o = {}) {
  return writeIfChanged(path.join(resolve(o).dir, 'prompt.conf'), conf);
}

/** Solo actualiza `bureau.gitconfig`. @param {string} text @param {InstallerOptions} [o] */
function writeGitColors(text, o = {}) {
  return writeIfChanged(path.join(resolve(o).dir, GIT_COLORS_FILE), text);
}

/**
 * Las claves de color de tu configuración de Git (`color.status.changed`…), para
 * dejarlas fuera de `bureau.gitconfig`. Sin las variables GIT_CONFIG_* (VS Code
 * abierto desde una terminal Bureau las hereda) y en tu carpeta personal. Sin
 * Git, ninguna. Git con su ruta absoluta, como los demás programas: con solo
 * «git», Windows lo buscaría antes en la carpeta actual y en las entradas
 * relativas del PATH.
 * @param {InstallerOptions} [o]
 * @returns {Promise<string[]>}
 */
function ownGitColors(o = {}) {
  const r = resolve(o);
  const git = r.find('git');
  if (!git) return Promise.resolve([]);
  /** @type {NodeJS.ProcessEnv} */
  const env = Object.fromEntries(Object.entries(r.env).filter(([k]) => !/^GIT_CONFIG_(COUNT|KEY_\d+|VALUE_\d+|PARAMETERS)$/i.test(k)));
  return new Promise((done) => {
    // Sin claves de color, git config sale con 1 y sin salida: también vale.
    execFile(git, ['config', '--includes', '--get-regexp', '^color[.]'], { cwd: r.home, env, windowsHide: true, timeout: 10000 }, (_err, stdout) => {
      done(String(stdout ?? '').split(/\r?\n/).map((l) => l.split(/\s/)[0]).filter((k) => k.startsWith('color.')));
    });
  });
}

/**
 * Lo instalado fuera de VS Code: los perfiles tocados, la variable PROMPT (su
 * valor anterior y el escrito) y si hay fragmento de Windows Terminal.
 * @param {string} dir @returns {{files: string[], cmdPrompt?: {backup: string | null, value?: string | null}, windowsTerminal?: boolean}}
 */
function readState(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, STATE_FILE), 'utf8'));
  } catch {
    return { files: [] };
  }
}

/** @param {string} dir @param {ReturnType<typeof readState>} state */
function writeState(dir, state) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

/** ¿Está el prompt instalado fuera de VS Code? @param {InstallerOptions} [o] */
function isInstalledOutside(o = {}) {
  const state = readState(resolve(o).dir);
  return state.files.length > 0 || state.cmdPrompt !== undefined || state.windowsTerminal === true;
}

/**
 * La ruta de profile.ps1 (todos los hosts) de un PowerShell: la pregunta a
 * PowerShell, porque «Documentos» puede estar en OneDrive.
 * @param {string} exe ruta absoluta de pwsh o powershell
 * @param {ReturnType<typeof resolve>} r
 */
function powershellProfile(exe, r) {
  const out = r.run(exe, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$PROFILE.CurrentUserAllHosts']);
  const file = out.status === 0 ? out.stdout.trim().split(/\r?\n/).pop() ?? '' : '';
  return path.isAbsolute(file) ? file : null;
}

/** powershell.exe del sistema (nunca uno del PATH). @param {NodeJS.ProcessEnv} env */
const windowsPowerShell = (env) => path.win32.join(env.SystemRoot || env.windir || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

/**
 * Git Bash en Windows (no el bash.exe de WSL que hay en System32).
 * @param {ReturnType<typeof resolve>} r
 */
function gitBash(r) {
  const candidates = [
    r.find('bash'),
    ...[r.env.ProgramFiles, r.env['ProgramFiles(x86)'], r.env.LOCALAPPDATA && path.win32.join(r.env.LOCALAPPDATA, 'Programs')]
      .filter(Boolean)
      .map((d) => path.win32.join(/** @type {string} */ (d), 'Git', 'bin', 'bash.exe')),
  ];
  return candidates.find((c) => c && !/\\system32\\/i.test(c) && fs.existsSync(c)) ?? null;
}

/**
 * Los perfiles de shell que se tocan en este sistema.
 * @param {ReturnType<typeof resolve>} r
 * @returns {Array<{shell: 'powershell' | 'bash' | 'zsh' | 'fish', file: string, own?: boolean}>} own: archivo propio (conf.d de fish), se borra entero
 */
function profileTargets(r) {
  /** @type {Array<{shell: 'powershell' | 'bash' | 'zsh' | 'fish', file: string, own?: boolean}>} */
  const targets = [];
  const loginShell = path.basename(r.env.SHELL || '');
  /** Archivo de bash/zsh: si ya existe o es tu shell. @param {'bash' | 'zsh'} shell @param {string[]} files */
  const rc = (shell, files) => {
    const existing = files.find((f) => fs.existsSync(f));
    if (existing) targets.push({ shell, file: existing });
    else if (loginShell === shell) targets.push({ shell, file: files[0] });
  };
  if (r.platform === 'win32') {
    const shells = [windowsPowerShell(r.env), r.find('pwsh')].filter((s) => s && fs.existsSync(s));
    for (const exe of shells) {
      const file = powershellProfile(/** @type {string} */ (exe), r);
      if (file && !targets.some((t) => t.file === file)) targets.push({ shell: 'powershell', file });
    }
    if (gitBash(r)) targets.push({ shell: 'bash', file: path.win32.join(r.home, '.bashrc') });
    return targets;
  }
  const pwsh = r.find('pwsh');
  if (pwsh) {
    const file = powershellProfile(pwsh, r);
    if (file) targets.push({ shell: 'powershell', file });
  }
  if (r.find('bash')) rc('bash', r.platform === 'darwin' ? [path.join(r.home, '.bash_profile'), path.join(r.home, '.bashrc')] : [path.join(r.home, '.bashrc')]);
  if (r.find('zsh')) rc('zsh', [path.join(r.env.ZDOTDIR || r.home, '.zshrc')]);
  if (r.find('fish')) targets.push({ shell: 'fish', file: path.join(r.env.XDG_CONFIG_HOME || path.join(r.home, '.config'), 'fish', 'conf.d', 'bureau-theme.fish'), own: true });
  return targets;
}

/** Carpeta del fragmento de Windows Terminal. @param {ReturnType<typeof resolve>} r */
const fragmentDir = (r) => path.win32.join(r.env.LOCALAPPDATA || path.win32.join(r.home, 'AppData', 'Local'), 'Microsoft', 'Windows Terminal', 'Fragments', 'BureauTheme');

/**
 * JSON con comentarios y comas finales, como el settings.json de Windows Terminal.
 * @param {string} text
 */
function parseJsonc(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i;
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++;
      out += text.slice(start, i + 1);
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      if (c === '}' || c === ']') {
        const trimmed = out.trimEnd();
        if (trimmed.endsWith(',')) out = trimmed.slice(0, -1) + out.slice(trimmed.length);
      }
      out += c;
    }
  }
  return JSON.parse(out.replace(/^﻿/, ''));
}

/**
 * Tu settings.json de Windows Terminal (el de la Store, el de Preview o el
 * de la versión sin empaquetar), solo para leerlo. null si no hay o no se entiende.
 * @param {InstallerOptions} [o]
 */
function windowsTerminalSettings(o = {}) {
  const r = resolve(o);
  const local = r.env.LOCALAPPDATA || path.win32.join(r.home, 'AppData', 'Local');
  const files = [
    path.win32.join(local, 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    path.win32.join(local, 'Packages', 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    path.win32.join(local, 'Microsoft', 'Windows Terminal', 'settings.json'),
  ];
  for (const file of files) {
    try {
      return parseJsonc(fs.readFileSync(file, 'utf8'));
    } catch {
      // No existe o no se entiende: el siguiente.
    }
  }
  return null;
}

/**
 * Lee o cambia la variable PROMPT de tu usuario (cmd la lee al abrirse). Con
 * PowerShell y no con setx: avisa a Windows del cambio y también sabe borrarla.
 * El valor viaja en una variable de entorno, nunca dentro del código.
 * @param {ReturnType<typeof resolve>} r @param {string | null} [value] undefined = solo leer, null = borrar
 * @returns {string | null} el valor anterior
 */
function userPromptVariable(r, value) {
  return promptVariableResult(value, r.run(...promptVariableCall(r, value)));
}

/** Lo mismo sin parar el host de extensiones. @param {ReturnType<typeof resolve>} r @param {string | null} [value] */
async function userPromptVariableAsync(r, value) {
  return promptVariableResult(value, await r.runAsync(...promptVariableCall(r, value)));
}

/** @param {ReturnType<typeof resolve>} r @param {string | null} [value] @returns {[string, string[], NodeJS.ProcessEnv]} */
function promptVariableCall(r, value) {
  const script =
    value === undefined
      ? "[Console]::Out.Write([Environment]::GetEnvironmentVariable('PROMPT', 'User'))"
      : "[Environment]::SetEnvironmentVariable('PROMPT', $(if ($env:BUREAU_NEW_PROMPT) { $env:BUREAU_NEW_PROMPT } else { $null }), 'User')";
  return [windowsPowerShell(r.env), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { BUREAU_NEW_PROMPT: value ?? '' }];
}

/** @param {string | null | undefined} value @param {{status: number | null, stdout: string}} out */
function promptVariableResult(value, out) {
  if (out.status !== 0) throw new Error('PowerShell could not change the PROMPT variable');
  return value === undefined ? out.stdout || null : null;
}

/**
 * Instala el prompt fuera de VS Code: el bloque en los perfiles de los shells
 * y lo que depende de los ajustes (`refreshOutside`).
 * @param {{cmdPrompt: string, fragment: object | null}} data
 * @param {InstallerOptions} [o]
 * @returns {Promise<string[]>} los archivos y variables que se han tocado
 */
async function installOutside(data, o = {}) {
  const r = resolve(o);
  const state = readState(r.dir);
  /** @type {string[]} */
  const changed = [];
  for (const t of profileTargets(r)) {
    const block = P.profileBlock(t.shell, r.dir);
    const before = fs.existsSync(t.file) ? fs.readFileSync(t.file, 'utf8') : '';
    const after = t.own ? `${block}\n` : P.addBlock(before, block);
    if (after !== before) {
      fs.mkdirSync(path.dirname(t.file), { recursive: true });
      fs.writeFileSync(t.file, after);
      changed.push(t.file);
    }
    if (!state.files.includes(t.file)) state.files.push(t.file);
  }
  writeState(r.dir, state);
  return [...changed, ...(await refreshOutside(data, o, true))];
}

/**
 * Lo de fuera de VS Code que depende de los ajustes y del tema: la variable
 * PROMPT de cmd y el fragmento de Windows Terminal (los shells leen
 * `prompt.conf` solos). No hace nada si no está instalado. PowerShell (para
 * PROMPT) va sin esperar en bloqueo: se llama en cada cambio de tema o de estilo.
 * @param {{cmdPrompt: string, fragment: object | null}} data
 * @param {InstallerOptions} [o]
 * @param {boolean} [installing]
 * @returns {Promise<string[]>}
 */
async function refreshOutside(data, o = {}, installing = false) {
  const r = resolve(o);
  const state = readState(r.dir);
  if (!installing && !(state.files.length > 0 || state.cmdPrompt !== undefined || state.windowsTerminal)) return [];
  /** @type {string[]} */
  const changed = [];
  if (r.platform === 'win32') {
    if (state.cmdPrompt === undefined) state.cmdPrompt = { backup: await userPromptVariableAsync(r) };
    // Con el prompt apagado, cmd vuelve a tu PROMPT de antes.
    const wanted = data.cmdPrompt || state.cmdPrompt.backup;
    if (state.cmdPrompt.value !== wanted) {
      await userPromptVariableAsync(r, wanted);
      state.cmdPrompt.value = wanted;
      changed.push('PROMPT');
    }
    if (data.fragment) {
      if (writeIfChanged(path.win32.join(fragmentDir(r), 'bureau-theme.json'), `${JSON.stringify(data.fragment, null, 2)}\n`)) changed.push('Windows Terminal');
      state.windowsTerminal = true;
    }
  }
  writeState(r.dir, state);
  return changed;
}

/**
 * Quita el prompt de fuera de VS Code: los bloques de los perfiles, el archivo
 * de fish, el fragmento de Windows Terminal y la variable PROMPT (vuelve a su
 * valor anterior).
 * @param {InstallerOptions} [o]
 * @returns {string[]} lo que se ha tocado
 */
function removeOutside(o = {}) {
  const r = resolve(o);
  const state = readState(r.dir);
  /** @type {string[]} */
  const changed = [];
  for (const file of state.files) {
    try {
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, 'utf8');
      if (!P.hasBlock(before)) continue;
      const after = P.removeBlock(before);
      if (after.trim() === '' && path.basename(path.dirname(file)) === 'conf.d') fs.rmSync(file);
      else fs.writeFileSync(file, after);
      changed.push(file);
    } catch {
      // Un archivo que no se puede escribir se queda: el bloque solo carga el script si existe.
    }
  }
  if (r.platform === 'win32') {
    if (state.cmdPrompt !== undefined) {
      try {
        // Solo si sigue siendo el que escribió la extensión: si lo cambiaste después, se respeta.
        if ((userPromptVariable(r) ?? null) === (state.cmdPrompt.value ?? null)) {
          userPromptVariable(r, state.cmdPrompt.backup);
          changed.push('PROMPT');
        }
      } catch {
        // Sin PowerShell no se puede: la variable se queda (cmd sigue funcionando).
      }
    }
    if (state.windowsTerminal) {
      fs.rmSync(fragmentDir(r), { recursive: true, force: true });
      changed.push('Windows Terminal');
    }
  }
  writeState(r.dir, { files: [] });
  return changed;
}

/**
 * Lo borra todo: lo de fuera de VS Code y la carpeta de datos (script de
 * desinstalación de la extensión, src/extension/uninstall.js).
 * @param {InstallerOptions} [o]
 */
function removeEverything(o = {}) {
  const r = resolve(o);
  try {
    removeOutside(o);
  } finally {
    fs.rmSync(r.dir, { recursive: true, force: true });
    // La carpeta de la extensión (BureauTheme o bureau-theme), si se queda vacía.
    try {
      fs.rmdirSync(path.dirname(r.dir));
    } catch {
      // No está vacía o no existe.
    }
  }
}

module.exports = { SCRIPTS, ZSH_FILES, GIT_COLORS_FILE, prepare, writeConf, writeGitColors, ownGitColors, installOutside, refreshOutside, removeOutside, removeEverything, isInstalledOutside, profileTargets, resolve, gitBash, windowsPowerShell, parseJsonc, windowsTerminalSettings };
