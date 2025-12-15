import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import Stepper from '../../components/cliente/Stepper';
import SlotCard from '../../components/cliente/SlotCard';
import { useAuthStore, useReservaStore } from '../../lib/store';
import { returnToPortal } from '../../lib/auth';

import { api } from '@/lib/http';
import { User, LogOut, ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Check, AlertCircle, BellOff } from 'lucide-react';
import type { Sede, Reserva, Meal, TurnoHorario } from '../../types';

import { buildSlotsForMeal, getMealLabel } from '../../lib/utils/slots';

const steps = [
  { id: 1, nombre: 'Sede', descripcion: 'Selecciona la sede' },
  { id: 2, nombre: 'Fecha', descripcion: 'Elige la fecha' },
  { id: 3, nombre: 'Turno', descripcion: 'Selecciona el turno y horario' },
  { id: 4, nombre: 'Confirmar', descripcion: 'Revisa y confirma' },
];

const MEALS: Meal[] = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];

export default function NuevaReservaPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { agregarReserva, getSlotCount } = useReservaStore();




  const [currentStep, setCurrentStep] = useState(1);

  
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(true);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');
  const [mealSeleccionado, setMealSeleccionado] = useState<Meal | null>(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState<TurnoHorario | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, _setErrorMessage] = useState('');
  const [postingReserva, setPostingReserva] = useState(false);
  const [costoReserva, setCostoReserva] = useState<number | null>(null);
  const [costoError, setCostoError] = useState<string | null>(null);

  

  useEffect(() => {
    (async () => {
      setLoadingSedes(true);
      try {
        type LocationApi = { id: number | string; name: string; address: string; capacity: number; imageUrl?: string };
        const data = await api.get<LocationApi[]>('/locations');
        const mapped: Sede[] = (data || []).map(l => ({
          id: String(l.id),
          nombre: l.name,
          direccion: l.address,
          capacidad: l.capacity,
          imagen: (l as any).imageUrl,
        }));
        setSedes(mapped);
      } catch (_) {
        setSedes([]);
      } finally {
        setLoadingSedes(false);
      }
    })();
  }, []);

  // Cargar el costo de reserva desde el backend
  useEffect(() => {
    (async () => {
      try {
        const cost = await api.get<number>('/reservations/cost');
        if (typeof cost === 'number' && cost > 0) {
          setCostoReserva(cost);
          setCostoError(null);
        } else {
          setCostoError('No se pudo obtener el costo de la reserva. Por favor, intente más tarde.');
        }
      } catch (error: any) {
        console.error('Error al cargar costo de reserva:', error);
        const errorMsg = error?.status === 403 
          ? 'No tiene permisos para consultar el costo de reserva. Por favor, vuelva a iniciar sesión.'
          : 'No se pudo obtener el costo de la reserva. Por favor, intente más tarde.';
        setCostoError(errorMsg);
      }
    })();
  }, []);

  const handleVolverAlPortal = () => {
    console.log('🔵 NuevaReservaPage: handleVolverAlPortal llamado');
    returnToPortal();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmar = async () => {
    if (!user || !sedeSeleccionada || !fechaSeleccionada || !slotSeleccionado) return;

    try {
      setPostingReserva(true);
      
      // El locationId ahora es un UUID (string), no un número
      const locationId = sedeSeleccionada.id;

      // El backend obtiene el userId del JWT automáticamente, no lo enviamos
      const mealTime = slotSeleccionado.meal.toUpperCase();
      const reservationDate = `${fechaSeleccionada}T${slotSeleccionado.start}:00`;

      console.log('📤 Creando reserva:', {
        locationId,
        mealTime,
        reservationDate,
        cost: costoReserva ?? 0,
      });

      await api.post<unknown>('/reservations', {
        locationId,
        mealTime,
        reservationDate,
        cost: costoReserva ?? 0,
      });

      const nuevaReserva: Reserva = {
        id: `R${String(Date.now()).slice(-3)}`,
        usuarioId: user.id,
        sedeId: sedeSeleccionada.id,
        fecha: fechaSeleccionada,
        estado: 'ACTIVA',
        items: [],
        total: costoReserva ?? 0,
        fechaCreacion: new Date().toISOString(),
        meal: slotSeleccionado.meal,
        slotId: slotSeleccionado.id,
        slotStart: slotSeleccionado.start,
        slotEnd: slotSeleccionado.end,
      };

      agregarReserva(nuevaReserva);
      setShowSuccessDialog(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear la reserva';
      _setErrorMessage(msg);
      setShowErrorDialog(true);
    } finally {
      setPostingReserva(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!sedeSeleccionada;
      case 2:
        return !!fechaSeleccionada;
      case 3:
        return !!mealSeleccionado && !!slotSeleccionado;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const generarFechasDisponibles = () => {
    const fechas: Date[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 14; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      fecha.setHours(0, 0, 0, 0);
      fechas.push(fecha);
    }
    return fechas;
  };

  const fechasDisponibles = generarFechasDisponibles();

  const dateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots = mealSeleccionado && sedeSeleccionada && fechaSeleccionada
    ? buildSlotsForMeal({
        dateYmd: fechaSeleccionada,
        venueId: sedeSeleccionada.id,
        meal: mealSeleccionado,
        venueCapacity: sedeSeleccionada.capacidad,
      })
    : [];

  const slotsConOcupacion = slots.map(slot => {
    const baseCount = getSlotCount(slot.id);
    if (sedeSeleccionada?.id === '3' && slot.meal === 'Desayuno') {
      return { ...slot, reservedCount: slot.capacity };
    }
    return { ...slot, reservedCount: baseCount };
  });

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
                  Nueva Reserva
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
              
              {/* Botón Volver al Portal */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolverAlPortal}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline ml-2">Volver al Portal</span>
                <span className="sr-only">Volver al portal</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 pb-6 md:pb-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
          {/* Paso 1: Seleccionar Sede */}
          {currentStep === 1 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F]">Selecciona una Sede</h2>
              {loadingSedes ? (
                <div className="text-sm text-gray-600 animate-pulse">Cargando sedes...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {sedes.map((sede) => (
                  <Card
                    key={sede.id}
                    className={`p-4 md:p-6 cursor-pointer transition-all border-2 hover:shadow-lg ${
                      sedeSeleccionada?.id === sede.id
                        ? 'border-[#1E3A5F] bg-blue-50'
                        : 'border-gray-200 hover:border-[#1E3A5F]'
                    }`}
                    onClick={() => setSedeSeleccionada(sede)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-5 h-5 md:w-6 md:h-6 mt-1 shrink-0 ${sedeSeleccionada?.id === sede.id ? 'text-[#1E3A5F]' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base md:text-lg text-[#1E3A5F] mb-2 truncate">{sede.nombre}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sede.direccion}</p>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p><span className="font-semibold">Capacidad:</span> {sede.capacidad} personas</p>
                        </div>
                      </div>
                      {sedeSeleccionada?.id === sede.id && (
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-[#1E3A5F] shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
                {sedes.length === 0 && (
                  <div className="text-sm text-gray-600">No hay sedes disponibles.</div>
                )}
              </div>
              )}
            </div>
          )}

          {/* Paso 2: Seleccionar Fecha */}
          {currentStep === 2 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F]">Selecciona una Fecha</h2>
              <div className="max-w-4xl mx-auto">
                <div className="bg-blue-50 border border-[#1E3A5F] rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                  <div className="flex items-center gap-2 text-[#1E3A5F] text-sm md:text-base">
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                    <span className="font-semibold">Sede:</span>
                    <span className="truncate">{sedeSeleccionada?.nombre}</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="text-center font-semibold text-[#1E3A5F] py-2 text-xs sm:text-sm">
                      {day}
                    </div>
                  ))}
                  
                  {fechasDisponibles.length > 0 && Array.from({ length: fechasDisponibles[0].getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square"></div>
                  ))}

                  {fechasDisponibles.map((fechaObj) => {
                    const fechaString = dateToString(fechaObj);
                    const isSelected = fechaSeleccionada === fechaString;
                    const isPast = fechaObj < today;
                    const dayOfWeek = fechaObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isDisabled = isPast || isWeekend;
                    const secondaryLabel = isWeekend
                      ? 'No disponible'
                      : fechaObj.toLocaleDateString('es-ES', { month: 'short' });
                    
                    return (
                      <button
                        key={fechaString}
                        onClick={() => !isDisabled && setFechaSeleccionada(fechaString)}
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        title={isWeekend ? 'No disponible en fin de semana' : undefined}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-center transition-all text-xs sm:text-sm ${
                          isDisabled
                            ? 'text-gray-400 opacity-60 cursor-not-allowed bg-gray-50'
                            : isSelected
                            ? 'bg-[#1E3A5F] text-white font-bold'
                            : 'bg-white hover:bg-blue-50 border border-gray-200 hover:border-[#1E3A5F] cursor-pointer'
                        }`}
                      >
                        <div className="text-base sm:text-lg font-semibold">{fechaObj.getDate()}</div>
                        <div className="text-[10px] sm:text-xs">
                          {secondaryLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Seleccionar Meal y Horario */}
          {currentStep === 3 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F]">Selecciona Turno y Horario</h2>
              
              <div className="bg-blue-50 border border-[#1E3A5F] rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex flex-wrap items-center gap-2 text-[#1E3A5F] text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="font-semibold truncate max-w-[120px] sm:max-w-none">{sedeSeleccionada?.nombre}</span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="font-semibold whitespace-normal sm:whitespace-nowrap">
                      {fechaSeleccionada && (() => {
                        const [year, month, day] = fechaSeleccionada.split('-').map(Number);
                        const fecha = new Date(year, month - 1, day);
                        return fecha.toLocaleDateString('es-ES', { 
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        });
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">1. Selecciona el tipo de comida</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {MEALS.map((meal) => (
                    <button
                      key={meal}
                      onClick={() => {
                        setMealSeleccionado(meal);
                        setSlotSeleccionado(null);
                      }}
                      className={`p-3 md:p-4 rounded-lg border-2 transition-all font-medium text-sm md:text-base ${
                        mealSeleccionado === meal
                          ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                          : 'border-gray-200 hover:border-[#1E3A5F] bg-white text-gray-700'
                      }`}
                    >
                      {getMealLabel(meal)}
                    </button>
                  ))}
                </div>
              </div>

              {mealSeleccionado && (
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">
                    2. Selecciona un horario para {getMealLabel(mealSeleccionado)}
                  </h3>
                  {slotsConOcupacion.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <Clock className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm md:text-base">No hay horarios disponibles</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {slotsConOcupacion.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          isSelected={slotSeleccionado?.id === slot.id}
                          onSelect={setSlotSeleccionado}
                          occupiedCount={slot.reservedCount}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {currentStep === 4 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F]">Confirmar Reserva</h2>
              
              <Card className="border border-gray-300">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 pb-3 border-b">
                    Detalles de la Reserva
                  </h3>
                  
                  <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 items-start">
                    <div className="space-y-3 text-left">
                      <div>
                        <p className="text-xs md:text-sm text-gray-500 mb-1">Sede</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">{sedeSeleccionada?.nombre}</p>
                        <p className="text-xs md:text-sm text-gray-600">{sedeSeleccionada?.direccion}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs md:text-sm text-gray-500 mb-1">Fecha</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">
                          {fechaSeleccionada && (() => {
                            const [year, month, day] = fechaSeleccionada.split('-').map(Number);
                            const fecha = new Date(year, month - 1, day);
                            return fecha.toLocaleDateString('es-ES', { 
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            });
                          })()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs md:text-sm text-gray-500 mb-1">Turno</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">{mealSeleccionado && getMealLabel(mealSeleccionado)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs md:text-sm text-gray-500 mb-1">Horario</p>
                        <p className="font-semibold text-sm md:text-base text-gray-900">
                          {slotSeleccionado && `${slotSeleccionado.start} - ${slotSeleccionado.end}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-center justify-start bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-5">
                      <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-[#1E3A5F] mb-2 md:mb-3" />
                      <p className="text-xs md:text-sm text-center text-gray-700 leading-relaxed">
                        Se te devolverá el costo de la reserva al momento de tu asistencia
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-6 pt-4 border-t">
                    {costoError ? (
                      <div className="mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-800">{costoError}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-4 md:mb-6">
                        <span className="text-sm md:text-base font-semibold text-gray-800">Total costo reserva</span>
                        <span className="text-xl md:text-2xl font-bold text-[#1E3A5F]">
                          {costoReserva !== null ? `$ ${costoReserva.toFixed(0)}` : 'Cargando...'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleConfirmar}
                        disabled={!canProceed() || postingReserva || costoReserva === null}
                        className="w-full md:w-auto bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-6 md:px-8 py-2 md:py-3"
                      >
                        {postingReserva ? 'Confirmando...' : 'Confirmar Reserva'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer con botones de navegación */}
          <div className="flex justify-between mt-6 md:mt-8 pt-4 md:pt-6 border-t gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 md:px-6"
            >
              Anterior
            </Button>
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                size="lg"
                className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-4 md:px-6"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
                size="lg"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 md:px-6"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Dialog de Error */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center">
                <BellOff className="w-10 h-10 md:w-12 md:h-12 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl md:text-2xl font-bold text-red-600">
              Reserva NO creada!
            </DialogTitle>
            <DialogDescription className="text-center text-red-500 mt-2 font-medium text-sm md:text-base">
              ¡Hubo un error!
            </DialogDescription>
            <div className="text-center text-gray-700 mt-3 text-xs md:text-sm">
              {errorMessage}
            </div>
          </DialogHeader>
          <div className="flex justify-center mt-4 md:mt-6">
            <Button 
              onClick={() => setShowErrorDialog(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 md:px-8"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Éxito */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 md:w-12 md:h-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl md:text-2xl font-bold text-[#1E3A5F]">
              ¡Reserva Creada Exitosamente!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2 text-sm md:text-base">
              Tu reserva ha sido creada exitosamente. Puedes verla en la sección de "Mis Reservas".
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4 md:mt-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/menu')}
              className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-blue-50 w-full sm:w-auto"
            >
              Ver Menú
            </Button>
            <Button 
              onClick={() => navigate('/reservas')}
              className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white w-full sm:w-auto"
            >
              Ver Mis Reservas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

