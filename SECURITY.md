# Security

**[English](#english)** · **[Español](#español)**

<a id="english"></a>

## English

### Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: *Security* tab → *Report a vulnerability* ([direct link](https://github.com/Normalxxnavi/bureau-theme/security/advisories/new)). You will get an answer within a few days. Only the latest version is supported during the beta (0.x).

### What the extension does on your computer

The colour themes and both icon themes are static files: they run no code. The extension code (sounds, typography, the Songmaster jukebox and the Bureau protocols, all optional) does only this:

| | |
|---|---|
| **Network** | None. No telemetry, no downloads, no connections. The soundtrack buttons only ask your system to open a Spotify link when you click them. |
| **Processes** (only with sounds enabled) | Windows: one hidden `powershell.exe` from `%SystemRoot%`, started with `-NoProfile -NonInteractive -EncodedCommand` and a fixed script that plays WAV files with `System.Media.SoundPlayer`. File paths travel Base64-encoded over stdin, so they can never be interpreted as code. macOS: `/usr/bin/afplay`. Linux: `paplay`, `pw-play` or `aplay`. Processes are always started without a shell and with argument arrays. |
| **Processes** (only with the Songmaster jukebox enabled) | Windows: a second hidden `powershell.exe` with a fixed script that reads the system media session (`Windows.Media.Control`); it only accepts the words `read`, `cover`, `playPause`, `next` and `previous` on stdin. macOS: `/usr/bin/osascript` with a fixed AppleScript for Spotify and Music, only when they are already open (macOS asks your permission the first time). Linux: `gdbus` (MPRIS over the session D-Bus). It only asks while the VS Code window is in the foreground. |
| **Files it writes** | A cache of volume-scaled WAV files in the extension's global storage (it only deletes its own `.wav` files there). If you choose a typography: copies of the bundled fonts in your user fonts folder, prefixed `BureauTheme-` (removal only deletes those files). |
| **Registry** (Windows, only if you choose a typography) | `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` entries for those fonts, written with `%SystemRoot%\System32\reg.exe`. No administrator rights are used. |
| **Settings it changes** | Your user settings for the editor, terminal, debug console, chat and Markdown preview fonts — only when you choose a typography, keeping a backup to restore them. Sound settings, when you use the sound console. Theme, icon and light/dark settings, only when you use the welcome guide or the Oldest House (the full set can be undone). |
| **What it reads** | Error and warning counts (not their text), task and terminal exit codes, the reason a debugger stopped, and whether the active editor changed (for the typing sound). With Classified mode, the text of the open files that match its patterns, only to know what to cover. With the jukebox, the title, artist and album that your system reports, and the album cover it already has (Windows, reduced to 160 px; on Linux, only a local image file of at most 48 KB). Covers are never downloaded. Nothing is stored or sent. |

### Hardening

- **Untrusted workspaces** (Restricted Mode): the extension never runs or reads code from the workspace, and it ignores the sound settings of the workspace — a repository you clone cannot turn sounds on through its `.vscode/settings.json`. The typography, the custom sounds folder, the jukebox and the random Board messages can only be set in **user** settings.
- **Sound files**: only `.wav` files with the built-in names, only regular files (not folders, pipes or devices), a custom folder that is never a network path (`\\server\share`, which on Windows would send your credentials to that server), and nothing larger than 16 MB. WAV headers are validated before any sample is touched.
- **Programs**: always started with an absolute path and an argument array, never through a shell. Relative entries of `PATH` (such as `.`) are ignored, so a project cannot plant its own `paplay` or `fc-cache`.
- **Classified mode** takes plain words for the secret names, never regular expressions: a workspace cannot freeze VS Code with a malicious pattern. Files larger than 512 KB are not analysed.
- **Text from outside** (song titles, your own Board messages) is shown as plain text: it cannot add icons or links to the status bar.
- **No runtime dependencies**: everything is bundled from this repository's source.

### Supply chain

- Development dependencies are installed with install scripts disabled (`.npmrc` and `npm ci --ignore-scripts`). Every release verifies their registry signatures (`npm audit signatures`) and fails on known vulnerabilities (`npm audit`).
- The only GitHub Actions workflow is the release workflow. Its actions are pinned to commit SHAs and it runs with read-only tokens until the publish step.
- Releases need the maintainer's **manual approval**: pushing commits never publishes anything, and a `vX.Y.Z` tag on the `release` (production) branch only checks and builds the `.vsix` with a read-only token. The publish job waits for approval in a protected environment; only then can it sign in to Microsoft Entra ID with a short-lived token (OIDC; no Marketplace secret is stored anywhere), publish to the Marketplace and create the GitHub release with a SHA-256 checksum and a signed **build provenance attestation**.

### Verifying a release

Download the `.vsix` from the GitHub release and check that it was built by this repository's workflow from a tagged commit:

```sh
gh attestation verify bureau-theme-<version>.vsix --repo Normalxxnavi/bureau-theme
```

Or compare its checksum with `SHA256SUMS.txt` (`sha256sum` on Linux, `Get-FileHash` on Windows, `shasum -a 256` on macOS).

### Last review

2026-10-15 — Reviewed workspace trust, process launching and `PATH` lookup, sound file paths, WAV parsing, font installation, error handling, dependencies and CI. Changes: Restricted Mode ignores workspace sound settings; relative `PATH` entries are ignored; network paths and non-regular files are rejected; malformed WAV headers are rejected; fonts are recopied when their content changes; actions pinned by SHA; `npm audit`, signature checks, CodeQL, Dependabot cooldown and release attestations added.

Later on 2026-10-15, at the maintainer's request, the separate CI, CodeQL and Dependabot were removed: their checks (`npm audit`, signatures, generated files, unit and integration tests) now run in the release workflow, which also publishes to the Marketplace after approval.

2026-10-13 — Removed the unnecessary `-ExecutionPolicy Bypass` flag from the audio player, added the 16 MB limit for WAV files, upgraded `@vscode/vsce` to 4.0.0 and made all CI jobs read-only by default.

---

<a id="español"></a>

## Español

### Cómo informar de una vulnerabilidad

**No abras una incidencia pública.** Infórmala en privado desde GitHub: pestaña *Security* → *Report a vulnerability* ([enlace directo](https://github.com/Normalxxnavi/bureau-theme/security/advisories/new)). Recibirás respuesta en pocos días. Durante la beta (0.x) solo se da soporte a la última versión.

### Qué hace la extensión en tu equipo

Los temas de color y los dos temas de iconos son archivos estáticos: no ejecutan código. El código de la extensión (sonidos, tipografía, la gramola Songmaster y los protocolos de la Agencia, todo opcional) solo hace esto:

| | |
|---|---|
| **Red** | Ninguna. Sin telemetría, sin descargas, sin conexiones. Los botones de las bandas sonoras solo piden a tu sistema que abra un enlace de Spotify cuando los pulsas. |
| **Procesos** (solo con los sonidos activados) | Windows: un `powershell.exe` oculto de `%SystemRoot%`, lanzado con `-NoProfile -NonInteractive -EncodedCommand` y un script fijo que reproduce WAV con `System.Media.SoundPlayer`. Las rutas viajan en Base64 por la entrada estándar, así que nunca se interpretan como código. macOS: `/usr/bin/afplay`. Linux: `paplay`, `pw-play` o `aplay`. Los procesos se lanzan siempre sin shell y con los argumentos como lista. |
| **Procesos** (solo con la gramola Songmaster activada) | Windows: un segundo `powershell.exe` oculto con un script fijo que lee la sesión multimedia del sistema (`Windows.Media.Control`); por la entrada estándar solo acepta las palabras `read`, `cover`, `playPause`, `next` y `previous`. macOS: `/usr/bin/osascript` con un AppleScript fijo para Spotify y Música, solo si ya están abiertos (macOS pide permiso la primera vez). Linux: `gdbus` (MPRIS por el D-Bus de la sesión). Solo pregunta con la ventana de VS Code en primer plano. |
| **Archivos que escribe** | Una caché de WAV con el volumen aplicado en el almacenamiento global de la extensión (allí solo borra sus propios `.wav`). Si eliges una tipografía: copias de las fuentes incluidas en tu carpeta de fuentes de usuario, con el prefijo `BureauTheme-` (al quitarlas solo borra esos archivos). |
| **Registro** (Windows, solo si eliges una tipografía) | Entradas en `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` para esas fuentes, escritas con `%SystemRoot%\System32\reg.exe`. Sin permisos de administrador. |
| **Ajustes que cambia** | Tus ajustes de usuario de fuente del editor, la terminal, la consola de depuración, el chat y la vista previa de Markdown, solo cuando eliges una tipografía y guardando una copia para restaurarlos. Los ajustes de sonido, cuando usas la consola de sonido. Los de tema, iconos y modo claro/oscuro, solo cuando usas la guía de bienvenida o la Casa Inmemorial (el set completo se puede deshacer). |
| **Qué lee** | El número de errores y avisos (no su texto), los códigos de salida de tareas y comandos de terminal, el motivo por el que se para el depurador y si cambia el editor activo (para el sonido al escribir). Con el Modo Clasificado, el texto de los archivos abiertos que encajan con sus patrones, solo para saber qué tapar. Con la gramola, el título, el artista y el álbum que da tu sistema, y la portada que ya tiene (Windows, reducida a 160 px; en Linux, solo una imagen local de 48 KB como mucho). Las portadas nunca se descargan. No guarda ni envía nada. |

### Medidas de protección

- **Áreas de trabajo no confiables** (modo restringido): la extensión nunca ejecuta ni lee código del área de trabajo e ignora sus ajustes de sonido: un repositorio que clones no puede activar los sonidos desde su `.vscode/settings.json`. La tipografía, la carpeta de sonidos propios, la gramola y los mensajes al azar del Consejo solo se pueden fijar en los ajustes de **usuario**.
- **Archivos de sonido**: solo `.wav` con los nombres de los incluidos, solo archivos normales (no carpetas, tuberías ni dispositivos), una carpeta propia que nunca es una ruta de red (`\\servidor\carpeta`, que en Windows enviarían tus credenciales a ese servidor) y nada de más de 16 MB. La cabecera del WAV se valida antes de tocar ninguna muestra.
- **Programas**: siempre con ruta absoluta y argumentos como lista, nunca a través de una shell. Las entradas relativas del `PATH` (como `.`) se ignoran, así que un proyecto no puede colar su propio `paplay` o `fc-cache`.
- El **Modo Clasificado** recibe palabras normales para los nombres de secreto, nunca expresiones regulares: un área de trabajo no puede bloquear VS Code con un patrón malicioso. Los archivos de más de 512 KB no se analizan.
- **Texto de fuera** (títulos de canciones, tus propios mensajes del Consejo): se muestra como texto plano y no puede añadir iconos ni enlaces a la barra de estado.
- **Sin dependencias en tiempo de ejecución**: todo se empaqueta desde el código de este repositorio.

### Cadena de suministro

- Las dependencias de desarrollo se instalan con los scripts de instalación desactivados (`.npmrc` y `npm ci --ignore-scripts`). Cada release verifica sus firmas del registro (`npm audit signatures`) y falla si tienen vulnerabilidades conocidas (`npm audit`).
- El único workflow de GitHub Actions es el de release. Sus acciones van fijadas por el SHA de su commit y usa tokens de solo lectura hasta el paso de publicación.
- Las releases necesitan la **aprobación manual** del mantenedor: subir commits nunca publica nada, y un tag `vX.Y.Z` en la rama `release` (producción) solo comprueba y compila el `.vsix` con un token de solo lectura. El trabajo de publicación espera la aprobación en un entorno protegido; solo entonces puede entrar en Microsoft Entra ID con un token de corta duración (OIDC; no se guarda ningún secreto del Marketplace), publicar en el Marketplace y crear la release de GitHub con su suma SHA-256 y un **certificado de procedencia** firmado (attestation).

### Cómo verificar una release

Descarga el `.vsix` de la release de GitHub y comprueba que lo compiló el workflow de este repositorio a partir de un commit etiquetado:

```sh
gh attestation verify bureau-theme-<versión>.vsix --repo Normalxxnavi/bureau-theme
```

O compara su suma con `SHA256SUMS.txt` (`sha256sum` en Linux, `Get-FileHash` en Windows, `shasum -a 256` en macOS).

### Última revisión

2026-10-15: revisados la confianza del área de trabajo, el lanzamiento de procesos y la búsqueda en el `PATH`, las rutas de los sonidos, la lectura de WAV, la instalación de fuentes, la gestión de errores, las dependencias y la CI. Cambios: el modo restringido ignora los ajustes de sonido del área de trabajo; se ignoran las entradas relativas del `PATH`; se rechazan las rutas de red y lo que no sea un archivo normal; se rechazan las cabeceras WAV mal formadas; las fuentes se vuelven a copiar si cambia su contenido; acciones fijadas por SHA; `npm audit`, verificación de firmas, CodeQL, espera de Dependabot y certificados de procedencia en las releases.

Más tarde el mismo 2026-10-15, a petición del mantenedor, se quitaron la CI, CodeQL y Dependabot por separado: sus comprobaciones (`npm audit`, firmas, archivos generados, tests unitarios y de integración) pasan al workflow de release, que además publica en el Marketplace tras la aprobación.

2026-10-13: quitada la opción innecesaria `-ExecutionPolicy Bypass` del reproductor, límite de 16 MB para los WAV, `@vscode/vsce` actualizado a 4.0.0 y todos los trabajos de la CI en solo lectura por defecto.
