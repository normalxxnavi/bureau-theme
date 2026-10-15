# Bureau — CONTROL Fan Theme

![CONTROL Dark](images/screenshots/control-dark.png)

Four colour themes for Visual Studio Code inspired by Remedy's *Control* and *Control Resonant*, with a matching file icon theme and product icon theme. The games' typography and sound effects are optional extras.

*Beta · Unofficial fan work, not approved or endorsed by Remedy Entertainment Plc or its affiliates.*

**English** · **[Español](#español)**

---

## Themes

### CONTROL Dark

The Oldest House: warm charcoal concrete, bone-white text and FBC red as the accent, used with restraint. Shown above.

### CONTROL Black

True black for OLED screens, with astral-white signage and red only for small details.

![CONTROL Black](images/screenshots/control-black.png)

### CONTROL Resonant

Patterned Manhattan from *Control Resonant*: wet-asphalt greys, steel blue and resonance cyan. Red only appears for errors and deletions.

![CONTROL Resonant](images/screenshots/control-resonant.png)

### CONTROL Astral

The light theme: a white void framed by black geometry. Body text reaches 16.8:1 contrast (WCAG AAA).

![CONTROL Astral](images/screenshots/control-astral.png)

Every theme covers 687 interface colours (including VS Code's *modern UI*), the 16 terminal colours, diff and merge editors, bracket pairs and semantic highlighting (C#, Razor, TypeScript, Python…). All text colours are checked against WCAG before each release.

## Install

1. Install **Bureau — CONTROL Fan Theme** from the Marketplace.
2. <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> on macOS) and pick a **CONTROL** theme.
3. **Preferences: File Icon Theme** → **Bureau Icons**.
4. **Preferences: Product Icon Theme** → **Bureau Product Icons** or **Bureau Product Icons (Color)**.

## Icons

![Bureau Icons and Bureau Product Icons (Color) on CONTROL Dark](images/screenshots/icons-dark.png)

![Bureau Icons and Bureau Product Icons on CONTROL Astral](images/screenshots/icons-astral.png)

**Bureau Icons** — 498 file and folder icons (340 extensions, 284 file names, 84 languages and 278 folder names), with dark and light variants. Files carry their code (`TS`, `C#`, `PY`…) or a pictogram over a classification band; folders are coloured by category and carry an emblem. Every icon is drawn on the 16 px pixel grid, so it stays sharp on displays at 100 % scaling.

**Bureau Product Icons** — 350 of VS Code's own icons redrawn: activity bar, status bar, toolbars, trees, debugging and window controls. The activity bar icons have their own 24 px drawings. Two versions: the theme colour, or **Color** with fixed colours per object.

| In VS Code | From the games |
|---|---|
| Explorer | Bureau dossier |
| Source Control | Ashtray Maze |
| Git branch | The Board's inverted pyramid (marked with changes, staged or conflicts) |
| Run and Debug | The rubber duck |
| Testing | The Hedron |
| Copilot and chat | Polaris |
| Notifications | The Hotline |
| Remote | The Threshold |

## Typography (optional)

The first time the extension starts it offers free fonts inspired by the games, installed only for your user (no administrator rights). Change it any time with **CONTROL: Choose Typography…**.

| Option | Code (editor, terminal) | Text (chat, Markdown preview) |
|---|---|---|
| **Bureau** | Overpass Mono | Overpass |
| **Resonant** | Space Mono | Space Grotesk |
| **Follow the theme** | Resonant with CONTROL Resonant, Bureau with the others | |

If you own Interstate Mono or Interstate, the Bureau option uses them first. **Keep my font** restores your previous settings and **CONTROL: Remove Installed Fonts** deletes the font files.

## Sound effects (optional)

![Sound console](images/screenshots/sounds.png)

Short sound effects, **off by default**. Click the sound icon in the status bar (or run **CONTROL: Open Sound Console…**) to turn them on, pick the *Control* or *Resonant* pack, set the volume and choose which events play a sound:

| Event | Default |
|---|---|
| VS Code starts | off |
| Switching to a CONTROL theme | on |
| Manual save | off |
| Typing in the editor | on |
| New errors / last error fixed | on |
| Task succeeded / failed | on |
| Terminal command failed | off |
| Debugging started / breakpoint hit | on |
| Git commit | on |

All sounds are original recreations synthesized for this extension; no audio from the games is included. VS Code has no audio API, so the system player is used (PowerShell on Windows, `afplay` on macOS, `paplay`, `pw-play` or `aplay` on Linux).

## Settings

| Setting | Default | Description |
|---|---|---|
| `bureauTheme.font` | `none` | `bureau`, `resonant`, `auto` (follow the theme) or `none`. |
| `bureauTheme.sounds.enabled` | `false` | Master switch for sounds. |
| `bureauTheme.sounds.statusBarItem` | `true` | Show the sound icon in the status bar. |
| `bureauTheme.sounds.pack` | `auto` | `auto`, `control` or `resonant`. |
| `bureauTheme.sounds.volume` | `70` | 0–100. |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | Stay silent while another theme is active. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave` or `live`. |
| `bureauTheme.sounds.cooldownMs` | `1500` | Minimum time between sounds. |
| `bureauTheme.sounds.customFolder` | `""` | Folder with your own `.wav` files (user settings only). |
| `bureauTheme.sounds.events.*` | see above | One switch per event. |

Comments and parameters are *italic*. To turn italics off:

```jsonc
"editor.tokenColorCustomizations": {
  "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
    "textMateRules": [{ "scope": ["comment", "variable.parameter", "entity.name.type.type-parameter", "variable.language", "markup.quote"], "settings": { "fontStyle": "" } }]
  }
},
"editor.semanticTokenColorCustomizations": {
  "[CONTROL Dark][CONTROL Black][CONTROL Resonant][CONTROL Astral]": {
    "rules": { "parameter": { "italic": false }, "typeParameter": { "italic": false }, "*.abstract": { "italic": false } }
  }
}
```

## Known limitations

- Semantic colours depend on each language extension (for C# and Razor, the official C# extension).
- Panels drawn by other extensions (web views) only use the theme colours they choose to.
- On Linux, sounds need `paplay`, `pw-play` or `aplay`; the *terminal command failed* sound needs shell integration.

## Privacy and security

No network connections and no telemetry. The themes and icons are static files; the optional sounds and typography only use the system audio player and your user fonts folder. In untrusted workspaces, sound settings from the workspace are ignored. See [SECURITY.md](SECURITY.md) for details and how to report a vulnerability.

## Credits

Made by **Normalxxnavi** · [Changelog](CHANGELOG.md) · [MIT license](LICENSE). Fonts: Overpass, Overpass Mono, Space Mono and Space Grotesk (SIL Open Font License, see [`fonts/`](fonts/README.md)). Colours, icons and sounds are original.

CONTROL and CONTROL Resonant are trademarks of their respective owners and are only used to describe what inspired this theme. No game assets are included.

---

<a id="español"></a>

# Español

Cuatro temas de color para Visual Studio Code inspirados en *Control* y *Control Resonant* de Remedy, con tema de iconos de archivo y de iconos de interfaz a juego. La tipografía de los juegos y los efectos de sonido son extras opcionales.

*Beta · Obra fan no oficial, sin aprobación ni respaldo de Remedy Entertainment Plc ni de sus filiales.*

## Temas

- **CONTROL Dark** — la Casa Inmemorial: hormigón cálido, texto hueso y el rojo del FBC como acento, con mesura (captura de arriba).
- **CONTROL Black** — negro puro para pantallas OLED, señalética en blanco astral y rojo solo en detalles.
- **CONTROL Resonant** — el Manhattan alterado de *Control Resonant*: grises de asfalto mojado, azul acero y cian de resonancia. El rojo solo aparece en errores y borrados.
- **CONTROL Astral** — el tema claro: vacío blanco enmarcado en geometría negra. El texto llega a 16,8:1 de contraste (WCAG AAA).

Cada tema cubre 687 colores de la interfaz (incluida la *modern UI* de VS Code), los 16 colores de la terminal, los editores de diff y merge, los pares de corchetes y el resaltado semántico (C#, Razor, TypeScript, Python…). Todos los colores de texto se comprueban con WCAG antes de cada versión.

## Instalación

1. Instala **Bureau — CONTROL Fan Theme** desde el Marketplace.
2. <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> en macOS) y elige un tema **CONTROL**.
3. **Preferencias: Tema de icono de archivo** → **Bureau Icons**.
4. **Preferencias: Tema de icono de producto** → **Bureau Product Icons** o **Bureau Product Icons (Color)**.

## Iconos

**Bureau Icons** — 498 iconos de archivo y carpeta (340 extensiones, 284 nombres de archivo, 84 lenguajes y 278 nombres de carpeta), en variante oscura y clara. Los archivos llevan su código (`TS`, `C#`, `PY`…) o un pictograma sobre una franja de clasificación; las carpetas van del color de su categoría y llevan un emblema. Todos están dibujados en la rejilla de píxeles de 16 px, así que se ven nítidos en pantallas al 100 %.

