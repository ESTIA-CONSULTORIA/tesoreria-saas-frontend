// Reparto de la barra principal de módulos (puro, con spec): los módulos que caben se muestran y el resto va al menú «Más».
// Se mide el ancho real de cada módulo, así que funciona con cualquier etiqueta, rol, plan o ancho de pantalla.

export interface RepartoNav {
  visibles: number[];
  enMas: number[];
}

/**
 * @param anchos ancho de cada módulo, en el orden de prioridad (los primeros se quedan en la barra)
 * @param disponible ancho útil de la barra
 * @param anchoMas ancho del botón «Más»
 * @param separacion espacio entre módulos
 * @param activo índice del módulo de la página actual (-1 si ninguno): nunca se manda al menú, para que el usuario vea dónde está
 */
export function repartirNav(anchos: number[], disponible: number, anchoMas: number, separacion: number, activo = -1): RepartoNav {
  const n = anchos.length;
  const suma = (idx: number[]) => idx.reduce((s, i, k) => s + anchos[i] + (k ? separacion : 0), 0);
  const todos = Array.from({ length: n }, (_, i) => i);
  if (n === 0 || suma(todos) <= disponible) return { visibles: todos, enMas: [] };

  const presupuesto = disponible - anchoMas - separacion; // lo que queda al reservar el botón «Más»
  let visibles: number[] = [];
  for (let i = 0; i < n; i++) {
    if (suma([...visibles, i]) <= presupuesto) visibles.push(i);
    else break;
  }
  if (activo >= 0 && !visibles.includes(activo)) {
    while (visibles.length && suma([...visibles, activo]) > presupuesto) visibles = visibles.slice(0, -1);
    visibles = [...visibles, activo].sort((a, b) => a - b);
  }
  return { visibles, enMas: todos.filter((i) => !visibles.includes(i)) };
}
