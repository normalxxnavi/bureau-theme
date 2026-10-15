// @ts-check
'use strict';

/**
 * La consola de sonido: un menú (QuickPick) para configurarlo todo sin abrir
 * settings.json. Se carga la primera vez que se abre (icono de la barra de
 * estado o comando «CONTROL: Abrir la consola de sonido…»).
 *
 * Cada opción vuelve a la consola al terminar; Esc la cierra.
 */

const vscode = require('vscode');
const { EVENTS } = require('./catalog');
const { SECTION } = require('./config');
const { eventLabel } = require('./labels');

const Global = vscode.ConfigurationTarget.Global;

/** Pasos del menú de volumen y de la pausa entre sonidos. */
const VOLUMES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const COOLDOWNS = [0, 500, 1000, 1500, 3000, 5000];

/** @param {number} ms */
const seconds = (ms) => (ms === 0 ? vscode.l10n.t('No pause') : vscode.l10n.t('{0} s', String(ms / 1000).replace('.', vscode.env.language.startsWith('es') ? ',' : '.')));

/** @param {'auto' | 'control' | 'resonant'} pack */
function packName(pack) {
  if (pack === 'control') return 'Control — The Oldest House';
  if (pack === 'resonant') return 'Control Resonant — Patterned Manhattan';
  return vscode.l10n.t('Follow the theme');
}

/**
 * @template {string | number | boolean} T
 * @param {string} title
 * @param {Array<{label: string, value: T, detail?: string}>} options
 * @param {T} current
 * @returns {Promise<T | undefined>}
 */
async function pick(title, options, current) {
  const items = options.map((o) => ({
    label: `${o.value === current ? '$(check)' : '$(blank)'} ${o.label}`,
    detail: o.detail,
    value: o.value,
  }));
  const choice = await vscode.window.showQuickPick(items, { title, placeHolder: vscode.l10n.t('Esc goes back to the sound console') });
  return choice?.value;
}

/**
 * @param {InstanceType<typeof import('./controller').SoundController>} controller
 * @param {InstanceType<typeof import('./sound-status').SoundStatus>} status
 */
