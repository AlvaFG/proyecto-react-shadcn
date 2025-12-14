import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Utensils } from 'lucide-react';
import { redirectToCoreLogin } from '../../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  // Redirigir automáticamente a Core login si no están en modo desarrollo
  useEffect(() => {
    // Solo en producción, redirigir a Core login
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      redirectToCoreLogin();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        const user = useAuthStore.getState().user;
        
        // Redirigir según el rol
        if (user?.rol === 'cliente') {
          navigate('/dashboard');
        } else if (user?.rol === 'chef') {
          navigate('/chef/dashboard');
        } else if (user?.rol === 'cajero') {
          navigate('/cajero');
        }
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8DED4] p-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center pb-6">
          <div className="w-20 h-20 bg-[#1E3A5F] rounded-full flex items-center justify-center mb-4">
            <Utensils className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#1E3A5F]">
            Sistema de Comedor
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            {isLocalDev ? 'Modo desarrollo - Login local' : 'Ingrese sus credenciales para acceder'}
          </CardDescription>
          {isLocalDev && (
            <div className="text-xs text-center text-blue-600 bg-blue-50 p-2 rounded mt-2">
              ℹ️ En producción, esta página redirige automáticamente a Core Login
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1E3A5F]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1E3A5F]">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="border-gray-300"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#1E3A5F] hover:bg-[#2d5585] text-white h-11"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-xs text-center text-gray-500 mt-4 space-y-1">
              <p><strong>Usuarios de prueba:</strong></p>
              <p>Cliente: cliente@test.com / 123456</p>
              <p>Chef: chef@test.com / 123456</p>
              <p>Cajero: cajero@test.com / 123456</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
