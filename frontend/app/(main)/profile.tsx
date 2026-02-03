import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { addressAPI } from '../../src/services/api';
import { Address } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isGuest, setGuestMode } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressArea, setNewAddressArea] = useState('');

  useEffect(() => {
    if (!isGuest) {
      fetchAddresses();
    }
  }, [isGuest]);

  const fetchAddresses = async () => {
    try {
      const data = await addressAPI.getAll();
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddressLabel || !newAddressLine) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const newAddress = await addressAPI.create({
        label: newAddressLabel,
        address_line: newAddressLine,
        area: newAddressArea,
      });
      setAddresses([...addresses, newAddress]);
      setShowAddressModal(false);
      setNewAddressLabel('');
      setNewAddressLine('');
      setNewAddressArea('');
      Alert.alert('تم', 'تمت إضافة العنوان بنجاح ✅');
    } catch (error) {
      Alert.alert('خطأ', 'فشل إضافة العنوان');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert('تأكيد الحذف', 'هل تريد حذف هذا العنوان؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressAPI.delete(addressId);
            setAddresses(addresses.filter((a) => a.id !== addressId));
            Alert.alert('تم', 'تم حذف العنوان ✅');
          } catch (error) {
            Alert.alert('خطأ', 'فشل حذف العنوان');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          if (isGuest) {
            setGuestMode(false);
          } else {
            await logout();
          }
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleNotifications = () => {
    router.push('/(main)/notifications');
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const handleAbout = () => {
    setShowAboutModal(true);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'تواصل معنا',
      'اختر طريقة التواصل',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: '📞 اتصال', 
          onPress: () => Linking.openURL('tel:+963999999999') 
        },
        { 
          text: '💬 واتساب', 
          onPress: () => Linking.openURL('https://wa.me/963999999999') 
        },
      ]
    );
  };

  // Guest View
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>حسابي</Text>
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Ionicons name="person-outline" size={60} color={COLORS.textLight} />
          </View>
          <Text style={styles.guestTitle}>أنت تتصفح كضيف</Text>
          <Text style={styles.guestSubtitle}>سجل دخولك للاستفادة من جميع الميزات</Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => {
              setGuestMode(false);
              router.replace('/(auth)/login');
            }}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.loginButtonGradient}
            >
              <Ionicons name="log-in-outline" size={22} color={COLORS.textWhite} />
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => {
              setGuestMode(false);
              router.push('/(auth)/register');
            }}
          >
            <Text style={styles.registerButtonText}>إنشاء حساب جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items for Guest */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة والدعم</Text>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>عن التطبيق</Text>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>يلا ناكل؟ v1.0.0</Text>

        {/* Help Modal */}
        <Modal visible={showHelpModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>المساعدة والدعم</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.helpContent}>
                <TouchableOpacity style={styles.helpItem} onPress={handleContactSupport}>
                  <View style={[styles.helpIcon, { backgroundColor: `${COLORS.success}15` }]}>
                    <Ionicons name="call" size={24} color={COLORS.success} />
                  </View>
                  <View style={styles.helpInfo}>
                    <Text style={styles.helpTitle}>تواصل معنا</Text>
                    <Text style={styles.helpDesc}>اتصل أو راسلنا عبر واتساب</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.helpItem}>
                  <View style={[styles.helpIcon, { backgroundColor: `${COLORS.info}15` }]}>
                    <Ionicons name="chatbubbles" size={24} color={COLORS.info} />
                  </View>
                  <View style={styles.helpInfo}>
                    <Text style={styles.helpTitle}>الأسئلة الشائعة</Text>
                    <Text style={styles.helpDesc}>إجابات على أكثر الأسئلة شيوعاً</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.helpItem}>
                  <View style={[styles.helpIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                    <Ionicons name="document-text" size={24} color={COLORS.warning} />
                  </View>
                  <View style={styles.helpInfo}>
                    <Text style={styles.helpTitle}>الشروط والأحكام</Text>
                    <Text style={styles.helpDesc}>اقرأ شروط استخدام التطبيق</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* About Modal */}
        <Modal visible={showAboutModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>عن التطبيق</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.aboutContent}>
                <View style={styles.aboutLogo}>
                  <Text style={styles.aboutEmoji}>🍔</Text>
                </View>
                <Text style={styles.aboutName}>يلا ناكل؟</Text>
                <Text style={styles.aboutVersion}>الإصدار 1.0.0</Text>
                <Text style={styles.aboutDesc}>
                  تطبيق توصيل الطعام الأسرع والأسهل في سوريا!
                  اطلب من أكثر من 200 مطعم واستمتع بتوصيل سريع لباب بيتك.
                </Text>

                <View style={styles.aboutFeatures}>
                  <View style={styles.aboutFeature}>
                    <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                    <Text style={styles.aboutFeatureText}>+200 مطعم</Text>
                  </View>
                  <View style={styles.aboutFeature}>
                    <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                    <Text style={styles.aboutFeatureText}>توصيل سريع</Text>
                  </View>
                  <View style={styles.aboutFeature}>
                    <Ionicons name="card" size={20} color={COLORS.primary} />
                    <Text style={styles.aboutFeatureText}>دفع آمن</Text>
                  </View>
                </View>

                <Text style={styles.aboutCopyright}>© 2025 يلا ناكل؟ - جميع الحقوق محفوظة</Text>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>عناويني</Text>
              <Ionicons name="location" size={20} color={COLORS.primary} />
            </View>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyAddresses}>
              <Text style={styles.emptyText}>لا توجد عناوين محفوظة</Text>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => setShowAddressModal(true)}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
                <Text style={styles.addAddressText}>إضافة عنوان</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteAddress(address.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  <Text style={styles.addressLine}>{address.address_line}</Text>
                  {address.area && (
                    <Text style={styles.addressArea}>{address.area}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الإشعارات</Text>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة والدعم</Text>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>عن التطبيق</Text>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>

        <Text style={styles.version}>يلا ناكل؟ v1.0.0</Text>
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة عنوان جديد</Text>
              <View style={{ width: 24 }} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="اسم العنوان (مثل: المنزل)"
              placeholderTextColor={COLORS.textLight}
              value={newAddressLabel}
              onChangeText={setNewAddressLabel}
              textAlign="right"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="العنوان بالتفصيل"
              placeholderTextColor={COLORS.textLight}
              value={newAddressLine}
              onChangeText={setNewAddressLine}
              textAlign="right"
              multiline
            />

            <TextInput
              style={styles.modalInput}
              placeholder="المنطقة (اختياري)"
              placeholderTextColor={COLORS.textLight}
              value={newAddressArea}
              onChangeText={setNewAddressArea}
              textAlign="right"
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleAddAddress}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>حفظ العنوان</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>المساعدة والدعم</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.helpContent}>
              <TouchableOpacity style={styles.helpItem} onPress={handleContactSupport}>
                <View style={[styles.helpIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="call" size={24} color={COLORS.success} />
                </View>
                <View style={styles.helpInfo}>
                  <Text style={styles.helpTitle}>تواصل معنا</Text>
                  <Text style={styles.helpDesc}>اتصل أو راسلنا عبر واتساب</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpItem}>
                <View style={[styles.helpIcon, { backgroundColor: `${COLORS.info}15` }]}>
                  <Ionicons name="chatbubbles" size={24} color={COLORS.info} />
                </View>
                <View style={styles.helpInfo}>
                  <Text style={styles.helpTitle}>الأسئلة الشائعة</Text>
                  <Text style={styles.helpDesc}>إجابات على أكثر الأسئلة شيوعاً</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpItem}>
                <View style={[styles.helpIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                  <Ionicons name="document-text" size={24} color={COLORS.warning} />
                </View>
                <View style={styles.helpInfo}>
                  <Text style={styles.helpTitle}>الشروط والأحكام</Text>
                  <Text style={styles.helpDesc}>اقرأ شروط استخدام التطبيق</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>عن التطبيق</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.aboutContent}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutEmoji}>🍔</Text>
              </View>
              <Text style={styles.aboutName}>يلا ناكل؟</Text>
              <Text style={styles.aboutVersion}>الإصدار 1.0.0</Text>
              <Text style={styles.aboutDesc}>
                تطبيق توصيل الطعام الأسرع والأسهل في سوريا!
                اطلب من أكثر من 200 مطعم واستمتع بتوصيل سريع لباب بيتك.
              </Text>

              <View style={styles.aboutFeatures}>
                <View style={styles.aboutFeature}>
                  <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                  <Text style={styles.aboutFeatureText}>+200 مطعم</Text>
                </View>
                <View style={styles.aboutFeature}>
                  <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                  <Text style={styles.aboutFeatureText}>توصيل سريع</Text>
                </View>
                <View style={styles.aboutFeature}>
                  <Ionicons name="card" size={20} color={COLORS.primary} />
                  <Text style={styles.aboutFeatureText}>دفع آمن</Text>
                </View>
              </View>

              <Text style={styles.aboutCopyright}>© 2025 يلا ناكل؟ - جميع الحقوق محفوظة</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },

  // Guest Container
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  guestIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  guestSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  loginButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  loginButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    paddingVertical: SPACING.md,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 35,
  },
  userInfo: {
    flex: 1,
    marginRight: SPACING.lg,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Section
  section: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Empty Addresses
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  addAddressButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  addAddressText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Address Card
  addressCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  addressInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addressLine: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  addressArea: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.sm,
  },

  // Menu Section
  menuSection: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingBottom: 30,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  modalButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Help Content
  helpContent: {
    gap: SPACING.md,
  },
  helpItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  helpIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpInfo: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  helpDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // About Content
  aboutContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  aboutLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  aboutEmoji: {
    fontSize: 40,
  },
  aboutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  aboutVersion: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  aboutDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  aboutFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  aboutFeature: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  aboutFeatureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  aboutCopyright: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
