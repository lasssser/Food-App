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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { addressAPI } from '../../src/services/api';
import { Address } from '../../src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressArea, setNewAddressArea] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

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
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#FF6B35" />
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
              <Ionicons name="add-circle" size={24} color="#FF6B35" />
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>عناويني</Text>
              <Ionicons name="location" size={20} color="#FF6B35" />
            </View>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyAddresses}>
              <Text style={styles.emptyText}>لا توجد عناوين محفوظة</Text>
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => setShowAddressModal(true)}
              >
                <Ionicons name="add" size={20} color="#FF6B35" />
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
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
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
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الإشعارات</Text>
              <Ionicons name="notifications-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة والدعم</Text>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>عن التطبيق</Text>
              <Ionicons name="information-circle-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
          <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
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
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة عنوان جديد</Text>
              <View style={{ width: 24 }} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="اسم العنوان (مثل: المنزل)"
              placeholderTextColor="#999"
              value={newAddressLabel}
              onChangeText={setNewAddressLabel}
              textAlign="right"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="العنوان بالتفصيل"
              placeholderTextColor="#999"
              value={newAddressLine}
              onChangeText={setNewAddressLine}
              textAlign="right"
              multiline
            />

            <TextInput
              style={styles.modalInput}
              placeholder="المنطقة (اختياري)"
              placeholderTextColor="#999"
              value={newAddressArea}
              onChangeText={setNewAddressArea}
              textAlign="right"
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleAddAddress}>
              <Text style={styles.modalButtonText}>حفظ العنوان</Text>
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  addAddressButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    color: '#FF6B35',
  },
  addressCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  addressInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  addressLine: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  addressArea: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
