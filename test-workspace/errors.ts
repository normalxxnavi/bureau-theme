// Errores y avisos A PROPÓSITO para comprobar:
//  - que los subrayados de error se ven bien (también dentro de una selección),
//  - que el error (#FF6B6B en Dark) no se confunde con el acento rojo,
//  - los sonidos "error nuevo" y "todo resuelto" (corrige y guarda).
// Los avisos (amarillo) están en csharp.cs: uso de una API obsoleta (CS0618).

interface Agent {
  name: string;
  clearance: number;
}

const agent: Agent = { name: 'Jesse', clearance: '5' }; // error: string no es number

function promote(a: Agent): Agent {
  return { ...a, clearance: a.clearance + 1, rank: 'Director' }; // error: propiedad desconocida
}

const unused = promote(agent); // variable sin usar: aparece atenuada
undefinedFunction(); // error: no existe

/** @deprecated */
function oldApi(): void {}
oldApi(); // tachado (deprecated)
