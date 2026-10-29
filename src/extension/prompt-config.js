// @ts-check
'use strict';

/**
 * El prompt Bureau de la terminal (lógica pura, sin `vscode`): estilos, iconos
 * de sistema, el archivo `prompt.conf` que leen los scripts de `terminal/`,
 * el PROMPT de cmd, los bloques que se añaden a los perfiles de los shells y
 * el fragmento de Windows Terminal.
 *
 * Los scripts (PowerShell, bash, zsh y fish) viven en la carpeta de datos de
 * la extensión (`dataDir`) y leen `prompt.conf` antes de cada prompt: así un
 * cambio en VS Code se ve en las terminales abiertas, dentro y fuera de VS Code.
 *
 * Los iconos salen de la fuente «Bureau Prompt Icons» (scripts/prompt-icons.js),
 * en el área de uso privado de Unicode: la terminal de VS Code no reescala esos
 * glifos y el icono ocupa también el espacio que lleva siempre detrás.
 */

const path = require('node:path');

/** Prefijo de los ajustes de la terminal. */
const TERMINAL = 'bureauTheme.terminal';

/** @typedef {'off' | 'signage' | 'dossier' | 'controlPoint' | 'board' | 'alertLevel'} PromptStyle */
/** @typedef {'auto' | 'pwsh' | 'powershell' | 'cmd' | 'bash' | 'zsh' | 'fish'} ShellChoice */
/** @typedef {'dark' | 'black' | 'resonant' | 'astral' | 'other'} PromptTheme */

/** Estilos (A–E de las propuestas). `off` deja el prompt de tu shell. */
const STYLES = /** @type {PromptStyle[]} */ (['off', 'signage', 'dossier', 'controlPoint', 'board', 'alertLevel']);
/** Estilos de dos líneas (PSReadLine necesita saberlo para redibujar). */
const TWO_LINE = ['dossier', 'alertLevel'];
/** Las dos variantes del icono de cada sistema: la primera es la recomendada. */
const OS_ICONS = {
  windows: ['controlPoints', 'house'],
  macos: ['command', 'apple'],
  linux: ['tux', 'tuxMop'],
};
const SHELLS = /** @type {ShellChoice[]} */ (['auto', 'pwsh', 'powershell', 'cmd', 'bash', 'zsh', 'fish']);

/**
 * Puntos de código de «Bureau Prompt Icons». Están en el área de uso privado
 * (U+E000–U+F8FF) pero fuera de los rangos de Nerd Fonts, por si tu fuente es
 * una de ellas. Los scripts de `terminal/` llevan los mismos (lo comprueba
 * test/prompt.test.js).
 */
const ICON_CODES = {
  controlPoints: 0xe1b0, // Windows: las cuatro ventanas como cuatro Puntos de Control
  house: 0xe1b1, // Windows: la Casa Inmemorial con ventanas
  command: 0xe1b2, // macOS: el ⌘ hecho de Puntos de Control unidos por la cinta
  apple: 0xe1b3, // macOS: la manzana octogonal
  tux: 0xe1b4, // Linux: Tux con la geometría del Bureau
  tuxMop: 0xe1b5, // Linux: Tux con la fregona de Ahti (Linux y Ahti son finlandeses)
  folder: 0xe1b6,
  branch: 0xe1b7, // la cinta de los Puntos de Control
  time: 0xe1b8,
  error: 0xe1b9,
  clear: 0xe1ba, // Polaris: Despejado
  anomaly: 0xe1bb, // Anomalía
  alert: 0xe1bc, // Alerta
  incursion: 0xe1bd, // Incursión del Siseo
  board: 0xe1be, // la pirámide invertida del Consejo
  classified: 0xe1bf, // el expediente clasificado
};

/** La fuente de los iconos del prompt (se instala solo para el usuario, como las tipografías). */
const PROMPT_FONT = { file: 'prompt/BureauPromptIcons.ttf', family: 'Bureau Prompt Icons', style: '' };

