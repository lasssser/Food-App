import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  Platform,
  Switch,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { restaurantPanelAPI, complaintsAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface RestaurantStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
}

export default function RestaurantSettings() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const orders = await restaurantPanelAPI.getOrders();
      const completed = orders.filter((o: any) => o.order_status === 'delivered');
      const pending = orders.filter((o: any) => o.order_status === 'pending');
      const revenue = completed.reduce((sum: number, o: any) => sum + o.total, 0);
      
      setStats({
        total_orders: orders.length,
        pending_orders: pending.length,
        completed_orders: completed.length,
        total_revenue: revenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleContactSupport = () => {
    if (Platform.OS === 'web') {
      window.open('https://wa.me/963999999999', '_blank');
    } else {
      Alert.alert(
        'تواصل معنا',
        'اختر طريقة التواصل',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: '📞 اتصال', onPress: () => Linking.openURL('tel:+963999999999') },
          { text: '💬 واتساب', onPress: () => Linking.openURL('https://wa.me/963999999999') },
        ]
      );
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintMessage.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    setSubmittingComplaint(true);
    try {
      await complaintsAPI.submit(complaintSubject.trim(), complaintMessage.trim(), 'restaurant');
      setShowComplaintModal(false);
      setComplaintSubject('');
      setComplaintMessage('');
      Alert.alert('نجاح', 'تم إرسال الشكوى بنجاح، سنتواصل معك قريباً');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      Alert.alert('خطأ', 'فشل في إرسال الشكوى');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const menuItems = [
    {
      id: 'restaurant-info',
      title: 'معلومات المطعم',
      subtitle: 'الاسم، الوصف، أوقات العمل',
      icon: 'business' as const,
      color: COLORS.primary,
      onPress: () => router.push('/(restaurant)/restaurant-info'),
    },
    {
      id: 'restaurant-location',
      title: 'موقع المطعم على الخريطة',
      subtitle: 'حدد موقعك ليظهر للزبائن',
      icon: 'location' as const,
      color: '#E91E63',
      onPress: () => setShowLocationPicker(true),
    },
    {
      id: 'orders',
      title: 'سجل الطلبات',
      subtitle: 'عرض جميع الطلبات السابقة',
      icon: 'document-text' as const,
      color: COLORS.info,
      onPress: () => router.push('/(restaurant)/orders'),
    },
    {
      id: 'menu',
      title: 'إدارة القائمة',
      subtitle: 'إضافة وتعديل الأصناف',
      icon: 'restaurant' as const,
      color: COLORS.accent,
      onPress: () => router.push('/(restaurant)/menu'),
    },
    {
      id: 'drivers',
      title: 'إدارة السائقين',
      subtitle: 'إضافة وتعديل سائقين المطعم',
      icon: 'bicycle' as const,
      color: COLORS.success,
      onPress: () => router.push('/(restaurant)/drivers'),
    },
    {
      id: 'payment-methods',
      title: 'طرق الدفع',
      subtitle: 'إدارة طرق الدفع المتاحة',
      icon: 'card' as const,
      color: '#2196F3',
      onPress: () => router.push('/(restaurant)/payment-methods'),
    },
    {
      id: 'reports',
      title: 'التقارير والإحصائيات',
      subtitle: 'المبيعات والأداء',
      icon: 'bar-chart' as const,
      color: '#9C27B0',
      onPress: () => router.push('/(restaurant)/reports'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>🏪</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'صاحب المطعم'}</Text>
              <Text style={styles.profilePhone}>{user?.phone}</Text>
              <View style={styles.profileBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.badgeText}>مطعم مميز</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {loading ? '...' : stats?.total_orders || 0}
            </Text>
            <Text style={styles.statLabel}>إجمالي الطلبات</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {loading ? '...' : stats?.completed_orders || 0}
            </Text>
            <Text style={styles.statLabel}>مكتمل</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {loading ? '...' : `${((stats?.total_revenue || 0) / 1000).toFixed(0)}K`}
            </Text>
            <Text style={styles.statLabel}>الإيرادات</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Menu Items */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>إدارة المطعم</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.menuItemIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>الإشعارات</Text>
          <View style={styles.menuCard}>
            <View style={styles.toggleItem}>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: COLORS.divider, true: `${COLORS.success}50` }}
                thumbColor={notificationsEnabled ? COLORS.success : '#f4f3f4'}
              />
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>إشعارات الطلبات</Text>
                <Text style={styles.toggleSubtitle}>استلام إشعارات للطلبات الجديدة</Text>
              </View>
              <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                <Ionicons name="notifications" size={22} color={COLORS.warning} />
              </View>
            </View>
            
            <View style={[styles.toggleItem, styles.menuItemBorder, { borderTopWidth: 1 }]}>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: COLORS.divider, true: `${COLORS.success}50` }}
                thumbColor={soundEnabled ? COLORS.success : '#f4f3f4'}
              />
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>صوت التنبيه</Text>
                <Text style={styles.toggleSubtitle}>تشغيل صوت عند وصول طلب جديد</Text>
              </View>
              <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.info}15` }]}>
                <Ionicons name="volume-high" size={22} color={COLORS.info} />
              </View>
            </View>
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>الدعم والمساعدة</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => setShowComplaintModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>إرسال شكوى</Text>
                  <Text style={styles.menuItemSubtitle}>أرسل شكوى للإدارة</Text>
                </View>
                <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.warning} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => router.push('/(restaurant)/my-complaints')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>شكاواي</Text>
                  <Text style={styles.menuItemSubtitle}>عرض شكاواي وردود الإدارة</Text>
                </View>
                <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.info}15` }]}>
                  <Ionicons name="chatbubbles" size={22} color={COLORS.info} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => setShowHelpModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>المساعدة والدعم</Text>
                  <Text style={styles.menuItemSubtitle}>تواصل معنا</Text>
                </View>
                <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="help-buoy" size={22} color={COLORS.success} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowAboutModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>عن التطبيق</Text>
                  <Text style={styles.menuItemSubtitle}>الإصدار والمعلومات</Text>
                </View>
                <View style={[styles.menuItemIcon, { backgroundColor: `${COLORS.accent}15` }]}>
                  <Ionicons name="information-circle" size={22} color={COLORS.accent} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.version}>أكلة عالسريع - لوحة المطعم v1.0.0</Text>
      </ScrollView>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={28} color={COLORS.textLight} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>المساعدة والدعم</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.helpContent}>
              <TouchableOpacity style={styles.helpCard} onPress={handleContactSupport} activeOpacity={0.7}>
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  style={styles.helpCardGradient}
                >
                  <Ionicons name="logo-whatsapp" size={32} color="#FFF" />
                </LinearGradient>
                <View style={styles.helpCardInfo}>
                  <Text style={styles.helpCardTitle}>واتساب</Text>
                  <Text style={styles.helpCardDesc}>راسلنا مباشرة</Text>
                </View>
                <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.helpCard} 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Linking.openURL('tel:+963999999999');
                  }
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.info, '#1976D2']}
                  style={styles.helpCardGradient}
                >
                  <Ionicons name="call" size={32} color="#FFF" />
                </LinearGradient>
                <View style={styles.helpCardInfo}>
                  <Text style={styles.helpCardTitle}>اتصل بنا</Text>
                  <Text style={styles.helpCardDesc}>+963 999 999 999</Text>
                </View>
                <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpCard} activeOpacity={0.7}>
                <LinearGradient
                  colors={[COLORS.warning, '#F57C00']}
                  style={styles.helpCardGradient}
                >
                  <Ionicons name="chatbubbles" size={32} color="#FFF" />
                </LinearGradient>
                <View style={styles.helpCardInfo}>
                  <Text style={styles.helpCardTitle}>الأسئلة الشائعة</Text>
                  <Text style={styles.helpCardDesc}>إجابات سريعة</Text>
                </View>
                <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
          {/* Fixed Header */}
          <View style={[styles.modalHeader, { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
            <TouchableOpacity 
              onPress={() => setShowAboutModal(false)} 
              activeOpacity={0.7}
              style={{ padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20 }}
            >
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { fontFamily: 'Cairo_700Bold' }]}>عن التطبيق</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg }}>
            <View style={styles.aboutContent}>
              <View style={styles.aboutLogoContainer}>
                <Image 
                  source={require('../../assets/images/logo_food2_small.png')} 
                  style={styles.aboutLogoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.aboutName, { fontFamily: 'Cairo_700Bold' }]}>أكلة عالسريع</Text>
              <Text style={[styles.aboutTagline, { fontFamily: 'Cairo_400Regular' }]}>اطلب أشهى المأكولات بضغطة زر</Text>
              
              <View style={styles.versionBadge}>
                <Text style={[styles.versionBadgeText, { fontFamily: 'Cairo_400Regular' }]}>لوحة المطعم - v1.0.0</Text>
              </View>

              <Text style={[styles.aboutDesc, { fontFamily: 'Cairo_400Regular' }]}>
                لوحة تحكم متكاملة لأصحاب المطاعم لإدارة الطلبات والقوائم والسائقين وتتبع الإحصائيات.
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={[styles.featureText, { fontFamily: 'Cairo_400Regular' }]}>إدارة الطلبات في الوقت الحقيقي</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={[styles.featureText, { fontFamily: 'Cairo_400Regular' }]}>تعيين السائقين بسهولة</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={[styles.featureText, { fontFamily: 'Cairo_400Regular' }]}>إشعارات فورية للطلبات</Text>
                </View>
              </View>

              {/* Developer Info */}
              <View style={styles.developerSection}>
                <View style={styles.developerDivider} />
                <Text style={[styles.developerTitle, { fontFamily: 'Cairo_400Regular' }]}>تم التطوير بواسطة</Text>
                
                <View style={styles.developerLogo}>
                  <Image 
                    source={require('../../assets/images/wethaq-logo.png')} 
                    style={styles.developerLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.developerName, { fontFamily: 'Cairo_600SemiBold' }]}>Wethaq Digital Solutions</Text>
                
                <View style={styles.developerContacts}>
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('https://www.wethaqdigital.com')}
                  >
                    <Text style={[styles.contactText, { fontFamily: 'Cairo_400Regular' }]}>www.wethaqdigital.com</Text>
                    <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('mailto:info@wethaqdigital.com')}
                  >
                    <Text style={[styles.contactText, { fontFamily: 'Cairo_400Regular' }]}>info@wethaqdigital.com</Text>
                    <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('tel:+963981401274')}
                  >
                    <Text style={[styles.contactText, { fontFamily: 'Cairo_400Regular' }]}>+963 981 401 274</Text>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.aboutCopyright, { fontFamily: 'Cairo_400Regular' }]}>© 2026 Wethaq Digital Solutions. All rights reserved.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>تسجيل الخروج</Text>
            <Text style={styles.confirmMessage}>هل تريد تسجيل الخروج من حسابك؟</Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.error, '#C62828']}
                  style={styles.confirmBtnGradient}
                >
                  <Text style={styles.confirmBtnText}>خروج</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaint Modal */}
      <Modal visible={showComplaintModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إرسال شكوى</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.modalInput}
                placeholder="موضوع الشكوى"
                placeholderTextColor={COLORS.textLight}
                value={complaintSubject}
                onChangeText={setComplaintSubject}
                textAlign="right"
              />

              <TextInput
                style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
                placeholder="اكتب تفاصيل الشكوى هنا..."
                placeholderTextColor={COLORS.textLight}
                value={complaintMessage}
                onChangeText={setComplaintMessage}
                textAlign="right"
                multiline
                numberOfLines={5}
              />

              <TouchableOpacity
                style={[styles.submitComplaintBtn, submittingComplaint && { opacity: 0.7 }]}
                onPress={handleSubmitComplaint}
                activeOpacity={0.7}
                disabled={submittingComplaint}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.submitComplaintGradient}
                >
                  <Text style={styles.submitComplaintText}>
                    {submittingComplaint ? 'جاري الإرسال...' : 'إرسال الشكوى'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  headerContent: {
    marginBottom: SPACING.lg,
  },
  profileSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarEmoji: {
    fontSize: 35,
    fontFamily: 'Cairo_400Regular',
  },
  profileInfo: {
    flex: 1,
    marginRight: SPACING.lg,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textWhite,
    fontWeight: '600',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Content
  content: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  menuItemTitle: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Toggle Items
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  toggleContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: SPACING.md,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    ...SHADOWS.small,
  },
  logoutContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.error,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Help Modal
  helpContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  helpCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  helpCardGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpCardInfo: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  helpCardTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  helpCardDesc: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // About Modal
  aboutContent: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  aboutLogo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  aboutEmoji: {
    fontSize: 45,
    fontFamily: 'Cairo_400Regular',
  },
  aboutName: {
    fontSize: 28,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  aboutTagline: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  versionBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.lg,
  },
  versionBadgeText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  aboutDesc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  featuresList: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  aboutCopyright: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.xl,
  },
  aboutLogoContainer: {
    width: 120,
    height: 120,
    borderRadius: 25,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: '#FFE0E0',
  },
  aboutLogoImage: {
    width: 100,
    height: 100,
  },
  developerSection: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    width: '100%',
  },
  developerDivider: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginBottom: SPACING.lg,
  },
  developerTitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  developerLogo: {
    width: 180,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  developerLogoImage: {
    width: 160,
    height: 60,
  },
  developerName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  developerContacts: {
    width: '100%',
    gap: SPACING.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
  },

  // Confirm Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  confirmMessage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitComplaintBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  submitComplaintGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  submitComplaintText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
