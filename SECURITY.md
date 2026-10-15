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

- **Untrusted workspaces** (Restricted Mode): the extension never runs or reads code from the workspace, and it ignores the sound settings of the workspace — a repository you clone cannot turn sounds on through its `.vscode/settings.json`. The typography and the custom sounds folder can only be set in **user** settings.
- **Sound files**: only `.wav` files with the built-in names, only regular files (not folders, pipes or devices), a custom folder that is never a network path (`\\server\share`, which on Windows would send your credentials to that server), and nothing larger than 16 MB. WAV headers are validated before any sample is touched.
- **Programs**: always started with an absolute path and an argument array, never through a shell. Relative entries of `PATH` (such as `.`) are ignored, so a project cannot plant its own `paplay` or `fc-cache`.
- **No runtime dependencies**: everything is bundled from this repository's source.

### Supply chain

- Development dependencies are installed with install scripts disabled (`.npmrc` and `npm ci --ignore-scripts`). CI verifies their registry signatures (`npm audit signatures`) and fails on known vulnerabilities (`npm audit`). Dependabot proposes updates only once a version has been public for 7 days.
- GitHub Actions are pinned to commit SHAs and run with read-only tokens. CodeQL scans the code on every push and every week.
- Releases need the maintainer's **manual approval**: pushing commits never creates one, and a `vX.Y.Z` tag only builds the `.vsix` with a read-only token. The job that creates the release waits for approval in a protected environment and creates a **draft**, with a SHA-256 checksum and a signed **build provenance attestation**; nothing is public until the draft is published.

### Verifying a release

Download the `.vsix` from the GitHub release and check that it was built by this repository's workflow from a tagged commit:

```sh
gh attestation verify bureau-theme-<version>.vsix --repo Normalxxnavi/bureau-theme
```

Or compare its checksum with `SHA256SUMS.txt` (`sha256sum` on Linux, `Get-FileHash` on Windows, `shasum -a 256` on macOS).

### Last review

2026-10-15 — Reviewed workspace trust, process launching and `PATH` lookup, sound file paths, WAV parsing, font installation, error handling, dependencies and CI. Changes: Restricted Mode ignores workspace sound settings; relative `PATH` entries are ignored; network paths and non-regular files are rejected; malformed WAV headers are rejected; fonts are recopied when their content changes; actions pinned by SHA; `npm audit`, signature checks, CodeQL, Dependabot cooldown and release attestations added.

2026-10-13 — Removed the unnecessary `-ExecutionPolicy Bypass` flag from the audio player, added the 16 MB limit for WAV files, upgraded `@vscode/vsce` to 4.0.0 and made all CI jobs read-only by default.

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

- **Áreas de trabajo no confiables** (modo restringido): la extensión nunca ejecuta ni lee código del área de trabajo e ignora sus ajustes de sonido: un repositorio que clones no puede activar los sonidos desde su `.vscode/settings.json`. La tipografía y la carpeta de sonidos propios solo se pueden fijar en los ajustes de **usuario**.
- **Archivos de sonido**: solo `.wav` con los nombres de los incluidos, solo archivos normales (no carpetas, tuberías ni dispositivos), una carpeta propia que nunca es una ruta de red (`\\servidor\carpeta`, que en Windows enviarían tus credenciales a ese servidor) y nada de más de 16 MB. La cabecera del WAV se valida antes de tocar ninguna muestra.
- **Programas**: siempre con ruta absoluta y argumentos como lista, nunca a través de una shell. Las entradas relativas del `PATH` (como `.`) se ignoran, así que un proyecto no puede colar su propio `paplay` o `fc-cache`.
- **Sin dependencias en tiempo de ejecución**: todo se empaqueta desde el código de este repositorio.

### Cadena de suministro

- Las dependencias de desarrollo se instalan con los scripts de instalación desactivados (`.npmrc` y `npm ci --ignore-scripts`). La CI verifica sus firmas del registro (`npm audit signatures`) y falla si tienen vulnerabilidades conocidas (`npm audit`). Dependabot solo propone versiones publicadas hace al menos 7 días.
- Las GitHub Actions van fijadas por el SHA de su commit y usan tokens de solo lectura. CodeQL analiza el código en cada push y cada semana.
- Las releases necesitan la **aprobación manual** del mantenedor: subir commits nunca crea una, y un tag `vX.Y.Z` solo compila el `.vsix` con un token de solo lectura. El trabajo que crea la release espera la aprobación en un entorno protegido y crea un **borrador**, con su suma SHA-256 y un **certificado de procedencia** firmado (attestation); nada es público hasta que se publica el borrador.

### Cómo verificar una release

Descarga el `.vsix` de la release de GitHub y comprueba que lo compiló el workflow de este repositorio a partir de un commit etiquetado:

```sh
gh attestation verify bureau-theme-<versión>.vsix --repo Normalxxnavi/bureau-theme
```

O compara su suma con `SHA256SUMS.txt` (`sha256sum` en Linux, `Get-FileHash` en Windows, `shasum -a 256` en macOS).

### Última revisión

2026-10-15: revisados la confianza del área de trabajo, el lanzamiento de procesos y la búsqueda en el `PATH`, las rutas de los sonidos, la lectura de WAV, la instalación de fuentes, la gestión de errores, las dependencias y la CI. Cambios: el modo restringido ignora los ajustes de sonido del área de trabajo; se ignoran las entradas relativas del `PATH`; se rechazan las rutas de red y lo que no sea un archivo normal; se rechazan las cabeceras WAV mal formadas; las fuentes se vuelven a copiar si cambia su contenido; acciones fijadas por SHA; `npm audit`, verificación de firmas, CodeQL, espera de Dependabot y certificados de procedencia en las releases.

2026-10-13: quitada la opción innecesaria `-ExecutionPolicy Bypass` del reproductor, límite de 16 MB para los WAV, `@vscode/vsce` actualizado a 4.0.0 y todos los trabajos de la CI en solo lectura por defecto.
