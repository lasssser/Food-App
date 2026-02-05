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

interface MonthlyRestaurantStat {
  restaurant_id: string;
  restaurant_name: string;
  total_orders: number;
}

interface MonthData {
  month: number;
  month_name: string;
  year: number;
  restaurants: MonthlyRestaurantStat[];
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
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly'>('overview');
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);

  const fetchOverviewStats = async () => {
    try {
      const [restaurantData, overviewData] = await Promise.all([
        adminStatisticsAPI.getRestaurantStats(),
        adminStatisticsAPI.getOverview(),
      ]);
      setRestaurantStats(restaurantData || []);
      setOverview(overviewData);
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const data = await adminStatisticsAPI.getMonthlyStats(selectedYear);
      setMonthlyStats(data?.months || []);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setMonthlyStats([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'overview') {
      fetchOverviewStats().finally(() => setLoading(false));
    } else {
      fetchMonthlyStats().finally(() => setLoading(false));
    }
  }, [activeTab, selectedYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'overview') {
      await fetchOverviewStats();
    } else {
      await fetchMonthlyStats();
    }
    setRefreshing(false);
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

  const renderRestaurantCard = (stat: RestaurantStat, index: number) => (
    <View key={stat.restaurant_id} style={styles.restaurantCard}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      
      <View style={styles.restaurantHeader}>
        <View style={styles.restaurantInfo}>
          {stat.restaurant_image ? (
            <Image source={{ uri: stat.restaurant_image }} style={styles.restaurantImage} />
          ) : (
            <View style={[styles.restaurantImage, styles.restaurantImagePlaceholder]}>
              <Ionicons name="restaurant" size={24} color={COLORS.textLight} />
            </View>
          )}
          <View style={styles.restaurantNameContainer}>
            <View style={styles.nameRow}>
              {stat.is_featured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                </View>
              )}
              <Text style={styles.restaurantName}>{stat.restaurant_name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.featureButton, stat.is_featured && styles.featureButtonActive]}
              onPress={() => toggleFeatured(stat.restaurant_id, stat.is_featured)}
              disabled={togglingFeatured === stat.restaurant_id}
            >
              {togglingFeatured === stat.restaurant_id ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.featureButtonText, stat.is_featured && styles.featureButtonTextActive]}>
                  {stat.is_featured ? 'إلغاء التمييز' : 'تمييز المطعم'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stat.total_orders}</Text>
          <Text style={styles.statLabel}>إجمالي الطلبات</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stat.completed_orders}</Text>
          <Text style={styles.statLabel}>مكتملة</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>{stat.cancelled_orders}</Text>
          <Text style={styles.statLabel}>ملغاة</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary, fontSize: 13 }]}>{formatCurrency(stat.total_revenue)}</Text>
          <Text style={styles.statLabel}>الإيرادات</Text>
        </View>
      </View>
    </View>
  );

  // Render Monthly Tab Content
  const renderMonthlyContent = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];

    return (
      <>
        <Text style={styles.sectionTitle}>الإحصائيات الشهرية</Text>
        
        {/* Year Selector */}
        <View style={styles.yearSelector}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearButtonText, selectedYear === year && styles.yearButtonTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {monthlyStats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>لا توجد طلبات في سنة {selectedYear}</Text>
          </View>
        ) : (
          monthlyStats.map((monthData) => (
            <View key={`${monthData.year}-${monthData.month}`} style={styles.monthCard}>
              {/* Month Header */}
              <View style={styles.monthHeader}>
                <View style={[styles.monthIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="calendar" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.monthName}>{monthData.month_name} {monthData.year}</Text>
              </View>

              {/* Restaurants List */}
              <View style={styles.monthRestaurantsList}>
                {monthData.restaurants.length === 0 ? (
                  <Text style={styles.noDataText}>لا توجد طلبات</Text>
                ) : (
                  monthData.restaurants.map((restaurant, index) => (
                    <View key={restaurant.restaurant_id} style={styles.monthRestaurantItem}>
                      <View style={styles.ordersBadge}>
                        <Text style={styles.ordersBadgeText}>{restaurant.total_orders}</Text>
                        <Text style={styles.ordersBadgeLabel}>طلب</Text>
                      </View>
                      <View style={styles.monthRestaurantInfo}>
                        <View style={styles.monthRestaurantRank}>
                          <Text style={styles.monthRestaurantRankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.monthRestaurantName}>{restaurant.restaurant_name}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          ))
        )}
      </>
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
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
          onPress={() => setActiveTab('monthly')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={activeTab === 'monthly' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
            شهري
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

              {/* Restaurant Statistics */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>إحصائيات المطاعم</Text>
                <Text style={styles.sectionSubtitle}>{restaurantStats.length} مطعم</Text>
              </View>

              {restaurantStats.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="analytics-outline" size={60} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>لا توجد بيانات</Text>
                </View>
              ) : (
                restaurantStats.map((stat, index) => renderRestaurantCard(stat, index))
              )}
            </>
          ) : (
            renderMonthlyContent()
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
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
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  rankBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textWhite,
  },
  restaurantHeader: {
    marginBottom: SPACING.md,
  },
  restaurantInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  restaurantImagePlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantNameContainer: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  featuredBadge: {
    backgroundColor: `${COLORS.warning}20`,
    padding: 4,
    borderRadius: 10,
  },
  featureButton: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureButtonActive: {
    borderColor: COLORS.warning,
    backgroundColor: `${COLORS.warning}10`,
  },
  featureButtonText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  featureButtonTextActive: {
    color: COLORS.warning,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  statItem: {
    width: '50%',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
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

  // Year Selector
  yearSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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

  // Monthly Cards - Simple Design
  monthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  monthHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: `${COLORS.primary}08`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  monthIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    marginRight: SPACING.md,
    textAlign: 'right',
  },
  monthRestaurantsList: {
    padding: SPACING.md,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  monthRestaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  monthRestaurantInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  monthRestaurantRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  monthRestaurantRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.primary,
  },
  monthRestaurantName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  ordersBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 60,
  },
  ordersBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textWhite,
  },
  ordersBadgeLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textWhite,
    opacity: 0.9,
  },
});
