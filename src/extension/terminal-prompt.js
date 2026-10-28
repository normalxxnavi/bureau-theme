// @ts-check
'use strict';

/**
 * La terminal Bureau: el prompt de los cinco estilos (Señalética, Expediente,
 * Punto de Control, el Consejo y Nivel de alerta), el Modo Clasificado del
 * terminal y los iconos de sistema, en PowerShell, cmd, bash, zsh y fish, sin
 * Oh My Posh ni Nerd Fonts. Se carga si el prompt está encendido (o hay algo
 * que deshacer) y al usar sus comandos.
 *
 * Con el prompt encendido (`bureauTheme.terminal.prompt`):
 *   - los scripts y `prompt.conf` van a la carpeta de datos (prompt-installer.js);
 *     los shells leen `prompt.conf` antes de cada prompt, así que los cambios
 *     se ven en las terminales abiertas;
 *   - cmd recibe su PROMPT con la colección de variables de entorno;
 *   - Git usa los colores del Bureau en esos shells (`bureau.gitconfig`), sin
 *     los que tengas en tu configuración de Git;
 *   - se instala la fuente «Bureau Prompt Icons» para tu usuario y se añade
 *     detrás de la fuente de la terminal;
 *   - el perfil «Bureau» (lo aporta la extensión) pasa a ser el predeterminado
 *     de VS Code (`newTerminals`), guardando el anterior para devolverlo.
 * «También fuera de VS Code» lo añade a tus shells (prompt-installer.js).
 */

const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const P = require('./prompt-config');
const installer = require('./prompt-installer');
const { readActiveThemeLabel, THEME_SETTING_KEYS } = require('./theme-state');
const { LINES } = require('./board-lines');
const { TERMINAL_ACTIVE_KEY: ACTIVE_KEY, TERMINAL_FONT_INSTALLED_KEY: FONT_INSTALLED_KEY } = require('./config');

const Global = vscode.ConfigurationTarget.Global;
const PROFILE_ID = 'bureauTheme.terminal';
/** Título del perfil en package.json (no se traduce: `defaultProfile` lo guarda tal cual). */
const PROFILE_TITLE = 'Bureau';
/** El perfil predeterminado que había antes del Bureau: {value}. */
const DEFAULT_KEY = 'terminalDefaultProfile';
/** La fuente de iconos añadida a terminal.integrated.fontFamily: {hadValue}. */
const FONT_KEY = 'terminalIconFont';
const FONT_SETTING = 'terminal.integrated.fontFamily';

