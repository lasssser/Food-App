import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

  const totalUsers = (stats?.users.customers || 0) + (stats?.users.restaurants || 0) + (stats?.users.drivers || 0);

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
        {/* Main Stats Card */}
        <View style={styles.mainStatsCard}>
          <View style={styles.mainStatItem}>
            <View style={[styles.mainStatIcon, { backgroundColor: '#6366f1' }]}>
              <Ionicons name="people" size={28} color="#fff" />
            </View>
            <Text style={styles.mainStatValue}>{totalUsers}</Text>
            <Text style={styles.mainStatLabel}>إجمالي المستخدمين</Text>
          </View>
          <View style={styles.mainStatDivider} />
          <View style={styles.mainStatItem}>
            <View style={[styles.mainStatIcon, { backgroundColor: stats?.complaints.open ? '#ef4444' : '#22c55e' }]}>
              <Ionicons name="chatbubbles" size={28} color="#fff" />
            </View>
            <Text style={[styles.mainStatValue, stats?.complaints.open ? { color: '#ef4444' } : {}]}>
              {stats?.complaints.open || 0}
            </Text>
            <Text style={styles.mainStatLabel}>شكاوى مفتوحة</Text>
          </View>
        </View>

        {/* Users Breakdown */}
        <Text style={styles.sectionTitle}>تفاصيل المستخدمين</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.customers || 0}</Text>
            <Text style={styles.statLabel}>الزبائن</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="restaurant" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.restaurants || 0}</Text>
            <Text style={styles.statLabel}>المطاعم</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="bicycle" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.drivers || 0}</Text>
            <Text style={styles.statLabel}>السائقين</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#6366f1' }]}>
              <Ionicons name="radio-button-on" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.users.online_drivers || 0}</Text>
            <Text style={styles.statLabel}>سائق متصل</Text>
          </View>
        </View>

        {/* Complaints Summary */}
        <Text style={styles.sectionTitle}>ملخص الشكاوى</Text>
        <View style={styles.complaintsCard}>
          <View style={styles.complaintItem}>
            <View style={[styles.complaintDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.complaintLabel}>شكاوى مفتوحة</Text>
            <Text style={[styles.complaintValue, { color: '#ef4444' }]}>{stats?.complaints.open || 0}</Text>
          </View>
          <View style={styles.complaintItem}>
            <View style={[styles.complaintDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.complaintLabel}>إجمالي الشكاوى</Text>
            <Text style={styles.complaintValue}>{stats?.complaints.total || 0}</Text>
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
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Cairo_400Regular',
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
  mainStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  mainStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
  },
  mainStatLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
    marginTop: 4,
  },
  complaintsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  complaintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  complaintDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
  complaintLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
  },
  complaintValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
  },
  bottomSpacer: {
    height: 20,
  },
});
