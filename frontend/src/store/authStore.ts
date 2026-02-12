import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'restaurant' | 'driver';
  created_at: string;
}

import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (phone: string, password: string) => Promise<User>;
  register: (name: string, phone: string, password: string, role?: string, city_id?: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setGuestMode: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,

  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login(phone, password);
      set({ user: response.user, isAuthenticated: true, isGuest: false, isLoading: false });
      return response.user;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (name: string, phone: string, password: string, role: string = 'customer', city_id?: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(name, phone, password, role, city_id);
      set({ user: response.user, isAuthenticated: true, isGuest: false, isLoading: false });
      return response.user;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    // Optimistic: clear state FIRST, then call API
    set({ user: null, isAuthenticated: false, isGuest: false });
    try { await authAPI.logout(); } catch {}
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

  setGuestMode: (value: boolean) => {
    set({ isGuest: value, isLoading: false });
  },
}));
