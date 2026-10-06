// @ts-check
'use strict';

/**
 * Lee qué tema de color está activo (lo usan el módulo de sonido y el
 * indicador de la barra de estado).
 */

const vscode = require('vscode');
const rules = require('./rules');

/** Ajustes que pueden cambiar el tema activo. */
const THEME_SETTING_KEYS = [
  'workbench.colorTheme',
  'workbench.preferredDarkColorTheme',
  'workbench.preferredLightColorTheme',
  'workbench.preferredHighContrastColorTheme',
  'workbench.preferredHighContrastLightColorTheme',
  'window.autoDetectColorScheme',
];

/** Nombre del tema activo, teniendo en cuenta la detección automática del modo del sistema. */
function readActiveThemeLabel() {
  const c = vscode.workspace.getConfiguration();
  return rules.activeThemeLabel(
    {
      autoDetect: c.get('window.autoDetectColorScheme') === true,
      colorTheme: c.get('workbench.colorTheme'),
      preferredDark: c.get('workbench.preferredDarkColorTheme'),
      preferredLight: c.get('workbench.preferredLightColorTheme'),
      preferredHighContrast: c.get('workbench.preferredHighContrastColorTheme'),
      preferredHighContrastLight: c.get('workbench.preferredHighContrastLightColorTheme'),
    },
    vscode.window.activeColorTheme.kind
  );
}

module.exports = { readActiveThemeLabel, THEME_SETTING_KEYS };
