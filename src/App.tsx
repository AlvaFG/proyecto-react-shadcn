import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';

// Pages
import LoginPage from './pages/login/LoginPage';

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
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              user?.rol === 'cliente' ? <Navigate to="/dashboard" /> :
              user?.rol === 'chef' ? <Navigate to="/chef/dashboard" /> :
              <Navigate to="/cajero" />
            ) : (
              <LoginPage />
            )
          } 
        />

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
            isAuthenticated ? (
              user?.rol === 'cliente' ? <Navigate to="/dashboard" /> :
              user?.rol === 'chef' ? <Navigate to="/chef/dashboard" /> :
              <Navigate to="/cajero" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
