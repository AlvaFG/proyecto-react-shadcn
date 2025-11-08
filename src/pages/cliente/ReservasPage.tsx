import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../lib/store';
import { MapPin, Clock, AlertTriangle, Plus, ArrowLeft, User, LogOut } from 'lucide-react';
import { parseISODateLocal, formatFechaLargaEs } from '../../lib/date';
import type { ReservaStatus } from '../../types';
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_CLASS } from '../../types';
import { api } from '@/lib/http';

// Tipos para la API
interface ReservaAPI {
  id: number;
  userId: number;
  locationId: number;
  locationName?: string;
  locationAddress?: string;
  reservationDate: string; // ISO 8601 datetime
  reservationTimeSlot: string; // Ej: "ALMUERZO_SLOT_1"
  mealTime: string; // Ej: "ALMUERZO"
  status: string; // "ACTIVA", "CONFIRMADA", "CANCELADA"
  cost: number;
  createdAt: string;
}

interface LocationAPI {
  id: number;
  name: string;
  address: string;
  capacity: number;
  imageUrl?: string;
}

// Tipo para reserva del frontend enriquecida
interface ReservaFE {
  id: string;
  usuarioId: string;
  sedeId: string;
  fecha: string; // YYYY-MM-DD
  mealTime: string; // ALMUERZO, CENA, etc.
  slotStart: string; // HH:MM
  slotEnd: string; // HH:MM
  estado: ReservaStatus;
  total: number;
  sedeName: string;
  sedeAddress: string;
}

// Mapear horarios de slot a rangos horarios
const getSlotTimeRange = (slotName: string): { start: string; end: string } => {
  const slotMap: Record<string, { start: string; end: string }> = {
    'DESAYUNO_SLOT_1': { start: '07:00', end: '08:00' },
    'DESAYUNO_SLOT_2': { start: '08:00', end: '09:00' },
    'DESAYUNO_SLOT_3': { start: '09:00', end: '10:00' },
    'DESAYUNO_SLOT_4': { start: '10:00', end: '11:00' },
    'ALMUERZO_SLOT_1': { start: '12:00', end: '13:00' },
    'ALMUERZO_SLOT_2': { start: '13:00', end: '14:00' },
    'ALMUERZO_SLOT_3': { start: '14:00', end: '15:00' },
    'MERIENDA_SLOT_1': { start: '16:00', end: '17:00' },
    'MERIENDA_SLOT_2': { start: '17:00', end: '18:00' },
    'MERIENDA_SLOT_3': { start: '18:00', end: '19:00' },
    'CENA_SLOT_1': { start: '20:00', end: '21:00' },
    'CENA_SLOT_2': { start: '21:00', end: '22:00' },
  };
  
  return slotMap[slotName] || { start: '00:00', end: '00:00' };
};

// Función para normalizar el estado del backend al frontend
const normalizeStatus = (status: string): ReservaStatus => {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVA' || normalized === 'CONFIRMADA') return 'ACTIVA';
  if (normalized === 'CANCELADA') return 'CANCELADA';
  return 'FINALIZADA';
};

