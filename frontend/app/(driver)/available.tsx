import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { driverAPI } from '../../src/services/api';
import { Order } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function AvailableOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      // Auto-refresh every 10 seconds for real-time updates
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleAcceptOrder = async (orderId: string) => {
    setAccepting(orderId);
    try {
      await driverAPI.acceptOrder(orderId);
      setShowSuccessModal(true);
      fetchOrders();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'فشل قبول الطلب';
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setAccepting(null);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const str = String(dateString || '');
      const date = new Date(str);
      const now = new Date();
      if (isNaN(date.getTime())) return '';
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      
      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '';
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const isAccepting = accepting === order.id;
    
    return (
      <View style={styles.orderCard}>
        {/* Urgency Badge */}
        <View style={styles.urgencyBadge}>
          <Ionicons name="time" size={14} color={COLORS.textWhite} />
          <Text style={styles.urgencyText}>{formatTime(order.created_at)}</Text>
        </View>

        {/* Restaurant Info */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
            <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
          </View>
        </View>

        {/* Pickup & Delivery */}
        <View style={styles.routeSection}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>استلام من المطعم</Text>
              <Text style={styles.routeAddress}>{order.restaurant_address || 'عنوان المطعم'}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.deliveryDot]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>توصيل إلى</Text>
              <Text style={styles.routeAddress}>
                {order.address?.label} - {order.address?.address_line}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{order.items.length}</Text>
            <Text style={styles.summaryLabel}>أصناف</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {order.items.reduce((sum, i) => sum + i.quantity, 0)}
            </Text>
            <Text style={styles.summaryLabel}>قطع</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.earningsValue]}>
              {order.delivery_fee.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>ربحك (ل.س)</Text>
          </View>
        </View>

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptOrder(order.id)}
          disabled={isAccepting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.success, '#43A047']}
            style={styles.acceptButtonGradient}
          >
            {isAccepting ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.textWhite} />
                <Text style={styles.acceptButtonText}>قبول الطلب</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{order.total.toLocaleString()} ل.س</Text>
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري البحث عن طلبات...</Text>
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
            <Text style={styles.headerTitle}>طلبات متاحة</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length > 0 ? `${orders.length} طلبات جاهزة للتوصيل` : 'لا توجد طلبات حالياً'}
            </Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>مباشر</Text>
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
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bicycle" size={50} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد طلبات متاحة</Text>
            <Text style={styles.emptySubtitle}>
              سيتم إشعارك فور توفر طلبات جديدة في منطقتك
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.refreshButtonText}>تحديث</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color={COLORS.textWhite} />
            </View>
            <Text style={styles.modalTitle}>تم قبول الطلب! 🎉</Text>
            <Text style={styles.modalMessage}>توجه للمطعم لاستلام الطلب</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>حسناً</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showErrorModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.successIcon, { backgroundColor: COLORS.error }]}>
              <Ionicons name="close" size={40} color={COLORS.textWhite} />
            </View>
            <Text style={styles.modalTitle}>لم يتم قبول الطلب</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.error }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>حسناً</Text>
            </TouchableOpacity>
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
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  urgencyBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  urgencyText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  restaurantSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  restaurantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  restaurantInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  orderId: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  routeSection: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: SPACING.md,
    marginTop: 4,
  },
  pickupDot: {
    backgroundColor: COLORS.primary,
  },
  deliveryDot: {
    backgroundColor: COLORS.success,
  },
  routeInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  routeLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginTop: 2,
    textAlign: 'right',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginRight: 5,
    marginVertical: 4,
    alignSelf: 'flex-end',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  earningsValue: {
    color: COLORS.success,
  },
  acceptButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  acceptButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  totalBadgeText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
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
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  refreshButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.md,
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
  },

  // Modal styles
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
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  modalButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
  },
  modalButtonText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
  },
});
