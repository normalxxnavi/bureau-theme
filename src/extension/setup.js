// @ts-check
'use strict';

/**
 * Comandos de puesta en marcha (los usa la guía de bienvenida): elegir un tema
 * CONTROL, aplicar el set completo (tema + iconos de archivo + iconos de
 * producto, con «Deshacer»), seguir el modo claro u oscuro del sistema y
 * activar o desactivar los protocolos de la Agencia. Se carga la primera vez
 * que se usa uno de ellos.
 */

const vscode = require('vscode');
const { readActiveThemeLabel } = require('./theme-state');
const { PROTOCOL_SWITCHES, MUSIC } = require('./config');

const Global = vscode.ConfigurationTarget.Global;
const FILE_ICONS = 'bureau-icons';
const PRODUCT_ICONS = 'bureau-product-icons';
const PRODUCT_ICONS_COLOR = 'bureau-product-icons-color';
const WALKTHROUGH = 'welcome';

/**
 * Temas CONTROL de package.json.
 * @param {vscode.ExtensionContext} context
 * @returns {Array<{label: string, light: boolean}>}
 */
function controlThemes(context) {
  return context.extension.packageJSON.contributes.themes.map((/** @type {any} */ t) => ({ label: t.label, light: t.uiTheme === 'vs' }));
}

/** @param {string} label */
function themeLore(label) {
  switch (label) {
    case 'CONTROL Dark': return vscode.l10n.t('The Oldest House: warm concrete, bone-white text and FBC red.');
    case 'CONTROL Black': return vscode.l10n.t('Black Rock: true black for OLED screens, astral-white signage.');
    case 'CONTROL Resonant': return vscode.l10n.t('Patterned Manhattan: wet asphalt, steel blue and resonance cyan.');
    case 'CONTROL Astral': return vscode.l10n.t('The Astral Plane: a white void framed by black geometry (light theme).');
    default: return '';
  }
}

/**
 * Elige un tema CONTROL (el activo aparece marcado).
 * @param {vscode.ExtensionContext} context
 * @param {{title: string, placeHolder: string, filter?: (t: {label: string, light: boolean}) => boolean}} options
 */
async function pickTheme(context, { title, placeHolder, filter = () => true }) {
  const current = readActiveThemeLabel();
  const items = controlThemes(context)
    .filter(filter)
    .map((t) => ({ label: t.label, description: t.label === current ? vscode.l10n.t('current') : undefined, detail: themeLore(t.label), theme: t }));
  const choice = await vscode.window.showQuickPick(items, { title, placeHolder });
  return choice?.theme;
}

/**
 * Aplica un tema. Con la detección del modo del sistema activada,
 * `workbench.colorTheme` no se usa: se cambia el tema preferido de ese modo.
 * @param {{label: string, light: boolean}} theme
 */
async function applyTheme(theme) {
  const c = vscode.workspace.getConfiguration();
  if (c.get('window.autoDetectColorScheme') === true) {
    await c.update(theme.light ? 'workbench.preferredLightColorTheme' : 'workbench.preferredDarkColorTheme', theme.label, Global);
  }
  await c.update('workbench.colorTheme', theme.label, Global);
}

/** @param {vscode.ExtensionContext} context */
async function chooseTheme(context) {
  const theme = await pickTheme(context, { title: vscode.l10n.t('CONTROL: Choose a Theme'), placeHolder: vscode.l10n.t('Every sector of the House has its own light') });
  if (theme) await applyTheme(theme);
}

/** @param {vscode.ExtensionContext} context */
async function applyFullSet(context) {
  const theme = await pickTheme(context, { title: vscode.l10n.t('CONTROL: Apply the Full Set (1/2)'), placeHolder: vscode.l10n.t('Choose the colour theme') });
  if (!theme) return;
  const icons = await vscode.window.showQuickPick(
    [
      {
        label: 'Bureau Product Icons (Color)',
        description: vscode.l10n.t('recommended'),
        detail: vscode.l10n.t('Each Object of Power with its own colour: the red Hotline, the yellow rubber duck, Polaris…'),
        id: PRODUCT_ICONS_COLOR,
      },
      { label: 'Bureau Product Icons', detail: vscode.l10n.t('In the colour of the theme, like the icons of VS Code.'), id: PRODUCT_ICONS },
    ],
    { title: vscode.l10n.t('CONTROL: Apply the Full Set (2/2)'), placeHolder: vscode.l10n.t('Choose the icons of VS Code itself') }
  );
  if (!icons) return;

  const c = vscode.workspace.getConfiguration();
  const keys = ['workbench.colorTheme', 'workbench.preferredDarkColorTheme', 'workbench.preferredLightColorTheme', 'workbench.iconTheme', 'workbench.productIconTheme'];
  const before = Object.fromEntries(keys.map((k) => [k, c.inspect(k)?.globalValue]));
  await applyTheme(theme);
  await c.update('workbench.iconTheme', FILE_ICONS, Global);
  await c.update('workbench.productIconTheme', icons.id, Global);

  const undo = vscode.l10n.t('Undo');
  const choice = await vscode.window.showInformationMessage(
    vscode.l10n.t('<<THE FULL KIT HAS BEEN ISSUED.>> {0}, Bureau Icons and {1}.', theme.label, icons.label),
    undo
  );
  if (choice === undo) for (const k of keys) await c.update(k, before[k], Global);
}

