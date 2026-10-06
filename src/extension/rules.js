// @ts-check
'use strict';

/**
 * Reglas puras del módulo de sonido: deciden QUÉ suena y CUÁNDO.
 * No dependen de `vscode`, así que se prueban con `node --test`.
 */

/** @typedef {import('./catalog').SoundEvent} SoundEvent */
/** @typedef {import('./catalog').Pack} Pack */

/**
 * Filtro de cooldown con prioridades. Deja pasar un sonido si ha pasado el
 * cooldown desde el anterior o si es más importante que el anterior.
 * @param {() => number} [now]
 */
function createGate(now = Date.now) {
  let lastAt = -Infinity;
  let lastPriority = 0;
  return {
    /** @param {number} priority @param {number} cooldownMs */
    tryPass(priority, cooldownMs) {
      const t = now();
      if (t - lastAt >= cooldownMs || priority > lastPriority) {
        lastAt = t;
        lastPriority = priority;
        return true;
      }
      return false;
    },
  };
}

/**
 * Compara el número de errores con el de la comprobación anterior.
 * @param {number | undefined} previous `undefined` = todavía no hay referencia
 * @param {number} current
 * @returns {'newError' | 'allClear' | null}
 */
function classifyErrorChange(previous, current) {
  if (previous === undefined) return null;
  if (current > previous) return 'newError';
  if (previous > 0 && current === 0) return 'allClear';
  return null;
}

/**
 * Sigue el número de errores y decide cuándo hay «errores nuevos» o «todo
 * resuelto» por culpa de TUS cambios.
 *
 * - Mientras no editas, la referencia sigue a los diagnósticos en silencio:
 *   abrir un archivo que ya tenía errores, que el servidor de C# termine de
 *   cargar o cerrar un archivo no hace ruido.
 * - En cuanto editas, la referencia se congela hasta la siguiente comprobación
 *   (al guardar, o tras la pausa en modo `live`), y entonces se compara.
 *
 * @param {number} initialCount
 */
function createErrorTracker(initialCount) {
  let baseline = initialCount;
  let dirty = false;
  return {
    get baseline() {
      return baseline;
    },
    get dirty() {
      return dirty;
    },
    /** El usuario ha cambiado el contenido de un documento. */
    edited() {
      dirty = true;
    },
    /**
     * Los diagnósticos han dejado de cambiar.
     * @param {number} count @param {'onSave' | 'live'} mode
     * @returns {'newError' | 'allClear' | null}
     */
    settled(count, mode) {
      if (dirty && mode === 'live') return this.check(count);
      if (!dirty) baseline = count;
      return null;
    },
    /**
     * Comprobación explícita (después de guardar o en modo `live`).
     * @param {number} count
     */
    check(count) {
      const change = classifyErrorChange(baseline, count);
      baseline = count;
      dirty = false;
      return change;
    },
  };
}

/**
 * Sonido para el final de una tarea (build, test…).
 * @param {number | undefined} exitCode
 * @returns {'buildSuccess' | 'buildFail' | null}
 */
function taskExitSound(exitCode) {
  if (exitCode === undefined || exitCode === null) return null;
  return exitCode === 0 ? 'buildSuccess' : 'buildFail';
}

/**
 * Códigos que significan «el usuario lo interrumpió» (Ctrl+C), no un fallo:
 * 130 en shells POSIX y STATUS_CONTROL_C_EXIT (0xC000013A) en Windows.
 */
const INTERRUPT_CODES = new Set([130, 0xc000013a, -1073741510]);

/**
 * Sonido para el final de un comando de terminal.
 * @param {number | undefined} exitCode
 * @returns {'terminalFail' | null}
 */
function terminalExitSound(exitCode) {
  if (exitCode === undefined || exitCode === null || exitCode === 0) return null;
  return INTERRUPT_CODES.has(exitCode) ? null : 'terminalFail';
}

/**
 * ¿El depurador se ha detenido en un breakpoint (y no por un paso o una pausa)?
 * `reason` viene del evento `stopped` del Debug Adapter Protocol.
 * @param {unknown} reason
 */
function isBreakpointStop(reason) {
  return typeof reason === 'string' && /breakpoint|debugger/i.test(reason);
}

/**
 * Pack que corresponde al ajuste y al tema activo.
 * @param {'auto' | Pack} setting
 * @param {Pack | null} activeThemePack pack del tema CONTROL activo, o null si no es nuestro
 * @returns {Pack}
 */
function resolvePack(setting, activeThemePack) {
  if (setting === 'control' || setting === 'resonant') return setting;
  return activeThemePack ?? 'control';
}

/**
 * Nombre del tema activo. Con `window.autoDetectColorScheme`, VS Code usa el
 * tema preferido según el modo del sistema en lugar de `workbench.colorTheme`.
 * @param {{autoDetect: boolean, colorTheme?: string, preferredDark?: string, preferredLight?: string, preferredHighContrast?: string, preferredHighContrastLight?: string}} s
 * @param {number} kind ColorThemeKind: 1 claro, 2 oscuro, 3 alto contraste, 4 alto contraste claro
 */
function activeThemeLabel(s, kind) {
  if (kind === 3) return s.preferredHighContrast ?? s.colorTheme;
  if (kind === 4) return s.preferredHighContrastLight ?? s.colorTheme;
  if (!s.autoDetect) return s.colorTheme;
  return kind === 1 ? s.preferredLight : s.preferredDark;
}

/**
 * Pack asociado a cada tema que aporta la extensión, leído de su package.json.
 * @param {Array<{label: string, path: string}>} themes
 * @returns {Map<string, Pack>}
 */
function themePacks(themes) {
  return new Map(themes.map((t) => [t.label, /resonant/i.test(t.path) ? 'resonant' : 'control']));
}

/**
 * ¿Debe sonar este evento con la configuración actual?
 * @param {import('./config').SoundConfig} config
 * @param {SoundEvent} event
 * @param {boolean} controlThemeActive
 */
function shouldPlay(config, event, controlThemeActive) {
  if (!config.enabled || !config.events[event] || config.volume <= 0) return false;
  return !config.onlyWithControlTheme || controlThemeActive;
}

module.exports = {
  createGate,
  classifyErrorChange,
  createErrorTracker,
  taskExitSound,
  terminalExitSound,
  isBreakpointStop,
  resolvePack,
  activeThemeLabel,
  themePacks,
  shouldPlay,
};
