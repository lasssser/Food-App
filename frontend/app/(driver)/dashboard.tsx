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
import { LinearGradient } from 'expo-linear-gradient';
import { driverAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const statusSlide = useRef(new Animated.Value(30)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef([0,1,2].map(() => new Animated.Value(0))).current;
  const earningsSlide = useRef(new Animated.Value(30)).current;
  const earningsOpacity = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(statusSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(statusOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.stagger(100, statsScale.map(a => Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }))),
      Animated.parallel([
        Animated.timing(earningsSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(earningsOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  };

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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={styles.welcomeText}>مرحباً</Text>
              <Text style={styles.driverName}>{user?.name}</Text>
            </View>
            <View style={styles.logoContainer}>
              <Ionicons name="bicycle" size={32} color={COLORS.primary} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Status Toggle */}
        <TouchableOpacity
          style={[
            styles.statusCard,
            stats?.is_online ? styles.statusOnline : styles.statusOffline,
          ]}
          onPress={handleToggleStatus}
          activeOpacity={0.9}
        >
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>حالتك الآن</Text>
            <Text style={styles.statusText}>
              {stats?.is_online ? 'متصل - جاهز للتوصيل 🚀' : 'غير متصل'}
            </Text>
            <Text style={styles.statusHint}>
              {stats?.is_online ? 'اضغط للتوقف عن استلام الطلبات' : 'اضغط للبدء بالتوصيل'}
            </Text>
          </View>
          <View style={[styles.statusIcon, stats?.is_online && styles.statusIconOnline]}>
            <Ionicons
              name={stats?.is_online ? 'power' : 'power-outline'}
              size={32}
              color={stats?.is_online ? COLORS.success : COLORS.textLight}
            />
          </View>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FFF5F2', '#FFE8E0']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="today" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stats?.today_deliveries || 0}</Text>
              <Text style={styles.statLabel}>توصيلات اليوم</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.statCardGradient}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#A5D6A7' }]}>
                <Ionicons name="checkmark-done" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats?.total_deliveries || 0}</Text>
              <Text style={styles.statLabel}>إجمالي التوصيلات</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FFF8E1', '#FFECB3']}
              style={styles.statCardGradient}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#FFD54F' }]}>
                <Ionicons name="star" size={24} color="#F57C00" />
              </View>
              <Text style={styles.statValue}>{stats?.average_rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>تقييمك</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Today's Earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <Text style={styles.earningsTitle}>أرباح اليوم</Text>
          </View>
          <Text style={styles.earningsAmount}>
            {(stats?.today_earnings || 0).toLocaleString()} ل.س
          </Text>
          <Text style={styles.earningsHint}>تحديث تلقائي عند إكمال كل توصيلة</Text>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 نصائح للسائق المتميز</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Ionicons name="checkmark" size={14} color={COLORS.textWhite} />
              </View>
              <Text style={styles.tipText}>كن متصلاً لاستلام الطلبات الجديدة</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Ionicons name="checkmark" size={14} color={COLORS.textWhite} />
              </View>
              <Text style={styles.tipText}>التزم بوقت التوصيل المحدد للعميل</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Ionicons name="checkmark" size={14} color={COLORS.textWhite} />
              </View>
              <Text style={styles.tipText}>تعامل بلطف للحصول على تقييم عالي</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
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
  header: {
    paddingBottom: SPACING.xl,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  driverName: {
    fontSize: 24,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.lg,
    ...SHADOWS.medium,
  },
  content: {
    flex: 1,
    marginTop: -SPACING.lg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.lg,
  },
  statusCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.medium,
  },
  statusOnline: {
    backgroundColor: COLORS.success,
  },
  statusOffline: {
    backgroundColor: COLORS.secondary,
  },
  statusContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  statusText: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginTop: 4,
  },
  statusHint: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconOnline: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },
  statCardGradient: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFCCBC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  earningsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  earningsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  earningsTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  earningsAmount: {
    fontSize: 36,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  earningsHint: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.small,
  },
  tipsTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },
  tipsList: {
    gap: SPACING.md,
  },
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});
