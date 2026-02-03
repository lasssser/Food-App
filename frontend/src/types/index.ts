// Types for Yalla Nakol App

export interface User {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  image?: string;
  address: string;
  area: string;
  cuisine_type: string;
  rating: number;
  review_count: number;
  is_open: boolean;
  delivery_fee: number;
  min_order: number;
  delivery_time: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  name_en?: string;
  description?: string;
  price: number;
  image?: string;
  category: string;
  is_available: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line: string;
  area?: string;
  lat?: number;
  lng?: number;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  subtotal: number;
}

export interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'COD' | 'SHAMCASH';
  payment_status: string;
  order_status: string;
  address: {
    label: string;
    address_line: string;
    area?: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}
