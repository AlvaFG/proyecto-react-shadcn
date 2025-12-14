# Integración con Core Login

Este documento explica cómo funciona la integración del Módulo Comedor con el sistema de login centralizado de Core.

## URLs importantes

- **Core Login**: https://core-frontend-2025-02.netlify.app/
- **Módulo Comedor**: https://proyecto-react-shadcn.vercel.app/
- **Backend API**: Configurado en `VITE_API_BASE_URL`

## Flujo de autenticación

### 1. Ingreso desde Core
1. Usuario se autentica en Core Login
2. Core muestra botones de módulos disponibles según permisos
3. Al hacer clic en "Comedor", Core redirige a:
   ```
   https://proyecto-react-shadcn.vercel.app/?JWT=<token_jwt>
   ```

### 2. Validación del JWT
La aplicación (`App.tsx`):
- Lee el parámetro `JWT` de la URL
- Valida el token (estructura y expiración)
- Decodifica el payload para extraer información del usuario
- Crea la sesión local guardando token y datos del usuario
- Limpia el JWT de la URL (por seguridad)
- Redirige al dashboard según el rol del usuario

### 3. Sesión activa
- Todos los requests HTTP incluyen automáticamente el header `Authorization: Bearer <token>`
- El token se valida en cada request al backend
- Si el backend responde con 401, significa que el token venció

### 4. Token vencido
Cuando el token vence o es inválido:
- La aplicación redirige automáticamente a:
   ```
   https://core-frontend-2025-02.netlify.app/?redirectUrl=https%3A%2F%2Fproyecto-react-shadcn.vercel.app%2F
   ```
- El usuario se re-autentica en Core
- Core redirige de vuelta con un nuevo JWT

### 5. Logout
Al hacer logout:
- Se limpia la sesión local (usuario y token)
- Se redirige a Core Login con el `redirectUrl`

## Estructura del JWT

El token JWT recibido desde Core contiene:

```json
{
  "sub": "user-id-uuid",
  "email": "usuario@campusconnect.edu.ar",
  "name": "Nombre Usuario",
  "role": "ADMINISTRADOR",
  "subrol": "CAJERO|CHEF|ESTUDIANTE",
  "career": null,
  "wallet": ["wallet-id-uuid"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Mapeo de roles
- `subrol: "CAJERO"` → rol frontend: `cajero`
- `subrol: "CHEF"` → rol frontend: `chef`
- `subrol: "ESTUDIANTE"` → rol frontend: `cliente`

## Archivos clave

### `src/lib/auth.ts`
Funciones utilitarias para manejo de JWT:
- `getJWTFromURL()` - Lee JWT desde query params
- `decodeJWT()` - Decodifica el payload del token
- `isJWTExpired()` - Verifica si el token venció
- `shouldRedirectToLogin()` - Determina si debe redirigir a Core
- `redirectToCoreLogin()` - Redirige a Core con redirectUrl
- `getUserFromJWT()` - Extrae datos del usuario del token
- `cleanJWTFromURL()` - Limpia el JWT de la URL

### `src/App.tsx`
Maneja la autenticación al cargar la aplicación:
- Detecta JWT en URL
- Valida y crea sesión
- Redirige si no hay sesión válida

### `src/lib/http.ts`
Cliente HTTP con interceptor de autenticación:
- Incluye automáticamente el token en cada request
- Detecta respuestas 401 y redirige a Core Login

### `src/lib/store.ts`
Store de Zustand con persistencia:
- Guarda `user` y `token` en localStorage
- Función `logout()` limpia sesión y redirige a Core

## Desarrollo local

En desarrollo (`localhost`):
- La página de login local sigue funcionando
- No se redirige automáticamente a Core
- Se puede probar el login tradicional con usuarios de prueba

Para probar la integración con Core en local:
1. Ir manualmente a Core Login
2. Autenticarse
3. Modificar temporalmente la URL del botón "Comedor" para que apunte a `http://localhost:5173/?JWT=<token>`

## Producción

En producción (Vercel):
- Toda navegación a `/login` redirige automáticamente a Core
- La única forma de entrar es con JWT desde Core
- No se permite login tradicional

## Seguridad

✅ El JWT se limpia de la URL después de leerlo
✅ El token se persiste en localStorage (seguro en navegador)
✅ Todos los requests incluyen el token automáticamente
✅ Si el token vence (401), redirige inmediatamente a Core
✅ El backend valida el token en cada request

## Troubleshooting

### "La página redirige infinitamente a Core"
- Verificar que Core esté enviando el JWT correctamente
- Revisar que el token no esté vencido antes de llegar
- Verificar en DevTools → Application → Local Storage que se guardó el token

### "Backend responde 401 Unauthorized"
- Verificar que el token se esté enviando en el header (DevTools → Network → Request Headers)
- Verificar que el backend esté configurado para aceptar tokens de Core
- El token puede haber vencido (duración: 2.5 horas según el ejemplo)

### "No puedo testear en local"
- El login tradicional sigue funcionando en `localhost`
- Para probar con JWT real, usar una URL con parámetro: `http://localhost:5173/?JWT=<token_real>`
