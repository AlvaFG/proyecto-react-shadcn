// Configuración centralizada de valores de negocio
// En el futuro estos valores pueden venir de una API.

export const COSTO_RESERVA = 500; // Monto de la seña/retención de reserva

export const HORARIOS_SERVICIO = [
  { id: 'desayuno', nombre: 'Desayuno', horario: '07:00-11:00' },
  { id: 'almuerzo', nombre: 'Almuerzo', horario: '12:00-15:00' },
  { id: 'merienda', nombre: 'Merienda', horario: '16:00-19:00' },
  { id: 'cena', nombre: 'Cena', horario: '20:00-22:00' },
] as const;