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

Every theme covers 687 interface colours (including VS Code's *modern UI*), the 16 terminal colours, diff and merge editors, bracket pairs and semantic highlighting (C#, Razor, TypeScript, Python, Rust, Java, C/C++, Dart…). All text colours are checked against WCAG before each release.

**Any language.** Syntax colours are checked token by token against samples of the 70 languages that VS Code ships and 72 more that come with extensions (Kotlin, Scala, Elixir, Haskell, Zig, Vue, Svelte, Terraform, Solidity, COBOL, Fortran…), and scope by scope against the grammars of about 240 languages, so no part of your code is left in plain text colour.

## Install

1. Install **Bureau — CONTROL Fan Theme** from the Marketplace. The **welcome guide** opens: it sets everything up step by step (open it again with **CONTROL: Open Welcome Guide**).
2. Or in one step: **CONTROL: Apply the Full Set (Theme and Icons)…** applies a CONTROL theme, Bureau Icons and Bureau Product Icons, and can be undone.
3. Or by hand: <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> on macOS) for a **CONTROL** theme, **Preferences: File Icon Theme** → **Bureau Icons** and **Preferences: Product Icon Theme** → **Bureau Product Icons** or **Bureau Product Icons (Color)**.

**Light by day, dark by night:** **CONTROL: Follow the System Light/Dark Mode…** uses CONTROL Astral while your system is in light mode and the dark CONTROL theme you choose in dark mode.

## The Oldest House

Everything in one place: click the **Oldest House** — the windowless monolith in the status bar — (or run **CONTROL: Open the Oldest House…**) to change the colour theme, apply the full set, pick the file and product icons, follow the system light/dark mode, choose the typography, open the sound console and the Songmaster jukebox, open the official soundtracks and set up the Bureau protocols. Each option shows its current state and takes you back to the Oldest House. Its popup — like the ones of the jukebox, the alert level and Classified mode — is a small card with the object, coloured status labels and buttons you can click. Hide the icon from the Oldest House itself, by right-clicking the status bar or with `bureauTheme.statusBarItem`.

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

Free fonts inspired by the games, installed only for your user (no administrator rights) on Windows, macOS and Linux. Pick them in the welcome guide or any time with **CONTROL: Choose Typography…**.

| Option | Code (editor, terminal) | Text (chat, Markdown preview) |
|---|---|---|
| **Bureau** | Overpass Mono | Overpass |
| **Resonant** | Space Mono | Space Grotesk |
| **Follow the theme** | Resonant with CONTROL Resonant, Bureau with the others | |

If you own Interstate Mono or Interstate, the Bureau option uses them first. **Keep my font** restores your previous settings and **CONTROL: Remove Installed Fonts** deletes the font files.

## Sound effects (optional)

![Sound console](images/screenshots/sounds.png)

Short sound effects, **off by default**. Open **Sounds** in the Oldest House (or run **CONTROL: Open Sound Console…**) to turn them on, pick the *Control* or *Resonant* pack, set the volume and choose which events play a sound:

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

The volume goes up to **200 %**: above 100 the sounds are amplified (up to +6 dB) with a soft limiter, for loud music or small speakers. They are mastered for any speaker, so they can be heard on a laptop or with small headphones too.

All sounds are original recreations synthesized for this extension; no audio from the games is included. VS Code has no audio API, so the system player is used (PowerShell on Windows, `afplay` on macOS, `paplay`, `pw-play` or `aplay` on Linux, also when VS Code is installed as a Flatpak).

## Songmaster jukebox (optional)

What is playing on your computer — in Spotify or **any player** (the browser, Apple Music, VLC…) — in the status bar, next to the Oldest House, with **previous, play/pause and next**. Hover over the song for the player: the album cover (from your system, never downloaded), the song, its state and clickable controls. It reads the music from the system itself: the Windows media session, Spotify and Music on macOS (macOS asks your permission the first time) and any MPRIS player on Linux. No Spotify account, no login and nothing leaves your computer. **Off by default**: **CONTROL: Turn the Songmaster Jukebox On/Off**, or from the Oldest House.

