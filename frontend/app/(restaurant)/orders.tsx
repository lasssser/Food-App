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
  Vibration,
  ScrollView,
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
  notes?: string;
  is_active?: boolean;
}

interface PlatformDriver {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  total_deliveries: number;
  rating: number;
  current_orders: number;
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { next: 'accepted', label: 'قبول الطلب', icon: 'checkmark-circle' },
  accepted: { next: 'preparing', label: 'بدء التحضير', icon: 'flame' },
  preparing: { next: 'ready', label: 'جاهز للتوصيل', icon: 'bag-check' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; bgColor: string }> = {
  pending: { label: 'طلب جديد', color: '#FF9800', icon: 'time', bgColor: '#FFF3E0' },
  accepted: { label: 'مقبول', color: '#2196F3', icon: 'checkmark', bgColor: '#E3F2FD' },
  preparing: { label: 'جاري التحضير', color: '#9C27B0', icon: 'flame', bgColor: '#F3E5F5' },
  ready: { label: 'جاهز للاستلام', color: '#00BCD4', icon: 'bag-check', bgColor: '#E0F7FA' },
  driver_assigned: { label: 'تم تعيين سائق', color: '#3F51B5', icon: 'bicycle', bgColor: '#E8EAF6' },
  picked_up: { label: 'استلمها السائق', color: '#673AB7', icon: 'navigate', bgColor: '#EDE7F6' },
  out_for_delivery: { label: 'في الطريق', color: '#009688', icon: 'car', bgColor: '#E0F2F1' },
  delivered: { label: 'تم التسليم', color: '#4CAF50', icon: 'checkmark-done', bgColor: '#E8F5E9' },
  cancelled: { label: 'ملغي', color: '#F44336', icon: 'close', bgColor: '#FFEBEE' },
};

export default function RestaurantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<RestaurantDriver[]>([]);
  const [platformDrivers, setPlatformDrivers] = useState<PlatformDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await restaurantPanelAPI.getOrders();
      
      // Check for new orders and vibrate
      const newOrders = data.filter((o: Order) => o.order_status === 'pending');
      if (newOrders.length > previousOrderCount && previousOrderCount > 0) {
        Vibration.vibrate([0, 500, 200, 500]);
      }
      setPreviousOrderCount(newOrders.length);
      
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
      const [myDrivers, platformDriversData] = await Promise.all([
        restaurantPanelAPI.getDrivers(),
        restaurantPanelAPI.getPlatformDrivers(),
      ]);
      setDrivers(myDrivers);
      setPlatformDrivers(platformDriversData);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      fetchDrivers();
      const interval = setInterval(fetchOrders, 15000); // Every 15 seconds
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
    setSelectedDriverId(null);
    setShowAssignModal(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriverId) return;
    
