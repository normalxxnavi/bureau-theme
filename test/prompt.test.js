'use strict';

/**
 * La terminal Bureau: ajustes, el PROMPT de cmd, los bloques de los perfiles de
 * los shells, el fragmento de Windows Terminal, la fuente de iconos, el
 * instalador (carpeta personal temporal y programas falsos) y el dibujo real
 * de los scripts en los shells que haya instalados (bash y PowerShell en
 * Windows; zsh y fish en macOS y Linux si están).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const P = require('../src/extension/prompt-config');
const installer = require('../src/extension/prompt-installer');
const { installFonts, uninstallAllFonts, fingerprint } = require('../src/extension/font-installer');
const { isOwnValue, settingsFor, fallbackFonts } = require('../src/extension/fontsets');
const { findAppRoot } = require('../scripts/lib/vscode-install');

const ROOT = path.resolve(__dirname, '..');
// Los scripts quitan los iconos en las terminales que no los dibujan (la consola
// clásica de Windows…), y la de los tests depende de dónde se lancen: aquí se
// fuerzan, salvo en las pruebas de esa decisión.
process.env.BUREAU_PROMPT_ICONS = '1';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const properties = Object.assign({}, ...pkg.contributes.configuration.map((/** @type {any} */ c) => c.properties));
const ESC = '\x1b';

const defaults = () => P.normalizePromptConfig(() => undefined);

/** ¿Hay git? (las pruebas con Git de verdad) */
function hasGit() {
  try {
    return spawnSync('git', ['--version'], { stdio: 'ignore', timeout: 20000 }).status === 0;
  } catch {
    return false;
  }
}

/** El texto sin los escapes ANSI. @param {string} s */
const plain = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/**
 * Los iconos que no llevan un espacio detrás: el dibujo ocupa su celda y la
 * siguiente, así que taparía lo que hubiera en ella.
 * @param {string} s texto con escapes ANSI (o el PROMPT de cmd, con `$E[…m`)
 */