**Bureau Product Icons** — 350 iconos propios de VS Code redibujados: barra de actividad, barra de estado, barras de herramientas, árboles, depuración y controles de ventana. Los de la barra de actividad tienen su propio dibujo a 24 px. Dos versiones: el color del tema, o **Color** con colores fijos para cada objeto.

| En VS Code | De los juegos |
|---|---|
| Explorador | Expediente del Bureau |
| Control de código fuente | Laberinto del Cenicero |
| Rama de Git | La pirámide invertida del Consejo (con marca si hay cambios, preparados o conflictos) |
| Ejecutar y depurar | El patito de goma |
| Pruebas | La Hedron |
| Copilot y chat | Polaris |
| Notificaciones | La Hotline |
| Remoto | El Umbral |

## Tipografía (opcional)

La primera vez que arranca, la extensión ofrece fuentes libres inspiradas en los juegos, instaladas solo para tu usuario (sin permisos de administrador). Se cambia cuando quieras con **CONTROL: Elegir tipografía…**.

| Opción | Código (editor, terminal) | Texto (chat, vista previa de Markdown) |
|---|---|---|
| **Bureau** | Overpass Mono | Overpass |
| **Resonant** | Space Mono | Space Grotesk |
| **Según el tema** | Resonant con CONTROL Resonant, Bureau con los demás | |

