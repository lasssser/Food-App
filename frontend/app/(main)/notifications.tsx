import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { formatSyriaRelative } from '../../src/utils/syriaTime';
import { scheduleLocalNotification } from '../../src/services/notifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'settings'>('all');
  
  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(25)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  
  // Notification Settings
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newOffers, setNewOffers] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Try to send from backend first
      await notificationAPI.testPushNotification();
      Alert.alert('تم', 'تم إرسال إشعار تجريبي إلى جهازك');
    } catch (error: any) {
      // If backend fails (no token registered), try local notification
      if (Platform.OS !== 'web') {
        try {
          await scheduleLocalNotification(
            '🔔 إشعار تجريبي',
            'هذا إشعار تجريبي من أكلة عالسريع',
            { type: 'test' },
            1
          );
          Alert.alert('تم', 'تم جدولة إشعار تجريبي محلي');
        } catch (e) {
          Alert.alert('تنبيه', 'يرجى استخدام التطبيق على جهاز حقيقي لتلقي الإشعارات');
        }
      } else {
        Alert.alert('تنبيه', 'الإشعارات غير مدعومة على الويب');
      }
    }
  };

  const getNotificationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'order_update':
        return 'bag-check';
      case 'new_order':
        return 'restaurant';
      case 'payment':
        return 'card';
      case 'promo':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'order_update':
        return COLORS.success;
      case 'new_order':
        return COLORS.primary;
      case 'payment':
        return '#2196F3';
      case 'promo':
        return '#FF9800';
      default:
        return COLORS.textSecondary;
    }
  };

  const formatDate = (dateString: string) => formatSyriaRelative(dateString);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotificationsList = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Actions */}
      {notifications.length > 0 && unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead} activeOpacity={0.7}>
          <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
          <Text style={styles.markAllText}>تحديد الكل كمقروء</Text>
        </TouchableOpacity>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={50} color={COLORS.textLight} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
          <Text style={styles.emptySubtitle}>ستظهر هنا الإشعارات الجديدة</Text>
        </View>
      ) : (
        notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.is_read && styles.unreadCard,
            ]}
            onPress={() => handleMarkAsRead(notification.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.notificationIcon,
              { backgroundColor: `${getNotificationColor(notification.type)}15` },
            ]}>
              <Ionicons
                name={getNotificationIcon(notification.type)}
                size={24}
                color={getNotificationColor(notification.type)}
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {!notification.is_read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationBody} numberOfLines={2}>
                {notification.body}
              </Text>
              <Text style={styles.notificationTime}>
                {formatDate(notification.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Notification Types */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>أنواع الإشعارات</Text>
        
        <View style={styles.settingItem}>
          <Switch
            value={orderUpdates}
            onValueChange={setOrderUpdates}
            trackColor={{ false: COLORS.border, true: `${COLORS.success}80` }}
            thumbColor={orderUpdates ? COLORS.success : COLORS.textLight}
          />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>تحديثات الطلبات</Text>
            <Text style={styles.settingDesc}>إشعارات عن حالة طلباتك</Text>
          </View>
          <View style={[styles.settingIcon, { backgroundColor: `${COLORS.success}15` }]}>
            <Ionicons name="bag-check" size={22} color={COLORS.success} />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Switch
            value={newOffers}
            onValueChange={setNewOffers}
            trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
            thumbColor={newOffers ? COLORS.primary : COLORS.textLight}
          />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>العروض والخصومات</Text>
            <Text style={styles.settingDesc}>أحدث العروض من المطاعم</Text>
          </View>
          <View style={[styles.settingIcon, { backgroundColor: `${COLORS.primary}15` }]}>
            <Ionicons name="gift" size={22} color={COLORS.primary} />
          </View>
        </View>
      </View>

      {/* Sound & Vibration */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>الصوت والاهتزاز</Text>
        
        <View style={styles.settingItem}>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: COLORS.border, true: `${COLORS.info}80` }}
            thumbColor={soundEnabled ? COLORS.info : COLORS.textLight}
          />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>صوت الإشعارات</Text>
            <Text style={styles.settingDesc}>تشغيل صوت عند وصول إشعار</Text>
          </View>
          <View style={[styles.settingIcon, { backgroundColor: `${COLORS.info}15` }]}>
            <Ionicons name="volume-high" size={22} color={COLORS.info} />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: COLORS.border, true: `${COLORS.info}80` }}
            thumbColor={vibrationEnabled ? COLORS.info : COLORS.textLight}
          />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>الاهتزاز</Text>
            <Text style={styles.settingDesc}>اهتزاز عند وصول إشعار</Text>
          </View>
          <View style={[styles.settingIcon, { backgroundColor: `${COLORS.info}15` }]}>
            <Ionicons name="phone-portrait" size={22} color={COLORS.info} />
          </View>
        </View>
      </View>

      {/* Test Notification */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>اختبار الإشعارات</Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestNotification}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.testButtonGradient}
          >
            <Ionicons name="paper-plane" size={20} color={COLORS.textWhite} />
            <Text style={styles.testButtonText}>إرسال إشعار تجريبي</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.testNote}>
          سيتم إرسال إشعار تجريبي إلى جهازك للتأكد من عمل الإشعارات بشكل صحيح
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={{ opacity: headerAnim }}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>الإشعارات</Text>
          <View style={{ width: 28 }} />
        </View>
        {unreadCount > 0 && (
          <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 }}>
            لديك {unreadCount} إشعار جديد
          </Text>
        )}
      </LinearGradient>
      </Animated.View>

      {/* Tabs */}
      <Animated.View style={{ opacity: headerAnim }}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications"
            size={20}
            color={activeTab === 'all' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            الكل
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="settings"
            size={20}
            color={activeTab === 'settings' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            الإعدادات
          </Text>
        </TouchableOpacity>
      </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentSlide }] }}>
      {activeTab === 'all' ? renderNotificationsList() : renderSettings()}
      </Animated.View>
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  tabs: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  markAllButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
  },
  unreadCard: {
    backgroundColor: `${COLORS.primary}08`,
    borderRightWidth: 3,
    borderRightColor: COLORS.primary,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  notificationHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notificationBody: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
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
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },

  // Settings
  settingsSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginHorizontal: SPACING.md,
    alignItems: 'flex-end',
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  testButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  testButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  testButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  testNote: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
