import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle2, User, LogOut, Home } from 'lucide-react';
import { useAuthStore } from '../../lib/store';

export default function PagoExitosoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: cajeroUser } = useAuthStore();
  const { reservaId } = location.state || {};

  // Generar número de pedido único
  const numeroPedido = `ORD${Date.now().toString().slice(-6)}`;

  const handleVolverAlPortal = () => {
    window.location.href = 'https://core-frontend-2025-02.netlify.app/';
  };

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/cajero')}
                className="hover:bg-blue-50"
              >
                <Home className="w-5 h-5 text-[#1E3A5F]" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#1E3A5F]">Reserva {reservaId || 'RES001'}</h1>
                <p className="text-sm text-gray-600">Sistema de Cajero</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#8B6F47] text-white rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{cajeroUser?.nombre || 'Cajero Demo'}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleVolverAlPortal}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Volver al Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 max-w-2xl">
        {/* Título */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Detalles de Reserva</h2>
          <p className="text-gray-600">Encontrado por ID: {reservaId || 'RES001'}</p>
        </div>

        {/* Card de éxito */}
        <Card className="bg-white shadow-lg p-12 mb-6">
          <div className="text-center">
            {/* Check icon */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            
            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              ¡Pago Procesado Exitosamente!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Se ha generado el pedido
            </p>

            {/* Número de pedido */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-2">
              <p className="text-sm text-gray-600 mb-2">Número de Pedido</p>
              <p className="text-4xl font-bold text-[#1E3A5F] mb-1">
                {numeroPedido}
              </p>
            </div>
            <p className="text-red-500 text-sm font-medium">
              Entrega este número al cliente
            </p>
          </div>
        </Card>

        {/* Botón Realizar otro Pedido */}
        <div className="flex justify-center">
          <Button 
            onClick={() => navigate('/cajero')}
            size="lg"
            className="w-full bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-12 py-6 text-lg"
          >
            Realizar otro Pedido
          </Button>
        </div>
      </main>
    </div>
  );
}