It also opens the official music of both games in Spotify: [Control (Original Soundtrack)](https://open.spotify.com/album/0cS6rif4qDxklIaFKME68N), [CONTROL Resonant (Original Soundtrack)](https://open.spotify.com/album/5LxLCAfp8l1USzUOSIbgHP), [Zoe's Mixtape](https://open.spotify.com/album/3tvQ7tUbztcIdUMHQDXkT7) and Old Gods of Asgard's [Take Control](https://open.spotify.com/album/3Xcl0pytPYqJUSTi2S8jtI) and [Rebirth – Greatest Hits](https://open.spotify.com/album/0LZhC50aIf7O233yj7IH4Z). Only links: the music belongs to Remedy and its artists and is not included.

## Bureau protocols (optional)

Three extras from the lore that are actually useful, all **off by default** (turn them on in the Oldest House, in the welcome guide or with their commands):

- **Classified mode** — covers secrets with redaction bars so you can share your screen or stream safely: every value in `.env` files, keys and certificates, and any value whose name looks like a secret (`password`, `token`, `apiKey`, connection strings…) in `appsettings.json`, `.npmrc`, `docker-compose.yml` and similar files. Put the cursor on a line to reveal it; the *Classified* icon in the status bar reveals the whole file until you click it again. The file is never changed. **CONTROL: Turn Classified Mode On/Off**.
- **Bureau alert level** — a status bar indicator that goes from **Clear** to **Anomaly** (warnings), **Alert** (errors) and **Hiss Incursion** (10 errors or more). Click it to open the Problems panel. **CONTROL: Show/Hide Bureau Alert Level**.
- **The Board** — speaks `<<IN ITS OWN VOICE.>>` at **random moments of the day** (3 a day by default, as a notification with *Another message* and *No more today*), never while you debug. Choose how many times a day, the hours (for example 09:00–18:00), where they appear (notification, status bar or both) and whether it uses its messages, **your own messages** or both: **CONTROL: Configure the Board…**. It can also comment quietly in the status bar on your commits, tasks, debugging sessions, the last error fixed and the first start of the day, and **CONTROL: Message from the Board** asks it at any time. Its 87 messages are original, written for this theme in English and Spanish.

## Settings

| Setting | Default | Description |
|---|---|---|
| `bureauTheme.font` | `none` | `bureau`, `resonant`, `auto` (follow the theme) or `none`. |
| `bureauTheme.sounds.enabled` | `false` | Master switch for sounds. |
| `bureauTheme.statusBarItem` | `true` | Show the Oldest House icon in the status bar. |
| `bureauTheme.sounds.pack` | `auto` | `auto`, `control` or `resonant`. |
| `bureauTheme.sounds.volume` | `80` | 0–200 (above 100, amplified with a soft limiter). |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | Stay silent while another theme is active. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave` or `live`. |
| `bureauTheme.sounds.cooldownMs` | `1500` | Minimum time between sounds. |
| `bureauTheme.sounds.customFolder` | `""` | Folder with your own `.wav` files (user settings only). |
| `bureauTheme.sounds.events.*` | see above | One switch per event. |
| `bureauTheme.classified.enabled` | `false` | Classified mode. |
| `bureauTheme.classified.files` | `.env`, `*.pem`, `appsettings*.json`… | Files where Classified mode applies (glob patterns). |
| `bureauTheme.classified.keywords` | `password`, `token`, `apikey`… | Words that mark a value as secret (plain words, not regular expressions). |
| `bureauTheme.alertLevel.enabled` | `false` | Bureau alert level in the status bar. |
| `bureauTheme.alertLevel.incursionThreshold` | `10` | Errors from which the level is *Hiss Incursion*. |
| `bureauTheme.board.comments` | `false` | Board comments in the status bar. |
| `bureauTheme.board.random` | `false` | Random Board messages during the day (user settings only). |
| `bureauTheme.board.timesPerDay` | `3` | How many random messages a day. |
| `bureauTheme.board.hours` | `""` | Hours for them, for example `09:00-18:00` (empty: any time). |
| `bureauTheme.board.display` | `notification` | `notification`, `statusBar` or `both`. |
| `bureauTheme.board.source` | `all` | `all` (the Board's and yours), `board` or `custom`. |
| `bureauTheme.board.customMessages` | `[]` | Your own messages (user settings only). |
| `bureauTheme.music.enabled` | `false` | Songmaster jukebox (user settings only). |
| `bureauTheme.music.source` | `any` | `any` player or only `spotify`. |
| `bureauTheme.music.controls` | `true` | Previous, play/pause and next buttons next to the song. |

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
- Classified mode draws bars over the editor: values can still be seen in places it does not reach (search results, the minimap as blocks, hovers of other extensions), and when a file is opened VS Code shows it for an instant before the bars are drawn. Turn it on before opening the file you want to protect.
- The Songmaster jukebox shows what the system reports: on macOS only Spotify and Music, without album covers (the jukebox is shown instead); on Linux it needs `gdbus` (it comes with GLib on GNOME, KDE and most desktops) and shows the cover only when the player saves it as a local file of up to 48 KB.

## Privacy and security

No network connections and no telemetry. The themes and icons are static files; the optional sounds and typography only use the system audio player and your user fonts folder, Classified mode only reads the open file to know what to cover, and the jukebox only reads the title, artist and album your system reports. In untrusted workspaces, sound settings from the workspace are ignored. See [SECURITY.md](SECURITY.md) for details and how to report a vulnerability.

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

Cada tema cubre 687 colores de la interfaz (incluida la *modern UI* de VS Code), los 16 colores de la terminal, los editores de diff y merge, los pares de corchetes y el resaltado semántico (C#, Razor, TypeScript, Python, Rust, Java, C/C++, Dart…). Todos los colores de texto se comprueban con WCAG antes de cada versión.

**Cualquier lenguaje.** Los colores de la sintaxis se comprueban token a token con muestras de los 70 lenguajes que trae VS Code y de 72 más que llegan con extensiones (Kotlin, Scala, Elixir, Haskell, Zig, Vue, Svelte, Terraform, Solidity, COBOL, Fortran…), y scope a scope con las gramáticas de unos 240 lenguajes, para que ninguna parte de tu código se quede con el color de texto plano.

## Instalación

1. Instala **Bureau — CONTROL Fan Theme** desde el Marketplace. Se abre la **guía de bienvenida**, que lo configura todo paso a paso (vuelve a abrirla con **CONTROL: Abrir la guía de bienvenida**).
2. O en un solo paso: **CONTROL: Aplicar el set completo (tema e iconos)…** aplica un tema CONTROL, Bureau Icons y Bureau Product Icons, y se puede deshacer.
3. O a mano: <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> en macOS) para un tema **CONTROL**, **Preferencias: Tema de icono de archivo** → **Bureau Icons** y **Preferencias: Tema de icono de producto** → **Bureau Product Icons** o **Bureau Product Icons (Color)**.

**Claro de día, oscuro de noche:** **CONTROL: Seguir el modo claro/oscuro del sistema…** usa CONTROL Astral cuando tu sistema está en modo claro y el tema CONTROL oscuro que elijas en modo oscuro.

## La Casa Inmemorial

Todo en un solo sitio: pulsa la **Casa Inmemorial** —el monolito sin ventanas de la barra de estado— (o ejecuta **CONTROL: Abrir la Casa Inmemorial…**) para cambiar el tema de color, aplicar el set completo, elegir los iconos de archivo y de producto, seguir el modo claro/oscuro del sistema, elegir la tipografía, abrir la consola de sonido y la gramola Songmaster, abrir las bandas sonoras oficiales y configurar los protocolos de la Agencia. Cada opción enseña su estado y te devuelve a la Casa. Su popup —como los de la gramola, el nivel de alerta y el Modo Clasificado— es una pequeña ficha con el objeto, etiquetas de estado de color y botones que se pueden pulsar. Oculta el icono desde la propia Casa, con el botón derecho sobre la barra de estado o con `bureauTheme.statusBarItem`.

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

Fuentes libres inspiradas en los juegos, instaladas solo para tu usuario (sin permisos de administrador) en Windows, macOS y Linux. Elígelas en la guía de bienvenida o cuando quieras con **CONTROL: Elegir tipografía…**.

| Opción | Código (editor, terminal) | Texto (chat, vista previa de Markdown) |
|---|---|---|
| **Bureau** | Overpass Mono | Overpass |
| **Resonant** | Space Mono | Space Grotesk |
| **Según el tema** | Resonant con CONTROL Resonant, Bureau con los demás | |

Si tienes Interstate Mono o Interstate, la opción Bureau las usa primero. **Mantener mi tipografía** restaura tus ajustes anteriores y **CONTROL: Quitar las tipografías instaladas** borra los archivos de fuente.

## Efectos de sonido (opcionales)

Sonidos cortos, **desactivados por defecto**. Abre **Sonidos** en la Casa Inmemorial (o ejecuta **CONTROL: Abrir la consola de sonido…**) para activarlos, elegir el pack *Control* o *Resonant*, ajustar el volumen y decidir qué eventos suenan: arrancar VS Code, cambiar a un tema CONTROL, guardar, escribir, errores nuevos o resueltos, tareas, comandos de terminal fallidos, depuración y commits de Git.

El volumen llega al **200 %**: por encima de 100 los sonidos se amplifican (hasta +6 dB) con un limitador suave, para música alta o altavoces pequeños. Están masterizados para cualquier altavoz, así que también se oyen en un portátil o con auriculares pequeños.

Todos los sonidos son recreaciones originales sintetizadas para esta extensión; no incluye audio de los juegos. VS Code no tiene API de audio, así que se usa el reproductor del sistema (PowerShell en Windows, `afplay` en macOS, `paplay`, `pw-play` o `aplay` en Linux, también con VS Code instalado como Flatpak).

## Gramola Songmaster (opcional)

Lo que suena en tu ordenador —en Spotify o en **cualquier reproductor** (el navegador, Apple Music, VLC…)— en la barra de estado, junto a la Casa Inmemorial, con **anterior, reproducir/pausar y siguiente**. Pasa el ratón por la canción para ver el reproductor: la portada del álbum (de tu sistema, nunca se descarga), la canción, su estado y controles que se pueden pulsar. Lee la música del propio sistema: la sesión multimedia de Windows, Spotify y Música en macOS (macOS pide permiso la primera vez) y cualquier reproductor MPRIS en Linux. Sin cuenta de Spotify, sin iniciar sesión y sin que nada salga de tu ordenador. **Desactivada por defecto**: **CONTROL: Activar/desactivar la gramola Songmaster**, o desde la Casa Inmemorial.

También abre en Spotify la música oficial de los dos juegos: [Control (Original Soundtrack)](https://open.spotify.com/album/0cS6rif4qDxklIaFKME68N), [CONTROL Resonant (Original Soundtrack)](https://open.spotify.com/album/5LxLCAfp8l1USzUOSIbgHP), [Zoe's Mixtape](https://open.spotify.com/album/3tvQ7tUbztcIdUMHQDXkT7) y, de Old Gods of Asgard, [Take Control](https://open.spotify.com/album/3Xcl0pytPYqJUSTi2S8jtI) y [Rebirth – Greatest Hits](https://open.spotify.com/album/0LZhC50aIf7O233yj7IH4Z). Solo enlaces: la música es de Remedy y de sus artistas y no se incluye.

## Protocolos de la Agencia (opcionales)

Tres extras del lore que sirven de verdad, todos **desactivados por defecto** (actívalos en la Casa Inmemorial, en la guía de bienvenida o con sus comandos):

- **Modo Clasificado** — tapa los secretos con barras de censura para compartir pantalla o hacer streaming sin enseñarlos: todos los valores de los archivos `.env`, las claves y certificados, y cualquier valor cuyo nombre parezca un secreto (`password`, `token`, `apiKey`, cadenas de conexión…) en `appsettings.json`, `.npmrc`, `docker-compose.yml` y archivos parecidos. Pon el cursor en una línea para revelarla; el icono *Clasificado* de la barra de estado revela el archivo entero hasta que lo vuelves a pulsar. El archivo nunca cambia. **CONTROL: Activar/desactivar el Modo Clasificado**.
- **Nivel de alerta de la Agencia** — un indicador en la barra de estado que va de **Despejado** a **Anomalía** (avisos), **Alerta** (errores) e **Incursión del Siseo** (10 errores o más). Al pulsarlo se abre el panel Problemas. **CONTROL: Mostrar/ocultar el nivel de alerta de la Agencia**.
- **El Consejo** — habla `<<CON SU PROPIA VOZ.>>` en **momentos al azar del día** (3 al día por defecto, en una notificación con *Otro mensaje* y *Hoy no más*), nunca mientras depuras. Elige cuántas veces al día, el horario (por ejemplo 09:00–18:00), dónde aparecen (notificación, barra de estado o las dos) y si usa sus mensajes, **los tuyos** o los dos: **CONTROL: Configurar el Consejo…**. También puede comentar en voz baja en la barra de estado tus commits, tareas, sesiones de depuración, el último error corregido y el primer arranque del día, y **CONTROL: Mensaje del Consejo** le pregunta cuando quieras. Sus 87 mensajes son originales, escritos para este tema en inglés y en español.

## Ajustes

Los mismos que en la [tabla en inglés](#settings): `bureauTheme.statusBarItem`, `bureauTheme.font`, `bureauTheme.sounds.*` (volumen de 0 a 200), `bureauTheme.classified.*`, `bureauTheme.alertLevel.*`, `bureauTheme.board.*` y `bureauTheme.music.*`. La carpeta de sonidos propios, la gramola, los mensajes al azar del Consejo y tus mensajes solo se pueden fijar en los ajustes de usuario.

## Limitaciones conocidas

- Los colores semánticos dependen de la extensión de cada lenguaje (para C# y Razor, la extensión oficial de C#).
- Los paneles de otras extensiones (web views) solo usan los colores del tema que ellas deciden.
- En Linux, los sonidos necesitan `paplay`, `pw-play` o `aplay`; el sonido de *comando de terminal fallido* necesita la shell integration.
- El Modo Clasificado pinta barras sobre el editor: los valores se pueden ver donde no llega (resultados de búsqueda, el minimapa como bloques, los hovers de otras extensiones) y, al abrir un archivo, VS Code lo enseña un instante antes de pintar las barras. Actívalo antes de abrir el archivo que quieras proteger.
- La gramola Songmaster muestra lo que cuenta el sistema: en macOS solo Spotify y Música, sin portada (se ve la gramola); en Linux necesita `gdbus` (viene con GLib en GNOME, KDE y casi todos los escritorios) y solo enseña la portada si el reproductor la guarda como archivo local de 48 KB como mucho.

## Privacidad y seguridad

Sin conexiones de red ni telemetría. Los temas y los iconos son archivos estáticos; los sonidos y la tipografía opcionales solo usan el reproductor de audio del sistema y tu carpeta de fuentes de usuario, el Modo Clasificado solo lee el archivo abierto para saber qué tapar y la gramola solo lee el título, el artista y el álbum que da tu sistema. En áreas de trabajo no confiables se ignoran los ajustes de sonido del área de trabajo. Los detalles y cómo informar de una vulnerabilidad están en [SECURITY.md](SECURITY.md).

## Créditos

Hecho por **Normalxxnavi** · [Cambios](CHANGELOG.md) · [Licencia MIT](LICENSE). Fuentes: Overpass, Overpass Mono, Space Mono y Space Grotesk (SIL Open Font License, ver [`fonts/`](fonts/README.md)). Los colores, los iconos y los sonidos son originales.

CONTROL y CONTROL Resonant son marcas de sus respectivos propietarios y solo se usan para describir en qué se inspira este tema. No incluye recursos de los juegos.
