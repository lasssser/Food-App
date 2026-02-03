import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { restaurantPanelAPI } from '../../src/services/api';
import { Order } from '../../src/types';

const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string }> = {
  pending: { next: 'accepted', label: 'قبول', color: '#4CAF50' },
  accepted: { next: 'preparing', label: 'بدء التحضير', color: '#2196F3' },
  preparing: { next: 'ready', label: 'جاهز للتوصيل', color: '#FF9800' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'جديد', color: '#FFA726' },
  accepted: { label: 'مقبول', color: '#42A5F5' },
  preparing: { label: 'جاري التحضير', color: '#AB47BC' },
  ready: { label: 'جاهز', color: '#26A69A' },
};

export default function RestaurantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await restaurantPanelAPI.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await restaurantPanelAPI.updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل تحديث الحالة');
    }
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert('تأكيد الإلغاء', 'هل تريد إلغاء هذا الطلب؟', [
      { text: 'لا', style: 'cancel' },
      {
        text: 'إلغاء',
        style: 'destructive',
        onPress: () => handleUpdateStatus(orderId, 'cancelled'),
      },
    ]);
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_LABELS[order.order_status] || { label: order.order_status, color: '#999' };
    const action = STATUS_ACTIONS[order.order_status];

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.addressText}>
              {order.address.label} - {order.address.address_line}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemPrice}>{item.subtotal.toLocaleString()} ل.س</Text>
              <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>ملاحظات:</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalValue}>{order.total.toLocaleString()} ل.س</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentRow}>
          <Text style={styles.paymentMethod}>
            {order.payment_method === 'COD' ? 'كاش' : 'ShamCash'}
          </Text>
          <Ionicons
            name={order.payment_method === 'COD' ? 'cash' : 'wallet'}
            size={18}
            color="#666"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {action && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => handleUpdateStatus(order.id, action.next)}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          )}
          
          {['pending', 'accepted'].includes(order.order_status) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(order.id)}
            >
              <Ionicons name="close" size={20} color="#EF5350" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الطلبات الحالية</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  customerInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  notesSection: {
    backgroundColor: '#FFF9C4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  totalSection: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
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
  paymentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF5350',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
