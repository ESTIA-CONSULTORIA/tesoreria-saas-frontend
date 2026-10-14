// Atributos para campos de BÚSQUEDA y de nombre libre del POS. El navegador (y los gestores de contraseñas) rellenan con el
// correo del login cualquier <input type="text"> que ve cerca de un formulario de acceso; con type="search", un `name` que no
// sugiere usuario/correo y autoComplete="off" se desactivan el autocompletado y el filtro silencioso del catálogo.
export interface PropsBusqueda {
  type: 'search';
  name: string;
  autoComplete: 'off';
  autoCorrect: 'off';
  autoCapitalize: 'off';
  spellCheck: false;
  'data-lpignore': 'true';
  'data-1p-ignore': 'true';
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
  };
}

// `name` que los navegadores asocian con la cuenta del usuario: nunca deben usarse en campos del POS.
export const NOMBRES_PROHIBIDOS = /^(e-?mail|correo|user(name)?|usuario|login|username|email|password|contrase)/i;
