import { create } from 'zustand';
import { ValidationHistory } from '../types';

interface ValidationStore {
  history: ValidationHistory[];
  addToHistory: (item: ValidationHistory) => void;
  clearHistory: () => void;
  getRecentHistory: (limit?: number) => ValidationHistory[];
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  history: [],
  
  addToHistory: (item) => {
    set((state) => ({
      history: [item, ...state.history].slice(0, 50), // Mantém apenas os últimos 50
    }));
  },
  
  clearHistory: () => {
    set({ history: [] });
  },
  
  getRecentHistory: (limit = 50) => {
    return get().history.slice(0, limit);
  },
}));

