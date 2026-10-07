# Theme CONTROL

**[English](#english)** · **[Español](#español)**

![Theme CONTROL — CONTROL Dark, Resonant, Black and Astral](images/screenshots/hero.png)

**Four color themes, file and product icons, and typography inspired by CONTROL and CONTROL Resonant.**<br>
**Cuatro temas de color, iconos de archivo y de interfaz, y tipografía inspirados en CONTROL y CONTROL Resonant.**

*By **Normalxxnavi** · Unofficial fan project, not affiliated with Remedy Entertainment.*

---

<a id="english"></a>

# English

Theme CONTROL dresses Visual Studio Code in the brutalist world of the Federal Bureau of Control: the concrete of the Oldest House, the white void of the Astral Plane and the patterned Manhattan of *CONTROL Resonant*. It is a complete pack — not just colours: the frame of the editor is redesigned as Bureau signage, every file and folder gets its own dossier, VS Code's own icons are redrawn, and the games' typography and sounds are one click away.

## What's inside

| | |
|---|---|
| **4 color themes** | **CONTROL Dark** (The Oldest House), **CONTROL Black** (OLED), **CONTROL Resonant** (patterned Manhattan) and **CONTROL Astral** (the light Astral Plane). |
| **Bureau Icons** | File and folder icons designed as Bureau dossiers: 498 icons covering 340 file extensions, 284 well-known file names, 84 languages and 278 folder names with their own emblem. Dark and light variants. |
| **Bureau Product Icons** | VS Code's own icons redrawn: 166 icons across the activity bar, status bar, panels, trees, title bar and debug toolbar — with **the Board's inverted pyramid** for Git and **the Board** for Copilot and chat. |
| **Typography** *(optional)* | Free fonts inspired by the games for the editor, terminal and chat, installed only for your user. |
| **Sounds** *(optional, off by default)* | Original sound effects for saving, errors, builds, debugging and commits. |

## The themes

### CONTROL Dark — The Oldest House

![CONTROL Dark](images/screenshots/theme-dark.png)

The reference theme, inspired by *Control* (2019). Warm charcoal concrete, bone-white text and **FBC red** as the accent — the colour of the Bureau's signage and of Jesse's Service Weapon. Red is used with restraint: the frame, the active elements and the control-flow keywords (`if`, `return`, `throw`), while declarations stay in muted tones so the code remains calm to read for hours.

### CONTROL Black — The Astral Plane in negative

![CONTROL Black](images/screenshots/theme-black.png)

True black for OLED screens. The signage lines, the cursor and the glows switch to **astral white**, as if the Astral Plane had been printed in negative; FBC red is kept only for the selection and small details. The darkest theme of the set, with the same contrast guarantees as CONTROL Dark.

### CONTROL Resonant — Patterned Manhattan

![CONTROL Resonant](images/screenshots/theme-resonant.png)

Inspired by *Control Resonant* (2026): cold wet-asphalt greys, steel blue and the pale **resonance cyan** of the Hedron. Following the game's art direction, **red belongs to the Hiss** — in this theme it only appears for errors and deletions, so when you see red, something really is wrong. Pairs with the *Resonant* typography (Space Mono and Space Grotesk).

### CONTROL Astral — The Astral Plane

![CONTROL Astral](images/screenshots/theme-astral.png)

The only light theme: a white void framed by black geometry, like the Astral Plane, with FBC red reserved for small details. Designed for readability in bright rooms and checked against stricter **AAA** contrast targets: body text 16.8:1, code at least 7:1 and comments 6.75:1.

### More than colours: Bureau signage

- **The monolith.** The activity bar, status bar and title bar form a dark block — also in Astral — that holds the editor, the sidebar and the panel. Three depths: monolith, sidebar, editor.
- **Signage headers.** Sidebar titles (*Explorer*, *Search*…) are monolith bands with an accent line underneath; sections are separated by thin accent rules.
- **Astral light.** Active elements of the frame glow in pure white, like the light of the Astral Plane.
- **Accent glow.** Floating widgets (Command Palette, suggestions, hovers) and the edge of scrolled content glow with the theme colour: FBC red, resonance cyan or astral white.
- **Editor details.** The current line number, the active indent guide, matching brackets and rulers use the accent; an accent line runs under the tabs; the line-number gutter is a darker concrete band.
- **Chat panels.** Elevated "dossier" bubbles, accent-framed code blocks and monolith avatars.

Design rules:

- **Readability first.** Every text colour is checked against WCAG contrast ratios (body text ≥ 7:1, code ≥ 4.5:1); CONTROL Astral meets stricter AAA targets.
- **Red is used sparingly.** Only control-flow keywords are red in code; declarations (`public`, `const`, `class`…) use a muted tone.
- **Active is not broken.** The error colour is never the accent colour, so a squiggle is never confused with an active element.
- **Full coverage.** 687 UI colour keys (including the *modern UI* of VS Code 1.140), the terminal's 16 ANSI colours, Git, diff and merge editors, bracket pairs and **semantic highlighting** (including C#/Roslyn and Razor).

## Install

1. Install **Theme CONTROL** from the Marketplace (or run `code --install-extension bureau-theme-<version>.vsix`).
2. Press <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> on macOS) and pick **CONTROL Dark**, **CONTROL Black**, **CONTROL Resonant** or **CONTROL Astral**.
3. Run **Preferences: File Icon Theme** → **Bureau Icons**.
4. Run **Preferences: Product Icon Theme** → **Bureau Product Icons**.
5. The first time the extension starts it offers the game typography; you can also run **CONTROL: Choose Typography…** at any time.

