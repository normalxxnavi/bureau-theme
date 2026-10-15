# Screenshots · Capturas

**[English](#english)** · **[Español](#español)**

<a id="english"></a>

## English

Regenerates every image in `images/screenshots/` (README images and the GitHub social preview) from a clean install of the extension. The images are the real VS Code window, with nothing added: no backgrounds, frames or captions. **Windows only**: windows are captured with `PrintWindow`.

```sh
npm run screenshots                          # package, capture and compose everything (~5 min)
npm run screenshots -- control-dark,icons-dark # copy only these, reusing the last captures
```

| File | What it does |
|---|---|
| `index.js` | Packages the extension and `cmd-probe`, then runs `shots.js` and `publish.js`. |
| `shots.js` | Installs the `.vsix` in a throwaway VS Code profile, creates a demo project (Git repo, test task) and captures one window per theme (at scale 1, pixel for pixel) plus two close-ups at scale 2. |
| `capture.ps1` | Finds the VS Code window, resizes it and saves it as PNG. |
| `publish.js` | Copies the captures to `images/screenshots/` as they are, and crops the social preview. |
| `cmd-probe/` | Tiny helper extension that runs a command at start-up (opens the sound console for its capture). Never published. |
| `test-report.js` | Sample test output shown in the terminal of the demo project. |
| `env.js` | Finds VS Code and the browser. |

Requirements: VS Code (detected automatically, or set `VSCODE_PATH` to its install folder). Work files go to `%TEMP%\bureau-screenshots`. Don't use the mouse while windows are being captured.

---

<a id="español"></a>

## Español

Regenera todas las imágenes de `images/screenshots/` (las del README y la vista previa social de GitHub) a partir de una instalación limpia de la extensión. Las imágenes son la ventana real de VS Code, sin nada añadido: ni fondos, ni marcos, ni textos. **Solo Windows**: las ventanas se capturan con `PrintWindow`.

```sh
npm run screenshots                          # empaqueta, captura y compone todo (~5 min)
npm run screenshots -- control-dark,icons-dark # solo copia esas, con las últimas capturas
```

| Archivo | Qué hace |
|---|---|
| `index.js` | Empaqueta la extensión y `cmd-probe`, y lanza `shots.js` y `publish.js`. |
| `shots.js` | Instala el `.vsix` en un perfil de VS Code desechable, crea un proyecto de demostración (repositorio Git, tarea de tests) y captura una ventana por tema (a escala 1, píxel a píxel) y dos primeros planos a escala 2. |
| `capture.ps1` | Busca la ventana de VS Code, le da tamaño y la guarda en PNG. |
| `publish.js` | Copia las capturas tal cual a `images/screenshots/` y recorta la vista previa social. |
| `cmd-probe/` | Extensión auxiliar mínima que ejecuta un comando al arrancar (abre la consola de sonido para su captura). No se publica. |
| `test-report.js` | Salida de tests de ejemplo que se ve en la terminal del proyecto de demostración. |
| `env.js` | Localiza VS Code y el navegador. |

Requisitos: VS Code (se detecta solo, o define `VSCODE_PATH` con su carpeta de instalación). Los archivos de trabajo van a `%TEMP%\bureau-screenshots`. No uses el ratón mientras se capturan las ventanas.
