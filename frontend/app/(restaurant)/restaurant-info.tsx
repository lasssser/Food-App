import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { restaurantPanelAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface RestaurantInfo {
  id: string;
  name: string;
  name_en: string;
  description: string;
  address: string;
  area: string;
  cuisine_type: string;
  is_open: boolean;
  delivery_fee: number;
  min_order: number;
  delivery_time: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  rating: number;
  review_count: number;
  image?: string;
}

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const CUISINE_TYPES = [
  'شرقي',
  'غربي',
  'إيطالي',
  'صيني',
  'هندي',
  'وجبات سريعة',
  'مشاوي',
  'بيتزا',
  'حلويات',
  'مشروبات',
];

export default function RestaurantInfoEdit() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);
  const [restaurantImage, setRestaurantImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    try {
      const data = await restaurantPanelAPI.getRestaurantInfo();
      setInfo(data);
      
      // Initialize form
      setName(data.name || '');
      setNameEn(data.name_en || '');
      setDescription(data.description || '');
      setAddress(data.address || '');
      setArea(data.area || '');
      setCuisineType(data.cuisine_type || '');
      setDeliveryFee(String(data.delivery_fee || 5000));
      setMinOrder(String(data.min_order || 10000));
      setDeliveryTime(data.delivery_time || '30-45 دقيقة');
      setOpeningTime(data.opening_time || '09:00');
      setClosingTime(data.closing_time || '23:00');
      setRestaurantImage(data.image || null);
      setWorkingDays(data.working_days || DAYS);
    } catch (error) {
      console.error('Error fetching info:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات المطعم');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المطعم');
      return;
    }

    setSaving(true);
    try {
      await restaurantPanelAPI.updateRestaurantInfo({
        name: name.trim(),
        name_en: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        area: area.trim() || undefined,
        cuisine_type: cuisineType || undefined,
        delivery_fee: parseFloat(deliveryFee) || 5000,
        min_order: parseFloat(minOrder) || 10000,
        delivery_time: deliveryTime.trim() || undefined,
        opening_time: openingTime || undefined,
        closing_time: closingTime || undefined,
        working_days: workingDays.length > 0 ? workingDays : undefined,
      });

      Alert.alert('نجاح', 'تم تحديث بيانات المطعم بنجاح', [
        { text: 'حسناً', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving:', error);
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setHasChanges(true);
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('تنبيه', 'يجب السماح بالوصول للصور لتتمكن من رفع صورة');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        // In a real app, you would upload this to a server
        // For now, we'll use the base64 or URI
        const imageUri = result.assets[0].uri;
        setRestaurantImage(imageUri);
        setHasChanges(true);
        setUploadingImage(false);
        
        // Note: In production, you would upload to a server here
        // and get back a URL to save
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
      setUploadingImage(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const result = await restaurantPanelAPI.toggleRestaurantStatus();
      setInfo(prev => prev ? { ...prev, is_open: result.is_open } : null);
      Alert.alert('تم', result.message);
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert('خطأ', 'فشل في تغيير حالة المطعم');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-forward" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>معلومات المطعم</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Restaurant Status */}
          <TouchableOpacity style={styles.statusToggle} onPress={handleToggleStatus}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusDot, { backgroundColor: info?.is_open ? COLORS.success : COLORS.error }]} />
              <Text style={styles.statusText}>
                {info?.is_open ? 'مفتوح الآن' : 'مغلق الآن'}
              </Text>
            </View>
            <Text style={styles.statusAction}>تغيير</Text>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم المطعم *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => { setName(text); setHasChanges(true); }}
                placeholder="أدخل اسم المطعم"
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>الاسم بالإنجليزية</Text>
              <TextInput
                style={styles.input}
                value={nameEn}
                onChangeText={(text) => { setNameEn(text); setHasChanges(true); }}
                placeholder="Restaurant name in English"
                placeholderTextColor={COLORS.textLight}
                textAlign="left"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>الوصف</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={(text) => { setDescription(text); setHasChanges(true); }}
                placeholder="وصف قصير عن المطعم..."
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>نوع المطبخ</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowCuisineDropdown(!showCuisineDropdown)}
              >
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                <Text style={[styles.dropdownText, !cuisineType && { color: COLORS.textLight }]}>
                  {cuisineType || 'اختر نوع المطبخ'}
                </Text>
              </TouchableOpacity>
              {showCuisineDropdown && (
                <View style={styles.dropdown}>
                  {CUISINE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.dropdownItem, cuisineType === type && styles.dropdownItemActive]}
                      onPress={() => {
                        setCuisineType(type);
                        setShowCuisineDropdown(false);
                        setHasChanges(true);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, cuisineType === type && styles.dropdownItemTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الموقع</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>العنوان</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={(text) => { setAddress(text); setHasChanges(true); }}
                placeholder="العنوان التفصيلي"
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>المنطقة</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={(text) => { setArea(text); setHasChanges(true); }}
                placeholder="المنطقة أو الحي"
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
              />
            </View>
          </View>

          {/* Delivery Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إعدادات التوصيل</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>رسوم التوصيل (ل.س)</Text>
                <TextInput
                  style={styles.input}
                  value={deliveryFee}
                  onChangeText={(text) => { setDeliveryFee(text); setHasChanges(true); }}
                  placeholder="5000"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="right"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>الحد الأدنى (ل.س)</Text>
                <TextInput
                  style={styles.input}
                  value={minOrder}
                  onChangeText={(text) => { setMinOrder(text); setHasChanges(true); }}
                  placeholder="10000"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="right"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>وقت التوصيل</Text>
              <TextInput
                style={styles.input}
                value={deliveryTime}
                onChangeText={(text) => { setDeliveryTime(text); setHasChanges(true); }}
                placeholder="30-45 دقيقة"
                placeholderTextColor={COLORS.textLight}
                textAlign="right"
              />
            </View>
          </View>

          {/* Working Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أوقات العمل</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>وقت الافتتاح</Text>
                <TextInput
                  style={styles.input}
                  value={openingTime}
                  onChangeText={(text) => { setOpeningTime(text); setHasChanges(true); }}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="center"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>وقت الإغلاق</Text>
                <TextInput
                  style={styles.input}
                  value={closingTime}
                  onChangeText={(text) => { setClosingTime(text); setHasChanges(true); }}
                  placeholder="23:00"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="center"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>أيام العمل</Text>
              <View style={styles.daysGrid}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, workingDays.includes(day) && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, workingDays.includes(day) && styles.dayChipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Rating Info (Read Only) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التقييم</Text>
            <View style={styles.ratingCard}>
              <View style={styles.ratingItem}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={styles.ratingValue}>{info?.rating?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.ratingLabel}>التقييم العام</Text>
              </View>
              <View style={styles.ratingDivider} />
              <View style={styles.ratingItem}>
                <Ionicons name="people" size={24} color={COLORS.info} />
                <Text style={styles.ratingValue}>{info?.review_count || 0}</Text>
                <Text style={styles.ratingLabel}>عدد التقييمات</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            <LinearGradient
              colors={hasChanges ? [COLORS.success, '#43A047'] : [COLORS.textLight, COLORS.textLight]}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={22} color={COLORS.textWhite} />
                  <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  statusToggle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  statusInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  statusAction: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },

  // Content
  content: {
    flex: 1,
  },
  section: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },

  // Dropdown
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.small,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dropdownItemActive: {
    backgroundColor: `${COLORS.primary}10`,
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Days Grid
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dayChipTextActive: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },

  // Rating Card
  ratingCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  ratingItem: {
    flex: 1,
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratingDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.lg,
  },

  // Footer
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
});