## Bureau Icons

![Bureau Icons](images/screenshots/bureau-icons.png)

Every file is a **Bureau dossier**: a solid sheet in the colour of its language, with a folded corner and a classification band, and its code (`TS`, `C#`, `PY`…) or a pictogram cut out of it. Every folder is solid, coloured by category and carries an **emblem**: `</>` for `src`, a check for `test`, a mountain for `images`, a wave for `sounds`, the pyramid for `.git`, a hex nut for `.vscode`, a cube for `node_modules`, a prompt for `scripts`, a globe for `l10n`, a shield for `auth`…

- **Coverage:** programming languages, web, .NET (`.csproj`, `.sln`, `appsettings.json`…), configuration for the usual tools (Vite, Webpack, ESLint, Prettier, Jest, Vitest, Playwright, Tailwind, Next, Nuxt, Angular…), package managers and lockfiles, Docker and CI files, documents, images, audio, video, fonts, archives, certificates and keys.
- **Lore details:** `.env` files are a **classified, redacted document**; tests carry the **Hedron**; AI instruction files (`CLAUDE.md`, `AGENTS.md`, `*.prompt.md`…) carry **the Board**; the root folder of a multi-root workspace is the **Board's inverted pyramid**.
- Every icon has a dark and a light variant, so it stays legible in CONTROL Astral and in any other light theme.

## Bureau Product Icons

![Bureau Product Icons](images/screenshots/bureau-product-icons.png)

Redraws the icons VS Code draws itself, with geometric, brutalist glyphs: octagons instead of circles, square dots and thick strokes. They work with the activity bar on the side, on top or at the bottom.

| Where | What changes |
|---|---|
| Activity bar | Explorer (a dossier), Search (a lens), Source Control (**the inverted pyramid**), Run and Debug (the Hedron), Extensions (sector blocks), Testing, Accounts (the FBC badge), Manage (a hex nut) |
| Status bar | Git branch (**the pyramid**, marked when there are uncommitted changes, staged changes or conflicts), publish and sync, errors and warnings, remote indicator, notifications (**the Hotline**), Copilot (**the Board**) |
| Panels | New, split, kill, maximize, close, more actions, tasks, terminal profiles, output, debug console, ports |
| Trees and editors | Expand and collapse chevrons, new file and folder, refresh, collapse all, filter, clear, pin, close and dirty markers |
| Title bar | Back and forward, layout toggles, window controls |
| Debugging | Continue, pause, stop, restart, step over, into and out |

