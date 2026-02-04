import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

export default function AdminSettings() {
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return;
    }
    if (newPassword !== confirmPassword) {
      return;
    }
    if (newPassword.length < 6) {
      return;
    }
    setChangingPassword(true);
    // TODO: Implement password change API
    setTimeout(() => {
      setChangingPassword(false);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  const handleClearTestData = async () => {
    setClearingData(true);
    try {
      await api.delete('/admin/test-data');
      setShowClearDataModal(false);
      if (Platform.OS === 'web') {
        alert('تم حذف البيانات التجريبية بنجاح!');
      } else {
        Alert.alert('نجاح', 'تم حذف البيانات التجريبية بنجاح!');
      }
    } catch (error: any) {
      console.error('Error clearing test data:', error);
      const msg = error.response?.data?.detail || 'فشل في حذف البيانات التجريبية';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('خطأ', msg);
      }
    } finally {
      setClearingData(false);
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemContent}>
        <View>
          <Text style={[styles.menuItemTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.menuIconContainer, danger && styles.dangerIcon]}>
          <Ionicons name={icon} size={22} color={danger ? '#ef4444' : '#6366f1'} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'م'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'مدير التطبيق'}</Text>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.adminBadgeText}>مدير النظام</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title="معلومات الحساب"
              subtitle={user?.phone}
              onPress={() => {}}
            />
            <MenuItem
              icon="key-outline"
              title="تغيير كلمة المرور"
              onPress={() => setShowPasswordModal(true)}
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات التطبيق</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="information-circle-outline"
              title="عن التطبيق"
              subtitle="يلا ناكل؟ - إصدار 1.0.0"
              onPress={() => setShowAboutModal(true)}
            />
            <MenuItem
              icon="document-text-outline"
              title="سياسة الخصوصية"
              onPress={() => setShowPrivacyModal(true)}
            />
            <MenuItem
              icon="shield-outline"
              title="شروط الاستخدام"
              onPress={() => setShowTermsModal(true)}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              title="تسجيل الخروج"
              onPress={() => setShowLogoutModal(true)}
              danger
            />
          </View>
        </View>

        {/* Developer Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أدوات المطور</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="trash-outline"
              title="حذف البيانات التجريبية"
              subtitle="حذف جميع المطاعم والمستخدمين التجريبيين"
              onPress={() => setShowClearDataModal(true)}
              danger
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>يلا ناكل؟ © 2025</Text>
          <Text style={styles.footerSubtext}>جميع الحقوق محفوظة</Text>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>تسجيل الخروج</Text>
            <Text style={styles.confirmMessage}>هل أنت متأكد من تسجيل الخروج؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.dangerBtn]}
                onPress={handleLogout}
              >
                <Text style={styles.dangerBtnText}>خروج</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>عن التطبيق</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.aboutContent}>
              <View style={styles.appLogo}>
                <Text style={styles.logoEmoji}>🍔</Text>
              </View>
              <Text style={styles.appName}>يلا ناكل؟</Text>
              <Text style={styles.appVersion}>الإصدار 1.0.0</Text>
              <Text style={styles.appDescription}>
                تطبيق توصيل الطعام الأسرع والأسهل في سوريا!{'\n'}
                نوصل طلباتك من أفضل المطاعم إلى باب بيتك.
              </Text>
              <View style={styles.appFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons name="restaurant" size={20} color="#6366f1" />
                  <Text style={styles.featureText}>مطاعم متنوعة</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="bicycle" size={20} color="#6366f1" />
                  <Text style={styles.featureText}>توصيل سريع</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
                  <Text style={styles.featureText}>دفع آمن</Text>
                </View>
              </View>
              <Text style={styles.copyright}>© 2025 يلا ناكل؟ - جميع الحقوق محفوظة</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>سياسة الخصوصية</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.policyContent}>
              <Text style={styles.policyTitle}>1. جمع المعلومات</Text>
              <Text style={styles.policyText}>
                نجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، بما في ذلك اسمك ورقم هاتفك وعنوانك.
              </Text>
              
              <Text style={styles.policyTitle}>2. استخدام المعلومات</Text>
              <Text style={styles.policyText}>
                نستخدم معلوماتك لتقديم خدماتنا، ومعالجة طلباتك، والتواصل معك بشأن حسابك.
              </Text>
              
              <Text style={styles.policyTitle}>3. حماية المعلومات</Text>
              <Text style={styles.policyText}>
                نتخذ إجراءات أمنية لحماية معلوماتك من الوصول غير المصرح به أو الكشف عنها.
              </Text>
              
              <Text style={styles.policyTitle}>4. مشاركة المعلومات</Text>
              <Text style={styles.policyText}>
                لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة إلا عند الضرورة لتقديم خدماتنا.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>شروط الاستخدام</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.policyContent}>
              <Text style={styles.policyTitle}>1. قبول الشروط</Text>
              <Text style={styles.policyText}>
                باستخدامك لتطبيق يلا ناكل؟، فإنك توافق على الالتزام بهذه الشروط والأحكام.
              </Text>
              
              <Text style={styles.policyTitle}>2. استخدام الخدمة</Text>
              <Text style={styles.policyText}>
                يجب عليك استخدام التطبيق لأغراض مشروعة فقط والامتثال لجميع القوانين المعمول بها.
              </Text>
              
              <Text style={styles.policyTitle}>3. الحسابات</Text>
              <Text style={styles.policyText}>
                أنت مسؤول عن الحفاظ على سرية معلومات حسابك وعن جميع الأنشطة التي تتم تحت حسابك.
              </Text>
              
              <Text style={styles.policyTitle}>4. الطلبات والدفع</Text>
              <Text style={styles.policyText}>
                عند تقديم طلب، فإنك توافق على دفع السعر المحدد بما في ذلك رسوم التوصيل.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.passwordForm}>
              <Text style={styles.inputLabel}>كلمة المرور الحالية</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textAlign="right"
              />

              <TouchableOpacity
                style={[styles.changePasswordBtn, changingPassword && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.changePasswordBtnText}>تغيير كلمة المرور</Text>
                )}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'System',
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: '#fee2e2',
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
  },
  dangerText: {
    color: '#ef4444',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'System',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#6b7280',
    fontFamily: 'System',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'System',
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
  infoModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '80%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  aboutContent: {
    padding: 20,
    alignItems: 'center',
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 15,
    color: '#4b5563',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  appFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'System',
  },
  copyright: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'System',
  },
  policyContent: {
    padding: 20,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: 'System',
    textAlign: 'right',
    lineHeight: 22,
  },
  passwordForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  changePasswordBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  changePasswordBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
});
