import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  register: async (name: string, phone: string, password: string, role: string = 'customer', city_id?: string) => {
    const response = await api.post('/auth/register', { name, phone, password, role, city_id });
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
    try {
      await api.post('/auth/logout');
    } catch {}
    await removeToken();
  },
  getToken,
};

// Location & Cities API
export const locationAPI = {
  getCities: async () => {
    const response = await api.get('/cities');
    return response.data;
  },
  getCity: async (cityId: string) => {
    const response = await api.get(`/cities/${cityId}`);
    return response.data;
  },
  detectCity: async (lat: number, lng: number) => {
    const response = await api.get(`/cities/detect?lat=${lat}&lng=${lng}`);
    return response.data;
  },
  updateUserLocation: async (cityId: string, districtId?: string, lat?: number, lng?: number) => {
    const response = await api.put('/users/location', {
      city_id: cityId,
      district_id: districtId,
      lat,
      lng,
    });
    return response.data;
  },
  getUserLocation: async () => {
    const response = await api.get('/users/location');
    return response.data;
  },
};

export const restaurantAPI = {
  getAll: async (filters?: { city_id?: string; area?: string; cuisine?: string; is_open?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.city_id) params.append('city_id', filters.city_id);
    if (filters?.area) params.append('area', filters.area);
    if (filters?.cuisine) params.append('cuisine', filters.cuisine);
    if (filters?.is_open !== undefined) params.append('is_open', String(filters.is_open));
    if (filters?.search) params.append('search', filters.search);
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
  getPaymentMethods: async (restaurantId: string) => {
    const response = await api.get(`/restaurants/${restaurantId}/payment-methods`);
    return response.data;
  },
  getNearby: async (lat: number, lng: number, radius: number = 50) => {
    const response = await api.get(`/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
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

export const customerAPI = {
  getVerificationStatus: async () => {
    const response = await api.get('/customer/verification-status');
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
  getDriverLocation: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}/driver-location`);
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

// Ratings API
export const ratingAPI = {
  create: async (data: { order_id: string; restaurant_rating: number; driver_rating?: number; comment?: string }) => {
    const response = await api.post('/ratings', data);
    return response.data;
  },
  getRestaurantRatings: async (restaurantId: string, limit: number = 20) => {
    const response = await api.get(`/ratings/restaurant/${restaurantId}?limit=${limit}`);
    return response.data;
  },
  getMyRatings: async () => {
    const response = await api.get('/ratings/my-ratings');
    return response.data;
  },
  getOrderRating: async (orderId: string) => {
    const response = await api.get(`/ratings/order/${orderId}`);
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
  // Payment Methods Management
  getPaymentMethods: async () => {
    const response = await api.get('/restaurant/payment-methods');
    return response.data;
  },
  updatePaymentMethods: async (methods: any[]) => {
    const response = await api.put('/restaurant/payment-methods', { methods });
    return response.data;
  },
  confirmOrderPayment: async (orderId: string) => {
    const response = await api.put(`/restaurant/orders/${orderId}/confirm-payment`);
    return response.data;
  },
  rejectOrderPayment: async (orderId: string) => {
    const response = await api.put(`/restaurant/orders/${orderId}/reject-payment`);
    return response.data;
  },
  // Restaurant Drivers Management
  getDrivers: async () => {
    const response = await api.get('/restaurant/drivers');
    return response.data;
  },
  addDriver: async (data: { name: string; phone: string; notes?: string }) => {
    const response = await api.post('/restaurant/drivers', data);
    return response.data;
  },
  updateDriver: async (driverId: string, data: { name: string; phone: string; notes?: string }) => {
    const response = await api.put(`/restaurant/drivers/${driverId}`, data);
    return response.data;
  },
  deleteDriver: async (driverId: string) => {
    const response = await api.delete(`/restaurant/drivers/${driverId}`);
    return response.data;
  },
  // Platform Drivers
  getPlatformDrivers: async (sortBy: string = 'distance') => {
    const response = await api.get(`/restaurant/platform-drivers?sort_by=${sortBy}`);
    return response.data;
  },
  // Favorite Platform Drivers
  getFavoriteDrivers: async () => {
    const response = await api.get('/restaurant/favorite-drivers');
    return response.data;
  },
  addFavoriteDriver: async (driverId: string) => {
    const response = await api.post(`/restaurant/favorite-drivers/${driverId}`);
    return response.data;
  },
  removeFavoriteDriver: async (driverId: string) => {
    const response = await api.delete(`/restaurant/favorite-drivers/${driverId}`);
    return response.data;
  },
  updateDriverSearchSettings: async (searchRadius: number, cityId?: string) => {
    const params = new URLSearchParams();
    params.append('search_radius', searchRadius.toString());
    if (cityId) params.append('city_id', cityId);
    const response = await api.put(`/restaurant/driver-search-settings?${params.toString()}`);
    return response.data;
  },
  // Order Driver Assignment
  assignDriver: async (orderId: string, data: { driver_type: string; driver_id?: string }) => {
    const response = await api.post(`/restaurant/orders/${orderId}/assign-driver`, data);
    return response.data;
  },
  changeDriver: async (orderId: string) => {
    const response = await api.post(`/restaurant/orders/${orderId}/change-driver`);
    return response.data;
  },
  // Restaurant Complaints
  getRestaurantComplaints: async () => {
    const response = await api.get('/restaurant/complaints');
    return response.data;
  },
  respondToComplaint: async (complaintId: string, responseText: string, status: string = 'resolved') => {
    const response = await api.put(`/restaurant/complaints/${complaintId}/respond`, { response: responseText, status });
    return response.data;
  },
  // Restaurant Location
  updateLocation: async (lat: number, lng: number) => {
    const response = await api.put(`/restaurant/location?lat=${lat}&lng=${lng}`);
    return response.data;
  },
  // Reports
  getReports: async (period: string = 'week') => {
    const response = await api.get(`/restaurant/reports?period=${period}`);
    return response.data;
  },
  // Restaurant Info
  getRestaurantInfo: async () => {
    const response = await api.get('/restaurant/info');
    return response.data;
  },
  updateRestaurantInfo: async (data: any) => {
    const response = await api.put('/restaurant/info', data);
    return response.data;
  },
  toggleRestaurantStatus: async () => {
    const response = await api.put('/restaurant/toggle-status');
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
  updateCity: async (cityId: string) => {
    const response = await api.put('/driver/city', { city_id: cityId });
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
  // Push token management
  registerPushToken: async (pushToken: string, platform: string) => {
    const response = await api.post('/notifications/register-push-token', {
      push_token: pushToken,
      platform,
    });
    return response.data;
  },
  unregisterPushToken: async () => {
    const response = await api.delete('/notifications/push-token');
    return response.data;
  },
  testPushNotification: async () => {
    const response = await api.post('/notifications/test-push');
    return response.data;
  },
};

export const seedAPI = {
  seed: async () => {
    const response = await api.post('/seed');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  getUsers: async (role?: string, search?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },
  getUserDetails: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },
  updateUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.put(`/admin/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },
  updateUser: async (userId: string, name?: string, phone?: string) => {
    const response = await api.put(`/admin/users/${userId}`, { name, phone });
    return response.data;
  },
  resetUserPassword: async (userId: string, newPassword: string) => {
    const response = await api.put(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
    return response.data;
  },
  changeUserRole: async (userId: string, role: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  getComplaints: async (status?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const response = await api.get(`/admin/complaints?${params.toString()}`);
    return response.data;
  },
  getComplaintDetails: async (complaintId: string) => {
    const response = await api.get(`/admin/complaints/${complaintId}`);
    return response.data;
  },
  respondToComplaint: async (complaintId: string, response: string, status: string) => {
    const res = await api.put(`/admin/complaints/${complaintId}/respond`, { response, status });
    return res.data;
  },
  getOrders: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/admin/orders${params}`);
    return response.data;
  },
  deleteRestaurant: async (restaurantId: string) => {
    const response = await api.delete(`/admin/restaurants/${restaurantId}`);
    return response.data;
  },
};

// Complaints API (for all users)
export const complaintsAPI = {
  submit: async (subject: string, message: string, type: string = 'general', orderId?: string, restaurantId?: string) => {
    const data: any = {
      subject,
      message,
      type,
    };
    if (orderId) data.order_id = orderId;
    if (restaurantId) data.restaurant_id = restaurantId;
    const response = await api.post('/complaints', data);
    return response.data;
  },
  getMyComplaints: async () => {
    const response = await api.get('/complaints/my');
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  update: async (settings: { whatsapp_number?: string; support_email?: string; support_phone?: string }) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },
};

// Role Requests API
export const roleRequestsAPI = {
  create: async (data: {
    requested_role: string;
    full_name: string;
    phone: string;
    restaurant_name?: string;
    restaurant_address?: string;
    restaurant_area?: string;
    vehicle_type?: string;
    license_number?: string;
    notes?: string;
  }) => {
    const response = await api.post('/role-requests', data);
    return response.data;
  },
  getMyRequests: async () => {
    const response = await api.get('/role-requests/my');
    return response.data;
  },
};

// Admin Role Requests API
export const adminRoleRequestsAPI = {
  getAll: async (status?: string, skip: number = 0, limit: number = 50) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    const response = await api.get(`/admin/role-requests?${params.toString()}`);
    return response.data;
  },
  approve: async (requestId: string) => {
    const response = await api.put(`/admin/role-requests/${requestId}/approve`);
    return response.data;
  },
  reject: async (requestId: string) => {
    const response = await api.put(`/admin/role-requests/${requestId}/reject`);
    return response.data;
  },
};

// Advertisements API
export const advertisementsAPI = {
  getAll: async (activeOnly: boolean = true) => {
    const response = await api.get(`/advertisements?active_only=${activeOnly}`);
    return response.data;
  },
  create: async (data: {
    title: string;
    image_url: string;
    link_type?: string;
    link_value?: string;
    is_active?: boolean;
    order?: number;
  }) => {
    const response = await api.post('/admin/advertisements', data);
    return response.data;
  },
  update: async (adId: string, data: {
    title: string;
    image_url: string;
    link_type?: string;
    link_value?: string;
    is_active?: boolean;
    order?: number;
  }) => {
    const response = await api.put(`/admin/advertisements/${adId}`, data);
    return response.data;
  },
  delete: async (adId: string) => {
    const response = await api.delete(`/admin/advertisements/${adId}`);
    return response.data;
  },
};

// Admin Statistics API
export const adminStatisticsAPI = {
  getRestaurantStats: async () => {
    const response = await api.get('/admin/statistics/restaurants');
    return response.data;
  },
  getMonthlyStats: async (year?: number) => {
    const url = year ? `/admin/statistics/restaurants/monthly?year=${year}` : '/admin/statistics/restaurants/monthly';
    const response = await api.get(url);
    return response.data;
  },
  getOverview: async () => {
    const response = await api.get('/admin/statistics/overview');
    return response.data;
  },
  toggleFeatured: async (restaurantId: string, isFeatured: boolean) => {
    const response = await api.put(`/admin/restaurants/${restaurantId}/feature?is_featured=${isFeatured}`);
    return response.data;
  },
};

export default api;