Only icons that VS Code identifies by name can be replaced. Extensions that draw their own image (for example Claude Code's logo) keep their icon.

## Typography

![Typography](images/screenshots/typography.png)

*Control* is set in commercial typefaces (Interstate for signage and interface, ITC Avant Garde Gothic for titles, Akzidenz-Grotesk for documents), so they cannot be bundled. The extension includes free alternatives under the SIL Open Font License and offers them the first time it starts:

| Option | Code (editor, terminal, debug console, code in chat) | Text (chat, Markdown preview) |
|---|---|---|
| **Bureau** (*Control*) | **Overpass Mono** — derived from *Highway Gothic*, the road-sign lettering Interstate is based on | **Overpass** |
| **Resonant** (*Control Resonant*) | **Space Mono** — geometric and retro-futuristic | **Space Grotesk** |
| **Follow the theme** | Resonant with CONTROL Resonant, Bureau with the other CONTROL themes, your own font with any other theme | |

- If you own **Interstate Mono** or **Interstate**, the Bureau option uses them first.
- The fonts are installed **only for your user**, without administrator rights. New fonts are loaded when VS Code starts, so restart it once after choosing.
- **Keep my font** restores your previous settings; **CONTROL: Remove Installed Fonts** also deletes the font files.
- VS Code does not allow changing the font of its own interface (menus, tabs).

## Optional sounds

Short sound effects inspired by both games. **Off by default**, and every event has its own switch. Turn them on with **CONTROL: Toggle Sounds** and listen to them with **CONTROL: Preview Sounds…**.

| Event | Default | Control pack | Resonant pack |
|---|---|---|---|
| VS Code starts | off | Low concrete hum of the Oldest House | Distant, warped city |
| Switching to a CONTROL theme | on | Old red-phone ring | Hedron pulse |
| Manual save (auto-save is ignored) | off | Rubber stamp | Metallic tick |
| New errors | on | Hiss-like whisper | Whisper with patterned echoes |
| Last error fixed | on | Control Point cleansed | Resonant defeated |
| Task or build succeeded | on | Elevator ding | Rising glass arpeggio |
| Task or build failed | on | Bureau alert | Gravity distortion |
| Terminal command failed | off | Radio static | Glitched static |
| Debugging started | on | Service Weapon transformation | Shape-shifting weapon |
| Breakpoint hit | on | Slide projector | Gravity shift |
| Git commit | on | Typewriter and bell | Metal hit with echoes |

**All sounds are original recreations** synthesized from scratch — no audio, music or voices from the games are included or downloaded. See [`sounds/LICENSES.md`](sounds/LICENSES.md).

**Custom sounds:** put `.wav` files named `startup.wav`, `theme.wav`, `save.wav`, `error.wav`, `clear.wav`, `build-ok.wav`, `build-fail.wav`, `terminal-fail.wav`, `debug.wav`, `breakpoint.wav` and `commit.wav` in a folder and point `bureauTheme.sounds.customFolder` to it. Only use audio you have the right to use.

**How it plays audio:** VS Code has no audio API for extensions, so the extension uses the system player — a background PowerShell process on Windows, `afplay` on macOS and `paplay`, `pw-play` or `aplay` on Linux. With Remote-SSH, WSL or Codespaces the sounds play on your local machine. Not available in the browser (vscode.dev).

## Settings

| Setting | Default | Description |
|---|---|---|
| `bureauTheme.font` | `none` | `bureau`, `resonant`, `auto` (follow the theme) or `none` (keep your font). |
| `bureauTheme.sounds.enabled` | `false` | Master switch for sounds. |
| `bureauTheme.sounds.pack` | `auto` | `auto` follows the theme, or force `control` or `resonant`. |
| `bureauTheme.sounds.volume` | `50` | 0–100. |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | Stay silent while another theme is active. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave` or `live`. |
| `bureauTheme.sounds.cooldownMs` | `1500` | Minimum time between sounds; more important ones can interrupt. |
| `bureauTheme.sounds.customFolder` | `""` | Folder with your own `.wav` files (user settings only). |
| `bureauTheme.sounds.events.*` | see above | One switch per event. |

Recommended settings:

```jsonc
{
  "workbench.iconTheme": "bureau-icons",
  "workbench.productIconTheme": "bureau-product-icons",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.semanticHighlighting.enabled": true
}
```

Comments, parameters and type parameters are *italic*. To turn italics off:

```jsonc
{
  "editor.tokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
      "textMateRules": [
        {
          "scope": ["comment", "variable.parameter", "entity.name.type.type-parameter", "variable.language", "markup.quote"],
          "settings": { "fontStyle": "" }
        }
      ]
    }
  },
  "editor.semanticTokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
      "rules": { "parameter": { "italic": false }, "typeParameter": { "italic": false }, "*.abstract": { "italic": false } }
    }
  }
}
```

## Tested languages

C#, Razor (`.cshtml`), JavaScript, TypeScript, JSON, HTML, CSS, SCSS, SQL, Markdown, XML, YAML, Python, Bash, diff and Git merge conflicts.

## Known limitations

- Semantic colours depend on each language extension (for C# and Razor, the official C# extension).
- The theme colours the Markdown **editor**; the Markdown **preview** uses its own stylesheet.
- Panels from other extensions (for example AI chat panels) are web views: they only follow the theme colours they choose to use.
- On Linux, sounds need `paplay` (PulseAudio/PipeWire), `pw-play` or `aplay` (ALSA).
- The *terminal command failed* sound requires terminal shell integration.

## Roadmap

- More variants: **Hiss** (aggressive red), **Ashtray Maze**, **Gravity Anomaly** and **Oldest House** (a lighter brutalist grey).
- A *Classified* mode that hides the values in `.env` files behind black bars while you share your screen.

See the [CHANGELOG](CHANGELOG.md) for the release history.

## Credits and disclaimer

Made by **Normalxxnavi**. Fonts: Overpass, Overpass Mono, Space Mono and Space Grotesk (SIL Open Font License, see [`fonts/`](fonts/README.md)). Everything else — colours, icons, glyphs and sounds — is original and released under the [MIT license](LICENSE).

Unofficial fan project. Not affiliated with or endorsed by Remedy Entertainment. CONTROL and CONTROL Resonant are trademarks of their respective owners. No game assets (images, logos, audio, music or text) are included.

**[Back to top](#theme-control)** · **[Español](#español)**

---

<a id="español"></a>

# Español

Theme CONTROL viste Visual Studio Code con el mundo brutalista de la Agencia Federal de Control: el hormigón de la Casa Inmemorial, el vacío blanco del Plano Astral y el Manhattan alterado de *CONTROL Resonant*. Es un pack completo, no solo colores: el marco del editor se rediseña como señalética de la Agencia, cada archivo y carpeta tiene su propio expediente, los iconos del propio VS Code se redibujan, y la tipografía y los sonidos de los juegos están a un clic.

## Qué incluye

| | |
|---|---|
| **4 temas de color** | **CONTROL Dark** (la Casa Inmemorial), **CONTROL Black** (OLED), **CONTROL Resonant** (el Manhattan alterado) y **CONTROL Astral** (el Plano Astral, tema claro). |
| **Bureau Icons** | Iconos de archivos y carpetas diseñados como expedientes de la Agencia: 498 iconos que cubren 340 extensiones, 284 nombres de archivo conocidos, 84 lenguajes y 278 nombres de carpeta con su propio emblema. Variantes oscura y clara. |
| **Bureau Product Icons** | Los iconos del propio VS Code redibujados: 166 iconos en la barra de actividad, la barra de estado, los paneles, los árboles, la barra de título y la barra de depuración, con **la pirámide invertida del Consejo** para Git y **el Consejo** para Copilot y el chat. |
| **Tipografía** *(opcional)* | Fuentes libres inspiradas en los juegos para el editor, la terminal y el chat, instaladas solo para tu usuario. |
| **Sonidos** *(opcionales, desactivados por defecto)* | Efectos de sonido originales al guardar, con errores, compilaciones, depuración y commits. |

## Los temas

### CONTROL Dark — La Casa Inmemorial

![CONTROL Dark](images/screenshots/theme-dark.png)

El tema de referencia, inspirado en *Control* (2019). Hormigón gris carbón cálido, texto color hueso y **rojo FBC** como acento: el color de la señalética de la Agencia y del Arma de Servicio de Jesse. El rojo se usa con moderación: el marco, los elementos activos y las palabras clave de control de flujo (`if`, `return`, `throw`), mientras que las declaraciones van en tonos apagados para que el código se lea con calma durante horas.

### CONTROL Black — El Plano Astral en negativo

![CONTROL Black](images/screenshots/theme-black.png)

Negro puro para pantallas OLED. Las líneas de señalética, el cursor y los brillos pasan a **blanco astral**, como si el Plano Astral se hubiera impreso en negativo; el rojo FBC queda solo para la selección y pequeños detalles. Es el tema más oscuro del conjunto, con las mismas garantías de contraste que CONTROL Dark.

### CONTROL Resonant — El Manhattan alterado

![CONTROL Resonant](images/screenshots/theme-resonant.png)

Inspirado en *Control Resonant* (2026): grises fríos de asfalto mojado, azul acero y el **cian de resonancia** pálido del Hedrón. Siguiendo la dirección de arte del juego, **el rojo pertenece al Hiss**: en este tema solo aparece en errores y eliminaciones, así que cuando ves rojo, algo va mal de verdad. Combina con la tipografía *Resonant* (Space Mono y Space Grotesk).

### CONTROL Astral — El Plano Astral

![CONTROL Astral](images/screenshots/theme-astral.png)

El único tema claro: un vacío blanco enmarcado por geometría negra, como el Plano Astral, con el rojo FBC reservado para pequeños detalles. Pensado para leer bien en espacios luminosos y comprobado con objetivos de contraste **AAA** más estrictos: texto 16,8:1, código como mínimo 7:1 y comentarios 6,75:1.

### Más que colores: la señalética de la Agencia

- **El monolito.** La barra de actividad, la barra de estado y la barra de título forman un bloque oscuro (también en Astral) que sostiene el editor, la barra lateral y el panel. Tres profundidades: monolito, barra lateral, editor.
- **Cabeceras de señalética.** Los títulos de la barra lateral (*Explorador*, *Buscar*…) son bandas de monolito con una línea de acento debajo; las secciones se separan con finas líneas de acento.
- **Luz astral.** Los elementos activos del marco brillan en blanco puro, como la luz del Plano Astral.
- **Brillo de acento.** Los elementos flotantes (paleta de comandos, sugerencias, tooltips) y el borde del contenido desplazado brillan con el color del tema: rojo FBC, cian de resonancia o blanco astral.
- **Detalles del editor.** El número de la línea actual, la guía de sangría activa, los corchetes emparejados y las reglas usan el acento; una línea de acento recorre las pestañas; el margen de números de línea es una franja de hormigón más oscura.
- **Paneles de chat.** Burbujas de «expediente» elevadas, bloques de código enmarcados con el acento y avatares de monolito.

Reglas de diseño:

- **Primero, que se lea.** Todos los colores de texto se comprueban con los ratios de contraste WCAG (texto ≥ 7:1, código ≥ 4,5:1); CONTROL Astral cumple objetivos AAA más estrictos.
- **El rojo, con moderación.** Solo las palabras clave de control de flujo van en rojo; las declaraciones (`public`, `const`, `class`…) usan un tono apagado.
- **Activo no es roto.** El color de error nunca es el color de acento, así que un subrayado de error nunca se confunde con un elemento activo.
- **Cobertura completa.** 687 claves de color de la interfaz (incluida la *interfaz moderna* de VS Code 1.140), los 16 colores ANSI de la terminal, Git, editores de diferencias y fusión, pares de corchetes y **resaltado semántico** (incluidos C#/Roslyn y Razor).

## Instalación

1. Instala **Theme CONTROL** desde el Marketplace (o ejecuta `code --install-extension bureau-theme-<versión>.vsix`).
2. Pulsa <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> en macOS) y elige **CONTROL Dark**, **CONTROL Black**, **CONTROL Resonant** o **CONTROL Astral**.
3. Ejecuta **Preferencias: Tema de icono de archivo** → **Bureau Icons**.
4. Ejecuta **Preferencias: Tema de icono de producto** → **Bureau Product Icons**.
5. La primera vez que se inicia, la extensión ofrece la tipografía de los juegos; también puedes ejecutar **CONTROL: Elegir tipografía…** cuando quieras.

## Bureau Icons

![Bureau Icons](images/screenshots/bureau-icons.png)

Cada archivo es un **expediente de la Agencia**: una hoja maciza del color de su lenguaje, con la esquina doblada y una banda de clasificación, y su código (`TS`, `C#`, `PY`…) o un pictograma recortado. Cada carpeta es maciza, del color de su categoría, y lleva un **emblema**: `</>` para `src`, un check para `test`, una montaña para `images`, una onda para `sounds`, la pirámide para `.git`, una tuerca hexagonal para `.vscode`, un cubo para `node_modules`, un prompt para `scripts`, un globo para `l10n`, un escudo para `auth`…

