// @ts-check
'use strict';

/**
 * Punto de entrada de la extensión.
 *
 * Los temas de color y de iconos no necesitan código: VS Code los lee de
 * package.json. Este archivo añade el módulo de sonidos opcional (desactivado
 * por defecto), su consola en la barra de estado y las tipografías opcionales.
 *
 * Arranque mínimo: `activate` solo registra comandos y listeners y vuelve
 * enseguida. El motor de sonido (`./controller`) se carga cuando los sonidos
 * están activados o se usa un comando de sonido, la consola (`./sound-menu`)
 * cuando se abre, las tipografías (`./fonts`) solo si hay algo que hacer y el
 * canal de log la primera vez que se escribe en él.
 * En el paquete son archivos separados (scripts/bundle.js).
 */

const vscode = require('vscode');
const { SECTION, FONT_SETTING, FONT_APPLIED_KEY, FONT_OFFER_KEY } = require('./config');
const { SoundStatus } = require('./sound-status');

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
 * está aplicada (o no hay ninguna) y la oferta de la primera vez ya se hizo.
 * @param {vscode.ExtensionContext} context
 */
function typographyPending(context) {
  const mode = vscode.workspace.getConfiguration().get(FONT_SETTING);
  const applied = context.globalState.get(FONT_APPLIED_KEY);
  if (!context.globalState.get(FONT_OFFER_KEY) || mode === 'auto') return true;
  if (mode === 'bureau' || mode === 'resonant') return applied !== mode;
  return applied !== undefined; // «none» con una tipografía aplicada: hay que restaurar la anterior
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = lazyLog(context);
  const status = new SoundStatus(context);

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

  context.subscriptions.push(
    vscode.commands.registerCommand('bureauTheme.toggleSounds', () => sounds().toggle()),
    vscode.commands.registerCommand('bureauTheme.previewSounds', () => sounds().preview()),
    vscode.commands.registerCommand('bureauTheme.openSoundSettings', () => sounds().openSettings()),
    vscode.commands.registerCommand('bureauTheme.soundMenu', () => require('./sound-menu').openSoundMenu(sounds(), status)),
    vscode.commands.registerCommand('bureauTheme.toggleSoundStatusBar', () => status.setVisible(!status.visible())),
    vscode.commands.registerCommand('bureauTheme.chooseFont', () => typography().choose()),
    vscode.commands.registerCommand('bureauTheme.removeFonts', () => typography().removeFonts())
  );

  // Con los sonidos desactivados (lo normal) solo se vigila el interruptor.
  const enabled = () => vscode.workspace.getConfiguration(SECTION).get('enabled') === true;
  if (enabled()) sounds();
  else {
    const watch = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`${SECTION}.enabled`) && enabled()) {
        watch.dispose();
        sounds();
      }
    });
    context.subscriptions.push(watch);
  }

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
    /** Texto del icono de sonido de la barra de estado (undefined si está oculto). */
    get soundStatusText() {
      return status.item?.text;
    },
  };
}

function deactivate() {}

module.exports = { activate, deactivate };