Si tienes Interstate Mono o Interstate, la opción Bureau las usa primero. **Mantener mi tipografía** restaura tus ajustes anteriores y **CONTROL: Quitar las tipografías instaladas** borra los archivos de fuente.

## Efectos de sonido (opcionales)

Sonidos cortos, **desactivados por defecto**. Pulsa el icono de sonido de la barra de estado (o ejecuta **CONTROL: Abrir la consola de sonido…**) para activarlos, elegir el pack *Control* o *Resonant*, ajustar el volumen y decidir qué eventos suenan: arrancar VS Code, cambiar a un tema CONTROL, guardar, escribir, errores nuevos o resueltos, tareas, comandos de terminal fallidos, depuración y commits de Git.

Todos los sonidos son recreaciones originales sintetizadas para esta extensión; no incluye audio de los juegos. VS Code no tiene API de audio, así que se usa el reproductor del sistema (PowerShell en Windows, `afplay` en macOS, `paplay`, `pw-play` o `aplay` en Linux).

## Ajustes

Los mismos que en la [tabla en inglés](#settings): `bureauTheme.font` y `bureauTheme.sounds.*`. La carpeta de sonidos propios (`bureauTheme.sounds.customFolder`) solo se puede fijar en los ajustes de usuario.

## Privacidad y seguridad

Sin conexiones de red ni telemetría. Los temas y los iconos son archivos estáticos; los sonidos y la tipografía opcionales solo usan el reproductor de audio del sistema y tu carpeta de fuentes de usuario. En áreas de trabajo no confiables se ignoran los ajustes de sonido del área de trabajo. Los detalles y cómo informar de una vulnerabilidad están en [SECURITY.md](SECURITY.md).

## Créditos

Hecho por **Normalxxnavi** · [Cambios](CHANGELOG.md) · [Licencia MIT](LICENSE). Fuentes: Overpass, Overpass Mono, Space Mono y Space Grotesk (SIL Open Font License, ver [`fonts/`](fonts/README.md)). Los colores, los iconos y los sonidos son originales.

CONTROL y CONTROL Resonant son marcas de sus respectivos propietarios y solo se usan para describir en qué se inspira este tema. No incluye recursos de los juegos.
