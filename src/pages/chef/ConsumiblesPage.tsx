import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Edit, Trash2, User, LogOut, Utensils, Wine, Cake, Home, Search } from 'lucide-react';
import { useAuthStore, useChefMenuStore } from '../../lib/store';
import { api } from '@/lib/http';
import { returnToPortal } from '../../lib/auth';

// Tipos para mapear la respuesta del API
interface ProductAPI {
  id: number;
  name: string;
  description: string;
  price: number;
  productType: string; // "PLATO", "BEBIDA", "POSTRE"
  active: boolean;
  imageUrl?: string;
}

// Tipo para representar un consumible en el frontend
interface ConsumibleFE {
  id: string;
  nombre: string;
  tipo: 'plato' | 'bebida' | 'postre';
  descripcion: string;
  precio: number;
  disponible: boolean;
  imagen?: string;
}

// Función para normalizar el tipo de producto del backend al frontend
const normalizeProductType = (type: string): 'plato' | 'bebida' | 'postre' => {
  const normalized = type.toUpperCase();
  if (normalized === 'PLATO' || normalized === 'MAIN' || normalized === 'FOOD') return 'plato';
  if (normalized === 'BEBIDA' || normalized === 'DRINK' || normalized === 'BEVERAGE') return 'bebida';
  if (normalized === 'POSTRE' || normalized === 'DESSERT') return 'postre';
  return 'plato'; // Default
};

// Función para convertir tipo frontend a backend
const toBackendProductType = (tipo: 'plato' | 'bebida' | 'postre'): string => {
  switch (tipo) {
    case 'plato': return 'PLATO';
    case 'bebida': return 'BEBIDA';
    case 'postre': return 'POSTRE';
    default: return 'PLATO';
  }
};

