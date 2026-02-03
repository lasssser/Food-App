import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await driverAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleToggleStatus = async () => {
    try {
      const result = await driverAPI.updateStatus(!stats?.is_online);
      setStats({ ...stats, is_online: result.is_online });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.welcomeText}>مرحباً</Text>
            <Text style={styles.driverName}>{user?.name}</Text>
          </View>
          <View style={styles.logoContainer}>
            <Ionicons name="bicycle" size={30} color="#FF6B35" />
          </View>
        </View>

        {/* Status Toggle */}
        <TouchableOpacity
          style={[
            styles.statusCard,
            stats?.is_online ? styles.statusOnline : styles.statusOffline,
          ]}
          onPress={handleToggleStatus}
        >
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>حالتك</Text>
            <Text style={styles.statusText}>
              {stats?.is_online ? 'متصل - جاهز للتوصيل' : 'غير متصل'}
            </Text>
          </View>
          <Ionicons
            name={stats?.is_online ? 'radio-button-on' : 'radio-button-off'}
            size={40}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="today" size={28} color="#FF6B35" />
              <Text style={styles.statValue}>{stats?.today_deliveries || 0}</Text>
              <Text style={styles.statLabel}>توصيلات اليوم</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="checkmark-done" size={28} color="#66BB6A" />
              <Text style={styles.statValue}>{stats?.total_deliveries || 0}</Text>
              <Text style={styles.statLabel}>إجمالي التوصيلات</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="star" size={28} color="#FFD700" />
              <Text style={styles.statValue}>{stats?.average_rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>تقييمك</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>نصائح للسائق</Text>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={20} color="#66BB6A" />
            <Text style={styles.tipText}>كن متصلاً لاستلام الطلبات</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={20} color="#66BB6A" />
            <Text style={styles.tipText}>التزم بوقت التوصيل المحدد</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={20} color="#66BB6A" />
            <Text style={styles.tipText}>حافظ على تقييم عالي</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  driverName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  statusCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  statusOnline: {
    backgroundColor: '#66BB6A',
  },
  statusOffline: {
    backgroundColor: '#9E9E9E',
  },
  statusContent: {
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  statCard: {
    flex: 1,
    padding: 8,
  },
  statCardInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
});
