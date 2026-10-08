# Plan técnico — Tema de VS Code inspirado en CONTROL y CONTROL Resonant

> Complemento a `plan_tema_vscode_control.md`. Ese plan define **qué** queremos conseguir; este define **cómo** lo vamos a construir: arquitectura, paletas con valores reales, módulo de sonido, herramientas y tareas concretas por fase.
>
> **Versión 2 (2026-10-06):** incorpora elementos de los dos juegos (*Control*, 2019, y *Control Resonant*, 2026), una tercera variante de color y un **módulo de sonidos opcional** que se activa y desactiva desde los ajustes.

---

## Estado de la implementación (2026-10-06, versión 0.5.0)

| Fase | Estado | Cómo se ha verificado |
|---|---|---|
| 0. Esqueleto | ✅ | F5 abre `test-workspace` con el tema; git con historial por fases |
| 1. Paletas | ✅ | `npm run contrast`: todas las comprobaciones WCAG pasan en los 3 temas |
| 2–4. Dark (UI, sintaxis, pulido) | ✅ | 655 claves validadas contra VS Code 1.140 (`npm run validate`); vista previa con las gramáticas reales (`npm run preview`); capturas reales |
| 5. Black | ✅ | Hereda de Dark; colores de la interfaz comprobados píxel a píxel en una captura |
| 6. Resonant | ✅ | Regla «el rojo es del Hiss» comprobada automáticamente |
| 7. Motor de sonido | ✅ | 39 tests unitarios + test de integración en VS Code real: los **11 eventos** suenan (con WAV silenciosos) |
| 8. Diseño de sonido | ✅ | 22 sonidos originales; forma de onda y espectrograma revisados; sin clics ni cortes (final ≤ −64 dB) |
| 9. Testing conjunto | 🟡 | Automático: hecho. **Pendiente (tú):** varios días de uso real, monitor OLED, extensiones populares, macOS/Linux |
| 10. Identidad | 🟡 | Icono, README, CHANGELOG, disclaimer y capturas hechos. **Pendiente (tú):** confirmar nombre y publisher |
| 11. Empaquetado | 🟡 | `bureau-theme-0.5.0.vsix` instalado en un perfil limpio. **Pendiente (tú):** repositorio de GitHub y publicación |

**Cambios respecto al plan, descubiertos durante la implementación:**

