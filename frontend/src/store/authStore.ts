import { create } from 'zustand';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (phone: string, password: string) => {
    const response = await authAPI.login(phone, password);
    set({ user: response.user, isAuthenticated: true });
  },

  register: async (name: string, phone: string, password: string) => {
    const response = await authAPI.register(name, phone, password);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    await authAPI.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await authAPI.getToken();
      if (token) {
        const user = await authAPI.getMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
