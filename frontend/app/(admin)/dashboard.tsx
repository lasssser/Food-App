import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');

interface AdminStats {
  users: {
    customers: number;
    restaurants: number;
    drivers: number;
    online_drivers: number;
  };
  orders: {
    total: number;
    pending: number;
    delivered: number;
    cancelled: number;
    today: number;
  };
  revenue: {
    total: number;
    today: number;
  };
  complaints: {
    open: number;
    total: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SY') + ' ل.س';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>مرحباً بك</Text>
            <Text style={styles.headerTitle}>لوحة تحكم المدير</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={24} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Cards */}
        <View style={styles.revenueSection}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.revenueCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.revenueIcon}>
              <Ionicons name="wallet" size={24} color="#fff" />
            </View>
            <Text style={styles.revenueLabel}>إجمالي الإيرادات</Text>
            <Text style={styles.revenueValue}>{formatCurrency(stats?.revenue.total || 0)}</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.revenueCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.revenueIcon}>
              <Ionicons name="today" size={24} color="#fff" />
            </View>
            <Text style={styles.revenueLabel}>إيرادات اليوم</Text>
            <Text style={styles.revenueValue}>{formatCurrency(stats?.revenue.today || 0)}</Text>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>الإحصائيات السريعة</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="people" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.customers || 0}</Text>
            <Text style={styles.statLabel}>العملاء</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="restaurant" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.restaurants || 0}</Text>
            <Text style={styles.statLabel}>المطاعم</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#6366f1' }]}>
              <Ionicons name="bicycle" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.drivers || 0}</Text>
            <Text style={styles.statLabel}>السائقين</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#ec4899' }]}>
              <Ionicons name="radio-button-on" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.online_drivers || 0}</Text>
            <Text style={styles.statLabel}>سائق متصل</Text>
          </View>
        </View>

        {/* Orders Section */}
        <Text style={styles.sectionTitle}>الطلبات</Text>
        <View style={styles.ordersSection}>
          <View style={styles.orderStat}>
            <View style={[styles.orderDot, { backgroundColor: '#6366f1' }]} />
            <Text style={styles.orderStatLabel}>إجمالي الطلبات</Text>
            <Text style={styles.orderStatValue}>{stats?.orders.total || 0}</Text>
          </View>
          <View style={styles.orderStat}>
            <View style={[styles.orderDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.orderStatLabel}>قيد الانتظار</Text>
            <Text style={styles.orderStatValue}>{stats?.orders.pending || 0}</Text>
          </View>
          <View style={styles.orderStat}>
            <View style={[styles.orderDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.orderStatLabel}>تم التسليم</Text>
            <Text style={styles.orderStatValue}>{stats?.orders.delivered || 0}</Text>
          </View>
          <View style={styles.orderStat}>
            <View style={[styles.orderDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.orderStatLabel}>ملغية</Text>
            <Text style={styles.orderStatValue}>{stats?.orders.cancelled || 0}</Text>
          </View>
          <View style={styles.orderStat}>
            <View style={[styles.orderDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.orderStatLabel}>طلبات اليوم</Text>
            <Text style={styles.orderStatValue}>{stats?.orders.today || 0}</Text>
          </View>
        </View>

        {/* Complaints Section */}
        <Text style={styles.sectionTitle}>الشكاوى</Text>
        <View style={styles.complaintsSection}>
          <View style={[styles.complaintCard, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
            <Text style={styles.complaintValue}>{stats?.complaints.open || 0}</Text>
            <Text style={styles.complaintLabel}>شكاوى مفتوحة</Text>
          </View>
          <View style={[styles.complaintCard, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            <Text style={styles.complaintValue}>{stats?.complaints.total || 0}</Text>
            <Text style={styles.complaintLabel}>إجمالي الشكاوى</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'System',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    marginTop: 4,
  },
  adminBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  revenueSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  revenueCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  revenueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
    textAlign: 'right',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    marginTop: 4,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    marginBottom: 16,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-end',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    marginTop: 4,
  },
  ordersSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
  orderStatLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontFamily: 'System',
    textAlign: 'right',
  },
  orderStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  complaintsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  complaintCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  complaintValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    marginTop: 8,
  },
  complaintLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 20,
  },
});
