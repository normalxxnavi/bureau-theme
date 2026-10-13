# Security

**[English](#english)** · **[Español](#español)**

<a id="english"></a>

## English

### Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: *Security* tab → *Report a vulnerability* ([direct link](https://github.com/Normalxxnavi/bureau-theme/security/advisories/new)). You will get an answer within a few days. Only the latest version is supported during the beta (0.x).

### What the extension does on your computer

The colour themes and both icon themes are static files: they run no code. The extension code (sounds and typography) does only this:

| | |
|---|---|
| **Network** | None. No telemetry, no downloads, no connections. |
| **Processes** (only with sounds enabled) | Windows: one hidden `powershell.exe` from `%SystemRoot%`, started with `-NoProfile -NonInteractive -EncodedCommand` and a fixed script that plays WAV files with `System.Media.SoundPlayer`. File paths travel Base64-encoded over stdin, so they can never be interpreted as code. macOS: `/usr/bin/afplay`. Linux: `paplay`, `pw-play` or `aplay`. Processes are always started without a shell and with argument arrays. |
| **Files it writes** | A cache of volume-scaled WAV files in the extension's global storage (it only deletes its own `.wav` files there). If you choose a typography: copies of the bundled fonts in your user fonts folder, prefixed `BureauTheme-` (removal only deletes those files). |
| **Registry** (Windows, only if you choose a typography) | `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` entries for those fonts, written with `%SystemRoot%\System32\reg.exe`. No administrator rights are used. |
| **Settings it changes** | Your user settings for the editor, terminal, debug console, chat and Markdown preview fonts — only when you choose a typography, keeping a backup to restore them. Sound settings, when you use the sound console. |
| **What it reads** | Error counts (not their text), task and terminal exit codes, the reason a debugger stopped, and whether the active editor changed (for the typing sound). Nothing is stored or sent. |

### Hardening

- The custom sounds folder can only be set in **user** settings (`application` scope): a workspace cannot point it anywhere. Only `.wav` files with the built-in names are used, and files larger than 16 MB are rejected before being read.
- The extension supports **untrusted workspaces**: it never runs or reads code from the workspace.
- No runtime dependencies: everything is bundled from this repository's source. Development dependencies are installed in CI with `npm ci --ignore-scripts`, audited with `npm audit` and kept up to date by Dependabot.
- GitHub Actions run with read-only tokens; only the release job can create releases.

### Last review

2026-10-13 — Reviewed process launching, file and registry writes, settings, WAV parsing, workspace trust, dependencies and CI. Changes made: removed the unnecessary `-ExecutionPolicy Bypass` flag from the audio player, added the 16 MB limit for WAV files, upgraded `@vscode/vsce` to 4.0.0 (fixes 6 high-severity advisories in development dependencies) and made all CI jobs read-only by default.

---

<a id="español"></a>

## Español

### Cómo informar de una vulnerabilidad

**No abras una incidencia pública.** Infórmala en privado desde GitHub: pestaña *Security* → *Report a vulnerability* ([enlace directo](https://github.com/Normalxxnavi/bureau-theme/security/advisories/new)). Recibirás respuesta en pocos días. Durante la beta (0.x) solo se da soporte a la última versión.

### Qué hace la extensión en tu equipo

Los temas de color y los dos temas de iconos son archivos estáticos: no ejecutan código. El código de la extensión (sonidos y tipografía) solo hace esto:

| | |
|---|---|
| **Red** | Ninguna. Sin telemetría, sin descargas, sin conexiones. |
| **Procesos** (solo con los sonidos activados) | Windows: un `powershell.exe` oculto de `%SystemRoot%`, lanzado con `-NoProfile -NonInteractive -EncodedCommand` y un script fijo que reproduce WAV con `System.Media.SoundPlayer`. Las rutas viajan en Base64 por la entrada estándar, así que nunca se interpretan como código. macOS: `/usr/bin/afplay`. Linux: `paplay`, `pw-play` o `aplay`. Los procesos se lanzan siempre sin shell y con los argumentos como lista. |
| **Archivos que escribe** | Una caché de WAV con el volumen aplicado en el almacenamiento global de la extensión (allí solo borra sus propios `.wav`). Si eliges una tipografía: copias de las fuentes incluidas en tu carpeta de fuentes de usuario, con el prefijo `BureauTheme-` (al quitarlas solo borra esos archivos). |
| **Registro** (Windows, solo si eliges una tipografía) | Entradas en `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` para esas fuentes, escritas con `%SystemRoot%\System32\reg.exe`. Sin permisos de administrador. |
| **Ajustes que cambia** | Tus ajustes de usuario de fuente del editor, la terminal, la consola de depuración, el chat y la vista previa de Markdown, solo cuando eliges una tipografía y guardando una copia para restaurarlos. Los ajustes de sonido, cuando usas la consola de sonido. |
| **Qué lee** | El número de errores (no su texto), los códigos de salida de tareas y comandos de terminal, el motivo por el que se para el depurador y si cambia el editor activo (para el sonido al escribir). No guarda ni envía nada. |

### Medidas de protección

- La carpeta de sonidos propios solo se puede fijar en los ajustes de **usuario** (ámbito `application`): un área de trabajo no puede cambiarla. Solo se usan `.wav` con los nombres de los incluidos, y los de más de 16 MB se rechazan antes de leerlos.
- La extensión admite **áreas de trabajo no confiables**: nunca ejecuta ni lee código del área de trabajo.
- Sin dependencias en tiempo de ejecución: todo se empaqueta desde el código de este repositorio. Las dependencias de desarrollo se instalan en la CI con `npm ci --ignore-scripts`, se auditan con `npm audit` y Dependabot las mantiene al día.
- Las GitHub Actions usan tokens de solo lectura; solo el trabajo de release puede crear releases.

### Última revisión

2026-10-13: revisados el lanzamiento de procesos, la escritura de archivos y registro, los ajustes, la lectura de WAV, la confianza del área de trabajo, las dependencias y la CI. Cambios: quitada la opción innecesaria `-ExecutionPolicy Bypass` del reproductor, límite de 16 MB para los WAV, `@vscode/vsce` actualizado a 4.0.0 (corrige 6 avisos de gravedad alta en dependencias de desarrollo) y todos los trabajos de la CI en solo lectura por defecto.
