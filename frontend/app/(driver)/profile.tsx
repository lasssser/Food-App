import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { complaintsAPI, driverAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const CITIES = [
  { id: 'damascus', name: 'دمشق' },
  { id: 'aleppo', name: 'حلب' },
  { id: 'homs', name: 'حمص' },
  { id: 'latakia', name: 'اللاذقية' },
  { id: 'tartous', name: 'طرطوس' },
];

export default function DriverProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(user?.city_id || '');
  const [savingCity, setSavingCity] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const handleSelectCity = async (cityId: string) => {
    setSavingCity(true);
    try {
      await driverAPI.updateCity(cityId);
      setSelectedCity(cityId);
      setShowCityModal(false);
      Alert.alert('نجاح', 'تم تحديث المدينة بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث المدينة');
    } finally {
      setSavingCity(false);
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
      Linking.openURL('https://wa.me/963999999999');
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintMessage.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    setSubmittingComplaint(true);
    try {
      await complaintsAPI.submit(complaintSubject.trim(), complaintMessage.trim(), 'driver');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>سائق توصيل</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          {/* City Selection - Required */}
          <TouchableOpacity 
            style={[styles.menuItem, !selectedCity && { backgroundColor: '#FFF5F5' }]}
            onPress={() => setShowCityModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, !selectedCity && { color: COLORS.error }]}>
                {selectedCity 
                  ? `المدينة: ${CITIES.find(c => c.id === selectedCity)?.name || selectedCity}`
                  : 'اختر مدينتك (إلزامي!)'}
              </Text>
              <View style={[styles.menuIcon, { backgroundColor: !selectedCity ? `${COLORS.error}15` : `${COLORS.primary}15` }]}>
                <Ionicons name="location" size={20} color={!selectedCity ? COLORS.error : COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/(driver)/myorders')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>سجل التوصيلات</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.info}15` }]}>
                <Ionicons name="document-text" size={20} color={COLORS.info} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/(driver)/dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الأرباح</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.success}15` }]}>
                <Ionicons name="wallet" size={20} color={COLORS.success} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/(driver)/available')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الإشعارات</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                <Ionicons name="notifications" size={20} color={COLORS.warning} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowComplaintModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>إرسال شكوى</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.error}15` }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.error} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/(driver)/my-complaints')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>شكاواي</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.info}15` }]}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.info} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowHelpModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.accent}15` }]}>
                <Ionicons name="help-circle" size={20} color={COLORS.accent} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        <Text style={styles.version}>أكلة عالسريع - تطبيق السائق v1.0.0</Text>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>تسجيل الخروج</Text>
            <Text style={styles.confirmMessage}>هل تريد تسجيل الخروج من حسابك؟</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>خروج</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.helpModalOverlay}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpModalHeader}>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.helpModalTitle}>المساعدة والدعم</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.helpContent}>
              <TouchableOpacity style={styles.helpItem} onPress={handleContactSupport} activeOpacity={0.7}>
                <View style={[styles.helpIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="logo-whatsapp" size={24} color={COLORS.success} />
                </View>
                <View style={styles.helpInfo}>
                  <Text style={styles.helpTitle}>تواصل معنا</Text>
                  <Text style={styles.helpDesc}>راسلنا عبر واتساب</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpItem} activeOpacity={0.7}>
                <View style={[styles.helpIcon, { backgroundColor: `${COLORS.info}15` }]}>
                  <Ionicons name="call" size={24} color={COLORS.info} />
                </View>
                <View style={styles.helpInfo}>
                  <Text style={styles.helpTitle}>اتصل بالدعم</Text>
                  <Text style={styles.helpDesc}>+963 999 999 999</Text>
                </View>
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
          <View style={styles.complaintModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إرسال شكوى</Text>
              <View style={{ width: 24 }} />
            </View>

            <TextInput
              style={styles.complaintInput}
              placeholder="موضوع الشكوى"
              placeholderTextColor={COLORS.textLight}
              value={complaintSubject}
              onChangeText={setComplaintSubject}
              textAlign="right"
            />

            <TextInput
              style={[styles.complaintInput, { height: 120, textAlignVertical: 'top' }]}
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
                colors={[COLORS.primary, '#1565C0']}
                style={styles.submitComplaintGradient}
              >
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitComplaintText}>إرسال الشكوى</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
  header: {
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
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
  userInfo: {
    flex: 1,
    marginRight: SPACING.lg,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userPhone: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
  },
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
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
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
    paddingBottom: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
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
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },

  // Help Modal
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  helpModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  helpModalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  helpDesc: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  complaintModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  complaintInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  submitComplaintBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  submitComplaintGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitComplaintText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: '#fff',
  },
});
