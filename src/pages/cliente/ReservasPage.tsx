import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { useAuthStore, useReservaStore } from '../../lib/store';
import { MapPin, Clock, AlertTriangle, Plus, ArrowLeft, User, LogOut } from 'lucide-react';
import { sedes, turnos } from '../../lib/data/mockData';
import { parseISODateLocal, formatFechaLargaEs } from '../../lib/date';
import type { Reserva, ReservaStatus } from '../../types';
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_CLASS } from '../../types';

export default function ReservasPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const reservas = useReservaStore((state) => state.reservas);
  const actualizarReserva = useReservaStore((state) => state.actualizarReserva);
  
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);

  // Nota: usamos helpers compartidos en lib/date para evitar desfases por UTC.

  // Filtrar y ordenar: ACTIVAS primero, luego FINALIZADAS, luego CANCELADAS
  const misReservas = reservas
    .filter((r) => r.usuarioId === user?.id)
    .sort((a, b) => {
      const statusOrder: Record<ReservaStatus, number> = {
        ACTIVA: 0,
        FINALIZADA: 1,
        CANCELADA: 2,
      };
      
      const orderDiff = statusOrder[a.estado] - statusOrder[b.estado];
      if (orderDiff !== 0) return orderDiff;
      
      // Dentro del mismo estado, ordenar por fecha (más próximas primero para ACTIVAS)
      if (a.estado === 'ACTIVA') {
        return parseISODateLocal(a.fecha).getTime() - parseISODateLocal(b.fecha).getTime();
      }
      // Para FINALIZADAS y CANCELADAS, más recientes primero
      return parseISODateLocal(b.fecha).getTime() - parseISODateLocal(a.fecha).getTime();
    });

  const handleCancelar = (reserva: Reserva) => {
    setReservaSeleccionada(reserva);
    setShowCancelarDialog(true);
  };

  const confirmarCancelacion = () => {
    if (reservaSeleccionada) {
      actualizarReserva(reservaSeleccionada.id, { estado: 'CANCELADA' });
      setShowCancelarDialog(false);
      setReservaSeleccionada(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSede = (sedeId: string) => sedes.find((s) => s.id === sedeId);
  const getTurno = (turnoId?: string) => turnoId ? turnos.find((t) => t.id === turnoId) : null;
  
  const formatearFecha = (fecha: string) => formatFechaLargaEs(fecha);

  const puedeCancelar = (reserva: Reserva): boolean => {
    if (reserva.estado !== 'ACTIVA') return false;
    
    // Verificar si la reserva es futura
    const fechaReserva = parseISODateLocal(reserva.fecha);
    const ahora = new Date();
    
    // Si tiene horario específico, verificar
    if (reserva.slotStart) {
      const [hours, minutes] = reserva.slotStart.split(':').map(Number);
      fechaReserva.setHours(hours, minutes, 0, 0);
    }
    
    // Permitir cancelar si la reserva es futura
    return fechaReserva > ahora;
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
        {misReservas.length === 0 ? (
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
              const sede = getSede(reserva.sedeId);
              const turno = getTurno(reserva.turnoId);
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
                          <p className="text-sm text-gray-700 truncate">{sede?.nombre}</p>
                          <p className="text-xs text-gray-500 truncate">{sede?.direccion}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-[#1E3A5F]">Horario</p>
                          {reserva.slotStart && reserva.slotEnd ? (
                            <>
                              <p className="text-sm text-gray-700">{reserva.meal}</p>
                              <p className="text-xs text-gray-500">{reserva.slotStart} - {reserva.slotEnd}</p>
                            </>
                          ) : turno ? (
                            <>
                              <p className="text-sm text-gray-700">{turno.nombre}</p>
                              <p className="text-xs text-gray-500">{turno.horaInicio} - {turno.horaFin}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Horario no especificado</p>
                          )}
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
            >
              No, mantener
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarCancelacion}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
            >
              Sí, cancelar reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