    setAssigning(true);
    try {
      await restaurantPanelAPI.assignDriver(selectedOrder.id, {
        driver_type: 'restaurant_driver',
        driver_id: selectedDriverId,
      });
      
      // Get driver info to call them
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver) {
        // Show success and offer to call
        setShowAssignModal(false);
        setTimeout(() => {
          // Open WhatsApp with prepared message
          const formattedPhone = driver.phone.startsWith('0') ? `963${driver.phone.slice(1)}` : driver.phone;
          const message = `مرحباً ${driver.name}، لدينا طلب جديد جاهز للتوصيل!\n\n📍 العنوان: ${selectedOrder.address?.address_line}\n💰 المبلغ: ${selectedOrder.total.toLocaleString()} ل.س\n\nهل أنت متاح؟`;
          Linking.openURL(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`);
        }, 500);
      } else {
        setShowAssignModal(false);
      }
      
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

  const whatsappNumber = (phone: string, message?: string) => {
    const formattedPhone = phone.startsWith('0') ? `963${phone.slice(1)}` : phone;
    const url = message 
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${formattedPhone}`;
    Linking.openURL(url);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const pendingOrders = orders.filter(o => o.order_status === 'pending');
  const activeOrders = orders.filter(o => ['accepted', 'preparing', 'ready', 'driver_assigned', 'picked_up', 'out_for_delivery'].includes(o.order_status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.order_status));

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_CONFIG[order.order_status] || { label: order.order_status, color: '#999', icon: 'help-circle' as keyof typeof Ionicons.glyphMap, bgColor: '#F5F5F5' };
    const action = STATUS_ACTIONS[order.order_status];
    const showAssignButton = order.order_status === 'ready' && !order.driver_id;
    const hasDriver = order.driver_id && order.driver_name;
    const isExpanded = expandedOrder === order.id;
    const isPending = order.order_status === 'pending';

    return (
      <TouchableOpacity 
        style={[styles.orderCard, isPending && styles.pendingCard]}
        onPress={() => toggleExpand(order.id)}
        activeOpacity={0.8}
      >
        {/* New Order Indicator */}
        {isPending && (
          <View style={styles.newOrderBanner}>
            <Ionicons name="notifications" size={16} color={COLORS.textWhite} />
            <Text style={styles.newOrderText}>طلب جديد!</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderTime}>
              {new Date(order.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.quickInfoItem}>
            <Ionicons name="receipt" size={18} color={COLORS.textSecondary} />
            <Text style={styles.quickInfoText}>{order.items.length} أصناف</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Ionicons name="cash" size={18} color={COLORS.success} />
            <Text style={[styles.quickInfoText, styles.totalText]}>{order.total.toLocaleString()} ل.س</Text>
          </View>
          <View style={styles.quickInfoItem}>
            <Ionicons name={order.payment_method === 'COD' ? 'wallet' : 'card'} size={18} color={order.payment_method === 'COD' ? '#FF9800' : '#4CAF50'} />
            <Text style={styles.quickInfoText}>{order.payment_method === 'COD' ? 'كاش' : 'ShamCash'}</Text>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemPrice}>{(item.price * item.quantity).toLocaleString()} ل.س</Text>
                  <Text style={styles.itemName}>{item.quantity}× {item.name}</Text>
                </View>
              ))}
            </View>

            {/* Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
              <View style={styles.addressContent}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.addressText}>
                  {order.address?.label} - {order.address?.address_line}
                </Text>
              </View>
            </View>

            {/* Driver Info */}
            {hasDriver && (
              <View style={styles.driverSection}>
                <Text style={styles.sectionTitle}>السائق المعيّن</Text>
                <View style={styles.driverCard2}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{order.driver_name}</Text>
                      <Text style={styles.driverType}>
                        {order.driver_type === 'restaurant_driver' ? 'سائق المطعم' : 'سائق المنصة'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.driverActions}>
                    {order.driver_phone && (
                      <>
                        <TouchableOpacity 
                          style={[styles.driverBtn, styles.whatsappBtn]}
                          onPress={() => whatsappNumber(order.driver_phone!, `مرحباً، استفسار عن الطلب #${order.id.slice(0, 8)}`)}
                        >
                          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.driverBtn, styles.callBtn]}
                          onPress={() => callNumber(order.driver_phone!)}
                        >
                          <Ionicons name="call" size={20} color={COLORS.success} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Notes */}
            {order.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>ملاحظات العميل</Text>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {/* Assign Driver Button */}
          {showAssignButton && (
            <TouchableOpacity 
              style={styles.assignButton}
              onPress={() => openAssignModal(order)}
            >
              <LinearGradient
                colors={[COLORS.info, '#1976D2']}
                style={styles.assignButtonGradient}
              >
                <Ionicons name="bicycle" size={20} color={COLORS.textWhite} />
                <Text style={styles.assignButtonText}>تعيين سائق</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Status Action Button */}
          {action && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleUpdateStatus(order.id, action.next)}
            >
              <LinearGradient
                colors={isPending ? [COLORS.success, '#43A047'] : [COLORS.primary, COLORS.primaryDark]}
                style={styles.actionButtonGradient}
              >
                <Ionicons name={action.icon} size={20} color={COLORS.textWhite} />
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Cancel Button - only for pending */}
          {isPending && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setOrderToCancel(order.id);
                setConfirmCancelVisible(true);
              }}
            >
              <Text style={styles.cancelButtonText}>رفض</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expand Indicator */}
        <View style={styles.expandIndicator}>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.textLight} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>إدارة الطلبات</Text>
            <Text style={styles.headerSubtitle}>
              {pendingOrders.length > 0 ? `${pendingOrders.length} طلب جديد` : 'لا توجد طلبات جديدة'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingOrders.length}</Text>
            <Text style={styles.statLabel}>جديد</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeOrders.length}</Text>
            <Text style={styles.statLabel}>نشط</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedOrders.length}</Text>
            <Text style={styles.statLabel}>مكتمل</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={60} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
            <Text style={styles.emptySubtitle}>ستظهر الطلبات الجديدة هنا</Text>
          </View>
        }
      />

      {/* Assign Driver Modal - IMPROVED */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تعيين سائق للطلب</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedOrder && (
              <View style={styles.orderSummary}>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryValue}>#{selectedOrder.id.slice(0, 8)}</Text>
                  <Text style={styles.orderSummaryLabel}>رقم الطلب</Text>
                </View>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryValue}>{selectedOrder.total.toLocaleString()} ل.س</Text>
                  <Text style={styles.orderSummaryLabel}>المبلغ</Text>
                </View>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryValue} numberOfLines={1}>{selectedOrder.address?.address_line}</Text>
                  <Text style={styles.orderSummaryLabel}>العنوان</Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.driversSection}>
              {/* My Drivers Section */}
              <View style={styles.driverTypeSection}>
                <View style={styles.driverTypeHeader}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                  <Text style={styles.driverTypeTitle}>سائقين مطعمك</Text>
                </View>
                
                {drivers.length === 0 ? (
                  <View style={styles.noDrivers}>
                    <Text style={styles.noDriversText}>لم تضف سائقين بعد</Text>
                    <Text style={styles.noDriversHint}>أضف سائقين من صفحة "السائقين"</Text>
                  </View>
                ) : (
                  drivers.map((driver) => (
                    <TouchableOpacity
                      key={driver.id}
                      style={[
                        styles.driverSelectCard,
                        selectedDriverId === driver.id && styles.driverSelectCardActive
                      ]}
                      onPress={() => setSelectedDriverId(driver.id)}
                    >
                      <View style={styles.driverSelectInfo}>
                        <View style={[
                          styles.driverSelectAvatar,
                          selectedDriverId === driver.id && styles.driverSelectAvatarActive
                        ]}>
                          <Ionicons 
                            name="person" 
                            size={24} 
                            color={selectedDriverId === driver.id ? COLORS.textWhite : COLORS.primary} 
                          />
                        </View>
                        <View style={styles.driverSelectDetails}>
                          <Text style={styles.driverSelectName}>{driver.name}</Text>
                          <Text style={styles.driverSelectPhone}>{driver.phone}</Text>
                        </View>
                      </View>
                      {selectedDriverId === driver.id && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Platform Drivers Section */}
              <View style={styles.driverTypeSection}>
                <View style={styles.driverTypeHeader}>
                  <Ionicons name="globe" size={20} color={COLORS.info} />
                  <Text style={styles.driverTypeTitle}>سائقين المنصة</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.platformDriverOption}
                  onPress={handleRequestPlatformDrivers}
                  disabled={assigning}
                >
                  <View style={styles.platformDriverIcon}>
                    <Ionicons name="bicycle" size={30} color={COLORS.info} />
                  </View>
                  <View style={styles.platformDriverInfo}>
                    <Text style={styles.platformDriverTitle}>طلب سائق من المنصة</Text>
                    <Text style={styles.platformDriverDesc}>
                      سيتم إشعار السائقين المتاحين في منطقتك
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Assign Button */}
            {selectedDriverId && (
              <View style={styles.assignModalFooter}>
                <TouchableOpacity 
                  style={styles.confirmAssignButton}
                  onPress={handleAssignDriver}
                  disabled={assigning}
                >
                  <LinearGradient
                    colors={[COLORS.success, '#43A047']}
                    style={styles.confirmAssignGradient}
                  >
                    {assigning ? (
                      <ActivityIndicator color={COLORS.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={22} color={COLORS.textWhite} />
                        <Text style={styles.confirmAssignText}>تعيين والتواصل عبر واتساب</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={confirmCancelVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="close-circle" size={50} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>رفض الطلب</Text>
            <Text style={styles.confirmMessage}>هل أنت متأكد من رفض هذا الطلب؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.keepButton]}
                onPress={() => setConfirmCancelVisible(false)}
              >
                <Text style={styles.keepButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.rejectButton]}
                onPress={handleCancelOrder}
              >
                <Text style={styles.rejectButtonText}>رفض الطلب</Text>
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginTop: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  pendingCard: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  newOrderBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  newOrderText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 14,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderIdContainer: {
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  quickInfo: {
    flexDirection: 'row-reverse',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.lg,
  },
  quickInfoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  totalText: {
    fontWeight: 'bold',
    color: COLORS.success,
  },
  expandedSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  itemsSection: {
    marginBottom: SPACING.lg,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addressSection: {
    marginBottom: SPACING.lg,
  },
  addressContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right',
    lineHeight: 20,
  },
  driverSection: {
    marginBottom: SPACING.lg,
  },
  driverCard2: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  driverInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  driverType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  driverBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappBtn: {
    backgroundColor: '#25D36615',
  },
  callBtn: {
    backgroundColor: `${COLORS.success}15`,
  },
  notesSection: {
    marginBottom: SPACING.lg,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FFF8E1',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    textAlign: 'right',
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row-reverse',
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  assignButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  assignButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  assignButtonText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
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
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.error}15`,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  expandIndicator: {
    alignItems: 'center',
    paddingBottom: SPACING.sm,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },

  // Assign Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  assignModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
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
  orderSummary: {
    backgroundColor: COLORS.background,
    margin: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  orderSummaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  orderSummaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  orderSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  driversSection: {
    maxHeight: 350,
  },
  driverTypeSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  driverTypeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  driverTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  noDrivers: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  noDriversText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noDriversHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  driverSelectCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  driverSelectCardActive: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  driverSelectInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverSelectAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverSelectAvatarActive: {
    backgroundColor: COLORS.primary,
  },
  driverSelectDetails: {
    alignItems: 'flex-end',
  },
  driverSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  driverSelectPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  platformDriverOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: `${COLORS.info}10`,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.info}30`,
  },
  platformDriverIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.info}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  platformDriverInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  platformDriverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.info,
  },
  platformDriverDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  assignModalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  confirmAssignButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  confirmAssignGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  confirmAssignText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
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
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmIconCircle: {
    marginBottom: SPACING.md,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  keepButton: {
    backgroundColor: COLORS.background,
  },
  keepButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  rejectButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
});
