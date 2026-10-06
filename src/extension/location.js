// @ts-check
'use strict';

/**
 * Indicador de lore en la barra de estado: «▼ THE OLDEST HOUSE».
 *
 * Muestra el lugar del juego que inspira el tema activo, con la pirámide
 * invertida del Consejo como icono. Solo aparece con un tema CONTROL y se
 * oculta con `bureauTheme.statusBar.showLocation: false`. Al hacer clic abre el
 * selector de temas.
 */

const vscode = require('vscode');
const { readActiveThemeLabel, THEME_SETTING_KEYS } = require('./theme-state');

const SETTING = 'bureauTheme.statusBar.showLocation';

/**
 * Lugar de cada tema. Debe coincidir con `location` de src/theme/palettes
 * (lo comprueba test/manifest.test.js).
 * @type {Record<string, {location: string, tooltip: () => string}>}
 */
const LOCATIONS = {
  'CONTROL Dark': {
    location: 'THE OLDEST HOUSE',
    tooltip: () => vscode.l10n.t('**The Oldest House**: the brutalist headquarters of the Federal Bureau of Control. Theme: CONTROL Dark.'),
  },
  'CONTROL Black': {
    location: 'BLACK ROCK',
    tooltip: () => vscode.l10n.t('**Black Rock**: the darkest stone of the Oldest House. Theme: CONTROL Black, made for OLED screens.'),
  },
  'CONTROL Resonant': {
    location: 'PATTERNED MANHATTAN',
    tooltip: () => vscode.l10n.t('**Manhattan**, reshaped by the Patterning. Theme: CONTROL Resonant.'),
  },
  'CONTROL Astral': {
    location: 'ASTRAL PLANE',
    tooltip: () => vscode.l10n.t('**The Astral Plane**: a white void where black geometry floats. Theme: CONTROL Astral.'),
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLocationIndicator(context) {
  const item = vscode.window.createStatusBarItem('bureauTheme.location', vscode.StatusBarAlignment.Left, 1000);
  item.name = 'CONTROL — Location';
  item.color = new vscode.ThemeColor('bureauTheme.statusBar.location');
  item.command = 'workbench.action.selectTheme';

  let visible = false;
  const update = () => {
    const label = readActiveThemeLabel();
    const place = label ? LOCATIONS[label] : undefined;
    const enabled = vscode.workspace.getConfiguration().get(SETTING) !== false;
    if (!place || !enabled) {
      visible = false;
      item.hide();
      return;
    }
    item.text = `$(triangle-down) ${place.location}`;
    const md = new vscode.MarkdownString(`${place.tooltip()}\n\n${vscode.l10n.t('Click to change the color theme.')}`);
    item.tooltip = md;
    item.accessibilityInformation = { label: place.location };
    visible = true;
    item.show();
  };

  context.subscriptions.push(
    item,
    vscode.window.onDidChangeActiveColorTheme(update),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(SETTING) || THEME_SETTING_KEYS.some((k) => e.affectsConfiguration(k))) update();
    })
  );
  update();
  return {
    /** Texto visible o null si está oculto (lo usa el test de integración). */
    get text() {
      return visible ? item.text : null;
    },
  };
}

module.exports = { registerLocationIndicator, LOCATIONS, SETTING };
