import { create } from 'zustand';
import { CartItem, MenuItem, Restaurant } from '../types';

interface CartState {
  items: CartItem[];
  restaurant: Restaurant | null;
  addItem: (menuItem: MenuItem, restaurant: Restaurant) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurant: null,

  addItem: (menuItem: MenuItem, restaurant: Restaurant) => {
    const { items, restaurant: currentRestaurant } = get();
    
    // If cart has items from different restaurant, clear it
    if (currentRestaurant && currentRestaurant.id !== restaurant.id) {
      set({ items: [{ menuItem, quantity: 1 }], restaurant });
      return;
    }
    
    const existingItem = items.find(item => item.menuItem.id === menuItem.id);
    if (existingItem) {
      set({
        items: items.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
        restaurant,
      });
    } else {
      set({ items: [...items, { menuItem, quantity: 1 }], restaurant });
    }
  },

  removeItem: (menuItemId: string) => {
    const { items } = get();
    const newItems = items.filter(item => item.menuItem.id !== menuItemId);
    if (newItems.length === 0) {
      set({ items: [], restaurant: null });
    } else {
      set({ items: newItems });
    }
  },

  updateQuantity: (menuItemId: string, quantity: number) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set({
      items: items.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      ),
    });
  },

  clearCart: () => {
    set({ items: [], restaurant: null });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  },

  getTotal: () => {
    const { restaurant } = get();
    const subtotal = get().getSubtotal();
    return subtotal + (restaurant?.delivery_fee || 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
