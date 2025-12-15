import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, Coffee, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { returnToPortal } from '../../lib/auth';

export default function ChefDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleVolverAlPortal = () => {
    console.log('🔵 ChefDashboardPage: handleVolverAlPortal llamado');
    returnToPortal();
  };

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Sistema del Chef</h1>
              <p className="text-sm text-gray-500">Sistema del Chef</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.nombre || 'Chef Usuario'}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolverAlPortal}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Volver al Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Panel Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">Panel de Control del Chef</h2>
            <p className="text-gray-600">Gestiona menús, planifica semanas y administra consumibles</p>
          </div>
          
          {/* Main Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card: Ver/Editar Semanal */}
            <Card 
              className="bg-white hover:shadow-xl transition-all cursor-pointer border-0 shadow-md"
              onClick={() => navigate('/chef/semana')}
            >
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">Ver/Editar Semanal</CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Gestiona el menú de la semana actual y<br />
                  próximas semanas
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <Button 
                  className="bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white px-8"
                >
                  Acceder
                </Button>
              </CardContent>
            </Card>

            {/* Card: ABM Consumibles */}
            <Card 
              className="bg-white hover:shadow-xl transition-all cursor-pointer border-0 shadow-md"
              onClick={() => navigate('/chef/consumibles')}
            >
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 bg-[#8B6F47] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">ABM Consumibles</CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Administra platos, bebidas y postres<br />
                  disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <Button 
                  className="bg-[#8B6F47] hover:bg-[#6B5537] text-white px-8"
                >
                  Acceder
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Usage Guide */}
          <Card className="bg-white border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Guía de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Gestión Semanal</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Planifica menús por día y turno</li>
                    <li>• Asigna platos, bebidas y postres</li>
                    <li>• Revisa y ajusta precios</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Consumibles</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Crea nuevos platos y bebidas</li>
                    <li>• Actualiza precios y disponibilidad</li>
                    <li>• Organiza por categorías</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
