// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade los extras opcionales, todos apagados por
 * defecto: la Casa Inmemorial (icono de la barra de estado), sonidos, la gramola, tipografías,
 * la guía de bienvenida y sus comandos, y los protocolos de la Agencia (Modo
 * Clasificado, nivel de alerta y comentarios del Consejo).
 *
 * Arranque mínimo: `activate` solo registra comandos y listeners y vuelve
 * enseguida. Cada módulo se carga cuando hace falta: el motor de sonido
 * (`./controller`) cuando los sonidos están activados o se usa un comando de
 * sonido, el panel (`./panel`) y la consola de sonido (`./sound-menu`) cuando se abren, las tipografías
 * (`./fonts`) solo si hay algo que hacer, cada protocolo solo si está
 * activado, los comandos de la guía (`./setup`) y el Consejo (`./board`) al
 * usarlos, y el canal de log la primera vez que se escribe en él.
 * En el paquete son archivos separados (scripts/bundle.js).
 */

const vscode = require('vscode');
const { SECTION, FONT_SETTING, FONT_APPLIED_KEY, PROTOCOL_SWITCHES, MUSIC } = require('./config');
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
 * está aplicada (o no hay ninguna).
 * @param {vscode.ExtensionContext} context
 */
function typographyPending(context) {
  const mode = vscode.workspace.getConfiguration().get(FONT_SETTING);
  const applied = context.globalState.get(FONT_APPLIED_KEY);
  if (mode === 'auto') return true;
  if (mode === 'bureau' || mode === 'resonant') return applied !== mode;
  return applied !== undefined; // «none» con una tipografía aplicada: hay que restaurar la anterior
}

/**
 * Llama a `load` ahora si el ajuste está activado o, si no, la primera vez que
 * se active. Hasta entonces solo hay un listener de cambios de ajustes.
 * @param {vscode.ExtensionContext} context @param {string} key @param {() => unknown} load
 */
function whenEnabled(context, key, load) {
  const enabled = () => vscode.workspace.getConfiguration().get(key) === true;
  if (enabled()) {
    load();
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
  const status = new ControlStatus(context);

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
    vscode.commands.registerCommand('bureauTheme.openOldestHouse', () => require('./panel').openControlPanel({ context, sounds, typography, status, music: jukebox })),
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

  // Igual con la tipografía: si no hay nada pendiente, solo se vigila su ajuste.
  if (typographyPending(context)) typography();
  else {
    const watchFont = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(FONT_SETTING)) {
        watchFont.dispose();
        typography();
      }
    });
    context.subscriptions.push(watchFont);
  }

  status.init();

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
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