/**
 * @typedef {Object} PromptConfig
 * @property {PromptStyle} style
 * @property {boolean} classified los prompts anteriores se tachan (prompt transitorio)
 * @property {boolean} icons
 * @property {string} windowsIcon
 * @property {string} macosIcon
 * @property {string} linuxIcon
 * @property {boolean} newTerminals el perfil Bureau es el predeterminado de VS Code
 * @property {ShellChoice} shell
 * @property {boolean} frame cabecera y cierre de cada comando
 * @property {boolean} gitColors la salida de Git con los colores del Bureau
 */

/**
 * Normaliza los ajustes (pueden venir mal escritos a mano en settings.json).
 * @param {(key: string) => unknown} get lector de `bureauTheme.terminal.<key>`
 * @returns {PromptConfig}
 */
function normalizePromptConfig(get) {
  /** @template {string} T @param {unknown} v @param {readonly T[]} list @returns {T} */
  const oneOf = (v, list) => (list.includes(/** @type {T} */ (v)) ? /** @type {T} */ (v) : list[0]);
  return {
    style: oneOf(get('prompt'), STYLES),
    classified: get('classified') === true,
    icons: get('icons') !== false,
    windowsIcon: oneOf(get('windowsIcon'), OS_ICONS.windows),
    macosIcon: oneOf(get('macosIcon'), OS_ICONS.macos),
    linuxIcon: oneOf(get('linuxIcon'), OS_ICONS.linux),
    newTerminals: get('newTerminals') !== false,
    shell: oneOf(get('shell'), SHELLS),
    frame: get('commandFrame') !== false,
    gitColors: get('gitColors') !== false,
  };
}

/**
 * ¿Lleva la fuente de la terminal la de iconos del prompt? (Lo usan también las tipografías.)
 * @param {(key: string) => unknown} get lector de ajustes por su nombre completo
 */
function promptIconsWanted(get) {
  const style = get(`${TERMINAL}.prompt`);
  return STYLES.includes(/** @type {PromptStyle} */ (style)) && style !== 'off' && get(`${TERMINAL}.icons`) !== false;
}

/**
 * El tema activo para los colores del prompt (el acento cambia en Resonant y las líneas en Black).
 * @param {string | undefined} label
 * @returns {PromptTheme}
 */
function promptTheme(label) {
  switch (label) {
    case 'CONTROL Dark': return 'dark';
    case 'CONTROL Black': return 'black';
    case 'CONTROL Resonant': return 'resonant';
    case 'CONTROL Astral': return 'astral';
    default: return 'other';
  }
}

/**
 * Contenido de `prompt.conf`: una clave por línea, solo letras (los scripts lo leen sin evaluarlo).
 * @param {PromptConfig} cfg @param {PromptTheme} theme @param {string} language idioma de VS Code
 */
function confText(cfg, theme, language) {
  return [
    '# Bureau prompt (CONTROL theme for VS Code). Written by the extension: change it from VS Code.',
    `style=${cfg.style}`,
    `classified=${cfg.classified ? 1 : 0}`,
    `icons=${cfg.icons ? 1 : 0}`,
    `windows=${cfg.windowsIcon}`,
    `macos=${cfg.macosIcon}`,
    `linux=${cfg.linuxIcon}`,
    `frame=${cfg.frame ? 1 : 0}`,
    `theme=${theme}`,
    `lang=${language.toLowerCase().startsWith('es') ? 'es' : 'en'}`,
    '',
  ].join('\n');
}

/** Color ANSI del acento: el cian de la Hedron en Resonant, el rojo FBC en los demás. @param {PromptTheme} theme */
const accentCode = (theme) => (theme === 'resonant' ? '36' : '31');
/** Color de las líneas y del carácter del prompt: blanco astral en Black. @param {PromptTheme} theme */
const lineCode = (theme) => (theme === 'resonant' ? '36' : theme === 'black' ? '97' : '31');

