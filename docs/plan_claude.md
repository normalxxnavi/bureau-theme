# Plan técnico — Tema de VS Code inspirado en CONTROL y CONTROL Resonant

> Complemento a `plan_tema_vscode_control.md`. Ese plan define **qué** queremos conseguir; este define **cómo** lo vamos a construir: arquitectura, paletas con valores reales, módulo de sonido, herramientas y tareas concretas por fase.
>
> **Versión 2 (2026-10-06):** incorpora elementos de los dos juegos (*Control*, 2019, y *Control Resonant*, 2026), una tercera variante de color y un **módulo de sonidos opcional** que se activa y desactiva desde los ajustes.

---

## 0. Resumen en 30 segundos

- Una sola extensión con **tres temas**, cada uno anclado a un juego:
  - **CONTROL Dark**: *Control* (2019). La Oldest House: hormigón brutalista y rojo FBC.
  - **CONTROL Black**: derivado del Dark para OLED. Black Rock, casi negro.
  - **CONTROL Resonant**: *Control Resonant* (2026). Manhattan deformado por el *Patterning*: asfalto mojado, ladrillo y hierro. El rojo se reserva **solo** para el peligro, igual que en el juego.
- **No escribimos los JSON de los temas a mano.** Hay una paleta por variante y un script en Node que genera `themes/*.json`. Añadir una variante es añadir una paleta.
- **Módulo de sonidos opcional, incluido en la v1.0** (apagado por defecto): suenan efectos al guardar, cuando aparece un error, al compilar, al depurar, al hacer commit… Hay un interruptor general, uno por evento, control de volumen y dos *packs* (Control / Resonant).
- ⚠️ **Los sonidos serán recreaciones originales inspiradas en los juegos, no audio extraído de ellos.** Distribuir audio de Remedy en el Marketplace infringe sus derechos y provocaría la retirada de la extensión (sección 5.6). Para quien quiera usar archivos propios hay una opción de **carpeta personalizada**.
- Todo se prueba en el *Extension Development Host* (F5) con `test-workspace/`.
- Sin dependencias en tiempo de ejecución. Las únicas de desarrollo son `@types/vscode` (autocompletado) y `@vscode/vsce` (empaquetar).

---

## 1. Entorno (comprobado el 2026-10-06)

| Herramienta | Estado |
|---|---|
| Node.js | v24.21.0 ✅ (incluye `node --watch` y `node --test`, así que no hacen falta librerías) |
| npm | 11.19.0 ✅ |
| git | 2.56.0 ✅ (la carpeta todavía **no** es un repositorio) |
| VS Code | 1.140.0 ✅ |
| Extensión C# / C# Dev Kit | instaladas ✅ (necesarias para los semantic tokens de C# y Razor) |

**Generador `yo code`:** no lo vamos a usar. Escribimos el esqueleto a mano para entender cada archivo.

**Lenguaje del código de la extensión:** JavaScript con `// @ts-check` y comentarios JSDoc. Tienes autocompletado y comprobación de tipos como en TypeScript, pero sin paso de compilación.

---

## 2. El universo CONTROL dentro de la extensión

Qué tomamos de cada juego y **dónde** aparece. La regla es usar **conceptos, nombres y estética**, nunca assets del juego (imágenes, logos, audio, música ni textos copiados).

### 2.1. *Control* (2019)

| Elemento del juego | Dónde aparece en la extensión |
|---|---|
| The Oldest House, hormigón brutalista | Paleta del **Dark** |
| Rojo FBC, iluminación roja | Acento de interfaz del Dark y el Black |
| Black Rock | Concepto del **Black** |
| Documentos clasificados y tachados | Texto color papel/hueso. Idea extra: modo "Clasificado" (sección 6) |
| La Hotline (teléfono rojo) | Sonido al **activar el tema** |
| Control Points (puntos de guardado) | Sonido cuando **se resuelven todos los errores** |
| Service Weapon y sus transformaciones | Sonido al **iniciar la depuración** |
| El Hiss (susurros, cántico) | Sonido de **error nuevo** |
| The Board (voz distorsionada) | Sonido de **arranque** y mensajes extra |
| Proyector de diapositivas, teletipos | Sonidos de **breakpoint** y **commit** |
| Alerta del Bureau, ascensores | Sonidos de **build fallida / correcta** |
| Astral Plane, Ashtray Maze, Hiss | Variantes futuras (fuera de la v1.0) |

### 2.2. *Control Resonant* (2026)

Datos del juego (lanzado el 24 de septiembre de 2026): protagonista **Dylan Faden**; Manhattan aislado por el ***Patterning***, causado por una **Hedron** hostil (entidad opuesta al Hiss); **West Incursion Zone**; **Gravity Anomalies** (la gravedad y la orientación cambian); arma **Aberrant** (cambia entre tres formas de cuerpo a cuerpo); habilidad de **Shift**; jefes **Resonants**. Vuelven el Hiss y el Moho. Banda sonora de Petri Alanko.

