export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
import { API_BASE_URL } from './env';

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(cleanBase + cleanPath);
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
  const res = await fetch(url, {
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

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('POST', path, { ...(opts || {}), json }),
  put: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('PUT', path, { ...(opts || {}), json }),
  patch: <T>(path: string, json?: unknown, opts?: Omit<RequestOptions, 'json'>) => request<T>('PATCH', path, { ...(opts || {}), json }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};
