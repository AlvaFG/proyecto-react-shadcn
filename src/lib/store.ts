import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Reserva, TurnoHorario, ReservaStatus, Consumible } from '../types';
import { consumibles as consumiblesMock } from './data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Simulación de login
        // En producción, esto haría una llamada a la API
        
        // Usuarios de prueba
        const usuarios: User[] = [
          { id: '1', nombre: 'Juan Pérez', email: 'cliente@test.com', rol: 'cliente' },
          { id: '2', nombre: 'Chef María', email: 'chef@test.com', rol: 'chef' },
          { id: '3', nombre: 'Cajero Pedro', email: 'cajero@test.com', rol: 'cajero' },
        ];

        const user = usuarios.find((u) => u.email === email);
        
        if (user && password === '123456') {
          set({ user, isAuthenticated: true });
          return true;
        }
        
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface ReservaState {
  reservas: Reserva[];
  reservaActual: Reserva | null;
  slotOccupancy: Record<string, number>;
  setReservaActual: (reserva: Reserva | null) => void;
  agregarReserva: (reserva: Reserva) => void;
  actualizarReserva: (id: string, reserva: Partial<Reserva>) => void;
  obtenerReservaPorId: (id: string) => Reserva | undefined;
  cancelarReserva: (id: string) => void;
  getSlotCount: (slotId: string) => number;
  reservarHorario: (slot: TurnoHorario) => boolean;
  liberarHorario: (slot: TurnoHorario) => void;
}

// Función para migrar estados inválidos a ACTIVA
const migrarEstadosReservas = (reservas: Reserva[]): Reserva[] => {
  return reservas.map((reserva) => {
    // Si el estado no es válido (ej: "pendiente"), convertir a ACTIVA
    const estadosValidos: ReservaStatus[] = ['ACTIVA', 'FINALIZADA', 'CANCELADA'];
    const estadoNormalizado = reserva.estado?.toUpperCase() as ReservaStatus;
    
    if (!estadosValidos.includes(estadoNormalizado)) {
      console.warn(`Migrando reserva ${reserva.id} de estado "${reserva.estado}" a "ACTIVA"`);
      return { ...reserva, estado: 'ACTIVA' };
    }
    
    // Asegurar que el estado esté en mayúsculas
    return { ...reserva, estado: estadoNormalizado };
  });
};