/**
 * Los colores de Git del Bureau: rama y HEAD en el acento, ramas locales en
 * ámbar, remotas en cian, cambios en ámbar, sin seguimiento en gris y etiquetas
 * en magenta. Solo nombres ANSI: los pone la paleta del tema de la terminal.
 * @param {PromptTheme} theme
 */
function gitColors(theme) {
  const A = theme === 'resonant' ? 'cyan' : 'red';
  // En Resonant el acento ya es cian: las remotas, en azul.
  const R = theme === 'resonant' ? 'blue' : 'cyan';
  return {
    status: { branch: `${A} bold`, localBranch: `${A} bold`, nobranch: `${A} bold`, remoteBranch: R, changed: 'yellow', untracked: 'brightblack', unmerged: 'magenta bold' },
    branch: { current: `${A} bold`, local: 'yellow', remote: R, upstream: R },
    decorate: { HEAD: `${A} bold`, branch: 'yellow bold', remoteBranch: `${R} bold`, tag: 'magenta bold', stash: 'magenta' },
    diff: { commit: 'yellow bold' },
  };
}

/**
 * `bureau.gitconfig`: lo incluyen los shells con el prompt Bureau
 * (`GIT_CONFIG_KEY_n=include.path`, Git 2.31 o posterior). Solo slots de color,
 * nunca `color.ui`, y sin los que ya tengas en tu configuración de Git: los
 * tuyos mandan. Apagado (o sin prompt) queda solo el comentario.
 * @param {PromptConfig} cfg @param {PromptTheme} theme
 * @param {Iterable<string>} own claves de color de tu configuración (`color.status.changed`…)
 */
