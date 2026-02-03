import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';

interface Props {
  onPress: () => void;
}

export const CartButton: React.FC<Props> = ({ onPress }) => {
  const { items, getTotal, getItemCount, restaurant } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  if (items.length === 0) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{itemCount}</Text>
          </View>
          <Ionicons name="cart" size={24} color="#fff" />
        </View>
        
        <View style={styles.center}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <Text style={styles.viewCart}>عرض السلة</Text>
        </View>
        
        <Text style={styles.total}>{total.toLocaleString()} ل.س</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  left: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  center: {
    flex: 1,
    marginHorizontal: 12,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  viewCart: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
