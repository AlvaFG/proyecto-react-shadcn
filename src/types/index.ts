export type UserRole = 'cliente' | 'chef' | 'cajero';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  avatar?: string;
}

// Backoffice User from https://backoffice-production-df78.up.railway.app/api/v1/users/
export interface BackofficeUser {
  id: string;
  legajo: string;
  dni: string;
  nombre: string;
  email_institucional: string;
  email_personal: string;
  status: string;
}

export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  capacidad: number;
  imagen?: string;
}

export type Meal = 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena';

export interface Turno {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  capacidad: number;
  sedeId: string;
  fecha: string;
  meal: 'desayuno' | 'almuerzo' | 'merienda' | 'cena';
  reservedCount: number;
}

export interface TurnoHorario {
  id: string;
  venueId: string;
  date: string;
  meal: Meal;
  start: string;
  end: string;
  capacity: number;
  reservedCount: number;
}

export interface Consumible {
  id: string;
  nombre: string;
  tipo: 'plato' | 'bebida' | 'postre';
  descripcion: string;
  precio: number;
  imagen?: string;
  disponible: boolean;
  categoria?: string;
}

export interface ItemPedido {
  consumibleId: string;
  consumible: Consumible;
  cantidad: number;
}

export type ReservaStatus = 'ACTIVA' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA' | 'AUSENTE';

export interface Reserva {
  id: string;
  usuarioId: string;
  usuario?: User;
  sedeId: string;
  sede?: Sede;
  turnoId?: string;
  turno?: Turno;
  fecha: string;
  estado: ReservaStatus;
  items: ItemPedido[];
  total: number;
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia';
  fechaCreacion: string;
  meal?: Meal;
  slotId?: string;
  slotStart?: string;
  slotEnd?: string;
}

// Mapeo de etiquetas para mostrar en UI
export const RESERVA_STATUS_LABEL: Record<ReservaStatus, string> = {
  ACTIVA: 'Activa',
  CONFIRMADA: 'Confirmada',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
  AUSENTE: 'Ausente',
};

// Clases de Tailwind para cada estado (badges)
export const RESERVA_STATUS_CLASS: Record<ReservaStatus, string> = {
  ACTIVA: 'bg-green-100 text-green-700 hover:bg-green-100',
  CONFIRMADA: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  FINALIZADA: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  CANCELADA: 'bg-red-100 text-red-700 hover:bg-red-100',
  AUSENTE: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
};

export interface MenuDia {
  id: string;
  fecha: string;
  turnoId: string;
  platos: Consumible[];
  bebidas: Consumible[];
  postres: Consumible[];
}

export interface MenuSemanal {
  sedeId: string;
  semana: string;
  dias: {
    [dia: string]: {
      [turnoId: string]: {
        platoIds: string[];
        bebidaIds: string[];
        postreIds: string[];
      };
    };
  };
}

export type DiaSemana = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';
