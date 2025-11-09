import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import type { Reserva, Sede, Turno } from '../../types';
import { RESERVA_STATUS_CLASS, RESERVA_STATUS_LABEL } from '../../types';
import { sedes, turnos } from '../../lib/data/mockData';
import { formatFechaLargaEs } from '../../lib/date';

interface ReservaCardProps {
  reserva: Reserva;
  onVerDetalles?: (reserva: Reserva) => void;
  onCancelar?: (reserva: Reserva) => void;
}

export default function ReservaCard({ reserva, onVerDetalles, onCancelar }: ReservaCardProps) {
  const sede = sedes.find((s: Sede) => s.id === reserva.sedeId);
  const turno = turnos.find((t: Turno) => t.id === reserva.turnoId);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Reserva #{reserva.id}</CardTitle>
          <Badge className={RESERVA_STATUS_CLASS[reserva.estado]}>
            {RESERVA_STATUS_LABEL[reserva.estado]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{sede?.nombre || 'Sede desconocida'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatFechaLargaEs(reserva.fecha)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {/** Preferir slotStart/slotEnd de la reserva si existen, sino usar el turno mock */}
            {(() => {
              const format = (t?: string) => (t ? t.slice(0, 5) : '');
              const start = format((reserva as any).slotStart) || format(turno?.horaInicio);
              const end = format((reserva as any).slotEnd) || format(turno?.horaFin);
              if (start || end) return `${start}${end ? ' - ' + end : ''}`;
              return turno?.nombre || 'Horario desconocido';
            })()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
          <DollarSign className="w-4 h-4" />
          <span>Total: ${reserva.total}</span>
        </div>
        <div className="text-xs text-gray-500">
          {reserva.items.length} {reserva.items.length === 1 ? 'item' : 'items'}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onVerDetalles && (
          <Button variant="outline" className="flex-1" onClick={() => onVerDetalles(reserva)}>
            Ver Detalles
          </Button>
        )}
        {onCancelar && reserva.estado === 'ACTIVA' && (
          <Button variant="destructive" className="flex-1" onClick={() => onCancelar(reserva)}>
            Cancelar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
