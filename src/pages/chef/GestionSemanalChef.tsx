import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { User, LogOut, Home, Edit, Plus, CirclePlus, CircleMinus, Trash2 } from 'lucide-react';
import {
  useAuthStore,
  useChefMenuStore,
  CHEF_DIAS,
  type ChefMenuAsignado,
  type ChefDia,
  type ChefTurnoId,
} from '../../lib/store';
import type { Consumible } from '../../types';
import { api } from '../../lib/http';

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

// Interfaces para el endpoint de menús
interface MenuSectionAPI {
  platos: ProductAPI[];
  bebidas: ProductAPI[];
  postres: ProductAPI[];
}

interface MealAPI {
  mealTime: string; // "desayuno", "almuerzo", "merienda", "cena"
  sections: MenuSectionAPI;
}

interface DayMenuAPI {
  day: string; // "lunes", "martes", etc.
  meals: MealAPI[];
}

interface MenuResponseDTO {
  lastModified: string;
  days: DayMenuAPI[];
}

// Para crear/actualizar menús
interface MealCreateDTO {
  mealTime: string; // "DESAYUNO", "ALMUERZO", "MERIENDA", "CENA"
  productIds: number[];
}

interface DayCreateDTO {
  day: string; // "LUNES", "MARTES", etc.
  meals: MealCreateDTO[];
}

interface MenuCreateRequest {
  days: DayCreateDTO[];
}

// Función para normalizar el tipo de producto del backend al frontend
const normalizeProductType = (type: string): Consumible['tipo'] => {
  const normalized = type.toUpperCase();
  if (normalized === 'PLATO' || normalized === 'MAIN' || normalized === 'FOOD') return 'plato';
  if (normalized === 'BEBIDA' || normalized === 'DRINK' || normalized === 'BEVERAGE') return 'bebida';
  if (normalized === 'POSTRE' || normalized === 'DESSERT') return 'postre';
  return 'plato'; // Default
};

// Mapear día del backend (lowercase) al frontend
const normalizeDayFromAPI = (day: string): ChefDia | null => {
  const normalized = day.toLowerCase();
  if (CHEF_DIAS.includes(normalized as ChefDia)) {
    return normalized as ChefDia;
  }
  return null;
};

// Mapear turno del backend (lowercase) al frontend
const normalizeMealTimeFromAPI = (mealTime: string): ChefTurnoId | null => {
  const normalized = mealTime.toLowerCase();
  const validTurnos: ChefTurnoId[] = ['desayuno', 'almuerzo', 'merienda', 'cena'];
  if (validTurnos.includes(normalized as ChefTurnoId)) {
    return normalized as ChefTurnoId;
  }
  return null;
};

// Mapear día del frontend al backend (uppercase)
const dayToBackend = (day: ChefDia): string => {
  return day.toUpperCase();
};

// Mapear turno del frontend al backend (uppercase)
const mealTimeToBackend = (turno: ChefTurnoId): string => {
  return turno.toUpperCase();
};

type DiaSemana = ChefDia;
type TurnoId = ChefTurnoId;

interface Turno {
  id: TurnoId;
  nombre: string;
  horario: string;
}

type TabKey = 'platos' | 'bebidas' | 'postres';
type SelectionState = Record<TabKey, string[]>;
type AnchorState = Record<TabKey, number | null>;

const TURNOS: Turno[] = [
  { id: 'desayuno', nombre: 'Desayuno', horario: '07:00-11:00' },
  { id: 'almuerzo', nombre: 'Almuerzo', horario: '12:00-15:00' },
  { id: 'merienda', nombre: 'Merienda', horario: '16:00-19:00' },
  { id: 'cena', nombre: 'Cena', horario: '20:00-22:00' },
];

const DIA_LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

const TIPO_BY_TAB: Record<TabKey, Consumible['tipo']> = {
  platos: 'plato',
  bebidas: 'bebida',
  postres: 'postre',
};

const TAB_LABEL: Record<TabKey, string> = {
  platos: 'platos',
  bebidas: 'bebidas',
  postres: 'postres',
};

const createEmptySelection = (): SelectionState => ({ platos: [], bebidas: [], postres: [] });
const createEmptyAnchors = (): AnchorState => ({ platos: null, bebidas: null, postres: null });

