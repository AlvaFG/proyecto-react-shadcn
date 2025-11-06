import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore, useReservaStore } from '../../lib/store';
import { sedes, consumibles, usuarios } from '../../lib/data/mockData';
import { ArrowLeft, User, LogOut, Calendar, Utensils, Wine, Cake, ShoppingCart } from 'lucide-react';
import type { Reserva, Consumible } from '../../types';

interface CartItem {
  consumible: Consumible;
  cantidad: number;
}

export default function ReservaDetallePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user: cajeroUser, logout } = useAuthStore();
  const actualizarReserva = useReservaStore((state) => state.actualizarReserva);

  // ✅ Recibe la reserva desde CajeroPage (cuando se hace navigate con state)
  const reserva = location.state?.reserva as Reserva | null;
  const [carrito, setCarrito] = useState<CartItem[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const agregarAlCarrito = (consumible: Consumible) => {
    const itemExistente = carrito.find(item => item.consumible.id === consumible.id);
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.consumible.id === consumible.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { consumible, cantidad: 1 }]);
    }
  };

  const disminuirDelCarrito = (consumibleId: string) => {
    const itemExistente = carrito.find(item => item.consumible.id === consumibleId);
    if (itemExistente && itemExistente.cantidad > 1) {
      setCarrito(carrito.map(item =>
        item.consumible.id === consumibleId
          ? { ...item, cantidad: item.cantidad - 1 }
          : item
      ));
    } else {
      setCarrito(carrito.filter(item => item.consumible.id !== consumibleId));
    }
  };

  const getCantidadEnCarrito = (consumibleId: string): number => {
    const item = carrito.find(item => item.consumible.id === consumibleId);
    return item ? item.cantidad : 0;
  };

  const confirmarCarrito = () => {
    if (!reserva) return;

    const total = carrito.reduce((sum, item) => sum + (item.consumible.precio * item.cantidad), 0);
    const items = carrito.map(item => ({
      consumibleId: item.consumible.id,
      consumible: item.consumible,
      cantidad: item.cantidad
    }));

    actualizarReserva(reserva.id, { items, total });

    navigate('/cajero/pago', {
      state: {
        reservaId: reserva.id,
        items,
        total
      }
    });
  };

  if (!reserva) {
    return (
      <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
        <Card className="max-w-md p-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Reserva no encontrada</h2>
          <p className="text-gray-600 mb-6">
            No se encontraron datos para la reserva con ID: {id}
          </p>
          <Button
            onClick={() => navigate('/cajero')}
            className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white"
          >
            Volver a buscar
          </Button>
        </Card>
      </div>
    );
  }

  // 🔹 Información de reserva y datos relacionados
  const cliente = usuarios.find(u => u.id === reserva.userId);
  const sede = sedes.find((s) => s.id === reserva.locationId);

  const platos = consumibles.filter(c => c.tipo === 'plato');
  const bebidas = consumibles.filter(c => c.tipo === 'bebida');
  const postres = consumibles.filter(c => c.tipo === 'postre');

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
                <ArrowLeft className="w-5 h-5 text-[#1E3A5F]" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#1E3A5F]">Reserva {reserva.id}</h1>
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
      <main className="container mx-auto px-6 py-6">
        {/* Título y botón buscar otro */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1E3A5F]">Detalles de Reserva</h2>
            <p className="text-gray-600">Encontrado por ID: {reserva.id}</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => navigate('/cajero')}
            className="bg-red-500 hover:bg-red-600"
          >
            Buscar otro ID
          </Button>
        </div>

        {/* Cards de información */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Información del Cliente */}
          <Card className="bg-white shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-[#1E3A5F]" />
              <h3 className="text-xl font-bold text-[#1E3A5F]">Información del Cliente</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-semibold text-gray-900">{cliente?.nombre || 'Juan Pérez'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{cliente?.email || 'juan.perez@email.com'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado de Reserva</p>
                <Badge className={
                  reserva.status === 'pagada' ? 'bg-green-100 text-green-800' :
                  reserva.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {reserva.status === 'pagada' ? 'Activa' :
                   reserva.status === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Detalles de la Reserva */}
          <Card className="bg-white shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-[#1E3A5F]" />
              <h3 className="text-xl font-bold text-[#1E3A5F]">Detalles de la Reserva</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-semibold text-gray-900">{reserva.reservationDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Turno</p>
                <p className="font-semibold text-gray-900">{reserva.mealTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Costo</p>
                <p className="font-semibold text-gray-900">${reserva.cost}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sede</p>
                <p className="font-semibold text-gray-900">{sede?.nombre || 'Sede Centro'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 🔽 desde acá se mantienen tus secciones originales */}
        {/* Sección de Platos */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="w-6 h-6 text-[#1E3A5F]" />
            <h3 className="text-2xl font-bold text-[#1E3A5F]">Plato</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platos.map((plato) => {
              const cantidad = getCantidadEnCarrito(plato.id);
              return (
                <Card key={plato.id} className="bg-white shadow-md overflow-hidden">
                  <div className="relative h-32 bg-gradient-to-br from-orange-100 to-orange-200">
                    {plato.imagen ? (
                      <img
                        src={plato.imagen}
                        alt={plato.nombre}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Utensils className="w-16 h-16 text-orange-400 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
                      <span className="text-sm font-bold text-[#1E3A5F]">{plato.nombre}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    {cantidad === 0 ? (
                      <Button
                        onClick={() => agregarAlCarrito(plato)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                      >
                        Agregar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => disminuirDelCarrito(plato.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        >
                          -
                        </Button>
                        <div className="w-12 h-10 flex items-center justify-center bg-gray-100 rounded font-bold text-[#1E3A5F]">
                          {cantidad}
                        </div>
                        <Button
                          onClick={() => agregarAlCarrito(plato)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sección de Bebidas */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wine className="w-6 h-6 text-[#1E3A5F]" />
            <h3 className="text-2xl font-bold text-[#1E3A5F]">Bebida</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bebidas.map((bebida) => {
              const cantidad = getCantidadEnCarrito(bebida.id);
              return (
                <Card key={bebida.id} className="bg-white shadow-md overflow-hidden">
                  <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-200">
                    {bebida.imagen ? (
                      <img
                        src={bebida.imagen}
                        alt={bebida.nombre}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wine className="w-16 h-16 text-blue-400 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
                      <span className="text-sm font-bold text-[#1E3A5F]">{bebida.nombre}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    {cantidad === 0 ? (
                      <Button
                        onClick={() => agregarAlCarrito(bebida)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                      >
                        Agregar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => disminuirDelCarrito(bebida.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        >
                          -
                        </Button>
                        <div className="w-12 h-10 flex items-center justify-center bg-gray-100 rounded font-bold text-[#1E3A5F]">
                          {cantidad}
                        </div>
                        <Button
                          onClick={() => agregarAlCarrito(bebida)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sección de Postres */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Cake className="w-6 h-6 text-[#1E3A5F]" />
            <h3 className="text-2xl font-bold text-[#1E3A5F]">Postre</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {postres.map((postre) => {
              const cantidad = getCantidadEnCarrito(postre.id);
              return (
                <Card key={postre.id} className="bg-white shadow-md overflow-hidden">
                  <div className="relative h-32 bg-gradient-to-br from-pink-100 to-pink-200">
                    {postre.imagen ? (
                      <img
                        src={postre.imagen}
                        alt={postre.nombre}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Cake className="w-16 h-16 text-pink-400 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
                      <span className="text-sm font-bold text-[#1E3A5F]">{postre.nombre}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    {cantidad === 0 ? (
                      <Button
                        onClick={() => agregarAlCarrito(postre)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                      >
                        Agregar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => disminuirDelCarrito(postre.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        >
                          -
                        </Button>
                        <div className="w-12 h-10 flex items-center justify-center bg-gray-100 rounded font-bold text-[#1E3A5F]">
                          {cantidad}
                        </div>
                        <Button
                          onClick={() => agregarAlCarrito(postre)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Botón Confirmar Carrito */}
        <div className="flex justify-center">
          <Button
            onClick={confirmarCarrito}
            disabled={carrito.length === 0}
            size="lg"
            className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-12 py-6 text-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Confirmar Carrito {carrito.length > 0 && `(${carrito.length} items)`}
          </Button>
        </div>
      </main>
    </div>
  );
}
