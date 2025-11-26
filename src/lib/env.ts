export const APP_ENV = import.meta.env.MODE;
export const isDev = APP_ENV === 'development';
export const isProd = APP_ENV === 'production';

const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function sanitize(url: string) {
  return url.replace(/\/+$/, '');
}

// Fallbacks por si falta la variable (evita crashear mientras se configura)
const fallbackDev = 'http://localhost:8080';
const fallbackProd = 'https://comedorback.azurewebsites.net';

export const API_BASE_URL = sanitize(
  fromEnv || (isDev ? fallbackDev : fallbackProd)
);
