// @ts-check
'use strict';

/**
 * Script `vscode:uninstall` (dist/uninstall.js): VS Code lo ejecuta con Node,
 * sin su API, cuando la extensión se ha desinstalado del todo (al reiniciar
 * VS Code después de desinstalarla). Borra las tipografías y la fuente de
 * iconos del prompt que instaló la extensión, y la terminal Bureau: su carpeta
 * de datos y lo que añadió fuera de VS Code (el bloque de tus perfiles de
 * shell, el archivo de fish, la variable PROMPT de cmd, que vuelve a su valor
 * anterior, y el fragmento de Windows Terminal). Los ajustes de fuente no se
 * tocan: llevan detrás la fuente que tenía el usuario, así que VS Code vuelve
 * sola a ella.
 *
 * Solo borra las copias de la extensión (BureauTheme-*.ttf): si el usuario
 * tenía Overpass o Space Mono instaladas por su cuenta, siguen ahí.
 */

const { uninstallAllFonts } = require('./font-installer');
const { removeEverything } = require('./prompt-installer');

try {
  uninstallAllFonts();
} catch {
  // Desinstalar nunca debe fallar por las fuentes: si alguna está en uso, se queda.
}
try {
  removeEverything();
} catch {
  // Ni por la terminal: los bloques de los perfiles solo cargan el prompt si existe.
}