export default function ReservasPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  // Estados
  const [reservas, setReservas] = useState<ReservaFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<ReservaFE | null>(null);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [justCancelled, setJustCancelled] = useState<Set<string>>(new Set());

  // Cargar reservas y sedes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar locations y reservas en paralelo
        const [locationsData, reservasData] = await Promise.all([
          api.get<LocationAPI[]>('/locations'),
          api.get<ReservaAPI[]>('/reservations'),
        ]);

        // Crear mapa de locations
        const locMap = new Map<string, LocationAPI>();
        (locationsData || []).forEach((loc) => {
          locMap.set(String(loc.id), loc);
        });

        // Mapear reservas del API al formato del frontend
        const reservasMapeadas: ReservaFE[] = (reservasData || []).map((r) => {
          const timeRange = getSlotTimeRange(r.reservationTimeSlot);
          const loc = locMap.get(String(r.locationId));

          return {
            id: String(r.id),
            usuarioId: String(r.userId),
            sedeId: String(r.locationId),
            fecha: r.reservationDate.split('T')[0], // YYYY-MM-DD
            mealTime: r.mealTime,
            slotStart: timeRange.start,
            slotEnd: timeRange.end,
            estado: normalizeStatus(r.status),
            total: r.cost,
            sedeName: r.locationName || loc?.name || 'Sede desconocida',
            sedeAddress: r.locationAddress || loc?.address || '',
          };
        });

        setReservas(reservasMapeadas);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setReservas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar y ordenar reservas según la lógica especificada
  const misReservas = useMemo(() => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    // Filtrar reservas del usuario
    const reservasDelUsuario = reservas.filter((r) => r.usuarioId === user?.id);

    // Categorizar reservas
    const pendientes: ReservaFE[] = [];
    const canceladasRecientes: ReservaFE[] = [];
    const vencidasRecientes: ReservaFE[] = [];

    reservasDelUsuario.forEach((reserva) => {
      const fechaReserva = parseISODateLocal(reserva.fecha);
      const soloFecha = new Date(fechaReserva.getFullYear(), fechaReserva.getMonth(), fechaReserva.getDate());

      if (reserva.estado === 'CANCELADA') {
        // Mostrar canceladas solo si están en justCancelled (recién canceladas)
        if (justCancelled.has(reserva.id)) {
          canceladasRecientes.push(reserva);
        }
      } else if (reserva.estado === 'ACTIVA') {
        // Verificar si la reserva está vencida
        if (soloFecha < hoy) {
          // Vencida: mostrar solo si es de hoy o ayer
          if (soloFecha >= ayer) {
            vencidasRecientes.push(reserva);
          }
        } else {
          // Pendiente (futura o de hoy)
          pendientes.push(reserva);
        }
      }
    });

    // Ordenar pendientes por fecha (más próxima primero)
    pendientes.sort((a, b) => {
      const fechaA = parseISODateLocal(a.fecha).getTime();
      const fechaB = parseISODateLocal(b.fecha).getTime();
      return fechaA - fechaB;
    });

    // Ordenar canceladas y vencidas por fecha (más reciente primero)
    canceladasRecientes.sort((a, b) => {
      const fechaA = parseISODateLocal(a.fecha).getTime();
      const fechaB = parseISODateLocal(b.fecha).getTime();
      return fechaB - fechaA;
    });

    vencidasRecientes.sort((a, b) => {
      const fechaA = parseISODateLocal(a.fecha).getTime();
      const fechaB = parseISODateLocal(b.fecha).getTime();
      return fechaB - fechaA;
    });

    // Combinar: pendientes primero, luego vencidas, luego canceladas
    return [...pendientes, ...vencidasRecientes, ...canceladasRecientes];
  }, [reservas, user?.id, justCancelled]);

  const handleCancelar = (reserva: ReservaFE) => {
    setReservaSeleccionada(reserva);
    setShowCancelarDialog(true);
  };

  const confirmarCancelacion = async () => {
    if (!reservaSeleccionada) return;

    try {
      setCancelling(true);
      
      // Llamar al endpoint DELETE del backend
      await api.delete(`/reservations/${reservaSeleccionada.id}`);
      
      // Actualizar el estado de la reserva localmente
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reservaSeleccionada.id ? { ...r, estado: 'CANCELADA' as ReservaStatus } : r
        )
      );

      // Agregar a justCancelled para que se muestre temporalmente
      setJustCancelled((prev) => new Set(prev).add(reservaSeleccionada.id));
      
      setShowCancelarDialog(false);
      setReservaSeleccionada(null);
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo cancelar la reserva: ${errorMessage}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatearFecha = (fecha: string) => formatFechaLargaEs(fecha);

  const puedeCancelar = (reserva: ReservaFE): boolean => {
    if (reserva.estado !== 'ACTIVA') return false;
    // Combinar fecha + hora
    const fechaHoraReserva = new Date(`${reserva.fecha}T${reserva.slotStart}`);
    const ahora = new Date();
    // 2 horas antes en milisegundos
    const dosHoras = 2 * 60 * 60 * 1000;
    return fechaHoraReserva.getTime() - ahora.getTime() > dosHoras;
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
                  Mis Reservas
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

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1E3A5F] mb-1">Mis Reservas</h2>
            <p className="text-sm md:text-base text-gray-600">Gestiona tus reservas activas, finalizadas y canceladas</p>
          </div>
          <Button 
            onClick={() => navigate('/nueva-reserva')}
            className="bg-[#1E3A5F] hover:bg-[#2a5080] w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>

        {/* Reservas Grid */}
        {loading ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <Clock className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-800">Cargando reservas...</h3>
                <p className="text-sm md:text-base text-gray-500">Por favor espera un momento</p>
              </div>
            </CardContent>
          </Card>
        ) : misReservas.length === 0 ? (
          <Card className="bg-white border-0 shadow-md">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-800">No tienes reservas</h3>
                <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">Crea tu primera reserva para comenzar</p>
                <Button 
                  onClick={() => navigate('/nueva-reserva')} 
                  className="bg-[#1E3A5F] hover:bg-[#2a5080] w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Reserva
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {misReservas.map((reserva) => {
              const mostrarBotonCancelar = puedeCancelar(reserva);
              
              return (
                <Card key={reserva.id} className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
                  <CardContent className="p-4 md:p-6 flex flex-col h-full">
                    {/* Header de la Card */}
                    <div className="mb-4 pb-4 border-b">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-sm md:text-base text-[#1E3A5F] truncate">Reserva #{reserva.id}</h3>
                        <Badge className={`${RESERVA_STATUS_CLASS[reserva.estado]} text-xs shrink-0`}>
                          {RESERVA_STATUS_LABEL[reserva.estado]}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500">{formatearFecha(reserva.fecha)}</p>
                    </div>

                    {/* Información de Sede y Horario */}
                    <div className="space-y-3 mb-4 flex-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-[#1E3A5F]">Sede</p>
                          <p className="text-sm text-gray-700 truncate">{reserva.sedeName}</p>
                          <p className="text-xs text-gray-500 truncate">{reserva.sedeAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-[#1E3A5F]">Horario</p>
                          <p className="text-sm text-gray-700">{reserva.mealTime}</p>
                          <p className="text-xs text-gray-500">{reserva.slotStart} - {reserva.slotEnd}</p>
                        </div>
                      </div>

                      {reserva.total !== undefined && (
                        <div className="pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-xs md:text-sm font-semibold text-gray-700">Total</span>
                            <span className="text-base md:text-lg font-bold text-[#1E3A5F]">
                              ${reserva.total.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botón Cancelar - Solo para reservas ACTIVAS futuras */}
                    {mostrarBotonCancelar && (
                      <div className="mt-auto">
                        <Button
                          variant="destructive"
                          className="w-full bg-red-500 hover:bg-red-600 text-xs md:text-sm"
                          onClick={() => handleCancelar(reserva)}
                          aria-label={`Cancelar reserva ${reserva.id}`}
                        >
                          Cancelar Reserva
                        </Button>
                      </div>
                    )}

                    {/* Mensajes para reservas no cancelables */}
                    {reserva.estado === 'FINALIZADA' && (
                      <div className="mt-auto pt-3 text-center">
                        <p className="text-xs text-gray-500">Esta reserva ya fue completada</p>
                      </div>
                    )}
                    {reserva.estado === 'CANCELADA' && (
                      <div className="mt-auto pt-3 text-center">
                        <p className="text-xs text-gray-500">Esta reserva fue cancelada</p>
                      </div>
                    )}
                    {reserva.estado === 'ACTIVA' && !mostrarBotonCancelar && (
                      <div className="mt-auto pt-3 text-center">
                        <p className="text-xs text-gray-500">No se puede cancelar una reserva pasada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Información Importante */}
        <Card className="bg-amber-50 border border-amber-200 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle 
                className="w-5 h-5 md:w-6 md:h-6 text-amber-600 flex-shrink-0 mt-0.5" 
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-base text-amber-900 mb-2">
                  Información Importante
                </h3>
                <div className="text-xs md:text-sm text-amber-800 space-y-2">
                  <div>
                    <p className="font-semibold mb-1">Políticas de Cancelación</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                      <li>Solo puedes cancelar reservas activas futuras</li>
                      <li>Cancelaciones gratuitas hasta 24 horas antes</li>
                      <li>Después de 24 horas se cobra el 50% del valor de la reserva</li>
                      <li>El costo de reserva se devuelve al momento de tu asistencia</li>
                      <li>Las reservas pasadas no se pueden cancelar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog de Cancelación */}
      <Dialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Cancelar Reserva</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              ¿Estás seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelarDialog(false)}
              className="w-full sm:w-auto"
              disabled={cancelling}
            >
              No, mantener
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarCancelacion}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Sí, cancelar reserva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

