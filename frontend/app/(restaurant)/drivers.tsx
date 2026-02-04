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
  ScrollView,
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
  total_deliveries?: number;
  rating?: number;
}

interface DriverStats {
  total: number;
  active: number;
  onDelivery: number;
}

export default function DriversManagement() {
  const [drivers, setDrivers] = useState<RestaurantDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DriverStats>({ total: 0, active: 0, onDelivery: 0 });
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<RestaurantDriver | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<RestaurantDriver | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDrivers = async () => {
    try {
      const data = await restaurantPanelAPI.getDrivers();
      setDrivers(data);
      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter((d: RestaurantDriver) => d.is_active !== false).length,
        onDelivery: 0, // This would be calculated from active orders
      });
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

  const viewDriverDetails = (driver: RestaurantDriver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Validate phone number
    if (!/^09\d{8}$/.test(formPhone.trim())) {
      Alert.alert('تنبيه', 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 09 ويتكون من 10 أرقام');
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
        Alert.alert('تم', 'تم تحديث بيانات السائق بنجاح');
      } else {
        await restaurantPanelAPI.addDriver(data);
        Alert.alert('تم', 'تم إضافة السائق بنجاح');
      }

      setShowModal(false);
      fetchDrivers();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!driverToDelete) return;
    
    try {
      await restaurantPanelAPI.deleteDriver(driverToDelete);
      Alert.alert('تم', 'تم حذف السائق بنجاح');
      fetchDrivers();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حذف السائق');
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

  const whatsappDriver = (phone: string, message?: string) => {
    const formattedPhone = phone.startsWith('0') ? `963${phone.slice(1)}` : phone;
    const url = message 
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${formattedPhone}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل السائقين...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>إدارة السائقين</Text>
            <Text style={styles.headerSubtitle}>سائقين خاصين بمطعمك</Text>
          </View>
          <TouchableOpacity style={styles.addHeaderButton} onPress={openAddModal}>
            <Ionicons name="person-add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>متاح</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.onDelivery}</Text>
            <Text style={styles.statLabel}>في توصيل</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={openAddModal}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <Ionicons name="person-add" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText}>إضافة سائق</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => {
              if (drivers.length > 0) {
                const activeDrivers = drivers.filter(d => d.is_active !== false);
                if (activeDrivers.length > 0) {
                  whatsappDriver(activeDrivers[0].phone, 'مرحباً، لدينا طلب جديد هل أنت متاح؟');
                }
              }
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#25D36615' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <Text style={styles.quickActionText}>مراسلة سريعة</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color={COLORS.info} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>كيف تعمل هذه الميزة؟</Text>
            <Text style={styles.infoText}>
              أضف سائقين تابعين لمطعمك هنا. عند وصول طلب جديد، يمكنك تعيين أحدهم والتواصل معه مباشرة عبر الهاتف أو واتساب.
            </Text>
          </View>
        </View>

        {/* Drivers List */}
        {drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bicycle-outline" size={60} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>لا يوجد سائقين مسجلين</Text>
            <Text style={styles.emptySubtext}>أضف سائقين لتعيينهم على الطلبات</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.emptyButtonGradient}
              >
                <Ionicons name="add" size={20} color={COLORS.textWhite} />
                <Text style={styles.emptyButtonText}>إضافة أول سائق</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.driversList}>
            <Text style={styles.sectionTitle}>السائقين المسجلين ({drivers.length})</Text>
            {drivers.map((driver) => (
              <TouchableOpacity 
                key={driver.id} 
                style={styles.driverCard}
                onPress={() => viewDriverDetails(driver)}
                activeOpacity={0.7}
              >
                <View style={styles.driverMain}>
                  <View style={styles.driverAvatar}>
                    <Ionicons name="person" size={28} color={COLORS.primary} />
                  </View>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverNameRow}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: driver.is_active !== false ? `${COLORS.success}15` : `${COLORS.textLight}15` }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: driver.is_active !== false ? COLORS.success : COLORS.textLight }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: driver.is_active !== false ? COLORS.success : COLORS.textLight }
                        ]}>
                          {driver.is_active !== false ? 'متاح' : 'غير متاح'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                    {driver.notes && (
                      <Text style={styles.driverNotes} numberOfLines={1}>{driver.notes}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.whatsappBtn]}
                    onPress={() => whatsappDriver(driver.phone)}
                  >
                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => callDriver(driver.phone)}
                  >
                    <Ionicons name="call" size={22} color={COLORS.success} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(driver)}
                  >
                    <Ionicons name="create" size={22} color={COLORS.info} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => confirmDelete(driver.id)}
                  >
                    <Ionicons name="trash" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

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

            <ScrollView style={styles.modalForm}>
              {/* Avatar Preview */}
              <View style={styles.avatarPreview}>
                <View style={styles.avatarPreviewCircle}>
                  <Ionicons name="person" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.avatarPreviewText}>
                  {formName || 'اسم السائق'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>اسم السائق *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="مثال: أحمد محمد"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="right"
                />
              </View>

              <Text style={styles.inputLabel}>رقم الهاتف *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="مثال: 0912345678"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="phone-pad"
                  textAlign="right"
                  maxLength={10}
                />
              </View>

              <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
              <View style={[styles.inputContainer, styles.notesContainer]}>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="مثال: يعمل في الفترة المسائية، سيارة لون أبيض..."
                  placeholderTextColor={COLORS.textLight}
                  textAlign="right"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
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
                    <>
                      <Ionicons name={editingDriver ? 'checkmark' : 'add'} size={22} color={COLORS.textWhite} />
                      <Text style={styles.saveButtonText}>
                        {editingDriver ? 'حفظ التعديلات' : 'إضافة السائق'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Driver Details Modal */}
      <Modal visible={showDriverDetails} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <View style={styles.detailsHeader}>
              <TouchableOpacity onPress={() => setShowDriverDetails(false)}>
                <Ionicons name="close" size={24} color={COLORS.textWhite} />
              </TouchableOpacity>
            </View>

            {selectedDriver && (
              <>
                <View style={styles.detailsAvatar}>
                  <View style={styles.detailsAvatarCircle}>
                    <Ionicons name="person" size={50} color={COLORS.primary} />
                  </View>
                  <Text style={styles.detailsName}>{selectedDriver.name}</Text>
                  <Text style={styles.detailsPhone}>{selectedDriver.phone}</Text>
                  <View style={[
                    styles.detailsStatusBadge,
                    { backgroundColor: selectedDriver.is_active !== false ? `${COLORS.success}20` : `${COLORS.textLight}20` }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: selectedDriver.is_active !== false ? COLORS.success : COLORS.textLight }
                    ]} />
                    <Text style={[
                      styles.detailsStatusText,
                      { color: selectedDriver.is_active !== false ? COLORS.success : COLORS.textLight }
                    ]}>
                      {selectedDriver.is_active !== false ? 'متاح للتوصيل' : 'غير متاح حالياً'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsBody}>
                  {selectedDriver.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>ملاحظات</Text>
                      <Text style={styles.detailsNotes}>{selectedDriver.notes}</Text>
                    </View>
                  )}

                  <View style={styles.detailsActions}>
                    <TouchableOpacity 
                      style={styles.detailsActionBtn}
                      onPress={() => callDriver(selectedDriver.phone)}
                    >
                      <LinearGradient
                        colors={[COLORS.success, '#43A047']}
                        style={styles.detailsActionGradient}
                      >
                        <Ionicons name="call" size={24} color={COLORS.textWhite} />
                        <Text style={styles.detailsActionText}>اتصال</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.detailsActionBtn}
                      onPress={() => whatsappDriver(selectedDriver.phone, 'مرحباً، هل أنت متاح لتوصيل طلب جديد؟')}
                    >
                      <LinearGradient
                        colors={['#25D366', '#128C7E']}
                        style={styles.detailsActionGradient}
                      >
                        <Ionicons name="logo-whatsapp" size={24} color={COLORS.textWhite} />
                        <Text style={styles.detailsActionText}>واتساب</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailsQuickMessages}>
                    <Text style={styles.quickMessagesTitle}>رسائل سريعة</Text>
                    <TouchableOpacity 
                      style={styles.quickMessageBtn}
                      onPress={() => whatsappDriver(selectedDriver.phone, 'مرحباً، لدينا طلب جديد جاهز للتوصيل. هل أنت متاح؟')}
                    >
                      <Text style={styles.quickMessageText}>طلب جديد جاهز 📦</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickMessageBtn}
                      onPress={() => whatsappDriver(selectedDriver.phone, 'أين وصلت بالطلب؟')}
                    >
                      <Text style={styles.quickMessageText}>استفسار عن الموقع 📍</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickMessageBtn}
                      onPress={() => whatsappDriver(selectedDriver.phone, 'شكراً على التوصيل! 👍')}
                    >
                      <Text style={styles.quickMessageText}>شكراً على التوصيل 👍</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmDeleteVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>تأكيد الحذف</Text>
            <Text style={styles.confirmMessage}>هل تريد حذف هذا السائق من قائمتك؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  addHeaderButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginTop: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row-reverse',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoCard: {
    flexDirection: 'row-reverse',
    marginHorizontal: SPACING.lg,
    backgroundColor: `${COLORS.info}10`,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderRightWidth: 4,
    borderRightColor: COLORS.info,
  },
  infoIcon: {
    marginLeft: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.info,
    textAlign: 'right',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyButton: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  emptyButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  driversList: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  driverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  driverMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  driverPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappBtn: {
    backgroundColor: '#25D36615',
  },
  callBtn: {
    backgroundColor: `${COLORS.success}15`,
  },
  editBtn: {
    backgroundColor: `${COLORS.info}15`,
  },
  deleteBtn: {
    backgroundColor: `${COLORS.error}15`,
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
    maxHeight: '90%',
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
  avatarPreview: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  inputIcon: {
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  notesContainer: {
    alignItems: 'flex-start',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  saveButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Details Modal
  detailsModalContent: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    flex: 1,
    marginTop: 100,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: SPACING.lg,
  },
  detailsAvatar: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  detailsAvatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  detailsPhone: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  detailsStatusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
    gap: 6,
  },
  detailsStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsBody: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  detailsSection: {
    marginBottom: SPACING.lg,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  detailsNotes: {
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
    lineHeight: 22,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  detailsActions: {
    flexDirection: 'row-reverse',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  detailsActionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  detailsActionGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  detailsActionText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsQuickMessages: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  quickMessagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  quickMessageBtn: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  quickMessageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right',
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
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmIconCircle: {
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
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  deleteConfirmButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 16,
  },
});
