import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface PaymentMethod {
  method: string;
  is_enabled: boolean;
  display_name: string;
  payment_info: string;
  instructions: string;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    method: 'cod',
    is_enabled: true,
    display_name: 'الدفع عند الاستلام',
    payment_info: '',
    instructions: 'ادفع للسائق عند استلام الطلب',
  },
  {
    method: 'mtn_cash',
    is_enabled: false,
    display_name: 'MTN Cash',
    payment_info: '',
    instructions: 'حوّل المبلغ ثم أدخل رقم العملية',
  },
  {
    method: 'syriatel_cash',
    is_enabled: false,
    display_name: 'Syriatel Cash',
    payment_info: '',
    instructions: 'حوّل المبلغ ثم أدخل رقم العملية',
  },
  {
    method: 'shamcash',
    is_enabled: false,
    display_name: 'ShamCash',
    payment_info: '',
    instructions: 'حوّل المبلغ ثم أدخل رقم العملية',
  },
];

const METHOD_ICONS: { [key: string]: string } = {
  cod: 'cash-outline',
  mtn_cash: 'phone-portrait-outline',
  syriatel_cash: 'phone-portrait-outline',
  shamcash: 'wallet-outline',
};

const METHOD_COLORS: { [key: string]: string } = {
  cod: '#4CAF50',
  mtn_cash: '#FFEB3B',
  syriatel_cash: '#E91E63',
  shamcash: '#2196F3',
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await restaurantPanelAPI.getPaymentMethods();
      if (response.methods && response.methods.length > 0) {
        // Merge with defaults to ensure all methods exist
        const mergedMethods = DEFAULT_METHODS.map(defaultMethod => {
          const existingMethod = response.methods.find(
            (m: PaymentMethod) => m.method === defaultMethod.method
          );
          return existingMethod || defaultMethod;
        });
        setMethods(mergedMethods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = (methodId: string) => {
    setMethods(prev =>
      prev.map(m =>
        m.method === methodId ? { ...m, is_enabled: !m.is_enabled } : m
      )
    );
  };

  const handleUpdatePaymentInfo = (methodId: string, field: string, value: string) => {
    setMethods(prev =>
      prev.map(m =>
        m.method === methodId ? { ...m, [field]: value } : m
      )
    );
  };

  const handleSave = async () => {
    // Validate enabled methods have payment info (except COD)
    const enabledElectronicMethods = methods.filter(
      m => m.is_enabled && m.method !== 'cod'
    );
    
    for (const method of enabledElectronicMethods) {
      if (!method.payment_info.trim()) {
        const msg = `يرجى إدخال معلومات الدفع لـ ${method.display_name}`;
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('خطأ', msg);
        }
        return;
      }
    }

    setSaving(true);
    try {
      await restaurantPanelAPI.updatePaymentMethods(methods);
      const msg = 'تم حفظ طرق الدفع بنجاح';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('نجاح', msg);
      }
    } catch (error) {
      console.error('Error saving payment methods:', error);
      const msg = 'فشل في حفظ طرق الدفع';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('خطأ', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طرق الدفع</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={24} color={COLORS.info} />
        <Text style={styles.infoText}>
          اختر طرق الدفع التي تريد قبولها وأضف معلومات الدفع الخاصة بك
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {methods.map(method => (
          <View key={method.method} style={styles.methodCard}>
            {/* Method Header */}
            <View style={styles.methodHeader}>
              <View style={styles.methodInfo}>
                <View style={[styles.methodIcon, { backgroundColor: `${METHOD_COLORS[method.method]}20` }]}>
                  <Ionicons
                    name={METHOD_ICONS[method.method] as any}
                    size={24}
                    color={METHOD_COLORS[method.method]}
                  />
                </View>
                <View style={styles.methodTextContainer}>
                  <Text style={styles.methodName}>{method.display_name}</Text>
                  {method.method === 'cod' && (
                    <Text style={styles.methodNote}>
                      متاح لجميع الزبائن
                    </Text>
                  )}
                </View>
              </View>
              <Switch
                value={method.is_enabled}
                onValueChange={() => handleToggleMethod(method.method)}
                trackColor={{ false: '#E0E0E0', true: `${COLORS.primary}50` }}
                thumbColor={method.is_enabled ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            {/* Method Details (if enabled and not COD) */}
            {method.is_enabled && method.method !== 'cod' && (
              <View style={styles.methodDetails}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رقم الحساب / الهاتف *</Text>
                  <TextInput
                    style={styles.input}
                    value={method.payment_info}
                    onChangeText={(val) => handleUpdatePaymentInfo(method.method, 'payment_info', val)}
                    placeholder="مثال: 0999123456"
                    placeholderTextColor={COLORS.textLight}
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>تعليمات للزبون (اختياري)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={method.instructions}
                    onChangeText={(val) => handleUpdatePaymentInfo(method.method, 'instructions', val)}
                    placeholder="مثال: حوّل المبلغ ثم أرسل رقم العملية"
                    placeholderTextColor={COLORS.textLight}
                    textAlign="right"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
            )}

            {/* COD Info */}
            {method.is_enabled && method.method === 'cod' && (
              <View style={styles.codInfo}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
                <Text style={styles.codInfoText}>
                  الدفع عند الاستلام متاح فقط للزبائن الذين أتموا طلب واحد على الأقل ودفعوه إلكترونياً
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.info}15`,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.info,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  methodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textPrimary,
  },
  methodNote: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  methodDetails: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'right',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  codInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: `${COLORS.success}10`,
    borderRadius: RADIUS.md,
  },
  codInfoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.success,
    textAlign: 'right',
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: '#FFF',
  },
});