export const useReservaStore = create<ReservaState>()(
  persist(
    (set, get) => ({
      reservas: [],
      reservaActual: null,
      slotOccupancy: {},
      
      setReservaActual: (reserva) => set({ reservaActual: reserva }),
      
      agregarReserva: (reserva) => {
        set((state) => {
          // Asegurar que el estado sea ACTIVA al crear
          const nuevaReserva: Reserva = {
            ...reserva,
            estado: 'ACTIVA', // Estado inicial siempre ACTIVA
          };
          
          const nuevasReservas = [...state.reservas, nuevaReserva];
          const newOccupancy = { ...state.slotOccupancy };
          
          // Si tiene slotId, incrementar ocupación
          if (nuevaReserva.slotId) {
            const currentCount = newOccupancy[nuevaReserva.slotId] || 0;
            newOccupancy[nuevaReserva.slotId] = currentCount + 1;
          }
          
          return { 
            reservas: nuevasReservas,
            slotOccupancy: newOccupancy
          };
        });
      },
      
      actualizarReserva: (id, reservaUpdate) => {
        set((state) => {
          const reservaAnterior = state.reservas.find((r) => r.id === id);
          const newOccupancy = { ...state.slotOccupancy };
          
          // Si se está cancelando y tiene slotId, liberar el horario
          if (
            reservaUpdate.estado === 'CANCELADA' &&
            reservaAnterior?.estado === 'ACTIVA' &&
            reservaAnterior.slotId
          ) {
            const currentCount = newOccupancy[reservaAnterior.slotId] || 0;
            if (currentCount > 0) {
              newOccupancy[reservaAnterior.slotId] = currentCount - 1;
            }
          }
          
          return {
            reservas: state.reservas.map((r) =>
              r.id === id ? { ...r, ...reservaUpdate } : r
            ),
            slotOccupancy: newOccupancy,
          };
        });
      },
      
      obtenerReservaPorId: (id) => {
        return get().reservas.find((r) => r.id === id);
      },
      
      cancelarReserva: (id) => {
        set((state) => {
          const reserva = state.reservas.find((r) => r.id === id);
          const newOccupancy = { ...state.slotOccupancy };
          
          // Si tiene slotId, liberar el horario
          if (reserva?.slotId && reserva.estado === 'ACTIVA') {
            const currentCount = newOccupancy[reserva.slotId] || 0;
            if (currentCount > 0) {
              newOccupancy[reserva.slotId] = currentCount - 1;
            }
          }
          
          return {
            reservas: state.reservas.map((r) =>
              r.id === id ? { ...r, estado: 'CANCELADA' as const } : r
            ),
            slotOccupancy: newOccupancy
          };
        });
      },
      
      getSlotCount: (slotId) => {
        return get().slotOccupancy[slotId] || 0;
      },
      
      reservarHorario: (slot) => {
        const currentCount = get().getSlotCount(slot.id);
        if (currentCount >= slot.capacity) {
          return false; // No hay cupo
        }
        
        set((state) => ({
          slotOccupancy: {
            ...state.slotOccupancy,
            [slot.id]: currentCount + 1,
          },
        }));
        
        return true;
      },
      
      liberarHorario: (slot) => {
        const currentCount = get().getSlotCount(slot.id);
        if (currentCount > 0) {
          set((state) => ({
            slotOccupancy: {
              ...state.slotOccupancy,
              [slot.id]: currentCount - 1,
            },
          }));
        }
      },
    }),
    {
      name: 'reserva-storage',
      storage: createJSONStorage(() => localStorage),
      // Migración automática al cargar desde localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.reservas) {
          const reservasMigradas = migrarEstadosReservas(state.reservas);
          
          // Si hubo cambios, actualizar el estado
          const huboCambios = reservasMigradas.some(
            (r, i) => r.estado !== state.reservas[i]?.estado
          );
          
          if (huboCambios) {
            state.reservas = reservasMigradas;
            console.log('✅ Reservas migradas exitosamente');
          }
        }
      },
    }
  )
);


const cloneChefConsumibles = (): Consumible[] => consumiblesMock.map((item) => ({ ...item }));

export const CHEF_TURNOS = ['desayuno', 'almuerzo', 'merienda', 'cena'] as const;
export const CHEF_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
export type ChefTurnoId = typeof CHEF_TURNOS[number];
export type ChefDia = typeof CHEF_DIAS[number];

export interface ChefMenuAsignado {
  platoIds: string[];
  bebidaIds: string[];
  postreIds: string[];
}

export type ChefMenusSemana = Record<ChefTurnoId, Record<ChefDia, ChefMenuAsignado | null>>;

const createEmptyChefMenus = (): ChefMenusSemana => ({
  desayuno: { lunes: null, martes: null, miercoles: null, jueves: null, viernes: null },
  almuerzo: { lunes: null, martes: null, miercoles: null, jueves: null, viernes: null },
  merienda: { lunes: null, martes: null, miercoles: null, jueves: null, viernes: null },
  cena: { lunes: null, martes: null, miercoles: null, jueves: null, viernes: null },
});

interface ChefConsumiblesState {
  consumibles: Consumible[];
  addConsumible: (consumible: Consumible) => void;
  updateConsumible: (id: string, data: Partial<Consumible>) => void;
  deleteConsumible: (id: string) => void;
  toggleDisponibilidad: (id: string) => void;
  resetConsumibles: () => void;
}

