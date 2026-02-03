import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface RestaurantDriver {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  is_active: boolean;
}

export default function DriversManagement() {
  const [drivers, setDrivers] = useState<RestaurantDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<RestaurantDriver | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDrivers = async () => {
    try {
      const data = await restaurantPanelAPI.getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const openAddModal = () => {
    setEditingDriver(null);
    setFormName('');
    setFormPhone('');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (driver: RestaurantDriver) => {
    setEditingDriver(driver);
    setFormName(driver.name);
    setFormPhone(driver.phone);
    setFormNotes(driver.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        phone: formPhone.trim(),
        notes: formNotes.trim() || undefined,
      };

      if (editingDriver) {
        await restaurantPanelAPI.updateDriver(editingDriver.id, data);
      } else {
        await restaurantPanelAPI.addDriver(data);
      }

      setShowModal(false);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error saving driver:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!driverToDelete) return;
    
    try {
      await restaurantPanelAPI.deleteDriver(driverToDelete);
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
    } finally {
      setConfirmDeleteVisible(false);
      setDriverToDelete(null);
    }
  };

  const confirmDelete = (driverId: string) => {
    setDriverToDelete(driverId);
    setConfirmDeleteVisible(true);
  };

  const callDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const whatsappDriver = (phone: string) => {
    // Remove leading 0 and add Syria country code
    const formattedPhone = phone.startsWith('0') ? `963${phone.slice(1)}` : phone;
    Linking.openURL(`https://wa.me/${formattedPhone}`);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>إدارة السائقين</Text>
        <Text style={styles.headerSubtitle}>سائقين خاصين بمطعمك</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={22} color={COLORS.textWhite} />
          <Text style={styles.addButtonText}>إضافة سائق جديد</Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.info} />
          <Text style={styles.infoText}>
            هؤلاء السائقين تابعين لمطعمك. عند تعيينهم على طلب، ستحتاج للتواصل معهم يدوياً.
          </Text>
        </View>

        {/* Drivers List */}
        {drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>لا يوجد سائقين مسجلين</Text>
            <Text style={styles.emptySubtext}>أضف سائقين لتعيينهم على الطلبات</Text>
          </View>
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id}
            renderItem={({ item: driver }) => (
              <View style={styles.driverCard}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                    {driver.notes && (
                      <Text style={styles.driverNotes}>{driver.notes}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.driverActions}>
                  {/* Contact Buttons */}
                  <TouchableOpacity 
                    style={[styles.contactButton, styles.whatsappButton]}
                    onPress={() => whatsappDriver(driver.phone)}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.contactButton, styles.callButton]}
                    onPress={() => callDriver(driver.phone)}
                  >
                    <Ionicons name="call" size={20} color={COLORS.success} />
                  </TouchableOpacity>
                  
                  {/* Edit/Delete */}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openEditModal(driver)}
                  >
                    <Ionicons name="create-outline" size={20} color={COLORS.info} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => confirmDelete(driver.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          />
        )}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingDriver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>اسم السائق *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="مثال: أحمد محمد"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>رقم الهاتف *</Text>
              <TextInput
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="مثال: 0912345678"
                keyboardType="phone-pad"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="مثال: يعمل في الفترة المسائية"
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (!formName || !formPhone) && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!formName || !formPhone || saving}
            >
              <LinearGradient
                colors={formName && formPhone ? [COLORS.primary, COLORS.primaryDark] : [COLORS.textLight, COLORS.textLight]}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <Text style={styles.saveButtonText}>حفظ</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmDeleteVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons name="warning-outline" size={50} color={COLORS.warning} />
            <Text style={styles.confirmTitle}>تأكيد الحذف</Text>
            <Text style={styles.confirmMessage}>هل تريد حذف هذا السائق؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>حذف</Text>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  addButtonText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: `${COLORS.info}15`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    textAlign: 'right',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  driverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  driverInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  driverDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  driverPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverNotes: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  whatsappButton: {
    borderColor: '#25D366',
    backgroundColor: '#25D36610',
  },
  callButton: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalForm: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    margin: SPACING.lg,
    marginTop: 0,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Confirm Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  confirmContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
});
