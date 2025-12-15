/**
 * Utilidades para manejo de autenticación con JWT del sistema Core
 */

const CORE_LOGIN_URL = 'https://core-frontend-2025-02.netlify.app/';
const APP_URL = 'https://proyecto-react-shadcn.vercel.app/';

/**
 * Decodifica un JWT y retorna el payload
 */
export function decodeJWT(token: string): any {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Verifica si un JWT está vencido
 */
export function isJWTExpired(token: string): boolean {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return true;
    }
    
    // exp viene en segundos, Date.now() en milisegundos
    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    
    return now >= expirationTime;
  } catch (error) {
    console.error('Error checking JWT expiration:', error);
    return true;
  }
}

/**
 * Obtiene el JWT desde la URL (parámetro JWT)
 */
export function getJWTFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('JWT');
}

/**
 * Limpia el parámetro JWT de la URL sin recargar la página
 */
export function cleanJWTFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('JWT');
  window.history.replaceState({}, '', url.toString());
}

/**
 * Limpia todo el localStorage excepto el JWT
 * Esto previene que datos de usuarios anteriores persistan entre sesiones
 */
export function clearLocalStorageExceptJWT(): void {
  try {
    // Obtener el JWT actual del localStorage (dentro de auth-storage)
    const authStorage = localStorage.getItem('auth-storage');
    let currentToken: string | null = null;
    
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      currentToken = parsed?.state?.token || null;
    }
    
    // Limpiar todo el localStorage
    localStorage.clear();
    
    // Restaurar solo el token si existía
    if (currentToken) {
      const authData = {
        state: {
          token: currentToken,
          user: null,
          isAuthenticated: false
        },
        version: 0
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
    }
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    // En caso de error, limpiar todo
    localStorage.clear();
  }
}

/**
 * Redirige al login de Core con la URL de retorno
 */
export function redirectToCoreLogin(): void {
  const redirectUrl = encodeURIComponent(APP_URL);
  window.location.href = `${CORE_LOGIN_URL}?redirectUrl=${redirectUrl}`;
}

/**
 * Limpia la sesión local y redirige al portal central
 * Preserva únicamente el JWT para que el portal pueda gestionar la sesión
 */
export function returnToPortal(): void {
  clearLocalStorageExceptJWT();
  window.location.href = CORE_LOGIN_URL;
}

/**
 * Verifica si el usuario debe ser redirigido al login de Core
 * Retorna true si debe redirigir, false si todo está OK
 */
export function shouldRedirectToLogin(token: string | null): boolean {
  if (!token) {
    return true;
  }
  
  if (isJWTExpired(token)) {
    return true;
  }
  
  return false;
}

/**
 * Extrae información del usuario desde el JWT
 */
export function getUserFromJWT(token: string): {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente' | 'chef' | 'cajero';
} | null {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return null;
  }

  console.log('🔍 Payload del JWT:', payload);
  console.log('🔍 Subrol en payload:', payload.subrol);

  // Mapear el subrol del backend al rol del frontend
  // Por defecto, todos van a 'cliente' (estudiantes, alumnos, o cualquier otro rol)
  let rol: 'cliente' | 'chef' | 'cajero' = 'cliente';
  
  if (payload.subrol === 'CAJERO') {
    rol = 'cajero';
  } else if (payload.subrol === 'CHEF') {
    rol = 'chef';
  }
  // Si subrol es null, undefined, 'ESTUDIANTE', o cualquier otro valor -> cliente

  console.log('🔍 Rol mapeado:', rol);

  return {
    id: payload.sub,
    nombre: payload.name || 'Usuario',
    email: payload.email,
    rol,
  };
}