function gitColorsText(cfg, theme, own) {
  const lines = ['# Bureau colours for Git (CONTROL theme for VS Code), read by the shells with the Bureau prompt.', '# Written by the extension: the colours you set in your own Git configuration are left out.'];
  if (cfg.style !== 'off' && cfg.gitColors) {
    const mine = new Set([...own].map((k) => k.toLowerCase()));
    for (const [section, slots] of Object.entries(gitColors(theme))) {
      const keep = Object.entries(slots).filter(([slot]) => !mine.has(`color.${section}.${slot}`.toLowerCase()));
      if (!keep.length) continue;
      lines.push(`[color "${section}"]`, ...keep.map(([slot, value]) => `\t${slot} = ${value}`));
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Las variables con las que Git incluye `bureau.gitconfig`, detrás de las
 * GIT_CONFIG_* que ya haya (y nada si ya lo incluyen). Las mismas que ponen los
 * scripts al cargarse; esta es para cmd, que no carga ninguno.
 * @param {string} file @param {NodeJS.ProcessEnv} env
 * @returns {Record<string, string>}
 */
function gitConfigEnv(file, env) {
  const n = /^\d+$/.test(env.GIT_CONFIG_COUNT ?? '') ? Number(env.GIT_CONFIG_COUNT) : 0;
  for (let i = 0; i < n; i++) if (env[`GIT_CONFIG_VALUE_${i}`] === file) return {};
  return { GIT_CONFIG_COUNT: String(n + 1), [`GIT_CONFIG_KEY_${n}`]: 'include.path', [`GIT_CONFIG_VALUE_${n}`]: file };
}

/** @param {keyof typeof ICON_CODES} name */
const glyph = (name) => String.fromCodePoint(ICON_CODES[name]);

/**
 * El PROMPT de cmd para un estilo. cmd no ejecuta nada al mostrar el prompt:
 * enseña la ruta completa, colores y la hora, pero no la rama de Git ni si el
 * último comando falló. `$L` y `$G` en lugar de < y >, que serían redirecciones
 * al usar el comando `prompt`.
 * @param {PromptConfig} cfg @param {PromptTheme} theme
 * @returns {string} '' con el prompt apagado
 */
function cmdPrompt(cfg, theme) {
  const sgr = (/** @type {string} */ code) => `$E[${code}m`;
  const R = sgr('0');
  const A = accentCode(theme);
  const L = lineCode(theme);
  // Cada icono lleva detrás su espacio: el dibujo ocupa las dos celdas, centrado.
  const os = cfg.icons ? `${glyph(/** @type {keyof typeof ICON_CODES} */ (cfg.windowsIcon))} ` : 'FBC';
  const folder = cfg.icons ? `${glyph('folder')} ` : '';
  const dim = (/** @type {string} */ text) => (text ? `${sgr('90')}${text}${R}` : '');
  switch (cfg.style) {
    case 'signage':
      return `${sgr(`7;${A}`)} ${os} ${R} ${sgr('7')} ${folder}$P ${R} ${sgr(L)}›${R} `;
    case 'dossier':
      return `${sgr('90')}┌─[${sgr(A)}${os}${sgr('90')}]─[${R}${folder}$P${sgr('90')}]${R}$_${sgr('90')}└─${sgr(L)}■${R} `;
    case 'controlPoint':
      return `${sgr(L)}■${R} ${dim(folder.trim())}${folder ? ' ' : ''}$P ${sgr(L)}›${R} `;
    case 'board':
      return `${cfg.icons ? `${sgr(L)}${glyph('board')}${R} ` : ''}${sgr(L)}$L$L${R}$P${sgr(L)}$G$G${R} ${sgr(L)}›${R} `;
    case 'alertLevel':
      return `${dim(folder.trim())}${folder ? ' ' : ''}$P  ${sgr('90')}$T${R}$_${sgr(L)}›${R} `;
    default:
      return '';
  }
}

/**
 * El shell de un perfil de terminal de VS Code por su nombre («Command
 * Prompt», «Git Bash», «Windows PowerShell»…).
 * @param {unknown} name
 * @returns {Exclude<ShellChoice, 'auto'> | undefined}
 */
function shellFromProfileName(name) {
  const n = String(name ?? '').toLowerCase();
  if (!n) return undefined;
  if (/command prompt|símbolo del sistema|\bcmd\b/.test(n)) return 'cmd';
  if (/windows powershell/.test(n)) return 'powershell';
  if (/powershell|pwsh/.test(n)) return 'pwsh';
  if (/zsh/.test(n)) return 'zsh';
  if (/fish/.test(n)) return 'fish';
  if (/bash/.test(n)) return 'bash';
  return undefined;
}

/**
 * Carpeta de datos de la extensión: los scripts, `prompt.conf` y los mensajes
 * del Consejo. Es fija (no depende de la versión de la extensión), porque los
 * perfiles de los shells apuntan a ella.
 * @param {NodeJS.Platform} platform @param {NodeJS.ProcessEnv} env @param {string} home
 */
function dataDir(platform, env, home) {
  if (platform === 'win32') return path.win32.join(env.LOCALAPPDATA || path.win32.join(home, 'AppData', 'Local'), 'BureauTheme', 'terminal');
  if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'BureauTheme', 'terminal');
  return path.posix.join(env.XDG_DATA_HOME || path.posix.join(home, '.local', 'share'), 'bureau-theme', 'terminal');
}

const BLOCK_START = '# >>> Bureau prompt (CONTROL theme for VS Code) >>>';
const BLOCK_END = '# <<< Bureau prompt <<<';

/** @param {string} s */
const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
/** @param {string} s */
const psQuote = (s) => `'${s.replace(/'/g, "''")}'`;
/** ¿Es una ruta de Windows (C:\… o \\servidor\…)? @param {string} p */
const isWindowsPath = (p) => /^[A-Za-z]:[\\/]|^\\\\/.test(p);

/**
 * El código que carga el prompt en PowerShell (`-Command` del perfil Bureau de
 * VS Code y del de Windows Terminal). Si la directiva de ejecución no deja
 * ejecutar scripts (Windows PowerShell viene con «Restricted»), lo lee y lo
 * evalúa: es el script de la extensión, no uno descargado.
 * @param {string} dir carpeta de datos (`dataDir`)
 */
function powershellLoader(dir) {
  const ps1 = psQuote(isWindowsPath(dir) ? path.win32.join(dir, 'bureau-prompt.ps1') : `${dir}/bureau-prompt.ps1`);
  return `$env:BUREAU_PROMPT_DIR = ${psQuote(dir)}; try { . ${ps1} } catch { Invoke-Expression ([IO.File]::ReadAllText(${ps1})) }`;
}

/**
 * Las líneas que carga el prompt desde el perfil de un shell. Solo cargan el
 * script si existe: si borras la extensión, el shell no da error.
 * @param {'powershell' | 'bash' | 'zsh' | 'fish'} shell
 * @param {string} dir carpeta de datos (`dataDir`)
 */
function profileBlock(shell, dir) {
  // En Git Bash las rutas de Windows funcionan con barras normales.
  const file = (/** @type {string} */ name) => `${dir.replace(/\\/g, '/')}/${name}`;
  /** @type {string[]} */
  let body;
  if (shell === 'powershell') {
    const ps1 = isWindowsPath(dir) ? path.win32.join(dir, 'bureau-prompt.ps1') : file('bureau-prompt.ps1');
    body = [
      `$__bureauPrompt = ${psQuote(ps1)}`,
      'if (Test-Path -LiteralPath $__bureauPrompt) { . $__bureauPrompt }',
      'Remove-Variable __bureauPrompt -ErrorAction SilentlyContinue',
    ];
  } else if (shell === 'bash') {
    body = [`[ -r ${shQuote(file('bureau-prompt.bash'))} ] && . ${shQuote(file('bureau-prompt.bash'))}`];
  } else if (shell === 'zsh') {
    body = [`[[ -r ${shQuote(file('bureau-prompt.zsh'))} ]] && source ${shQuote(file('bureau-prompt.zsh'))}`];
  } else {
    body = [`if test -r ${shQuote(file('bureau-prompt.fish'))}`, `    source ${shQuote(file('bureau-prompt.fish'))}`, 'end'];
  }
  return [BLOCK_START, ...body, BLOCK_END].join('\n');
}

/**
 * El bloque de la configuración de mintty (Git Bash fuera de VS Code): toma de
 * Bureau Prompt Icons los caracteres que no tiene tu fuente (`FontSubst`).
 * mintty no los busca en otras fuentes por sí solo, y los iconos salían como
 * cuadros. Va en %APPDATA%\mintty\config, que mintty lee antes que tu
 * ~/.minttyrc: lo que pongas tú ahí manda.
 */
const minttyBlock = () => [BLOCK_START, `Font9=${PROMPT_FONT.family}`, 'FontSubst=9', BLOCK_END].join('\n');

/**
 * ¿Entiende este mintty `FontSubst`? Llegó en la 3.8.3: uno anterior avisaría
 * de una opción desconocida al abrirse.
 * @param {string} versionText la salida de `mintty --version` («mintty '3.8.3' …»)
 */
function minttyHasFontSubst(versionText) {
  const m = /mintty\D*(\d+)\.(\d+)\.(\d+)/.exec(versionText);
  return m !== null && Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]) >= 30803;
}

