// @ts-check
'use strict';

const vscode = require('vscode');

/**
 * ¿Está el documento abierto en alguna pestaña? VS Code también cambia y
 * guarda documentos sin pestaña —settings.json cada vez que cambia el tema o
 * cualquier ajuste, los archivos que toca una refactorización— y eso no es que
 * hayas escrito o guardado tú: ni suena «guardar» ni cuenta para los errores.
 * @param {vscode.TextDocument} doc
 */
function inEditorTab(doc) {
  const uri = doc.uri.toString();
  return vscode.window.tabGroups.all.some((g) =>
    g.tabs.some((t) => {
      const input = /** @type {{uri?: vscode.Uri, modified?: vscode.Uri} | undefined} */ (t.input);
      return input?.uri?.toString() === uri || input?.modified?.toString() === uri;
    })
  );
}

module.exports = { inEditorTab };
