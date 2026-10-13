// Ejecuta el comando de `cmdProbe.command` unos segundos después de arrancar (para capturas).
const vscode = require('vscode');
exports.activate = () => {
  const cmd = vscode.workspace.getConfiguration('cmdProbe').get('command');
  if (cmd) setTimeout(() => vscode.commands.executeCommand(cmd), 6000);
};
