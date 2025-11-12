import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/http';
import { RESERVA_STATUS_LABEL } from '../../types';
import { ArrowLeft, User, LogOut, Calendar, Utensils, Wine, Cake, ShoppingCart } from 'lucide-react';
import type { Reserva, Consumible } from '../../types';

interface CartItem {
  consumible: Consumible;
  cantidad: number;
}

interface LocationData {
  id: string;
  nombre: string;
  direccion: string;
}

interface ClienteData {
  id: string;
  nombre: string;
  email: string;
}

export default function ReservaDetallePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: cajeroUser, logout } = useAuthStore();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [loadingReserva, setLoadingReserva] = useState(false);
  const [sede, setSede] = useState<LocationData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);

  // (menu desde backend removido — usamos los mocks `consumibles` directamente)

  

  // menú desde backend: estados locales (se cargarán desde /menus/now cuando tengamos la reserva)
  const [menuPlatos, setMenuPlatos] = useState<Consumible[]>([]);
  const [menuBebidas, setMenuBebidas] = useState<Consumible[]>([]);
  const [menuPostres, setMenuPostres] = useState<Consumible[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuAvailable, setMenuAvailable] = useState(false);
  const [sendingCart, setSendingCart] = useState(false);

  useEffect(() => {
    // Obtener reserva solo desde el backend
    const fetchReserva = async () => {
      if (!id) return;
      setLoadingReserva(true);
      try {
        // endpoint: /reservations/byreservationId/:id
        const apiRes: any = await api.get(`/reservations/byreservationId/${id}`);

        // mapear respuesta del backend al shape usado en la UI
        const mapped: any = {
          id: String(apiRes.id ?? apiRes.reservationId ?? id),
          usuarioId: String(apiRes.userId ?? apiRes.usuarioId ?? apiRes.user?.id ?? ''),
          sedeId: String(apiRes.locationId ?? apiRes.sedeId ?? ''),
          fecha: apiRes.reservationDate ?? apiRes.date ?? apiRes.fecha ?? '',
          estado: (apiRes.status ?? apiRes.estado ?? 'ACTIVA') as any,
          items: apiRes.items ?? [],
          total: apiRes.cost ?? apiRes.total ?? 0,
          fechaCreacion: apiRes.createdAt ?? apiRes.fechaCreacion ?? '',
          meal: apiRes.mealTime ?? apiRes.meal ?? undefined,
          slotId: apiRes.reservationTimeSlot ?? apiRes.slotId ?? undefined,
          slotStart: apiRes.slotStartTime ?? apiRes.slotStart ?? undefined,
          slotEnd: apiRes.slotEndTime ?? apiRes.slotEnd ?? undefined,
        };

        setReserva(mapped as any);
        setCarrito([]);
      } catch (err: any) {
        // Si falla la petición, navegar de vuelta al cajero con mensaje de error
        console.error('Error fetching reserva by id:', err);
        
        // Extraer mensaje de error del backend
        const errorMessage = err?.response?.data?.message 
          || err?.message 
          || 'No se pudo cargar la reserva. Verifique el ID e intente nuevamente.';
        
        navigate('/cajero', {
          state: {
            error: true,
            message: errorMessage
          }
        });
      } finally {
        setLoadingReserva(false);
      }
    };

    fetchReserva();
  }, [id, navigate]);

  // cuando tengamos la reserva, intentamos obtener el menú correspondiente (si existe)
  useEffect(() => {
    if (!reserva) return;
    let canceled = false;
    const fetchMenu = async () => {
      setMenuLoaded(false);
      try {
        const apiRes: any = await api.get('/menus/now');

        if (!apiRes || !Array.isArray(apiRes.meals) || apiRes.meals.length === 0) {
          setMenuAvailable(false);
          return;
        }

        const desired = String(reserva.meal || '').toLowerCase();
        let mealMatch = apiRes.meals.find((m: any) => String(m.mealTime || m.meal || '').toLowerCase() === desired);
        if (!mealMatch) mealMatch = apiRes.meals[0];

        if (mealMatch && mealMatch.sections) {
          const mapItem = (it: any): Consumible => ({
            id: String(it.id),
            nombre: it.name || it.nombre || '',
            tipo: String(it.productType || '').toLowerCase() === 'plato' ? 'plato' : String(it.productType || '').toLowerCase() === 'bebida' ? 'bebida' : 'postre',
            descripcion: it.description || it.descripcion || '',
            precio: it.price ?? it.precio ?? 0,
            imagen: it.imageUrl || it.imagen || undefined,
            disponible: true,
          });

          const platosFromApi = (mealMatch.sections.platos || []).map(mapItem);
          const bebidasFromApi = (mealMatch.sections.bebidas || []).map(mapItem);
          const postresFromApi = (mealMatch.sections.postres || []).map(mapItem);

          if (!canceled) {
            setMenuPlatos(platosFromApi);
            setMenuBebidas(bebidasFromApi);
            setMenuPostres(postresFromApi);
            setMenuAvailable(platosFromApi.length > 0 || bebidasFromApi.length > 0 || postresFromApi.length > 0);
          }
        } else {
          setMenuAvailable(false);
        }
      } catch (err) {
        console.warn('Error fetching /menus/now', err);
        setMenuAvailable(false);
      } finally {
        if (!canceled) setMenuLoaded(true);
      }
    };

    fetchMenu();
    return () => { canceled = true; };
  }, [reserva]);

  // Cargar datos de la ubicación y el cliente desde el backend
  useEffect(() => {
    if (!reserva) return;
    
    // Cargar sede/ubicación
    const fetchLocation = async () => {
      try {
        const locationRes: any = await api.get(`/locations/${reserva.sedeId}`);
        setSede({
          id: String(locationRes.id || reserva.sedeId),
          nombre: locationRes.name || locationRes.nombre || 'Sede',
          direccion: locationRes.address || locationRes.direccion || ''
        });
      } catch (err) {
        console.warn('Error fetching location:', err);
        // Usar valores por defecto si falla
        setSede({
          id: reserva.sedeId,
          nombre: 'Sede',
          direccion: ''
        });
      }
    };

    // Cargar cliente - por ahora usamos valores por defecto ya que no tenemos endpoint /users/:id
    // TODO: Implementar cuando el backend tenga GET /users/:id
    setCliente({
      id: reserva.usuarioId,
      nombre: 'Cliente',
      email: 'cliente@test.com'
    });

    fetchLocation();
  }, [reserva]);

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

  const confirmarCarrito = async () => {
    if (!reserva) return;

    setSendingCart(true);
    try {
      // enviar el carrito ensamblado al backend en una sola llamada
      const cartRes: any = await sendCarritoToApi(carrito);

      // si el backend devolvió el id del carrito, navegamos a /cajero/pago/{cartId}
      const cartId = cartRes?.id ?? cartRes?.cartId ?? cartRes?.data?.id;
      if (cartId) {
        // navegamos a la ruta que cargará el carrito desde el backend
        navigate(`/cajero/pago/${String(cartId)}`);
        return;
      }

      // Si no devolvió id, mantenemos el comportamiento anterior (navegar con reserva)
    } catch (err) {
      console.warn('Error al enviar carrito antes de confirmar:', err);
    } finally {
      setSendingCart(false);
    }

    const total = carrito.reduce((sum, item) => sum + (item.consumible.precio * item.cantidad), 0);

    const items = carrito.map(item => ({
      consumibleId: item.consumible.id,
      consumible: item.consumible,
      cantidad: item.cantidad
    }));

    // Pasamos los ítems por "state" al navegar (fallback si falla el backend)
    navigate('/cajero/pago', {
      state: {
        reservaId: String(reserva.id),
        items,
        total
      }
    });
  };

  // Helper: convierte el estado `carrito` en un array de product IDs repetidos según cantidad
  const expandCartToIds = (cart: CartItem[]) => {
    const ids: Array<number | string> = [];
    for (const it of cart) {
      const times = it.cantidad || 0;
      for (let i = 0; i < times; i++) {
        // intentar parsear a número si corresponde
        const maybeNum = Number(it.consumible.id);
        ids.push(Number.isNaN(maybeNum) ? it.consumible.id : maybeNum);
      }
    }
    return ids;
  };

  // Helper: enviar POST /carts con el formato requerido
  const sendCarritoToApi = async (cartState: CartItem[]) => {
    if (!reserva) return; // necesitamos reservationId
    try {
      const payload = {
        paymentMethod: 'EFECTIVO',
        cart: expandCartToIds(cartState),
        reservationId: Number.isNaN(Number(reserva.id)) ? reserva.id : Number(reserva.id),
      } as any;
      const res = await api.post('/carts', payload);
      // devolver la respuesta para que el llamador pueda navegar al carrito creado
      return res;
    } catch (err) {
      console.warn('Error creating cart on backend', err);
      throw err;
    }
  };

  if (!reserva) {
    if (loadingReserva) {
      return (
        <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
          <Card className="max-w-md p-8 text-center">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Cargando reserva...</h2>
            <p className="text-gray-600">Por favor espera mientras verificamos la reserva.</p>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
        <Card className="max-w-md p-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Reserva no encontrada</h2>
          <p className="text-gray-600 mb-6">
            No se encontró una reserva con el ID: {id}
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

  // Helpers para formateo
  const formatDateLong = (iso?: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return iso;
    }
  };

  const fmtTime = (t?: string) => (t ? t.slice(0,5) : '-');

  const getHorarioText = (r: Reserva) => {
    if (r.slotStart && r.slotEnd) return `${fmtTime(r.slotStart)} - ${fmtTime(r.slotEnd)}`;
    if (r.turno && r.turno.horaInicio && r.turno.horaFin) return `${fmtTime(r.turno.horaInicio)} - ${fmtTime(r.turno.horaFin)}`;
    return '-';
  };

  // menú: usamos sólo el menú remoto. Si no hay menú disponible, los arrays quedan vacíos
  const platos = menuPlatos;
  const bebidas = menuBebidas;
  const postres = menuPostres;

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
                <p className="font-semibold text-gray-900">{cliente?.email || 'cliente@test.com'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ID de Cliente</p>
                <p className="font-semibold text-gray-900">{reserva.usuarioId || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado de Reserva</p>
                <Badge className={
                  reserva.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' :
                  reserva.estado === 'ACTIVA' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {RESERVA_STATUS_LABEL[reserva.estado] || reserva.estado}
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
                <p className="font-semibold text-gray-900">{formatDateLong(reserva.fecha)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Turno</p>
                <p className="font-semibold text-gray-900">
                  {reserva.meal ? `${reserva.meal} (${getHorarioText(reserva)})` : getHorarioText(reserva)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sede</p>
                <p className="font-semibold text-gray-900">{sede?.nombre || 'Sede'}</p>
                <p className="text-sm text-gray-600">{sede?.direccion || ''}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sección de Platos */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="w-6 h-6 text-[#1E3A5F]" />
            <h3 className="text-2xl font-bold text-[#1E3A5F]">Plato</h3>
          </div>
          {menuLoaded && !menuAvailable && (
            <div className="mb-4">
              <Badge className="bg-yellow-100 text-yellow-800">No hay menú disponible</Badge>
            </div>
          )}
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
          {menuLoaded && !menuAvailable && (
            <div className="mb-4">
              <Badge className="bg-yellow-100 text-yellow-800">No hay menú disponible</Badge>
            </div>
          )}
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
          {menuLoaded && !menuAvailable && (
            <div className="mb-4">
              <Badge className="bg-yellow-100 text-yellow-800">No hay menú disponible</Badge>
            </div>
          )}
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
            disabled={carrito.length === 0 || sendingCart}
            size="lg"
            className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-12 py-6 text-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {sendingCart ? 'Enviando...' : `Confirmar Carrito ${carrito.length > 0 ? `(${carrito.length} items)` : ''}`}
          </Button>
        </div>
      </main>
    </div>
  );
}