/**
 * Añade (o actualiza) el bloque del prompt al final de un perfil.
 * @param {string} text contenido actual ('' si no existe) @param {string} block `profileBlock`
 */
function addBlock(text, block) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const body = block.replace(/\n/g, eol);
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start !== -1 && end > start) return text.slice(0, start) + body + text.slice(end + BLOCK_END.length);
  if (!text) return body + eol;
  return `${text}${text.endsWith(eol) ? '' : eol}${eol}${body}${eol}`;
}

/**
 * Quita el bloque del prompt (y la línea en blanco que se añadió antes).
 * @param {string} text
 */
function removeBlock(text) {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end < start) return text;
  let from = start;
  let to = end + BLOCK_END.length;
  if (text.startsWith('\r\n', to)) to += 2;
  else if (text.startsWith('\n', to)) to += 1;
  const before = text.slice(0, from);
  if (before.endsWith('\r\n\r\n')) from -= 2;
  else if (before.endsWith('\n\n')) from -= 1;
  return text.slice(0, from) + text.slice(to);
}

/** ¿Lleva el perfil el bloque del prompt? @param {string} text */
const hasBlock = (text) => text.includes(BLOCK_START);

/** GUID fijos de los perfiles del fragmento de Windows Terminal. */
const WT_GUIDS = { powershell: '{8f2c5d63-7b1e-4c1a-9e55-b07d1a3c0f01}', cmd: '{8f2c5d63-7b1e-4c1a-9e55-b07d1a3c0f02}' };

