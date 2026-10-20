// @ts-check
'use strict';

/**
 * La Casa Inmemorial: todo el tema en un menú (QuickPick) sin abrir
 * settings.json — tema de color, set completo, iconos, modo claro/oscuro del
 * sistema, tipografía, sonidos (la consola de sonido), la gramola y las
 * bandas sonoras, y los protocolos de la Agencia (el Consejo con su propio
 * menú). Se abre con el icono del edificio en la barra de estado o con
 * «CONTROL: Abrir la Casa Inmemorial…», y se carga la primera vez.
 *
 * Cada opción vuelve a la Casa al terminar; Esc la cierra. Las que abren otra
 * cosa (la guía, los ajustes, un álbum, un mensaje del Consejo) la cierran.
 */

const vscode = require('vscode');
const { SECTION, FONT_SETTING, MUSIC } = require('./config');
const { readActiveThemeLabel } = require('./theme-state');
// En el paquete son archivos aparte (scripts/bundle.js): no se duplican.
const setup = require('./setup');

const Global = vscode.ConfigurationTarget.Global;

/** Temas de iconos que ofrece la Casa: [id, nombre]. */
const FILE_ICONS = [
  ['bureau-icons', 'Bureau Icons'],
  ['vs-seti', 'Seti (VS Code)'],
];
const PRODUCT_ICONS = [
  ['bureau-product-icons-color', 'Bureau Product Icons (Color)'],
  ['bureau-product-icons', 'Bureau Product Icons'],
  ['Default', 'VS Code'],
];

/** @param {unknown} id @param {string[][]} list */
const iconThemeName = (id, list) => list.find(([i]) => i === id)?.[1] ?? (typeof id === 'string' && id ? id : vscode.l10n.t('none'));

/** @param {unknown} mode */
function typographyName(mode) {
  if (mode === 'bureau') return 'Bureau';
  if (mode === 'resonant') return 'Resonant';
  if (mode === 'auto') return vscode.l10n.t('Follow the theme');
  return vscode.l10n.t('Your own font');
}

/** @param {unknown} pack */
const packName = (pack) => (pack === 'control' ? 'Control' : pack === 'resonant' ? 'Resonant' : vscode.l10n.t('Follow the theme'));

/**
 * Elige un tema de iconos (el actual aparece marcado).
 * @param {string} setting @param {string[][]} list @param {string} title
 */
async function pickIconTheme(setting, list, title) {
  const c = vscode.workspace.getConfiguration();
  const current = c.get(setting);
  const choice = await vscode.window.showQuickPick(
    list.map(([id, name]) => ({ label: `${id === current ? '$(check)' : '$(blank)'} ${name}`, id })),
    { title, placeHolder: vscode.l10n.t('Esc goes back to the Oldest House') }
  );
  if (choice) await c.update(setting, choice.id, Global);
}

/**
 * @param {{
 *   context: vscode.ExtensionContext,
 *   sounds: () => InstanceType<typeof import('./controller').SoundController>,
 *   typography: () => InstanceType<typeof import('./fonts').FontController>,
 *   status: InstanceType<typeof import('./status').ControlStatus>,
 *   music: () => InstanceType<typeof import('./music').Jukebox>,
 * }} deps
 */
