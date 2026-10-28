<div align="center">

<img src="images/icon.png" width="96" alt="Bureau">

# Bureau — CONTROL Fan Theme

**Hormigón brutalista, señalética blanco hueso y el rojo del FBC.**<br>
Cuatro temas para VS Code inspirados en *Control* y *Control Resonant* de Remedy, con iconos a juego, un prompt para la terminal y sonidos opcionales.

[![Versión](https://vsmarketplacebadges.dev/version-short/Normalxxnavi.bureau-theme.svg?style=flat-square&color=C42B22&labelColor=17181A)](https://marketplace.visualstudio.com/items?itemName=Normalxxnavi.bureau-theme)
[![Instalaciones](https://vsmarketplacebadges.dev/installs-short/Normalxxnavi.bureau-theme.svg?style=flat-square&color=C42B22&labelColor=17181A)](https://marketplace.visualstudio.com/items?itemName=Normalxxnavi.bureau-theme)
[![VS Code 1.93+](https://img.shields.io/badge/VS%20Code-1.93%2B-C42B22?style=flat-square&labelColor=17181A)](https://code.visualstudio.com/)
[![Licencia MIT](https://img.shields.io/badge/license-MIT-C42B22?style=flat-square&labelColor=17181A)](LICENSE)

🌐 [English](README.md) · **Español**

</div>

![CONTROL Dark](images/screenshots/control-dark.png)

> 🆕 **Novedades:** la [terminal Bureau](#terminal), iconos redibujados a partir del juego y un arranque mucho más rápido. Todo en el [registro de cambios](CHANGELOG.md).

## 🎨 Cuatro temas

<table>
  <tr>
    <td width="50%"><img src="images/screenshots/control-dark.png" alt="CONTROL Dark"></td>
    <td width="50%"><img src="images/screenshots/control-black.png" alt="CONTROL Black"></td>
  </tr>
  <tr>
    <td align="center">🏢 <b>CONTROL Dark</b><br><sub>La Casa Inmemorial: hormigón cálido, texto hueso, rojo del FBC</sub></td>
    <td align="center">🖤 <b>CONTROL Black</b><br><sub>Negro puro para pantallas OLED, señalética en blanco astral</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="images/screenshots/control-resonant.png" alt="CONTROL Resonant"></td>
    <td width="50%"><img src="images/screenshots/control-astral.png" alt="CONTROL Astral"></td>
  </tr>
  <tr>
    <td align="center">🌆 <b>CONTROL Resonant</b><br><sub>El Manhattan alterado: asfalto mojado, azul acero, cian de resonancia</sub></td>
    <td align="center">⚪ <b>CONTROL Astral</b><br><sub>El tema claro: vacío blanco enmarcado en geometría negra</sub></td>
  </tr>
</table>

## ✨ Características

- 🎨 **687 colores de interfaz por tema**, los 16 colores de la terminal y resaltado semántico. Todos los colores de texto se comprueban con WCAG.
- 🧪 **Cualquier lenguaje**: los colores de la sintaxis se prueban con 142 lenguajes, de TypeScript y Python a Zig, Elixir y COBOL.
- 🗂️ **Bureau Icons**: 498 iconos de archivo y carpeta dibujados en la rejilla de 16 px, nítidos al 100 % de escala.
- 🧩 **Bureau Product Icons**: 350 iconos propios de VS Code redibujados a partir del juego, en el color del tema o en **Color**.
- 🖥️ **La terminal Bureau** 🆕: un prompt para PowerShell, cmd, bash, zsh y fish con cinco estilos. Sin Oh My Posh ni Nerd Fonts.
- 🏛️ **La Casa Inmemorial**: todo el tema desde un botón de la barra de estado.
- 🎵 **Gramola Songmaster**: lo que suena en tu ordenador, con sus controles.
- 🕶️ **Modo Clasificado**: barras de censura sobre tus secretos mientras compartes pantalla.
- 🔊 **Efectos de sonido** y 🔤 **tipografía** de los juegos, opcionales.
- 🔒 **Privado**: sin conexiones de red ni telemetría.

<a id="terminal"></a>

### 🖥️ La terminal Bureau

![Los cinco estilos del prompt en la misma terminal, en CONTROL Dark](images/screenshots/terminal-styles.png)

Cinco estilos de prompt contados con el lore de la Agencia. Desactivada por defecto: **CONTROL: Elegir el prompt de la terminal…**

| Estilo | Qué enseña |
|---|---|
| 🪧 **Señalética** | Bloques sólidos como los carteles de la Casa Inmemorial: sistema, carpeta, rama de Git, hora y error. |
| 📁 **Expediente** | Dos líneas con el marco de un expediente, terminadas en el Punto de Control. |
| ⏺️ **Punto de Control** | Mínimo: el Punto, la carpeta y la rama. El Punto se vacía cuando falla un comando. |
| 📢 **El Consejo** | `<<LA CARPETA>> (LA RAMA.)`, y un mensaje del Consejo al abrir la terminal. |
| 🚨 **Nivel de alerta** | *Despejado*, *Anomalía*, *Alerta* o *Incursión del Siseo* a la derecha, con la hora. |

- 🌿 **Git de un vistazo**: la rama, los commits por delante y por detrás (`↑1 ↓2`), los archivos cambiados (`~5`), y `git status`, `log` y `diff` con los colores del Bureau.
- ⏱️ **Cabecera y cierre de cada comando**: `── ■ npm run build ── 12:04 ──` … `── COMPLETADO · 3,2 s ──`.
- 🪟 **Iconos de sistema** dibujados en la rejilla de la Agencia para Windows, macOS y Linux, en una pequeña fuente que instala la extensión.
- 🚪 **También fuera de VS Code**: Windows Terminal, la Terminal de macOS y las demás, con **CONTROL: Usar el prompt Bureau también fuera de VS Code**.

### 🗂️ Iconos

![Bureau Icons y Bureau Product Icons (Color) en CONTROL Dark](images/screenshots/icons-dark.png)

Los archivos llevan su código (`TS`, `C#`, `PY`…) sobre una franja de clasificación; las carpetas van del color de su categoría. Los iconos de producto salen del juego: la cinta del Bureau para el control de código fuente, las ranuras de Mods de Jesse para las extensiones, el patito de goma para depurar y la Hedron para las pruebas.

<details>
<summary>🌕 <b>En el tema claro</b>, y cada objeto del juego</summary>
<br>

![Bureau Icons y Bureau Product Icons en CONTROL Astral](images/screenshots/icons-astral.png)

| En VS Code | De los juegos |
|---|---|
| Explorador | Expediente del Bureau |
| Control de código fuente | La cinta del Bureau que une los Puntos de Control, en ángulo recto como los pasillos de la Casa Inmemorial |
| Rama de Git | La misma cinta, con una marca en lugar del Punto de la punta si hay cambios, preparados, conflictos o la rama se borra |
| Ejecutar y depurar | El patito de goma |
| Extensiones | Las ranuras de Mods de Jesse |
| Pruebas | La Hedron |
| Copilot y chat | Polaris, cristales alrededor de un ojo como en el primer juego |
| Notificaciones | La Hotline |
| Remoto | El Umbral |

</details>

### 🏛️ La Casa Inmemorial

![La Casa Inmemorial en CONTROL Dark](images/screenshots/oldest-house.png)

Pulsa el monolito sin ventanas de la barra de estado para cambiar el tema, los iconos, la tipografía, la terminal, los sonidos, la gramola y los protocolos, todo en un sitio.

### 🎵 Gramola Songmaster

![La gramola Songmaster en CONTROL Resonant, con una canción inventada](images/screenshots/jukebox.png)

Spotify o **cualquier reproductor** (el navegador, Apple Music, VLC…) en la barra de estado, con anterior, reproducir/pausar y siguiente. Sin cuenta ni inicio de sesión: lee la música de tu sistema. También abre en Spotify las bandas sonoras oficiales de los dos juegos. Desactivada por defecto.

### 🕶️ Modo Clasificado y protocolos de la Agencia

![El Modo Clasificado en CONTROL Black](images/screenshots/classified.png)

- 🕶️ **Modo Clasificado** tapa todos los valores de los archivos `.env`, las claves y todo lo que parezca un secreto (`password`, `token`, `apiKey`…). Pon el cursor en una línea para revelarla; el archivo nunca cambia.
- 🚨 **Nivel de alerta** pasa de *Despejado* a *Anomalía*, *Alerta* e *Incursión del Siseo* según se acumulan avisos y errores.
- 📢 **El Consejo** habla `<<CON SU PROPIA VOZ.>>` unas cuantas veces al día, con sus 87 mensajes o con los tuyos.

Los tres están desactivados por defecto: actívalos en la Casa Inmemorial.

### 🔊 Sonidos y 🔤 tipografía

![Consola de sonido](images/screenshots/sounds.png)

Efectos cortos al guardar, con los errores, las tareas, la depuración y los commits de Git, con el pack *Control* o *Resonant* y volumen de 0 a 200 %. Todos originales, sintetizados para este tema. Desactivados por defecto: **CONTROL: Abrir la consola de sonido…**

Fuentes libres inspiradas en los juegos, instaladas solo para tu usuario y que se quitan al desinstalar: **CONTROL: Elegir tipografía…**

| Opción | Código | Texto |
|---|---|---|
| **Bureau** | Overpass Mono | Overpass |
| **Resonant** | Space Mono | Space Grotesk |
| **Según el tema** | Resonant con CONTROL Resonant, Bureau con los demás | |

## 📦 Instalación

1. Instala **Bureau — CONTROL Fan Theme** desde el Marketplace, o pulsa <kbd>Ctrl</kbd>+<kbd>P</kbd> y ejecuta `ext install Normalxxnavi.bureau-theme`.
2. Se abre la **guía de bienvenida**, que lo configura todo paso a paso.
3. Cambia de tema cuando quieras con <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> (<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Cmd</kbd>+<kbd>T</kbd> en macOS).

![La guía de bienvenida en CONTROL Astral](images/screenshots/welcome.png)

> 💡 **Todo en un paso:** **CONTROL: Aplicar el set completo (tema e iconos)…** aplica un tema, Bureau Icons y Bureau Product Icons, y se puede deshacer.<br>
> 🌗 **Claro de día, oscuro de noche:** **CONTROL: Seguir el modo claro/oscuro del sistema…**

## 🛠️ Hazlo tuyo

Cambia cualquier color en tu `settings.json`, solo para el tema CONTROL que nombres:

```jsonc
"workbench.colorCustomizations": {
  "[CONTROL Dark]": {
    "editor.background": "#101113",   // un editor más oscuro
    "statusBar.background": "#C42B22" // la barra de estado en rojo FBC
  }
}
```

Los comentarios y los parámetros van en *cursiva*. Para quitarla:

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

<details>
<summary>⚙️ <b>Todos los ajustes</b></summary>
<br>

| Ajuste | Por defecto | Descripción |
|---|---|---|
| `bureauTheme.statusBarItem` | `true` | Enseña el icono de la Casa Inmemorial en la barra de estado. |
| `bureauTheme.font` | `none` | `bureau`, `resonant`, `auto` (según el tema) o `none`. |
| `bureauTheme.sounds.enabled` | `false` | Interruptor general de los sonidos. |
| `bureauTheme.sounds.pack` | `auto` | `auto`, `control` o `resonant`. |
| `bureauTheme.sounds.volume` | `80` | 0–200 (por encima de 100, amplificado con un limitador suave). |
| `bureauTheme.sounds.onlyWithControlTheme` | `true` | En silencio mientras hay otro tema activo. |
| `bureauTheme.sounds.errorTrigger` | `onSave` | `onSave` o `live`. |
| `bureauTheme.sounds.cooldownMs` | `1500` | Tiempo mínimo entre sonidos. |
| `bureauTheme.sounds.customFolder` | `""` | Carpeta con tus propios `.wav` (solo en los ajustes de usuario). |
| `bureauTheme.sounds.events.*` | | Un interruptor por evento: arranque, cambio de tema, guardar, escribir, errores, tareas, comando de terminal fallido, depuración, commit de Git. |
| `bureauTheme.classified.enabled` | `false` | Modo Clasificado. |
| `bureauTheme.classified.files` | `.env`, `*.pem`, `appsettings*.json`… | Archivos en los que actúa el Modo Clasificado (patrones glob). |
| `bureauTheme.classified.keywords` | `password`, `token`, `apikey`… | Palabras que marcan un valor como secreto (palabras, no expresiones regulares). |
| `bureauTheme.alertLevel.enabled` | `false` | Nivel de alerta de la Agencia en la barra de estado. |
| `bureauTheme.alertLevel.incursionThreshold` | `10` | Errores a partir de los que el nivel es *Incursión del Siseo*. |
| `bureauTheme.board.comments` | `false` | Comentarios del Consejo en la barra de estado. |
| `bureauTheme.board.random` | `false` | Mensajes del Consejo al azar durante el día (solo en los ajustes de usuario). |
| `bureauTheme.board.timesPerDay` | `3` | Cuántos mensajes al azar al día. |
| `bureauTheme.board.hours` | `""` | Horario, por ejemplo `09:00-18:00` (vacío: a cualquier hora). |
| `bureauTheme.board.display` | `notification` | `notification`, `statusBar` o `both`. |
| `bureauTheme.board.source` | `all` | `all` (los del Consejo y los tuyos), `board` o `custom`. |
| `bureauTheme.board.customMessages` | `[]` | Tus propios mensajes (solo en los ajustes de usuario). |
| `bureauTheme.music.enabled` | `false` | Gramola Songmaster (solo en los ajustes de usuario). |
| `bureauTheme.music.source` | `any` | Cualquier reproductor (`any`) o solo `spotify`. |
| `bureauTheme.music.controls` | `true` | Botones de anterior, reproducir/pausar y siguiente junto a la canción. |
| `bureauTheme.terminal.prompt` | `off` | `signage`, `dossier`, `controlPoint`, `board`, `alertLevel` u `off` (solo en los ajustes de usuario, como el resto de `bureauTheme.terminal.*`). |
| `bureauTheme.terminal.classified` | `false` | Tapa con una barra de censura el prompt de cada comando que ejecutas. |
| `bureauTheme.terminal.icons` | `true` | Iconos de sistema y de los segmentos (Bureau Prompt Icons). |
| `bureauTheme.terminal.windowsIcon` · `macosIcon` · `linuxIcon` | `controlPoints` · `command` · `tux` | El icono de sistema; `house`, `apple` y `tuxMop` son las alternativas. |
| `bureauTheme.terminal.commandFrame` | `true` | Cabecera y cierre de cada comando que ejecutas. |
| `bureauTheme.terminal.gitColors` | `true` | La salida de Git con los colores del Bureau (los tuyos mandan). |
| `bureauTheme.terminal.newTerminals` | `true` | Con el prompt encendido, el perfil Bureau es el predeterminado de VS Code. |
| `bureauTheme.terminal.shell` | `auto` | `auto` (tu terminal predeterminada anterior), `pwsh`, `powershell`, `cmd`, `bash`, `zsh` o `fish`. |

</details>

<details>
<summary>⚠️ <b>Limitaciones conocidas</b></summary>
<br>

- Los colores semánticos dependen de la extensión de cada lenguaje (para C# y Razor, la extensión oficial de C#). Los paneles de otras extensiones (web views) solo usan los colores del tema que ellas deciden.
- En Linux, los sonidos necesitan `paplay`, `pw-play` o `aplay`; el sonido de *comando de terminal fallido* necesita la shell integration.
- El Modo Clasificado pinta barras sobre el editor: los valores se pueden ver donde no llega (resultados de búsqueda, el minimapa, los hovers de otras extensiones), y VS Code enseña el archivo un instante antes de pintar las barras. Actívalo antes de abrir el archivo que quieras proteger.
- La gramola muestra lo que cuenta el sistema: en macOS solo Spotify y Música, sin portada; en Linux necesita `gdbus` y solo enseña la portada si el reproductor la guarda como archivo local de 48 KB como mucho.
- La terminal Bureau: el prompt de cmd es texto fijo (sin rama de Git, error ni Clasificado), y Clasificado funciona en PowerShell, zsh y fish, no en bash. Los iconos necesitan una terminal con fuente de respaldo: VS Code, Windows Terminal y casi todas las de Linux la tienen; la consola clásica de Windows no (apaga `bureauTheme.terminal.icons`), y en la Terminal de macOS o en iTerm2 puede que tengas que elegir *Bureau Prompt Icons* como fuente para los caracteres no ASCII. La primera vez, reinicia VS Code si ves recuadros en lugar de iconos. Si Windows PowerShell no deja ejecutar scripts (`Restricted`), el prompt funciona igual en VS Code, pero fuera de VS Code tu `profile.ps1` no se ejecuta.
- Fuentes en Windows: una fuente que siga abierta al desinstalar se queda, sin usar, en `%LOCALAPPDATA%\Microsoft\Windows\Fonts` (sus archivos empiezan por `BureauTheme-`); puedes borrarla después.

</details>

## 🔒 Privacidad y seguridad

Sin conexiones de red ni telemetría. Los sonidos usan el reproductor de audio del sistema, las fuentes van a tu carpeta de fuentes de usuario, la gramola solo lee la canción que da tu sistema y la terminal Bureau solo toca los perfiles de tus shells cuando se lo pides. Más detalles en [SECURITY.md](SECURITY.md).

## 🙌 Créditos

Hecho por **Normalxxnavi** · [Cambios](CHANGELOG.md) · [Licencia MIT](LICENSE). Fuentes: Overpass, Overpass Mono, Space Mono y Space Grotesk (SIL Open Font License, ver [`fonts/`](fonts/README.md)). Los colores, los iconos y los sonidos son originales.

<sub>*Beta · Obra fan no oficial, sin aprobación ni respaldo de Remedy Entertainment Plc ni de sus filiales. CONTROL y CONTROL Resonant son marcas de sus respectivos propietarios y solo se usan para describir en qué se inspira este tema. No incluye recursos de los juegos. Windows, macOS y Linux son marcas de sus respectivos propietarios.*</sub>
