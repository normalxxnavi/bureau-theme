# test-workspace

Carpeta de pruebas que abre `F5` desde el proyecto principal. Contiene un archivo
por lenguaje con todos los elementos de la jerarquía de colores (variables,
funciones, clases, interfaces, enums, strings, números, comentarios, constantes,
propiedades, atributos), más:

| Archivo | Para probar |
|---|---|
| `errors.ts` | Subrayados de error, selección encima de un error, sonidos *error nuevo* / *todo resuelto*, nivel de alerta |
| `csharp.cs` | Semantic tokens de Roslyn y un aviso real (CS0618) |
| `diff.diff`, `git-conflict.txt` | Colores de diff y de conflictos de merge |
| `.vscode/tasks.json` | Sonidos de build correcta y fallida |
| `.vscode/launch.json` | Sonidos de depuración y breakpoint |
| `terminal-colors.js` | Los 16 colores ANSI de la terminal (`node terminal-colors.js`) |
| `languages/` | Una muestra por lenguaje: los 70 que trae VS Code y 72 que llegan con extensiones (Kotlin, Elixir, Zig, Vue, Terraform…) |
| `languages/sample.env` | El Modo Clasificado (valores inventados) |

Usa **Developer: Inspect Editor Tokens and Scopes** para ver qué regla colorea cada palabra,
y `npm run preview` para ver todas las muestras en los cuatro temas sin abrir VS Code
(`npm run preview -- --check` falla si algún token se queda sin color).