interface ChefMenuState {
  menusSemana: ChefMenusSemana;
  assignMenu: (turno: ChefTurnoId, dia: ChefDia, menu: ChefMenuAsignado) => void;
  clearMenu: (turno: ChefTurnoId, dia: ChefDia) => void;
  resetMenus: () => void;
  removeConsumibleFromMenus: (consumibleId: string) => void;
}

export const useChefConsumiblesStore = create<ChefConsumiblesState>()(
  persist(
    (set) => ({
      consumibles: cloneChefConsumibles(),
      addConsumible: (consumible) =>
        set((state) => ({ consumibles: [...state.consumibles, consumible] })),
      updateConsumible: (id, data) =>
        set((state) => ({
          consumibles: state.consumibles.map((item) =>
            item.id === id ? { ...item, ...data } : item
          ),
        })),
      deleteConsumible: (id) =>
        set((state) => ({
          consumibles: state.consumibles.filter((item) => item.id !== id),
        })),
      toggleDisponibilidad: (id) =>
        set((state) => ({
          consumibles: state.consumibles.map((item) =>
            item.id === id ? { ...item, disponible: !item.disponible } : item
          ),
        })),
      resetConsumibles: () => set({ consumibles: cloneChefConsumibles() }),
    }),
    {
      name: 'chef-consumibles-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (state, _version) => {
        if (!state) {
          return { consumibles: cloneChefConsumibles() };
        }

        // Asegura que siempre exista la lista de consumibles
        if (!Array.isArray((state as ChefConsumiblesState).consumibles)) {
          return { consumibles: cloneChefConsumibles() };
        }

        return state as ChefConsumiblesState;
      },
    }
  )
);

const normalizeIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

export const useChefMenuStore = create<ChefMenuState>()((set) => ({
  menusSemana: createEmptyChefMenus(),
  assignMenu: (turno, dia, menu) => {
    const normalized: ChefMenuAsignado = {
      platoIds: normalizeIds(menu.platoIds),
      bebidaIds: normalizeIds(menu.bebidaIds),
      postreIds: normalizeIds(menu.postreIds),
    };
    set((state) => ({
      menusSemana: {
        ...state.menusSemana,
        [turno]: {
          ...state.menusSemana[turno],
          [dia]: normalized,
        },
      },
    }));
  },
  clearMenu: (turno, dia) =>
    set((state) => ({
      menusSemana: {
        ...state.menusSemana,
        [turno]: {
          ...state.menusSemana[turno],
          [dia]: null,
        },
      },
    })),
  resetMenus: () => set({ menusSemana: createEmptyChefMenus() }),
  removeConsumibleFromMenus: (consumibleId) => {
    set((state) => {
      let changed = false;
      const updatedMenus: ChefMenusSemana = { ...state.menusSemana };

      CHEF_TURNOS.forEach((turno) => {
        const currentDias = state.menusSemana[turno];
        let turnoChanged = false;
        const newDias = { ...currentDias };

        CHEF_DIAS.forEach((dia) => {
          const menu = currentDias[dia];
          if (menu) {
            const nextMenu: ChefMenuAsignado = {
              platoIds: menu.platoIds.filter((id) => id !== consumibleId),
              bebidaIds: menu.bebidaIds.filter((id) => id !== consumibleId),
              postreIds: menu.postreIds.filter((id) => id !== consumibleId),
            };

            if (
              nextMenu.platoIds.length !== menu.platoIds.length ||
              nextMenu.bebidaIds.length !== menu.bebidaIds.length ||
              nextMenu.postreIds.length !== menu.postreIds.length
            ) {
              turnoChanged = true;
              changed = true;
              if (
                nextMenu.platoIds.length === 0 &&
                nextMenu.bebidaIds.length === 0 &&
                nextMenu.postreIds.length === 0
              ) {
                newDias[dia] = null;
              } else {
                newDias[dia] = nextMenu;
              }
            }
          }
        });

        if (turnoChanged) {
          updatedMenus[turno] = newDias;
        }
      });

      return changed ? { menusSemana: updatedMenus } : state;
    });
  },
}));