- **VS Code 1.140 trae el diseño «modern UI» activado por defecto**, que ignora `tab.activeBorderTop` (la línea roja de la pestaña activa). Se añadieron las claves `modernEditorTab.*`, `modernTab.*` y `modernActivityBarItem.*`: la pestaña activa del panel es una «píldora» teñida con el acento.
- **Errores:** la referencia ya no se toma a los 4 s de arrancar. Mientras no editas, sigue a los diagnósticos en silencio (abrir un archivo con errores, cerrar uno o la carga del servidor de C# no suenan); al editar se congela hasta la siguiente comprobación. Lo detectó el test de integración.
- **SQL:** la gramática usa el mismo scope para `SELECT` y para `AND`/`LIKE`, así que solo ese grupo va en rojo; el resto de palabras SQL van apagadas.
- **Keywords:** se separaron en *control de flujo* (rojo) y *declaraciones/modificadores* (tono apagado) para cumplir «uso moderado del rojo» en C#, que tiene muchísimas palabras reservadas.
- **Black:** se mantuvo `#0A0A0B` (no negro puro).

**Comandos útiles:**

| Comando | Para qué |
|---|---|
| `npm run build` / `npm run watch` | Generar los temas (una vez / al guardar) |
| `npm run check` | Build + contraste + validación de claves + tests |
| `npm run preview` | Vistas previas HTML en `.preview/` e informe de scopes sin color |
| `npm run sounds` | Regenerar los 22 sonidos y su documentación |
| `npm run test:integration` | Test en VS Code real (abre una ventana unos segundos) |
| `npm run icons` | Regenerar el tema de iconos Bureau Icons |
| `npm run product-icons` | Regenerar los iconos internos (Bureau Product Icons) |
| `npm run package` | Generar el `.vsix` |
| `npm run install:local` | Empaquetar e instalar en tu VS Code (sin publicar) |

### Versión 0.6.0: el Plano Astral y los laterales

Pedido: «meter cosas del lore del Plano Astral y darle más diseño a los laterales, que no solo se reflejen los colores».

| Qué | Dónde | Verificado |
|---|---|---|
| **CONTROL Astral** (4º tema, claro): vacío blanco, monolito negro, acento estructural negro y rojo solo en detalles | `src/theme/palettes/astral.js` | Contrastes WCAG; captura real |
| **Monolito**: Activity Bar, barra de estado y barra de título en un bloque oscuro (roles `bg.chrome`, `fg.chrome*`) | `workbench.js` | Píxeles de las capturas |
| **Señalética**: título de la sidebar como franja del monolito con línea del acento; reglas del acento entre secciones; guías del árbol; «luz astral» blanca en los elementos activos | `workbench.js` (`accent.line`, `fg.chromeActive`) | Píxeles de las capturas |
| **Chat** (panel secundario): burbujas, código, avatares e indicadores de sesión | `workbench.js` (`chat.*`) | Claves validadas en VS Code 1.140 |
| **Bureau Icons**: tema de iconos con 178 SVG (oscuro y claro), etiquetas tipo expediente, carpetas de hormigón; lore: `.env` tachado, hexágono de la Hedron en tests, pirámide del Consejo como carpeta raíz | `scripts/icons.js` → `icons/` | Hoja de revisión + test que valida cada SVG |
| **Indicador de lugar** en la barra de estado (`▼ THE OLDEST HOUSE`…) | `src/extension/location.js` | Test de integración en VS Code real |

Nota: los paneles de otras extensiones (como el de Claude Code) son *webviews*: usan los colores del tema que ellas deciden, así que el tema no puede cambiar su maquetación, solo los colores que comparten.

### Versión 0.7.0: iconos internos, tipografía y detalles

Peticiones: (1) cambiar los iconos internos de VS Code (Copilot, rama de Git → pirámide invertida); (2) opción de usar la tipografía de los juegos al instalar; (3) Astral se lee mal; (4) quitar el indicador de lugar de la barra de estado y cambiar los iconos de la barra lateral, adaptados a sus posiciones; (5) más detalles visuales en cada tema.

**Investigación (1) y (4): ¿se pueden cambiar los iconos internos?** Sí, con un *Product Icon Theme* (`contributes.productIconThemes`): un archivo de fuente (`.woff`) con un glifo por icono y un JSON que asigna cada identificador de VS Code a un glifo. Lo comprobado en VS Code 1.140:

| Se puede sustituir | Cómo se identifica |
|---|---|
| Iconos de la barra de actividad | `explorer-view-icon`, `search-view-icon`, `source-control-view-icon`, `run-view-icon`, `extensions-view-icon`, `accounts-view-bar-icon`, `settings-view-bar-icon` |
| Rama de Git (barra de estado) | codicon `git-branch` |
| Copilot y chat | codicon `copilot`, icono `copilot-logo` (lo registra Copilot), `chat-sparkle`, `chat-view-icon` |
| Campana de notificaciones | codicons `bell`, `bell-dot` |

| No se puede | Por qué |
|---|---|
| Icono de Claude Code y de otras extensiones con imagen propia | Lo cargan como un archivo SVG, no como un icono con identificador |
| La tipografía de la interfaz (menús, pestañas) | VS Code no tiene ningún ajuste para ella |

Los iconos se ven igual con la barra de actividad a un lado, arriba o abajo (glifos legibles a 24 y a 16 px; comprobado con capturas en ambas posiciones).

**Investigación (2): tipografías de los juegos.** *Control* usa Interstate (señalética e interfaz), ITC Avant Garde Gothic (títulos y logo) y Akzidenz-Grotesk / Basic Commercial (documentos) — fuentes: [Fonts In Use](https://fontsinuse.com/uses/48689/control-video-game), [Kotaku](https://kotaku.com/the-fonts-in-control-make-its-world-feel-way-creepier-1837714580). Son comerciales: no se pueden incluir. Las de *Control Resonant* no están documentadas. Solución: alternativas con licencia SIL OFL incluidas en la extensión (Overpass, derivada de Highway Gothic como Interstate; Space Mono / Space Grotesk para Resonant), instaladas solo para el usuario y con restauración.

| Qué | Dónde | Verificado |
|---|---|---|
| **Bureau Product Icons** (12 glifos → 27 iconos de VS Code) | `scripts/product-icons.js` → `product-icons/` | Hoja de glifos de la fuente real; capturas con la barra a un lado y arriba; test de coherencia |
| **Tipografías** (oferta al instalar, comando, modo «según el tema», restaurar, quitar) | `src/extension/fontsets.js`, `font-installer.js`, `fonts.js`, `fonts/` | Tests unitarios (registro de Windows simulado); test de integración que instala, aplica, cambia según el tema, restaura y desinstala sin dejar restos; capturas con Overpass Mono y Space Mono |
| **Astral** más legible (código ≥ 7:1, texto ≥ 15:1) | `palettes/astral.js`, `scripts/contrast.js` | Contraste con mínimos AAA |
| **Detalles visuales**: resplandor del acento, número de línea activa, guías, reglas, línea bajo las pestañas, canal de números; **Black** con identidad propia (Plano Astral en negativo) | `workbench.js`, `palettes/black.js` | Píxeles de las capturas |
| Quitado el indicador de lugar de la barra de estado | — | Tests e integración actualizados |

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

### 3.1. Estructura (tal como quedó implementada)

```text
Theme-Control/
├── package.json                 # manifiesto: temas, ajustes, comandos, scripts npm
├── package.nls.json · package.nls.es.json   # textos de ajustes y comandos (inglés / español)
├── README.md · CHANGELOG.md · LICENSE (MIT)
├── .vscodeignore · .gitignore · .gitattributes · .editorconfig · jsconfig.json
│
├── .vscode/
│   ├── launch.json              # F5 → Extension Development Host con test-workspace
│   └── tasks.json               # build, watch (regenera al guardar) y check
│
├── src/
│   ├── theme/                   # GENERADOR DE TEMAS (fuente de verdad de los colores)
│   │   ├── palettes/dark.js · black.js · resonant.js
│   │   ├── color.js             # utilidades: alpha, mix, contraste WCAG, «¿es rojo?»
│   │   ├── workbench.js         # 655 colores de la interfaz a partir de roles
│   │   ├── tokens.js            # tokenColors (TextMate)
│   │   ├── semantic.js          # semanticTokenColors (incl. Roslyn y Razor)
│   │   └── build.js             # escribe themes/*.json y comprueba que las paletas tienen los mismos roles
│   │
│   └── extension/               # CÓDIGO QUE SE EJECUTA EN VS CODE (módulo de sonido)
│       ├── extension.js         # activate(): comandos + controlador
│       ├── controller.js        # conecta los eventos de VS Code con el motor
│       ├── rules.js             # lógica PURA: cooldown, errores, tareas, terminal, packs (testeable sin VS Code)
│       ├── catalog.js           # evento → archivo .wav y prioridad
│       ├── config.js            # lectura y normalización de bureauTheme.sounds.*
│       ├── soundbank.js         # carpeta personalizada o pack incluido
│       ├── volume.js            # volumen escalando las muestras del WAV + caché
│       └── player/
│           ├── index.js         # elige el reproductor según el SO
│           ├── windows.js       # proceso PowerShell persistente
│           └── process-player.js# afplay (macOS) y paplay / pw-play / aplay (Linux)
│
├── l10n/bundle.l10n.es.json     # mensajes de la extensión en español
├── themes/                      # GENERADO (no se edita a mano, sí se versiona)
├── sounds/control · sounds/resonant · sounds/LICENSES.md   # GENERADO por npm run sounds
│
├── scripts/
│   ├── contrast.js              # contrastes WCAG + regla «el rojo es del Hiss» (+ docs/palette.md)
│   ├── validate-keys.js         # cada clave de color existe en tu VS Code
│   ├── preview.js               # vista previa HTML con las gramáticas reales de VS Code
│   ├── icon.js                  # genera images/icon.png
│   ├── integration.js           # lanza el test de integración en VS Code (perfil aislado)
│   ├── lib/png.js · lib/vscode-install.js
│   └── sounds/dsp.js · sounds/generate.js   # sintetizador y recetas de los 22 sonidos
│
├── test/                        # node:test, sin dependencias
│   ├── rules.test.js · volume.test.js · soundbank.test.js
│   ├── manifest.test.js         # package.json ↔ catálogo ↔ traducciones ↔ archivos
│   ├── themes.test.js           # JSON actualizados, roles, contraste
│   └── integration/index.js     # se ejecuta DENTRO de VS Code (npm run test:integration)
│
├── test-workspace/              # un archivo por lenguaje + errors.ts, terminal-colors.js, tareas y depuración
│
├── docs/
│   ├── plan_tema_vscode_control.md · plan_claude.md
│   ├── palette.md               # GENERADO: contrastes de las 3 paletas
│   └── sound-design.md          # GENERADO: descripción de cada sonido
│
└── images/
    ├── icon.png                 # 256×256, diseño propio
    └── screenshots/             # capturas reales de los 3 temas (instalación limpia del .vsix)
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
| 5 | Publisher ID y autor | ✅ **Normalxxnavi** (corregido el 2026-10-07; no es el nick de git). Hay que crear el publisher en el Marketplace | Fase 11 |
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

### Versión 0.8.0: más iconos internos, iconos de archivo rediseñados e identidad

Peticiones: (1) quedaban iconos internos sin cambiar (nube de publicar, errores y avisos, `><` remoto, barra del panel, cubo, flechas de navegación); (2) los iconos de carpetas eran pobres y había que cubrir todas las extensiones conocidas; (3) actualizar imagen, título, descripción, detalles y autor (**Normalxxnavi**, no JaviHexer).

| Qué | Dónde | Verificado |
|---|---|---|
| **Product icons**: de 27 a **160 iconos** (97 glifos). Se sustituyen los codicons base (`close`, `chevron-*`, `add`, `refresh`, `gear`…), así que cambian también los iconos registrados que dependen de ellos (`panel-close`, `terminal-kill`, `folding-*`…). Lista sacada del propio VS Code 1.140 (390 iconos registrados) | `scripts/product-icons.js` | Hoja de los 97 glifos en oscuro y claro; capturas reales de la barra de estado, el panel y la barra de título |
| **Bureau Icons** rediseñado: archivos como expedientes sólidos con código o pictograma; carpetas sólidas por categoría con **emblema** (41 categorías). 498 SVG: 340 extensiones, 284 nombres de archivo, 84 lenguajes, 278 carpetas | `scripts/icons.js` | Explorador simulado en oscuro y claro; test de validez de cada SVG |
| **Identidad**: autor y publisher **Normalxxnavi**, licencia, repositorio, nuevo icono (pirámide del Consejo), título y descripción en inglés y español, README reescrito | `package.json`, `package.nls*.json`, `LICENSE`, `scripts/icon.js`, `README.md` | Instalación limpia del `.vsix` con el nuevo ID |

### Versión 0.8.1: Theme CONTROL, capturas profesionales y detalles bilingües

Peticiones: título **Theme CONTROL**; descripción más corta y profesional; capturas profesionales de los temas con los iconos de archivo y de producto; detalles con una sección en inglés y otra en español.

| Qué | Dónde | Verificado |
|---|---|---|
| Título **Theme CONTROL** y descripción corta (inglés y español) | `package.nls.json`, `package.nls.es.json` | Instalación limpia del `.vsix` |
| **Icono nuevo**: el Consejo como aparece en el Plano Astral, una pirámide invertida de piedra negra mate en el vacío blanco, vista desde abajo (dibujo propio, sin arte del juego) | `scripts/icon.js` | Revisado a 256, 128, 64 y 42 px sobre fondo claro y oscuro |
| **Capturas profesionales**: VS Code real con un proyecto de demostración (Git con cambios, tarea de tests en la terminal, tipografía del juego), compuestas sobre fondos por tema: portada con los cuatro temas en franjas diagonales, una lámina por tema con su paleta, vitrina de Bureau Icons, comparación VS Code → Bureau de los iconos de producto y tipografía | `images/screenshots/` | Revisadas una a una |
| **README bilingüe**: sección completa en inglés y otra en español, con las nuevas imágenes | `README.md` | Todas las imágenes enlazadas existen |
| Rama de Git con cambios, preparada o con conflictos: la pirámide con una marca (4 glifos nuevos, 166 iconos) | `scripts/product-icons.js` | Barra de estado con `main*` en las capturas |
| La página de detalles de VS Code solo carga imágenes `https:` (quita las rutas relativas y `data:`): en una instalación local las capturas se verán cuando el repositorio sea público, porque vsce reescribe los enlaces a GitHub | `README.md` | Página de detalles en un perfil aislado |

### Versión 0.9.0: iconos a color, archivos nítidos, Astral más vivo, arranque rápido

Peticiones: (1) insignias de «cómo está hecho» y emblemas fan en los detalles; (2) volver al diseño antiguo de los iconos de archivo, que el nuevo se pixela; (3) una versión a color de los iconos de producto (el teléfono rojo…); (4) arranque más rápido; (5) colores del código de CONTROL Astral más vivos; (6) investigar si es legal.

| Qué | Dónde | Verificado |
|---|---|---|
| **Insignias** (shields.io, por https: se ven en la página de detalles) con emblemas fan hechos con glifos propios y las herramientas del proyecto; sección **How it's made / Cómo está hecho** | `scripts/badges.js`, `README.md` | Renderizadas en Edge; la URL más larga, 731 caracteres |
| **Bureau Icons**: archivos con el estilo 0.7 (etiqueta o pictograma de color sobre la franja de clasificación), más grandes y en píxeles enteros; pictogramas como máscara para que sus huecos sean transparentes. Carpetas y cobertura de la 0.8 sin cambios | `scripts/icons.js` | Comparativa 0.7 / 0.8 / 0.9 a 16 px y ampliada, en oscuro y claro |
| **Bureau Product Icons (Color)**: segunda fuente con tablas COLR/CPAL escritas a mano (`scripts/lib/colr.js`); 19 glifos con color real, el resto sigue al tema (0xFFFF) | `scripts/product-icons.js`, `package.json` | Hoja en Edge (Chromium) sobre fondo oscuro y claro; test de coherencia de COLR/CPAL |
| **Arranque**: bundle con esbuild (`dist/extension.js`, 26 KB); motor de sonido, instalador de fuentes y canal de log perezosos; trabajo inicial en el siguiente turno | `scripts/bundle.js`, `src/extension/*` | Carga + activate: 17,1 → 3,1 ms (mediana de 7); 14 → 1 archivos; «Running Extensions» con un host ocupado: fuera del top 7 (< 14 ms) |
| **CONTROL Astral**: colores del código más vivos, código en AA (≥ 4,5:1) y texto en AAA | `src/theme/palettes/astral.js`, `scripts/contrast.js` | `npm run contrast` |
| **Aviso legal** con el texto exacto de las normas de contenido fan de Remedy | `README.md` | — |

El 1560 ms que veía Javier en su VS Code incluye esperas del propio VS Code (traducciones, almacenamiento de la extensión) mientras C# Dev Kit, Docker y otras extensiones arrancan a la vez; el trabajo propio de la extensión es ahora de unos 3 ms.

### Versión 0.10.0: Bureau — CONTROL Fan Theme, consola de sonido y lore

Peticiones: (1) nombre fácil de buscar que haga referencia a CONTROL; (2) descripción más profesional; (3) color en **todos** los iconos de producto (versión Color); (4) consola de sonido para quien no sabe tocar `settings.json`, con un icono que se pueda ocultar; (5) menos pirámides y más iconos del lore; (6) iconos repartidos por las descripciones en lugar de un bloque de insignias; todo optimizado.

| Qué | Dónde | Verificado |
|---|---|---|
| Nombre **Bureau — CONTROL Fan Theme** (marca propia + «CONTROL», «Fan» y «Theme» para la búsqueda) y descripción nueva; 28 palabras clave | `package.nls*.json`, `package.json` | Página de detalles en un perfil aislado |
| **Consola de sonido**: icono de *resonancia* en la barra de estado → menú (activar, pack, volumen con muestra, eventos, probar, avanzado, ocultar icono). Ajuste `bureauTheme.sounds.statusBarItem`, comandos «Abrir la consola de sonido…» y «Mostrar/ocultar el icono de sonido» | `src/extension/sound-status.js`, `sound-menu.js`, `labels.js` | Test de integración (icono visible, cambia con los sonidos, se oculta y vuelve); captura real de la consola |
| **16 glifos nuevos del lore** (Polaris, Laberinto del Cenicero, patito de goma, disquete, cinta de Ahti, televisión Benicoff, proyector, caja fuerte, fregona de Ahti, llave del Motel Oceanview, Casa Inmemorial, Umbral, Aberrante, gramola Songmaster, resonancia encendida/apagada); 184 iconos de VS Code sustituidos con 111 glifos | `scripts/product-icons.js` | Hoja de glifos a 56 y 16 px |
| **Todos** los glifos con color en la versión Color (ninguna capa sigue al tema) | `scripts/product-icons.js` | Test: 111 glifos base en COLR y ninguna capa 0xFFFF |
| Menos pirámides: carpeta raíz = Casa Inmemorial, `.git` = Laberinto, archivos de IA = Polaris | `scripts/icons.js` | Iconos a 16 y 48 px |
| **Chapas** (shields.io con glifos propios) repartidas por las descripciones y tablas, tabla «Objetos de Poder en tu barra de herramientas»; generadas por script como referencias al final del README | `scripts/badges.js`, `README.md` | Se ven en la página de detalles local |
| **Arranque**: el código se divide en tres archivos (`extension.js` 14 KB al arrancar, `controller.js` solo con sonidos y `sound-menu.js` al abrir la consola). Trabajo propio al arrancar: 2,6 ms | `scripts/bundle.js`, `src/extension/extension.js` | Mediana de 7 arranques con `vscode` simulado |
| El test de integración vuelve a instalar las fuentes que el usuario ya tenía (antes las desregistraba) | `test/integration/index.js` | Registro de Windows tras el test |
