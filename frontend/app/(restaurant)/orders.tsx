import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { Order } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface RestaurantDriver {
  id: string;
  name: string;
  phone: string;
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: string }> = {
  pending: { next: 'accepted', label: 'قبول الطلب', icon: 'checkmark-circle' },
  accepted: { next: 'preparing', label: 'بدء التحضير', icon: 'flame' },
  preparing: { next: 'ready', label: 'جاهز للتوصيل', icon: 'bicycle' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'جديد', color: '#FFA726', icon: 'time' },
  accepted: { label: 'مقبول', color: '#42A5F5', icon: 'checkmark' },
  preparing: { label: 'جاري التحضير', color: '#AB47BC', icon: 'flame' },
  ready: { label: 'جاهز للاستلام', color: '#26A69A', icon: 'bag-check' },
  driver_assigned: { label: 'تم تعيين سائق', color: '#5C6BC0', icon: 'bicycle' },
  picked_up: { label: 'استلمها السائق', color: '#7E57C2', icon: 'navigate' },
  out_for_delivery: { label: 'في الطريق', color: '#26A69A', icon: 'car' },
  delivered: { label: 'تم التسليم', color: '#66BB6A', icon: 'checkmark-done' },
  cancelled: { label: 'ملغي', color: '#EF5350', icon: 'close' },
};

export default function RestaurantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<RestaurantDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

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

  const fetchDrivers = async () => {
    try {
      const data = await restaurantPanelAPI.getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      fetchDrivers();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchDrivers();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await restaurantPanelAPI.updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
    }
  };

  const openAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedOrder) return;
    
    setAssigning(true);
    try {
      await restaurantPanelAPI.assignDriver(selectedOrder.id, {
        driver_type: 'restaurant_driver',
        driver_id: driverId,
      });
      setShowAssignModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Error assigning driver:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRequestPlatformDrivers = async () => {
    if (!selectedOrder) return;
    
    setAssigning(true);
    try {
      await restaurantPanelAPI.assignDriver(selectedOrder.id, {
        driver_type: 'platform_driver',
      });
      setShowAssignModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Error requesting drivers:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await restaurantPanelAPI.updateOrderStatus(orderToCancel, 'cancelled');
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setConfirmCancelVisible(false);
      setOrderToCancel(null);
    }
  };

  const callNumber = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_LABELS[order.order_status] || { label: order.order_status, color: '#999', icon: 'help' };
    const action = STATUS_ACTIONS[order.order_status];
    const showAssignButton = order.order_status === 'ready' && !order.driver_id;
    const hasDriver = order.driver_id && order.driver_name;

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={14} color={COLORS.textWhite} />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
        </View>

        {/* Driver Info */}
        {hasDriver && (
          <View style={styles.driverSection}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Ionicons name="bicycle" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{order.driver_name}</Text>
                <Text style={styles.driverType}>
                  {order.driver_type === 'restaurant_driver' ? 'سائق المطعم' : 'سائق المنصة'}
                </Text>
              </View>
            </View>
            {order.driver_phone && (
              <TouchableOpacity 
                style={styles.callDriverButton}
                onPress={() => callNumber(order.driver_phone!)}
              >
                <Ionicons name="call" size={18} color={COLORS.success} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Customer Address */}
        <View style={styles.addressSection}>
          <Ionicons name="location" size={16} color={COLORS.textSecondary} />
          <Text style={styles.addressText}>
            {order.address?.label} - {order.address?.address_line}
          </Text>
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

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>{order.total.toLocaleString()} ل.س</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpdateStatus(order.id, action.next)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.actionButtonGradient}
              >
                <Ionicons name={action.icon as any} size={18} color={COLORS.textWhite} />
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {showAssignButton && (
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => openAssignModal(order)}
            >
              <Ionicons name="bicycle" size={18} color={COLORS.info} />
              <Text style={styles.assignButtonText}>تعيين سائق</Text>
            </TouchableOpacity>
          )}
          
          {['pending', 'accepted'].includes(order.order_status) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setOrderToCancel(order.id);
                setConfirmCancelVisible(true);
              }}
            >
              <Ionicons name="close" size={20} color={COLORS.error} />
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>الطلبات الحالية</Text>
        <Text style={styles.headerSubtitle}>{orders.length} طلبات نشطة</Text>
      </LinearGradient>

      {/* Orders List */}
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color={COLORS.textLight} />
          <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}

      {/* Assign Driver Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تعيين سائق</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              {/* Restaurant Drivers */}
              <Text style={styles.sectionTitle}>سائقي المطعم</Text>
              {drivers.length === 0 ? (
                <Text style={styles.noDriversText}>لم تضف سائقين بعد</Text>
              ) : (
                drivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.id}
                    style={styles.driverOption}
                    onPress={() => handleAssignDriver(driver.id)}
                    disabled={assigning}
                  >
                    <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
                    <View style={styles.driverOptionInfo}>
                      <Text style={styles.driverOptionName}>{driver.name}</Text>
                      <Text style={styles.driverOptionPhone}>{driver.phone}</Text>
                    </View>
                    <View style={styles.driverOptionAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.primary} />
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Platform Drivers */}
              <TouchableOpacity
                style={styles.platformButton}
                onPress={handleRequestPlatformDrivers}
                disabled={assigning}
              >
                {assigning ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <>
                    <Ionicons name="globe-outline" size={22} color={COLORS.textWhite} />
                    <Text style={styles.platformButtonText}>اطلب سائق من المنصة</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.platformHint}>
                سيتم إشعار السائقين القريبين وأول من يقبل يأخذ الطلب
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={confirmCancelVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons name="warning-outline" size={50} color={COLORS.warning} />
            <Text style={styles.confirmTitle}>تأكيد الإلغاء</Text>
            <Text style={styles.confirmMessage}>هل تريد إلغاء هذا الطلب؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.keepButton]}
                onPress={() => setConfirmCancelVisible(false)}
              >
                <Text style={styles.keepButtonText}>لا، إبقاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelOrderButton]}
                onPress={handleCancelOrder}
              >
                <Text style={styles.cancelOrderButtonText}>نعم، إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textLight,
    marginTop: SPACING.lg,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orderId: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  driverSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.success}10`,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  driverInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  driverType: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  callDriverButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  actionButtonText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 14,
  },
  assignButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.info}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  assignButtonText: {
    color: COLORS.info,
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    padding: SPACING.sm,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  noDriversText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  driverOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  driverOptionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  driverOptionInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  driverOptionPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  platformButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.info,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  platformButtonText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 16,
  },
  platformHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  // Confirm Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  confirmContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  keepButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keepButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  cancelOrderButton: {
    backgroundColor: COLORS.error,
  },
  cancelOrderButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
});
