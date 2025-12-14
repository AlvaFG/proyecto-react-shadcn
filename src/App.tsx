import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { useEffect, useState } from 'react';
import { getJWTFromURL, cleanJWTFromURL, getUserFromJWT, shouldRedirectToLogin, redirectToCoreLogin } from './lib/auth';

// Cliente Pages
import ClienteDashboardPage from './pages/cliente/ClienteDashboardPage';
import MenuPage from './pages/cliente/MenuPage';
import ReservasPage from './pages/cliente/ReservasPage';
import NuevaReservaPage from './pages/cliente/NuevaReservaPage';

// Chef Pages
import ChefDashboardPage from './pages/chef/ChefDashboardPage';
import ConsumiblesPage from './pages/chef/ConsumiblesPage';
import GestionSemanalChef from './pages/chef/GestionSemanalChef';

// Cajero Pages
import CajeroPage from './pages/cajero/CajeroPage';
import ReservaDetallePage from './pages/cajero/ReservaDetallePage';
import PagoPage from './pages/cajero/PagoPage';
import PagoExitosoPage from './pages/cajero/PagoExitosoPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import ClienteLayout from './components/layouts/ClienteLayout';

import './App.css';

function App() {
  const { isAuthenticated, user, token, setAuth } = useAuthStore();
  const [authProcessed, setAuthProcessed] = useState(false);

  // Manejo de autenticación con JWT desde URL (integración con Core)
  useEffect(() => {
    // Verificar si ya procesamos el JWT en esta sesión (evitar re-ejecución por Strict Mode)
    const alreadyProcessed = sessionStorage.getItem('jwt-processed');
    
    if (alreadyProcessed) {
      console.log('⏭️ JWT ya fue procesado en esta sesión');
      setAuthProcessed(true);
      return;
    }
    
    // Verificar si hay un JWT en la URL
    const jwtFromUrl = getJWTFromURL();
    
    if (jwtFromUrl) {
      console.log('🔍 JWT encontrado en la URL');
      
      // Marcar como procesado INMEDIATAMENTE
      sessionStorage.setItem('jwt-processed', 'true');
      
      // Limpiar el JWT de la URL
      cleanJWTFromURL();
      
      // Validar el JWT
      if (!shouldRedirectToLogin(jwtFromUrl)) {
        // JWT válido - crear sesión del usuario
        const userData = getUserFromJWT(jwtFromUrl);
        console.log('📊 Datos del usuario extraídos del JWT:', userData);
        
        if (userData) {
          console.log('✅ Usuario válido, estableciendo sesión');
          console.log('🔑 Rol detectado:', userData.rol);
          
          // Establecer usuario y token juntos en una sola operación
          setAuth(userData, jwtFromUrl);
          
          // Marcar como procesado después de establecer la sesión
          setAuthProcessed(true);
          return;
        } else {
          console.error('❌ Error al extraer datos del usuario del JWT');
          redirectToCoreLogin();
          return;
        }
      } else {
        // JWT inválido o vencido
        console.warn('⚠️ JWT inválido o vencido, redirigiendo a Core login');
        redirectToCoreLogin();
        return;
      }
    }
    
    // No hay JWT en la URL - verificar si hay sesión válida
    if (isAuthenticated && !shouldRedirectToLogin(token)) {
      console.log('✅ Sesión existente válida');
      sessionStorage.setItem('jwt-processed', 'true');
      setAuthProcessed(true);
    } else {
      // No hay JWT en URL y tampoco hay sesión válida - redirigir a Core login
      console.log('🚫 Sin JWT ni sesión válida, redirigiendo a Core login');
      sessionStorage.setItem('jwt-processed', 'true');
      redirectToCoreLogin();
    }
  }, []); // Solo ejecutar UNA VEZ al montar
  
  // Esperar a que se procese la autenticación Y el store esté listo
  if (!authProcessed || (!isAuthenticated && !sessionStorage.getItem('jwt-processed'))) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* Cliente Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <ClienteLayout>
                <ClienteDashboardPage />
              </ClienteLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <MenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservas"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <ReservasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nueva-reserva"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <NuevaReservaPage />
            </ProtectedRoute>
          }
        />

        {/* Chef Routes */}
        <Route
          path="/chef/dashboard"
          element={
            <ProtectedRoute allowedRoles={['chef']}>
              <ChefDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chef/consumibles"
          element={
            <ProtectedRoute allowedRoles={['chef']}>
              <ConsumiblesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chef/semana"
          element={
            <ProtectedRoute allowedRoles={['chef']}>
              <GestionSemanalChef />
            </ProtectedRoute>
          }
        />

        {/* Cajero Routes */}
        <Route
          path="/cajero"
          element={
            <ProtectedRoute allowedRoles={['cajero']}>
              <CajeroPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/reserva/:id"
          element={
            <ProtectedRoute allowedRoles={['cajero']}>
              <ReservaDetallePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/pago"
          element={
            <ProtectedRoute allowedRoles={['cajero']}>
              <PagoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/pago/:id"
          element={
            <ProtectedRoute allowedRoles={['cajero']}>
              <PagoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/pago-exitoso"
          element={
            <ProtectedRoute allowedRoles={['cajero']}>
              <PagoExitosoPage />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            (() => {
              console.log('🏠 Ruta raíz - isAuthenticated:', isAuthenticated);
              console.log('🏠 Ruta raíz - user:', user);
              console.log('🏠 Ruta raíz - rol:', user?.rol);
              
              if (isAuthenticated && user) {
                const destination = 
                  user.rol === 'cliente' ? '/dashboard' :
                  user.rol === 'chef' ? '/chef/dashboard' :
                  '/cajero';
                console.log('🏠 Redirigiendo a:', destination);
                return <Navigate to={destination} replace />;
              }
              
              console.log('🏠 No autenticado, mostrando página de carga');
              return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Iniciando sesión...</div>;
            })()
          } 
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
