import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { FileText, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { getReservaById } from '../../services/reservaService'; // 👈 nuevo import

export default function CajeroPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [reservaId, setReservaId] = useState('');
  const [loading, setLoading] = useState(false); // 👈 estado para el spinner o loading

  // 👉 función que consulta el backend
  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservaId.trim()) return;
    setLoading(true);

    try {
      // Llamada al endpoint del backend
      const reserva = await getReservaById(reservaId.trim());
      console.log('Reserva encontrada:', reserva);

      // Navega a la pantalla de detalle y pasa los datos
      navigate(`/cajero/reserva/${reservaId.trim()}`, { state: { reserva } });
    } catch (error) {
      alert('No se encontró la reserva o hubo un error al consultar el servidor.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1E3A5F]">Sistema de Cajero</h1>
              <p className="text-sm text-gray-600">Sistema de Pagos</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#8B6F47] text-white rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.nombre || 'Cajero Demo'}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Título principal */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">
              Bienvenido al Sistema de Cajero
            </h2>
            <p className="text-gray-600 text-lg">
              Busca y procesa las reservas de los clientes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card de búsqueda */}
            <Card className="bg-white shadow-lg p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">Buscar Reserva</h3>
                <p className="text-sm text-gray-600">Ingresa el ID de reserva del cliente</p>
              </div>

              <form onSubmit={handleBuscar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reservaId" className="text-[#1E3A5F] font-semibold">
                    ID de Reserva
                  </Label>
                  <Input
                    id="reservaId"
                    type="text"
                    placeholder="Ej: 1, 2..."
                    value={reservaId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReservaId(e.target.value)}
                    className="h-12 text-base border-gray-300 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-[#1E3A5F] hover:bg-[#2a5080] text-white"
                  disabled={!reservaId.trim() || loading}
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </form>
            </Card>

            {/* Card de instrucciones */}
            <Card className="bg-white shadow-lg p-6">
              <div className="mb-6 flex items-start gap-3">
                <FileText className="w-6 h-6 text-[#1E3A5F] mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">Instrucciones de Uso</h3>
                  <p className="text-sm text-gray-600">Búsqueda por ID:</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-[#1E3A5F] font-bold">•</span>
                  <p>Solicita al cliente su número de reserva</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#1E3A5F] font-bold">•</span>
                  <p>Ingresa el ID en el campo de búsqueda</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#1E3A5F] font-bold">•</span>
                  <p>Verifica los datos necesarios</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