/** @param {vscode.ExtensionContext} context */
async function followSystem(context) {
  const c = vscode.workspace.getConfiguration();
  const themes = controlThemes(context);
  const light = themes.find((t) => t.light)?.label ?? 'CONTROL Astral';
  const following = c.get('window.autoDetectColorScheme') === true;
  /** @type {Array<vscode.QuickPickItem & {dark?: string, off?: boolean}>} */
  const items = themes
    .filter((t) => !t.light)
    .map((t) => ({
      label: t.label,
      description: themeLore(t.label),
      detail: vscode.l10n.t('Dark mode: {0} · Light mode: {1}', t.label, light),
      dark: t.label,
    }));
  if (following) {
    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
    items.push({ label: `$(close) ${vscode.l10n.t('Stop following the system')}`, detail: vscode.l10n.t('Keep a single theme all day.'), off: true });
  }
  const choice = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('CONTROL: Follow the System Light/Dark Mode'),
    placeHolder: vscode.l10n.t('Choose the theme for dark mode; CONTROL Astral is used in light mode'),
  });
  if (!choice) return;
  if (choice.off) {
    await c.update('window.autoDetectColorScheme', false, Global);
    vscode.window.showInformationMessage(vscode.l10n.t('VS Code no longer follows the system light/dark mode.'));
    return;
  }
  await c.update('workbench.preferredDarkColorTheme', choice.dark, Global);
  await c.update('workbench.preferredLightColorTheme', light, Global);
  await c.update('window.autoDetectColorScheme', true, Global);
  vscode.window.showInformationMessage(
    vscode.l10n.t('<<THE THRESHOLD IS SET.>> {0} when your system is light, {1} when it is dark.', light, String(choice.dark))
  );
}

/** @param {vscode.ExtensionContext} context */
async function openWelcome(context) {
  await vscode.commands.executeCommand('workbench.action.openWalkthrough', `${context.extension.id}#${WALKTHROUGH}`, false);
}

/** ¿Está activado un protocolo? @param {keyof typeof PROTOCOL_SWITCHES} protocol */
const protocolOn = (protocol) => vscode.workspace.getConfiguration().get(PROTOCOL_SWITCHES[protocol]) === true;

/**
 * Activa o desactiva un protocolo sin avisar (la Casa Inmemorial ya enseña su
 * estado). Devuelve false si los ajustes del área de trabajo lo impiden.
 * @param {keyof typeof PROTOCOL_SWITCHES} protocol @param {boolean} on
 */
async function setProtocol(protocol, on) {
  const key = PROTOCOL_SWITCHES[protocol];
  const c = vscode.workspace.getConfiguration();
  await c.update(key, on, Global);
  const inspect = c.inspect(key);
  if (inspect?.workspaceValue !== undefined || inspect?.workspaceFolderValue !== undefined) {
    vscode.window.showWarningMessage(vscode.l10n.t('The workspace settings override "{0}", so this change only applies outside this workspace.', key));
    return false;
  }
  return true;
}

/**
 * Activa o desactiva un protocolo de la Agencia y lo cuenta.
 * @param {keyof typeof PROTOCOL_SWITCHES} protocol
 */
async function toggleProtocol(protocol) {
  const next = !protocolOn(protocol);
  if (!(await setProtocol(protocol, next))) return;
  /** @type {Record<typeof protocol, [string, string]>} */
  const messages = {
    classified: [
      vscode.l10n.t('Classified mode on: secret values in .env files, keys and settings files are covered. Put the cursor on a line to reveal it.'),
      vscode.l10n.t('Classified mode off.'),
    ],
    alertLevel: [vscode.l10n.t('The Bureau alert level is now in the status bar.'), vscode.l10n.t('Bureau alert level hidden.')],
    board: [
      vscode.l10n.t('The Board will comment on your commits, tasks and debugging sessions in the status bar.'),
      vscode.l10n.t('The Board will stay silent.'),
    ],
    boardRandom: [
      vscode.l10n.t('The Board will speak at random moments of the day. Configure it with "CONTROL: Configure the Board…".'),
      vscode.l10n.t('The Board will only speak when you ask.'),
    ],
  };
  vscode.window.showInformationMessage(messages[protocol][next ? 0 : 1]);
}

/** Enciende o apaga la gramola Songmaster. */
async function toggleMusic() {
  const c = vscode.workspace.getConfiguration(MUSIC);
  const next = c.get('enabled') !== true;
  await c.update('enabled', next, Global);
  vscode.window.showInformationMessage(
    next
      ? vscode.l10n.t('Songmaster jukebox on: what is playing appears in the status bar. Nothing leaves your computer.')
      : vscode.l10n.t('Songmaster jukebox off.')
  );
}

module.exports = { toggleMusic, chooseTheme, applyFullSet, followSystem, openWelcome, toggleProtocol, setProtocol, protocolOn, applyTheme, controlThemes };
