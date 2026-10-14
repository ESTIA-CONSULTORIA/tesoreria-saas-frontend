// Atributos para campos de BÚSQUEDA y de nombre libre del POS. El navegador (y los gestores de contraseñas) rellenan con el
// correo del login cualquier <input type="text"> que ve cerca de un formulario de acceso. Defensa en capas:
//   1. type="search", `name` que no sugiere usuario/correo, autoComplete="off" y marcas para LastPass/1Password/otros;
//   2. `readOnly` inicial que se quita al enfocar (Chrome no autorrellena un campo de solo lectura al cargar la página).
export interface PropsBusqueda {
  type: 'search';
  name: string;
  autoComplete: 'off';
  autoCorrect: 'off';
  autoCapitalize: 'off';
  spellCheck: false;
  'data-lpignore': 'true';
  'data-1p-ignore': 'true';
  'data-form-type': 'other';
}

export function propsBusqueda(name: string): PropsBusqueda {
  return {
    type: 'search',
    name,
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'data-lpignore': 'true', // LastPass
    'data-1p-ignore': 'true', // 1Password
    'data-form-type': 'other', // Dashlane y otros
  };
}

// Campos de texto libre que no son búsqueda (nombre de producto, categoría, área…): sin autocompletado, tipo text.
export function propsTextoLibre(name: string) {
  return {
    type: 'text' as const,
    name,
    autoComplete: 'off' as const,
    'data-lpignore': 'true' as const,
    'data-1p-ignore': 'true' as const,
    'data-form-type': 'other' as const,
  };
}

// Estado inicial de solo lectura: el campo nace readOnly y se libera la primera vez que el usuario lo toca. Una vez liberado
// no vuelve a bloquearse (si no, no podría teclear). Lógica pura para poder probarla sin DOM.
export function soloLecturaInicial(): boolean {
  return true;
}
export function soloLecturaTrasFoco(_actual: boolean): boolean {
  return false;
}

// `name` que los navegadores asocian con la cuenta del usuario: nunca deben usarse en campos del POS.
export const NOMBRES_PROHIBIDOS = /^(e-?mail|correo|user(name)?|usuario|login|username|email|password|contrase)/i;
