import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuthStore } from '../../lib/store';
import { ArrowLeft, User, LogOut, Receipt, Banknote, CreditCard, Wallet, Plus } from 'lucide-react';
import type { Reserva } from '../../types';
import { api } from '../../lib/http';
import { returnToPortal } from '../../lib/auth';

const formatPrice = (n: number) => {
  try {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
  } catch (e) {
    return String(n);
  }
};

export default function PagoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; cartId?: string }>();
  const { user: cajeroUser } = useAuthStore();
  
  const reservaId = String(location.state?.reservaId || '');
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reservationDiscount, setReservationDiscount] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [showConfirmPago, setShowConfirmPago] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false); // Dialog de confirmación de cancelación
  const [cartIdState, setCartIdState] = useState<string | null>(null); // ID del carrito actual

  // ✅ useEffect corregido: ahora toma los items seleccionados desde el state al navegar
  useEffect(() => {
  const cartIdParam = params.id || params.cartId || null;

    // If route contains a cart id, fetch the cart and populate the reserva from it
    const fetchFromCart = async (cartId: string) => {
      setLoading(true);
      setFetchError(null);
      try {
        setCartIdState(cartId); // Guardar el ID del carrito
        const cartRes: any = await api.get(`/carts/${cartId}`);
        // cartRes expected shape: { id, reservationId, items: [{ consumibleId, consumible, cantidad }], total }
  const reservationIdFromCart = String(cartRes?.reservationId ?? cartRes?.reservaId ?? '');
  // reservationDiscount may be returned by the backend (e.g. reservationDiscount: 500)
  const discountFromCart = Number(cartRes?.reservationDiscount ?? cartRes?.reservation_discount ?? cartRes?.reservationDiscountAmount ?? 0);
  setReservationDiscount(!Number.isNaN(discountFromCart) ? discountFromCart : null);

        // Support various backend shapes: items, products, productos, etc.
        const rawItems: any[] =
          cartRes?.items ?? cartRes?.products ?? cartRes?.productos ?? cartRes?.productsList ?? [];

        // Normalize items so the UI always receives ItemPedido shape
        const itemsFromCart = rawItems.map((it: any) => {
          // If the backend returns a wrapped consumible object, use it; otherwise map common fields
          const source = it.consumible ?? it.product ?? it;

          const consumibleFromRes = {
            id: source.id ?? it.consumibleId ?? String(it.id ?? ''),
            nombre: source.name ?? source.nombre ?? source.title ?? `Item ${it.consumibleId ?? it.id ?? ''}`,
            precio: Number(source.price ?? source.precio ?? source.productPrice ?? 0),
            imagen: source.imageUrl ?? source.imagen ?? source.imagenUrl ?? source.imagenUrl ?? '',
            descripcion: source.description ?? source.descripcion ?? '',
            tipo: source.productType?.toLowerCase?.() ?? source.tipo ?? 'plato',
            disponible: source.active ?? source.disponible ?? true,
          } as any;

          return {
            consumibleId: it.consumibleId ?? consumibleFromRes.id,
            consumible: {
              id: String(consumibleFromRes.id ?? ''),
              nombre: consumibleFromRes.nombre ?? 'Item',
              tipo: consumibleFromRes.tipo ?? 'plato',
              descripcion: consumibleFromRes.descripcion ?? '',
              precio: Number(consumibleFromRes.precio ?? 0),
              imagen: consumibleFromRes.imagen ?? '',
              disponible: consumibleFromRes.disponible ?? true,
            },
            cantidad: Number(it.cantidad ?? it.qty ?? it.quantity ?? 1),
          };
        });

        // Group items with the same consumible.id into a single line (sum quantities)
        const groupedItems = itemsFromCart.reduce((acc: any[], it: any) => {
          const key = String(it.consumible.id);
          const existingIndex = acc.findIndex((a) => String(a.consumible.id) === key);
          if (existingIndex >= 0) {
            acc[existingIndex] = {
              ...acc[existingIndex],
              cantidad: Number(acc[existingIndex].cantidad || 0) + Number(it.cantidad || 0),
            };
          } else {
            acc.push({ ...it });
          }
          return acc;
        }, [] as any[]);

        const subtotalFromCart = groupedItems.reduce((s: number, it: any) => s + ((it.consumible?.precio ?? 0) * (it.cantidad ?? 0)), 0);

        // Crear objeto de reserva con los datos del carrito
        // Ya no usamos fallback a reservaEncontrada porque no tenemos store local
        setReserva({
          id: reservationIdFromCart || `cart-${cartId}`,
          usuarioId: '',
          sedeId: '',
          fecha: new Date().toISOString(),
          estado: 'ACTIVA',
          items: groupedItems,
          total: subtotalFromCart,
          fechaCreacion: new Date().toISOString(),
        } as Reserva);
      } catch (err: any) {
        console.warn('Error fetching cart by id:', err);
        setFetchError(err?.message || String(err));
        // Do not navigate away; show error in-page so it's visible to the user
      } finally {
        setLoading(false);
      }
    };

    if (cartIdParam) {
      fetchFromCart(cartIdParam);
      return;
    }

    // Fallback: existing behavior when navigation used location.state
    if (!reservaId) {
      navigate('/cajero');
      return;
    }

    const itemsFromState = location.state?.items;
    const totalFromState = location.state?.total;

    // Si tenemos items desde el state de navegación, crear reserva temporal
    if (itemsFromState && reservaId) {
      setReserva({
        id: reservaId,
        usuarioId: '',
        sedeId: '',
        fecha: new Date().toISOString(),
        estado: 'ACTIVA',
        items: itemsFromState,
        total: totalFromState || 0,
        fechaCreacion: new Date().toISOString(),
      } as Reserva);
    }
  }, [navigate, location, params.id, reservaId]);

  const handleVolverAlPortal = () => {
    returnToPortal();
  };

  const disminuirCantidad = (consumibleId: string) => {
    if (!reserva) return;

    const nuevoItems = reserva.items.map(item => {
      if (item.consumible.id === consumibleId && item.cantidad > 1) {
        return { ...item, cantidad: item.cantidad - 1 };
      }
      return item;
    }).filter(item => item.cantidad > 0);

    const nuevoTotal = nuevoItems.reduce((sum, item) => sum + (item.consumible.precio * item.cantidad), 0);

    setReserva({ ...reserva, items: nuevoItems, total: nuevoTotal });
  };

  const aumentarCantidad = (consumibleId: string) => {
    if (!reserva) return;

    const nuevoItems = reserva.items.map(item => {
      if (item.consumible.id === consumibleId) {
        return { ...item, cantidad: item.cantidad + 1 };
      }
      return item;
    });

    const nuevoTotal = nuevoItems.reduce((sum, item) => sum + (item.consumible.precio * item.cantidad), 0);

    setReserva({ ...reserva, items: nuevoItems, total: nuevoTotal });
  };

  const finalizarCompra = async () => {
    if (!reserva) return;
    
    const cartId = cartIdState || params.id || params.cartId || null;

    if (!cartId) {
      setFetchError('No se encontró ID del carrito para confirmar');
      return;
    }

    setLoading(true);
    setFetchError(null);
    
    try {
      // Llamar al endpoint de confirmación
      await api.post(`/carts/confirmation/${cartId}`);
      
      // Navegar a página de éxito
      navigate('/cajero/pago-exitoso', {
        state: {
          reservaId: reserva.id,
          metodoPago,
          total: reserva.total,
          cartId
        }
      });
    } catch (err: any) {
      console.error('Error confirming cart:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al confirmar el carrito';
      setFetchError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const cancelarCarrito = async () => {
    const cartId = cartIdState || params.id || params.cartId || null;

    if (!cartId) {
      alert('No se encontró ID del carrito para cancelar');
      return;
    }

    setLoading(true);
    
    try {
      // Llamar DELETE /carts/{id}
      await api.delete(`/carts/${cartId}`);
      
      // Navegar de vuelta al cajero principal
      navigate('/cajero', {
        state: {
          message: 'Carrito cancelado exitosamente'
        }
      });
    } catch (err: any) {
      console.error('Error canceling cart:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al cancelar el carrito';
      alert(errorMsg);
    } finally {
      setLoading(false);
      setShowCancelDialog(false);
    }
  };

  const agregarMasProductos = () => {
    if (!reserva) return;
    
    const cartId = cartIdState || params.id || params.cartId || null;
    
    // Convertir items a CartItem format
    const carritoItems = reserva.items.map(item => ({
      consumible: item.consumible,
      cantidad: item.cantidad
    }));

    // Mapear método de pago al formato del backend
    let metodoPagoBackend: 'EFECTIVO' | 'TRANSFERENCIA' | 'SALDOCUENTA';
    if (metodoPago === 'efectivo') {
      metodoPagoBackend = 'EFECTIVO';
    } else if (metodoPago === 'transferencia') {
      metodoPagoBackend = 'TRANSFERENCIA';
    } else if (metodoPago === 'tarjeta') {
      metodoPagoBackend = 'SALDOCUENTA';
    } else {
      // Fallback de seguridad - no debería llegar aquí
      console.error('Método de pago no reconocido:', metodoPago);
      metodoPagoBackend = 'EFECTIVO';
    }

    // Navegar de vuelta a ReservaDetallePage con el carrito actual
    navigate(`/cajero/reserva/${reserva.id}`, {
      state: {
        cartId: cartId,
        carrito: carritoItems,
        metodoPago: metodoPagoBackend
      }
    });
  };
  
  const confirmarCompra = () => {
    if (!reserva) return;
    // Para efectivo y transferencia pedimos confirmación del cajero
    if (metodoPago === 'efectivo' || metodoPago === 'transferencia') {
      setShowConfirmPago(true);
      return;
    }
    // Saldo de cuenta ("tarjeta" en el modelo) no requiere confirmación FE
    finalizarCompra();
  };

  if (!reserva) {
    // Show loading / error / not found states
    if (loading) {
      return (
        <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
          <Card className="max-w-md p-8">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Cargando carrito...</h2>
            <p className="text-sm text-gray-600">Por favor espera mientras cargamos el carrito.</p>
          </Card>
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
          <Card className="max-w-md p-8">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Error al cargar el carrito</h2>
            <p className="text-sm text-gray-600 mb-4">{fetchError}</p>
            <Button
              onClick={() => navigate('/cajero')}
              className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white"
            >
              Volver a buscar
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#E8DED4] flex items-center justify-center">
        <Card className="max-w-md p-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Reserva no encontrada</h2>
          <Button
            onClick={() => navigate('/cajero')}
            className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white"
          >
            Volver a buscar
          </Button>
        </Card>
      </div>
    );
  }

  // Si el backend no provee descuento de reserva, usamos 0 (sin descuento)
  const costoReserva = reservationDiscount !== null ? reservationDiscount : 0;
  const subtotal = reserva.total;
  const totalAPagar = subtotal - costoReserva;

  const displayId = params.id || reserva.id;

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/cajero/reserva/${reserva.id}`)}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="w-5 h-5 text-[#1E3A5F]" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#1E3A5F]">Carrito {displayId}</h1>
                <p className="text-sm text-gray-600">Sistema de Cajero</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#8B6F47] text-white rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{cajeroUser?.nombre || 'Cajero Demo'}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleVolverAlPortal}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Volver al Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 max-w-4xl">
        {fetchError && (
          <div className="mb-4">
            <Card className="bg-red-50 border border-red-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-red-700">{fetchError}</div>
                <div>
                  <Button variant="ghost" onClick={() => setFetchError(null)} className="text-red-700">
                    Cerrar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Detalles de Carrito</h2>
          <p className="text-gray-600">Encontrado por ID: {displayId}</p>
        </div>

        {/* Pedido */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="w-6 h-6 text-[#1E3A5F]" />
            <h3 className="text-xl font-bold text-[#1E3A5F]">Pedido</h3>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reserva.items.length === 0 ? (
              <div className="col-span-2 md:col-span-4">
                <Card className="bg-white p-6 text-center">
                  <p className="text-gray-600">No hay productos en el carrito.</p>
                </Card>
              </div>
            ) : (
              reserva.items.map((item) => (
                <Card key={item.consumible.id} className="bg-white shadow-md overflow-hidden">
                  <div className="relative h-36">
                    <img
                      src={item.consumible.imagen || '/images/placeholder.png'}
                      alt={item.consumible.nombre}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 right-2">
                      <span className="text-xs font-bold text-[#1E3A5F] bg-white px-2 py-1 rounded-full inline-block shadow">
                        {item.consumible.nombre}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="mb-2 text-sm text-gray-700">{item.consumible.descripcion}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => disminuirCantidad(item.consumible.id)}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 flex items-center justify-center"
                      >
                        -
                      </Button>
                      <div className="w-10 h-8 flex items-center justify-center bg-gray-100 rounded font-bold text-[#1E3A5F] text-sm">
                        {item.cantidad}
                      </div>
                      <Button
                        onClick={() => aumentarCantidad(item.consumible.id)}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white h-8 w-8 flex items-center justify-center"
                      >
                        +
                      </Button>
                      <div className="ml-auto font-semibold text-[#1E3A5F]">$ {formatPrice(item.consumible.precio * item.cantidad)}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}

            {/* Agregar más */}
            <Card
              className="bg-white shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={agregarMasProductos}
            >
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Agregar más</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Cuenta */}
        <Card className="bg-white shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Cuenta</h3>
          <div className="space-y-3 mb-4">
            {reserva.items.map((item) => (
              <div key={item.consumible.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.consumible.nombre} {item.cantidad > 1 && `x${item.cantidad}`}
                </span>
                <span className="font-semibold text-gray-900">
                  $ {formatPrice(item.consumible.precio * item.cantidad)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-gray-700">Devolución Costo Reserva</span>
              <span className="font-semibold text-green-600">-$ {costoReserva.toFixed(0)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#1E3A5F] pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-[#1E3A5F]">Total a pagar:</span>
              <span className="text-2xl font-bold text-[#1E3A5F]">$ {totalAPagar.toFixed(0)}</span>
            </div>
          </div>
        </Card>

        {/* Medio de pago */}
        <Card className="bg-white shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">Medio de pago</h3>
          <p className="text-sm text-gray-600 mb-4">Selecciona el medio de pago del cliente:</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setMetodoPago('efectivo')}
              className={`p-6 rounded-lg border-2 transition-all ${
                metodoPago === 'efectivo'
                  ? 'border-[#1E3A5F] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              <Banknote className={`w-10 h-10 mx-auto mb-3 ${
                metodoPago === 'efectivo' ? 'text-[#1E3A5F]' : 'text-gray-400'
              }`} />
              <p className="font-semibold text-[#1E3A5F]">Efectivo</p>
            </button>

            <button
              onClick={() => setMetodoPago('transferencia')}
              className={`p-6 rounded-lg border-2 transition-all ${
                metodoPago === 'transferencia'
                  ? 'border-[#1E3A5F] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              <CreditCard className={`w-10 h-10 mx-auto mb-3 ${
                metodoPago === 'transferencia' ? 'text-[#1E3A5F]' : 'text-gray-400'
              }`} />
              <p className="font-semibold text-[#1E3A5F]">Transferencia</p>
            </button>

            <button
              onClick={() => setMetodoPago('tarjeta')}
              className={`p-6 rounded-lg border-2 transition-all ${
                metodoPago === 'tarjeta'
                  ? 'border-[#1E3A5F] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1E3A5F]'
              }`}
            >
              <Wallet className={`w-10 h-10 mx-auto mb-3 ${
                metodoPago === 'tarjeta' ? 'text-[#1E3A5F]' : 'text-gray-400'
              }`} />
              <p className="font-semibold text-[#1E3A5F]">Saldo en cuenta</p>
            </button>
          </div>
        </Card>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cancelar Carrito */}
          <Button 
            onClick={() => setShowCancelDialog(true)}
            size="lg"
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50 px-12 py-6 text-lg"
          >
            Cancelar Carrito
          </Button>
          
          {/* Confirmar Compra */}
          <Button 
            onClick={confirmarCompra}
            size="lg"
            className="bg-[#1E3A5F] hover:bg-[#2a5080] text-white px-12 py-6 text-lg"
            disabled={loading}
          >
            Confirmar Compra
          </Button>
        </div>

        {/* Dialog de confirmación de cancelación */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>¿Cancelar carrito?</DialogTitle>
              <DialogDescription>
                Esta acción cancelará el carrito completo. Los productos seleccionados se perderán.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                No, volver
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600" 
                onClick={cancelarCarrito}
                disabled={loading}
              >
                Sí, cancelar carrito
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmación de pago para Efectivo/Transferencia */}
        <Dialog open={showConfirmPago} onOpenChange={setShowConfirmPago}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar registro de pago</DialogTitle>
              <DialogDescription>
                Confirma que el pago por {metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'} fue recibido y registrado correctamente.
              </DialogDescription>
            </DialogHeader>

            {fetchError && (
              <div className="mb-3">
                <Card className="bg-red-50 border border-red-200 p-3">
                  <div className="text-sm text-red-700">{fetchError}</div>
                </Card>
              </div>
            )}

            <div className="mt-2 p-3 bg-gray-50 rounded text-sm flex justify-between">
              <span className="text-gray-700">Total a confirmar</span>
              <span className="font-semibold text-gray-900">$ {totalAPagar.toFixed(0)}</span>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowConfirmPago(false)}>
                Cancelar
              </Button>
              <Button className="bg-[#1E3A5F] hover:bg-[#2a5080]" onClick={finalizarCompra} disabled={loading}>
                Confirmar pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
