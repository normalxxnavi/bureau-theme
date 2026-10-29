// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade los extras opcionales, todos apagados por
 * defecto: la Casa Inmemorial (icono de la barra de estado), sonidos, la gramola, tipografías,
 * la guía de bienvenida y sus comandos, los protocolos de la Agencia (Modo
 * Clasificado, nivel de alerta y comentarios del Consejo) y la terminal Bureau
 * (el prompt de PowerShell, cmd, bash, zsh y fish).
 *
 * Se activa al empezar el arranque de VS Code (`*`) y no con onStartupFinished:
 * ese evento espera a que terminen las demás extensiones de inicio (C# Dev Kit,
 * Git…), y con un host de extensiones ocupado el icono de la Casa Inmemorial
 * tardaba hasta 40 s en salir.
 *
 * Arranque mínimo: `activate` solo registra comandos y listeners y vuelve
 * enseguida. Cada módulo se carga cuando hace falta: el motor de sonido
 * (`./controller`) cuando los sonidos están activados o se usa un comando de
 * sonido, el panel (`./panel`) y la consola de sonido (`./sound-menu`) cuando se abren, las tipografías
 * (`./fonts`) solo si hay algo que hacer, cada protocolo solo si está
 * activado, la terminal Bureau (`./terminal-prompt`) con el prompt encendido o
 * al abrir su perfil, los comandos de la guía (`./setup`) y el Consejo
 * (`./board`) al usarlos, y el canal de log la primera vez que se escribe en él.
 * En el paquete son archivos separados (scripts/bundle.js).
 */

const vscode = require('vscode');
const { SECTION, FONT_SETTING, FONT_APPLIED_KEY, FONT_FALLBACK_KEY, PROTOCOL_SWITCHES, MUSIC, HUD, TERMINAL_PROMPT, TERMINAL_ACTIVE_KEY } = require('./config');
const { ControlStatus } = require('./status');

/**
 * Canal de log que se crea la primera vez que se escribe en él (en un arranque
 * normal, con los sonidos desactivados, no se escribe nada).
 * @param {vscode.ExtensionContext} context
 * @returns {vscode.LogOutputChannel}
 */
function lazyLog(context) {
  /** @type {vscode.LogOutputChannel | undefined} */
  let channel;
  const get = () => {
    if (!channel) {
      channel = vscode.window.createOutputChannel('CONTROL Theme', { log: true });
      context.subscriptions.push(channel);
    }
    return channel;
  };
  return /** @type {any} */ ({
    trace: (/** @type {string} */ m) => get().trace(m),
    debug: (/** @type {string} */ m) => get().debug(m),
    info: (/** @type {string} */ m) => get().info(m),
    warn: (/** @type {string} */ m) => get().warn(m),
    error: (/** @type {string | Error} */ m) => get().error(m),
    show: () => get().show(),
  });
}

/**
 * ¿Hay que cargar las tipografías al arrancar? No, si la tipografía elegida ya
 * está aplicada (o no hay ninguna). Una aplicada antes de la 0.8 se vuelve a
 * escribir una vez, con la fuente anterior detrás.
 * @param {vscode.ExtensionContext} context
 */
function typographyPending(context) {
  const mode = vscode.workspace.getConfiguration().get(FONT_SETTING);
  const applied = context.globalState.get(FONT_APPLIED_KEY);
  if (mode === 'auto') return true;
  if (mode === 'bureau' || mode === 'resonant') return applied !== mode || !context.globalState.get(FONT_FALLBACK_KEY);
  return applied !== undefined; // «none» con una tipografía aplicada: hay que restaurar la anterior
}

/**
 * Llama a `load` en el siguiente turno. Lo que ya está activado al arrancar se
 * carga así fuera de `activate`: la activación dura unos milisegundos y el
 * icono de la Casa Inmemorial sale antes que el trabajo de los módulos (con
 * los sonidos, la gramola y los protocolos activados, activar costaba más de
 * 100 ms). `load` crea el módulo una sola vez, así que da igual si un comando
 * ya lo ha creado antes.
 * @param {vscode.ExtensionContext} context @param {() => unknown} load
 */
