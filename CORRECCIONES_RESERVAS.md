# Correcciones en Gestión de Reservas

## Problemas Corregidos

### 1. ✅ Estado "AUSENTE" ahora se muestra correctamente

**Problema anterior:**
- Las reservas con estado "AUSENTE" se mostraban como "Finalizada"
- El badge tenía el color de "Finalizada" (azul cielo)

**Solución:**
- Agregado nuevo tipo de estado `AUSENTE` al enum `ReservaStatus`
- Agregada etiqueta "Ausente" en `RESERVA_STATUS_LABEL`
- Agregado estilo naranja para el badge de "Ausente" en `RESERVA_STATUS_CLASS`
- Corregida la función `normalizeStatus()` para mantener "AUSENTE" como "AUSENTE"
- Agregado mensaje específico: "No asististe a esta reserva" (en color naranja)

### 2. ✅ Validación de tiempo para cancelar reservas

**Problema anterior:**
- Las reservas futuras (ej: a las 20:00) se mostraban como "pasadas" incluso a las 19:54
- No se podía cancelar una reserva con más de 2 horas de anticipación

**Solución:**
- Mejorada la función `puedeCancelar()` para calcular correctamente la diferencia de tiempo
- La validación ahora considera:
  - Estado debe ser "ACTIVA"
  - Diferencia entre hora actual y hora de la reserva debe ser > 2 horas
- Mensaje actualizado: "No se puede cancelar (faltan menos de 2 horas)"

## Cambios Técnicos

### Archivo: `src/types/index.ts`

```typescript
// Antes
export type ReservaStatus = 'ACTIVA' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA';

// Después
export type ReservaStatus = 'ACTIVA' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA' | 'AUSENTE';
```

**Etiquetas y Estilos agregados:**
```typescript
RESERVA_STATUS_LABEL: {
  // ... otros estados
  AUSENTE: 'Ausente',
}

RESERVA_STATUS_CLASS: {
  // ... otros estados
  AUSENTE: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
}
```

### Archivo: `src/pages/cliente/ReservasPage.tsx`

**1. Función `normalizeStatus` corregida:**
```typescript
const normalizeStatus = (status: string): ReservaStatus => {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVA') return 'ACTIVA';
  if (normalized === 'CONFIRMADA') return 'CONFIRMADA';
  if (normalized === 'CANCELADA') return 'CANCELADA';
  if (normalized === 'AUSENTE') return 'AUSENTE';  // ✅ Ahora mantiene AUSENTE
  if (normalized === 'FINALIZADA') return 'FINALIZADA';
  return 'ACTIVA';
};
```

**2. Función `puedeCancelar` mejorada:**
```typescript
const puedeCancelar = (reserva: ReservaFE): boolean => {
  if (reserva.estado !== 'ACTIVA') return false;
  
  // Construir fecha y hora ISO local
  const fechaHoraString = `${reserva.fecha}T${reserva.slotStart}:00`;
  const fechaHoraReserva = new Date(fechaHoraString);
  
  // Fecha y hora actual
  const ahora = new Date();
  
  // Calcular diferencia en milisegundos
  const diferenciaMs = fechaHoraReserva.getTime() - ahora.getTime();
  
  // 2 horas = 7,200,000 ms
  const dosHorasMs = 2 * 60 * 60 * 1000;
  
  // Solo se puede cancelar si faltan más de 2 horas
  return diferenciaMs > dosHorasMs;
};
```

