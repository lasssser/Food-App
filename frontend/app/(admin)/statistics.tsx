import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { adminStatisticsAPI } from '../../src/services/api';

interface RestaurantStat {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image?: string;
  is_featured: boolean;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
}

interface MonthlyData {
  month: number;
  month_name: string;
  orders: number;
}

interface OverviewStats {
  total_orders: number;
  pending_orders: number;
  delivered_orders: number;
  total_users: number;
  total_restaurants: number;
  total_drivers: number;
  total_revenue: number;
  pending_role_requests: number;
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants'>('overview');
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStat[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
  
  // Restaurant details modal
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantStat | null>(null);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [restaurantData, overviewData] = await Promise.all([
        adminStatisticsAPI.getRestaurantStats(),
        adminStatisticsAPI.getOverview(),
      ]);
      setRestaurantStats(restaurantData || []);
      setOverview(overviewData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  const fetchRestaurantMonthlyStats = async (restaurantId: string, year: number) => {
    setLoadingMonthly(true);
    try {
      const data = await adminStatisticsAPI.getMonthlyStats(year);
      const months = data?.months || [];
      
      // Extract data for selected restaurant
      const monthlyOrders: MonthlyData[] = [];
      const monthNames: { [key: number]: string } = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
      };
      
      // Initialize all months with 0
      for (let i = 1; i <= 12; i++) {
        monthlyOrders.push({
          month: i,
          month_name: monthNames[i],
          orders: 0
        });
      }
      
      // Fill in actual data
      months.forEach((monthData: any) => {
        const restaurant = monthData.restaurants?.find((r: any) => r.restaurant_id === restaurantId);
        if (restaurant) {
          const monthIndex = monthData.month - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyOrders[monthIndex].orders = restaurant.total_orders;
          }
        }
      });
      
      setMonthlyData(monthlyOrders);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setMonthlyData([]);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const openRestaurantDetails = (restaurant: RestaurantStat) => {
    setSelectedRestaurant(restaurant);
    setShowRestaurantModal(true);
    fetchRestaurantMonthlyStats(restaurant.restaurant_id, selectedYear);
  };

  const changeYear = (year: number) => {
    setSelectedYear(year);
    if (selectedRestaurant) {
      fetchRestaurantMonthlyStats(selectedRestaurant.restaurant_id, year);
    }
  };

  const toggleFeatured = async (restaurantId: string, currentStatus: boolean) => {
    setTogglingFeatured(restaurantId);
    try {
      await adminStatisticsAPI.toggleFeatured(restaurantId, !currentStatus);
      setRestaurantStats((prev) =>
        prev.map((r) =>
          r.restaurant_id === restaurantId ? { ...r, is_featured: !currentStatus } : r
        )
      );
      Alert.alert('تم', currentStatus ? 'تم إلغاء تمييز المطعم' : 'تم تمييز المطعم');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث حالة التمييز');
    } finally {
      setTogglingFeatured(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SY') + ' ل.س';
  };

  const renderOverviewCard = (
    icon: string,
    label: string,
    value: number | string,
    color: string
  ) => (
    <View style={styles.overviewCard}>
      <View style={[styles.overviewIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );

  // Simple restaurant list item for "المطاعم" tab
  const renderRestaurantListItem = (restaurant: RestaurantStat, index: number) => (
    <TouchableOpacity
      key={restaurant.restaurant_id}
      style={styles.restaurantListItem}
      onPress={() => openRestaurantDetails(restaurant)}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
      
      <View style={styles.restaurantListInfo}>
        <View style={styles.restaurantListNameRow}>
          {restaurant.is_featured && (
            <Ionicons name="star" size={14} color={COLORS.warning} style={{ marginLeft: 4 }} />
          )}
          <Text style={styles.restaurantListName}>{restaurant.restaurant_name}</Text>
        </View>
        <Text style={styles.restaurantListOrders}>
          إجمالي الطلبات: <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{restaurant.total_orders}</Text>
        </Text>
      </View>

      <View style={styles.restaurantListRank}>
        <Text style={styles.restaurantListRankText}>{index + 1}</Text>
      </View>
      
      {restaurant.restaurant_image ? (
        <Image source={{ uri: restaurant.restaurant_image }} style={styles.restaurantListImage} />
      ) : (
        <View style={[styles.restaurantListImage, styles.restaurantListImagePlaceholder]}>
          <Ionicons name="restaurant" size={20} color={COLORS.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );

  // Restaurant details modal with monthly stats
  const renderRestaurantModal = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    const totalYearOrders = monthlyData.reduce((sum, m) => sum + m.orders, 0);

    return (
      <Modal visible={showRestaurantModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowRestaurantModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>إحصائيات المطعم</Text>
            <TouchableOpacity
              style={[
                styles.featureButtonSmall,
                selectedRestaurant?.is_featured && styles.featureButtonSmallActive
              ]}
              onPress={() => {
                if (selectedRestaurant) {
                  toggleFeatured(selectedRestaurant.restaurant_id, selectedRestaurant.is_featured);
                  setSelectedRestaurant({
                    ...selectedRestaurant,
                    is_featured: !selectedRestaurant.is_featured
                  });
                }
              }}
            >
              <Ionicons
                name="star"
                size={18}
                color={selectedRestaurant?.is_featured ? COLORS.warning : COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg }}>
            {/* Restaurant Info */}
            <View style={styles.restaurantInfoCard}>
              {selectedRestaurant?.restaurant_image ? (
                <Image
                  source={{ uri: selectedRestaurant.restaurant_image }}
                  style={styles.restaurantInfoImage}
                />
              ) : (
                <View style={[styles.restaurantInfoImage, styles.restaurantInfoImagePlaceholder]}>
                  <Ionicons name="restaurant" size={40} color={COLORS.textLight} />
                </View>
              )}
              <Text style={styles.restaurantInfoName}>{selectedRestaurant?.restaurant_name}</Text>
              <View style={styles.restaurantInfoStats}>
                <View style={styles.restaurantInfoStatItem}>
                  <Text style={styles.restaurantInfoStatValue}>{selectedRestaurant?.total_orders || 0}</Text>
                  <Text style={styles.restaurantInfoStatLabel}>إجمالي الطلبات</Text>
                </View>
                <View style={styles.restaurantInfoStatDivider} />
                <View style={styles.restaurantInfoStatItem}>
                  <Text style={[styles.restaurantInfoStatValue, { color: COLORS.success }]}>
                    {selectedRestaurant?.completed_orders || 0}
                  </Text>
                  <Text style={styles.restaurantInfoStatLabel}>مكتملة</Text>
                </View>
                <View style={styles.restaurantInfoStatDivider} />
                <View style={styles.restaurantInfoStatItem}>
                  <Text style={[styles.restaurantInfoStatValue, { color: COLORS.error }]}>
                    {selectedRestaurant?.cancelled_orders || 0}
                  </Text>
                  <Text style={styles.restaurantInfoStatLabel}>ملغاة</Text>
                </View>
              </View>
            </View>

            {/* Year Selector */}
            <Text style={styles.sectionTitleSmall}>الإحصائيات الشهرية</Text>
            <View style={styles.yearSelector}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
                  onPress={() => changeYear(year)}
                >
                  <Text style={[styles.yearButtonText, selectedYear === year && styles.yearButtonTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Year Total */}
            <View style={styles.yearTotalCard}>
              <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
              <Text style={styles.yearTotalLabel}>إجمالي طلبات {selectedYear}</Text>
              <Text style={styles.yearTotalValue}>{totalYearOrders}</Text>
            </View>

            {/* Monthly Stats */}
            {loadingMonthly ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.monthlyGrid}>
                {monthlyData.map((month) => (
                  <View
                    key={month.month}
                    style={[
                      styles.monthCard,
                      month.orders > 0 && styles.monthCardActive
                    ]}
                  >
                    <Text style={styles.monthName}>{month.month_name}</Text>
                    <Text style={[
                      styles.monthOrders,
                      month.orders > 0 && styles.monthOrdersActive
                    ]}>
                      {month.orders}
                    </Text>
                    <Text style={styles.monthOrdersLabel}>طلب</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإحصائيات</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="stats-chart"
            size={18}
            color={activeTab === 'overview' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            نظرة عامة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'restaurants' && styles.tabActive]}
          onPress={() => setActiveTab('restaurants')}
        >
          <Ionicons
            name="restaurant"
            size={18}
            color={activeTab === 'restaurants' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'restaurants' && styles.tabTextActive]}>
            المطاعم
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' ? (
            <>
              {/* Overview Section */}
              <Text style={styles.sectionTitle}>نظرة عامة</Text>
              <View style={styles.overviewGrid}>
                {renderOverviewCard('receipt-outline', 'إجمالي الطلبات', overview?.total_orders || 0, COLORS.primary)}
                {renderOverviewCard('time-outline', 'معلقة', overview?.pending_orders || 0, COLORS.warning)}
                {renderOverviewCard('checkmark-circle-outline', 'مكتملة', overview?.delivered_orders || 0, COLORS.success)}
                {renderOverviewCard('people-outline', 'المستخدمين', overview?.total_users || 0, COLORS.info)}
                {renderOverviewCard('restaurant-outline', 'المطاعم', overview?.total_restaurants || 0, '#9C27B0')}
                {renderOverviewCard('car-outline', 'السائقين', overview?.total_drivers || 0, '#FF9800')}
              </View>

              {/* Revenue Card */}
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.revenueCard}>
                <View style={styles.revenueIcon}>
                  <Ionicons name="wallet" size={30} color={COLORS.textWhite} />
                </View>
                <Text style={styles.revenueLabel}>إجمالي الإيرادات</Text>
                <Text style={styles.revenueValue}>{formatCurrency(overview?.total_revenue || 0)}</Text>
              </LinearGradient>
            </>
          ) : (
            <>
              {/* Restaurants List */}
              <Text style={styles.sectionTitle}>المطاعم</Text>
              <Text style={styles.sectionSubtitleText}>اضغط على المطعم لعرض الإحصائيات الشهرية</Text>
              
              {restaurantStats.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="restaurant-outline" size={60} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>لا توجد مطاعم</Text>
                </View>
              ) : (
                restaurantStats.map((restaurant, index) => renderRestaurantListItem(restaurant, index))
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Restaurant Details Modal */}
      {renderRestaurantModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    textAlign: 'right',
  },
  sectionSubtitleText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'right',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  overviewCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  overviewLabel: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  revenueCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  revenueIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  revenueLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  revenueValue: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textWhite,
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },

  // Restaurant List Item
  restaurantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  restaurantListImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  restaurantListImagePlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantListRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  restaurantListRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textWhite,
  },
  restaurantListInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  restaurantListNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  restaurantListName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textPrimary,
  },
  restaurantListOrders: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  featureButtonSmall: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  featureButtonSmallActive: {
    backgroundColor: `${COLORS.warning}20`,
  },

  // Restaurant Info Card
  restaurantInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  restaurantInfoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  restaurantInfoImagePlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfoName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  restaurantInfoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantInfoStatItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  restaurantInfoStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  restaurantInfoStatLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  restaurantInfoStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.divider,
  },

  // Year Selector
  yearSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  yearButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  yearButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  yearButtonText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textSecondary,
  },
  yearButtonTextActive: {
    color: COLORS.primary,
  },

  // Year Total Card
  yearTotalCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  yearTotalLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  yearTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.primary,
  },

  // Monthly Grid
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  monthCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  monthName: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  monthOrders: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textLight,
  },
  monthOrdersActive: {
    color: COLORS.primary,
  },
  monthOrdersLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
  },
});
