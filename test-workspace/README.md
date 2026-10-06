# test-workspace

Carpeta de pruebas que abre `F5` desde el proyecto principal. Contiene un archivo
por lenguaje con todos los elementos de la jerarquía de colores (variables,
funciones, clases, interfaces, enums, strings, números, comentarios, constantes,
propiedades, atributos), más:

| Archivo | Para probar |
|---|---|
| `errors.ts` | Subrayados de error, selección encima de un error, sonidos *error nuevo* / *todo resuelto* |
| `csharp.cs` | Semantic tokens de Roslyn y un aviso real (CS0618) |
| `diff.diff`, `git-conflict.txt` | Colores de diff y de conflictos de merge |
| `.vscode/tasks.json` | Sonidos de build correcta y fallida |
| `.vscode/launch.json` | Sonidos de depuración y breakpoint |

Usa **Developer: Inspect Editor Tokens and Scopes** para ver qué regla colorea cada palabra.
