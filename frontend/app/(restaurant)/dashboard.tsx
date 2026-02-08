import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { restaurantPanelAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function RestaurantDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statusAnim = useRef(new Animated.Value(30)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef([0,1,2,3].map(() => new Animated.Value(0))).current;
  const infoAnim = useRef(new Animated.Value(40)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;

  const animateEntrance = () => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(statusAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(statusOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.stagger(80, statsAnim.map(a => Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }))),
      Animated.parallel([
        Animated.timing(infoAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(infoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const fetchStats = async () => {
    try {
      const data = await restaurantPanelAPI.getStats();
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
      animateEntrance();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleToggleStatus = async () => {
    try {
      await restaurantPanelAPI.toggleStatus();
      fetchStats();
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
            <Text style={styles.restaurantName}>{stats?.restaurant?.name}</Text>
          </View>
          <View style={styles.logoContainer}>
            <Ionicons name="restaurant" size={30} color="#FF6B35" />
          </View>
        </View>

        {/* Status Toggle */}
        <TouchableOpacity
          style={[
            styles.statusCard,
            stats?.restaurant?.is_open ? styles.statusOpen : styles.statusClosed,
          ]}
          onPress={handleToggleStatus}
        >
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>حالة المطعم</Text>
            <Text style={styles.statusText}>
              {stats?.restaurant?.is_open ? 'مفتوح' : 'مغلق'}
            </Text>
          </View>
          <Ionicons
            name={stats?.restaurant?.is_open ? 'toggle' : 'toggle-outline'}
            size={40}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={28} color="#FF6B35" />
            <Text style={styles.statValue}>{stats?.today_orders || 0}</Text>
            <Text style={styles.statLabel}>طلبات اليوم</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#FFA726" />
            <Text style={styles.statValue}>{stats?.pending_orders || 0}</Text>
            <Text style={styles.statLabel}>طلبات معلقة</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash" size={28} color="#66BB6A" />
            <Text style={styles.statValue}>
              {(stats?.today_revenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>إيرادات اليوم (ل.س)</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="star" size={28} color="#FFD700" />
            <Text style={styles.statValue}>{stats?.restaurant?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>معلومات المطعم</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{stats?.restaurant?.address}</Text>
            <View style={styles.infoLabel}>
              <Text style={styles.infoLabelText}>العنوان</Text>
              <Ionicons name="location" size={18} color="#666" />
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{stats?.restaurant?.delivery_time}</Text>
            <View style={styles.infoLabel}>
              <Text style={styles.infoLabelText}>وقت التوصيل</Text>
              <Ionicons name="time" size={18} color="#666" />
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{stats?.restaurant?.delivery_fee?.toLocaleString()} ل.س</Text>
            <View style={styles.infoLabel}>
              <Text style={styles.infoLabelText}>رسوم التوصيل</Text>
              <Ionicons name="bicycle" size={18} color="#666" />
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{stats?.restaurant?.min_order?.toLocaleString()} ل.س</Text>
            <View style={styles.infoLabel}>
              <Text style={styles.infoLabelText}>الحد الأدنى</Text>
              <Ionicons name="cart" size={18} color="#666" />
            </View>
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
    fontFamily: 'Cairo_400Regular',
    color: '#666',
  },
  restaurantName: {
    fontSize: 22,
    fontFamily: 'Cairo_400Regular',
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
  statusOpen: {
    backgroundColor: '#66BB6A',
  },
  statusClosed: {
    backgroundColor: '#EF5350',
  },
  statusContent: {
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  statusText: {
    fontSize: 24,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statCardInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  infoLabelText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
    fontWeight: '500',
  },
});
