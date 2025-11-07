import { create } from 'zustand';
import { ValidationHistory } from '../types';
import { getValidationHistory } from '../services/validationService';

interface ValidationStore {
  history: ValidationHistory[];
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  totalValidations: number;
  validValidations: number;
  duplicateAttempts: number;
  search: string;
  filter: 'validated' | 'already_used' | 'all';
  addToHistory: (item: ValidationHistory) => void;
  clearHistory: () => void;
  getRecentHistory: (limit?: number) => ValidationHistory[];
  loadHistoryFromBackend: (page?: number, limit?: number, search?: string, filter?: string) => Promise<void>;
  syncHistory: () => Promise<void>; // Sincroniza com backend
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setFilter: (filter: 'validated' | 'already_used' | 'all') => void;
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  history: [],
  isLoading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  totalValidations: 0,
  validValidations: 0,
  duplicateAttempts: 0,
  search: '',
  filter: 'validated', // Padrão: apenas códigos validados (sucesso)
  
  addToHistory: (item) => {
    set((state) => {
      // Verificar se já existe (evitar duplicatas)
      const exists = state.history.find(h => 
        h.ticketCode === item.ticketCode && 
        Math.abs(new Date(h.timestamp).getTime() - new Date(item.timestamp).getTime()) < 1000
      );
      
      if (exists) {
        return state; // Não adicionar duplicata
      }
      
      return {
        history: [item, ...state.history].slice(0, 100), // Mantém apenas os últimos 100
      };
    });
  },
  
  clearHistory: () => {
    set({ history: [] });
  },
  
  getRecentHistory: (limit = 50) => {
    return get().history.slice(0, limit);
  },
  
  setSearch: (search: string) => {
    set({ search, pagination: { ...get().pagination, page: 1 } });
  },
  
  setPage: (page: number) => {
    set({ pagination: { ...get().pagination, page } });
  },
  
  setFilter: (filter: 'validated' | 'already_used' | 'all') => {
    set({ filter, pagination: { ...get().pagination, page: 1 } });
  },
  
  loadHistoryFromBackend: async (page = 1, limit = 20, search = '', filter = 'validated') => {
    set({ isLoading: true });
    try {
      const state = get();
      const currentPage = page || state.pagination.page;
      const currentLimit = limit || state.pagination.limit;
      const currentSearch = search !== undefined ? search : state.search;
      const currentFilter = filter !== undefined ? filter : state.filter;
      
      const result = await getValidationHistory(currentPage, currentLimit, currentSearch, currentFilter);
      set({ 
        history: result.data,
        pagination: result.pagination,
        totalValidations: result.totalValidations,
        validValidations: result.validValidations,
        duplicateAttempts: result.duplicateAttempts,
        search: currentSearch,
        filter: currentFilter as 'validated' | 'already_used' | 'all',
        isLoading: false 
      });
    } catch (error) {
      console.error('Erro ao carregar histórico do backend:', error);
      set({ isLoading: false });
    }
  },
  
  syncHistory: async () => {
    // Sincroniza histórico do backend (mantém local também)
    try {
      const state = get();
      const result = await getValidationHistory(state.pagination.page, state.pagination.limit, state.search, state.filter);
      const currentHistory = get().history;
      
      // Mesclar: backend tem prioridade, mas manter itens locais recentes que não estão no backend ainda
      const backendIds = new Set(result.data.map(h => h.id));
      const localOnly = currentHistory.filter(h => !backendIds.has(h.id));
      
      // Combinar: backend primeiro, depois itens locais recentes
      const merged = [...result.data, ...localOnly]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
      
      set({ 
        history: merged, 
        pagination: result.pagination, 
        totalValidations: result.totalValidations,
        validValidations: result.validValidations,
        duplicateAttempts: result.duplicateAttempts
      });
    } catch (error) {
      console.error('Erro ao sincronizar histórico:', error);
    }
  },
}));