function soon(context, load) {
  const timer = setTimeout(load, 0);
  context.subscriptions.push({ dispose: () => clearTimeout(timer) });
}

/**
 * Llama a `load` si el ajuste está activado (en el siguiente turno) o, si no,
 * la primera vez que se active. Hasta entonces solo hay un listener de cambios
 * de ajustes.
 * @param {vscode.ExtensionContext} context @param {string} key @param {() => unknown} load
 */
function whenEnabled(context, key, load) {
  const enabled = () => vscode.workspace.getConfiguration().get(key) === true;
  if (enabled()) {
    soon(context, load);
    return;
  }
  const watch = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(key) && enabled()) {
      watch.dispose();
      load();
    }
  });
  context.subscriptions.push(watch);
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = lazyLog(context);
  // Lo primero, el icono: VS Code lo pinta en el siguiente turno del host de
  // extensiones, y así va antes que el trabajo de los demás módulos.
  const status = new ControlStatus(context);
  status.init();

  /** @type {InstanceType<typeof import('./fonts').FontController> | undefined} */
  let fonts;
  /** Las tipografías, cargadas la primera vez que hacen falta. */
  const typography = () => {
    if (!fonts) {
      const { FontController } = require('./fonts');
      fonts = new FontController(context, log);
      fonts.init();
    }
    return fonts;
  };

  /** @type {InstanceType<typeof import('./controller').SoundController> | undefined} */
  let controller;
  /** El motor de sonido, creado la primera vez que hace falta. */
  const sounds = () => {
    if (!controller) {
      const { SoundController } = require('./controller');
      controller = new SoundController(context, log);
      controller.init();
    }
    return controller;
  };

  // Protocolos de la Agencia: cada uno se crea la primera vez que se activa y
  // después se enciende y se apaga solo con su ajuste.
  /** @type {InstanceType<typeof import('./classified').ClassifiedMode> | undefined} */
  let classified;
  const classifiedMode = () => {
    if (!classified) {
      const { ClassifiedMode } = require('./classified');
      classified = new ClassifiedMode(context);
      classified.init();
    }
    return classified;
  };
  /** @type {InstanceType<typeof import('./alert-level').AlertLevelStatus> | undefined} */
  let alert;
  const alertLevel = () => {
    if (!alert) {
      const { AlertLevelStatus } = require('./alert-level');
      alert = new AlertLevelStatus(context);
      alert.init();
    }
    return alert;
  };
  /** @type {InstanceType<typeof import('./board').BoardComments> | undefined} */
  let board;
  const boardComments = () => {
    if (!board) {
      const { BoardComments } = require('./board');
      board = new BoardComments(context);
      board.init();
    }
    return board;
  };

  /** @type {InstanceType<typeof import('./board').BoardRandom> | undefined} */
  let random;
  const boardRandom = () => {
    if (!random) {
      const { BoardRandom } = require('./board');
      random = new BoardRandom(context);
      random.init();
    }
    return random;
  };
  /** @type {InstanceType<typeof import('./music').Jukebox> | undefined} */
  let jukeboxInstance;
  /** La gramola: se crea al activarla o al usar uno de sus comandos (apagada no lee nada). */
  const jukebox = () => {
    if (!jukeboxInstance) {
      const { Jukebox } = require('./music');
      jukeboxInstance = new Jukebox(context);
      jukeboxInstance.init();
    }
    return jukeboxInstance;
  };

  /** @type {InstanceType<typeof import('./hud').BureauHud> | undefined} */
  let hudInstance;
  /** El HUD del Bureau: se crea al activarlo (apagado no escucha al cursor). */
  const hud = () => {
    if (!hudInstance) {
      const { BureauHud } = require('./hud');
      hudInstance = new BureauHud(context);
      hudInstance.init();
    }
    return hudInstance;
  };

  /** @type {InstanceType<typeof import('./terminal-prompt').TerminalPrompt> | undefined} */
  let terminalInstance;
  /** La terminal Bureau: se crea si el prompt está encendido, al abrir una terminal Bureau o al usar sus comandos. */
  const terminalPrompt = () => {
    if (!terminalInstance) {
      const { TerminalPrompt } = require('./terminal-prompt');
      terminalInstance = new TerminalPrompt(context, log);
      terminalInstance.init();
    }
    return terminalInstance;
  };

  /** Desclasifica el archivo activo (o explica cómo activar el Modo Clasificado). */
  const declassify = async () => {
    if (vscode.workspace.getConfiguration().get(PROTOCOL_SWITCHES.classified) === true) {
      classifiedMode().toggleActive();
      return;
    }
    const turnOn = vscode.l10n.t('Turn on');
    const choice = await vscode.window.showInformationMessage(vscode.l10n.t('Classified mode is off.'), turnOn);
    if (choice === turnOn) await require('./setup').toggleProtocol('classified');
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('bureauTheme.toggleSounds', () => sounds().toggle()),
    vscode.commands.registerCommand('bureauTheme.previewSounds', () => sounds().preview()),
    vscode.commands.registerCommand('bureauTheme.openSoundSettings', () => sounds().openSettings()),
    vscode.commands.registerCommand('bureauTheme.openOldestHouse', () => require('./panel').openControlPanel({ context, sounds, typography, status, music: jukebox, terminal: terminalPrompt })),
    vscode.commands.registerCommand('bureauTheme.soundMenu', () => require('./sound-menu').openSoundMenu(sounds())),
    vscode.commands.registerCommand('bureauTheme.toggleStatusBarItem', () => status.setVisible(!status.visible())),
    vscode.commands.registerCommand('bureauTheme.chooseFont', () => typography().choose()),
    vscode.commands.registerCommand('bureauTheme.removeFonts', () => typography().removeFonts()),
    vscode.commands.registerCommand('bureauTheme.openWelcome', () => require('./setup').openWelcome(context)),
    vscode.commands.registerCommand('bureauTheme.chooseTheme', () => require('./setup').chooseTheme(context)),
    vscode.commands.registerCommand('bureauTheme.applyFullSet', () => require('./setup').applyFullSet(context)),
    vscode.commands.registerCommand('bureauTheme.followSystem', () => require('./setup').followSystem(context)),
    vscode.commands.registerCommand('bureauTheme.toggleClassified', () => require('./setup').toggleProtocol('classified')),
    vscode.commands.registerCommand('bureauTheme.declassify', declassify),
    vscode.commands.registerCommand('bureauTheme.toggleAlertLevel', () => require('./setup').toggleProtocol('alertLevel')),
    vscode.commands.registerCommand('bureauTheme.boardMessage', () => require('./board').showBoardMessage()),
    vscode.commands.registerCommand('bureauTheme.toggleBoardComments', () => require('./setup').toggleProtocol('board')),
    vscode.commands.registerCommand('bureauTheme.toggleBoardRandom', () => require('./setup').toggleProtocol('boardRandom')),
    vscode.commands.registerCommand('bureauTheme.boardSettings', () => require('./board').openBoardMenu()),
    vscode.commands.registerCommand('bureauTheme.musicMenu', () => require('./music').openMusicMenu(jukebox())),
    vscode.commands.registerCommand('bureauTheme.musicPlayPause', () => jukebox().command('playPause')),
    vscode.commands.registerCommand('bureauTheme.musicNext', () => jukebox().command('next')),
    vscode.commands.registerCommand('bureauTheme.musicPrevious', () => jukebox().command('previous')),
    vscode.commands.registerCommand('bureauTheme.toggleMusic', () => require('./setup').toggleMusic()),
    vscode.commands.registerCommand('bureauTheme.toggleHud', () => {
      const c = vscode.workspace.getConfiguration();
      return c.update(HUD, c.get(HUD) !== true, vscode.ConfigurationTarget.Global);
    }),
    vscode.commands.registerCommand('bureauTheme.terminalMenu', () => terminalPrompt().openMenu()),
    vscode.commands.registerCommand('bureauTheme.chooseTerminalPrompt', () => terminalPrompt().chooseStyle()),
    vscode.commands.registerCommand('bureauTheme.newBureauTerminal', () => terminalPrompt().openTerminal()),
    vscode.commands.registerCommand('bureauTheme.installTerminalPrompt', () => terminalPrompt().installOutside()),
    vscode.commands.registerCommand('bureauTheme.uninstallTerminalPrompt', () => terminalPrompt().removeOutside()),
    // El perfil «Bureau» del desplegable de terminales (y el predeterminado, con el prompt encendido).
    vscode.window.registerTerminalProfileProvider('bureauTheme.terminal', { provideTerminalProfile: () => terminalPrompt().profile() }),
    vscode.commands.registerCommand('bureauTheme.openSoundtrack', (/** @type {unknown} */ id) => {
      // En la app de Spotify si es lo que suena; si no, en la web.
      const inApp = /spotify/i.test(jukeboxInstance?.track?.app ?? '');
      return typeof id === 'string' ? require('./music').openSoundtrack(id, inApp) : require('./music').chooseSoundtrack(inApp);
    })
  );

  // Con los sonidos desactivados (lo normal) solo se vigila el interruptor.
  whenEnabled(context, `${SECTION}.enabled`, sounds);
  whenEnabled(context, PROTOCOL_SWITCHES.classified, classifiedMode);
  whenEnabled(context, PROTOCOL_SWITCHES.alertLevel, alertLevel);
  whenEnabled(context, PROTOCOL_SWITCHES.board, boardComments);
  whenEnabled(context, PROTOCOL_SWITCHES.boardRandom, boardRandom);
  whenEnabled(context, `${MUSIC}.enabled`, jukebox);
  whenEnabled(context, HUD, hud);

  // La terminal Bureau: con el prompt encendido, o con algo que deshacer si lo
  // apagaste con VS Code cerrado (perfil predeterminado, fuente de iconos, PROMPT de cmd).
  const promptOn = () => {
    const style = vscode.workspace.getConfiguration().get(TERMINAL_PROMPT);
    return typeof style === 'string' && style !== 'off';
  };
  if (promptOn() || context.globalState.get(TERMINAL_ACTIVE_KEY)) soon(context, terminalPrompt);
  else {
    const watchPrompt = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(TERMINAL_PROMPT) && promptOn()) {
        watchPrompt.dispose();
        terminalPrompt();
      }
    });
    context.subscriptions.push(watchPrompt);
  }

  // Igual con la tipografía: si no hay nada pendiente, solo se vigila su ajuste.
  if (typographyPending(context)) soon(context, typography);
  else {
    const watchFont = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(FONT_SETTING)) {
        watchFont.dispose();
        typography();
      }
    });
    context.subscriptions.push(watchFont);
  }

  // API interna para el test de integración (test/integration). No es pública.
  return {
    get soundHistory() {
      return controller?.history ?? [];
    },
    get soundsStarted() {
      return controller?.started ?? false;
    },
    /** Espera a que termine la sincronización de tipografías en curso. */
    fontsIdle() {
      return fonts?.queue ?? Promise.resolve();
    },
    /** Texto del icono CONTROL de la barra de estado (undefined si está oculto). */
    get statusText() {
      return status.item?.text;
    },
    /** Texto del nivel de alerta (undefined si está oculto). */
    get alertLevelText() {
      return alert?.item?.text;
    },
    /** Barras del Modo Clasificado pintadas en un documento. @param {string} uri */
    classifiedBars(uri) {
      return classified?.applied.get(uri) ?? 0;
    },
    /** Comentarios del Consejo en la barra de estado. */
    get boardComments() {
      return board?.history ?? [];
    },
    /** ¿Está la gramola leyendo la música? */
    get musicStarted() {
      return jukeboxInstance?.started ?? false;
    },
    /** ¿Están activos los mensajes al azar del Consejo? */
    get boardRandomStarted() {
      return random?.started ?? false;
    },
    /** Mensajes al azar ya mostrados. */
    get boardRandomHistory() {
      return random?.history ?? [];
    },
    /** Enseña un mensaje al azar ya, sin esperar. */
    boardRandomShowNow() {
      random?.showNow();
    },
    /** Espera a que la terminal Bureau termine de sincronizarse (undefined si no se ha cargado). */
    terminalIdle() {
      return terminalInstance?.queue;
    },
    /** Opciones con las que el perfil Bureau abriría una terminal. */
    bureauTerminalOptions() {
      return terminalPrompt().terminalOptions();
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
