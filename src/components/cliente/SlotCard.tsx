import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TurnoHorario } from '../../types';
import { formatTimeSlot } from '../../lib/utils/slots';

interface SlotCardProps {
  slot: TurnoHorario;
  isSelected: boolean;
  onSelect: (slot: TurnoHorario) => void;
  occupiedCount: number;
}

export default function SlotCard({ 
  slot, 
  isSelected, 
  onSelect,
  occupiedCount
}: SlotCardProps) {
  const available = slot.capacity - occupiedCount;
  const sinCupo = available <= 0;

  return (
    <Card
      className={cn(
        'p-4 transition-all border-2 cursor-pointer',
        sinCupo
          ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50'
          : isSelected
          ? 'border-[#1E3A5F] bg-blue-50'
          : 'border-gray-200 hover:border-[#1E3A5F] hover:shadow-md'
      )}
      onClick={() => {
        if (!sinCupo) {
          onSelect(slot);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            sinCupo 
              ? 'bg-gray-200' 
              : isSelected 
              ? 'bg-[#1E3A5F]' 
              : 'bg-[#8B6F47]'
          )}>
            <Clock className={cn('w-5 h-5', sinCupo ? 'text-gray-400' : 'text-white')} />
          </div>
          <div>
            <h4 className={cn('font-semibold', sinCupo ? 'text-gray-400' : 'text-[#1E3A5F]')}>
              {formatTimeSlot(slot.start, slot.end)}
            </h4>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sinCupo && (
            <Badge variant="destructive" className="bg-red-500 text-xs">
              Sin cupo
            </Badge>
          )}
          {isSelected && !sinCupo && (
            <Check className="w-5 h-5 text-[#1E3A5F]" />
          )}
        </div>
      </div>
    </Card>
  );
}