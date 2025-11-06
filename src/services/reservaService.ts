export async function getReservaById(reservaId: string) {
  try {
    const response = await fetch(
      `http://127.0.0.1:4002/reservations/byreservationId/${reservaId}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: no se encontró la reserva`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener la reserva:', error);
    throw error;
  }
}