import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    restaurant,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const subtotal = getSubtotal();
  const deliveryFee = restaurant?.delivery_fee || 0;
  const total = getTotal();

  const handleCheckout = () => {
    if (!restaurant) return;
    
    if (subtotal < restaurant.min_order) {
      Alert.alert(
        'الحد الأدنى',
        `الحد الأدنى للطلب من ${restaurant.name} هو ${restaurant.min_order.toLocaleString()} ل.س`
      );
      return;
    }
    
    router.push('/(main)/checkout' as any);
  };

  const handleClearCart = () => {
    Alert.alert('تأكيد', 'هل تريد إفراغ السلة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إفراغ', style: 'destructive', onPress: clearCart },
    ]);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>سلة الطلب</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>سلتك فارغة</Text>
          <Text style={styles.emptySubtext}>أضف أصنافاً من المطاعم لبدء الطلب</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(main)/home')}
          >
            <Text style={styles.browseButtonText}>تصفح المطاعم</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearButton}>إفراغ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سلة الطلب</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Restaurant Info */}
      <View style={styles.restaurantBar}>
        <Text style={styles.restaurantName}>{restaurant?.name}</Text>
        <Ionicons name="restaurant" size={20} color="#FF6B35" />
      </View>

      {/* Cart Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItem.id}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.menuItem.name}</Text>
              <Text style={styles.itemPrice}>
                {(item.menuItem.price * item.quantity).toLocaleString()} ل.س
              </Text>
            </View>
            
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => {
                  if (item.quantity > 1) {
                    updateQuantity(item.menuItem.id, item.quantity - 1);
                  } else {
                    removeItem(item.menuItem.id);
                  }
                }}
              >
                <Ionicons
                  name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                  size={18}
                  color="#FF6B35"
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
              >
                <Ionicons name="add" size={18} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{subtotal.toLocaleString()} ل.س</Text>
          <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{deliveryFee.toLocaleString()} ل.س</Text>
          <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalValue}>{total.toLocaleString()} ل.س</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>

        {restaurant && subtotal < restaurant.min_order && (
          <Text style={styles.minOrderWarning}>
            الحد الأدنى للطلب: {restaurant.min_order.toLocaleString()} ل.س
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            restaurant && subtotal < restaurant.min_order && styles.checkoutButtonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={restaurant && subtotal < restaurant.min_order}
        >
          <Text style={styles.checkoutButtonText}>إتمام الطلب</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF6B35',
  },
  restaurantBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF5F2',
    gap: 8,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF6B35',
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  minOrderWarning: {
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