async function openControlPanel({ context, sounds, typography, status, music }) {
  for (;;) {
    const c = vscode.workspace.getConfiguration();
    const on = (/** @type {boolean} */ value) => (value ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled'));
    const following = c.get('window.autoDetectColorScheme') === true;
    const soundsOn = c.get(`${SECTION}.enabled`) === true;
    const musicOn = c.get(`${MUSIC}.enabled`) === true;
    const track = musicOn ? music().track : null;
    /** @type {Array<vscode.QuickPickItem & {action?: string}>} */
    const items = [
      { label: vscode.l10n.t('Appearance'), kind: vscode.QuickPickItemKind.Separator },
      { label: `$(symbol-color) ${vscode.l10n.t('Colour theme')}`, description: readActiveThemeLabel() ?? '', action: 'theme' },
      { label: `$(bureau-badge) ${vscode.l10n.t('Full set…')}`, description: vscode.l10n.t('Theme, file icons and product icons in one step'), action: 'fullSet' },
      { label: `$(bureau-dossier) ${vscode.l10n.t('File icons')}`, description: iconThemeName(c.get('workbench.iconTheme'), FILE_ICONS), action: 'fileIcons' },
      { label: `$(bureau-duck) ${vscode.l10n.t('Product icons')}`, description: iconThemeName(c.get('workbench.productIconTheme'), PRODUCT_ICONS), action: 'productIcons' },
      {
        label: `$(bureau-threshold) ${vscode.l10n.t('Light by day, dark by night')}`,
        description: following
          ? vscode.l10n.t('On: {0} / {1}', String(c.get('workbench.preferredLightColorTheme')), String(c.get('workbench.preferredDarkColorTheme')))
          : vscode.l10n.t('Disabled'),
        action: 'followSystem',
      },
      { label: `$(symbol-text) ${vscode.l10n.t('Typography')}`, description: typographyName(c.get(FONT_SETTING)), action: 'typography' },
      { label: vscode.l10n.t('Sound and music'), kind: vscode.QuickPickItemKind.Separator },
      {
        label: `${soundsOn ? '$(bureau-resonance)' : '$(bureau-resonance-off)'} ${vscode.l10n.t('Sounds')}`,
        description: soundsOn ? `${vscode.l10n.t('On')} · ${packName(c.get(`${SECTION}.pack`))} · ${c.get(`${SECTION}.volume`)} %` : vscode.l10n.t('Off'),
        detail: vscode.l10n.t('Opens the sound console: pack, volume, events and previews.'),
        action: 'sounds',
      },
      {
        label: `$(bureau-jukebox) ${vscode.l10n.t('Songmaster Jukebox')}`,
        description: !musicOn ? vscode.l10n.t('Disabled') : track ? require('./music-parse').statusText(track, 60) : vscode.l10n.t('Nothing is playing'),
        detail: vscode.l10n.t('What is playing (Spotify or any player) in the status bar, with controls.'),
        action: 'music',
      },
      { label: `$(bureau-cassette) ${vscode.l10n.t('Official soundtracks…')}`, description: 'CONTROL · CONTROL Resonant', action: 'soundtracks' },
      { label: vscode.l10n.t('Bureau protocols'), kind: vscode.QuickPickItemKind.Separator },
      { label: `$(bureau-classified) ${vscode.l10n.t('Classified mode')}`, description: on(setup.protocolOn('classified')), action: 'classified' },
      { label: `$(bureau-alert) ${vscode.l10n.t('Alert level')}`, description: on(setup.protocolOn('alertLevel')), action: 'alertLevel' },
      { label: `$(bureau-board) ${vscode.l10n.t('The Board…')}`, description: require('./board').boardSummary(), detail: vscode.l10n.t('Random messages, your own messages, hours and comments.'), action: 'board' },
      { label: vscode.l10n.t('More'), kind: vscode.QuickPickItemKind.Separator },
      { label: `$(bureau-polaris) ${vscode.l10n.t('Welcome guide')}`, action: 'welcome' },
      { label: `$(bureau-hexnut) ${vscode.l10n.t('All settings')}`, action: 'settings' },
      { label: `$(eye-closed) ${vscode.l10n.t('Hide this icon from the status bar')}`, action: 'hide' },
    ];
    const choice = await vscode.window.showQuickPick(items, {
      title: vscode.l10n.t('CONTROL — The Oldest House'),
      placeHolder: vscode.l10n.t('The whole theme in one place'),
      matchOnDescription: true,
    });
    if (!choice?.action) return;

    switch (choice.action) {
      case 'theme':
        await setup.chooseTheme(context);
        break;
      case 'fullSet':
        // Sus dos listas y la notificación con «Deshacer» siguen solas.
        void setup.applyFullSet(context);
        return;
      case 'fileIcons':
        await pickIconTheme('workbench.iconTheme', FILE_ICONS, vscode.l10n.t('File icons'));
        break;
      case 'productIcons':
        await pickIconTheme('workbench.productIconTheme', PRODUCT_ICONS, vscode.l10n.t('Product icons'));
        break;
      case 'followSystem':
        await setup.followSystem(context);
        break;
      case 'typography':
        await typography().choose();
        break;
      case 'sounds':
        await require('./sound-menu').openSoundMenu(sounds());
        break;
      case 'music':
        await require('./music').openMusicMenu(music());
        break;
      case 'soundtracks':
        await require('./music').chooseSoundtrack(Boolean(track && /spotify/i.test(track.app)));
        return;
      case 'classified':
      case 'alertLevel': {
        const protocol = /** @type {'classified' | 'alertLevel'} */ (choice.action);
        await setup.setProtocol(protocol, !setup.protocolOn(protocol));
        break;
      }
      case 'board':
        await require('./board').openBoardMenu();
        break;
      case 'welcome':
        await setup.openWelcome(context);
        return;
      case 'settings':
        await vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${context.extension.id}`);
        return;
      case 'hide':
        await status.setVisible(false);
        vscode.window.showInformationMessage(vscode.l10n.t('Oldest House icon hidden. Bring it back with "CONTROL: Show/Hide the Oldest House Icon in the Status Bar".'));
        return;
    }
  }
}

module.exports = { openControlPanel, FILE_ICONS, PRODUCT_ICONS };
