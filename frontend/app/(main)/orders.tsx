import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LiveTrackingModal from '../../src/components/LiveTrackingModal';
import { orderAPI, ratingAPI } from '../../src/services/api';
import { Order } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import RatingModal from '../../src/components/RatingModal';

// Order statuses with all steps
const ORDER_STEPS = [
  { status: 'pending', label: 'تم استلام الطلب', icon: 'receipt' },
  { status: 'accepted', label: 'المطعم قبل الطلب', icon: 'checkmark' },
  { status: 'preparing', label: 'جاري التحضير', icon: 'flame' },
  { status: 'ready', label: 'جاهز للاستلام', icon: 'bag-check' },
  { status: 'driver_assigned', label: 'تم تعيين سائق', icon: 'bicycle' },
  { status: 'picked_up', label: 'السائق استلم الطلب', icon: 'navigate' },
  { status: 'out_for_delivery', label: 'في الطريق إليك', icon: 'car' },
  { status: 'delivered', label: 'تم التسليم', icon: 'checkmark-done' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFA726',
  accepted: '#42A5F5',
  preparing: '#AB47BC',
  ready: '#26A69A',
  driver_assigned: '#5C6BC0',
  picked_up: '#7E57C2',
  out_for_delivery: '#00ACC1',
  delivered: '#66BB6A',
  cancelled: '#EF5350',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  
  // Rating state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [orderToRate, setOrderToRate] = useState<Order | null>(null);
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());

  // Tracking state
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Animations
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(30)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listSlide, { toValue: 0, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(listOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getAll();
      setOrders(data);
      
      // Check which orders have been rated
      const ratedSet = new Set<string>();
      for (const order of data) {
        if (order.order_status === 'delivered') {
          try {
            const ratingResult = await ratingAPI.getOrderRating(order.id);
            if (ratingResult.rated) {
              ratedSet.add(order.id);
            }
          } catch {
            // Ignore errors
          }
        }
      }
      setRatedOrders(ratedSet);
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
      // Auto refresh every 30 seconds for active orders
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await orderAPI.cancel(orderToCancel);
      fetchOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
    } finally {
      setConfirmCancelVisible(false);
      setOrderToCancel(null);
    }
  };

  const callDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusIndex = (status: string) => {
    return ORDER_STEPS.findIndex(s => s.status === status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    const isExpanded = expandedOrder === order.id;
    const currentStatusIndex = getStatusIndex(order.order_status);
    const isCancelled = order.order_status === 'cancelled';
    const isDelivered = order.order_status === 'delivered';
    const canCancel = ['pending', 'accepted'].includes(order.order_status);
    const hasDriver = order.driver_name && order.driver_phone;

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.orderHeader}
          onPress={() => setExpandedOrder(isExpanded ? null : order.id)}
        >
          <View style={styles.orderHeaderLeft}>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </View>
          <View style={styles.orderHeaderRight}>
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
            <View style={styles.orderMeta}>
              <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
              <Text style={styles.orderNumber}>#{order.id.slice(0, 8)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: STATUS_COLORS[order.order_status] || COLORS.textLight }
            ]}
          >
            <Text style={styles.statusText}>
              {isCancelled ? 'ملغي' : 
               isDelivered ? 'تم التسليم ✓' :
               ORDER_STEPS[currentStatusIndex]?.label || order.order_status}
            </Text>
          </View>
        </View>

        {/* Driver Info (if assigned) */}
        {hasDriver && !isCancelled && !isDelivered && (
          <View style={styles.driverSection}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Ionicons name="bicycle" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverLabel}>السائق</Text>
                <Text style={styles.driverName}>{order.driver_name}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => callDriver(order.driver_phone!)}
            >
              <Ionicons name="call" size={20} color={COLORS.textWhite} />
              <Text style={styles.callButtonText}>اتصال</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Tracker (if expanded and not cancelled) */}
        {isExpanded && !isCancelled && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>تتبع الطلب</Text>
            <View style={styles.progressSteps}>
              {ORDER_STEPS.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <View key={step.status} style={styles.progressStep}>
                    <View style={styles.progressLineContainer}>
                      {index > 0 && (
                        <View 
                          style={[
                            styles.progressLine,
                            isCompleted && styles.progressLineActive
                          ]} 
                        />
                      )}
                    </View>
                    <View 
                      style={[
                        styles.progressDot,
                        isCompleted && styles.progressDotActive,
                        isCurrent && styles.progressDotCurrent
                      ]}
                    >
                      <Ionicons 
                        name={step.icon as any} 
                        size={16} 
                        color={isCompleted ? COLORS.textWhite : COLORS.textLight} 
                      />
                    </View>
                    <Text 
                      style={[
                        styles.progressLabel,
                        isCompleted && styles.progressLabelActive,
                        isCurrent && styles.progressLabelCurrent
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Order Details (if expanded) */}
        {isExpanded && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>تفاصيل الطلب</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemPrice}>{item.subtotal.toLocaleString()} ل.س</Text>
                <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{order.total.toLocaleString()} ل.س</Text>
              <Text style={styles.totalLabel}>الإجمالي (شامل التوصيل)</Text>
            </View>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity 
            style={styles.cancelOrderButton}
            onPress={() => {
              setOrderToCancel(order.id);
              setConfirmCancelVisible(true);
            }}
          >
            <Text style={styles.cancelOrderText}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}

        {/* Rate Button - shown for delivered orders not yet rated */}
        {isDelivered && !ratedOrders.has(order.id) && (
          <TouchableOpacity 
            style={styles.rateButton}
            onPress={() => {
              setOrderToRate(order);
              setRatingModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.rateButtonGradient}
            >
              <Ionicons name="star" size={20} color={COLORS.textWhite} />
              <Text style={styles.rateButtonText}>قيّم تجربتك</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Already rated indicator */}
        {isDelivered && ratedOrders.has(order.id) && (
          <View style={styles.ratedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.ratedText}>تم التقييم</Text>
          </View>
        )}
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
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>طلباتي</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length > 0 
            ? `${orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status)).length} طلبات نشطة`
            : 'تتبع طلباتك الحالية والسابقة'}
        </Text>
      </LinearGradient>
      </Animated.View>

      {/* Orders List */}
      <Animated.View style={{ flex: 1, opacity: listOpacity, transform: [{ translateY: listSlide }] }}>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={70} color={COLORS.textLight} />
          <Text style={styles.emptyText}>لا توجد طلبات</Text>
          <Text style={styles.emptySubtext}>طلباتك السابقة ستظهر هنا</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
      </Animated.View>

      {/* Cancel Confirmation Modal */}
      <Modal visible={confirmCancelVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning-outline" size={50} color={COLORS.warning} />
            <Text style={styles.modalTitle}>إلغاء الطلب</Text>
            <Text style={styles.modalMessage}>هل أنت متأكد من إلغاء هذا الطلب؟</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.keepButton]}
                onPress={() => setConfirmCancelVisible(false)}
              >
                <Text style={styles.keepButtonText}>لا، إبقاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmCancelButton]}
                onPress={handleCancelOrder}
              >
                <Text style={styles.confirmCancelText}>نعم، إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      {orderToRate && (
        <RatingModal
          visible={ratingModalVisible}
          onClose={() => {
            setRatingModalVisible(false);
            setOrderToRate(null);
          }}
          orderId={orderToRate.id}
          restaurantName={orderToRate.restaurant_name}
          hasDriver={!!orderToRate.driver_name}
          driverName={orderToRate.driver_name}
          onSuccess={() => {
            setRatedOrders(prev => new Set([...prev, orderToRate.id]));
          }}
        />
      )}

      {/* Live Tracking Modal */}
      <LiveTrackingModal
        orderId={trackingOrderId || ''}
        visible={!!trackingOrderId}
        onClose={() => setTrackingOrderId(null)}
      />
    </SafeAreaView>

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
    fontSize: 26,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
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
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
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
  orderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  orderHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  orderHeaderLeft: {
    padding: SPACING.xs,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  orderMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: 4,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  statusContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  statusBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  statusText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
  },
  driverSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.success}10`,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  driverDetails: {
    alignItems: 'flex-end',
  },
  driverLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  callButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  callButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
  },
  progressSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  progressSteps: {
    paddingRight: SPACING.sm,
  },
  progressStep: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressLineContainer: {
    position: 'absolute',
    top: -20,
    right: 15,
    height: 20,
  },
  progressLine: {
    width: 2,
    height: '100%',
    backgroundColor: COLORS.border,
  },
  progressLineActive: {
    backgroundColor: COLORS.success,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  progressDotActive: {
    backgroundColor: COLORS.success,
  },
  progressDotCurrent: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.1 }],
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    textAlign: 'right',
  },
  progressLabelActive: {
    color: COLORS.textPrimary,
  },
  progressLabelCurrent: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  cancelOrderButton: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelOrderText: {
    color: COLORS.error,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  modalButton: {
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
  confirmCancelButton: {
    backgroundColor: COLORS.error,
  },
  confirmCancelText: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },

  // Rating Button
  rateButton: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  rateButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  rateButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  ratedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  ratedText: {
    color: COLORS.success,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },
});
