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

export default function AvailableOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await driverAPI.getAvailableOrders();
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
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await driverAPI.acceptOrder(orderId);
      Alert.alert('تم', 'تم قبول الطلب');
      fetchOrders();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل قبول الطلب');
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Ionicons name="restaurant" size={20} color="#FF6B35" />
          <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
        </View>
        <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
      </View>

      <View style={styles.addressSection}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={18} color="#666" />
          <Text style={styles.addressText}>
            {order.address.label} - {order.address.address_line}
          </Text>
        </View>
      </View>

      <View style={styles.itemsPreview}>
        <Text style={styles.itemsCount}>
          {order.items.length} صنف • {order.items.reduce((sum, i) => sum + i.quantity, 0)} قطعة
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptOrder(order.id)}
        >
          <Text style={styles.acceptButtonText}>قبول الطلب</Text>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <Text style={styles.totalValue}>{order.total.toLocaleString()} ل.س</Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>طلبات متاحة للتوصيل</Text>
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
            <Text style={styles.emptyText}>لا توجد طلبات متاحة حالياً</Text>
            <Text style={styles.emptySubtext}>تأكد من أنك متصل</Text>
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
  orderId: {
    fontSize: 12,
    color: '#999',
  },
  addressSection: {
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
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  itemsPreview: {
    marginBottom: 12,
  },
  itemsCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  acceptButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#66BB6A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonText: {
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
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
});