/**
 * Perfiles de Windows Terminal que muestran el prompt Bureau aunque no estén
 * en tu settings.json todavía (cmd lee PROMPT, PowerShell su profile.ps1 y
 * Git Bash ~/.bashrc). Sus GUID son los mismos en todos los equipos.
 */
const WT_SHELL_GUIDS = [
  '{0caa0dad-35be-5f56-a8ff-afceeeaa6101}', // Símbolo del sistema
  '{61c54bbd-c2c6-5271-96e7-009a87ff44bf}', // Windows PowerShell
  '{574e775e-4f2a-5b96-ac1e-a2962a402336}', // PowerShell 7
  '{2ece5bfe-50ed-5f3a-ab87-5cd4baafed2b}', // Git Bash
];

/**
 * La fuente de iconos detrás de la tuya en los perfiles de Windows Terminal
 * que ya tienes, con `updates` y sin tocar tu settings.json: Windows Terminal
 * no busca los iconos del área de uso privado en otras fuentes, así que sin
 * ella el prompt sale con «�». La fuente es la de `profiles.defaults` (o
 * Cascadia Mono, la de Windows Terminal). Se salta los perfiles con fuente
 * propia: en ellos gana la tuya.
 * @param {any} settings tu settings.json de Windows Terminal (null si no hay)
 * @returns {Array<{updates: string, font: {face: string}}>}
 */
function windowsTerminalUpdates(settings) {
  const profiles = settings?.profiles;
  /** @type {any[]} */
  const list = Array.isArray(profiles) ? profiles : Array.isArray(profiles?.list) ? profiles.list : [];
  const defaults = Array.isArray(profiles) ? undefined : profiles?.defaults;
  const faceOf = (/** @type {any} */ p) => p?.font?.face ?? p?.fontFace;
  /** @type {string} */
  const base = typeof faceOf(defaults) === 'string' && faceOf(defaults).trim() ? faceOf(defaults).trim() : 'Cascadia Mono';
  const face = base.split(',').some((f) => f.trim() === PROMPT_FONT.family) ? base : `${base}, ${PROMPT_FONT.family}`;
  const skip = new Set([...Object.values(WT_GUIDS), ...list.filter((p) => faceOf(p)).map((p) => String(p.guid))].map((g) => g.toLowerCase()));
  /** @type {string[]} */
  const guids = [];
  for (const guid of [...WT_SHELL_GUIDS, ...list.map((p) => p?.guid)]) {
    if (typeof guid !== 'string' || skip.has(guid.toLowerCase())) continue;
    skip.add(guid.toLowerCase());
    guids.push(guid);
  }
  return guids.map((updates) => ({ updates, font: { face } }));
}

/**
 * Fragmento de Windows Terminal: los esquemas de color de los cuatro temas,
 * dos perfiles (PowerShell y cmd) con el prompt Bureau y la fuente de iconos
 * y, con los iconos encendidos, esa fuente también en tus perfiles
 * (`windowsTerminalUpdates`). No toca tu settings.json.
 * `theme` es el tema activo (si es CONTROL, los perfiles usan su esquema),
 * `powershell` el ejecutable (pwsh.exe o powershell.exe), `font` la fuente
 * monoespaciada principal, `cmdPrompt` el PROMPT con iconos del perfil de cmd
 * (tu variable PROMPT va sin ellos: la consola clásica no los dibuja) y
 * `settings` tu settings.json de Windows Terminal.
 * @param {{
 *   dir: string,
 *   palettes: Array<{label: string, bg: {sidebar: string}, fg: {main: string}, accent: {main: string, line: string}, ansi: Record<string, string>}>,
 *   theme: string | undefined,
 *   powershell: string,
 *   font: string,
 *   icons?: boolean,
 *   cmdPrompt?: string,
 *   settings?: any,
 * }} o
 * @returns {{$help: string, schemes: Array<Record<string, string>>, profiles: Array<Record<string, any>>}}
 */
