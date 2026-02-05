import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { addressAPI, complaintsAPI, settingsAPI } from '../../src/services/api';
import { Address } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isGuest, setGuestMode } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [supportWhatsapp, setSupportWhatsapp] = useState('+963981401274');
  const [newAddressArea, setNewAddressArea] = useState('');
  // Complaint states
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      fetchAddresses();
    }
  }, [isGuest]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await settingsAPI.get();
      if (settings.whatsapp_number) {
        setSupportWhatsapp(settings.whatsapp_number);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

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
    } catch (error) {
      console.error('Error adding address:', error);
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    
    try {
      await addressAPI.delete(addressToDelete);
      setAddresses(addresses.filter((a) => a.id !== addressToDelete));
      setShowDeleteModal(false);
      setAddressToDelete(null);
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  const handleLogout = async () => {
    if (isGuest) {
      setGuestMode(false);
    } else {
      await logout();
    }
    router.replace('/(auth)/login');
  };

  const handleNotifications = () => {
    router.push('/(main)/notifications');
  };

  const handleContactSupport = () => {
    // Clean the phone number (remove + and spaces)
    const cleanNumber = supportWhatsapp.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}`;
    
    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank');
    } else {
      Linking.openURL(whatsappUrl);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintMessage.trim()) {
      return;
    }
    setSubmittingComplaint(true);
    try {
      await complaintsAPI.submit(complaintSubject.trim(), complaintMessage.trim(), 'customer');
      setShowComplaintModal(false);
      setComplaintSubject('');
      setComplaintMessage('');
      // Show success alert
      if (Platform.OS === 'web') {
        alert('تم إرسال الشكوى بنجاح، سنتواصل معك قريباً');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
    } finally {
      setSubmittingComplaint(false);
    }
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
            activeOpacity={0.7}
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
            activeOpacity={0.7}
          >
            <Text style={styles.registerButtonText}>إنشاء حساب جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items for Guest */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة والدعم</Text>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowAboutModal(true)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>عن التطبيق</Text>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>أكلة عالسريع v1.0.0</Text>

        {/* Help Modal */}
        <Modal visible={showHelpModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowHelpModal(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>المساعدة والدعم</Text>
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
              </View>
            </View>
          </View>
        </Modal>

        {/* About Modal */}
        <Modal visible={showAboutModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '95%' }]}>
              <View style={[styles.modalHeader, { marginTop: 15, marginBottom: 10 }]}>
                <TouchableOpacity 
                  onPress={() => setShowAboutModal(false)} 
                  activeOpacity={0.7}
                  style={{ padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20 }}
                >
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>عن التطبيق</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.aboutContent}>
                  <View style={styles.aboutLogo}>
                    <Image 
                      source={require('../../assets/images/logo_food2_small.png')} 
                      style={styles.aboutLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.aboutName}>أكلة عالسريع</Text>
                  <Text style={styles.aboutVersion}>الإصدار 1.0.0</Text>
                  <Text style={styles.aboutDesc}>
                    تطبيق توصيل الطعام الأسرع والأسهل!
                  </Text>
                </View>

                {/* Developer Info */}
                <View style={styles.developerSection}>
                  <View style={styles.developerDivider} />
                  <Text style={styles.developerTitle}>تم التطوير بواسطة</Text>
                  
                  <View style={styles.developerLogo}>
                    <Image 
                      source={require('../../assets/images/wethaq-logo.png')} 
                      style={styles.developerLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.developerName}>Wethaq Digital Solutions</Text>
                  
                  <View style={styles.developerContacts}>
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => Linking.openURL('https://www.wethaqdigital.com')}
                    >
                      <Text style={styles.contactText}>www.wethaqdigital.com</Text>
                      <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => Linking.openURL('mailto:info@wethaqdigital.com')}
                    >
                      <Text style={styles.contactText}>info@wethaqdigital.com</Text>
                      <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => Linking.openURL('tel:+963981401274')}
                    >
                      <Text style={styles.contactText}>+963 981 401 274</Text>
                      <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.copyright}>© 2026 Wethaq Digital Solutions. All rights reserved.</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>حسابي</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.avatarContainer}
          >
            <Ionicons name="person" size={35} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
          </View>
          <View style={styles.userBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.userBadgeText}>حساب موثق</Text>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(true)} activeOpacity={0.7}>
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
                activeOpacity={0.7}
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
                  onPress={() => {
                    setAddressToDelete(address.id);
                    setShowDeleteModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.deleteIconContainer}>
                    <Ionicons name="trash" size={20} color={COLORS.error} />
                  </View>
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
          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الإشعارات</Text>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowComplaintModal(true)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>إرسال شكوى</Text>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(main)/my-complaints')} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>شكاواي</Text>
              <Ionicons name="chatbubbles-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowHelpModal(true)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة والدعم</Text>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowAboutModal(true)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>عن التطبيق</Text>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        <Text style={styles.version}>أكلة عالسريع v1.0.0</Text>
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} activeOpacity={0.7}>
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

            <TouchableOpacity style={styles.saveButton} onPress={handleAddAddress} activeOpacity={0.7}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>حفظ العنوان</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="trash" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>حذف العنوان</Text>
            <Text style={styles.confirmMessage}>هل تريد حذف هذا العنوان؟</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowDeleteModal(false);
                  setAddressToDelete(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteConfirmButton} 
                onPress={handleDeleteAddress}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmButtonText}>حذف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.confirmModalOverlay}>
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
                style={styles.deleteConfirmButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmButtonText}>خروج</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>المساعدة والدعم</Text>
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
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', paddingTop: 0 }]}>
            <SafeAreaView edges={['top']}>
              <View style={[styles.modalHeader, { paddingTop: SPACING.lg, marginBottom: SPACING.md }]}>
                <TouchableOpacity 
                  onPress={() => setShowAboutModal(false)} 
                  activeOpacity={0.7}
                  style={{ padding: 10, backgroundColor: '#f0f0f0', borderRadius: 22 }}
                >
                  <Ionicons name="close" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { fontFamily: 'Cairo_700Bold' }]}>عن التطبيق</Text>
                <View style={{ width: 42 }} />
              </View>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: SPACING.lg }}>
              <View style={styles.aboutContent}>
                <View style={styles.aboutLogo}>
                  <Image 
                    source={require('../../assets/images/logo_food2_small.png')} 
                    style={styles.aboutLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.aboutName, { fontFamily: 'Cairo_700Bold' }]}>أكلة عالسريع</Text>
                <Text style={[styles.aboutVersion, { fontFamily: 'Cairo_400Regular' }]}>الإصدار 1.0.0</Text>
                <Text style={[styles.aboutDesc, { fontFamily: 'Cairo_400Regular' }]}>
                  تطبيق توصيل الطعام الأسرع والأسهل!
                </Text>
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
                    <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('mailto:info@wethaqdigital.com')}
                  >
                    <Text style={[styles.contactText, { fontFamily: 'Cairo_400Regular' }]}>info@wethaqdigital.com</Text>
                    <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('tel:+963981401274')}
                  >
                    <Text style={[styles.contactText, { fontFamily: 'Cairo_400Regular' }]}>+963 981 401 274</Text>
                    <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.copyright, { fontFamily: 'Cairo_400Regular' }]}>© 2026 Wethaq Digital Solutions. All rights reserved.</Text>
              </View>
            </ScrollView>
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
              style={[styles.saveButton, submittingComplaint && { opacity: 0.7 }]} 
              onPress={handleSubmitComplaint} 
              activeOpacity={0.7}
              disabled={submittingComplaint}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>
                  {submittingComplaint ? 'جاري الإرسال...' : 'إرسال الشكوى'}
                </Text>
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
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl + 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: '#FFFFFF',
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
    marginHorizontal: SPACING.lg,
    marginTop: -30,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    ...SHADOWS.medium,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  userPhone: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  userBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  userBadgeText: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.success,
  },

  // Section
  section: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
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
    marginLeft: SPACING.md,
  },
  deleteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Menu Section
  menuSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
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
    fontFamily: 'Cairo_400Regular',
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
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
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
    paddingBottom: 100,
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
    paddingTop: SPACING.xxl + 10,
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
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Confirm Modal
  confirmModalOverlay: {
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
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  confirmMessage: {
    fontSize: 14,
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
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
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
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  aboutLogoImage: {
    width: 80,
    height: 80,
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
  aboutCopyright: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  developerSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    alignItems: 'center',
  },
  developerDivider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  developerTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontFamily: 'Cairo_400Regular',
  },
  developerLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  developerLogoImage: {
    width: 90,
    height: 90,
  },
  developerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    fontFamily: 'Cairo_700Bold',
  },
  developerContacts: {
    width: '100%',
    gap: SPACING.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: 'Cairo_400Regular',
  },
  copyright: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontFamily: 'Cairo_400Regular',
  },
});
