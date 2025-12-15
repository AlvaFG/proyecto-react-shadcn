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
 * Limpia completamente el localStorage y sessionStorage
 * Esto previene que datos de usuarios anteriores persistan entre sesiones
 * El JWT será proporcionado nuevamente por el portal cuando el usuario vuelva
 */
export function clearAllLocalStorage(): void {
  console.log('🧹 Iniciando limpieza de localStorage y sessionStorage...');
  try {
    const localKeysBeforeClear = Object.keys(localStorage);
    const sessionKeysBeforeClear = Object.keys(sessionStorage);
    
    console.log('📦 localStorage keys antes de limpiar:', localKeysBeforeClear);
    console.log('📦 sessionStorage keys antes de limpiar:', sessionKeysBeforeClear);
    
    // Limpiar localStorage
    localStorage.clear();
    
    // Limpiar sessionStorage (especialmente el flag 'jwt-processed')
    sessionStorage.clear();
    
    const localKeysAfterClear = Object.keys(localStorage);
    const sessionKeysAfterClear = Object.keys(sessionStorage);
    
    console.log('✅ localStorage limpiado completamente');
    console.log('📦 localStorage keys después de limpiar:', localKeysAfterClear);
    console.log('✅ sessionStorage limpiado completamente');
    console.log('📦 sessionStorage keys después de limpiar:', sessionKeysAfterClear);
  } catch (error) {
    console.error('❌ Error al limpiar storage:', error);
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
 * El portal se encargará de gestionar la autenticación y proporcionar un nuevo JWT
 */
export function returnToPortal(): void {
  console.log('🔄 returnToPortal() llamado desde:', new Error().stack);
  console.log('🌐 URL del portal:', CORE_LOGIN_URL);
  
  clearAllLocalStorage();
  
  console.log('🚀 Redirigiendo a portal en 1 segundo...');
  setTimeout(() => {
    console.log('🔗 Ejecutando redirección ahora:', CORE_LOGIN_URL);
    window.location.href = CORE_LOGIN_URL;
  }, 1000);
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
