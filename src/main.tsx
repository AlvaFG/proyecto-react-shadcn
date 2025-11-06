import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Limpiar localStorage de datos viejos que usaban persist
// Esto previene conflictos con datos del backend
const clearOldCache = () => {
  try {
    // Remover store de menús viejos que usaba persist
    localStorage.removeItem('chef-menu-storage');
    console.log('✅ Cache de menús limpiado');
  } catch (error) {
    console.error('Error al limpiar cache:', error);
  }
};

// Ejecutar limpieza al inicio
clearOldCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
