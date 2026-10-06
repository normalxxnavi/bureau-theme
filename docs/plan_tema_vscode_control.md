# Plan de implementación — Tema de VS Code inspirado en CONTROL

## 1. Objetivo del proyecto

Crear una extensión de temas para Visual Studio Code inspirada en la estética de **CONTROL / Remedy Entertainment**, con una identidad visual propia y pensada para ser cómoda durante sesiones largas de desarrollo.

La primera versión de la extensión deberá incluir obligatoriamente dos variantes:

- **Dark Theme**: tema principal, oscuro, basado en grises carbón, hormigón, negro y acentos rojos.
- **Black Theme**: variante mucho más oscura, con fondos cercanos al negro absoluto y una estética más agresiva/minimalista.

La idea es comenzar con estas dos variantes y dejar abierta la posibilidad de añadir en el futuro otras inspiradas en conceptos como Hiss, Astral Plane, Black Rock, The Oldest House, etc.

---

# 2. Principios de diseño

Antes de crear archivos de VS Code conviene definir unas reglas claras.

## 2.1. Prioridades

El tema debe buscar este equilibrio:

1. Buena legibilidad.
2. Jerarquía visual clara.
3. Comodidad durante muchas horas.
4. Identidad visual inspirada en CONTROL.
5. Consistencia entre lenguajes.
6. Uso moderado del rojo.

El rojo no debería dominar todo el editor. Es mejor utilizarlo como color de énfasis para:

- elementos activos;
- cursor;
- selecciones;
- badges;
- indicadores;
- errores;
- botones principales;
- determinados keywords o elementos de alto nivel.

---

# 3. Dirección artística

## 3.1. Referencias visuales

Crear una carpeta de referencias con capturas o imágenes que sirvan únicamente como inspiración visual.

Buscar referencias de:

- Federal Bureau of Control;
- The Oldest House;
- arquitectura brutalista;
- hormigón;
- señalética institucional;
- iluminación roja;
- documentos clasificados;
- interfaces del juego;
- Black Rock;
- Astral Plane.

No es necesario copiar literalmente los colores del videojuego.

El objetivo es construir una paleta propia inspirada en esas referencias.

---

# 4. Definir la paleta base

Crear una tabla con los colores principales del proyecto.

Como mínimo definir:

- Background principal.
- Background secundario.
- Background de paneles.
- Background de pestañas.
- Foreground principal.
- Foreground secundario.
- Texto desactivado.
- Bordes.
- Accent principal.
- Accent secundario.
- Rojo FBC.
- Error.
- Warning.
- Success.
- Information.
- Selection.
- Cursor.
- Línea activa.

Conviene guardar los valores HEX en un documento independiente para mantener consistencia.

Ejemplo conceptual:

```text
Background
Panel
Elevated panel
Foreground
Muted foreground
FBC Red
Hiss Red
Concrete Gray
Black Rock
Warning
Success
Info
```

---

# 5. Diseñar las dos variantes iniciales

## 5.1. Dark Theme

Será el tema principal y el más equilibrado.

Características previstas:

- fondo gris carbón muy oscuro;
- sidebar ligeramente diferente al editor;
- paneles con sensación de profundidad;
- rojo FBC como accent;
- texto principal blanco/gris claro;
- bordes discretos;
- selección rojiza de baja intensidad;
- línea activa visible pero poco intrusiva;
- buen contraste para programación diaria.

Debe ser la variante de referencia para definir primero todos los tokens.

---

## 5.2. Black Theme

Será la versión más oscura.

Características previstas:

- fondo principal cercano al negro absoluto;
- sidebar y paneles apenas diferenciados;
- contraste alto;
- rojo utilizado de forma todavía más selectiva;
- sensación más minimalista;
- ideal para monitores OLED;
- menos grises intermedios que el Dark Theme.

El Black Theme debería heredar conceptualmente la misma jerarquía de colores del Dark Theme.

No conviene diseñarlo desde cero.

Primero se termina el Dark Theme y después se adapta su paleta.

---

# 6. Preparar el proyecto de extensión

Cuando la dirección visual esté clara:

1. Instalar Node.js si todavía no está disponible.
2. Instalar las herramientas oficiales para generar extensiones de VS Code.
3. Crear un proyecto de tipo **Color Theme**.
4. Crear la estructura principal de la extensión.

Estructura recomendada:

```text
control-vscode-theme/
│
├── package.json
├── README.md
├── CHANGELOG.md
├── LICENSE
│
├── images/
│   ├── icon.png
│   └── screenshots/
│
└── themes/
    ├── control-dark-color-theme.json
    └── control-black-color-theme.json
```

---

# 7. Configurar la extensión

El archivo `package.json` debe registrar ambas variantes.

Conceptualmente:

```text
CONTROL Dark
CONTROL Black
```

Cada una apuntará a su correspondiente archivo JSON dentro de `/themes`.

También habrá que definir:

- nombre de la extensión;
- display name;
- descripción;
- versión;
- publisher;
- icono;
- categorías;
- repositorio;
- palabras clave.

---

# 8. Primera fase de implementación: interfaz de VS Code

