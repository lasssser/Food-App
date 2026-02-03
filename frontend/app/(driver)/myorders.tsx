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
import { driverAPI } from '../../src/services/api';
import { Order } from '../../src/types';

const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string }> = {
  assigned: { next: 'picked_up', label: 'تم الاستلام', color: '#2196F3' },
  picked_up: { next: 'out_for_delivery', label: 'بدء التوصيل', color: '#FF9800' },
  out_for_delivery: { next: 'delivered', label: 'تم التسليم', color: '#66BB6A' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  assigned: { label: 'معيّن', color: '#42A5F5' },
  picked_up: { label: 'مستلم', color: '#FF9800' },
  out_for_delivery: { label: 'جاري التوصيل', color: '#5C6BC0' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await driverAPI.getMyOrders();
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
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await driverAPI.updateOrderStatus(orderId, newStatus);
      if (newStatus === 'delivered') {
        Alert.alert('تم', 'شكراً لك! تم تسليم الطلب بنجاح');
      }
      fetchOrders();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل تحديث الحالة');
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_LABELS[order.order_status] || { label: order.order_status, color: '#999' };
    const action = STATUS_ACTIONS[order.order_status];

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <View style={styles.restaurantInfo}>
            <Ionicons name="restaurant" size={18} color="#FF6B35" />
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
          </View>
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>عنوان التوصيل:</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={18} color="#666" />
            <Text style={styles.addressText}>
              {order.address.label} - {order.address.address_line}
            </Text>
          </View>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>الأصناف:</Text>
          {order.items.map((item, index) => (
            <Text key={index} style={styles.itemText}>
              {item.quantity}x {item.name}
            </Text>
          ))}
        </View>

        <View style={styles.paymentRow}>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentText}>
              {order.payment_method === 'COD' ? 'كاش عند الاستلام' : 'ShamCash'}
            </Text>
          </View>
          <Text style={styles.totalValue}>{order.total.toLocaleString()} ل.س</Text>
        </View>

        {action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={() => handleUpdateStatus(order.id, action.next)}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        )}
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
        <Text style={styles.headerTitle}>توصيلاتي الحالية</Text>
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
            <Ionicons name="bicycle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد توصيلات حالياً</Text>
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
    marginBottom: 16,
  },
  restaurantInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  addressSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  itemsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
