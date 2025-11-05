# Proyecto React + shadcn/ui

Este proyecto está construido con **React**, **Vite**, **TypeScript**, **Tailwind CSS** y **shadcn/ui**.

##  Características

-  **Vite** - Build tool ultrarrápido
-  **React 18** - Biblioteca UI moderna
-  **Tailwind CSS** - Framework CSS utility-first
-  **shadcn/ui** - Componentes UI reutilizables y accesibles
-  **TypeScript** - Type safety
-  **ESLint** - Linter para código limpio

##  Instalación

```bash
# Instalar dependencias
npm install
```

##  Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

##  Build

```bash
# Crear build de producción
npm run build

# Preview del build
npm run preview
```

##  Agregar Componentes shadcn/ui

Para agregar más componentes de shadcn/ui:

```bash
# Agregar un componente específico
npx shadcn@latest add [nombre-componente]

# Ejemplos:
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Ver todos los componentes disponibles en: https://ui.shadcn.com/docs/components

##  Estructura del Proyecto

```
proyecto-react-shadcn/
 src/
    components/
       ui/          # Componentes shadcn/ui
    lib/
       utils.ts     # Utilidades (cn helper)
    App.tsx
    main.tsx
    index.css        # Estilos globales + Tailwind
 public/
 components.json      # Configuración shadcn/ui
 tailwind.config.js   # Configuración Tailwind
 vite.config.ts       # Configuración Vite
 package.json
```

##  Personalización

### Cambiar el tema

Edita las variables CSS en `src/index.css` para personalizar los colores del tema:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... más variables */
}
```

### Agregar alias de importación

Los alias ya están configurados en `tsconfig.app.json` y `vite.config.ts`:

```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

##  Recursos

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

##  Licencia

MIT
##  Configuración de Backend

- Variables de entorno (Vite):
  - `VITE_API_BASE_URL` apunta al backend (sin slash final).
  - Usa `.env.development` para local y `.env.production` para nube.
- Proxy de desarrollo:
  - En `vite.config.ts` se proxya `/api` hacia `VITE_API_BASE_URL` en dev.
- Cliente HTTP central:
  - `src/lib/env.ts` expone `API_BASE_URL`.
  - `src/lib/http.ts` expone `api.get/post/put/patch/delete(path, opts)`.

Ejemplo de uso:

```ts
import { api } from '@/lib/http'

// GET /api/turnos
const turnos = await api.get('/api/turnos')

// POST /api/reservas
const nueva = await api.post('/api/reservas', { clienteId, turnoId })
```