async function openSoundMenu(controller, status) {
  for (;;) {
    const c = vscode.workspace.getConfiguration(SECTION);
    const cfg = controller.readConfig();
    const on = EVENTS.filter((e) => cfg.events[e]).length;
    /** @type {Array<vscode.QuickPickItem & {action?: string}>} */
    const items = [
      {
        label: cfg.enabled ? `$(bureau-resonance) ${vscode.l10n.t('Sounds: on')}` : `$(bureau-resonance-off) ${vscode.l10n.t('Sounds: off')}`,
        description: cfg.enabled ? vscode.l10n.t('Turn off') : vscode.l10n.t('Turn on'),
        detail: vscode.l10n.t('Master switch for every CONTROL sound.'),
        action: 'toggle',
      },
      { label: `$(bureau-jukebox) ${vscode.l10n.t('Sound pack')}`, description: packName(cfg.pack), action: 'pack' },
      { label: `$(bureau-resonance) ${vscode.l10n.t('Volume')}`, description: `${cfg.volume} %`, action: 'volume' },
      { label: `$(bureau-hotline) ${vscode.l10n.t('Events')}`, description: vscode.l10n.t('{0} of {1} on', String(on), String(EVENTS.length)), action: 'events' },
      { label: `$(bureau-cassette) ${vscode.l10n.t('Preview sounds…')}`, action: 'preview' },
      { label: vscode.l10n.t('Advanced'), kind: vscode.QuickPickItemKind.Separator },
      {
        label: `$(error) ${vscode.l10n.t('Error sound')}`,
        description: cfg.errorTrigger === 'live' ? vscode.l10n.t('While typing') : vscode.l10n.t('After saving'),
        action: 'trigger',
      },
      {
        label: `$(bureau-safe) ${vscode.l10n.t('Only with CONTROL themes')}`,
        description: cfg.onlyWithControlTheme ? vscode.l10n.t('Yes') : vscode.l10n.t('No'),
        action: 'onlyControl',
      },
      { label: `$(history) ${vscode.l10n.t('Pause between sounds')}`, description: seconds(cfg.cooldownMs), action: 'cooldown' },
      { label: `$(bureau-dossier) ${vscode.l10n.t('My own sounds')}`, description: cfg.customFolder || vscode.l10n.t('Not set'), action: 'folder' },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      status.visible()
        ? { label: `$(eye-closed) ${vscode.l10n.t('Hide this icon from the status bar')}`, action: 'statusBar' }
        : { label: `$(eye) ${vscode.l10n.t('Show the icon in the status bar')}`, action: 'statusBar' },
      { label: `$(bureau-hexnut) ${vscode.l10n.t('All sound settings')}`, action: 'settings' },
    ];
    const choice = await vscode.window.showQuickPick(items, {
      title: vscode.l10n.t('CONTROL — Sound Console'),
      placeHolder: vscode.l10n.t('The Bureau\'s switchboard: choose what you want to hear'),
    });
    if (!choice?.action) return;

    switch (choice.action) {
      case 'toggle':
        await controller.toggle();
        return;
      case 'pack': {
        const v = await pick(vscode.l10n.t('Sound pack'), ['auto', 'control', 'resonant'].map((p) => ({ label: packName(/** @type {any} */ (p)), value: p })), cfg.pack);
        if (v) await c.update('pack', v, Global);
        break;
      }
      case 'volume': {
        const v = await pick(vscode.l10n.t('Volume'), VOLUMES.map((n) => ({ label: `${n} %`, value: n })), cfg.volume);
        if (v !== undefined) {
          await c.update('volume', v, Global);
          controller.config = controller.readConfig();
          controller.play('themeActivated', { force: true });
        }
        break;
      }
      case 'events':
        await chooseEvents(c, cfg);
        break;
      case 'preview':
        await controller.preview();
        return;
      case 'trigger': {
        const v = await pick(
          vscode.l10n.t('Error sound'),
          [
            { label: vscode.l10n.t('After saving'), value: 'onSave', detail: vscode.l10n.t('Recommended: errors that appear while you type do not make noise.') },
            { label: vscode.l10n.t('While typing'), value: 'live', detail: vscode.l10n.t('As soon as the error count changes, after a short pause.') },
          ],
          cfg.errorTrigger
        );
        if (v) await c.update('errorTrigger', v, Global);
        break;
      }
      case 'onlyControl':
        await c.update('onlyWithControlTheme', !cfg.onlyWithControlTheme, Global);
        break;
      case 'cooldown': {
        const v = await pick(vscode.l10n.t('Pause between sounds'), COOLDOWNS.map((ms) => ({ label: seconds(ms), value: ms })), cfg.cooldownMs);
        if (v !== undefined) await c.update('cooldownMs', v, Global);
        break;
      }
      case 'folder':
        await chooseFolder(c, cfg.customFolder);
        break;
      case 'statusBar': {
        const show = !status.visible();
        await status.setVisible(show);
        if (!show) vscode.window.showInformationMessage(vscode.l10n.t('Sound icon hidden. Bring it back with "CONTROL: Show/Hide Sound Icon in Status Bar".'));
        break;
      }
      case 'settings':
        await controller.openSettings();
        return;
    }
  }
}

/**
 * @param {vscode.WorkspaceConfiguration} c
 * @param {import('./config').SoundConfig} cfg
 */
async function chooseEvents(c, cfg) {
  const items = EVENTS.map((event) => ({ label: eventLabel(event), picked: cfg.events[event], event }));
  const chosen = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Events'),
    placeHolder: vscode.l10n.t('Tick the moments that should make a sound'),
    canPickMany: true,
  });
  if (!chosen) return;
  const on = new Set(chosen.map((i) => i.event));
  for (const event of EVENTS) if (on.has(event) !== cfg.events[event]) await c.update(`events.${event}`, on.has(event), Global);
}

/**
 * @param {vscode.WorkspaceConfiguration} c
 * @param {string} current
 */
async function chooseFolder(c, current) {
  const options = [{ label: `$(folder-opened) ${vscode.l10n.t('Choose a folder…')}`, value: 'choose' }];
  if (current) options.push({ label: `$(close) ${vscode.l10n.t('Use the built-in sounds again')}`, value: 'clear' });
  const choice = await vscode.window.showQuickPick(options, {
    title: vscode.l10n.t('My own sounds'),
    placeHolder: vscode.l10n.t('A folder with .wav files named like the built-in ones (save.wav, error.wav…)'),
  });
  if (choice?.value === 'clear') await c.update('customFolder', '', Global);
  if (choice?.value !== 'choose') return;
  const uri = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: vscode.l10n.t('Use this folder') });
  if (uri?.[0]) await c.update('customFolder', uri[0].fsPath, Global);
}

module.exports = { openSoundMenu, VOLUMES, COOLDOWNS };