Decisión de arte del juego que adoptamos: **"el rojo pertenece al Hiss"**. En Resonant el rojo indica peligro y nada más.

| Elemento del juego | Dónde aparece en la extensión |
|---|---|
| Manhattan: asfalto mojado, ladrillo, escaleras de hierro | Paleta del **Resonant** |
| El rojo es del Hiss | En Resonant el rojo **solo** se usa en errores y diagnósticos |
| La Hedron (opuesta al Hiss) | Acento frío del Resonant (cian pálido) |
| *Patterning* (repeticiones, geometría imposible) | Idea extra: resaltado de líneas duplicadas (sección 6) |
| Aberrant cambiando de forma | Sonido al **iniciar la depuración** (pack Resonant) |
| Shift / Gravity Anomalies | Sonido de **breakpoint** (pack Resonant) |
| Derrotar a un Resonant | Sonido cuando **se resuelven todos los errores** (pack Resonant) |
| Hiss invadiendo la ciudad | Sonido de **error nuevo** (pack Resonant) |

Fuentes: [Wikipedia — Control Resonant](https://en.wikipedia.org/wiki/Control_Resonant), [Remedy — gameplay details](https://www.remedygames.com/article/remedy-entertainment-unveils-new-gameplay-details-for-control-resonant), [Inven Global — diseño de Control Resonant](https://www.invenglobal.com/articles/26151/twisting-a-familiar-city-the-secrets-behind-control-resonant-design).

---

## 3. Arquitectura del proyecto

### 3.1. Estructura

```text
Theme-Control/
├── package.json                 # manifiesto: temas, ajustes, comandos, scripts npm
├── README.md · CHANGELOG.md · LICENSE (MIT)
├── .vscodeignore · .gitignore
│
├── .vscode/
│   ├── launch.json              # F5 → Extension Development Host con test-workspace
│   └── tasks.json               # tarea "watch" que regenera los temas al guardar
│
├── src/
│   ├── theme/                   # GENERADOR DE TEMAS (fuente de verdad de los colores)
│   │   ├── palettes/
│   │   │   ├── dark.js          # Control: Oldest House
│   │   │   ├── black.js         # Control: Black Rock / OLED (hereda de dark)
│   │   │   └── resonant.js      # Control Resonant: Manhattan
│   │   ├── workbench.js         # colores de la interfaz a partir de roles
│   │   ├── tokens.js            # tokenColors (TextMate)
│   │   ├── semantic.js          # semanticTokenColors
│   │   └── build.js             # escribe themes/*.json
│   │
│   └── extension/               # CÓDIGO QUE SE EJECUTA EN VS CODE (módulo de sonido)
│       ├── extension.js         # activate()/deactivate()
│       ├── config.js            # lectura de los ajustes bureauTheme.*
│       ├── events.js            # escucha eventos de VS Code → decide qué sonido
│       ├── soundbank.js         # resuelve el pack (control/resonant/auto/carpeta propia)
│       ├── volume.js            # aplica el volumen escalando el WAV
│       └── player/
│           ├── index.js         # elige el reproductor según el SO
│           ├── windows.js       # proceso PowerShell persistente
│           ├── macos.js         # afplay
│           └── linux.js         # paplay / aplay
│
├── themes/                      # GENERADO (no se edita a mano, sí se versiona)
│   ├── control-dark-color-theme.json
│   ├── control-black-color-theme.json
│   └── control-resonant-color-theme.json
│
├── sounds/                      # SE INCLUYE en el .vsix
│   ├── control/   startup.wav, theme.wav, save.wav, error.wav, clear.wav, …
│   ├── resonant/  (mismos nombres de archivo)
│   └── LICENSES.md              # origen y licencia de CADA archivo
│
├── scripts/
│   ├── contrast.js              # comprueba ratios WCAG de las 3 paletas
│   └── sounds/generate.js       # sintetiza los WAV originales (reproducible)
│
├── test/                        # tests con node:test (sin dependencias)
│   ├── events.test.js           # lógica de "qué suena y cuándo", cooldown
│   └── volume.test.js
│
├── test-workspace/              # archivos de muestra para validar los temas
│   ├── ThemeTests.csproj, csharp.cs, razor.cshtml, javascript.js, typescript.ts,
│   ├── html.html, css.css, scss.scss, json.json, sql.sql,
│   └── markdown.md, xml.xml, diff.diff, git-conflict.txt
│
├── docs/
│   ├── plan_tema_vscode_control.md · plan_claude.md
│   ├── palette.md               # tablas de las 3 paletas
│   └── sound-design.md          # descripción de cada sonido y cómo se generó
│
└── images/
    ├── icon.png                 # 128×128, diseño propio
    └── screenshots/
```

### 3.2. Por qué un generador y no JSON a mano

| JSON a mano | Paleta + generador |
|---|---|
| El mismo HEX repetido 40 veces por tema | Cada color se define **una vez** por rol |
| Tres temas son tres copias que se desincronizan | Las tres paletas comparten `workbench.js`, `tokens.js` y `semantic.js` |
| Cada variante futura se vuelve a hacer desde cero | Una variante nueva es una paleta nueva |
| Sin build | `npm run build` (script de unas 50 líneas, sin dependencias) |

Las paletas se escriben por **rol semántico** (`bg.editor`, `fg.muted`, `accent`, `danger`, `syntax.keyword`…). Gracias a eso el Resonant puede decir "mi acento es cian y mi rojo solo es `danger`" sin tocar el resto del generador.

### 3.3. Flujo de trabajo diario

1. `npm run watch`: `node --watch src/theme/build.js` regenera los JSON al guardar.
2. **F5**: abre el Extension Development Host con `test-workspace/`.
3. VS Code recarga el tema al cambiar el JSON, así que editas la paleta y ves el resultado al instante.
4. `Ctrl+Shift+P` → **Developer: Inspect Editor Tokens and Scopes** para saber qué regla colorea cada palabra.
5. `npm test` ejecuta los tests del módulo de sonido.

---

## 4. Paletas iniciales (propuesta v0)

Son valores de partida que se ajustarán con las referencias visuales. Los ratios están **calculados** con la fórmula WCAG sobre el fondo del editor de cada variante.

**Objetivos mínimos:** texto ≥ 7:1, tokens de código ≥ 4.5:1, comentarios ≈ 4.5:1, deshabilitado ≥ 2.5:1.

### 4.1. CONTROL Dark (*Control*, la Oldest House)

| Idea del juego | Traducción |
|---|---|
| Hormigón brutalista | Grises carbón **neutros, ligeramente cálidos** |
| Documentos clasificados | Texto color hueso, strings color papel envejecido |
| Rojo FBC | Acento de interfaz y keywords |
| Señalética fluorescente fría | Tipos y clases en gris acero |
| Luz de sodio | Números y constantes en ámbar |
| Astral Plane | Funciones: lo más claro del código |

**Superficies y texto**

| Rol | HEX | Uso / contraste |
|---|---|---|
| `bg.editor` | `#17181A` | Editor |
| `bg.sidebar` | `#121315` | Sidebar, Activity Bar, panel |
| `bg.elevated` | `#1E1F22` | Hover, sugerencias, Command Palette |
| `bg.input` | `#202125` | Inputs, dropdowns |
| `border` | `#2A2B2F` | Bordes discretos |
| `fg.main` | `#D9D6CF` | **12.2:1** |
| `fg.muted` | `#8E8B85` | **5.2:1** |
| `fg.disabled` | `#5E5C59` | 2.7:1 (solo elementos inactivos) |
| `accent` (Rojo FBC) | `#E0352B` | Cursor, pestaña activa, foco |
| `accent.solid` | `#C42B22` | Fondo de badges y botones; texto blanco encima **5.6:1** |
| `selection` | `#E0352B33` | Rojo al 20 % |
| `lineHighlight` | `#FFFFFF08` | Línea activa casi imperceptible |

**Estados: el problema rojo contra rojo.** Si el acento es rojo y los errores también, el usuario no distingue lo **activo** de lo **roto**. Reglas para Dark y Black:

1. **Error** = `#FF6B6B`: más claro y rosado, siempre con icono o subrayado. El acento `#E0352B` es más profundo y anaranjado.
2. El acento rojo nunca se usa como color de texto de un estado.
3. La selección tiene que dejar ver los subrayados de error. Lo comprueba un caso concreto de `test-workspace/`.
4. Git "eliminado" usa un tercer rojo, más apagado.

(El Resonant evita el problema de raíz: allí el acento no es rojo.)

| Rol | HEX | Contraste |
|---|---|---|
| `error` | `#FF6B6B` | 6.4:1 |
| `warning` | `#E6B04F` | 9.0:1 |
| `success` / git added | `#86B57E` | 7.6:1 |
| `info` | `#79A9D1` | 7.1:1 |

**Sintaxis**

| Nivel | Rol | HEX | Contraste | Estilo |
|---|---|---|---|---|
| 1 | Funciones / métodos | `#F2EFE8` | 15.5:1 | normal |
| 2 | Texto / variables | `#D9D6CF` | 12.2:1 | normal |
| 3 | Propiedades | `#BEBAB2` | 9.2:1 | normal |
| 4 | Tipos / clases / interfaces / enums | `#9FB6C9` | 8.5:1 | normal |
| 5 | Keywords | `#E5675D` | 5.4:1 | normal |
| 6 | Strings | `#CDB68C` | 9.0:1 | normal |
| 6 | Números / constantes / booleanos | `#E2A55A` | 8.3:1 | normal |
| — | Atributos / decoradores | `#8FC1BE` | 8.9:1 | normal |
| — | Parámetros | = variables | — | *cursiva* |
| — | Operadores / puntuación | = `fg.muted` | 5.2:1 | normal |
| — | Comentarios | `#827F78` | 4.5:1 | *cursiva* |

### 4.2. CONTROL Black (*Control*, Black Rock / OLED)

Hereda **todo** del Dark salvo:

| Rol | Dark | Black | Motivo |
|---|---|---|---|
| `bg.editor` | `#17181A` | `#0A0A0B` | Casi negro, no `#000000` (evita el *black smear* en OLED al hacer scroll) |
| `bg.sidebar` | `#121315` | `#070708` | Superficies apenas diferenciadas |
| `bg.elevated` | `#1E1F22` | `#111113` | |
| `border` | `#2A2B2F` | `#1C1C1F` | Los bordes hacen el trabajo de separación |
| `fg.main` | `#D9D6CF` | `#CFCCC5` | Algo más tenue para evitar el halo sobre negro (12.3:1) |
| `selection` | `#E0352B33` | `#E0352B26` | Rojo más contenido |

### 4.3. CONTROL Resonant (*Control Resonant*, Manhattan)

| Idea del juego | Traducción |
|---|---|
| Asfalto mojado, hierro | Fondos gris **frío** (contraste con el gris cálido del Dark) |
| La Hedron, opuesta al Hiss | Acento **cian pálido**: cursor, foco, pestaña activa, keywords |
| "El rojo es del Hiss" | Rojo **solo** en errores, diagnósticos y Git eliminado |
| Ladrillo de Manhattan | Números y constantes |
| Taxis y luz de farola | Strings en amarillo apagado |
| Neón frío | Tipos en azul acero-lavanda |

| Rol | HEX | Contraste |
|---|---|---|
| `bg.editor` | `#15171B` | — |
| `fg.main` | `#D5D8DC` | 12.6:1 |
| `fg.muted` | `#8A9099` | 5.6:1 |
| `accent` (Hedron) | `#6FCFDC` | 9.9:1 |
| `accent.solid` | `#24707B` | texto blanco encima 5.7:1 |
| `danger` (Hiss) | `#FF5A4E` | 5.8:1 |
| Funciones | `#F1F2F0` | 16.0:1 |
| Propiedades | `#B4BAC2` | 9.2:1 |
| Tipos | `#A7B4E0` | 8.8:1 |
| Keywords | `#6FCFDC` | 9.9:1 |
| Strings | `#D6C27E` | 10.2:1 |
| Números / constantes | `#D7906E` | 6.9:1 |
| Atributos | `#A3C99A` | 9.7:1 |
| Comentarios | `#80868F` | 4.9:1 |

> El color de la Hedron (cian pálido) es una **interpretación propia**. Lo validaremos con capturas del juego en la Fase 1; si el juego usa otro color para la Hedron o el *Patterning*, se cambia en `resonant.js` y el resto se regenera solo.

---

## 5. Módulo de sonidos (opcional)

### 5.1. Comportamiento

- **Apagado por defecto.** Nadie espera que un tema haga ruido. Se activa con un ajuste o con el comando *CONTROL: Activar/desactivar sonidos*.
- Cuando está apagado **no se registra ningún listener**: coste cero.
- Por defecto solo suena si uno de los temas CONTROL está activo (se puede cambiar).
- **Cooldown** entre sonidos para que no haya ráfagas.
- Los errores se evalúan **al guardar** (por defecto), no mientras escribes. Si no, los diagnósticos que aparecen y desaparecen al teclear dispararían el sonido sin parar.

### 5.2. Ajustes (`contributes.configuration`)

Cada evento es un **checkbox** independiente en la interfaz de ajustes de VS Code (`Ctrl+,` → buscar "CONTROL").

| Ajuste | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `bureauTheme.sounds.enabled` | boolean | `false` | Interruptor general |
| `bureauTheme.sounds.pack` | enum | `"auto"` | `auto` (Dark/Black → Control, Resonant → Resonant), `control`, `resonant` |
| `bureauTheme.sounds.volume` | number 0–100 | `50` | Volumen |
| `bureauTheme.sounds.onlyWithControlTheme` | boolean | `true` | Silencio si usas otro tema |
| `bureauTheme.sounds.cooldownMs` | number | `1500` | Tiempo mínimo entre sonidos |
| `bureauTheme.sounds.errorTrigger` | enum | `"onSave"` | `onSave` o `live` |
| `bureauTheme.sounds.customFolder` | string | `""` | Carpeta con tus propios `.wav` (mismos nombres de archivo); sustituye al pack |
| `bureauTheme.sounds.events.startup` | boolean | `false` | Arranque de VS Code |
| `bureauTheme.sounds.events.themeActivated` | boolean | `true` | Al elegir un tema CONTROL |
| `bureauTheme.sounds.events.save` | boolean | `false` | Al guardar (es frecuente, así que va apagado) |
| `bureauTheme.sounds.events.newError` | boolean | `true` | Aparecen errores nuevos |
| `bureauTheme.sounds.events.allClear` | boolean | `true` | Se resuelven todos los errores |
| `bureauTheme.sounds.events.buildSuccess` | boolean | `true` | Tarea/build terminada con éxito |
| `bureauTheme.sounds.events.buildFail` | boolean | `true` | Tarea/build fallida |
| `bureauTheme.sounds.events.terminalFail` | boolean | `false` | Comando de terminal con error |
| `bureauTheme.sounds.events.debugStart` | boolean | `true` | Inicio de depuración |
| `bureauTheme.sounds.events.breakpoint` | boolean | `true` | Se detiene en un breakpoint |
| `bureauTheme.sounds.events.gitCommit` | boolean | `true` | Commit realizado |

> Prefijo `bureauTheme.` (decisión 4). **Hay que fijarlo antes de publicar**, porque cambiarlo después borra los ajustes de los usuarios.

**Comandos:**
- *CONTROL: Activar/desactivar sonidos*.
- *CONTROL: Probar sonidos*: abre un Quick Pick con todos los sonidos del pack activo para escucharlos.
- *CONTROL: Abrir ajustes de sonido*: abre los ajustes filtrados por la extensión.

### 5.3. Eventos → sonidos

| Evento | API de VS Code | Pack Control | Pack Resonant |
|---|---|---|---|
| Arranque | `activate()` con `onStartupFinished` | Zumbido grave de la Oldest House | Ciudad lejana distorsionada |
| Tema activado | `onDidChangeConfiguration` en `workbench.colorTheme` | Timbre de la Hotline | Pulso de la Hedron |
| Guardar | `workspace.onDidSaveTextDocument` | Sello de archivo / teletipo | Clic metálico |
| Error nuevo | `languages.onDidChangeDiagnostics` (el recuento sube) | Susurro tipo Hiss | Hiss con eco que se repite (*Patterning*) |
| Todo resuelto | el recuento de errores llega a 0 | Control Point purificado | Resonant derrotado |
| Build OK | `tasks.onDidEndTaskProcess` (exitCode 0) | Campana de ascensor | Acorde ascendente |
| Build fallida | `tasks.onDidEndTaskProcess` (exitCode ≠ 0) | Alerta del Bureau | Distorsión gravitatoria |
| Terminal falla | `window.onDidEndTerminalShellExecution` | Estática de radio | Estática con *glitch* |
| Depuración | `debug.onDidStartDebugSession` | Transformación del Service Weapon | Aberrant cambiando de forma |
| Breakpoint | `debug.onDidChangeActiveStackItem` | Clic de proyector de diapositivas | *Shift* gravitatorio |
| Commit | API de la extensión Git integrada (`vscode.git`) | Máquina de escribir + sello | Golpe de eco metálico |

Todas las descripciones son **conceptos para recrear**, no audio del juego.

### 5.4. Cómo se reproduce el audio (detalle técnico)

Las extensiones se ejecutan en Node, y **VS Code no tiene API de audio**. Por eso se usa el reproductor nativo de cada sistema:

| SO | Reproductor | Notas |
|---|---|---|
| Windows | Un **proceso PowerShell persistente** con `System.Media.SoundPlayer` que recibe órdenes por stdin | Lanzar PowerShell para cada sonido tarda unos 300 ms; manteniéndolo abierto, la reproducción es inmediata |
| macOS | `afplay` | Viene con el sistema |
| Linux | `paplay`, y si no existe, `aplay` | Si no hay ninguno, aviso único y los sonidos se desactivan |

Decisiones clave:
- **Formato único WAV PCM 16-bit mono**, que entienden los tres reproductores.
- **El volumen se aplica en Node** escalando las muestras del WAV. El resultado se guarda en una caché en `globalStorage` por nivel de volumen, así funciona igual en los tres sistemas aunque `SoundPlayer` no tenga control de volumen.
- **`extensionKind: ["ui", "workspace"]`**: con Remote-SSH, WSL o Codespaces el sonido se reproduce en **tu** ordenador y no en el servidor remoto.
- **vscode.dev (web):** los temas funcionan, los sonidos no (no hay Node). Se documenta.
- Si el lector de pantalla está activo (`editor.accessibilitySupport`), se muestra un aviso, porque VS Code tiene sus propias señales de accesibilidad y podrían solaparse.

### 5.5. Diseño de los sonidos

- Duración: **menos de 1,5 s**; el de arranque, hasta 3 s.
- Ataque suave y pico normalizado a −3 dBFS en todos los archivos, para que ninguno destaque sobre los demás.
- Guardar y breakpoint muy sutiles (se repiten mucho); errores y build fallida más presentes pero **sin estridencias**.
- **Cómo se crean:**
  1. `scripts/sounds/generate.js` **sintetiza** los WAV con código: osciladores, ruido filtrado, envolventes y ecos. El resultado es 100 % original, reproducible y fácil de ajustar. Es la v0 de los dos packs.
  2. Opcionalmente se refinan en Audacity, o se mezclan con sonidos de [Freesound](https://freesound.org) con licencia **CC0**.
  3. `sounds/LICENSES.md` registra el origen y la licencia de **cada** archivo.
- Tamaño estimado: unos 11 sonidos × 2 packs ≈ 1–2 MB en el `.vsix`.

### 5.6. Derechos de autor: qué se puede y qué no

| | ¿Se puede? |
|---|---|
| Audio extraído de *Control* o *Control Resonant* dentro de la extensión | ❌ No. Es propiedad de Remedy (y la música, de sus autores). Provoca la retirada del Marketplace |
| Música del juego (Petri Alanko, Poets of the Fall / Old Gods of Asgard…) | ❌ No |
| Voces o frases literales del juego | ❌ No |
| Sonidos **originales inspirados** en los del juego | ✅ Sí |
| Sonidos CC0 de bancos libres | ✅ Sí, documentando la licencia |
| Que cada usuario use **sus propios archivos** con `customFolder` | ✅ La extensión no incluye ni descarga nada; la responsabilidad es del usuario |

---

## 6. Extras de lore (ideas, **fuera de la v1.0** salvo que decidas lo contrario)

Ahora que la extensión tiene código, se pueden añadir guiños útiles. Todos irían **desactivados por defecto**:

| Idea | Juego | Utilidad real |
|---|---|---|
| **Modo Clasificado**: tapa con barras negras los valores de los `.env` y se revelan al pasar el ratón | Control (documentos tachados) | Evita enseñar secretos al compartir pantalla |
| **Nivel de alerta del Bureau** en la barra de estado según el número de errores y warnings | Control | Resumen rápido; al hacer clic abre Problems |
| **Detector de *Patterning***: resalta bloques de código duplicados | Resonant | Ayuda a refactorizar |
| **Mensajes del Board**: comando que muestra un consejo de programación escrito "a lo Board" (`<<…>>`), con textos originales | Control | Easter egg |

---

## 7. Fases de trabajo

Cada fase termina con algo **visible y comprobable**. Los temas van primero porque son el núcleo. El sonido es un módulo independiente que no bloquea los temas.

### Fase 0: Esqueleto (≈ 1 sesión)

- [ ] `git init`, `.gitignore`, primer commit. Mover los planes a `docs/`.
- [ ] `package.json` con `contributes.themes` registrando **CONTROL Dark**, **CONTROL Black** y **CONTROL Resonant** (los tres `uiTheme: "vs-dark"`; no `hc-black`).
- [ ] `src/theme/build.js` mínimo + las tres paletas v0.
- [ ] `.vscode/launch.json` para que F5 abra `test-workspace/`.
- [ ] `test-workspace/` con `ThemeTests.csproj`, `csharp.cs` y `typescript.ts`.

**Hecho cuando:** pulsas F5, eliges cualquiera de los tres temas y el editor cambia.

### Fase 1: Concepto y paletas (Milestone 1)

- [ ] Referencias de ambos juegos (para uso personal; no se versionan si tienen copyright).
- [ ] Validar las paletas v0 de la sección 4, sobre todo el acento Hedron del Resonant.
- [ ] `npm run contrast` revisa las 3 paletas y **falla** si algún par baja del mínimo.
- [ ] Generar `docs/palette.md`.

### Fase 2: Interfaz del Dark (Milestone 2)

Orden en `workbench.js`, de mayor a menor superficie en pantalla:

1. `editor.*`, `editorGroup*`, `tab.*`, `sideBar*`, `activityBar*`, `statusBar*`, `titleBar*`, `panel*`.
2. `focusBorder`, `button.*`, `input.*`, `dropdown.*`, `badge.*`, `progressBar.*`, `list.*`.
3. `editorWidget.*`, `quickInput*`, `editorSuggestWidget.*`, `editorHoverWidget.*`, `notifications*`.
4. `scrollbarSlider.*`, `minimap*`, `breadcrumb.*`, `editorLineNumber.*`, `editorCursor.*`, `editorIndentGuide.*`.

Claves que **deben ser semitransparentes** para no tapar decoraciones: `editor.selectionHighlightBackground`, `editor.wordHighlightBackground`, `editor.findMatchHighlightBackground`, `editor.rangeHighlightBackground`, `editor.inactiveSelectionBackground`, `diffEditor.*TextBackground`.

**Hecho cuando:** abriendo solo un `.txt` el tema se reconoce como CONTROL.

### Fase 3: Sintaxis y semantic tokens del Dark (Milestone 3)

- [ ] `tokens.js`: unos 25 scopes agrupados por los roles de la sección 4.1. Primero los genéricos; los específicos solo cuando el inspector muestre un fallo.
- [ ] `semantic.js` + `"semanticHighlighting": true`: `class`, `interface`, `enum`, `struct`, `method`, `property`, `parameter`, `namespace` y los modificadores `static`, `readonly`, `deprecated` (tachado) y `abstract`.
- [ ] **Colores de corchetes** `editorBracketHighlight.foreground1..6`. Los de serie (dorado, morado, azul) rompen la estética.
- [ ] Probar en este orden: C# → JS → TS → JSON → HTML → CSS/SCSS → Razor → SQL → Markdown → XML.

Notas: **C# y Razor** dependen de Roslyn, hay que esperar a que cargue el proyecto (de ahí el `.csproj`). En **Markdown**, el tema colorea el editor pero no la vista previa.

### Fase 4: Pulido del Dark (Milestone 4)

- [ ] **Terminal:** los 16 colores ANSI, `terminalCursor.*`, `terminal.selectionBackground`.
- [ ] **Git:** `gitDecoration.*`, `editorGutter.*`, `diffEditor.*`, `merge.*`.
- [ ] **Diagnósticos:** `editorError/Warning/Info.foreground`, `editorOverviewRuler.*`.
- [ ] **Widgets:** `peekView*`, `editorInlayHint.*`, `editorStickyScroll.*`, `debugToolbar.*`, `testing.*`.
- [ ] Varios días de **uso real**, anotando lo que molesta en `docs/notas-uso.md`.

### Fase 5: Black (Milestone 5)

- [ ] Ajustar `palettes/black.js` según la tabla 4.2.
- [ ] Revisar dónde desaparece la separación entre superficies y compensar con `border`.
- [ ] Probar en un monitor normal y, si es posible, en OLED.

### Fase 6: Resonant (nuevo)

- [ ] Ajustar `palettes/resonant.js` según la tabla 4.3 y las referencias.
- [ ] Verificar la regla "el rojo es del Hiss": buscar en el JSON generado que **ningún** color rojo aparezca fuera de diagnósticos, errores y Git. Se puede automatizar en `npm run contrast`.
- [ ] Revisar que el acento cian no se confunda con `info` (azul) ni con los keywords en pantallas con poco contraste.

### Fase 7: Motor de sonido (nuevo)

- [ ] `package.json`: `main`, `activationEvents: ["onStartupFinished"]`, `extensionKind`, `contributes.configuration` (sección 5.2) y `contributes.commands`.
- [ ] `player/` para Windows, con macOS y Linux escritos y probados al menos en una máquina o VM.
- [ ] `volume.js` + caché en `globalStorage`.
- [ ] `events.js` con cooldown, `errorTrigger` y `onlyWithControlTheme`.
- [ ] Sonidos de prueba (un simple "bip" generado) para validar el motor **antes** de diseñar los definitivos.
- [ ] `test/*.test.js` con `node --test` para la lógica pura: qué evento produce qué sonido, cooldown, escalado de volumen.
- [ ] Comprobar que con `sounds.enabled = false` no hay listeners ni procesos (Developer: Show Running Extensions).

**Hecho cuando:** activas los sonidos desde los ajustes, guardas con un error y oyes el bip; los desactivas y hay silencio total.

### Fase 8: Diseño de sonido (nuevo)

- [ ] `scripts/sounds/generate.js` produce los 11 sonidos de cada pack.
- [ ] Escuchar todos con *CONTROL: Probar sonidos* y ajustar.
- [ ] `docs/sound-design.md` y `sounds/LICENSES.md` completos.
- [ ] Una jornada de trabajo con los sonidos activados: si algo cansa, se suaviza o pasa a estar apagado por defecto.

### Fase 9: Testing conjunto (Milestone 6)

- [ ] Recorrer `test-workspace/` con los tres temas.
- [ ] Extensiones populares: GitLens, Error Lens, ESLint, C# Dev Kit, Docker.
- [ ] Zoom 100/125/150 %, tema de iconos Seti y Material Icons.
- [ ] Sonidos en un entorno remoto (WSL o Remote-SSH) para confirmar que suenan en local.
- [ ] Capturas de los tres temas para el README.

### Fase 10: Identidad (Milestone 7)

- [ ] **Nombre** definitivo y prefijo de ajustes (sección 8).
- [ ] Icono propio, sin logos, tipografías ni arte de los juegos.
- [ ] README: capturas de las 3 variantes, sección "Sonidos" (cómo activarlos y cómo usar `customFolder`), lenguajes probados, roadmap y **disclaimer**: «Fan-made project. Not affiliated with or endorsed by Remedy Entertainment. CONTROL and CONTROL Resonant are trademarks of their respective owners. All sounds are original recreations.»
- [ ] CHANGELOG (*Keep a Changelog*).

### Fase 11: Empaquetado y release (Milestone 8)

- [ ] `npx vsce package` genera `…-x.y.z.vsix`.
- [ ] `.vscodeignore` excluye `src/theme/`, `scripts/`, `test/`, `test-workspace/`, `docs/` y `.vscode/`. **Incluye** `themes/`, `sounds/` y `src/extension/`.
- [ ] Instalación limpia en un **perfil vacío** de VS Code: los temas funcionan y los sonidos están apagados hasta que se activan.
- [ ] (Opcional) Publicar en **VS Code Marketplace** y en **Open VSX** (Cursor, VSCodium, Windsurf).

> **El sonido forma parte de la v1.0** (decisión 3). Como va apagado por defecto, un usuario que solo quiera los colores no nota ninguna diferencia.

---

## 8. Decisiones que tienes que tomar tú

| # | Decisión | Mi recomendación | Cuándo |
|---|---|---|---|
| 1 | ¿Generador o JSON a mano? | ✅ **Decidido: generador** (sección 3.2) | Fase 0 |
| 2 | ¿Resonant en la v1.0 o en la 1.1? | ✅ **Decidido: v1.0** | Fase 0 |
| 3 | ¿Sonido en la v1.0 o en la 1.1? | ✅ **Decidido: v1.0.** Es un recurso opcional que cada persona activa o desactiva, así que no molesta a quien no lo quiera. Va **apagado por defecto** y cada evento tiene su propio interruptor | Fase 7 |
| 4 | Nombre público y prefijo de ajustes | Aplicado de forma provisional: *"Bureau Theme — inspired by CONTROL"* con prefijo `bureauTheme.`. Los temas se siguen llamando *CONTROL Dark/Black/Resonant*. Cambiarlo antes de publicar es un buscar/reemplazar | Antes de publicar |
| 5 | Publisher ID | Aplicado de forma provisional: `JaviHexer` (tu nick de git). Hay que crearlo en el Marketplace | Fase 11 |
| 6 | ¿Repositorio público en GitHub desde el principio? | Sí | Fase 0 |
| 7 | ¿Cursivas en comentarios y parámetros? | Sí, documentando cómo quitarlas | Fase 3 |
| 8 | ¿Algún extra de lore (sección 6) en la v1.0? | No; el **Modo Clasificado** es el mejor candidato para la 1.1 | Tras la v1.0 |

---

## 9. Definición de terminado (v1.0)

Tu sección 26, ampliada:

- Los **tres** temas están completos y pasan `npm run contrast`.
- En Resonant, el rojo aparece solo en errores, diagnósticos y Git.
- C#, JS/TS, HTML/CSS, JSON y Razor son legibles en los tres.
- Terminal, Git, errores y warnings están bien integrados.
- **Sonidos**: apagados por defecto, cada evento se puede activar por separado, funcionan en Windows, macOS y Linux, en remoto suenan en local y `sounds/LICENSES.md` está completo.
- README (con disclaimer), icono y CHANGELOG.
- Se instala mediante `.vsix` en un perfil limpio.
- Se ha usado durante varias sesiones reales de desarrollo.

---

## 10. Variantes futuras (después de la v1.0)

Cada una es una paleta nueva más, opcionalmente, un pack de sonido:

- **Hiss** (*Control*): rojo agresivo y experimental.
- **Astral Plane** (*Control*): tema **claro**, blanco y negro con detalles rojos.
- **Ashtray Maze** (*Control*): oscuro con acentos dorados y cálidos.
- **Gravity Anomaly** (*Resonant*): variante más contrastada y "desorientada" del Resonant.
- **Oldest House**: variante gris brutalista más clara que el Dark.

---

## 11. Siguiente paso

Si estás de acuerdo con el plan, empezamos por la **Fase 0**: inicializo git y creo el esqueleto con el generador y las **tres** paletas v0. Así, en esa misma sesión, pulsas F5 y ves los tres temas funcionando.