- **Cobertura:** lenguajes de programación, web, .NET (`.csproj`, `.sln`, `appsettings.json`…), configuración de las herramientas habituales (Vite, Webpack, ESLint, Prettier, Jest, Vitest, Playwright, Tailwind, Next, Nuxt, Angular…), gestores de paquetes y archivos de bloqueo, Docker y CI, documentos, imágenes, audio, vídeo, fuentes, archivos comprimidos, certificados y claves.
- **Detalles del lore:** los archivos `.env` son un **documento clasificado y censurado**; los tests llevan el **Hedrón**; los archivos de instrucciones para IA (`CLAUDE.md`, `AGENTS.md`, `*.prompt.md`…) llevan **el Consejo**; la carpeta raíz de un área de trabajo con varias raíces es **la pirámide invertida del Consejo**.
- Todos los iconos tienen variante oscura y clara, así que se leen bien en CONTROL Astral y en cualquier otro tema claro.

## Bureau Product Icons

![Bureau Product Icons](images/screenshots/bureau-product-icons.png)

Redibuja los iconos que dibuja el propio VS Code con glifos geométricos y brutalistas: octógonos en lugar de círculos, puntos cuadrados y trazos gruesos. Funcionan con la barra de actividad a un lado, arriba o abajo.

| Dónde | Qué cambia |
|---|---|
| Barra de actividad | Explorador (un expediente), Buscar (una lupa), Control de código fuente (**la pirámide invertida**), Ejecutar y depurar (el Hedrón), Extensiones (bloques de sector), Pruebas, Cuentas (la placa de la FBC), Administrar (una tuerca hexagonal) |
| Barra de estado | Rama de Git (**la pirámide**, marcada cuando hay cambios sin confirmar, cambios preparados o conflictos), publicar y sincronizar, errores y advertencias, indicador remoto, notificaciones (**la Línea Directa**), Copilot (**el Consejo**) |
| Paneles | Nuevo, dividir, cerrar proceso, maximizar, cerrar, más acciones, tareas, perfiles de terminal, salida, consola de depuración, puertos |
| Árboles y editores | Flechas de expandir y contraer, nuevo archivo y carpeta, actualizar, contraer todo, filtrar, borrar, anclar, cerrar y marcas de cambios sin guardar |
| Barra de título | Atrás y adelante, botones de diseño, controles de ventana |
| Depuración | Continuar, pausar, detener, reiniciar, depurar paso a paso por procedimientos, por instrucciones y para salir |

