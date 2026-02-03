import { create } from 'zustand';
import { CartItem, MenuItem, Restaurant, SelectedAddOn } from '../types';

interface CartState {
  items: CartItem[];
  restaurant: Restaurant | null;
  addItem: (menuItem: MenuItem, restaurant: Restaurant, selectedAddOns?: SelectedAddOn[]) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

// Generate unique key for cart items based on menu item ID and add-ons
const generateItemKey = (menuItemId: string, selectedAddOns?: SelectedAddOn[]): string => {
  if (!selectedAddOns || selectedAddOns.length === 0) {
    return menuItemId;
  }
  const addOnKey = selectedAddOns
    .map(a => `${a.group_name}:${a.option_name}`)
    .sort()
    .join('|');
  return `${menuItemId}_${addOnKey}`;
};

// Calculate item total including add-ons
const calculateItemTotal = (item: CartItem): number => {
  const addOnsTotal = item.selectedAddOns?.reduce((sum, addon) => sum + addon.price, 0) || 0;
  return (item.menuItem.price + addOnsTotal) * item.quantity;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurant: null,

  addItem: (menuItem: MenuItem, restaurant: Restaurant, selectedAddOns?: SelectedAddOn[]) => {
    const { items, restaurant: currentRestaurant } = get();
    const itemKey = generateItemKey(menuItem.id, selectedAddOns);
    
    // If cart has items from different restaurant, clear it
    if (currentRestaurant && currentRestaurant.id !== restaurant.id) {
      set({ 
        items: [{ menuItem, quantity: 1, selectedAddOns, itemKey }], 
        restaurant 
      });
      return;
    }
    
    const existingItem = items.find(item => item.itemKey === itemKey);
    if (existingItem) {
      set({
        items: items.map(item =>
          item.itemKey === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
        restaurant,
      });
    } else {
      set({ 
        items: [...items, { menuItem, quantity: 1, selectedAddOns, itemKey }], 
        restaurant 
      });
    }
  },

  removeItem: (itemKey: string) => {
    const { items } = get();
    const newItems = items.filter(item => item.itemKey !== itemKey);
    if (newItems.length === 0) {
      set({ items: [], restaurant: null });
    } else {
      set({ items: newItems });
    }
  },

  updateQuantity: (itemKey: string, quantity: number) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(itemKey);
      return;
    }
    set({
      items: items.map(item =>
        item.itemKey === itemKey
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
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
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