/** Clave de plataforma de los ajustes de terminal de VS Code. */
const platformKey = () => (process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux');

/** Tu sistema y el ajuste de su icono. */
function ownOs() {
  if (process.platform === 'win32') return /** @type {const} */ ({ os: 'windows', setting: 'windowsIcon' });
  if (process.platform === 'darwin') return /** @type {const} */ ({ os: 'macos', setting: 'macosIcon' });
  return /** @type {const} */ ({ os: 'linux', setting: 'linuxIcon' });
}

/** Los ajustes de la terminal Bureau, ya limpios. */
function readConfig() {
  const c = vscode.workspace.getConfiguration(P.TERMINAL);
  return P.normalizePromptConfig((key) => c.get(key));
}

/** @param {P.PromptStyle} style */
function styleName(style) {
  switch (style) {
    case 'signage': return vscode.l10n.t('Signage');
    case 'dossier': return vscode.l10n.t('Dossier');
    case 'controlPoint': return vscode.l10n.t('Control Point');
    case 'board': return vscode.l10n.t('The Board');
    case 'alertLevel': return vscode.l10n.t('Alert level');
    default: return vscode.l10n.t('Off');
  }
}

/** @param {string} icon */
function osIconName(icon) {
  switch (icon) {
    case 'controlPoints': return vscode.l10n.t('Four Control Points');
    case 'house': return vscode.l10n.t('The House with windows');
    case 'command': return vscode.l10n.t('⌘ of the tape');
    case 'apple': return vscode.l10n.t('Octagonal apple');
    case 'tux': return vscode.l10n.t('Bureau Tux');
    case 'tuxMop': return vscode.l10n.t('Tux with Ahti\'s mop');
    default: return icon;
  }
}

/** @param {P.ShellChoice} shell */
function shellName(shell) {
  switch (shell) {
    case 'pwsh': return 'PowerShell 7';
    case 'powershell': return 'Windows PowerShell';
    case 'cmd': return vscode.l10n.t('Command Prompt');
    case 'auto': return vscode.l10n.t('Automatic');
    default: return shell;
  }
}

/** Los mensajes del Consejo en el idioma de VS Code (el saludo del estilo El Consejo). */
function boardLines() {
  const lang = vscode.env.language.toLowerCase().startsWith('es') ? 1 : 0;
  return LINES.general.map((pair) => pair[lang]);
}

class TerminalPrompt {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {vscode.LogOutputChannel} log
   */
  constructor(context, log) {
    this.context = context;
    this.log = log;
    /** Evita que dos sincronizaciones (o instalar y quitar) se pisen. */
    this.queue = Promise.resolve();
    /** Hay una sincronización en la cola que aún no ha empezado: las que se pidan hasta entonces van en ella. */
    this.syncPending = false;
    /** @type {string[] | undefined} Tus colores de Git (se leen en cada sincronización). */
    this.ownGit = undefined;
    /** @type {string | undefined} Huella de la fuente de iconos de la extensión (no cambia en la sesión). */
    this.fontStamp = undefined;
  }

  init() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(P.TERMINAL) || THEME_SETTING_KEYS.some((k) => e.affectsConfiguration(k))) this.sync();
      }),
      vscode.window.onDidChangeActiveColorTheme(() => this.sync())
    );
    this.sync();
  }

  /**
   * Sincroniza los scripts, la fuente y lo de fuera de VS Code. Cambiar de
   * tema avisa dos veces (el ajuste y el tema activo) y elegir un estilo
   * también: las peticiones que llegan antes de que empiece la siguiente
   * sincronización se juntan en una.
   */
  sync() {
    if (this.syncPending) return this.queue;
    this.syncPending = true;
    return this.serial(() => {
      this.syncPending = false;
      return this.syncNow();
    });
  }

  /**
   * En la cola, detrás de lo que haya: dos escrituras de installed.json o de
   * prompt.conf nunca se mezclan.
   * @template T @param {() => Promise<T>} fn @returns {Promise<T | undefined>}
   */
  serial(fn) {
    const run = this.queue.then(fn);
    this.queue = run.then(
      () => undefined,
      (err) => this.log.error(`Terminal prompt: ${err.message}`)
    );
    return run.catch(() => undefined);
  }

  /** Lo que reciben los scripts y lo de fuera de VS Code, según los ajustes y el tema. */
  data() {
    const cfg = readConfig();
    const label = readActiveThemeLabel();
    const theme = P.promptTheme(label);
    // Sin leer aún tus colores de Git, bureau.gitconfig se queda como esté.
    const git = this.ownGit ? P.gitColorsText(cfg, theme, this.ownGit) : undefined;
    return { cfg, label, theme, conf: P.confText(cfg, theme, vscode.env.language), cmdPrompt: P.cmdPrompt(cfg, theme), git };
  }

  async syncNow() {
    const wanted = readConfig();
    // Con el prompt o los colores apagados, bureau.gitconfig se queda sin colores: no hace falta preguntar a Git.
    this.ownGit = wanted.style !== 'off' && wanted.gitColors ? await installer.ownGitColors() : [];
    const { cfg, conf, cmdPrompt, git } = this.data();
    const on = cfg.style !== 'off';
    const dir = installer.resolve().dir;
    // Apagado también se escribe (style=off): los shells abiertos y los de fuera de VS Code devuelven tu prompt y los colores de Git.
    if (on) installer.prepare(this.context.extensionPath, { conf, board: boardLines(), git });
    else if (fs.existsSync(dir)) {
      installer.writeConf(conf);
      if (git !== undefined) installer.writeGitColors(git);
    }

    const env = this.context.environmentVariableCollection;
    env.description = new vscode.MarkdownString(vscode.l10n.t('Bureau prompt for the Command Prompt (CONTROL theme).'));
    if (on && process.platform === 'win32') env.replace('PROMPT', cmdPrompt);
    else env.delete('PROMPT');

    await this.syncFont(on && cfg.icons);
    await this.syncDefaultProfile(on && cfg.newTerminals);
    if (installer.isInstalledOutside()) {
      try {
        await installer.refreshOutside({ cmdPrompt, fragment: this.fragment() });
      } catch (err) {
        this.log.warn(`Terminal prompt outside VS Code: ${/** @type {Error} */ (err).message}`);
      }
    }
    const active = on || this.context.globalState.get(DEFAULT_KEY) !== undefined || this.context.globalState.get(FONT_KEY) !== undefined;
    await this.context.globalState.update(ACTIVE_KEY, active || undefined);
  }

  /**
   * La fuente de iconos: se instala para tu usuario (otra vez solo si cambia,
   * aunque no cambie la versión) y se añade detrás de la fuente de la
   * terminal; al apagarla se quita de la lista.
   * @param {boolean} on
   */
  async syncFont(on) {
    const fonts = path.join(this.context.extensionPath, 'fonts');
    if (on) this.fontStamp ??= require('./font-installer').fingerprint(path.join(fonts, P.PROMPT_FONT.file));
    const stamp = on ? this.fontStamp : undefined;
    if (on && this.context.globalState.get(FONT_INSTALLED_KEY) !== stamp) {
      try {
        require('./font-installer').installFonts(fonts, [P.PROMPT_FONT]);
        await this.context.globalState.update(FONT_INSTALLED_KEY, stamp);
        this.log.info('Bureau Prompt Icons installed for the current user');
      } catch (err) {
        vscode.window.showErrorMessage(vscode.l10n.t('CONTROL Theme could not install the fonts: {0}', /** @type {Error} */ (err).message));
        return;
      }
    }
    const c = vscode.workspace.getConfiguration();
    const current = c.inspect(FONT_SETTING)?.globalValue;
    const own = typeof current === 'string' && current.trim() !== '';
    // Sin fuente propia de la terminal, VS Code usa la del editor: esa va delante.
    const editor = String(c.get('editor.fontFamily') ?? '').trim() || 'monospace';
    const added = /** @type {{hadValue: boolean, written: string} | undefined} */ (this.context.globalState.get(FONT_KEY));
    if (on) {
      const next = P.withPromptIcons(own ? /** @type {string} */ (current) : editor, true);
      if (next === current) return;
      if (!added) await this.context.globalState.update(FONT_KEY, { hadValue: own, written: next });
      await c.update(FONT_SETTING, next, Global);
      return;
    }
    if (!added) return;
    if (own && /** @type {string} */ (current).includes(P.PROMPT_FONT.family)) {
      // No tenías fuente propia y sigue la que escribió la extensión: otra vez sin valor (la del editor).
      await c.update(FONT_SETTING, !added.hadValue && current === added.written ? undefined : P.withPromptIcons(/** @type {string} */ (current), false), Global);
    }
    await this.context.globalState.update(FONT_KEY, undefined);
  }

  /**
   * El perfil Bureau como predeterminado de VS Code. Al apagarlo vuelve el que
   * tenías, salvo que lo hayas cambiado tú después.
   * @param {boolean} on
   */
  async syncDefaultProfile(on) {
    const key = `terminal.integrated.defaultProfile.${platformKey()}`;
    const c = vscode.workspace.getConfiguration();
    const current = c.inspect(key)?.globalValue;
    const backup = /** @type {{value: string | null} | undefined} */ (this.context.globalState.get(DEFAULT_KEY));
    if (on) {
      // Ya aplicado: si después elegiste otro perfil, se respeta.
      if (backup || current === PROFILE_TITLE) return;
      await this.context.globalState.update(DEFAULT_KEY, { value: typeof current === 'string' ? current : null });
      await c.update(key, PROFILE_TITLE, Global);
      return;
    }
    if (!backup) return;
    if (current === PROFILE_TITLE) await c.update(key, backup.value ?? undefined, Global);
    await this.context.globalState.update(DEFAULT_KEY, undefined);
  }

  /** El perfil predeterminado que tenías antes del Bureau (para elegir el shell en «Automático»). */
  previousDefault() {
    const backup = /** @type {{value: string | null} | undefined} */ (this.context.globalState.get(DEFAULT_KEY));
    if (backup) return backup.value;
    const current = vscode.workspace.getConfiguration().get(`terminal.integrated.defaultProfile.${platformKey()}`);
    return current === PROFILE_TITLE ? null : /** @type {string | null} */ (current ?? null);
  }

  /** El fragmento de Windows Terminal (solo en Windows). */
  fragment() {
    if (process.platform !== 'win32') return null;
    const { cfg, label } = this.data();
    const r = installer.resolve();
    const pwsh = r.find('pwsh');
    const font = vscode.workspace.getConfiguration().get('bureauTheme.font');
    return P.windowsTerminalFragment({
      dir: r.dir,
      palettes: [require('../theme/palettes/dark'), require('../theme/palettes/black'), require('../theme/palettes/resonant'), require('../theme/palettes/astral')],
      theme: label,
      powershell: pwsh ? 'pwsh.exe' : 'powershell.exe',
      font: font === 'bureau' ? 'Overpass Mono' : font === 'resonant' ? 'Space Mono' : 'Cascadia Mono',
      // Tus perfiles (Símbolo del sistema, Windows PowerShell…) también llevan la fuente de iconos.
      icons: cfg.style !== 'off' && cfg.icons,
      settings: installer.windowsTerminalSettings(),
    });
  }

  /**
   * El shell del perfil Bureau: el elegido, o en «Automático» el de tu perfil
   * predeterminado anterior (o el del sistema). Si no está instalado, el del sistema.
   * @returns {{kind: Exclude<P.ShellChoice, 'auto'>, path: string}}
   */
  resolveShell() {
    const r = installer.resolve();
    const cfg = readConfig();
    /** @param {string} kind @returns {string | null} */
    const locate = (kind) => {
      if (r.platform === 'win32') {
        if (kind === 'powershell') return installer.windowsPowerShell(r.env);
        if (kind === 'cmd') return r.env.ComSpec || path.win32.join(r.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
        if (kind === 'bash') return installer.gitBash(r);
      } else if (kind === 'powershell' || kind === 'cmd') return null;
      return r.find(kind);
    };
    const fallback = () => {
      if (r.platform === 'win32') return r.find('pwsh') ? 'pwsh' : 'powershell';
      const login = path.basename(r.env.SHELL || '');
      return ['bash', 'zsh', 'fish', 'pwsh'].includes(login) ? login : r.platform === 'darwin' ? 'zsh' : 'bash';
    };
    const wanted = cfg.shell !== 'auto' ? cfg.shell : (P.shellFromProfileName(this.previousDefault()) ?? fallback());
    for (const kind of [wanted, fallback(), r.platform === 'win32' ? 'powershell' : 'bash']) {
      const found = locate(kind);
      if (found) return { kind: /** @type {Exclude<P.ShellChoice, 'auto'>} */ (kind), path: found };
    }
    return { kind: r.platform === 'win32' ? 'powershell' : 'bash', path: r.platform === 'win32' ? installer.windowsPowerShell(r.env) : '/bin/bash' };
  }

  /**
   * El script de integración de shell de VS Code para cargarlo a mano (el perfil
   * Bureau arranca el shell con sus propios argumentos y VS Code no lo inyecta).
   * @param {string} kind
   */
  shellIntegration(kind) {
    if (vscode.workspace.getConfiguration().get('terminal.integrated.shellIntegration.enabled') === false) return undefined;
    const file = { pwsh: 'shellIntegration.ps1', powershell: 'shellIntegration.ps1', bash: 'shellIntegration-bash.sh', zsh: 'shellIntegration-rc.zsh', fish: 'shellIntegration.fish' }[kind];
    if (!file) return undefined;
    // En common/scripts en los VS Code recientes; en browser/media en los antiguos (1.93…) y en los editores basados en ellos.
    const terminal = path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'contrib', 'terminal');
    return [path.join(terminal, 'common', 'scripts', file), path.join(terminal, 'browser', 'media', file)].find((f) => fs.existsSync(f));
  }

  /** Opciones de la terminal del perfil Bureau. @returns {vscode.TerminalOptions} */
  terminalOptions() {
    const { cfg, conf, cmdPrompt, git } = this.data();
    const dir = installer.prepare(this.context.extensionPath, { conf, board: boardLines(), git });
    const shell = this.resolveShell();
    const lines = boardLines();
    /** @type {Record<string, string>} */
    const env = { BUREAU_PROMPT_DIR: dir };
    if (cfg.style === 'board') env.BUREAU_BOARD_LINE = lines[Math.floor(Math.random() * lines.length)];
    const si = this.shellIntegration(shell.kind);
    if (si) env.BUREAU_VSCODE_SI = si;
    const slash = (/** @type {string} */ p) => p.replace(/\\/g, '/');
    /** @type {string[]} */
    let shellArgs = [];
    switch (shell.kind) {
      case 'pwsh':
      case 'powershell':
        shellArgs = ['-NoLogo', '-NoExit', '-Command', P.powershellLoader(dir)];
        break;
      case 'cmd':
        // cmd no carga ningún script: el PROMPT y los colores de Git se los da el perfil.
        if (cmdPrompt) env.PROMPT = cmdPrompt;
        Object.assign(env, P.gitConfigEnv(path.join(dir, installer.GIT_COLORS_FILE), process.env));
        break;
      case 'bash':
        shellArgs = ['--init-file', slash(path.join(dir, 'bureau-init.bash'))];
        if (process.platform === 'darwin') env.BUREAU_LOGIN = '1';
        break;
      case 'zsh':
        // Con -i (y no sin argumentos) VS Code no inyecta su integración: la carga el prompt.
        shellArgs = process.platform === 'darwin' ? ['-o', 'login', '-i'] : ['-i'];
        env.ZDOTDIR = path.join(dir, 'zsh');
        env.BUREAU_ZDOTDIR = env.ZDOTDIR;
        env.BUREAU_USER_ZDOTDIR = process.env.ZDOTDIR || os.homedir();
        break;
      case 'fish':
        shellArgs = ['--init-command', `source '${path.join(dir, 'bureau-prompt.fish').replace(/'/g, "\\'")}'`];
        if (process.platform === 'darwin') shellArgs.unshift('--login');
        break;
    }
    return { shellPath: shell.path, shellArgs, env, iconPath: new vscode.ThemeIcon('bureau-terminal') };
  }

  /** Para el perfil «Bureau» del desplegable de terminales. */
  profile() {
    return new vscode.TerminalProfile(this.terminalOptions());
  }

  /** «CONTROL: Abrir una terminal Bureau». */
  async openTerminal() {
    if (readConfig().style === 'off' && !(await this.chooseStyle())) return;
    await this.queue;
    vscode.window.createTerminal(this.terminalOptions()).show();
  }

  /**
   * Elige el estilo del prompt. Devuelve false si se cancela.
   * @returns {Promise<boolean>}
   */
  async chooseStyle() {
    const current = readConfig().style;
    /** @type {Array<vscode.QuickPickItem & {style: P.PromptStyle}>} */
    const items = [
      { style: 'signage', label: styleName('signage'), description: vscode.l10n.t('like agnoster or paradox'), detail: vscode.l10n.t('Solid blocks, like the signs of the Oldest House: system, folder, Git branch, time and error.') },
      { style: 'dossier', label: styleName('dossier'), description: vscode.l10n.t('like atomic or kali'), detail: vscode.l10n.t('Two lines framed like a Bureau case file, ending in the Control Point.') },
      { style: 'controlPoint', label: styleName('controlPoint'), description: vscode.l10n.t('like pure or robbyrussell'), detail: vscode.l10n.t('Minimal: the Control Point, the folder and the branch. The Point empties when a command fails.') },
      { style: 'board', label: styleName('board'), description: vscode.l10n.t('like neko'), detail: vscode.l10n.t('<<IN THE VOICE OF THE BOARD.>> (WITH ITS ECHOES.) And a Board message when the terminal opens.') },
      { style: 'alertLevel', label: styleName('alertLevel'), description: vscode.l10n.t('like powerlevel10k'), detail: vscode.l10n.t('The Bureau alert level on the right: Clear, Anomaly, Alert and Hiss Incursion.') },
      { style: 'off', label: styleName('off'), detail: vscode.l10n.t('Your shell\'s own prompt.') },
    ];
    for (const item of items) item.label = `${item.style === current ? '$(check)' : '$(blank)'} ${item.label}`;
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('CONTROL: Choose the Terminal Prompt'), placeHolder: vscode.l10n.t('For PowerShell, cmd, bash, zsh and fish, without Oh My Posh') });
    if (!choice) return false;
    const wasOff = current === 'off';
    await vscode.workspace.getConfiguration(P.TERMINAL).update('prompt', choice.style, Global);
    await this.queue;
    if (wasOff && choice.style !== 'off') {
      const open = vscode.l10n.t('Open a Bureau terminal');
      vscode.window
        .showInformationMessage(
          vscode.l10n.t('Bureau prompt on: {0}. New terminals open with it. If you see boxes instead of icons, restart VS Code: new fonts are loaded when it starts.', styleName(choice.style)),
          open
        )
        .then((pick) => {
          if (pick === open) this.openTerminal();
        });
    }
    return true;
  }

  /** Solo los iconos de tu sistema (los de los demás siguen en los ajustes, para WSL o SSH). */
  async chooseOsIcons() {
    const cfg = readConfig();
    const { os, setting } = ownOs();
    const items = P.OS_ICONS[os].map((value, i) => ({
      label: `${cfg[setting] === value ? '$(check)' : '$(blank)'} ${osIconName(value)}`,
      description: i === 0 ? vscode.l10n.t('recommended') : undefined,
      value,
    }));
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('System icon'), placeHolder: vscode.l10n.t('Esc goes back') });
    if (choice) await vscode.workspace.getConfiguration(P.TERMINAL).update(setting, choice.value, Global);
  }

  async chooseShell() {
    const r = installer.resolve();
    const current = readConfig().shell;
    const auto = this.resolveShell();
    /** @type {P.ShellChoice[]} */
    const shells = r.platform === 'win32' ? ['auto', 'pwsh', 'powershell', 'cmd', 'bash'] : ['auto', 'zsh', 'bash', 'fish', 'pwsh'];
    const items = shells.map((shell) => {
      const found = shell === 'auto' || (shell === 'bash' && r.platform === 'win32' ? installer.gitBash(r) : shell === 'powershell' || shell === 'cmd' || r.find(shell));
      return {
        label: `${shell === current ? '$(check)' : '$(blank)'} ${shellName(shell)}`,
        description: shell === 'auto' ? shellName(auto.kind) : found ? undefined : vscode.l10n.t('not installed'),
        shell,
      };
    });
    const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('Shell of the Bureau terminal'), placeHolder: vscode.l10n.t('Automatic uses the shell of your previous default terminal') });
    if (choice) await vscode.workspace.getConfiguration(P.TERMINAL).update('shell', choice.shell, Global);
  }

  /** «También fuera de VS Code»: lo instala (con confirmación) o lo quita. */
  async toggleOutside() {
    if (installer.isInstalledOutside()) await this.removeOutside();
    else await this.installOutside();
  }

  async installOutside() {
    const install = vscode.l10n.t('Install');
    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t('Use the Bureau prompt outside VS Code too?'),
      {
        modal: true,
        detail: vscode.l10n.t(
          'Three lines are added to the end of the profiles of your installed shells (profile.ps1, .bashrc, .zshrc) and a file to fish conf.d. On Windows, also the PROMPT variable of your user for cmd, two Windows Terminal profiles with the colour schemes and the icon font behind the font of your Windows Terminal profiles. They only load the prompt if it exists, and you can remove everything from the Bureau terminal menu.'
        ),
      },
      install
    );
    if (choice !== install) return;
    // En la cola: una sincronización a medias no puede pisar installed.json.
    await this.serial(async () => {
      const { conf, cmdPrompt, git } = this.data();
      try {
        installer.prepare(this.context.extensionPath, { conf, board: boardLines(), git });
        const changed = await installer.installOutside({ cmdPrompt, fragment: this.fragment() });
        this.log.info(`Terminal prompt installed outside VS Code: ${changed.join(', ')}`);
        vscode.window.showInformationMessage(vscode.l10n.t('<<THE PROTOCOL EXTENDS BEYOND THE HOUSE.>> Open a new terminal to see the Bureau prompt. Changed: {0}.', changed.map((f) => path.basename(f)).join(', ') || '—'));
      } catch (err) {
        vscode.window.showErrorMessage(vscode.l10n.t('The Bureau prompt could not be installed outside VS Code: {0}', /** @type {Error} */ (err).message));
      }
    });
  }

  async removeOutside() {
    await this.serial(async () => {
      try {
        const changed = installer.removeOutside();
        this.log.info(`Terminal prompt removed from outside VS Code: ${changed.join(', ')}`);
        vscode.window.showInformationMessage(vscode.l10n.t('The Bureau prompt has been removed from your shells outside VS Code.'));
      } catch (err) {
        vscode.window.showErrorMessage(vscode.l10n.t('The Bureau prompt could not be removed: {0}', /** @type {Error} */ (err).message));
      }
    });
  }

  /** Resumen para la Casa Inmemorial. */
  summary() {
    const cfg = readConfig();
    if (cfg.style === 'off') return vscode.l10n.t('Disabled');
    return [styleName(cfg.style), cfg.classified ? vscode.l10n.t('Classified') : '', installer.isInstalledOutside() ? vscode.l10n.t('also outside VS Code') : ''].filter(Boolean).join(' · ');
  }

  /** El menú de la terminal Bureau (desde la Casa Inmemorial o «CONTROL: Configurar la terminal Bureau…»). */
  async openMenu() {
    for (;;) {
      const cfg = readConfig();
      const on = (/** @type {boolean} */ v) => (v ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled'));
      // Una línea por opción, con su estado al lado: lo que hace cada una lo explican sus submenús y los ajustes.
      /** @type {Array<vscode.QuickPickItem & {action?: string}>} */
      const items = [
        { label: `$(bureau-terminal) ${vscode.l10n.t('Prompt style')}`, description: styleName(cfg.style), action: 'style' },
        { label: `$(device-desktop) ${vscode.l10n.t('System icon')}`, description: osIconName(cfg[ownOs().setting]), action: 'osIcons' },
        { label: `$(symbol-misc) ${vscode.l10n.t('Icons')}`, description: on(cfg.icons), action: 'icons' },
        { label: `$(bureau-classified) ${vscode.l10n.t('Classified mode')}`, description: on(cfg.classified), action: 'classified' },
        { label: `$(list-flat) ${vscode.l10n.t('Command header and footer')}`, description: on(cfg.frame), action: 'commandFrame' },
        { label: `$(git-branch) ${vscode.l10n.t('Git colours')}`, description: on(cfg.gitColors), action: 'gitColors' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: `$(server-process) ${vscode.l10n.t('Shell')}`, description: cfg.shell === 'auto' ? `${shellName('auto')} · ${shellName(this.resolveShell().kind)}` : shellName(cfg.shell), action: 'shell' },
        { label: `$(terminal) ${vscode.l10n.t('Use in new terminals')}`, description: on(cfg.newTerminals), action: 'newTerminals' },
        { label: `$(globe) ${vscode.l10n.t('Also outside VS Code')}`, description: installer.isInstalledOutside() ? vscode.l10n.t('Installed') : vscode.l10n.t('Not installed'), action: 'outside' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: `$(add) ${vscode.l10n.t('Open a Bureau terminal')}`, action: 'open' },
      ];
      const choice = await vscode.window.showQuickPick(items, { title: vscode.l10n.t('CONTROL — Bureau Terminal'), placeHolder: vscode.l10n.t('Esc goes back') });
      if (!choice?.action) return;
      const c = vscode.workspace.getConfiguration(P.TERMINAL);
      switch (choice.action) {
        case 'style':
          await this.chooseStyle();
          break;
        case 'classified':
        case 'icons':
        case 'newTerminals':
          await c.update(choice.action, !cfg[/** @type {'classified' | 'icons' | 'newTerminals'} */ (choice.action)], Global);
          await this.queue;
          break;
        case 'commandFrame':
          await c.update('commandFrame', !cfg.frame, Global);
          await this.queue;
          break;
        case 'gitColors':
          await c.update('gitColors', !cfg.gitColors, Global);
          await this.queue;
          break;
        case 'osIcons':
          await this.chooseOsIcons();
          break;
        case 'shell':
          await this.chooseShell();
          break;
        case 'outside':
          await this.toggleOutside();
          break;
        case 'open':
          await this.openTerminal();
          return;
      }
    }
  }
}

module.exports = { TerminalPrompt, PROFILE_ID, PROFILE_TITLE, styleName };
