import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import type { Consumible } from '../../types';

interface MenuCardProps {
  consumible: Consumible;
  onSelect?: (consumible: Consumible) => void;
}

export default function MenuCard({ consumible, onSelect }: MenuCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {consumible.imagen && (
        <div className="h-40 overflow-hidden">
          <img
            src={consumible.imagen}
            alt={consumible.nombre}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{consumible.nombre}</CardTitle>
        {consumible.descripcion && (
          <CardDescription className="line-clamp-2">
            {consumible.descripcion}
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="flex justify-between items-center">
        <span className="text-2xl font-bold text-orange-600">
          ${consumible.precio}
        </span>
        {onSelect && (
          <Button onClick={() => onSelect(consumible)} size="sm">
            Agregar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
