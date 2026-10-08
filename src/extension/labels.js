// @ts-check
'use strict';

/**
 * Nombres visibles de los eventos de sonido. Módulo aparte para que la consola
 * de sonido no tenga que cargar el motor de audio.
 */

const vscode = require('vscode');

/** @param {import('./catalog').SoundEvent} event */
function eventLabel(event) {
  switch (event) {
    case 'startup': return vscode.l10n.t('VS Code starts');
    case 'themeActivated': return vscode.l10n.t('CONTROL theme activated');
    case 'save': return vscode.l10n.t('File saved');
    case 'newError': return vscode.l10n.t('New errors');
    case 'allClear': return vscode.l10n.t('All errors fixed');
    case 'buildSuccess': return vscode.l10n.t('Task succeeded');
    case 'buildFail': return vscode.l10n.t('Task failed');
    case 'terminalFail': return vscode.l10n.t('Terminal command failed');
    case 'debugStart': return vscode.l10n.t('Debugging started');
    case 'breakpoint': return vscode.l10n.t('Breakpoint hit');
    case 'gitCommit': return vscode.l10n.t('Git commit');
  }
}

module.exports = { eventLabel };