Solo se pueden sustituir los iconos que VS Code identifica por su nombre. Las extensiones que dibujan su propia imagen (por ejemplo, el logotipo de Claude Code) mantienen su icono.

## Tipografía

![Tipografía](images/screenshots/typography.png)

*Control* usa tipografías comerciales (Interstate para la señalética y la interfaz, ITC Avant Garde Gothic para los títulos, Akzidenz-Grotesk para los documentos), así que no se pueden incluir. La extensión trae alternativas libres con licencia SIL Open Font License y las ofrece la primera vez que se inicia:

| Opción | Código (editor, terminal, consola de depuración, código en el chat) | Texto (chat, vista previa de Markdown) |
|---|---|---|
| **Bureau** (*Control*) | **Overpass Mono**: derivada de *Highway Gothic*, la rotulación de carreteras en la que se basa Interstate | **Overpass** |
| **Resonant** (*Control Resonant*) | **Space Mono**: geométrica y retrofuturista | **Space Grotesk** |
| **Según el tema** | Resonant con CONTROL Resonant, Bureau con los demás temas CONTROL y tu propia fuente con cualquier otro tema | |

- Si tienes **Interstate Mono** o **Interstate**, la opción Bureau las usa primero.
- Las fuentes se instalan **solo para tu usuario**, sin permisos de administrador. VS Code carga las fuentes nuevas al iniciarse, así que reinícialo una vez después de elegir.
- **Mantener mi fuente** restaura tu configuración anterior; **CONTROL: Quitar las fuentes instaladas** borra además los archivos de fuente.
- VS Code no permite cambiar la fuente de su propia interfaz (menús, pestañas).

