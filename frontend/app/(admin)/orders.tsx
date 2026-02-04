import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../src/services/api';

type OrderStatus = 'all' | 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_name?: string;
  restaurant_id: string;
  restaurant_name?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fef3c7' },
  confirmed: { label: 'مؤكد', color: '#3b82f6', bg: '#dbeafe' },
  preparing: { label: 'قيد التحضير', color: '#8b5cf6', bg: '#ede9fe' },
  ready: { label: 'جاهز', color: '#06b6d4', bg: '#cffafe' },
  driver_assigned: { label: 'تم تعيين سائق', color: '#6366f1', bg: '#e0e7ff' },
  picked_up: { label: 'تم الاستلام', color: '#ec4899', bg: '#fce7f3' },
  delivering: { label: 'قيد التوصيل', color: '#f97316', bg: '#ffedd5' },
  delivered: { label: 'تم التسليم', color: '#22c55e', bg: '#dcfce7' },
  cancelled: { label: 'ملغي', color: '#ef4444', bg: '#fee2e2' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const status = selectedStatus === 'all' ? undefined : selectedStatus;
      const data = await adminAPI.getOrders(status);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [selectedStatus]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SY') + ' ل.س';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY') + ' ' + date.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusConfig = getStatusConfig(item.status);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(item);
          setShowOrderModal(true);
        }}
      >
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{item.restaurant_name || 'مطعم'}</Text>
            <Ionicons name="restaurant" size={16} color="#6b7280" />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{item.user_name || 'عميل'}</Text>
            <Ionicons name="person" size={16} color="#6b7280" />
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          <Text style={styles.orderTotal}>{formatCurrency(item.total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatusFilter = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={['all', 'pending', 'preparing', 'delivering', 'delivered', 'cancelled'] as OrderStatus[]}
      contentContainerStyle={styles.filterContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedStatus === item && styles.filterButtonActive,
          ]}
          onPress={() => {
            setSelectedStatus(item);
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.filterText,
              selectedStatus === item && styles.filterTextActive,
            ]}
          >
            {item === 'all' ? 'الكل' : (STATUS_CONFIG[item]?.label || item)}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>إدارة الطلبات</Text>
        <Text style={styles.headerSubtitle}>{orders.length} طلب</Text>
      </LinearGradient>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>لا يوجد طلبات</Text>
            </View>
          }
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedOrder && (
              <FlatList
                data={[selectedOrder]}
                renderItem={() => (
                  <View style={styles.modalBody}>
                    <View style={styles.orderNumberContainer}>
                      <Text style={styles.modalOrderNumber}>#{selectedOrder.order_number}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(selectedOrder.status).bg }]}>
                        <Text style={[styles.statusText, { color: getStatusConfig(selectedOrder.status).color }]}>
                          {getStatusConfig(selectedOrder.status).label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>معلومات الطلب</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{selectedOrder.restaurant_name || 'مطعم'}</Text>
                        <Text style={styles.detailLabel}>المطعم</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{selectedOrder.user_name || 'عميل'}</Text>
                        <Text style={styles.detailLabel}>العميل</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>
                          {selectedOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'ShamCash'}
                        </Text>
                        <Text style={styles.detailLabel}>طريقة الدفع</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{formatDate(selectedOrder.created_at)}</Text>
                        <Text style={styles.detailLabel}>التاريخ</Text>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>المنتجات</Text>
                      {selectedOrder.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                          <Text style={styles.itemName}>
                            {item.name} × {item.quantity}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.totalSection}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalValue}>{formatCurrency(selectedOrder.subtotal)}</Text>
                        <Text style={styles.totalLabel}>المجموع الفرعي</Text>
                      </View>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalValue}>{formatCurrency(selectedOrder.delivery_fee)}</Text>
                        <Text style={styles.totalLabel}>رسوم التوصيل</Text>
                      </View>
                      <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalValue}>{formatCurrency(selectedOrder.total)}</Text>
                        <Text style={styles.grandTotalLabel}>الإجمالي</Text>
                      </View>
                    </View>
                  </View>
                )}
                keyExtractor={() => 'order'}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  orderInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'System',
    marginRight: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'System',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'System',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontFamily: 'System',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  modalBody: {
    padding: 20,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalOrderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'System',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
  },
  totalSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  totalValue: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'System',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'System',
  },
});
