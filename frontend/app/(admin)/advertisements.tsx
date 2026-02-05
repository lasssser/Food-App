import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { advertisementsAPI, uploadAPI } from '../../src/services/api';

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_type?: string;
  link_value?: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export default function AdvertisementsScreen() {
  const router = useRouter();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkType, setLinkType] = useState<string>('none');
  const [linkValue, setLinkValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);

  const fetchAdvertisements = useCallback(async () => {
    try {
      const data = await advertisementsAPI.getAll(false);
      setAdvertisements(data);
    } catch (error) {
      console.error('Error fetching advertisements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdvertisements();
  };

  const resetForm = () => {
    setTitle('');
    setImageUrl('');
    setLinkType('none');
    setLinkValue('');
    setIsActive(true);
    setOrder(0);
    setEditingAd(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (ad: Advertisement) => {
    setTitle(ad.title);
    setImageUrl(ad.image_url);
    setLinkType(ad.link_type || 'none');
    setLinkValue(ad.link_value || '');
    setIsActive(ad.is_active);
    setOrder(ad.order);
    setEditingAd(ad);
    setShowModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        try {
          const response = await uploadAPI.uploadImage(asset.base64);
          setImageUrl(response.url);
        } catch (error) {
          Alert.alert('خطأ', 'فشل في رفع الصورة');
        }
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال عنوان الإعلان');
      return;
    }
    if (!imageUrl.trim()) {
      Alert.alert('تنبيه', 'يرجى اختيار صورة للإعلان');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        image_url: imageUrl,
        link_type: linkType === 'none' ? undefined : linkType,
        link_value: linkType === 'none' ? undefined : linkValue.trim(),
        is_active: isActive,
        order: order,
      };

      if (editingAd) {
        await advertisementsAPI.update(editingAd.id, data);
        Alert.alert('تم', 'تم تحديث الإعلان بنجاح');
      } else {
        await advertisementsAPI.create(data);
        Alert.alert('تم', 'تم إنشاء الإعلان بنجاح');
      }
      setShowModal(false);
      resetForm();
      fetchAdvertisements();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل في حفظ الإعلان');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (ad: Advertisement) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف إعلان "${ad.title}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await advertisementsAPI.delete(ad.id);
              Alert.alert('تم', 'تم حذف الإعلان بنجاح');
              fetchAdvertisements();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في حذف الإعلان');
            }
          },
        },
      ]
    );
  };

  const renderAdCard = (ad: Advertisement) => (
    <View key={ad.id} style={styles.adCard}>
      <Image source={{ uri: ad.image_url }} style={styles.adImage} resizeMode="cover" />
      <View style={styles.adInfo}>
        <View style={styles.adHeader}>
          <View style={[styles.statusBadge, { backgroundColor: ad.is_active ? `${COLORS.success}15` : `${COLORS.error}15` }]}>
            <Text style={[styles.statusText, { color: ad.is_active ? COLORS.success : COLORS.error }]}>
              {ad.is_active ? 'نشط' : 'غير نشط'}
            </Text>
          </View>
          <Text style={styles.adTitle}>{ad.title}</Text>
        </View>
        <Text style={styles.adOrder}>الترتيب: {ad.order}</Text>
        <View style={styles.adActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${COLORS.error}15` }]}
            onPress={() => handleDelete(ad)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${COLORS.primary}15` }]}
            onPress={() => openEditModal(ad)}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الإعلانات</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {advertisements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={60} color={COLORS.textLight} />
              <Text style={styles.emptyText}>لا توجد إعلانات</Text>
              <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
                <Text style={styles.createButtonText}>إنشاء إعلان جديد</Text>
              </TouchableOpacity>
            </View>
          ) : (
            advertisements.map(renderAdCard)
          )}
        </ScrollView>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingAd ? 'تعديل الإعلان' : 'إعلان جديد'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg }}>
            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={50} color={COLORS.textLight} />
                  <Text style={styles.imagePickerText}>اختر صورة الإعلان</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.inputLabel}>عنوان الإعلان *</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل عنوان الإعلان"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              textAlign="right"
            />

            {/* Link Type */}
            <Text style={styles.inputLabel}>نوع الرابط</Text>
            <View style={styles.linkTypeContainer}>
              {[
                { key: 'none', label: 'بدون رابط' },
                { key: 'restaurant', label: 'مطعم' },
                { key: 'external', label: 'رابط خارجي' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.linkTypeOption, linkType === type.key && styles.linkTypeOptionActive]}
                  onPress={() => setLinkType(type.key)}
                >
                  <Text style={[styles.linkTypeText, linkType === type.key && styles.linkTypeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Link Value */}
            {linkType !== 'none' && (
              <>
                <Text style={styles.inputLabel}>
                  {linkType === 'restaurant' ? 'معرف المطعم' : 'الرابط الخارجي'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={linkType === 'restaurant' ? 'أدخل معرف المطعم' : 'أدخل الرابط'}
                  placeholderTextColor={COLORS.textLight}
                  value={linkValue}
                  onChangeText={setLinkValue}
                  textAlign="right"
                />
              </>
            )}

            {/* Order */}
            <Text style={styles.inputLabel}>ترتيب العرض</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              value={order.toString()}
              onChangeText={(text) => setOrder(parseInt(text) || 0)}
              keyboardType="numeric"
              textAlign="right"
            />

            {/* Active Toggle */}
            <View style={styles.toggleRow}>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: COLORS.border, true: `${COLORS.success}50` }}
                thumbColor={isActive ? COLORS.success : COLORS.textLight}
              />
              <Text style={styles.toggleLabel}>الإعلان نشط</Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveButtonGradient}>
                {saving ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <Text style={styles.saveButtonText}>{editingAd ? 'تحديث' : 'إنشاء'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  adCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  adImage: {
    width: '100%',
    height: 150,
  },
  adInfo: {
    padding: SPACING.md,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
  },
  adOrder: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  adActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  linkTypeOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  linkTypeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  linkTypeText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  linkTypeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textWhite,
  },
});