## Sonidos opcionales

Efectos de sonido cortos inspirados en los dos juegos. **Desactivados por defecto**, y cada evento tiene su propio interruptor. Actívalos con **CONTROL: Activar/desactivar sonidos** y escúchalos con **CONTROL: Probar sonidos…**.

| Evento | Por defecto | Pack Control | Pack Resonant |
|---|---|---|---|
| Se inicia VS Code | no | Zumbido grave del hormigón de la Casa Inmemorial | Ciudad lejana y distorsionada |
| Cambiar a un tema CONTROL | sí | Timbre del viejo teléfono rojo | Pulso del Hedrón |
| Guardado manual (se ignora el guardado automático) | no | Sello de goma | Tic metálico |
| Nuevos errores | sí | Susurro del Hiss | Susurro con ecos alterados |
| Último error corregido | sí | Punto de Control purificado | Resonante derrotado |
| Tarea o compilación correcta | sí | Campanilla del ascensor | Arpegio de cristal ascendente |
| Tarea o compilación fallida | sí | Alerta de la Agencia | Distorsión gravitatoria |
| Falla un comando de la terminal | no | Estática de radio | Estática con glitch |
| Empieza la depuración | sí | Transformación del Arma de Servicio | Arma que cambia de forma |
| Se alcanza un punto de interrupción | sí | Proyector de diapositivas | Cambio de gravedad |
| Commit de Git | sí | Máquina de escribir y campanilla | Golpe metálico con ecos |

