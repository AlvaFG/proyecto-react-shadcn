export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
import { API_BASE_URL, isDev } from './env';

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
}

// Helper para obtener el token del localStorage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch (e) {
    console.warn('Error reading auth token:', e);
  }
  return null;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  let urlStr: string;
  if (/^https?:\/\//i.test(path)) {
    urlStr = path;
  } else if (isDev && path.startsWith('/')) {
    // En desarrollo, usar ruta relativa para aprovechar el proxy de Vite
    urlStr = path; // ej: /api/... será proxied a VITE_API_BASE_URL
  } else if (!isDev && (path.startsWith('/api/') || path.startsWith('/locations/'))) {
    // En producción (Vercel), usar rutas relativas que serán manejadas por rewrites
    urlStr = path;
  } else {
    // Fallback: construir URL completa
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    urlStr = cleanBase + cleanPath;
  }
  const url = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : undefined);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, json, headers, ...init } = opts;
  const url = buildUrl(path, query);
  
  // Obtener el token JWT si existe
  const token = getAuthToken();
  
  if (!token) {
    console.warn('⚠️ No se encontró token JWT en localStorage');
  } else {
    console.log('✅ Token JWT encontrado, enviando en Authorization header');
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
    ...init,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : (await res.text());

  if (!res.ok) {
    // Si recibimos 401, el token probablemente venció - redirigir a Core login
    if (res.status === 401) {
      console.warn('Token vencido o inválido (401), redirigiendo a Core login');
      // Importar dinámicamente para evitar problemas de circular dependency
      import('./auth').then(({ redirectToCoreLogin }) => {
        redirectToCoreLogin();
      });
    }

    const message = isJson && data && typeof data === 'object' && 'message' in (data as any)
      ? (data as any).message
      : res.statusText || 'Request failed';
    const error = new Error(String(message)) as Error & { status?: number; data?: any };
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('POST', path, { ...(opts || {}), json }),
  put: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('PUT', path, { ...(opts || {}), json }),
  patch: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('PATCH', path, { ...(opts || {}), json }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};

// Backoffice API - separate base URL for user management
const BACKOFFICE_BASE_URL = 'https://backoffice-production-df78.up.railway.app/api/v1';

async function backofficeRequest<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, json, headers, ...init } = opts;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urlStr = `${BACKOFFICE_BASE_URL}${cleanPath}`;
  
  const url = new URL(urlStr);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Accept': 'application/json',
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
    ...init,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : (await res.text());

  if (!res.ok) {
    const message = isJson && data && typeof data === 'object' && 'message' in (data as any)
      ? (data as any).message
      : res.statusText || 'Request failed';
    const error = new Error(String(message)) as Error & { status?: number; data?: any };
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const backofficeApi = {
  get: <T>(path: string, opts?: RequestOptions) => backofficeRequest<T>('GET', path, opts),
  post: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => backofficeRequest<T>('POST', path, { ...(opts || {}), json }),
  put: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => backofficeRequest<T>('PUT', path, { ...(opts || {}), json }),
  patch: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => backofficeRequest<T>('PATCH', path, { ...(opts || {}), json }),
  delete: <T>(path: string, opts?: RequestOptions) => backofficeRequest<T>('DELETE', path, opts),
};