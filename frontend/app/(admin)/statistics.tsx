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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

  // Restaurant details view
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantStat | null>(null);
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

      const monthNames: { [key: number]: string } = {
        1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
        5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
        9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
      };

      const monthlyOrders: MonthlyData[] = [];
      for (let i = 1; i <= 12; i++) {
        monthlyOrders.push({ month: i, month_name: monthNames[i], orders: 0 });
      }

      months.forEach((monthData: any) => {
        const restaurant = monthData.restaurants?.find(
          (r: any) => r.restaurant_id === restaurantId
        );
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
    fetchRestaurantMonthlyStats(restaurant.restaurant_id, selectedYear);
  };

  const changeYear = (year: number) => {
    setSelectedYear(year);
    if (selectedRestaurant) {
      fetchRestaurantMonthlyStats(selectedRestaurant.restaurant_id, year);
    }
  };

  const goBackToList = () => {
    setSelectedRestaurant(null);
    setMonthlyData([]);
  };

  const toggleFeatured = async (restaurantId: string, currentStatus: boolean) => {
    try {
      await adminStatisticsAPI.toggleFeatured(restaurantId, !currentStatus);
      setRestaurantStats((prev) =>
        prev.map((r) =>
          r.restaurant_id === restaurantId ? { ...r, is_featured: !currentStatus } : r
        )
      );
      if (selectedRestaurant && selectedRestaurant.restaurant_id === restaurantId) {
        setSelectedRestaurant({ ...selectedRestaurant, is_featured: !currentStatus });
      }
      Alert.alert('تم', currentStatus ? 'تم إلغاء تمييز المطعم' : 'تم تمييز المطعم');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث حالة التمييز');
    }
  };

  // Render overview tab
  const renderOverview = () => {
    if (!overview) return null;
    const cards = [
      { icon: 'receipt-outline', label: 'إجمالي الطلبات', value: overview.total_orders, color: '#E53935' },
      { icon: 'time-outline', label: 'معلقة', value: overview.pending_orders, color: '#FF9800' },
      { icon: 'checkmark-circle-outline', label: 'مكتملة', value: overview.delivered_orders, color: '#4CAF50' },
      { icon: 'people-outline', label: 'المستخدمين', value: overview.total_users, color: '#2196F3' },
      { icon: 'restaurant-outline', label: 'المطاعم', value: overview.total_restaurants, color: '#9C27B0' },
      { icon: 'car-outline', label: 'السائقين', value: overview.total_drivers, color: '#FF9800' },
    ];

    return (
      <View>
        <Text style={styles.sectionTitle}>نظرة عامة</Text>
        <View style={styles.cardsGrid}>
          {cards.map((card, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.cardIcon, { backgroundColor: card.color + '15' }]}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
              </View>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.revenueBox}>
          <Ionicons name="wallet" size={28} color="#fff" />
          <Text style={styles.revenueLabel}>إجمالي الإيرادات</Text>
          <Text style={styles.revenueValue}>
            {(overview.total_revenue || 0).toLocaleString('ar-SY')} ل.س
          </Text>
        </View>
      </View>
    );
  };

  // Render restaurant list
  const renderRestaurantList = () => (
    <View>
      <Text style={styles.sectionTitle}>المطاعم</Text>
      <Text style={styles.subtitle}>اضغط على المطعم لعرض الإحصائيات الشهرية</Text>

      {restaurantStats.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="restaurant-outline" size={50} color="#ccc" />
          <Text style={styles.emptyText}>لا توجد مطاعم</Text>
        </View>
      ) : (
        restaurantStats.map((restaurant, index) => (
          <TouchableOpacity
            key={restaurant.restaurant_id}
            style={styles.restaurantRow}
            onPress={() => openRestaurantDetails(restaurant)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color="#999" />
            <View style={styles.restaurantInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.restaurantName}>{restaurant.restaurant_name}</Text>
                {restaurant.is_featured && (
                  <Ionicons name="star" size={14} color="#FF9800" style={{ marginRight: 4 }} />
                )}
              </View>
              <Text style={styles.orderCount}>
                إجمالي الطلبات: {restaurant.total_orders}
              </Text>
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // Render restaurant details with monthly stats
  const renderRestaurantDetails = () => {
    if (!selectedRestaurant) return null;
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    const totalYearOrders = monthlyData.reduce((sum, m) => sum + m.orders, 0);

    return (
      <View>
        {/* Back button */}
        <TouchableOpacity onPress={goBackToList} style={styles.backToListBtn}>
          <Text style={styles.backToListText}>رجوع للقائمة</Text>
          <Ionicons name="arrow-forward" size={18} color="#E53935" />
        </TouchableOpacity>

        {/* Restaurant header */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderTop}>
            <TouchableOpacity
              onPress={() =>
                toggleFeatured(selectedRestaurant.restaurant_id, selectedRestaurant.is_featured)
              }
              style={styles.starBtn}
            >
              <Ionicons
                name="star"
                size={20}
                color={selectedRestaurant.is_featured ? '#FF9800' : '#ccc'}
              />
            </TouchableOpacity>
            <Text style={styles.detailName}>{selectedRestaurant.restaurant_name}</Text>
          </View>

          <View style={styles.detailStats}>
            <View style={styles.detailStatItem}>
              <Text style={styles.detailStatValue}>{selectedRestaurant.total_orders}</Text>
              <Text style={styles.detailStatLabel}>إجمالي</Text>
            </View>
            <View style={styles.detailStatDivider} />
            <View style={styles.detailStatItem}>
              <Text style={[styles.detailStatValue, { color: '#4CAF50' }]}>
                {selectedRestaurant.completed_orders}
              </Text>
              <Text style={styles.detailStatLabel}>مكتملة</Text>
            </View>
            <View style={styles.detailStatDivider} />
            <View style={styles.detailStatItem}>
              <Text style={[styles.detailStatValue, { color: '#f44336' }]}>
                {selectedRestaurant.cancelled_orders}
              </Text>
              <Text style={styles.detailStatLabel}>ملغاة</Text>
            </View>
          </View>
        </View>

        {/* Year selector */}
        <Text style={styles.monthlyTitle}>الإحصائيات الشهرية</Text>
        <View style={styles.yearRow}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
              onPress={() => changeYear(year)}
            >
              <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Year total */}
        <View style={styles.yearTotalBox}>
          <Text style={styles.yearTotalValue}>{totalYearOrders}</Text>
          <Text style={styles.yearTotalLabel}>إجمالي طلبات {selectedYear}</Text>
          <Ionicons name="receipt-outline" size={22} color="#E53935" />
        </View>

        {/* Monthly grid */}
        {loadingMonthly ? (
          <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.monthGrid}>
            {monthlyData.map((month) => (
              <View
                key={month.month}
                style={[styles.monthBox, month.orders > 0 && styles.monthBoxActive]}
              >
                <Text style={styles.monthName}>{month.month_name}</Text>
                <Text style={[styles.monthCount, month.orders > 0 && styles.monthCountActive]}>
                  {month.orders}
                </Text>
                <Text style={styles.monthLabel}>طلب</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإحصائيات</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      {!selectedRestaurant && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons
              name="stats-chart"
              size={16}
              color={activeTab === 'overview' ? '#E53935' : '#999'}
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
              size={16}
              color={activeTab === 'restaurants' ? '#E53935' : '#999'}
            />
            <Text style={[styles.tabText, activeTab === 'restaurants' && styles.tabTextActive]}>
              المطاعم
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#E53935" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53935']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {selectedRestaurant
            ? renderRestaurantDetails()
            : activeTab === 'overview'
            ? renderOverview()
            : renderRestaurantList()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Cairo_700Bold',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#E5393515',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Cairo_400Regular',
  },
  tabTextActive: {
    color: '#E53935',
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: 'Cairo_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    textAlign: 'right',
    fontFamily: 'Cairo_400Regular',
  },

  // Overview cards
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Cairo_700Bold',
  },
  cardLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Cairo_400Regular',
  },
  revenueBox: {
    backgroundColor: '#E53935',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontFamily: 'Cairo_400Regular',
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    fontFamily: 'Cairo_700Bold',
  },

  // Restaurant list
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  restaurantInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Cairo_600SemiBold',
  },
  orderCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Cairo_400Regular',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Cairo_700Bold',
  },
  emptyBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 12,
    fontFamily: 'Cairo_400Regular',
  },

  // Restaurant details
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 16,
  },
  backToListText: {
    fontSize: 14,
    color: '#E53935',
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
  detailHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Cairo_700Bold',
  },
  starBtn: {
    padding: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  detailStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailStatItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Cairo_700Bold',
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Cairo_400Regular',
  },
  detailStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  monthlyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'right',
    fontFamily: 'Cairo_700Bold',
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  yearBtnActive: {
    borderColor: '#E53935',
    backgroundColor: '#E5393510',
  },
  yearText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Cairo_600SemiBold',
  },
  yearTextActive: {
    color: '#E53935',
  },
  yearTotalBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#E5393510',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  yearTotalLabel: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
    fontFamily: 'Cairo_400Regular',
  },
  yearTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E53935',
    fontFamily: 'Cairo_700Bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthBox: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  monthBoxActive: {
    borderColor: '#E53935',
    backgroundColor: '#E5393508',
  },
  monthName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontFamily: 'Cairo_400Regular',
  },
  monthCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ddd',
    fontFamily: 'Cairo_700Bold',
  },
  monthCountActive: {
    color: '#E53935',
  },
  monthLabel: {
    fontSize: 10,
    color: '#ccc',
    fontFamily: 'Cairo_400Regular',
  },
});