**Todos los sonidos son recreaciones originales** sintetizadas desde cero: no se incluye ni se descarga audio, música ni voces de los juegos. Consulta [`sounds/LICENSES.md`](sounds/LICENSES.md).

**Sonidos propios:** pon archivos `.wav` llamados `startup.wav`, `theme.wav`, `save.wav`, `error.wav`, `clear.wav`, `build-ok.wav`, `build-fail.wav`, `terminal-fail.wav`, `debug.wav`, `breakpoint.wav` y `commit.wav` en una carpeta y apunta `bureauTheme.sounds.customFolder` a ella. Usa solo audio que tengas derecho a usar.

**Cómo reproduce el audio:** VS Code no tiene una API de audio para extensiones, así que la extensión usa el reproductor del sistema: un proceso de PowerShell en segundo plano en Windows, `afplay` en macOS y `paplay`, `pw-play` o `aplay` en Linux. Con Remote-SSH, WSL o Codespaces los sonidos suenan en tu equipo local. No está disponible en el navegador (vscode.dev).

## Configuración

| Ajuste | Por defecto | Descripción |
|---|---|---|
| `bureauTheme.font` | `none` | `bureau`, `resonant`, `auto` (según el tema) o `none` (mantener tu fuente). |
| `bureauTheme.sounds.enabled` | `false` | Interruptor general de los sonidos. |
| `bureauTheme.sounds.pack` | `auto` | `auto` sigue al tema; también puedes forzar `control` o `resonant`. |
| `bureauTheme.sounds.volume` | `50` | De 0 a 100. |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | Silencio mientras esté activo otro tema. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave` (al guardar) o `live` (en directo). |
| `bureauTheme.sounds.cooldownMs` | `1500` | Tiempo mínimo entre sonidos; los más importantes pueden interrumpir. |
| `bureauTheme.sounds.customFolder` | `""` | Carpeta con tus propios `.wav` (solo en la configuración de usuario). |
| `bureauTheme.sounds.events.*` | ver arriba | Un interruptor por evento. |

Configuración recomendada:

```jsonc
{
  "workbench.iconTheme": "bureau-icons",
  "workbench.productIconTheme": "bureau-product-icons",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.semanticHighlighting.enabled": true
}
```

Los comentarios, los parámetros y los parámetros de tipo van en *cursiva*. Para quitarla:

```jsonc
{
  "editor.tokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
      "textMateRules": [
        {
          "scope": ["comment", "variable.parameter", "entity.name.type.type-parameter", "variable.language", "markup.quote"],
          "settings": { "fontStyle": "" }
        }
      ]
    }
  },
  "editor.semanticTokenColorCustomizations": {
    "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
      "rules": { "parameter": { "italic": false }, "typeParameter": { "italic": false }, "*.abstract": { "italic": false } }
    }
  }
}
```

## Lenguajes probados

C#, Razor (`.cshtml`), JavaScript, TypeScript, JSON, HTML, CSS, SCSS, SQL, Markdown, XML, YAML, Python, Bash, diff y conflictos de fusión de Git.

## Limitaciones conocidas

- Los colores semánticos dependen de la extensión de cada lenguaje (para C# y Razor, la extensión oficial de C#).
- El tema colorea el **editor** de Markdown; la **vista previa** de Markdown usa su propia hoja de estilos.
- Los paneles de otras extensiones (por ejemplo, los chats de IA) son vistas web: solo siguen los colores del tema que ellas decidan usar.
- En Linux, los sonidos necesitan `paplay` (PulseAudio/PipeWire), `pw-play` o `aplay` (ALSA).
- El sonido de *falla un comando de la terminal* necesita la integración del shell en la terminal.

## Próximamente

- Más variantes: **Hiss** (rojo agresivo), **Ashtray Maze**, **Gravity Anomaly** y **Oldest House** (un gris brutalista más claro).
- Un modo *Clasificado* que oculta los valores de los archivos `.env` tras barras negras mientras compartes pantalla.

Consulta el [CHANGELOG](CHANGELOG.md) para ver el historial de versiones.

## Créditos y aviso legal

Hecho por **Normalxxnavi**. Fuentes: Overpass, Overpass Mono, Space Mono y Space Grotesk (SIL Open Font License, ver [`fonts/`](fonts/README.md)). Todo lo demás (colores, iconos, glifos y sonidos) es original y se publica con [licencia MIT](LICENSE).

Proyecto fan no oficial. Sin relación con Remedy Entertainment ni respaldado por ella. CONTROL y CONTROL Resonant son marcas registradas de sus respectivos propietarios. No se incluye ningún recurso de los juegos (imágenes, logotipos, audio, música ni textos).

**[Volver arriba](#theme-control)** · **[English](#english)**
