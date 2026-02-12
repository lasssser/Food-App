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
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { driverAPI } from '../../src/services/api';
import { Order } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { formatPrice } from '../../src/utils/formatPrice';

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
}> = {
  assigned: { 
    label: 'معيّن لك', 
    color: '#2196F3', 
    icon: 'person-add',
    bgColor: '#E3F2FD',
  },
  driver_assigned: { 
    label: 'معيّن لك', 
    color: '#2196F3', 
    icon: 'person-add',
    bgColor: '#E3F2FD',
  },
  picked_up: { 
    label: 'تم الاستلام', 
    color: '#FF9800', 
    icon: 'bag-check',
    bgColor: '#FFF3E0',
  },
  out_for_delivery: { 
    label: 'جاري التوصيل', 
    color: '#9C27B0', 
    icon: 'bicycle',
    bgColor: '#F3E5F5',
  },
  delivered: { 
    label: 'تم التسليم', 
    color: '#4CAF50', 
    icon: 'checkmark-done-circle',
    bgColor: '#E8F5E9',
  },
};

const ACTION_CONFIG: Record<string, { next: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  assigned: { next: 'picked_up', label: 'استلمت الطلب', icon: 'bag-handle' },
  driver_assigned: { next: 'picked_up', label: 'استلمت الطلب', icon: 'bag-handle' },
  picked_up: { next: 'out_for_delivery', label: 'بدأت التوصيل', icon: 'bicycle' },
  out_for_delivery: { next: 'delivered', label: 'تم التسليم', icon: 'checkmark-done' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const [activeData, historyData] = await Promise.all([
        driverAPI.getMyOrders(),
        driverAPI.getHistory(),
      ]);
      setOrders(activeData);
      setHistoryOrders(historyData);
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
    setUpdating(orderId);
    try {
      await driverAPI.updateOrderStatus(orderId, newStatus);
      
      if (newStatus === 'delivered') {
        setSuccessMessage('تم تسليم الطلب بنجاح! \nشكراً لك على عملك الرائع');
      } else if (newStatus === 'picked_up') {
        setSuccessMessage('تم استلام الطلب من المطعم\nتوجه الآن لموقع العميل');
      } else if (newStatus === 'out_for_delivery') {
        setSuccessMessage('بالتوفيق في التوصيل!\nالعميل بانتظارك');
      }
      setShowSuccessModal(true);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('خطأ', 'فشل في تحديث حالة الطلب');
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    Alert.alert('رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'رفض', style: 'destructive', onPress: async () => {
        setUpdating(orderId);
        try {
          await driverAPI.rejectOrder(orderId);
          Alert.alert('تم', 'تم رفض الطلب');
          fetchOrders();
        } catch (error: any) {
          Alert.alert('خطأ', error.response?.data?.detail || 'فشل رفض الطلب');
        } finally {
          setUpdating(null);
        }
      }},
    ]);
  };

  const getActiveOrdersCount = () => {
    return orders.filter(o => o.order_status !== 'delivered').length;
  };

  const handleCallCustomer = (phone: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('اتصال', `رقم العميل: ${phone}`);
    } else {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleCallRestaurant = (phone: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('اتصال', `رقم المطعم: ${phone}`);
    } else {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOpenMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = STATUS_CONFIG[order.order_status] || { 
      label: order.order_status, 
      color: '#999', 
      icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
      bgColor: '#F5F5F5',
    };
    const action = ACTION_CONFIG[order.order_status];
    const isUpdating = updating === order.id;

    return (
      <View style={styles.orderCard}>
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
        </View>

        {/* Restaurant Section */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
            <Text style={styles.restaurantSubtext}>
              {order.items.length} أصناف • {order.items.reduce((sum, i) => sum + i.quantity, 0)} قطع
            </Text>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeSection}>
          {/* Pickup Point */}
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.pickupDot]}>
              <Ionicons name="storefront" size={14} color={COLORS.textWhite} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>الاستلام من</Text>
              <Text style={styles.routeAddress}>{order.restaurant_address || 'عنوان المطعم'}</Text>
            </View>
          </View>
          
          {/* Connecting Line */}
          <View style={styles.routeLineContainer}>
            <View style={styles.routeLine} />
          </View>
          
          {/* Delivery Point */}
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.deliveryDot]}>
              <Ionicons name="location" size={14} color={COLORS.textWhite} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>التوصيل إلى</Text>
              <Text style={styles.routeAddress}>
                {order.address?.label} - {order.address?.address_line}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info & Quick Actions */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{order.customer_name || 'العميل'}</Text>
              <Text style={styles.customerPhone}>{order.customer_phone || 'لا يوجد رقم'}</Text>
            </View>
          </View>
          <View style={styles.quickActions}>
            {order.customer_phone && (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleCallCustomer(order.customer_phone!)}
              >
                <Ionicons name="call" size={18} color={COLORS.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => handleOpenMap(order.address?.address_line || '')}
            >
              <Ionicons name="navigate" size={18} color={COLORS.info} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items Summary */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>محتوى الطلب:</Text>
          <View style={styles.itemsList}>
            {order.items.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemText}>
                  {item.quantity}× {item.name}
                </Text>
              </View>
            ))}
            {order.items.length > 3 && (
              <Text style={styles.moreItems}>+{order.items.length - 3} أصناف أخرى</Text>
            )}
          </View>
        </View>

        {/* Order Notes */}
        {order.notes && (
          <View style={styles.notesSection}>
            <Ionicons name="document-text" size={16} color={COLORS.warning} />
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Payment & Total */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentInfo}>
            <View style={[
              styles.paymentBadge, 
              { backgroundColor: order.payment_method === 'COD' ? '#FFF8E1' : '#E8F5E9' }
            ]}>
              <Ionicons 
                name={order.payment_method === 'COD' ? 'cash' : 'wallet'} 
                size={16} 
                color={order.payment_method === 'COD' ? '#F57C00' : COLORS.success}
              />
              <Text style={[
                styles.paymentText,
                { color: order.payment_method === 'COD' ? '#F57C00' : COLORS.success }
              ]}>
                {order.payment_method === 'COD' ? 'كاش عند الاستلام' : 'ShamCash'}
              </Text>
            </View>
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>المجموع</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)} ل.س</Text>
          </View>
        </View>

        {/* Action Button */}
        {action && (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpdateStatus(order.id, action.next)}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.next === 'delivered' ? [COLORS.success, '#43A047'] : [COLORS.primary, COLORS.primaryDark]}
                style={styles.actionButtonGradient}
              >
                {isUpdating ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <>
                    <Ionicons name={action.icon} size={22} color={COLORS.textWhite} />
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {order.order_status === 'driver_assigned' && (
              <TouchableOpacity
                style={{ backgroundColor: '#FFF3F3', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' }}
                onPress={() => handleRejectOrder(order.id)}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: COLORS.error }}>رفض الطلب</Text>
              </TouchableOpacity>
            )}
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
          <Text style={styles.loadingText}>جاري تحميل طلباتك...</Text>
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
            <Text style={styles.headerTitle}>توصيلاتي</Text>
            <Text style={styles.headerSubtitle}>
              {getActiveOrdersCount() > 0 
                ? `${getActiveOrdersCount()} طلبات نشطة` 
                : 'لا توجد طلبات نشطة'}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="bag-handle" size={24} color={COLORS.primary} />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Ionicons 
              name="time" 
              size={18} 
              color={activeTab === 'active' ? COLORS.primary : 'rgba(255,255,255,0.7)'} 
            />
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              نشطة ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="checkmark-done" 
              size={18} 
              color={activeTab === 'history' ? COLORS.success : 'rgba(255,255,255,0.7)'} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              السجل ({historyOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Orders List */}
      <FlatList
        data={activeTab === 'active' ? orders : historyOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={activeTab === 'active' ? "bicycle-outline" : "archive-outline"} 
                size={50} 
                color={COLORS.textLight} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'لا توجد توصيلات حالياً' : 'لا يوجد سجل بعد'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active' 
                ? 'اذهب لصفحة "طلبات متاحة" لقبول طلبات جديدة'
                : 'ستظهر هنا الطلبات المكتملة والملغاة'}
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
            <Text style={styles.modalTitle}>تم بنجاح!</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
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
    paddingVertical: SPACING.lg,
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
  headerBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: 4,
    marginTop: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  statusHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },
  orderId: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    fontWeight: '500',
  },
  restaurantSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: SPACING.md,
  },
  restaurantIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 17,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  restaurantSubtext: {
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
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
    lineHeight: 20,
  },
  routeLineContainer: {
    paddingRight: 13,
    paddingVertical: 2,
    alignItems: 'flex-end',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
  },

  // Customer Section
  customerSection: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  customerInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: {
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  customerPhone: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  // Notes Section
  notesSection: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.warning}10`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },

  itemsSection: {
    marginBottom: SPACING.md,
  },
  itemsTitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  itemsList: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
  },
  itemRow: {
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  moreItems: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    textAlign: 'right',
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  paymentSection: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginBottom: SPACING.md,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 6,
    alignSelf: 'flex-start',
  },
  paymentText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },
  totalContainer: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  actionButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: COLORS.textWhite,
    fontSize: 17,
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
    lineHeight: 22,
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
