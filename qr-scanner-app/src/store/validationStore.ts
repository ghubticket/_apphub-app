import { create } from 'zustand';
import { ValidationHistory } from '../types';
import { getValidationHistory } from '../services/validationService';

interface ValidationStore {
  history: ValidationHistory[];
  isLoading: boolean;
  addToHistory: (item: ValidationHistory) => void;
  clearHistory: () => void;
  getRecentHistory: (limit?: number) => ValidationHistory[];
  loadHistoryFromBackend: () => Promise<void>;
  syncHistory: () => Promise<void>; // Sincroniza com backend
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  history: [],
  isLoading: false,
  
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
  
  loadHistoryFromBackend: async () => {
    set({ isLoading: true });
    try {
      const backendHistory = await getValidationHistory(100);
      set({ 
        history: backendHistory,
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
      const backendHistory = await getValidationHistory(100);
      const currentHistory = get().history;
      
      // Mesclar: backend tem prioridade, mas manter itens locais recentes que não estão no backend ainda
      const backendIds = new Set(backendHistory.map(h => h.id));
      const localOnly = currentHistory.filter(h => !backendIds.has(h.id));
      
      // Combinar: backend primeiro, depois itens locais recentes
      const merged = [...backendHistory, ...localOnly]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
      
      set({ history: merged });
    } catch (error) {
      console.error('Erro ao sincronizar histórico:', error);
    }
  },
}));

