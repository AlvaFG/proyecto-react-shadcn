# Guía de Despliegue en Vercel

## Configuración de Variables de Entorno en Vercel

Para que tu aplicación funcione correctamente en producción con Azure, debes configurar las variables de entorno en Vercel:

### Paso 1: Acceder a la configuración del proyecto en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `proyecto-react-shadcn`
3. Ve a **Settings** > **Environment Variables**

### Paso 2: Agregar las variables de entorno

Agrega la siguiente variable:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_API_BASE_URL` | `https://comedorback.azurewebsites.net` | Production |

**Importante:** NO incluyas el slash final en la URL.

### Paso 3: Re-desplegar

Después de agregar las variables de entorno:
1. Ve a la pestaña **Deployments**
2. Haz clic en los tres puntos `...` del último despliegue
3. Selecciona **Redeploy**

## Scripts Disponibles

### Desarrollo Local
```bash
npm run dev
```
Ejecuta la aplicación en modo desarrollo (usa `.env.development`).
La aplicación se conectará a `http://localhost:4002`.

### Build de Producción
```bash
npm run build:prod
```
Compila la aplicación en modo producción (usa `.env.production`).
La aplicación se conectará al servidor de Azure.

### Preview Local de Producción
```bash
npm run preview:prod
```
Ejecuta una vista previa de la build de producción localmente.

### Build Regular
```bash
npm run build
```
Compila la aplicación (Vite determinará el modo automáticamente).

## Estructura de Variables de Entorno

- **`.env.development`**: Variables para desarrollo local (localhost:4002)
- **`.env.production`**: Variables para producción (Azure)
- **`.env.example`**: Plantilla de ejemplo (no contiene valores reales)

## Verificación del Despliegue

Después del despliegue, verifica que:

1. ✅ La aplicación carga correctamente en tu dominio de Vercel
2. ✅ Las llamadas a la API se redirigen correctamente a Azure (revisa la consola del navegador)
3. ✅ No hay errores de CORS
4. ✅ Las rutas `/api/*` y `/locations/*` funcionan correctamente

## Solución de Problemas

### La aplicación sigue conectándose a localhost

**Solución:**
1. Verifica que agregaste `VITE_API_BASE_URL` en las variables de entorno de Vercel
2. Asegúrate de haber re-desplegado después de agregar las variables
3. Revisa los logs del build en Vercel para confirmar que se usó el valor correcto

### Errores de CORS

**Solución:**
El backend en Azure debe permitir el origen de tu dominio de Vercel. Ejemplo:
```
https://tu-proyecto.vercel.app
```

### Los rewrites no funcionan

**Solución:**
Vercel usa los rewrites definidos en `vercel.json` para proxy de las rutas `/api/*` y `/locations/*` hacia Azure.
Si no funcionan, verifica que el backend de Azure esté accesible públicamente.

## Notas Adicionales

- **HTTPS:** Vercel siempre usa HTTPS en producción, pero Azure puede usar HTTP. Los rewrites en `vercel.json` manejan esto.
- **Cache:** Vercel cachea assets estáticos automáticamente. Las llamadas a la API no se cachean.
- **Logs:** Puedes ver los logs en tiempo real en Vercel Dashboard > Runtime Logs.
