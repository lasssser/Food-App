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
  login: (phone: string, password: string) => Promise<User>;
  register: (name: string, phone: string, password: string, role?: string) => Promise<User>;
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
    return response.user;
  },

  register: async (name: string, phone: string, password: string, role: string = 'customer') => {
    const response = await authAPI.register(name, phone, password, role);
    set({ user: response.user, isAuthenticated: true });
    return response.user;
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