const iconsWithoutSpace = (s) => {
  const chars = [...plain(s).replace(/\$E\[[0-9;]*m/g, '')];
  return chars.filter((c, i) => (c.codePointAt(0) ?? 0) >= 0xe000 && (c.codePointAt(0) ?? 0) <= 0xf8ff && chars[i + 1] !== ' ');
};

test('ajustes: apagado por defecto, solo en los ajustes de usuario y con los valores del código', () => {
  assert.deepEqual(defaults(), {
    style: 'off',
    classified: false,
    icons: true,
    windowsIcon: 'controlPoints',
    macosIcon: 'command',
    linuxIcon: 'tux',
    newTerminals: true,
    shell: 'auto',
    frame: true,
    gitColors: true,
  });
  // Mal escrito a mano: los valores por defecto.
  const bad = P.normalizePromptConfig((k) => ({ prompt: 'fancy', windowsIcon: 'logo', shell: 'nu', icons: 'no' })[k]);
  assert.equal(bad.style, 'off');
  assert.equal(bad.windowsIcon, 'controlPoints');
  assert.equal(bad.shell, 'auto');
  assert.equal(bad.icons, true);

  const key = (/** @type {string} */ k) => properties[`${P.TERMINAL}.${k}`];
  assert.equal(key('prompt').default, 'off');
  assert.deepEqual(key('prompt').enum, P.STYLES);
  assert.deepEqual(key('windowsIcon').enum, P.OS_ICONS.windows);
  assert.deepEqual(key('macosIcon').enum, P.OS_ICONS.macos);
  assert.deepEqual(key('linuxIcon').enum, P.OS_ICONS.linux);
  assert.deepEqual(key('shell').enum, P.SHELLS);
  // Un repositorio no puede encender el prompt ni tocar tus shells desde su .vscode/settings.json.
  for (const k of ['prompt', 'classified', 'icons', 'windowsIcon', 'macosIcon', 'linuxIcon', 'commandFrame', 'gitColors', 'newTerminals']) assert.equal(key(k).scope, 'application', k);
  assert.deepEqual(P.normalizePromptConfig((k) => ({ commandFrame: false, gitColors: false })[k]), { ...defaults(), frame: false, gitColors: false });
  assert.equal(key('shell').scope, 'machine');
  // El perfil «Bureau»: defaultProfile guarda su título tal cual (no se traduce).
  assert.deepEqual(pkg.contributes.terminal.profiles, [{ id: 'bureauTheme.terminal', title: 'Bureau', icon: 'bureau-terminal' }]);
  assert.ok(pkg.scripts.generate.includes('node scripts/prompt-icons.js'));
});

test('promptTheme y prompt.conf (una clave por línea, solo letras)', () => {
  assert.equal(P.promptTheme('CONTROL Resonant'), 'resonant');
  assert.equal(P.promptTheme('CONTROL Black'), 'black');
  assert.equal(P.promptTheme('Dark Modern'), 'other');
  assert.equal(P.promptTheme(undefined), 'other');
  const conf = P.confText({ ...defaults(), style: 'board', classified: true }, 'astral', 'es-ES');
  const lines = conf.split('\n').filter((l) => l && !l.startsWith('#'));
  assert.deepEqual(lines, ['style=board', 'classified=1', 'icons=1', 'windows=controlPoints', 'macos=command', 'linux=tux', 'frame=1', 'theme=astral', 'lang=es']);
  for (const l of lines) assert.match(l, /^[a-z]+=[A-Za-z0-9]+$/);
  assert.match(P.confText(defaults(), 'dark', 'en'), /^lang=en$/m);
});

test('colores de Git: solo slots de color, sin los tuyos, y nada con el prompt o los colores apagados', () => {
  const on = { ...defaults(), style: /** @type {const} */ ('signage') };
  const text = P.gitColorsText(on, 'dark', []);
  for (const line of ['[color "status"]', '\tchanged = yellow', '\tuntracked = brightblack', '\tbranch = red bold', '\tHEAD = red bold', '\ttag = magenta bold']) assert.ok(text.split('\n').includes(line), line);
  assert.doesNotMatch(text, /= (always|auto|true|false|never)$/m, 'nunca enciende ni apaga el color');
  // Resonant: el acento es cian y las remotas pasan a azul.
  const resonant = P.gitColorsText(on, 'resonant', []).split('\n');
  assert.ok(resonant.includes('\tHEAD = cyan bold') && resonant.includes('\tremote = blue'));
  // Los tuyos mandan (git config los da en minúsculas); una sección sin nada que poner no sale.
  const mine = P.gitColorsText(on, 'dark', ['color.status.changed', 'color.decorate.head', 'color.diff.commit']);
  assert.doesNotMatch(mine, /changed =|HEAD =|\[color "diff"\]/);
  assert.ok(mine.includes('\tuntracked = brightblack'));
  for (const cfg of [defaults(), { ...on, gitColors: false }]) assert.deepEqual(P.gitColorsText(cfg, 'dark', []).split('\n').filter((l) => l && !l.startsWith('#')), []);
  // Las variables: detrás de las que haya, y una sola vez.
  const file = '/d/bureau.gitconfig';
  assert.deepEqual(P.gitConfigEnv(file, {}), { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'include.path', GIT_CONFIG_VALUE_0: file });
  assert.deepEqual(P.gitConfigEnv(file, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.pager', GIT_CONFIG_VALUE_0: 'less' }), { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_1: 'include.path', GIT_CONFIG_VALUE_1: file });
  assert.deepEqual(P.gitConfigEnv(file, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'include.path', GIT_CONFIG_VALUE_0: file }), {});
});

test('colores de Git: Git acepta todos los valores y los usa a través de GIT_CONFIG_* (si está instalado)', { skip: !hasGit() && 'sin git' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-git-'));
  try {
    const file = path.join(dir, 'bureau.gitconfig');
    const text = P.gitColorsText({ ...defaults(), style: 'signage' }, 'dark', []);
    fs.writeFileSync(file, text);
    const home = path.join(dir, 'home');
    fs.mkdirSync(home);
    const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_CONFIG/i.test(k)));
    const env = { ...clean, HOME: home, USERPROFILE: home, GIT_CONFIG_NOSYSTEM: '1', ...P.gitConfigEnv(file, clean) };
    const git = (/** @type {string[]} */ args, cwd = dir) => spawnSync('git', args, { cwd, env, encoding: 'utf8' });
    let section = '';
    for (const line of text.split('\n')) {
      section = /^\[color "(\w+)"\]$/.exec(line)?.[1] ?? section;
      const slot = /^\t(\w+) = /.exec(line)?.[1];
      if (slot) assert.equal(git(['config', '--get-color', `color.${section}.${slot}`]).status, 0, `color.${section}.${slot}: Git no acepta el valor`);
    }
    const repo = path.join(dir, 'repo');
    fs.mkdirSync(repo);
    git(['init', '-q'], repo);
    fs.writeFileSync(path.join(repo, 'nuevo.txt'), 'x');
    const status = git(['-c', 'color.status=always', 'status', '--short'], repo);
    assert.ok(status.stdout.includes(`${ESC}[90m??`), `sin seguimiento en gris: ${JSON.stringify(status.stdout)}`);
    // Tus colores mandan: la extensión los lee sin las GIT_CONFIG_* de la terminal Bureau.
    fs.writeFileSync(path.join(home, '.gitconfig'), '[color "status"]\n\tuntracked = blue\n');
    const own = await installer.ownGitColors({ home, env });
    assert.deepEqual(own, ['color.status.untracked']);
    assert.ok(!P.gitColorsText({ ...defaults(), style: 'signage' }, 'dark', own).includes('untracked'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PROMPT de cmd: cada estilo con la ruta, sin redirecciones y con el acento del tema', () => {
  assert.equal(P.cmdPrompt(defaults(), 'dark'), '', 'apagado no hay PROMPT');
  for (const style of P.STYLES.filter((s) => s !== 'off')) {
    for (const icons of [true, false]) {
      const value = P.cmdPrompt({ ...defaults(), style, icons }, 'dark');
      assert.ok(value.includes('$P'), `${style}: la ruta`);
      assert.doesNotMatch(value, /[<>|&^%]/, `${style}: nada que cmd interprete`);
      assert.ok(value.endsWith(' '), `${style}: un espacio antes de lo que escribes`);
      const pua = [...value].some((c) => (c.codePointAt(0) ?? 0) >= 0xe000 && (c.codePointAt(0) ?? 0) <= 0xf8ff);
      assert.equal(pua, icons, `${style}: iconos ${icons}`);
      assert.deepEqual(iconsWithoutSpace(value), [], `${style}: cada icono lleva detrás su espacio`);
    }
  }
  assert.match(P.cmdPrompt({ ...defaults(), style: 'signage', icons: false }, 'dark'), /\$E\[7;31m FBC \$E\[0m/, 'sin iconos, la insignia es FBC');
  const win = String.fromCodePoint(P.ICON_CODES.controlPoints);
  assert.ok(P.cmdPrompt({ ...defaults(), style: 'signage' }, 'dark').includes(`$E[7;31m ${win}  $E[0m`), 'Señalética: el icono centrado en la insignia');
  assert.ok(P.cmdPrompt({ ...defaults(), style: 'dossier' }, 'dark').includes(`${win} $E[90m]`), 'Expediente: el icono no tapa el corchete');
  assert.ok(P.cmdPrompt({ ...defaults(), style: 'signage' }, 'resonant').includes('$E[7;36m'), 'el cian de la Hedron en Resonant');
  assert.ok(P.cmdPrompt({ ...defaults(), style: 'signage', windowsIcon: 'house' }, 'dark').includes(String.fromCodePoint(P.ICON_CODES.house)));
  assert.ok(P.cmdPrompt({ ...defaults(), style: 'dossier' }, 'dark').includes('$_'), 'Expediente: dos líneas');
});

test('el shell de un perfil por su nombre y la carpeta de datos de cada sistema', () => {
  assert.equal(P.shellFromProfileName('Command Prompt'), 'cmd');
  assert.equal(P.shellFromProfileName('Windows PowerShell'), 'powershell');
  assert.equal(P.shellFromProfileName('PowerShell'), 'pwsh');
  assert.equal(P.shellFromProfileName('Git Bash'), 'bash');
  assert.equal(P.shellFromProfileName('zsh'), 'zsh');
  assert.equal(P.shellFromProfileName('fish'), 'fish');
  assert.equal(P.shellFromProfileName('JavaScript Debug Terminal'), undefined);
  assert.equal(P.shellFromProfileName(null), undefined);
  assert.equal(P.dataDir('win32', { LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local' }, 'C:\\Users\\a'), 'C:\\Users\\a\\AppData\\Local\\BureauTheme\\terminal');
  assert.equal(P.dataDir('darwin', {}, '/Users/a'), '/Users/a/Library/Application Support/BureauTheme/terminal');
  assert.equal(P.dataDir('linux', {}, '/home/a'), '/home/a/.local/share/bureau-theme/terminal');
  assert.equal(P.dataDir('linux', { XDG_DATA_HOME: '/data' }, '/home/a'), '/data/bureau-theme/terminal');
});

test('bloque de los perfiles: se añade una vez, se actualiza y al quitarlo el archivo queda como estaba', () => {
  const dir = '/home/a/.local/share/bureau-theme/terminal';
  for (const shell of /** @type {const} */ (['powershell', 'bash', 'zsh', 'fish'])) {
    const block = P.profileBlock(shell, dir);
    assert.ok(block.startsWith(P.BLOCK_START) && block.endsWith(P.BLOCK_END), shell);
    assert.ok(block.includes(`${dir}/bureau-prompt.`), `${shell}: carga el script de la carpeta de datos`);
  }
  assert.match(P.profileBlock('bash', dir), /^\[ -r '.+' \] && \. '.+'$/m, 'bash: solo si existe');
  assert.ok(P.profileBlock('powershell', 'C:\\Users\\a\\AppData\\Local\\BureauTheme\\terminal').includes("'C:\\Users\\a\\AppData\\Local\\BureauTheme\\terminal\\bureau-prompt.ps1'"));
  assert.ok(P.profileBlock('bash', "C:\\Users\\o'brien").includes("C:/Users/o'\\''brien/bureau-prompt.bash"), 'comillas escapadas y barras de Git Bash');

  const block = P.profileBlock('zsh', dir);
  for (const original of ['', 'export A=1\n', 'export A=1', 'line1\r\nline2\r\n', '# solo\n\n\n']) {
    const added = P.addBlock(original, block);
    assert.ok(P.hasBlock(added));
    assert.equal(P.addBlock(added, block), added, 'dos veces = una');
    assert.equal(added.split(P.BLOCK_START).length, 2);
    const back = P.removeBlock(added);
    assert.equal(back, original === 'export A=1' ? 'export A=1\n' : original, JSON.stringify(original));
  }
  // Con CRLF el bloque también va en CRLF.
  assert.ok(P.addBlock('a\r\n', block).includes(`${P.BLOCK_START}\r\n`));
  // Se actualiza en su sitio (otra carpeta de datos).
  const moved = P.addBlock(P.addBlock('a\n', block) + 'b\n', P.profileBlock('zsh', '/other'));
  assert.ok(moved.includes('/other/bureau-prompt.zsh') && !moved.includes(dir) && moved.endsWith('b\n'));
});

test('la fuente de iconos en terminal.integrated.fontFamily: delante de la genérica y las tipografías la reconocen', () => {
  assert.equal(P.withPromptIcons("Consolas, 'Courier New', monospace", true), "Consolas, 'Courier New', 'Bureau Prompt Icons', monospace");
  assert.equal(P.withPromptIcons('Fira Code', true), "Fira Code, 'Bureau Prompt Icons'");
  const twice = P.withPromptIcons(P.withPromptIcons('Fira Code, monospace', true), true);
  assert.equal(twice.split('Bureau Prompt Icons').length, 2, 'sin duplicados');
  assert.equal(P.withPromptIcons(twice, false), 'Fira Code, monospace');
  assert.equal(P.promptIconsWanted((k) => ({ 'bureauTheme.terminal.prompt': 'signage' })[k]), true);
  assert.equal(P.promptIconsWanted((k) => ({ 'bureauTheme.terminal.prompt': 'signage', 'bureauTheme.terminal.icons': false })[k]), false);
  assert.equal(P.promptIconsWanted(() => undefined), false);

  const fallbacks = fallbackFonts({ 'terminal.integrated.fontFamily': 'Fira Code' }, {});
  const own = settingsFor('bureau', fallbacks)['terminal.integrated.fontFamily'];
  assert.ok(isOwnValue('terminal.integrated.fontFamily', P.withPromptIcons(own, true), fallbacks), 'con la fuente de iconos detrás sigue siendo de la extensión');
});

test('fragmento de Windows Terminal: los cuatro esquemas y dos perfiles con la fuente de iconos', () => {
  const { palettes } = require('../src/theme/build');
  const dir = 'C:\\Users\\a\\AppData\\Local\\BureauTheme\\terminal';
  const f = P.windowsTerminalFragment({ dir, palettes, theme: 'CONTROL Resonant', powershell: 'pwsh.exe', font: 'Cascadia Mono' });
  assert.deepEqual(f.schemes.map((s) => s.name), ['CONTROL Dark', 'CONTROL Black', 'CONTROL Resonant', 'CONTROL Astral']);
  const keys = ['background', 'foreground', 'cursorColor', 'selectionBackground', 'black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white'];
  for (const s of f.schemes) for (const k of [...keys, ...keys.slice(4).map((c) => `bright${c[0].toUpperCase()}${c.slice(1)}`)]) assert.match(/** @type {any} */ (s)[k], /^#[0-9A-F]{6}$/i, `${s.name}.${k}`);
  assert.equal(f.profiles.length, 2);
  for (const p of f.profiles) {
    assert.match(p.guid, /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/);
    assert.equal(p.colorScheme, 'CONTROL Resonant');
    assert.equal(p.font.face, 'Cascadia Mono, Bureau Prompt Icons');
  }
  assert.ok(f.profiles[0].commandline.startsWith('pwsh.exe -NoLogo -NoExit -Command "'));
  assert.ok(f.profiles[0].commandline.includes(P.powershellLoader(dir)));
  assert.equal(P.windowsTerminalFragment({ dir, palettes, theme: 'Dark Modern', powershell: 'powershell.exe', font: 'Cascadia Mono' }).profiles[1].colorScheme, 'CONTROL Dark');
  assert.ok(f.profiles.every((p) => !('updates' in p)), 'con los iconos apagados no se tocan tus perfiles');
  // El perfil de cmd lleva su PROMPT con iconos: tu variable PROMPT va sin ellos (la consola clásica no los dibuja).
  assert.equal(f.profiles[1].commandline, 'cmd.exe', 'con el prompt apagado, cmd tal cual');
  const prompt = P.cmdPrompt({ ...defaults(), style: 'signage' }, 'resonant');
  assert.equal(P.windowsTerminalFragment({ dir, palettes, theme: 'CONTROL Resonant', powershell: 'pwsh.exe', font: 'Cascadia Mono', cmdPrompt: prompt }).profiles[1].commandline, `cmd.exe /k prompt ${prompt}`);
  // El cargador funciona aunque la directiva de ejecución no deje ejecutar scripts.
  assert.match(P.powershellLoader(dir), /try \{ \. '.+bureau-prompt\.ps1' \} catch \{ Invoke-Expression \(\[IO\.File\]::ReadAllText\('.+'\)\) \}/);
  assert.doesNotMatch(P.powershellLoader(dir), /"/, 'sin comillas dobles: va dentro de -Command "…"');
});

test('fragmento de Windows Terminal: la fuente de iconos detrás de la tuya en tus perfiles (Símbolo del sistema, Windows PowerShell…)', () => {
  const { palettes } = require('../src/theme/build');
  const base = { dir: 'C:\\Users\\a\\AppData\\Local\\BureauTheme\\terminal', palettes, theme: 'CONTROL Dark', powershell: 'powershell.exe', font: 'Space Mono', icons: true };
  const cmd = P.WT_SHELL_GUIDS[0];
  // Sin settings.json (Windows Terminal sin abrir todavía): los perfiles de siempre, con Cascadia Mono.
  const fresh = P.windowsTerminalFragment(base).profiles.slice(2);
  assert.deepEqual(fresh.map((p) => p.updates), P.WT_SHELL_GUIDS);
  for (const p of fresh) assert.equal(p.font.face, 'Cascadia Mono, Bureau Prompt Icons');

  const settings = {
    profiles: {
      defaults: { font: { face: 'JetBrains Mono', size: 11 } },
      list: [
        { guid: cmd.toUpperCase(), name: 'Símbolo del sistema' },
        { guid: '{11111111-2222-3333-4444-555555555555}', name: 'Developer Command Prompt' },
        { guid: '{66666666-7777-8888-9999-000000000000}', name: 'Con su fuente', font: { face: 'Fira Code' } },
        { guid: P.WT_GUIDS.cmd, name: 'Bureau · Command Prompt' },
        { name: 'Sin GUID' },
      ],
    },
  };
  const updates = P.windowsTerminalFragment({ ...base, settings }).profiles.slice(2);
  assert.deepEqual(
    updates.map((p) => p.updates),
    [...P.WT_SHELL_GUIDS, '{11111111-2222-3333-4444-555555555555}'],
    'sin repetir, sin los perfiles Bureau ni los que tienen fuente propia (la tuya gana)'
  );
  for (const p of updates) assert.deepEqual(p.font, { face: 'JetBrains Mono, Bureau Prompt Icons' }, 'tu fuente de profiles.defaults, solo el nombre');
  // Ya la llevaba, o el formato antiguo (profiles como lista y fontFace).
  assert.equal(P.windowsTerminalUpdates({ profiles: { defaults: { font: { face: 'Consolas, Bureau Prompt Icons' } } } })[0].font.face, 'Consolas, Bureau Prompt Icons');
  assert.ok(!P.windowsTerminalUpdates({ profiles: [{ guid: cmd, fontFace: 'Consolas' }] }).some((p) => p.updates === cmd));
});

test('mintty: FontSubst solo desde la 3.8.3 y su bloque con la fuente de iconos', () => {
  assert.equal(P.minttyHasFontSubst("mintty '3.8.3' 2026-06-09_19:56 (Msys-x86_64)\n© 2026 Thomas Wolff"), true);
  assert.equal(P.minttyHasFontSubst("mintty '3.10.0'"), true);
  assert.equal(P.minttyHasFontSubst("mintty '3.8.2' 2025-…"), false);
  assert.equal(P.minttyHasFontSubst("mintty '3.7.8'"), false);
  assert.equal(P.minttyHasFontSubst(''), false, 'sin salida (no se pudo ejecutar)');
  assert.deepEqual(P.minttyBlock().split('\n').slice(1, -1), ['Font9=Bureau Prompt Icons', 'FontSubst=9']);
});

test('settings.json de Windows Terminal: JSON con comentarios y comas finales', () => {
  assert.deepEqual(installer.parseJsonc('\uFEFF{\n  // comentario\n  "a": "http://x/*y*/", /* otro */\n  "b": [1, 2,],\n  "c": "coma,]",\n}\n'), { a: 'http://x/*y*/', b: [1, 2], c: 'coma,]' });
});

// Solo en Windows: las rutas son de Windows (path.win32) y en Linux o macOS no llevan a la carpeta temporal.
test('settings.json de Windows Terminal: se lee sin escribirlo', { skip: process.platform !== 'win32' && 'rutas de Windows' }, () =>
  withHome(({ home, env }) => {
    const o = { platform: /** @type {NodeJS.Platform} */ ('win32'), home, env };
    assert.equal(installer.windowsTerminalSettings(o), null);
    const file = path.join(env.LOCALAPPDATA ?? '', 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = '{\n  // Windows Terminal\n  "profiles": { "defaults": { "font": { "face": "Consolas" } }, "list": [] },\n}\n';
    fs.writeFileSync(file, text);
    assert.equal(installer.windowsTerminalSettings(o).profiles.defaults.font.face, 'Consolas');
    assert.equal(fs.readFileSync(file, 'utf8'), text);
  }));

test('la fuente Bureau Prompt Icons tiene un glifo en cada punto de código, de una celda de ancho', () => {
  const { cmapLookup } = require('../scripts/lib/colr');
  const ttf = fs.readFileSync(path.join(ROOT, 'fonts', P.PROMPT_FONT.file));
  /** @type {Record<string, number>} */
  const tables = {};
  for (let i = 0; i < ttf.readUInt16BE(4); i++) tables[ttf.toString('latin1', 12 + i * 16, 16 + i * 16)] = ttf.readUInt32BE(20 + i * 16);
  const gid = cmapLookup(ttf.subarray(tables.cmap));
  const longLoca = ttf.readInt16BE(tables.head + 50) === 1;
  /** La x de los puntos de un glifo simple (svg2ttf deja xMin a 0 en la cabecera). @param {number} g */
  const xs = (g) => {
    let p = tables.glyf + (longLoca ? ttf.readUInt32BE(tables.loca + g * 4) : ttf.readUInt16BE(tables.loca + g * 2) * 2);
    const contours = ttf.readInt16BE(p);
    p += 10;
    const points = ttf.readUInt16BE(p + (contours - 1) * 2) + 1;
    p += contours * 2;
    p += 2 + ttf.readUInt16BE(p);
    /** @type {number[]} */
    const flags = [];
    while (flags.length < points) {
      const f = ttf[p++];
      flags.push(f);
      if (f & 8) for (let r = ttf[p++]; r > 0; r--) flags.push(f);
    }
    let x = 0;
    return flags.map((f) => {
      if (f & 2) x += f & 16 ? ttf[p++] : -ttf[p++];
      else if (!(f & 16)) (x += ttf.readInt16BE(p)), (p += 2);
      return x;
    });
  };
  const used = new Set();
  for (const [name, code] of Object.entries(P.ICON_CODES)) {
    const g = gid(code);
    assert.ok(g > 0, `${name}: sin glifo`);
    used.add(g);
    // Fuera de los rangos de Nerd Fonts y de Powerline, dentro del área de uso privado.
    assert.ok(code >= 0xe100 && code < 0xe200, name);
    // Centrado en sus dos celdas (la suya y el espacio de detrás): en un bloque, el mismo margen a cada lado.
    const x = xs(g);
    const [min, max] = [Math.min(...x), Math.max(...x)];
    assert.ok(min >= 0 && max <= 2 * 614, `${name}: dentro de las dos celdas (${min}..${max})`);
    assert.ok(Math.abs(min - (2 * 614 - max)) <= 1, `${name}: centrado (${min}..${max})`);
  }
  assert.equal(used.size, Object.keys(P.ICON_CODES).length, 'cada icono tiene su glifo');
  assert.equal(ttf.readUInt16BE(tables.head + 18), 1024);
  assert.equal(ttf.readUInt16BE(tables.hmtx + 4), 614, 'avance de una celda: el icono desborda sobre el espacio de detrás');
  assert.ok(ttf.includes(Buffer.from(P.PROMPT_FONT.family, 'latin1')), 'nombre de la familia');
});

test('los cuatro scripts llevan los mismos iconos que la fuente y todos los estilos', () => {
  const read = (/** @type {string} */ f) => fs.readFileSync(path.join(ROOT, 'terminal', f), 'utf8');
  const ps1 = read('bureau-prompt.ps1');
  // Windows PowerShell lee los scripts sin BOM con la página de códigos ANSI.
  assert.ok(![...ps1].some((c) => (c.codePointAt(0) ?? 0) > 127), 'bureau-prompt.ps1 solo con ASCII');
  const utf8 = (/** @type {number} */ code) => [...Buffer.from(String.fromCodePoint(code))].map((b) => `\\x${b.toString(16)}`).join('');
  for (const [name, code] of Object.entries(P.ICON_CODES)) {
    const hex = code.toString(16);
    assert.ok(new RegExp(`${name} = \\[char\\]0x${hex}`, 'i').test(ps1), `ps1: ${name}`);
    assert.ok(read('bureau-prompt.bash').includes(`__bureau_g_${name}=$'${utf8(code)}'`), `bash: ${name}`);
    assert.ok(read('bureau-prompt.zsh').includes(`${name} $'${utf8(code)}'`), `zsh: ${name}`);
    assert.ok(read('bureau-prompt.fish').includes(`__bureau_g_${name} \\u${hex}`), `fish: ${name}`);
  }
  for (const file of ['bureau-prompt.ps1', 'bureau-prompt.bash', 'bureau-prompt.zsh', 'bureau-prompt.fish']) {
    const src = read(file);
    for (const style of P.STYLES.filter((s) => s !== 'off')) assert.ok(src.includes(style), `${file}: ${style}`);
    assert.ok(src.includes('prompt.conf') && src.includes('board.txt') && src.includes('BUREAU_VSCODE_SI'), file);
  }
  for (const f of [...installer.SCRIPTS, ...installer.ZSH_FILES.map((z) => `zsh/${z}`)]) assert.ok(fs.existsSync(path.join(ROOT, 'terminal', f)), f);
});

/**
 * Carpeta personal temporal con programas falsos.
 * La carpeta se borra al terminar, también si `fn` es asíncrona.
 * @param {(o: {home: string, env: NodeJS.ProcessEnv, calls: string[][]}) => void | Promise<void>} fn
 */
async function withHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-home-'));
  try {
    await fn({ home, env: { LOCALAPPDATA: path.join(home, 'AppData', 'Local'), SHELL: '/bin/zsh', SystemRoot: path.join(home, 'Windows') }, calls: [] });
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

test('prepare: copia los scripts (los de zsh con su punto), prompt.conf y los mensajes del Consejo', () =>
  withHome(({ home, env }) => {
    const o = { platform: /** @type {NodeJS.Platform} */ ('linux'), home, env };
    const dir = installer.prepare(ROOT, { conf: 'style=signage\n', board: ['<<A.>>', '<<B.>>'] }, o);
    assert.equal(dir, P.dataDir('linux', env, home));
    for (const f of installer.SCRIPTS) assert.ok(fs.existsSync(path.join(dir, f)), f);
    for (const z of installer.ZSH_FILES) assert.ok(fs.existsSync(path.join(dir, 'zsh', `.${z}`)), z);
    assert.equal(fs.readFileSync(path.join(dir, 'prompt.conf'), 'utf8'), 'style=signage\n');
    assert.equal(fs.readFileSync(path.join(dir, 'board.txt'), 'utf8'), '<<A.>>\n<<B.>>\n');
    assert.ok(fs.existsSync(path.join(dir, 'icon.png')));
    assert.equal(fs.existsSync(path.join(dir, installer.GIT_COLORS_FILE)), false, 'sin tus colores de Git leídos aún, no se escribe');
    installer.prepare(ROOT, { conf: 'style=signage\n', board: [], git: '[color "status"]\n' }, o);
    assert.equal(fs.readFileSync(path.join(dir, installer.GIT_COLORS_FILE), 'utf8'), '[color "status"]\n');
    installer.prepare(ROOT, { conf: 'style=signage\n', board: [] }, o);
    assert.equal(fs.readFileSync(path.join(dir, installer.GIT_COLORS_FILE), 'utf8'), '[color "status"]\n', 'sin git, se queda el que había');
    assert.equal(installer.writeGitColors('# off\n', o), true);
    assert.equal(installer.writeConf('style=off\n', o), true);
    assert.equal(installer.writeConf('style=off\n', o), false, 'sin cambios no se reescribe');
    assert.equal(installer.isInstalledOutside(o), false);
  }));

test('fuera de VS Code en Linux/macOS: bloque en .bashrc y .zshrc, archivo de fish, y al quitarlo todo vuelve a estar como antes', () =>
  withHome(async ({ home, env }) => {
    const bin = (/** @type {string} */ name) => (['bash', 'zsh', 'fish'].includes(name) ? `/usr/bin/${name}` : null);
    const o = { platform: /** @type {NodeJS.Platform} */ ('linux'), home, env, find: bin, run: () => ({ status: 1, stdout: '' }) };
    fs.writeFileSync(path.join(home, '.bashrc'), 'alias ll="ls -l"\n');
    // Sin .zshrc, pero zsh es su shell: se crea.
    installer.prepare(ROOT, { conf: 'style=signage\n', board: [] }, o);
    const changed = await installer.installOutside({ cmdPrompt: '', fragment: null }, o);
    const fish = path.join(home, '.config', 'fish', 'conf.d', 'bureau-theme.fish');
    assert.deepEqual(changed.sort(), [path.join(home, '.bashrc'), path.join(home, '.zshrc'), fish].sort());
    assert.ok(fs.readFileSync(path.join(home, '.bashrc'), 'utf8').startsWith('alias ll="ls -l"\n\n# >>> Bureau prompt'));
    assert.ok(P.hasBlock(fs.readFileSync(path.join(home, '.zshrc'), 'utf8')));
    assert.ok(fs.readFileSync(fish, 'utf8').includes('bureau-prompt.fish'));
    assert.equal(installer.isInstalledOutside(o), true);
    assert.deepEqual(await installer.installOutside({ cmdPrompt: '', fragment: null }, o), [], 'instalar dos veces no cambia nada');

    installer.removeOutside(o);
    assert.equal(fs.readFileSync(path.join(home, '.bashrc'), 'utf8'), 'alias ll="ls -l"\n');
    assert.equal(fs.readFileSync(path.join(home, '.zshrc'), 'utf8'), '');
    assert.ok(!fs.existsSync(fish), 'el archivo propio de fish se borra');
    assert.equal(installer.isInstalledOutside(o), false);

    installer.removeEverything(o);
    assert.ok(!fs.existsSync(P.dataDir('linux', env, home)), 'al desinstalar se borra la carpeta de datos');
  }));

// Solo en Windows: con las rutas de Windows (path.win32), en Linux o macOS el fragmento sería un archivo suelto en la carpeta actual.
test('fuera de VS Code en Windows: profile.ps1, la variable PROMPT (con su valor anterior) y el fragmento de Windows Terminal', { skip: process.platform !== 'win32' && 'rutas de Windows' }, () =>
  withHome(async ({ home, env, calls }) => {
    const pwsh = path.join(home, 'pwsh.exe');
    fs.writeFileSync(pwsh, '');
    const profile = path.join(home, 'Documents', 'PowerShell', 'profile.ps1');
    /** @type {{value: string | null}} */
    const userPrompt = { value: '$P$G' };
    const run = (/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {NodeJS.ProcessEnv | undefined} */ extra) => {
      calls.push([path.basename(cmd), args[args.length - 1]]);
      const script = args[args.length - 1];
      if (script === '$PROFILE.CurrentUserAllHosts') return { status: 0, stdout: cmd === pwsh ? `${profile}\r\n` : '' };
      if (script.includes('GetEnvironmentVariable')) return { status: 0, stdout: userPrompt.value ?? '' };
      if (script.includes('SetEnvironmentVariable')) {
        userPrompt.value = extra?.BUREAU_NEW_PROMPT || null;
        return { status: 0, stdout: '' };
      }
      return { status: 1, stdout: '' };
    };
    const o = { platform: /** @type {NodeJS.Platform} */ ('win32'), home, env, find: (/** @type {string} */ n) => (n === 'pwsh' ? pwsh : null), run };
    const { palettes } = require('../src/theme/build');
    const dir = P.dataDir('win32', env, home);
    const fragment = P.windowsTerminalFragment({ dir, palettes, theme: 'CONTROL Dark', powershell: 'pwsh.exe', font: 'Cascadia Mono' });
    const cmd = P.cmdPrompt({ ...defaults(), style: 'signage' }, 'dark');
    await installer.installOutside({ cmdPrompt: cmd, fragment }, o);
    assert.ok(P.hasBlock(fs.readFileSync(profile, 'utf8')));
    assert.equal(userPrompt.value, cmd);
    const fragmentFile = path.win32.join(env.LOCALAPPDATA ?? '', 'Microsoft', 'Windows Terminal', 'Fragments', 'BureauTheme', 'bureau-theme.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(fragmentFile, 'utf8')).schemes.length, 4);
    // El valor viaja en una variable de entorno, nunca dentro del código de PowerShell.
    assert.ok(calls.every(([, script]) => !script.includes(cmd)));

    // Con el prompt apagado, cmd vuelve a tu PROMPT de antes.
    await installer.refreshOutside({ cmdPrompt: '', fragment }, o);
    assert.equal(userPrompt.value, '$P$G');
    await installer.refreshOutside({ cmdPrompt: cmd, fragment }, o);
    assert.equal(userPrompt.value, cmd);

    installer.removeOutside(o);
    assert.equal(userPrompt.value, '$P$G', 'PROMPT vuelve a su valor anterior');
    assert.ok(!fs.existsSync(fragmentFile));
    assert.equal(fs.readFileSync(profile, 'utf8'), '');
    assert.deepEqual(await installer.refreshOutside({ cmdPrompt: cmd, fragment }, o), [], 'sin instalar, no se toca nada');
  }));

test('fuera de VS Code en Windows: con Git Bash, la fuente de iconos en la configuración de mintty (3.8.3 o posterior)', { skip: process.platform !== 'win32' && 'rutas de Windows' }, () =>
  withHome(async ({ home, env }) => {
    const git = path.join(home, 'Programs', 'Git');
    for (const exe of [path.join(git, 'bin', 'bash.exe'), path.join(git, 'usr', 'bin', 'mintty.exe')]) {
      fs.mkdirSync(path.dirname(exe), { recursive: true });
      fs.writeFileSync(exe, '');
    }
    const appdata = path.join(home, 'AppData', 'Roaming');
    const config = path.join(appdata, 'mintty', 'config');
    const version = { text: "mintty '3.8.3' 2026-06-09_19:56 (Msys-x86_64)\n" };
    const run = (/** @type {string} */ cmd, /** @type {string[]} */ args) => {
      if (path.basename(cmd) === 'mintty.exe') return { status: args[0] === '--version' ? 0 : 1, stdout: version.text };
      // La variable PROMPT de cmd (sin valor).
      return { status: args[args.length - 1].includes('EnvironmentVariable') ? 0 : 1, stdout: '' };
    };
    const o = { platform: /** @type {NodeJS.Platform} */ ('win32'), home, env: { ...env, APPDATA: appdata, ProgramFiles: path.join(home, 'Programs') }, find: () => null, run };
    const data = { cmdPrompt: '', fragment: null };

    await installer.installOutside(data, o);
    assert.equal(fs.readFileSync(config, 'utf8'), `${P.minttyBlock()}\n`, 'sin configuración de mintty, solo el bloque');
    assert.ok(P.hasBlock(fs.readFileSync(path.join(home, '.bashrc'), 'utf8')), 'y el prompt en .bashrc');
    installer.removeOutside(o);
    assert.ok(!fs.existsSync(config), 'al quitarlo, el archivo que solo tenía el bloque se borra');

    // Tu configuración se queda como estaba.
    fs.mkdirSync(path.dirname(config), { recursive: true });
    fs.writeFileSync(config, 'Columns=100\r\nRows=27\r\n');
    await installer.installOutside(data, o);
    assert.ok(fs.readFileSync(config, 'utf8').startsWith('Columns=100\r\nRows=27\r\n\r\n# >>> Bureau prompt'));
    installer.removeOutside(o);
    assert.equal(fs.readFileSync(config, 'utf8'), 'Columns=100\r\nRows=27\r\n');

    // Instalado fuera de VS Code antes de esto: lo recibe al sincronizar, una vez.
    fs.rmSync(config);
    const dir = P.dataDir('win32', o.env, home);
    fs.writeFileSync(path.join(dir, 'installed.json'), JSON.stringify({ files: [path.join(home, '.bashrc')], cmdPrompt: { backup: null, value: null } }));
    assert.deepEqual(await installer.refreshOutside(data, o), [config]);
    assert.ok(P.hasBlock(fs.readFileSync(config, 'utf8')));
    assert.deepEqual(await installer.refreshOutside(data, o), [], 'la segunda vez, nada');
    installer.removeOutside(o);
    assert.ok(!fs.existsSync(config));

    // Un mintty anterior a la 3.8.3 avisaría de una opción desconocida: nada.
    version.text = "mintty '3.7.8' 2025-04-01 (Msys-x86_64)\n";
    await installer.installOutside(data, o);
    assert.ok(!fs.existsSync(config));
    installer.removeOutside(o);
  }));

test('la fuente de iconos se instala con las demás y se borra al desinstalar (o se queda con la terminal Bureau encendida)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fonts-'));
  const run = () => ({ status: 0 });
  try {
    installFonts(path.join(ROOT, 'fonts'), [P.PROMPT_FONT], { platform: 'win32', fontsDir: dir, run });
    assert.deepEqual(fs.readdirSync(dir), ['BureauTheme-BureauPromptIcons.ttf']);
    uninstallAllFonts({ platform: 'win32', fontsDir: dir, run, keepPromptIcons: true });
    assert.equal(fs.readdirSync(dir).length, 1);
    uninstallAllFonts({ platform: 'win32', fontsDir: dir, run });
    assert.equal(fs.readdirSync(dir).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('una fuente nueva se instala aunque Windows tenga abierta la anterior (al lado, con su huella)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fonts-'));
  /** @type {string[]} */
  const registered = [];
  const run = (/** @type {string} */ _cmd, /** @type {string[]} */ args) => {
    if (args[0] === 'add') registered.push(path.basename(args[args.indexOf('/d') + 1]));
    return { status: 0 };
  };
  const base = 'BureauTheme-BureauPromptIcons.ttf';
  const stamped = `BureauTheme-BureauPromptIcons.${fingerprint(path.join(ROOT, 'fonts', P.PROMPT_FONT.file))}.ttf`;
  /** La copia de siempre está abierta: no se puede reemplazar. @param {string} src @param {string} dest */
  const locked = (src, dest) => {
    if (path.basename(dest) === base) throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
    fs.copyFileSync(src, dest);
  };
  try {
    fs.writeFileSync(path.join(dir, base), 'la fuente anterior');
    const o = { platform: /** @type {NodeJS.Platform} */ ('win32'), fontsDir: dir, run };
    assert.deepEqual(installFonts(path.join(ROOT, 'fonts'), [P.PROMPT_FONT], { ...o, copy: locked }).map((f) => path.basename(f)), [stamped]);
    assert.deepEqual(registered, [stamped], 'el registro apunta a la nueva');
    assert.deepEqual(fs.readdirSync(dir), [stamped], 'la anterior se borra en cuanto se puede (aquí no está abierta de verdad)');
    // Ya cerrada: la de siempre se actualiza y la de al lado se borra.
    installFonts(path.join(ROOT, 'fonts'), [P.PROMPT_FONT], o);
    assert.deepEqual(registered, [stamped, base]);
    assert.deepEqual(fs.readdirSync(dir), [base]);
    assert.ok(fs.readFileSync(path.join(dir, base)).equals(fs.readFileSync(path.join(ROOT, 'fonts', P.PROMPT_FONT.file))));
    // Desinstalar borra todas las copias.
    installFonts(path.join(ROOT, 'fonts'), [P.PROMPT_FONT], { ...o, copy: locked });
    fs.writeFileSync(path.join(dir, stamped.replace(/\.[0-9a-f]{8}\./, '.0badf00d.')), 'otra anterior');
    uninstallAllFonts(o);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** ¿Está este programa? @param {string} cmd @param {string[]} args */
const has = (cmd, args) => {
  try {
    return spawnSync(cmd, args, { stdio: 'ignore', timeout: 20000 }).status === 0;
  } catch {
    return false;
  }
};

/** Carpeta temporal con el script y su prompt.conf. @param {string} file */
function scratch(file) {
  // Con la ruta larga: en los runners de Windows la carpeta temporal es C:\Users\RUNNER~1\… y PowerShell la expande.
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-prompt-')));
  fs.copyFileSync(path.join(ROOT, 'terminal', file), path.join(dir, file));
  return dir;
}

/** Comprobaciones comunes del dibujo de cada estilo (texto con escapes ANSI). @param {Record<string, string>} out */
function checkRendered(out) {
  const win = String.fromCodePoint(P.ICON_CODES.controlPoints);
  const branch = String.fromCodePoint(P.ICON_CODES.branch);
  assert.ok(out['signage-ok'].includes(`${ESC}[7;31m ${win}  `), 'Señalética: la insignia con el icono de Windows, centrado (su espacio y el margen)');
  assert.ok(plain(out['dossier-ok']).includes(`┌─[${win} ]─[`), 'Expediente: el icono no tapa el corchete');
  for (const [key, text] of Object.entries(out)) assert.deepEqual(iconsWithoutSpace(text), [], `${key}: cada icono lleva detrás su espacio`);
  assert.ok(out['signage-ok'].includes(`${branch} develop ↑1 ~5`), 'Señalética: la rama');
  assert.ok(out['signage-ok'].includes('4.2 s'), 'Señalética: el tiempo');
  assert.ok(out['signage-fail'].includes(`${ESC}[7;91m `), 'Señalética: el error');
  assert.ok(out['dossier-ok'].includes('┌─[') && out['dossier-ok'].includes('\n') && out['dossier-ok'].includes('└─'), 'Expediente: dos líneas');
  assert.ok(out['controlPoint-ok'].includes('■') && out['controlPoint-fail'].includes('□'), 'Punto de Control: el Punto se vacía');
  assert.ok(out['board-ok'].includes('<<') && out['board-ok'].includes('(DEVELOP.)'), 'El Consejo');
  assert.ok(out['board-fail'].includes('(ERROR 1.) (1.)'), 'El Consejo: el error con su eco');
  assert.ok(out['alertLevel-ok'].includes('CLEAR') && out['alertLevel-ok'].includes('14:32') && out['alertLevel-ok'].includes('─'), 'Nivel de alerta');
  assert.ok(out['alertLevel-fail'].includes('ALERT · 1'), 'Nivel de alerta: Alerta');
}

/** Lo que se pide a cada shell: `##caso##texto` (cabecera y cierre con ancho 60, icons=1, theme=dark, lang=en). */
const FRAME_LINES = ['npm test', 'cd ..', 'cd x && npm test', 'exit', 'clear'];

/** @param {string} stdout */
const frames = (stdout) => Object.fromEntries([...stdout.replace(/\r/g, '').matchAll(/##([\w-]+)##([^#]*)/g)].map((m) => [m[1], m[2]]));

/** La cabecera y el cierre de cada comando, iguales en todos los shells. @param {Record<string, string>} out */
function checkFrames(out) {
  const g = (/** @type {keyof typeof P.ICON_CODES} */ name) => String.fromCodePoint(P.ICON_CODES[name]);
  for (const k of ['head-short', 'head-long', 'head-multi', 'foot-ok', 'foot-fail', 'foot-stopped']) {
    assert.ok(out[k], `${k}: ${JSON.stringify(out)}`);
    assert.equal([...plain(out[k])].length, 59, `${k}: ocupa el ancho menos una columna`);
    assert.deepEqual(iconsWithoutSpace(out[k]), [], `${k}: cada icono lleva detrás su espacio`);
  }
  assert.equal(plain(out['head-short']), `── ■ npm run build ${'─'.repeat(31)} 14:32 ──`);
  assert.ok(out['head-short'].includes(`${ESC}[31m■${ESC}[0m ${ESC}[1mnpm run build${ESC}[22m`), 'el ■ en el acento y el comando en negrita');
  assert.equal(plain(out['head-long']), `── ■ ${'x'.repeat(40)}… ─── 14:32 ──`, 'un comando largo se recorta');
  assert.ok(plain(out['head-multi']).startsWith('── ■ echo a … ─'), 'de varias líneas, la primera');
  assert.match(plain(out['foot-ok']), new RegExp(`^── ${g('clear')} DONE · 4\\.2 s ─+$`));
  assert.ok(out['foot-ok'].includes(`${ESC}[1;32m`), 'completado en verde');
  assert.match(plain(out['foot-fail']), new RegExp(`^── ${g('error')} FAILED · code 1 · 0\\.4 s ─+$`));
  assert.ok(out['foot-fail'].includes(`${ESC}[1;91m`), 'fallo en rojo');
  assert.match(plain(out['foot-stopped']), new RegExp(`^── ${g('anomaly')} INTERRUPTED · 1 min 1 s ─+$`), 'interrumpido (Ctrl+C), sin código');
  assert.equal(out.wanted, '10100', `con marco: ${FRAME_LINES.join(' | ')}`);
}

test('bash dibuja los cinco estilos (si está instalado)', { skip: !has('bash', ['--version']) && 'sin bash' }, () => {
  const dir = scratch('bureau-prompt.bash');
  try {
    const script = [
      `cd '${dir.replace(/\\/g, '/')}'`,
      'source ./bureau-prompt.bash',
      "__bureau_git() { __bg_branch=develop; __bg_counts='↑1 ~5'; return 0; }",
      'HOME=/home/agente; PWD=/home/agente/source/repos/Theme-Control',
      '__bureau_now=14:32 __bureau_columns=100 __bureau_os=windows',
      'for style in signage dossier controlPoint board alertLevel; do for ok in 1 0; do',
      "  printf 'style=%s\\nicons=1\\ntheme=dark\\nlang=en\\n' $style > prompt.conf; __bureau_conf",
      '  __bureau_ok=$ok __bureau_code=$((1-ok)) __bureau_fails=$((1-ok)) __bureau_dur=4200',
      '  __bureau_render; printf "@@%s-%s@@%s" $style $ok "$__bureau_ps1"',
      'done; done',
    ].join('\n');
    const r = spawnSync('bash', ['--norc', '-i', '-c', script], { encoding: 'utf8', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
    /** @type {Record<string, string>} */
    const out = {};
    for (const [, style, ok, text] of r.stdout.replace(/[\x01\x02]/g, '').matchAll(/@@(\w+)-(\d)@@([^@]*)/g)) out[`${style}-${ok === '1' ? 'ok' : 'fail'}`] = text;
    assert.equal(Object.keys(out).length, 10, r.stderr);
    checkRendered(out);
    assert.ok(out['signage-ok'].includes(' ~/source/repos/Theme-Control '), 'la carpeta personal es ~');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const UTF8 = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
const FRAME_CONF = 'style=signage\nicons=1\ntheme=dark\nlang=en\n';
/** La prueba de verdad: icons=0, y los comandos llegan por la entrada de un shell interactivo. */
const SESSION_CONF = 'style=signage\nicons=0\ntheme=dark\nlang=en\n';
const SESSION_LINES = ['echo hola', 'cd ..', 'false', 'exit'];
/** En la carpeta temporal (sin repositorio que mirar), sin el PWD de quien lanza los tests y fuera de VS Code (aunque los lances desde su terminal). */
const SESSION_ENV = { ...Object.fromEntries(Object.entries(UTF8).filter(([k]) => !['PWD', 'OLDPWD', 'TERM_PROGRAM', 'VSCODE_SHELL_INTEGRATION'].includes(k))), COLUMNS: '60' };

/** Una sesión de verdad con cabecera y cierre: los de echo y false, ninguno para cd. @param {string} out */
function checkSession(out) {
  // Sin escapes ni la marca de fin de línea de zsh (PROMPT_SP: «#» o «%», espacios y retorno de carro).
  const text = out.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g, '').replace(/[#%] +\r/g, '').replace(/\r/g, '');
  assert.match(text, /── ■ echo hola ─+ \d\d:\d\d ──/, `cabecera: ${text}`);
  assert.match(text, /hola\s+── DONE · \d+\.\d s ─+/, 'la salida y el cierre');
  assert.match(text, /── ■ false ─+ \d\d:\d\d ──\s+── × FAILED · code 1 · \d+\.\d s ─+/, 'el fallo');
  assert.doesNotMatch(text, /■ (cd|exit)\b/, 'cd y exit no llevan marco');
}

/** bash 4.4 o posterior (PS0): la cabecera y el cierre lo necesitan. */
const bashFrames = (() => {
  try {
    const [major, minor] = spawnSync('bash', ['-c', 'echo ${BASH_VERSINFO[0]} ${BASH_VERSINFO[1]}'], { encoding: 'utf8', timeout: 20000 }).stdout.trim().split(' ').map(Number);
    return major > 4 || (major === 4 && minor >= 4);
  } catch {
    return false;
  }
})();

test('bash: la cabecera y el cierre de cada comando (bash 4.4 o posterior)', { skip: !bashFrames && 'sin bash 4.4' }, () => {
  const dir = scratch('bureau-prompt.bash');
  const unix = dir.replace(/\\/g, '/');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), FRAME_CONF);
    const script = [
      `cd '${unix}'`,
      'source ./bureau-prompt.bash; __bureau_conf',
      '__bureau_head "npm run build" 60 14:32; printf "##head-short##%s" "$__bh"',
      '__bureau_head "$(printf "x%.0s" {1..100})" 60 14:32; printf "##head-long##%s" "$__bh"',
      "__bureau_head $'echo a\\necho b' 60 14:32; printf '##head-multi##%s' \"$__bh\"",
      '__bureau_foot 1 0 0 4200 60; printf "##foot-ok##%s" "$__bf"',
      '__bureau_foot 0 0 1 420 60; printf "##foot-fail##%s" "$__bf"',
      '__bureau_foot 0 1 130 61000 60; printf "##foot-stopped##%s" "$__bf"',
      `w=; for l in ${FRAME_LINES.map((l) => `'${l}'`).join(' ')}; do __bureau_frame_wanted "$l" && w+=1 || w+=0; done; printf '##wanted##%s' "$w"`,
      // Buscar .git termina también con una carpeta C:/… (sin / al subir del todo).
      "PWD=C:/no/repo __bureau_git; printf '##git##%s' $?",
    ].join('\n');
    const out = frames(spawnSync('bash', ['--norc', '-i', '-c', script], { encoding: 'utf8', env: UTF8, timeout: 30000 }).stdout);
    checkFrames(out);
    assert.equal(out.git, '1');

    fs.writeFileSync(path.join(dir, 'prompt.conf'), SESSION_CONF);
    const input = ['exec 2>&1', `source '${unix}/bureau-prompt.bash'`, ...SESSION_LINES, ''].join('\n');
    checkSession(spawnSync('bash', ['--norc', '-i'], { encoding: 'utf8', input, cwd: dir, env: { ...SESSION_ENV, HISTCONTROL: 'ignoreboth' }, timeout: 60000 }).stdout);
    // En VS Code la cabecera sale de la trampa DEBUG (no de PS0), una vez por línea, y nada en una línea vacía.
    const inVscode = ['exec 2>&1', `source '${unix}/bureau-prompt.bash'`, '', ...SESSION_LINES, ''].join('\n');
    const session = spawnSync('bash', ['--norc', '-i'], { encoding: 'utf8', input: inVscode, cwd: dir, env: { ...SESSION_ENV, TERM_PROGRAM: 'vscode', HISTCONTROL: 'ignoreboth' }, timeout: 60000 }).stdout;
    checkSession(session);
    const plainSession = plain(session);
    assert.equal(plainSession.match(/── ■ echo hola/g)?.length, 1, 'una sola cabecera por comando');
    assert.equal(plainSession.match(/── ■ /g)?.length, 2, 'cabeceras solo para echo y false (no para la línea vacía, cd ni exit)');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** El script de integración de shell de bash del VS Code instalado (common/scripts; browser/media en los antiguos), o null. */
const vscodeBashIntegration = (() => {
  const app = findAppRoot();
  if (!app) return null;
  const terminal = path.join(app, 'out', 'vs', 'workbench', 'contrib', 'terminal');
  return [path.join(terminal, 'common', 'scripts', 'shellIntegration-bash.sh'), path.join(terminal, 'browser', 'media', 'shellIntegration-bash.sh')].find((f) => fs.existsSync(f)) ?? null;
})();

test('bash con la integración de shell de VS Code: la cabecera va después de su marca de comando (si VS Code está instalado)', { skip: (!bashFrames && 'sin bash 4.4') || (!vscodeBashIntegration && 'sin VS Code') }, () => {
  // En Linux y macOS VS Code lee el comando de la pantalla al recibir la marca C: con la cabecera antes, no coincidiría.
  const dir = scratch('bureau-prompt.bash');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-home-'));
  const unix = (/** @type {string} */ p) => p.replace(/\\/g, '/');
  try {
    fs.copyFileSync(path.join(ROOT, 'terminal', 'bureau-init.bash'), path.join(dir, 'bureau-init.bash'));
    fs.writeFileSync(path.join(dir, 'prompt.conf'), SESSION_CONF);
    const env = { ...SESSION_ENV, HOME: unix(home), HISTCONTROL: 'ignoreboth', TERM_PROGRAM: 'vscode', BUREAU_VSCODE_SI: unix(/** @type {string} */ (vscodeBashIntegration)), VSCODE_NONCE: 'bureau' };
    const r = spawnSync('bash', ['--init-file', unix(path.join(dir, 'bureau-init.bash')), '-i'], { encoding: 'utf8', input: 'echo hola\nfalse\nexit\n', cwd: dir, env, timeout: 60000 });
    const out = plain(r.stdout);
    for (const [command, code] of [['echo hola', 0], ['false', 1]]) {
      const started = out.indexOf(`\x1b]633;E;${command};bureau\x07`);
      assert.ok(started >= 0, `VS Code recibe «${command}»: ${JSON.stringify(out)} ${r.stderr}`);
      const executed = out.indexOf('\x1b]633;C\x07', started);
      const header = out.indexOf(`── ■ ${command}`, started);
      assert.ok(executed > started && header > executed, `la cabecera de «${command}» va después de la marca C: ${JSON.stringify(out)}`);
      assert.ok(out.indexOf(`\x1b]633;D;${code}\x07`, header) > header, `y el final con el código ${code}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

/** PowerShell disponible: pwsh o Windows PowerShell. */
const powershell = ['pwsh', 'powershell'].find((exe) => has(exe, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', 'exit 0']));

test('PowerShell dibuja los cinco estilos (si está instalado)', { skip: !powershell && 'sin PowerShell' }, () => {
  const dir = scratch('bureau-prompt.ps1');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), 'style=signage\nicons=1\ntheme=dark\nlang=en\n');
    const script = [
      `. '${path.join(dir, 'bureau-prompt.ps1')}'`,
      "$git = @{ Branch = 'develop'; Ahead = 1; Behind = 0; Changes = 5 }",
      "foreach ($style in 'signage','dossier','controlPoint','board','alertLevel') { foreach ($ok in $true, $false) {",
      "  $conf = (__BureauConf).Clone(); $conf['style'] = $style",
      "  $d = @{ Os = 'windows'; Path = '~\\source\\repos\\Theme-Control'; Leaf = 'Theme-Control'; Git = $git; Ok = $ok; Code = [int](-not $ok); Fails = [int](-not $ok); Stopped = $false; DurationMs = 4200; Width = 100; Time = '14:32'; Transient = $false }",
      "  $t = __BureauRender $d $conf",
      "  [Console]::Out.Write('@@' + $style + '-' + [int]$ok + '@@' + $t)",
      '} }',
    ].join('\n');
    const r = spawnSync(/** @type {string} */ (powershell), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding = [Text.Encoding]::UTF8; ${script}`], { encoding: 'utf8' });
    /** @type {Record<string, string>} */
    const out = {};
    for (const [, style, ok, text] of r.stdout.matchAll(/@@(\w+)-(\d)@@([^@]*)/g)) out[`${style}-${ok === '1' ? 'ok' : 'fail'}`] = text;
    assert.equal(Object.keys(out).length, 10, r.stderr);
    checkRendered(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.replace(/\r/g, '')])));

    // Desde las líneas de profile.ps1, como fuera de VS Code (los nombres de PowerShell no distinguen mayúsculas).
    const viaProfile = `${P.profileBlock('powershell', dir)}\n[Console]::Out.Write('@@' + [bool]$function:__BureauConf + '@@' + (prompt))`;
    const p = spawnSync(/** @type {string} */ (powershell), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding = [Text.Encoding]::UTF8; ${viaProfile}`], { encoding: 'utf8' });
    assert.match(p.stdout, /@@True@@/, p.stderr);
    assert.ok(p.stdout.includes(String.fromCodePoint(P.ICON_CODES.folder)), 'el prompt Bureau, con sus iconos');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('zsh dibuja los cinco estilos y el prompt transitorio (si está instalado)', { skip: !has('zsh', ['--version']) && 'sin zsh' }, () => {
  const dir = scratch('bureau-prompt.zsh');
  try {
    assert.equal(spawnSync('zsh', ['-n', path.join(dir, 'bureau-prompt.zsh')]).status, 0, 'sintaxis');
    for (const z of installer.ZSH_FILES) assert.equal(spawnSync('zsh', ['-n', path.join(ROOT, 'terminal', 'zsh', z)]).status, 0, z);
    const script = [
      `cd '${dir}'`,
      'source ./bureau-prompt.zsh',
      "__bureau_git() { __bg_branch=develop; __bg_counts='↑1 ~5'; return 0 }",
      'HOME=/home/agente; PWD=/home/agente/source/repos/Theme-Control',
      '__bureau_now=14:32 __bureau_columns=100 __bureau_os=windows',
      'for style in signage dossier controlPoint board alertLevel; do for ok in 1 0; do',
      "  printf 'style=%s\\nicons=1\\ntheme=dark\\nlang=en\\n' $style > prompt.conf; __bureau_conf",
      '  __bureau_ok=$ok __bureau_code=$((1-ok)) __bureau_fails=$((1-ok)) __bureau_dur=4200',
      '  __bureau_render; print -rn -- "@@$style-$ok@@$__bureau_prompt"',
      'done; done',
      '__bureau_transient=1; __bureau_render; print -rn -- "@@transient-1@@$__bureau_prompt"',
    ].join('\n');
    const r = spawnSync('zsh', ['-f', '-i', '-c', script], { encoding: 'utf8', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
    /** @type {Record<string, string>} */
    const out = {};
    for (const [, style, ok, text] of r.stdout.replace(/%\{|%\}/g, '').matchAll(/@@(\w+)-(\d)@@([^@]*)/g)) out[`${style}-${ok === '1' ? 'ok' : 'fail'}`] = text;
    assert.equal(Object.keys(out).length, 11, r.stderr);
    checkRendered(out);
    assert.ok(out['transient-ok'].includes(`${ESC}[7m        `), 'Clasificado: la barra de censura');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PowerShell: la cabecera y el cierre de cada comando (si está instalado)', { skip: !powershell && 'sin PowerShell' }, () => {
  const dir = scratch('bureau-prompt.ps1');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), FRAME_CONF);
    const out = (/** @type {string} */ name, /** @type {string} */ expr) => `[Console]::Out.Write('##${name}##' + (${expr}))`;
    const script = [
      `. '${path.join(dir, 'bureau-prompt.ps1')}'`,
      '$conf = __BureauConf',
      out('head-short', "__BureauFrameHead 'npm run build' 60 '14:32' $conf"),
      out('head-long', "__BureauFrameHead ('x' * 100) 60 '14:32' $conf"),
      out('head-multi', '__BureauFrameHead "echo a`necho b" 60 \'14:32\' $conf'),
      out('foot-ok', '__BureauFrameFoot @{ Ok = $true; Stopped = $false; Code = 0; DurationMs = 4200 } 60 $conf'),
      out('foot-fail', '__BureauFrameFoot @{ Ok = $false; Stopped = $false; Code = 1; DurationMs = 420 } 60 $conf'),
      out('foot-stopped', '__BureauFrameFoot @{ Ok = $false; Stopped = $true; Code = 1; DurationMs = 61000 } 60 $conf'),
      out('wanted', `(@(${FRAME_LINES.map((l) => `'${l}'`).join(', ')}) | ForEach-Object { [int](__BureauFrameWanted $_) }) -join ''`),
      out('git', '"$env:GIT_CONFIG_KEY_0=$env:GIT_CONFIG_VALUE_0"'),
      // Lo que pasa al pulsar Intro (la cabecera) y en el prompt siguiente (el cierre, sin el tiempo en el prompt).
      "[Console]::Out.Write('##enter##'); __BureauFrameStart 'npm test'; $global:__BureauState.FrameStart = [datetime]::UtcNow.AddSeconds(-3)",
      out('prompt', 'prompt'),
    ].join('\n');
    const r = spawnSync(/** @type {string} */ (powershell), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding = [Text.Encoding]::UTF8; ${script}`], { encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_CONFIG/i.test(k))) });
    const got = frames(r.stdout);
    checkFrames(got);
    assert.match(plain(got.enter), /^── ■ npm test ─+ \d\d:\d\d ──\s+── \S+ DONE · 3\.\d s ─+\s*$/, `al pulsar Intro y en el prompt: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(plain(got.prompt), /3\.\d s/, 'el prompt ya no repite el tiempo');
    assert.equal(got.git, `include.path=${path.join(dir, installer.GIT_COLORS_FILE)}`, 'Git incluye bureau.gitconfig');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('zsh: la cabecera y el cierre de cada comando (si está instalado)', { skip: !has('zsh', ['--version']) && 'sin zsh' }, () => {
  const dir = scratch('bureau-prompt.zsh');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), FRAME_CONF);
    const script = [
      `cd '${dir}'`,
      'source ./bureau-prompt.zsh; __bureau_conf',
      '__bureau_head "npm run build" 60 14:32; print -rn -- "##head-short##$__bh"',
      '__bureau_head ${(l:100::x:)} 60 14:32; print -rn -- "##head-long##$__bh"',
      "__bureau_head $'echo a\\necho b' 60 14:32; print -rn -- \"##head-multi##$__bh\"",
      '__bureau_foot 1 0 0 4200 60; print -rn -- "##foot-ok##$__bf"',
      '__bureau_foot 0 0 1 420 60; print -rn -- "##foot-fail##$__bf"',
      '__bureau_foot 0 1 130 61000 60; print -rn -- "##foot-stopped##$__bf"',
      `w=; for l in ${FRAME_LINES.map((l) => `'${l}'`).join(' ')}; do __bureau_frame_wanted "$l" && w+=1 || w+=0; done; print -rn -- "##wanted##$w"`,
      // Buscar .git termina también con una carpeta C:/… (sin / al subir del todo).
      'PWD=C:/no/repo; __bureau_git; print -rn -- "##git##$?"',
    ].join('\n');
    const out = frames(spawnSync('zsh', ['-f', '-i', '-c', script], { encoding: 'utf8', env: UTF8, timeout: 30000 }).stdout);
    checkFrames(out);
    assert.equal(out.git, '1');

    fs.writeFileSync(path.join(dir, 'prompt.conf'), SESSION_CONF);
    const input = ['exec 2>&1', `source '${dir}/bureau-prompt.zsh'`, ...SESSION_LINES, ''].join('\n');
    checkSession(spawnSync('zsh', ['-f', '-i'], { encoding: 'utf8', input, cwd: dir, env: SESSION_ENV, timeout: 60000 }).stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('la sintaxis de fish es válida (si está instalado)', { skip: !has('fish', ['--version']) && 'sin fish' }, () => {
  assert.equal(spawnSync('fish', ['--no-execute', path.join(ROOT, 'terminal', 'bureau-prompt.fish')]).status, 0);
});

test('fish: la cabecera y el cierre de cada comando (si está instalado)', { skip: !has('fish', ['--version']) && 'sin fish' }, () => {
  const dir = scratch('bureau-prompt.fish');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), FRAME_CONF);
    const script = [
      `cd '${dir}'`,
      'source ./bureau-prompt.fish; __bureau_conf',
      "echo -n '##head-short##'(__bureau_head 'npm run build' 60 14:32)",
      "echo -n '##head-long##'(__bureau_head (string repeat -n 100 x) 60 14:32)",
      "echo -n '##head-multi##'(__bureau_head 'echo a'\\n'echo b' 60 14:32)",
      "echo -n '##foot-ok##'(__bureau_foot 1 0 0 4200 60)",
      "echo -n '##foot-fail##'(__bureau_foot 0 0 1 420 60)",
      "echo -n '##foot-stopped##'(__bureau_foot 0 1 130 61000 60)",
      `set -l w ''; for l in ${FRAME_LINES.map((l) => `'${l}'`).join(' ')}; if __bureau_frame_wanted $l; set w "$w"1; else; set w "$w"0; end; end; echo -n '##wanted##'$w`,
    ].join('\n');
    // -i: el script solo se carga en un shell interactivo.
    checkFrames(frames(spawnSync('fish', ['-i', '-c', script], { encoding: 'utf8', env: UTF8 }).stdout));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const PROMPT_SCRIPTS = ['bureau-prompt.ps1', 'bureau-prompt.bash', 'bureau-prompt.zsh', 'bureau-prompt.fish'];

/**
 * ¿Dibuja la terminal los iconos? Los casos, iguales en bash, zsh y fish:
 * nombre, sistema, variables y lo esperado. `appdata` es la carpeta con la
 * configuración de mintty que escribe la extensión.
 * @param {string} appdata
 * @returns {Array<[string, string, Record<string, string>, 0 | 1]>}
 */
const iconCases = (appdata) => [
  ['classic', 'windows', {}, 0],
  ['vscode', 'windows', { TERM_PROGRAM: 'vscode' }, 1],
  ['wt', 'windows', { WT_SESSION: 'abc' }, 1],
  ['force-on', 'windows', { BUREAU_PROMPT_ICONS: '1' }, 1],
  ['force-off', 'windows', { TERM_PROGRAM: 'vscode', BUREAU_PROMPT_ICONS: '0' }, 0],
  ['linux', 'linux', { TERM: 'xterm-256color' }, 1],
  ['linux-console', 'linux', { TERM: 'linux' }, 0],
  ['macos', 'macos', {}, 1],
  ['mintty-noconf', 'windows', { TERM_PROGRAM: 'mintty', TERM_PROGRAM_VERSION: '3.8.3', APPDATA: path.join(appdata, 'nada') }, 0],
  ['mintty', 'windows', { TERM_PROGRAM: 'mintty', TERM_PROGRAM_VERSION: '3.8.3', APPDATA: appdata }, 1],
  ['mintty-old', 'windows', { TERM_PROGRAM: 'mintty', TERM_PROGRAM_VERSION: '3.8.2', APPDATA: appdata }, 0],
  ['mintty-new', 'windows', { TERM_PROGRAM: 'mintty', TERM_PROGRAM_VERSION: '3.10.0', APPDATA: appdata }, 1],
];
const ICON_VARS = ['BUREAU_PROMPT_ICONS', 'TERM', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'WT_SESSION', 'APPDATA'];

/** La carpeta APPDATA con la configuración de mintty de la extensión (con CRLF, como en Windows). @param {string} dir */
function minttyAppdata(dir) {
  const appdata = path.join(dir, 'appdata');
  fs.mkdirSync(path.join(appdata, 'mintty'), { recursive: true });
  fs.writeFileSync(path.join(appdata, 'mintty', 'config'), `Columns=100\r\n${P.minttyBlock().replace(/\n/g, '\r\n')}\r\n`);
  return appdata;
}

/** Lo que han contestado los shells: `@@caso=0|1`. @param {string} stdout */
const iconAnswers = (stdout) => Object.fromEntries([...stdout.matchAll(/@@([\w-]+)=([01])/g)].map((m) => [m[1], Number(m[2])]));

test('PowerShell: los iconos solo donde la terminal los dibuja (la consola clásica no)', { skip: !powershell && 'sin PowerShell' }, () => {
  const dir = scratch('bureau-prompt.ps1');
  try {
    fs.writeFileSync(path.join(dir, 'prompt.conf'), 'style=signage\nicons=1\ntheme=dark\nlang=en\n');
    /** @type {Array<[string, string, string]>} nombre, argumentos (sistema, forzado, TERM, TERM_PROGRAM, WT_SESSION, búfer, ventana), lo esperado */
    const cases = [
      ['conhost', "'windows' '' '' '' '' 9001 30", 'False'],
      ['conpty', "'windows' '' '' '' '' 30 30", 'True'],
      ['no-console', "'windows' '' '' '' '' 0 0", 'False'],
      ['vscode', "'windows' '' '' 'vscode' '' 9001 30", 'True'],
      ['wt', "'windows' '' '' '' 'abc' 9001 30", 'True'],
      ['force-on', "'windows' '1' '' '' '' 9001 30", 'True'],
      ['force-off', "'windows' '0' '' 'vscode' '' 30 30", 'False'],
      ['linux', "'linux' '' 'xterm-256color' '' '' 0 0", 'True'],
      ['linux-console', "'linux' '' 'linux' '' '' 0 0", 'False'],
    ];
    const script = [
      `. '${path.join(dir, 'bureau-prompt.ps1')}'`,
      ...cases.map(([name, args]) => `[Console]::Out.Write('@@${name}=' + (__BureauCanDrawIcons ${args}))`),
      // Sin iconos, prompt.conf se lee con icons=0 y el prompt va sin ellos.
      "$global:__BureauState.NoIcons = $true; $global:__BureauState.ConfStamp = [datetime]::MinValue",
      "[Console]::Out.Write('@@conf=' + (__BureauConf)['icons'] + '@@prompt=' + (prompt))",
    ].join('\n');
    const r = spawnSync(/** @type {string} */ (powershell), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding = [Text.Encoding]::UTF8; ${script}`], { encoding: 'utf8' });
    for (const [name, , expected] of cases) assert.ok(r.stdout.includes(`@@${name}=${expected}`), `${name}: ${expected} (${r.stdout}${r.stderr})`);
    assert.ok(r.stdout.includes('@@conf=0'), 'prompt.conf con icons=0');
    const prompt = r.stdout.split('@@prompt=')[1] ?? '';
    assert.ok(prompt.includes(' FBC '), `la insignia sin iconos: ${prompt}`);
    assert.ok(![...prompt].some((c) => (c.codePointAt(0) ?? 0) >= 0xe000 && (c.codePointAt(0) ?? 0) <= 0xf8ff), 'ningún icono');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('bash: los iconos solo donde la terminal los dibuja (mintty con FontSubst, nunca la consola clásica)', { skip: !has('bash', ['--version']) && 'sin bash' }, () => {
  const dir = scratch('bureau-prompt.bash');
  try {
    const appdata = minttyAppdata(dir);
    const script = [
      `cd '${dir.replace(/\\/g, '/')}'`,
      'source ./bureau-prompt.bash',
      `unset ${ICON_VARS.join(' ')}`,
      ...iconCases(appdata).map(([name, os, vars]) => {
        const env = Object.entries({ TERM: 'xterm-256color', ...vars }).map(([k, v]) => `${k}='${v}'`).join(' ');
        return `__bureau_os=${os}; if ${env} __bureau_icons_ok; then printf '@@${name}=1'; else printf '@@${name}=0'; fi`;
      }),
      // Sin iconos, prompt.conf se lee con icons=0.
      "printf 'style=signage\\nicons=1\\n' > prompt.conf; __bureau_noicons=1; __bureau_conf; printf '@@conf=%s' $__bc_icons",
    ].join('\n');
    const r = spawnSync('bash', ['--norc', '-i', '-c', script], { encoding: 'utf8', env: UTF8 });
    const got = iconAnswers(r.stdout);
    for (const [name, , , expected] of iconCases(appdata)) assert.equal(got[name], expected, `${name} (${r.stdout}${r.stderr})`);
    assert.equal(got.conf, 0, 'prompt.conf con icons=0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('zsh: los iconos solo donde la terminal los dibuja (si está instalado)', { skip: !has('zsh', ['--version']) && 'sin zsh' }, () => {
  const dir = scratch('bureau-prompt.zsh');
  try {
    const appdata = minttyAppdata(dir);
    const script = [
      `cd '${dir}'`,
      'source ./bureau-prompt.zsh',
      `unset ${ICON_VARS.join(' ')}`,
      ...iconCases(appdata).map(([name, os, vars]) => {
        const env = Object.entries({ TERM: 'xterm-256color', ...vars }).map(([k, v]) => `${k}='${v}'`).join(' ');
        return `__bureau_os=${os}; if ${env} __bureau_icons_ok; then print -rn -- '@@${name}=1'; else print -rn -- '@@${name}=0'; fi`;
      }),
      "printf 'style=signage\\nicons=1\\n' > prompt.conf; __bureau_noicons=1; __bureau_conf; print -rn -- \"@@conf=$__bc_icons\"",
    ].join('\n');
    const r = spawnSync('zsh', ['-f', '-i', '-c', script], { encoding: 'utf8', env: UTF8 });
    const got = iconAnswers(r.stdout);
    for (const [name, , , expected] of iconCases(appdata)) assert.equal(got[name], expected, `${name} (${r.stdout}${r.stderr})`);
    assert.equal(got.conf, 0, 'prompt.conf con icons=0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('fish: los iconos solo donde la terminal los dibuja (si está instalado)', { skip: !has('fish', ['--version']) && 'sin fish' }, () => {
  const dir = scratch('bureau-prompt.fish');
  try {
    const appdata = minttyAppdata(dir);
    const script = [
      `cd '${dir}'`,
      'source ./bureau-prompt.fish',
      ...iconCases(appdata).map(([name, os, vars]) => {
        // Globales: una función de fish no ve las variables locales de quien la llama.
        const env = Object.entries({ TERM: 'xterm-256color', ...vars }).map(([k, v]) => `set -gx ${k} '${v}'`).join('; ');
        return `${ICON_VARS.map((k) => `set -e ${k}`).join('; ')}; ${env}; set __bureau_os ${os}; if __bureau_icons_ok; echo -n '@@${name}=1'; else; echo -n '@@${name}=0'; end`;
      }),
      "printf 'style=signage\\nicons=1\\n' > prompt.conf; set __bureau_noicons 1; __bureau_conf; echo -n '@@conf='$__bc_icons",
    ].join('\n');
    const r = spawnSync('fish', ['-i', '-c', script], { encoding: 'utf8', env: UTF8 });
    const got = iconAnswers(r.stdout);
    for (const [name, , , expected] of iconCases(appdata)) assert.equal(got[name], expected, `${name} (${r.stdout}${r.stderr})`);
    assert.equal(got.conf, 0, 'prompt.conf con icons=0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('los cuatro scripts llaman a Git sin core.fsmonitor', () => {
  for (const file of PROMPT_SCRIPTS) {
    const calls = fs.readFileSync(path.join(ROOT, 'terminal', file), 'utf8').match(/(?:command|&) git\b[^\n]*/g) ?? [];
    assert.ok(calls.length > 0, `${file}: git status`);
    for (const call of calls) assert.match(call, /git -c core\.fsmonitor= /, `${file}: ${call}`);
  }
});

test('ownGitColors: sin Git con ruta absoluta no lanza ninguno', async () => {
  assert.deepEqual(await installer.ownGitColors({ find: () => null }), []);
});

test('Git en el prompt: el core.fsmonitor de un repositorio ajeno no se ejecuta (en cada shell instalado)', { skip: !hasGit() && 'sin git' }, () => {
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-fsmonitor-')));
  try {
    for (const file of PROMPT_SCRIPTS) fs.copyFileSync(path.join(ROOT, 'terminal', file), path.join(dir, file));
    const home = path.join(dir, 'home');
    const repo = path.join(dir, 'repo');
    fs.mkdirSync(home);
    fs.mkdirSync(repo);
    // Sin tu configuración de Git ni las GIT_* de la terminal Bureau.
    const env = { ...Object.fromEntries(Object.entries(UTF8).filter(([k]) => !/^GIT_/i.test(k))), HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1' };
    const git = (/** @type {string[]} */ ...args) => spawnSync('git', args, { cwd: repo, env, encoding: 'utf8', timeout: 20000 });
    for (const args of [['init', '-q'], ['symbolic-ref', 'HEAD', 'refs/heads/expediente']]) assert.equal(git(...args).status, 0, args.join(' '));
    fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
    assert.equal(git('add', 'a.txt').status, 0);
    assert.equal(git('-c', 'user.name=Bureau', '-c', 'user.email=bureau@example.com', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'a').status, 0);
    // Lo que puede traer el .git/config de un archivo comprimido: un programa que git status ejecuta.
    const marker = path.join(dir, 'fsmonitor-ran');
    assert.equal(git('config', 'core.fsmonitor', `echo x > '${marker.replace(/\\/g, '/')}'; false`).status, 0);
    git('--no-optional-locks', 'status', '--porcelain=v2', '--branch');
    assert.ok(fs.existsSync(marker), 'sin -c core.fsmonitor=, git status lo ejecuta (si no, esta prueba no comprueba nada)');
    fs.rmSync(marker);

    const fwd = (/** @type {string} */ p) => p.replace(/\\/g, '/');
    /** @type {Array<{shell: string, args: string[]}>} */
    const runs = [];
    if (has('bash', ['--version'])) runs.push({ shell: 'bash', args: ['--norc', '-i', '-c', `source '${fwd(dir)}/bureau-prompt.bash'; cd '${fwd(repo)}'; __bureau_git; printf '@@%s@@' "$__bg_branch"`] });
    if (has('zsh', ['--version'])) runs.push({ shell: 'zsh', args: ['-f', '-i', '-c', `source '${dir}/bureau-prompt.zsh'; cd '${repo}'; __bureau_git; print -rn -- "@@$__bg_branch@@"`] });
    if (has('fish', ['--version'])) runs.push({ shell: 'fish', args: ['-i', '-c', `source '${dir}/bureau-prompt.fish'; cd '${repo}'; __bureau_git; echo -n '@@'$__bg_branch'@@'`] });
    if (powershell) runs.push({ shell: powershell, args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `. '${path.join(dir, 'bureau-prompt.ps1')}'; Set-Location -LiteralPath '${repo}'; [Console]::Out.Write('@@' + (__BureauGit (Get-Location).Path).Branch + '@@')`] });
    for (const { shell, args } of runs) {
      const r = spawnSync(shell, args, { cwd: repo, env, encoding: 'utf8', timeout: 30000 });
      assert.ok(r.stdout.includes('@@expediente@@'), `${shell}: la rama sigue saliendo: ${JSON.stringify(r.stdout)} ${r.stderr}`);
      assert.ok(!fs.existsSync(marker), `${shell}: ejecutó el core.fsmonitor del repositorio`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