Antes de colorear el código, hacer que toda la interfaz funcione visualmente.

Trabajar primero sobre el **Dark Theme**.

Configurar progresivamente:

- editor;
- sidebar;
- Activity Bar;
- Status Bar;
- tabs;
- panel inferior;
- terminal;
- Command Palette;
- inputs;
- buttons;
- dropdowns;
- notifications;
- badges;
- breadcrumbs;
- minimap;
- scrollbars;
- Git decorations;
- selection;
- cursor;
- línea activa;
- borders.

Objetivo:

El tema debe resultar reconocible incluso abriendo únicamente un archivo `.txt`.

---

# 9. Segunda fase: colores del código

Después de terminar la interfaz básica, configurar Syntax Highlighting.

Definir colores para:

- comments;
- strings;
- numbers;
- booleans;
- keywords;
- functions;
- methods;
- variables;
- constants;
- classes;
- interfaces;
- enums;
- namespaces;
- properties;
- parameters;
- operators;
- types;
- attributes.

No intentar usar un color diferente para cada cosa.

Es preferible crear una jerarquía visual consistente.

Ejemplo:

```text
Texto normal
Variables / propiedades
Funciones / métodos
Tipos / clases
Keywords
Constantes / valores especiales
```

---

# 10. Tercera fase: Semantic Highlighting

Después del syntax highlighting básico, revisar Semantic Tokens.

Prestar atención a:

- class;
- interface;
- enum;
- struct;
- method;
- property;
- parameter;
- namespace;
- static;
- readonly;
- abstract;
- deprecated.

Esto es especialmente importante en lenguajes como:

- C#;
- TypeScript;
- JavaScript.

---

# 11. Crear un workspace de pruebas

Crear un proyecto específico para validar el tema.

Ejemplo:

```text
ThemeTests/
│
├── csharp.cs
├── javascript.js
├── typescript.ts
├── html.html
├── css.css
├── json.json
├── sql.sql
├── markdown.md
├── razor.cshtml
└── xml.xml
```

Cada archivo debería contener ejemplos de:

- variables;
- funciones;
- clases;
- interfaces;
- enums;
- strings;
- números;
- comentarios;
- constantes;
- propiedades;
- errores;
- warnings.

El objetivo es detectar rápidamente inconsistencias.

---

# 12. Orden recomendado de lenguajes

Priorizar inicialmente:

1. C#.
2. JavaScript.
3. TypeScript.
4. JSON.
5. HTML.
6. CSS / SCSS.
7. Razor.
8. SQL.
9. Markdown.
10. XML.

Cuando estos funcionen correctamente, probar otros lenguajes.

---

# 13. Utilizar el inspector de tokens de VS Code

Durante las pruebas utilizar las Developer Tools de VS Code para inspeccionar tokens.

Esto permitirá comprobar:

- cómo clasifica VS Code una palabra;
- qué TextMate scope está utilizando;
- qué semantic token está aplicando;
- qué regla del tema gana prioridad.

Esto será fundamental para corregir casos donde un elemento aparezca con un color inesperado.

---

# 14. Finalizar el Dark Theme

Antes de comenzar realmente el Black Theme, completar el Dark Theme.

Checklist:

- interfaz consistente;
- syntax highlighting completo;
- semantic highlighting revisado;
- terminal correctamente integrada;
- Git legible;
- errores y warnings visibles;
- selección correcta;
- contraste adecuado;
- pruebas en distintos archivos;
- pruebas durante varias horas de uso real.

No pasar al Black Theme hasta que esta base sea estable.

---

# 15. Crear el Black Theme

Duplicar conceptualmente la estructura del Dark Theme y modificar principalmente la paleta.

Cambios principales:

- fondo más negro;
- paneles más oscuros;
- menor diferencia entre superficies;
- colores de código ligeramente reajustados;
- reducción de algunos grises;
- revisión del contraste;
- accents rojos algo más contenidos.

Mantener los mismos conceptos semánticos:

```text
Function color
Class color
Keyword color
String color
Comment color
etc.
```

De esta forma ambas variantes se sentirán como miembros de la misma familia.

---

# 16. Pruebas de contraste

Revisar especialmente:

- texto normal sobre fondo;
- comentarios;
- placeholders;
- texto deshabilitado;
- pestañas inactivas;
- breadcrumbs;
- terminal;
- selection;
- hover;
- errores;
- warnings;
- diffs de Git.

Evitar colores que se vean espectaculares en una captura pero resulten incómodos durante varias horas.

---

# 17. Identidad de la extensión

Cuando los temas estén maduros, definir la identidad del producto.

Preparar:

- nombre definitivo;
- icono;
- descripción;
- screenshots;
- banner;
- README;
- créditos;
- disclaimer.

Evitar presentar la extensión como un producto oficial de Remedy.

Es recomendable indicar claramente que se trata de un proyecto fan-made inspirado en la estética de CONTROL.

---

# 18. README

El README debería incluir:

- descripción del proyecto;
- screenshots;
- Dark Theme;
- Black Theme;
- instalación;
- lenguajes probados;
- recomendaciones;
- problemas conocidos;
- roadmap;
- créditos;
- disclaimer.

