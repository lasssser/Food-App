import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { pickMenuItemImage } from '../../src/utils/imageUtils';
import { MenuItem } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function RestaurantMenu() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formImage, setFormImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchMenu = async () => {
    try {
      const data = await restaurantPanelAPI.getMenu();
      setItems(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
  };

  const pickImage = async () => {
    setUploadingImage(true);
    try {
      const compressedImageUri = await pickMenuItemImage();
      if (compressedImageUri) {
        setFormImage(compressedImageUri);
        // Show compression success message
        Alert.alert('تم', 'تم ضغط الصورة وتحسينها بنجاح ✓');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormCategory('');
    setFormAvailable(true);
    setFormImage(null);
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormPrice(item.price.toString());
    setFormCategory(item.category);
    setFormAvailable(item.is_available);
    setFormImage(item.image || null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formPrice || (!editingItem && !formCategory)) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingItem) {
        await restaurantPanelAPI.updateMenuItem(editingItem.id, {
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          is_available: formAvailable,
          image: formImage || undefined,
        });
      } else {
        await restaurantPanelAPI.addMenuItem({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          category: formCategory,
          image: formImage || undefined,
        });
      }
      setShowModal(false);
      fetchMenu();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل الحفظ');
    }
  };

  const confirmDelete = (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await restaurantPanelAPI.deleteMenuItem(itemToDelete);
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchMenu();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل الحذف');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await restaurantPanelAPI.updateMenuItem(item.id, {
        is_available: !item.is_available,
      });
      fetchMenu();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const sections = Object.entries(groupedItems).map(([title, data]) => ({
    title,
    data,
  }));

  const totalItems = items.length;
  const availableItems = items.filter(i => i.is_available).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل القائمة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={openAddModal} activeOpacity={0.7}>
            <View style={styles.addButton}>
              <Ionicons name="add" size={24} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>إدارة القائمة</Text>
            <Text style={styles.headerSubtitle}>
              {availableItems} متوفر من أصل {totalItems} صنف
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Menu List */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            </View>
            
            {section.data.map((item) => (
              <View 
                key={item.id} 
                style={[styles.menuItem, !item.is_available && styles.unavailable]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemActions}>
                    <Switch
                      value={item.is_available}
                      onValueChange={() => handleToggleAvailability(item)}
                      trackColor={{ false: COLORS.border, true: `${COLORS.success}80` }}
                      thumbColor={item.is_available ? COLORS.success : COLORS.textLight}
                    />
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create" size={20} color={COLORS.info} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => confirmDelete(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.itemFooter}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: item.is_available ? `${COLORS.success}15` : `${COLORS.error}15` }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: item.is_available ? COLORS.success : COLORS.error }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: item.is_available ? COLORS.success : COLORS.error }
                      ]}>
                        {item.is_available ? 'متوفر' : 'غير متوفر'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(restaurant)/addons', params: { itemId: item.id, itemName: item.name } })}
                      style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#E8EAF6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="options" size={14} color="#3F51B5" />
                      <Text style={{ fontSize: 11, color: '#3F51B5' }}>إضافات</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>{(item.price || 0).toLocaleString()} ل.س</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="restaurant-outline" size={50} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد أصناف</Text>
            <Text style={styles.emptySubtitle}>ابدأ بإضافة أصناف إلى قائمتك</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal} activeOpacity={0.8}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.emptyButtonGradient}
              >
                <Ionicons name="add" size={20} color={COLORS.textWhite} />
                <Text style={styles.emptyButtonText}>إضافة صنف</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingItem ? 'تعديل صنف' : 'إضافة صنف جديد'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Image Picker */}
              <Text style={styles.inputLabel}>صورة الصنف</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {formImage ? (
                  <Image source={{ uri: formImage }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Ionicons name="camera-outline" size={36} color={COLORS.textLight} />
                    <Text style={styles.imagePickerText}>اضغط لإضافة صورة</Text>
                  </View>
                )}
                <View style={styles.imagePickerBadge}>
                  <Ionicons name="camera" size={14} color={COLORS.textWhite} />
                </View>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>اسم الصنف *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="مثال: شاورما لحمة"
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="وصف الصنف (اختياري)"
                placeholderTextColor={COLORS.textLight}
                multiline
                textAlign="right"
              />

              <Text style={styles.inputLabel}>السعر (ل.س) *</Text>
              <TextInput
                style={styles.input}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="8000"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                textAlign="right"
              />

              {!editingItem && (
                <>
                  <Text style={styles.inputLabel}>الفئة *</Text>
                  <TextInput
                    style={styles.input}
                    value={formCategory}
                    onChangeText={setFormCategory}
                    placeholder="مثال: شاورما، برجر، مشروبات"
                    placeholderTextColor={COLORS.textLight}
                    textAlign="right"
                  />
                </>
              )}

              {editingItem && (
                <View style={styles.availabilityRow}>
                  <Switch
                    value={formAvailable}
                    onValueChange={setFormAvailable}
                    trackColor={{ false: COLORS.border, true: `${COLORS.success}80` }}
                    thumbColor={formAvailable ? COLORS.success : COLORS.textLight}
                  />
                  <Text style={styles.availabilityLabel}>متوفر</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.saveButtonGradient}
              >
                <Ionicons name={editingItem ? 'checkmark' : 'add'} size={22} color={COLORS.textWhite} />
                <Text style={styles.saveButtonText}>{editingItem ? 'حفظ التعديلات' : 'إضافة الصنف'}</Text>
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
            <Text style={styles.confirmTitle}>حذف الصنف</Text>
            <Text style={styles.confirmMessage}>هل تريد حذف هذا الصنف من القائمة؟</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteConfirmButton} 
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmButtonText}>حذف</Text>
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
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.textWhite,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  sectionBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.primary,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  unavailable: {
    opacity: 0.7,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: SPACING.md,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemDescription: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  itemFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
    fontSize: 20,
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
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

  // Image Picker Styles
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.divider,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  imagePickerBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  modalForm: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'right',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  availabilityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  availabilityLabel: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  saveButton: {
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },

  // Confirm Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
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
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
