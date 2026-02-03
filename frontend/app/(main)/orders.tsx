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
import { orderAPI, ratingAPI } from '../../src/services/api';
import { Order } from '../../src/types';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'بانتظار القبول', color: '#FFA726', icon: 'time' },
  accepted: { label: 'تم القبول', color: '#42A5F5', icon: 'checkmark-circle' },
  preparing: { label: 'جاري التحضير', color: '#AB47BC', icon: 'restaurant' },
  ready: { label: 'جاهز للتوصيل', color: '#26A69A', icon: 'bag-check' },
  out_for_delivery: { label: 'جاري التوصيل', color: '#5C6BC0', icon: 'bicycle' },
  delivered: { label: 'تم التسليم', color: '#66BB6A', icon: 'checkmark-done-circle' },
  cancelled: { label: 'ملغي', color: '#EF5350', icon: 'close-circle' },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'غير مدفوع',
  cod: 'الدفع عند الاستلام',
  pending: 'بانتظار التحقق',
  pending_verification: 'بانتظار التحقق',
  paid: 'مدفوع',
  failed: 'فشل',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getAll();
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

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert('تأكيد الإلغاء', 'هل تريد إلغاء هذا الطلب؟', [
      { text: 'لا', style: 'cancel' },
      {
        text: 'نعم، إلغاء',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderAPI.cancel(orderId);
            fetchOrders();
            Alert.alert('تم', 'تم إلغاء الطلب');
          } catch (error: any) {
            Alert.alert('خطأ', error.response?.data?.detail || 'فشل إلغاء الطلب');
          }
        },
      },
    ]);
  };

  const handleRateOrder = async (order: Order, rating: number) => {
    try {
      await ratingAPI.create({
        order_id: order.id,
        restaurant_rating: rating,
      });
      Alert.alert('شكراً', 'تم إرسال تقييمك');
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال التقييم');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_LABELS[order.order_status] || STATUS_LABELS.pending;
    const isExpanded = expandedOrder === order.id;
    const canCancel = ['pending', 'accepted'].includes(order.order_status);
    const canRate = order.order_status === 'delivered';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setExpandedOrder(isExpanded ? null : order.id)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={14} color="#fff" />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.totalText}>{order.total.toLocaleString()} ل.س</Text>
          <Text style={styles.itemsCount}>
            {order.items.length} صنف • {order.payment_method === 'COD' ? 'كاش' : 'ShamCash'}
          </Text>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>الأصناف:</Text>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemPrice}>{item.subtotal.toLocaleString()} ل.س</Text>
                  <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                </View>
              ))}
            </View>

            {/* Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>عنوان التوصيل:</Text>
              <Text style={styles.addressText}>
                {order.address.label} - {order.address.address_line}
              </Text>
            </View>

            {/* Payment Status */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>حالة الدفع:</Text>
              <Text style={styles.paymentStatus}>
                {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
              {canCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelOrder(order.id)}
                >
                  <Ionicons name="close-circle" size={18} color="#EF5350" />
                  <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
                </TouchableOpacity>
              )}

              {canRate && (
                <View style={styles.ratingSection}>
                  <Text style={styles.rateLabel}>قيّم المطعم:</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => handleRateOrder(order, star)}
                      >
                        <Ionicons name="star" size={28} color="#FFD700" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Expand Icon */}
        <View style={styles.expandIcon}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#999"
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>طلباتي</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>طلباتي</Text>
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
            <Ionicons name="receipt-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
            <Text style={styles.emptySubtext}>ابدأ بطلب طعامك المفضل!</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  orderSummary: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  itemsCount: {
    fontSize: 13,
    color: '#666',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  itemsSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#333',
  },
  addressSection: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  paymentSection: {
    marginBottom: 12,
  },
  paymentStatus: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  actionsSection: {
    marginTop: 8,
  },
  cancelButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EF5350',
    borderRadius: 8,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#EF5350',
    fontWeight: '600',
  },
  ratingSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  rateLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  expandIcon: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
});