export default function ConsumiblesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const removeConsumibleFromMenus = useChefMenuStore((state) => state.removeConsumibleFromMenus);
  
  // Estados para consumibles del API
  const [consumibles, setConsumibles] = useState<ConsumibleFE[]>([]);
  const [loadingConsumibles, setLoadingConsumibles] = useState(true);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingConsumible, setEditingConsumible] = useState<ConsumibleFE | null>(null);
  const [formData, setFormData] = useState<Partial<ConsumibleFE>>({
    nombre: '',
    tipo: 'plato',
    descripcion: '',
    precio: 0,
    disponible: true,
    imagen: '',
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Cargar consumibles desde el API
  const fetchConsumibles = async () => {
    try {
      setLoadingConsumibles(true);
      const data = await api.get<ProductAPI[]>('/products');
      
      // Mapear los productos del API al formato del frontend
      const consumiblesMapeados: ConsumibleFE[] = (data || []).map((p) => ({
        id: String(p.id),
        nombre: p.name,
        tipo: normalizeProductType(p.productType),
        descripcion: p.description,
        precio: p.price,
        disponible: p.active,
        imagen: p.imageUrl,
      }));
      
      setConsumibles(consumiblesMapeados);
    } catch (error) {
      console.error('Error al cargar consumibles:', error);
      setConsumibles([]);
    } finally {
      setLoadingConsumibles(false);
    }
  };

  useEffect(() => {
    fetchConsumibles();
  }, []);

  const normalize = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const filteredConsumibles = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return consumibles;
    return consumibles.filter((c) => normalize(c.nombre).includes(q));
  }, [consumibles, searchQuery]);

  const handleVolverAlPortal = () => {
    returnToPortal();
  };

  const handleCreate = () => {
    setEditingConsumible(null);
    setSelectedImageFile(null);
    setFormData({
      nombre: '',
      tipo: 'plato',
      descripcion: '',
      precio: 0,
      disponible: true,
      imagen: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (consumible: ConsumibleFE) => {
    setEditingConsumible(consumible);
    setSelectedImageFile(null);
    setFormData(consumible);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este consumible?')) return;
    
    try {
      setDeleting(id);
      
      // Llamar al endpoint DELETE del backend
      await api.delete(`/products/${id}`);
      
      // Actualizar estado local tras confirmación exitosa
      setConsumibles(prev => prev.filter(c => c.id !== id));
      removeConsumibleFromMenus(id);
    } catch (error) {
      console.error('Error al eliminar consumible:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo eliminar el consumible: ${errorMessage}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImageFile(null);
      setFormData((prev) => ({
        ...prev,
        imagen: editingConsumible?.imagen || '',
      }));
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('El archivo seleccionado debe ser una imagen.');
      event.target.value = '';
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, imagen: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setFormData((prev) => ({ ...prev, imagen: '' }));
  };


  const handleSave = async () => {
    const nombre = formData.nombre?.trim() || '';
    const parsedPrice = Number(formData.precio);

    if (!nombre || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Complete todos los campos requeridos');
      return;
    }

    const tipo = (formData.tipo as 'plato' | 'bebida' | 'postre') || 'plato';
    const descripcion = (formData.descripcion ?? '').trim();
    const disponible = formData.disponible ?? true;
    const imagen = formData.imagen?.toString().trim() || undefined;

    try {
      setSaving(true);
      
      if (editingConsumible) {
        // Actualizar consumible existente con PATCH
        await api.patch<ProductAPI>(`/products/${editingConsumible.id}`, {
          name: nombre,
          description: descripcion,
          price: parsedPrice,
          productType: toBackendProductType(tipo),
          active: disponible,
          imageUrl: imagen,
        });
      } else {
        // Crear nuevo consumible con POST
        await api.post<ProductAPI>('/products', {
          name: nombre,
          description: descripcion,
          price: parsedPrice,
          productType: toBackendProductType(tipo),
          active: disponible,
          imageUrl: imagen,
        });
      }

      // Recargar lista desde el servidor para asegurar consistencia
      await fetchConsumibles();
      
      setShowDialog(false);
      setEditingConsumible(null);
      setSelectedImageFile(null);
    } catch (error) {
      console.error('Error al guardar consumible:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo guardar el consumible: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogToggle = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setSelectedImageFile(null);
      setEditingConsumible(null);
    }
  };

  const platos = filteredConsumibles.filter((c) => c.tipo === 'plato');
  const bebidas = filteredConsumibles.filter((c) => c.tipo === 'bebida');
  const postres = filteredConsumibles.filter((c) => c.tipo === 'postre');

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case 'plato':
        return <Utensils className="w-5 h-5" />;
      case 'bebida':
        return <Wine className="w-5 h-5" />;
      case 'postre':
        return <Cake className="w-5 h-5" />;
      default:
        return <Utensils className="w-5 h-5" />;
    }
  };

  const renderConsumibleCard = (consumible: ConsumibleFE) => (
    <Card key={consumible.id} className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="text-gray-600">
              {getIconForTipo(consumible.tipo)}
            </div>
            <CardTitle className="text-base font-semibold">{consumible.nombre}</CardTitle>
          </div>
          <Badge className="bg-[#8B6F47] text-white hover:bg-[#8B6F47]">
            $ {consumible.precio.toFixed(2)}
          </Badge>
        </div>
        {consumible.descripcion && (
          <CardDescription className="text-sm mt-2">
            {consumible.descripcion}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]">
            {consumible.disponible ? 'Disponible' : 'No disponible'}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(consumible)}
              disabled={deleting === consumible.id}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(consumible.id)}
              disabled={deleting === consumible.id}
              className="h-8 w-8 p-0"
            >
              {deleting === consumible.id ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#E8DED4]">
      {/* Header Superior Blanco */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/chef/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Inicio
              </Button>
              <div className="border-l h-8 border-gray-300"></div>
              <div>
                <h1 className="text-base font-semibold text-gray-800">Gestión de Consumibles</h1>
                <p className="text-xs text-gray-500">Sistema del Chef</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-[#8B6F47] text-white hover:bg-[#8B6F47] px-3 py-1.5">
                <User className="w-3 h-3 mr-1.5" />
                {user?.nombre || 'Chef Demo'}
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolverAlPortal}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Volver al Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sección Principal */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Administración de Consumibles</h2>
            <p className="text-sm text-gray-600 mt-1">Gestiona platos, bebidas y postres</p>
          </div>
          <Button 
            onClick={handleCreate}
            className="bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white"
          >
            Nuevo Consumible
          </Button>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar consumibles..."
              className="pl-10 bg-white h-12"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs de Categorías */}
        {loadingConsumibles ? (
          <Card className="bg-white">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <Utensils className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Cargando consumibles...</h3>
                <p className="text-sm text-gray-500">Por favor espera un momento</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="platos" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white">
              <TabsTrigger value="platos" className="text-base">
                Platos ({platos.length})
              </TabsTrigger>
              <TabsTrigger value="bebidas" className="text-base">
                Bebidas ({bebidas.length})
              </TabsTrigger>
              <TabsTrigger value="postres" className="text-base">
                Postres ({postres.length})
              </TabsTrigger>
            </TabsList>

          {/* Contenido de Platos */}
          <TabsContent value="platos">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {platos.map(renderConsumibleCard)}
            </div>
            
            {/* Cards de Disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Utensils className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{platos.length}</p>
                  <p className="text-sm text-gray-600">Platos Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Wine className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{bebidas.length}</p>
                  <p className="text-sm text-gray-600">Bebidas Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Cake className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{postres.length}</p>
                  <p className="text-sm text-gray-600">Postres Disponibles</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contenido de Bebidas */}
          <TabsContent value="bebidas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {bebidas.map(renderConsumibleCard)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Utensils className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{platos.length}</p>
                  <p className="text-sm text-gray-600">Platos Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Wine className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{bebidas.length}</p>
                  <p className="text-sm text-gray-600">Bebidas Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Cake className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{postres.length}</p>
                  <p className="text-sm text-gray-600">Postres Disponibles</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contenido de Postres */}
          <TabsContent value="postres">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {postres.map(renderConsumibleCard)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Utensils className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{platos.length}</p>
                  <p className="text-sm text-gray-600">Platos Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Wine className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{bebidas.length}</p>
                  <p className="text-sm text-gray-600">Bebidas Disponibles</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Cake className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-3xl font-bold text-gray-800">{postres.length}</p>
                  <p className="text-sm text-gray-600">Postres Disponibles</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </main>

      {/* Dialog de Crear/Editar */}
      <Dialog open={showDialog} onOpenChange={handleDialogToggle}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingConsumible ? 'Editar Consumible' : 'Nuevo Consumible'}
            </DialogTitle>
            <DialogDescription>
              {editingConsumible ? 'Modifica los datos del consumible' : 'Completa los datos del nuevo consumible'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de consumible *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: 'plato' | 'bebida' | 'postre') =>
                  setFormData({ ...formData, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plato">Plato</SelectItem>
                  <SelectItem value="bebida">Bebida</SelectItem>
                  <SelectItem value="postre">Postre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del consumible *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Ceviche de Pescado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Descripción del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio *</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, precio: Number(e.target.value) })
                }
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="disponible"
                type="checkbox"
                checked={formData.disponible ?? true}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, disponible: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
              />
              <Label htmlFor="disponible" className="cursor-pointer">
                Producto disponible
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen</Label>
              <Input
                id="imagen"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <p className="text-xs text-gray-500">Formatos aceptados: JPG, PNG, WEBP. Tamaño máximo recomendado 2 MB.</p>
              {formData.imagen?.trim() && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-dashed border-gray-300 p-2">
                    <img
                      src={formData.imagen}
                      alt={`Previsualización de ${formData.nombre || 'consumible'}`}
                      className="h-32 w-full rounded-md object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate pr-2">{selectedImageFile?.name || 'Imagen actual'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="h-8 px-2"
                    >
                      Quitar imagen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleDialogToggle(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#1E3A5F] hover:bg-[#2A4A7F]"
            >
              {saving 
                ? 'Guardando...' 
                : editingConsumible 
                  ? 'Guardar Cambios' 
                  : 'Crear Consumible'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}







