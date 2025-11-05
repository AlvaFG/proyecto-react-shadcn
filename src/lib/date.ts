// Utilidades para manejo de fechas locales seguras

// Parsea una fecha en formato YYYY-MM-DD a un objeto Date en zona local
export function parseISODateLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Formatea YYYY-MM-DD a una fecha larga en español (zona local)
export function formatFechaLargaEs(isoDate: string): string {
  const date = parseISODateLocal(isoDate);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