---

# 19. Versionado

Utilizar Semantic Versioning.

Ejemplo:

```text
0.1.0
```

Primera versión experimental.

```text
0.5.0
```

Tema funcional pero todavía en desarrollo.

```text
1.0.0
```

Primera versión estable.

Después:

```text
1.0.1
1.1.0
1.2.0
2.0.0
```

---

# 20. Empaquetar la extensión

Antes de publicarla:

1. Instalar la herramienta de empaquetado de extensiones de VS Code.
2. Generar un archivo `.vsix`.
3. Instalar ese `.vsix` manualmente.
4. Probar la extensión como si fuera un usuario externo.

Ejemplo:

```text
control-theme-0.1.0.vsix
```

Esto permite distribuir el tema sin publicarlo todavía en Marketplace.

---

# 21. Publicación

Cuando la versión sea suficientemente estable:

- crear publisher;
- preparar la ficha;
- subir icono;
- añadir screenshots;
- completar README;
- publicar en Visual Studio Marketplace.

Antes de publicar revisar nombres, imágenes y referencias a CONTROL/Remedy para evitar que pueda confundirse con una extensión oficial.

---

# 22. Roadmap recomendado

## Milestone 1 — Concepto

- Elegir nombre provisional.
- Recopilar referencias.
- Crear paleta.
- Definir reglas visuales.

Resultado:

**Guía visual básica terminada.**

---

## Milestone 2 — Dark UI

- Crear extensión.
- Registrar Dark Theme.
- Diseñar interfaz principal.
- Ajustar editor, sidebar, tabs y terminal.

Resultado:

**VS Code ya tiene apariencia CONTROL.**

---

## Milestone 3 — Dark Syntax

- Syntax highlighting.
- Semantic highlighting.
- C#.
- JavaScript.
- TypeScript.
- JSON.
- HTML/CSS.
- Razor.

Resultado:

**Dark Theme utilizable diariamente.**

---

## Milestone 4 — Dark Polish

- Git.
- terminal.
- warnings.
- errors.
- hover.
- notifications.
- contrast.
- minimap.
- breadcrumbs.

Resultado:

**Dark Theme prácticamente terminado.**

---

## Milestone 5 — Black Theme

- Crear variante Black.
- Adaptar backgrounds.
- Revisar contraste.
- Ajustar syntax colors.
- Probar en OLED y monitores normales.

Resultado:

**Dos temas funcionales.**

---

## Milestone 6 — Testing

- Workspace de pruebas.
- Uso real.
- Revisar inconsistencias.
- Probar extensiones populares.
- Probar distintos tamaños de pantalla.

Resultado:

**Release Candidate.**

---

## Milestone 7 — Branding

- Icono.
- nombre.
- README.
- screenshots.
- changelog.
- disclaimer.

Resultado:

**Extensión lista para distribuir.**

---

## Milestone 8 — Release

- Generar `.vsix`.
- Probar instalación limpia.
- Crear versión `1.0.0`.
- Publicar opcionalmente en Marketplace.

Resultado:

**Primera versión pública.**

---

# 23. Posibles variantes futuras

No implementarlas durante la primera versión.

Ideas:

### Hiss

Tema rojo agresivo y experimental.

### Astral Plane

Tema claro blanco/negro con detalles rojos.

### Black Rock

Tema ultradark con tonos minerales.

### Oldest House

Variante gris brutalista.

La primera versión debería centrarse únicamente en:

```text
CONTROL Dark
CONTROL Black
```

---

# 24. Orden real de trabajo recomendado

La secuencia más segura sería:

```text
Referencias visuales
        ↓
Paleta
        ↓
Dark Theme UI
        ↓
Dark Theme Syntax
        ↓
Dark Theme Semantic Tokens
        ↓
Testing
        ↓
Polish Dark
        ↓
Black Theme
        ↓
Testing conjunto
        ↓
Branding
        ↓
VSIX
        ↓
Release 1.0
```

---

# 25. Regla principal del proyecto

No intentar completar todos los colores de VS Code desde el primer día.

Trabajar de forma incremental:

1. definir los colores principales;
2. utilizar el tema;
3. detectar elementos que no encajan;
4. inspeccionarlos;
5. añadir la regla;
6. volver a probar.

El tema debe evolucionar a partir del uso real y no únicamente de una lista enorme de propiedades de VS Code.

---

# 26. Definición de terminado para la versión 1.0

La versión `1.0.0` podrá considerarse terminada cuando:

- Dark Theme esté completo.
- Black Theme esté completo.
- C# sea completamente legible.
- JavaScript y TypeScript sean completamente legibles.
- HTML/CSS funcionen correctamente.
- JSON sea cómodo.
- Razor sea legible.
- Terminal esté integrada.
- Git decorations funcionen.
- errores y warnings sean claros.
- no existan problemas graves de contraste.
- exista README.
- exista icono.
- exista CHANGELOG.
- pueda instalarse mediante `.vsix`.
- se haya utilizado durante varias sesiones reales de desarrollo.

A partir de ahí se pueden añadir nuevas variantes y mejoras sin bloquear la primera release estable.
