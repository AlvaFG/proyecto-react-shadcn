import { useState, useMemo } from 'react';
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
import { useAuthStore, useChefConsumiblesStore, useChefMenuStore } from '../../lib/store';
import type { Consumible } from '../../types';
import { createProduct, type ProductInput } from '../../services/products';
import { useEffect } from 'react';
import { getProducts } from '../../services/products';


export default function ConsumiblesPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { consumibles, setConsumibles, addConsumible, updateConsumible, deleteConsumible } =
  useChefConsumiblesStore();
  const removeConsumibleFromMenus = useChefMenuStore((state) => state.removeConsumibleFromMenus);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConsumible, setEditingConsumible] = useState<Consumible | null>(null);
  const [formData, setFormData] = useState<Partial<Consumible>>({
    nombre: '',
    tipo: 'plato',
    descripcion: '',
    precio: 0,
    disponible: true,
    imagen: '',
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const handleEdit = (consumible: Consumible) => {
    setEditingConsumible(consumible);
    setSelectedImageFile(null);
    setFormData(consumible);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este consumible?')) {
      deleteConsumible(id);
      removeConsumibleFromMenus(id);
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
        setFormData((prev) => ({ ...prev, imagen: reader.result as string })); // 👈 cast
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
  const nombre = (formData.nombre ?? '').trim();
  const parsedPrice = Number(formData.precio);

  if (!nombre || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
    alert('Complete todos los campos requeridos');
    return;
  }

  // mapear tipo UI -> backend
  const mapTipo: Record<'plato' | 'bebida' | 'postre', 'PLATO' | 'BEBIDA' | 'POSTRE'> = {
    plato: 'PLATO',
    bebida: 'BEBIDA',
    postre: 'POSTRE',
  };

  const tipoUi = (formData.tipo as 'plato' | 'bebida' | 'postre') || 'plato';
  const productType = mapTipo[tipoUi];
  const description = (formData.descripcion ?? '').trim();
  const imageUrl = (formData.imagen ?? '').toString().trim() || undefined;

  const dto: ProductInput = {
    name: nombre,
    price: parsedPrice,
    description,
    productType,
    imageUrl,
    active: true,
  };

  try {
    // 1) crear en backend
    const created = await createProduct(dto);

    // 2) adaptar respuesta a tu store (Consumible) y agregarlo a la lista actual
    const nuevoConsumible = {
      id: created.id.toString(),
      nombre: created.name,
      tipo: tipoUi, // mantenemos el tipo de la UI para tus filtros
      descripcion: created.description,
      precio: created.price,
      disponible: true,
      imagen: created.imageUrl || imageUrl,
    };

    addConsumible(nuevoConsumible);

    // 3) cerrar modal y limpiar
    setShowDialog(false);
    setEditingConsumible(null);
    setSelectedImageFile(null);
  } catch (e: any) {
    alert(e?.message || 'No se pudo crear el consumible');
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

  const renderConsumibleCard = (consumible: Consumible) => (
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
            $ {consumible.precio.toFixed(3)}
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
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(consumible.id)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
  const fetchConsumibles = async () => {
    try {
      const productos = await getProducts();

      const adaptados: Consumible[] = productos.map((p) => ({
        id: p.id.toString(),
        nombre: p.name,
        tipo:
          p.productType === 'PLATO'
            ? 'plato'
            : p.productType === 'BEBIDA'
            ? 'bebida'
            : 'postre',
        descripcion: p.description || '',
        precio: p.price,
        disponible: p.active ?? true,
        imagen: p.imageUrl || '',
      }));

      // ⬇️ ahora reemplazamos la lista completa
      setConsumibles(adaptados);
    } catch (err) {
      console.error('Error cargando productos:', err);
      alert('No se pudieron cargar los productos desde el servidor.');
    }
  };

  fetchConsumibles();
}, [setConsumibles]);

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
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
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
              <Label htmlFor="descripcion">Descripción *</Label>
              <textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Ej: Milanesa de ternera con papas fritas"
                className="w-full border rounded-md p-2 min-h-[80px]"
              />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogToggle(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#1E3A5F] hover:bg-[#2A4A7F]">
              {editingConsumible ? 'Guardar Cambios' : 'Crear Consumible'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}