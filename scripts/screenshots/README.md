# Screenshots · Capturas

**[English](#english)** · **[Español](#español)**

<a id="english"></a>

## English

Regenerates every image in `images/screenshots/` (README images and the GitHub social preview) from a clean install of the extension. The images are the real VS Code window, drawn at twice its resolution through the Chromium debugging port (a 1280 × 800 window gives a 2560 × 1600 image), so their text stays sharp on any screen, even when the capture runs on a 1080p monitor. Nothing is added but a 1 px grey edge like that of a Windows window, so the black and white themes do not melt into the page: no backgrounds or captions. **Windows only**: windows are sized and closed with the Windows API.

```sh
npm run screenshots                          # package, capture and compose everything (~5 min)
npm run screenshots -- control-dark,icons-dark # copy only these, reusing the last captures
```

| File | What it does |
|---|---|
| `index.js` | Packages the extension and `cmd-probe`, then runs `shots.js` and `publish.js`. |
| `shots.js` | Installs the `.vsix` in a throwaway VS Code profile, creates a demo project (Git repo, test task) and captures one window per shot: the four themes, the features, four icon close-ups (two of them in projects of their own: the lore icons and the language logos) and the five terminal prompts. Each shot can type, change settings while the window is open and hover over the status bar. The folder that holds the project is also the home folder, so the prompt shows `~\oldest-house` and your Git settings and PowerShell history are not touched; the terminal shot uses its own copy of the project, so its maximised panel never shows in the others. |
| `capture.ps1` | Finds the VS Code window, sizes it, moves the cursor away from it and closes it. |
| `cdp.js` | Drives the window through the Chromium debugging port: draws it at 2×, keys and a virtual mouse for the popups (the real cursor never moves), and the screenshot itself. |
| `cover.js` · `media-session.ps1` | The jukebox capture: an invented song («Patterning» by Hedron, own cover art) played silently in a Windows media session, so your own music is never touched. The session presents itself as Spotify, so the popup shows the player's logo. Pause your music before capturing. |
| `publish.js` | Copies the captures to `images/screenshots/` with their grey edge, and crops the social preview (1280 × 640, at half resolution). |
| `cmd-probe/` | Tiny helper extension that runs a command at start-up (opens the sound console, the Oldest House, the welcome guide or a Bureau terminal for their captures). Never published. |
| `test-report.js` | Sample test output shown in the terminal of the demo project. |
| `env.js` | Finds VS Code and the browser. |

Requirements: VS Code (detected automatically, or set `VSCODE_PATH` to its install folder). Work files go to `%TEMP%\bureau-screenshots`. Don't use the mouse while windows are being captured.

**CHANGELOG images** are frozen copies in `images/changelog/<version>/`, never regenerated, so each version keeps showing what it looked like (Git stores identical files only once). Copy them from `images/screenshots/` when a version is closed.

---

<a id="español"></a>

## Español

Regenera todas las imágenes de `images/screenshots/` (las del README y la vista previa social de GitHub) a partir de una instalación limpia de la extensión. Las imágenes son la ventana real de VS Code, pintada al doble de su resolución por el puerto de depuración de Chromium (una ventana de 1280 × 800 da una imagen de 2560 × 1600), así que su texto se ve nítido en cualquier pantalla, aunque captures en un monitor de 1080p. Solo se añade un borde gris de 1 px como el de una ventana de Windows, para que los temas negro y blanco no se fundan con la página: ni fondos ni textos. **Solo Windows**: las ventanas se dimensionan y se cierran con la API de Windows.

```sh
npm run screenshots                          # empaqueta, captura y compone todo (~5 min)
npm run screenshots -- control-dark,icons-dark # solo copia esas, con las últimas capturas
```

| Archivo | Qué hace |
|---|---|
| `index.js` | Empaqueta la extensión y `cmd-probe`, y lanza `shots.js` y `publish.js`. |
| `shots.js` | Instala el `.vsix` en un perfil de VS Code desechable, crea un proyecto de demostración (repositorio Git, tarea de tests) y captura una ventana por captura: los cuatro temas, las funciones, cuatro primeros planos de los iconos (dos de ellos en proyectos propios: los iconos del lore y los logotipos de los lenguajes) y los cinco prompts de la terminal. Cada captura puede escribir, cambiar ajustes con la ventana abierta y poner el ratón sobre la barra de estado. La carpeta que contiene el proyecto hace también de carpeta personal: el prompt enseña `~\oldest-house` y no se tocan tu configuración de Git ni tu historial de PowerShell; la captura de la terminal usa su propia copia del proyecto, así que su panel maximizado nunca sale en las demás. |
| `capture.ps1` | Busca la ventana de VS Code, le da tamaño, le aparta el cursor y la cierra. |
| `cdp.js` | Maneja la ventana por el puerto de depuración de Chromium: la pinta a 2×, teclas y un ratón virtual para los popups (el cursor de verdad no se mueve), y la captura. |
| `cover.js` · `media-session.ps1` | La captura de la gramola: una canción inventada («Patterning», de Hedron, con portada propia) que suena en silencio en una sesión multimedia de Windows, así que tu música no se toca. La sesión se presenta como Spotify, para que el popup enseñe el logotipo del reproductor. Pon tu música en pausa antes de capturar. |
| `publish.js` | Copia las capturas a `images/screenshots/` con su borde gris y recorta la vista previa social (1280 × 640, a media resolución). |
| `cmd-probe/` | Extensión auxiliar mínima que ejecuta un comando al arrancar (abre la consola de sonido, la Casa Inmemorial, la guía de bienvenida o una terminal Bureau para sus capturas). No se publica. |
| `test-report.js` | Salida de tests de ejemplo que se ve en la terminal del proyecto de demostración. |
| `env.js` | Localiza VS Code y el navegador. |

Requisitos: VS Code (se detecta solo, o define `VSCODE_PATH` con su carpeta de instalación). Los archivos de trabajo van a `%TEMP%\bureau-screenshots`. No uses el ratón mientras se capturan las ventanas.

**Las imágenes del CHANGELOG** son copias congeladas en `images/changelog/<versión>/`, que nunca se regeneran: así cada versión sigue enseñando cómo era (Git guarda una sola vez los archivos idénticos). Se copian de `images/screenshots/` al cerrar una versión.
