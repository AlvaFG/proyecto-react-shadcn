import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import type { Reserva } from '../../types';
import { sedes, turnos } from '../../lib/data/';
import { formatFechaLargaEs } from '../../lib/date';

interface ReservaCardProps {
  reserva: Reserva;
  onVerDetalles?: (reserva: Reserva) => void;
  onCancelar?: (reserva: Reserva) => void;
}

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-blue-100 text-blue-800',
  pagada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

export default function ReservaCard({ reserva, onVerDetalles, onCancelar }: ReservaCardProps) {
  const sede = sedes.find((s) => s.id === reserva.sedeId);
  const turno = turnos.find((t) => t.id === reserva.turnoId);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Reserva #{reserva.id}</CardTitle>
          <Badge className={estadoColors[reserva.estado]}>
            {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
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
            {turno?.nombre} ({turno?.horaInicio} - {turno?.horaFin})
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
        {onCancelar && reserva.estado === 'pendiente' && (
          <Button variant="destructive" className="flex-1" onClick={() => onCancelar(reserva)}>
            Cancelar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
