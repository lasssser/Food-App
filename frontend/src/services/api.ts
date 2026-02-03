import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('token');
    }
    return await SecureStore.getItemAsync('token');
  } catch {
    return null;
  }
};

const setToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
    } else {
      await SecureStore.setItemAsync('token', token);
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

const removeToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
    } else {
      await SecureStore.deleteItemAsync('token');
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Add auth header to requests
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Functions
export const authAPI = {
  register: async (name: string, phone: string, password: string, role: string = 'customer') => {
    const response = await api.post('/auth/register', { name, phone, password, role });
    await setToken(response.data.access_token);
    return response.data;
  },
  login: async (phone: string, password: string) => {
    const response = await api.post('/auth/login', { phone, password });
    await setToken(response.data.access_token);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    await removeToken();
  },
  getToken,
};

export const restaurantAPI = {
  getAll: async (filters?: { area?: string; cuisine?: string; is_open?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.area) params.append('area', filters.area);
    if (filters?.cuisine) params.append('cuisine', filters.cuisine);
    if (filters?.is_open !== undefined) params.append('is_open', String(filters.is_open));
    const response = await api.get(`/restaurants?${params.toString()}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  },
  getMenu: async (restaurantId: string, category?: string) => {
    const params = category ? `?category=${category}` : '';
    const response = await api.get(`/restaurants/${restaurantId}/menu${params}`);
    return response.data;
  },
  getMenuItemAddOns: async (restaurantId: string, menuItemId: string) => {
    const response = await api.get(`/restaurants/${restaurantId}/menu/${menuItemId}/addons`);
    return response.data;
  },
};

export const addressAPI = {
  getAll: async () => {
    const response = await api.get('/addresses');
    return response.data;
  },
  create: async (data: { label: string; address_line: string; area?: string }) => {
    const response = await api.post('/addresses', data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/addresses/${id}`);
    return response.data;
  },
};

export const orderAPI = {
  create: async (data: {
    restaurant_id: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
    address_id: string;
    payment_method: string;
    notes?: string;
  }) => {
    const response = await api.post('/orders', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  cancel: async (id: string) => {
    const response = await api.post(`/orders/${id}/cancel`);
    return response.data;
  },
};

export const paymentAPI = {
  verifyPayment: async (data: { order_id: string; reference: string; screenshot_base64?: string }) => {
    const response = await api.post('/payments/verify', data);
    return response.data;
  },
  getShamCashInfo: async () => {
    const response = await api.get('/payments/shamcash-info');
    return response.data;
  },
};

export const ratingAPI = {
  create: async (data: { order_id: string; restaurant_rating: number; driver_rating?: number; comment?: string }) => {
    const response = await api.post('/ratings', data);
    return response.data;
  },
};

// Restaurant Panel API
export const restaurantPanelAPI = {
  getOrders: async () => {
    const response = await api.get('/restaurant/orders');
    return response.data;
  },
  getOrderHistory: async () => {
    const response = await api.get('/restaurant/orders/history');
    return response.data;
  },
  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await api.put(`/restaurant/orders/${orderId}/status`, { status });
    return response.data;
  },
  toggleStatus: async () => {
    const response = await api.put('/restaurant/toggle-status');
    return response.data;
  },
  getMenu: async () => {
    const response = await api.get('/restaurant/menu');
    return response.data;
  },
  addMenuItem: async (data: { name: string; description?: string; price: number; category: string; image?: string }) => {
    const response = await api.post('/restaurant/menu', data);
    return response.data;
  },
  updateMenuItem: async (itemId: string, data: { name?: string; description?: string; price?: number; is_available?: boolean }) => {
    const response = await api.put(`/restaurant/menu/${itemId}`, data);
    return response.data;
  },
  deleteMenuItem: async (itemId: string) => {
    const response = await api.delete(`/restaurant/menu/${itemId}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/restaurant/stats');
    return response.data;
  },
  // Add-ons management
  getMenuItemAddOns: async (itemId: string) => {
    const response = await api.get(`/restaurant/menu/${itemId}/addons`);
    return response.data;
  },
  createAddOnGroup: async (itemId: string, data: { name: string; is_required: boolean; max_selections: number; options: { name: string; price: number }[] }) => {
    const response = await api.post(`/restaurant/menu/${itemId}/addons`, data);
    return response.data;
  },
  updateAddOnGroup: async (groupId: string, data: { name: string; is_required: boolean; max_selections: number; options: { name: string; price: number }[] }) => {
    const response = await api.put(`/restaurant/addons/${groupId}`, data);
    return response.data;
  },
  deleteAddOnGroup: async (groupId: string) => {
    const response = await api.delete(`/restaurant/addons/${groupId}`);
    return response.data;
  },
};

// Driver API
export const driverAPI = {
  updateStatus: async (isOnline: boolean) => {
    const response = await api.put('/driver/status', { is_online: isOnline });
    return response.data;
  },
  updateLocation: async (lat: number, lng: number) => {
    const response = await api.put('/driver/location', { lat, lng });
    return response.data;
  },
  getAvailableOrders: async () => {
    const response = await api.get('/driver/available-orders');
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/driver/my-orders');
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/driver/history');
    return response.data;
  },
  acceptOrder: async (orderId: string) => {
    const response = await api.post(`/driver/accept-order/${orderId}`);
    return response.data;
  },
  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await api.put(`/driver/orders/${orderId}/status`, { status });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/driver/stats');
    return response.data;
  },
};

// Notifications API
export const notificationAPI = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },
};

export const seedAPI = {
  seed: async () => {
    const response = await api.post('/seed');
    return response.data;
  },
};

export default api;