function windowsTerminalFragment({ dir, palettes, theme, powershell, font, icons = false, cmdPrompt = '', settings = null }) {
  const scheme = palettes.find((p) => p.label === theme)?.label ?? palettes[0].label;
  const face = `${font}, ${PROMPT_FONT.family}`;
  const icon = path.win32.join(dir, 'icon.png');
  return {
    $help: 'https://aka.ms/terminal-documentation',
    schemes: palettes.map((p) => ({
      name: p.label,
      background: p.bg.sidebar,
      foreground: p.fg.main,
      cursorColor: p.accent.line,
      selectionBackground: p.accent.main,
      black: p.ansi.black,
      red: p.ansi.red,
      green: p.ansi.green,
      yellow: p.ansi.yellow,
      blue: p.ansi.blue,
      purple: p.ansi.magenta,
      cyan: p.ansi.cyan,
      white: p.ansi.white,
      brightBlack: p.ansi.brightBlack,
      brightRed: p.ansi.brightRed,
      brightGreen: p.ansi.brightGreen,
      brightYellow: p.ansi.brightYellow,
      brightBlue: p.ansi.brightBlue,
      brightPurple: p.ansi.brightMagenta,
      brightCyan: p.ansi.brightCyan,
      brightWhite: p.ansi.brightWhite,
    })),
    profiles: [
      {
        guid: WT_GUIDS.powershell,
        name: 'Bureau · PowerShell',
        commandline: `${powershell} -NoLogo -NoExit -Command "${powershellLoader(dir)}"`,
        colorScheme: scheme,
        font: { face },
        icon,
      },
      // El comando prompt toma el resto de la línea tal cual (sin < ni >: van como $L y $G).
      { guid: WT_GUIDS.cmd, name: 'Bureau · Command Prompt', commandline: cmdPrompt ? `cmd.exe /k prompt ${cmdPrompt}` : 'cmd.exe', colorScheme: scheme, font: { face }, icon },
      ...(icons ? windowsTerminalUpdates(settings) : []),
    ],
  };
}

/**
 * Añade o quita la fuente de iconos del prompt de una lista CSS de fuentes
 * (`terminal.integrated.fontFamily`). Va delante de la familia genérica.
 * @param {string} stack @param {boolean} on
 */
function withPromptIcons(stack, on) {
  const unquote = (/** @type {string} */ f) => f.replace(/^(['"])(.*)\1$/, '$2');
  const fonts = stack
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f && unquote(f) !== PROMPT_FONT.family);
  if (on) {
    const generic = fonts.length && /^(monospace|ui-monospace|sans-serif|serif)$/i.test(fonts[fonts.length - 1]) ? fonts.length - 1 : fonts.length;
    fonts.splice(generic, 0, `'${PROMPT_FONT.family}'`);
  }
  return fonts.join(', ');
}

module.exports = {
  TERMINAL,
  STYLES,
  TWO_LINE,
  OS_ICONS,
  SHELLS,
  ICON_CODES,
  PROMPT_FONT,
  normalizePromptConfig,
  promptIconsWanted,
  promptTheme,
  confText,
  gitColors,
  gitColorsText,
  gitConfigEnv,
  accentCode,
  lineCode,
  cmdPrompt,
  minttyBlock,
  minttyHasFontSubst,
  shellFromProfileName,
  dataDir,
  powershellLoader,
  BLOCK_START,
  BLOCK_END,
  profileBlock,
  addBlock,
  removeBlock,
  hasBlock,
  WT_GUIDS,
  WT_SHELL_GUIDS,
  windowsTerminalUpdates,
  windowsTerminalFragment,
  withPromptIcons,
};