**3. Mensajes específicos por estado:**
```tsx
{/* FINALIZADA */}
{reserva.estado === 'FINALIZADA' && (
  <div className="mt-auto pt-3 text-center">
    <p className="text-xs text-gray-500">Esta reserva ya fue completada</p>
  </div>
)}

{/* AUSENTE - Nuevo mensaje */}
{reserva.estado === 'AUSENTE' && (
  <div className="mt-auto pt-3 text-center">
    <p className="text-xs text-orange-600 font-medium">No asististe a esta reserva</p>
  </div>
)}

{/* CANCELADA */}
{reserva.estado === 'CANCELADA' && (
  <div className="mt-auto pt-3 text-center">
    <p className="text-xs text-gray-500">Esta reserva fue cancelada</p>
  </div>
)}

{/* ACTIVA pero no se puede cancelar */}
{reserva.estado === 'ACTIVA' && !mostrarBotonCancelar && (
  <div className="mt-auto pt-3 text-center">
    <p className="text-xs text-gray-500">No se puede cancelar (faltan menos de 2 horas)</p>
  </div>
)}
```

## Estados de Reserva

| Estado | Etiqueta | Color Badge | Puede Cancelar | Mensaje |
|--------|----------|-------------|----------------|---------|
| ACTIVA | Activa | Verde | ✅ Si faltan > 2h | Botón "Cancelar Reserva" |
| ACTIVA | Activa | Verde | ❌ Si faltan < 2h | "No se puede cancelar (faltan menos de 2 horas)" |
| CONFIRMADA | Confirmada | Azul | ❌ | - |
| FINALIZADA | Finalizada | Azul cielo | ❌ | "Esta reserva ya fue completada" |
| AUSENTE | Ausente | Naranja | ❌ | "No asististe a esta reserva" |
| CANCELADA | Cancelada | Rojo | ❌ | "Esta reserva fue cancelada" |

## Ejemplo de Cálculo de Tiempo

**Escenario:**
- Hora actual: 12 de noviembre 2025, 19:54
- Reserva: 12 de noviembre 2025, 20:00

**Cálculo:**
```javascript
// Fecha y hora de la reserva
const fechaHoraReserva = new Date("2025-11-12T20:00:00");
// Timestamp: 1731448800000

// Hora actual
const ahora = new Date("2025-11-12T19:54:00");
// Timestamp: 1731448440000

// Diferencia
const diferenciaMs = 1731448800000 - 1731448440000 = 360000 ms
// = 6 minutos = 360,000 ms

// 2 horas
const dosHorasMs = 7200000 ms

// ¿Se puede cancelar?
360000 > 7200000 = false ❌ (faltan menos de 2 horas)
```

**Otro Escenario:**
- Hora actual: 12 de noviembre 2025, 17:50
- Reserva: 12 de noviembre 2025, 20:00

**Cálculo:**
```javascript
// Diferencia
const diferenciaMs = 7800000 ms = 2h 10min

// ¿Se puede cancelar?
7800000 > 7200000 = true ✅ (faltan más de 2 horas)
```

## Testing

Para verificar los cambios:

1. **Estado AUSENTE:**
   - Crear una reserva y marcarla como AUSENTE en el backend
   - Verificar que se muestre badge naranja con texto "Ausente"
   - Verificar mensaje "No asististe a esta reserva"

2. **Cancelación de Reservas:**
   - Reserva con más de 2 horas: Debe mostrar botón "Cancelar Reserva" ✅
   - Reserva con menos de 2 horas: Debe mostrar mensaje "No se puede cancelar..." ❌
   - Reserva pasada: Debe mostrar mensaje "No se puede cancelar..." ❌

3. **Otros Estados:**
   - FINALIZADA: Badge azul cielo, mensaje "completada"
   - CANCELADA: Badge rojo, mensaje "fue cancelada"
   - CONFIRMADA: Badge azul, sin mensaje especial

## Próximos Pasos

Si el backend envía otros estados, agregar el mapeo correspondiente en:
1. `src/types/index.ts` - Agregar al tipo `ReservaStatus`
2. `src/types/index.ts` - Agregar a `RESERVA_STATUS_LABEL` y `RESERVA_STATUS_CLASS`
3. `src/pages/cliente/ReservasPage.tsx` - Actualizar `normalizeStatus()`
4. `src/pages/cliente/ReservasPage.tsx` - Agregar mensaje específico si es necesario
