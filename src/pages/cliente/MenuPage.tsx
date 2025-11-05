import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { User, LogOut, Clock, ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '../../lib/store';

import { api } from '@/lib/http'
import type { Sede } from '@/types'
import { HORARIOS_SERVICIO } from '@/lib/config'
import { consumibles } from '../../lib/data/mockData'

export default function MenuPage() {

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sedesState, setSedesState] = useState<Sede[]>([]);

  useEffect(() => {
    (async () => {
      try {
        type LocationApi = { id: number | string; name: string; address: string; capacity: number; imageUrl?: string };
        const data = await api.get<LocationApi[]>('/locations');
        const mapped: Sede[] = (data || []).map(l => ({
          id: String(l.id),
          nombre: l.name,
          direccion: l.address,
          capacidad: l.capacity,
          imagen: l.imageUrl,
        }));
        setSedesState(mapped);
      } catch (_) {
        // si falla, sedesState queda vacío y se usa el mock
      }
    })();
  }, []);

  const sedesList: Sede[] = sedesState;

  const platos = consumibles.filter(c => c.tipo === 'plato');
  const bebidas = consumibles.filter(c => c.tipo === 'bebida');
  const postres = consumibles.filter(c => c.tipo === 'postre');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#E8DED4] overflow-x-hidden">
      {/* Header Responsive */}
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
            {/* Lado Izquierdo: Botón Volver + Título */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/cliente/dashboard')}
                className="flex items-center gap-1 shrink-0 px-2 sm:px-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden xs:inline text-sm">Inicio</span>
              </Button>
              
              <div className="hidden sm:block border-l h-6 border-gray-300 shrink-0"></div>
              
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                  Menú del Día
                </h1>
                <p className="text-xs text-gray-500 hidden md:block">Portal del Comensal</p>
              </div>
            </div>
            
            {/* Lado Derecho: Rol + Usuario + Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 shrink-0">
              {/* Badge de Rol - Oculto en xs */}
              <Badge className="hidden sm:inline-flex bg-[#8B6F47] text-white hover:bg-[#8B6F47] px-2 md:px-3 py-1 text-xs shrink-0">
                COMENSAL
              </Badge>
              
              {/* Badge de Usuario con ícono - Visible solo en sm+ */}
              <Badge className="hidden md:inline-flex bg-[#8B6F47] text-white hover:bg-[#8B6F47] px-2 md:px-3 py-1 text-xs shrink-0">
                <User className="w-3 h-3 mr-1.5" />
                <span className="max-w-[120px] truncate">
                  {user?.nombre || 'Usuario'}
                </span>
              </Badge>
              
              {/* Nombre truncado - Solo en mobile */}
              <span className="inline-flex md:hidden text-xs text-gray-700 font-medium max-w-[80px] sm:max-w-[100px] truncate">
                {user?.nombre || 'Usuario'}
              </span>
              
              {/* Botón Cerrar Sesión */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 px-2 sm:px-3 shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline ml-2">Cerrar Sesión</span>
                <span className="sr-only">Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 pb-20 md:pb-8">
        {/* Título y descripción */}
        <div className="text-left">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Menú Disponible</h2>
          <p className="text-sm md:text-base text-gray-600">Consulta nuestras opciones del día</p>
        </div>

        {/* Horarios de Servicio */}
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              <span className="font-semibold text-sm md:text-base text-gray-700">Horarios de Servicio</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {HORARIOS_SERVICIO.map((horario) => (
                <div key={horario.id} className="border rounded-lg p-3 bg-gray-50 text-left">
                  <p className="font-semibold text-sm text-gray-800">{horario.nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">{horario.horario}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comedores Disponibles */}
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 text-left">Comedores Disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {sedesList.map((sede) => (
                <div key={sede.id} className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow text-left">
                  <h4 className="font-semibold text-sm md:text-base text-gray-800">{sede.nombre}</h4>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">{sede.direccion}</p>
                  <p className="text-xs md:text-sm text-gray-600">Capacidad: {sede.capacidad} personas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Menú */}
        <Tabs defaultValue="platos" className="w-full">
          <div className="overflow-x-auto [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
            <TabsList className="grid w-full min-w-max md:min-w-0 grid-cols-3 mb-4 md:mb-6 h-auto">
              <TabsTrigger 
                value="platos" 
                className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white"
              >
                Platos Principales
              </TabsTrigger>
              <TabsTrigger 
                value="bebidas"
                className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white"
              >
                Bebidas
              </TabsTrigger>
              <TabsTrigger 
                value="postres"
                className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white"
              >
                Postres
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="platos">
            {platos.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-10 md:py-12 bg-white rounded-lg border">
                <UtensilsCrossed className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
                <p>No hay platos disponibles en esta categoría.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {platos.map((plato) => (
                  <Card key={plato.id} className="h-full flex flex-col bg-white border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {plato.imagen && (
                      <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
                        <img 
                          src={plato.imagen} 
                          alt={plato.nombre}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex flex-col gap-2 p-4 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm md:text-base text-gray-800 text-left flex-1">{plato.nombre}</h3>
                        <Badge className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F] shrink-0 text-xs">
                          ${plato.precio.toFixed(0)}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 text-left line-clamp-2">{plato.descripcion}</p>
                      {plato.categoria && (
                        <p className="text-xs text-gray-500 text-left">{plato.categoria}</p>
                      )}
                      <div className="mt-auto pt-2">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          Disponible
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bebidas">
            {bebidas.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-10 md:py-12 bg-white rounded-lg border">
                <UtensilsCrossed className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
                <p>No hay bebidas disponibles en esta categoría.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bebidas.map((bebida) => (
                  <Card key={bebida.id} className="h-full flex flex-col bg-white border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {bebida.imagen && (
                      <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
                        <img 
                          src={bebida.imagen} 
                          alt={bebida.nombre}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex flex-col gap-2 p-4 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm md:text-base text-gray-800 text-left flex-1">{bebida.nombre}</h3>
                        <Badge className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F] shrink-0 text-xs">
                          ${bebida.precio.toFixed(0)}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 text-left line-clamp-2">{bebida.descripcion}</p>
                      <div className="mt-auto pt-2">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          Disponible
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="postres">
            {postres.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-10 md:py-12 bg-white rounded-lg border">
                <UtensilsCrossed className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3" />
                <p>No hay postres disponibles en esta categoría.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {postres.map((postre) => (
                  <Card key={postre.id} className="h-full flex flex-col bg-white border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {postre.imagen && (
                      <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
                        <img 
                          src={postre.imagen} 
                          alt={postre.nombre}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex flex-col gap-2 p-4 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm md:text-base text-gray-800 text-left flex-1">{postre.nombre}</h3>
                        <Badge className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F] shrink-0 text-xs">
                          ${postre.precio.toFixed(0)}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 text-left line-clamp-2">{postre.descripcion}</p>
                      <div className="mt-auto pt-2">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          Disponible
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sección final - Hacer Reserva (Desktop) */}
        <Card className="bg-white border-0 shadow-md hidden md:block">
          <CardContent className="p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">¿Listo para hacer tu reserva?</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Selecciona tu sede, horario y menú favorito</p>
            <Button 
              onClick={() => navigate('/nueva-reserva')}
              className="bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white px-6 md:px-8 py-5 md:py-6 text-base md:text-lg"
            >
              Hacer Reserva
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* CTA Sticky Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-3 shadow-lg">
        <Button 
          onClick={() => navigate('/nueva-reserva')}
          className="w-full bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white py-6 text-base font-semibold"
        >
          Hacer Reserva
        </Button>
      </div>
    </div>
  );
}