export default function GestionSemanalChef() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const menusSemana = useChefMenuStore((state) => state.menusSemana);
  const assignMenu = useChefMenuStore((state) => state.assignMenu);
  const clearMenu = useChefMenuStore((state) => state.clearMenu);
  const resetMenus = useChefMenuStore((state) => state.resetMenus);
  
  // Estados para consumibles del API
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [loadingConsumibles, setLoadingConsumibles] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [savingMenu, setSavingMenu] = useState(false);

  // Cargar consumibles desde el API
  const fetchConsumibles = async () => {
    try {
      setLoadingConsumibles(true);
      const data = await api.get<ProductAPI[]>('/products');
      
      // Mapear los productos del API al formato del frontend
      const consumiblesMapeados: Consumible[] = (data || []).map((p) => ({
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

  // Cargar menús desde el API
  const fetchMenus = async () => {
    try {
      setLoadingMenus(true);
      const data = await api.get<MenuResponseDTO>('/menus');
      
      if (!data || !data.days) {
        // Si no hay menús, limpiar todo
        resetMenus();
        return;
      }

      // Convertir la respuesta del API al formato del store
      data.days.forEach((dayData) => {
        const dia = normalizeDayFromAPI(dayData.day);
        if (!dia) return;

        dayData.meals.forEach((meal) => {
          const turno = normalizeMealTimeFromAPI(meal.mealTime);
          if (!turno) return;

          // Extraer IDs de cada sección
          const platoIds = meal.sections.platos.map((p) => String(p.id));
          const bebidaIds = meal.sections.bebidas.map((p) => String(p.id));
          const postreIds = meal.sections.postres.map((p) => String(p.id));

          // Asignar al store
          assignMenu(turno, dia, {
            platoIds,
            bebidaIds,
            postreIds,
          });
        });
      });
    } catch (error) {
      console.error('Error al cargar menús:', error);
      // Si hay error, no hacer nada (mantener estado actual)
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    fetchConsumibles();
    fetchMenus();
  }, []);

  const consumiblesMap = useMemo(() => {
    const map = new Map<string, Consumible>();
    consumibles.forEach((item) => map.set(item.id, item));
    return map;
  }, [consumibles]);

  const consumiblesPorTipo = useMemo<Record<Consumible['tipo'], Consumible[]>>(
    () => ({
      plato: consumibles.filter((c) => c.tipo === 'plato'),
      bebida: consumibles.filter((c) => c.tipo === 'bebida'),
      postre: consumibles.filter((c) => c.tipo === 'postre'),
    }),
    [consumibles]
  );

  const [showDialog, setShowDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<{ turno: TurnoId; dia: DiaSemana } | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectionState>(() => createEmptySelection());
  const [selDisponibles, setSelDisponibles] = useState<SelectionState>(() => createEmptySelection());
  const [selSeleccionados, setSelSeleccionados] = useState<SelectionState>(() => createEmptySelection());
  const [anchorDisponibles, setAnchorDisponibles] = useState<AnchorState>(() => createEmptyAnchors());
  const [anchorSeleccionados, setAnchorSeleccionados] = useState<AnchorState>(() => createEmptyAnchors());
  const [search, setSearch] = useState<Record<TabKey, string>>({ platos: '', bebidas: '', postres: '' });
  const [searchSel, setSearchSel] = useState<Record<TabKey, string>>({ platos: '', bebidas: '', postres: '' });

  const normalize = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAsignarMenu = (turno: TurnoId, dia: DiaSemana) => {
    const menuActual = menusSemana[turno][dia];

    setEditingCell({ turno, dia });
    setSelectedItems({
      platos: [...(menuActual?.platoIds ?? [])],
      bebidas: [...(menuActual?.bebidaIds ?? [])],
      postres: [...(menuActual?.postreIds ?? [])],
    });
    setSelDisponibles(createEmptySelection());
    setSelSeleccionados(createEmptySelection());
    setAnchorDisponibles(createEmptyAnchors());
    setAnchorSeleccionados(createEmptyAnchors());
    setShowDialog(true);
  };

  const handleDialogToggle = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setEditingCell(null);
      setSelectedItems(createEmptySelection());
      setSelDisponibles(createEmptySelection());
      setSelSeleccionados(createEmptySelection());
      setAnchorDisponibles(createEmptyAnchors());
      setAnchorSeleccionados(createEmptyAnchors());
    }
  };

  const moverASeleccionados = (tab: TabKey) => {
    const ids = selDisponibles[tab];
    if (!ids.length) return;
    setSelectedItems((prev) => ({
      ...prev,
      [tab]: [...prev[tab], ...ids.filter((id) => !prev[tab].includes(id))],
    }));
    setSelDisponibles((prev) => ({ ...prev, [tab]: [] }));
    setAnchorDisponibles((prev) => ({ ...prev, [tab]: null }));
  };

  const moverADisponibles = (tab: TabKey) => {
    const ids = selSeleccionados[tab];
    if (!ids.length) return;
    setSelectedItems((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((itemId) => !ids.includes(itemId)),
    }));
    setSelSeleccionados((prev) => ({ ...prev, [tab]: [] }));
    setAnchorSeleccionados((prev) => ({ ...prev, [tab]: null }));
  };

  const getDisponibles = (tab: TabKey) => {
    const all = consumiblesPorTipo[TIPO_BY_TAB[tab]];
    const selected = new Set(selectedItems[tab]);
    const q = normalize(search[tab]);
    const base = all.filter((item) => !selected.has(item.id));
    return q ? base.filter((item) => normalize(item.nombre).includes(q)) : base;
  };

  const getSeleccionados = (tab: TabKey) => {
    const q = normalize(searchSel[tab]);
    const items = selectedItems[tab]
      .map((id) => consumiblesMap.get(id))
      .filter((item): item is Consumible => Boolean(item));
    return q ? items.filter((item) => normalize(item.nombre).includes(q)) : items;
  };

  const formatMenuDisplay = (menu: ChefMenuAsignado) => {
    const secciones: string[] = [];

    const platos = menu.platoIds
      .map((id) => consumiblesMap.get(id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
    if (platos.length) {
      secciones.push(`Platos: ${platos.join(', ')}`);
    }

    const bebidas = menu.bebidaIds
      .map((id) => consumiblesMap.get(id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
    if (bebidas.length) {
      secciones.push(`Bebidas: ${bebidas.join(', ')}`);
    }

    const postres = menu.postreIds
      .map((id) => consumiblesMap.get(id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
    if (postres.length) {
      secciones.push(`Postres: ${postres.join(', ')}`);
    }

    return secciones.length ? secciones.join(' | ') : 'Sin consumibles asignados';
  };

  const handleGuardarMenu = async () => {
    if (!editingCell) return;

    try {
      setSavingMenu(true);

      // Primero actualizar el estado local
      assignMenu(editingCell.turno, editingCell.dia, {
        platoIds: selectedItems.platos,
        bebidaIds: selectedItems.bebidas,
        postreIds: selectedItems.postres,
      });

      // Preparar el payload para enviar TODO el menú semanal al backend
      const days: DayCreateDTO[] = [];

      CHEF_DIAS.forEach((dia) => {
        const meals: MealCreateDTO[] = [];

        // Procesar cada turno del día
        (['desayuno', 'almuerzo', 'merienda', 'cena'] as ChefTurnoId[]).forEach((turno) => {
          let menu: ChefMenuAsignado | null;

          // Si es la celda que estamos editando, usar los nuevos valores
          if (turno === editingCell.turno && dia === editingCell.dia) {
            menu = {
              platoIds: selectedItems.platos,
              bebidaIds: selectedItems.bebidas,
              postreIds: selectedItems.postres,
            };
          } else {
            // Sino, usar el valor actual del store
            menu = menusSemana[turno][dia];
          }

          // Solo agregar si tiene productos
          if (menu && (menu.platoIds.length > 0 || menu.bebidaIds.length > 0 || menu.postreIds.length > 0)) {
            const productIds = [
              ...menu.platoIds.map(Number),
              ...menu.bebidaIds.map(Number),
              ...menu.postreIds.map(Number),
            ];

            meals.push({
              mealTime: mealTimeToBackend(turno),
              productIds,
            });
          }
        });

        // Solo agregar el día si tiene al menos una comida
        if (meals.length > 0) {
          days.push({
            day: dayToBackend(dia),
            meals,
          });
        }
      });

      const payload: MenuCreateRequest = { days };

      // Llamar al backend
      await api.post('/menus/byIds', payload);

      handleDialogToggle(false);
    } catch (error) {
      console.error('Error al guardar menú:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo guardar el menú: ${errorMessage}`);
    } finally {
      setSavingMenu(false);
    }
  };

  const handleLimpiarMenu = async () => {
    if (!editingCell) return;

    try {
      setSavingMenu(true);

      // Primero limpiar el estado local
      clearMenu(editingCell.turno, editingCell.dia);

      // Preparar el payload para enviar TODO el menú semanal al backend
      const days: DayCreateDTO[] = [];

      CHEF_DIAS.forEach((dia) => {
        const meals: MealCreateDTO[] = [];

        // Procesar cada turno del día
        (['desayuno', 'almuerzo', 'merienda', 'cena'] as ChefTurnoId[]).forEach((turno) => {
          let menu: ChefMenuAsignado | null;

          // Si es la celda que estamos limpiando, usar null
          if (turno === editingCell.turno && dia === editingCell.dia) {
            menu = null;
          } else {
            // Sino, usar el valor actual del store
            menu = menusSemana[turno][dia];
          }

          // Solo agregar si tiene productos
          if (menu && (menu.platoIds.length > 0 || menu.bebidaIds.length > 0 || menu.postreIds.length > 0)) {
            const productIds = [
              ...menu.platoIds.map(Number),
              ...menu.bebidaIds.map(Number),
              ...menu.postreIds.map(Number),
            ];

            meals.push({
              mealTime: mealTimeToBackend(turno),
              productIds,
            });
          }
        });

        // Solo agregar el día si tiene al menos una comida
        if (meals.length > 0) {
          days.push({
            day: dayToBackend(dia),
            meals,
          });
        }
      });

      const payload: MenuCreateRequest = { days };

      // Llamar al backend
      await api.post('/menus/byIds', payload);

      handleDialogToggle(false);
    } catch (error) {
      console.error('Error al limpiar menú:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`No se pudo limpiar el menú: ${errorMessage}`);
    } finally {
      setSavingMenu(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8DED4]">
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
              <div className="border-l h-8 border-gray-300" />
              <div>
                <h1 className="text-base font-semibold text-gray-800">Gestión Semanal de Menús</h1>
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

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Planificación Semanal</h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona los menús por día y turno</p>
        </div>

        <Card className="bg-white border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Menú de la Semana Actual</h3>
            <p className="text-sm text-gray-600 mb-6">Día / Turno</p>

            {loadingMenus ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Home className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Cargando menús de la semana...</h3>
                  <p className="text-sm text-gray-500">Por favor espera un momento</p>
                </div>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 p-3 text-left min-w-[150px]" />
                    {CHEF_DIAS.map((dia) => (
                      <th key={dia} className="border border-gray-300 bg-gray-50 p-3 text-center min-w-[180px]">
                        <div className="font-semibold text-gray-700 capitalize">{DIA_LABELS[dia]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TURNOS.map((turno) => (
                    <tr key={turno.id}>
                      <td className="border border-gray-300 bg-gray-50 p-4">
                        <div className="font-semibold text-gray-700">{turno.nombre}</div>
                        <div className="text-xs text-gray-500">{turno.horario}</div>
                      </td>
                      {CHEF_DIAS.map((dia) => {
                        const menu = menusSemana[turno.id][dia];
                        const hasItems = Boolean(
                          menu && (menu.platoIds.length + menu.bebidaIds.length + menu.postreIds.length > 0)
                        );

                        return (
                          <td key={dia} className="border border-gray-300 p-3 align-top">
                            {hasItems ? (
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">{turno.nombre}</p>
                                  <p className="text-sm text-gray-700 mt-1">{menu && formatMenuDisplay(menu)}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAsignarMenu(turno.id, dia)}
                                  className="w-full"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAsignarMenu(turno.id, dia)}
                                className="w-full h-full min-h-[80px] flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Plus className="w-5 h-5 mb-1" />
                                <span className="text-xs">Sin asignar</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={handleDialogToggle}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCell && `Editar Menú - ${DIA_LABELS[editingCell.dia]} ${TURNOS.find((t) => t.id === editingCell.turno)?.nombre ?? ''}`}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Selecciona los consumibles para este día y turno.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="platos" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="platos">Platos Principales</TabsTrigger>
              <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
              <TabsTrigger value="postres">Postres</TabsTrigger>
            </TabsList>

            {loadingConsumibles ? (
              <div className="mt-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Cargando consumibles...</h3>
                  <p className="text-sm text-gray-500">Por favor espera un momento</p>
                </div>
              </div>
            ) : (
              <>
            {(['platos', 'bebidas', 'postres'] as TabKey[]).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-6">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-700 mb-2 text-center">Disponibles</h3>
                    <div className="mb-2">
                      <Input
                        placeholder={`Buscar ${TAB_LABEL[tab]}...`}
                        value={search[tab]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSearch((prev) => ({ ...prev, [tab]: e.target.value }))
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="border rounded-lg p-3 bg-gray-50 min-h-[300px] max-h-[300px] overflow-y-auto">
                      <div className="space-y-2">
                        {getDisponibles(tab).map((item) => (
                          <button
                            key={item.id}
                            onClick={(e) => {
                              // Handler actualizado para soportar Ctrl/Cmd y Shift
                              // Obtenemos el índice actual dentro de la lista
                              const items = getDisponibles(tab);
                              const index = items.findIndex((it) => it.id === item.id);
                              const ev = e as any;
                              const isRange = ev.shiftKey;
                              const isMulti = ev.ctrlKey || ev.metaKey;
                              if (isRange) {
                                const anchor = anchorDisponibles[tab] ?? index;
                                const start = Math.min(anchor, index);
                                const end = Math.max(anchor, index);
                                const ids = items.slice(start, end + 1).map((it) => it.id);
                                setSelDisponibles((prev) => ({ ...prev, [tab]: ids }));
                              } else if (isMulti) {
                                setSelDisponibles((prev) => {
                                  const exists = prev[tab].includes(item.id);
                                  const next = exists ? prev[tab].filter((id) => id !== item.id) : [...prev[tab], item.id];
                                  return { ...prev, [tab]: next };
                                });
                              } else {
                                setSelDisponibles((prev) => ({ ...prev, [tab]: [item.id] }));
                              }
                              setAnchorDisponibles((prev) => ({ ...prev, [tab]: index }));
                              setSelSeleccionados((prev) => ({ ...prev, [tab]: [] }));
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                              selDisponibles[tab].includes(item.id)
                                ? 'bg-blue-100 border border-blue-400'
                                : 'bg-white hover:bg-gray-100'
                            }`}
                          >
                            {item.nombre}
                          </button>
                        ))}
                        {!getDisponibles(tab).length && (
                          <p className="text-xs text-center text-gray-400">Sin consumibles disponibles</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2 pt-8">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moverASeleccionados(tab)}
                      disabled={!selDisponibles[tab].length}
                      className="rounded-full h-10 w-10"
                    >
                      <CirclePlus className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moverADisponibles(tab)}
                      disabled={!selSeleccionados[tab].length}
                      className="rounded-full h-10 w-10"
                    >
                      <CircleMinus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-700 mb-2 text-center">Seleccionados</h3>
                    <div className="mb-2">
                      <Input
                        placeholder={`Buscar seleccionados...`}
                        value={searchSel[tab]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSearchSel((prev) => ({ ...prev, [tab]: e.target.value }))
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="border rounded-lg p-3 bg-gray-50 min-h-[300px] max-h-[300px] overflow-y-auto">
                      <div className="space-y-2">
                        {getSeleccionados(tab).map((item) => (
                          <button
                            key={item.id}
                            onClick={(e) => {
                              const items = getSeleccionados(tab);
                              const index = items.findIndex((it) => it.id === item.id);
                              const ev = e as any;
                              const isRange = ev.shiftKey;
                              const isMulti = ev.ctrlKey || ev.metaKey;
                              if (isRange) {
                                const anchor = anchorSeleccionados[tab] ?? index;
                                const start = Math.min(anchor, index);
                                const end = Math.max(anchor, index);
                                const ids = items.slice(start, end + 1).map((it) => it.id);
                                setSelSeleccionados((prev) => ({ ...prev, [tab]: ids }));
                              } else if (isMulti) {
                                setSelSeleccionados((prev) => {
                                  const exists = prev[tab].includes(item.id);
                                  const next = exists ? prev[tab].filter((id) => id !== item.id) : [...prev[tab], item.id];
                                  return { ...prev, [tab]: next };
                                });
                              } else {
                                setSelSeleccionados((prev) => ({ ...prev, [tab]: [item.id] }));
                              }
                              setAnchorSeleccionados((prev) => ({ ...prev, [tab]: index }));
                              setSelDisponibles((prev) => ({ ...prev, [tab]: [] }));
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                              selSeleccionados[tab].includes(item.id)
                                ? 'bg-blue-100 border border-blue-400'
                                : 'bg-white hover:bg-gray-100'
                            }`}
                          >
                            {item.nombre}
                          </button>
                        ))}
                        {!getSeleccionados(tab).length && (
                          <p className="text-xs text-center text-gray-400">Aún no hay seleccionados</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
              </>
            )}
          </Tabs>

          <DialogFooter className="mt-6 space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleDialogToggle(false)}
              disabled={savingMenu}
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={handleLimpiarMenu}
              disabled={!editingCell || savingMenu}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {savingMenu ? 'Guardando...' : 'Limpiar menú'}
            </Button>
            <Button 
              onClick={handleGuardarMenu} 
              disabled={savingMenu}
              className="bg-[#1E3A5F] hover:bg-[#2A4A7F]"
            >
              {savingMenu ? 'Guardando...' : 'Guardar Menú'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
