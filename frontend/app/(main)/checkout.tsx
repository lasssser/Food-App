import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore } from '../../src/store/cartStore';
import { addressAPI, orderAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import LocationPicker from '../../src/components/LocationPicker';

interface Address {
  id: string;
  label: string;
  address_line: string;
  area?: string;
  lat?: number;
  lng?: number;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, restaurant, getSubtotal, clearCart } = useCartStore();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'SHAMCASH'>('COD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newAddress, setNewAddress] = useState({ label: '', address_line: '', area: '', lat: 0, lng: 0 });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const subtotal = getSubtotal();
  const deliveryFee = restaurant?.delivery_fee || 5000;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await addressAPI.getAll();
      setAddresses(data);
      if (data.length > 0) {
        setSelectedAddress(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address_line) {
      setErrorMessage('يرجى ملء جميع الحقول');
      setShowErrorModal(true);
      return;
    }

    if (!selectedLocation) {
      setErrorMessage('يرجى تحديد موقعك على الخريطة');
      setShowErrorModal(true);
      return;
    }

    try {
      const addressData = {
        ...newAddress,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      };
      const address = await addressAPI.create(addressData);
      setAddresses([...addresses, address]);
      setSelectedAddress(address.id);
      setShowAddAddress(false);
      setNewAddress({ label: '', address_line: '', area: '', lat: 0, lng: 0 });
      setSelectedLocation(null);
    } catch (error) {
      setErrorMessage('فشل إضافة العنوان');
      setShowErrorModal(true);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setErrorMessage('يرجى اختيار عنوان التوصيل');
      setShowErrorModal(true);
      return;
    }

    if (items.length === 0 || !restaurant) {
      setErrorMessage('السلة فارغة');
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        restaurant_id: restaurant.id,
        items: items.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
        })),
        address_id: selectedAddress,
        payment_method: paymentMethod,
      };

      console.log('Sending order:', orderData);
      const order = await orderAPI.create(orderData);
      console.log('Order created:', order);

      clearCart();
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Order error:', error);
      setErrorMessage(error.response?.data?.detail || 'فشل إنشاء الطلب');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 280 }}
      >
        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setShowAddAddress(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>📍 عنوان التوصيل</Text>
          </View>

          {addresses.length === 0 ? (
            <TouchableOpacity 
              style={styles.addAddressCard}
              onPress={() => setShowAddAddress(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={32} color={COLORS.primary} />
              <Text style={styles.addAddressText}>أضف عنوان جديد</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress === address.id && styles.addressCardSelected,
                ]}
                onPress={() => setSelectedAddress(address.id)}
                activeOpacity={0.7}
              >
                <View style={styles.addressContent}>
                  <View style={styles.addressIcon}>
                    <Ionicons 
                      name={address.label === 'المنزل' ? 'home' : address.label === 'العمل' ? 'briefcase' : 'location'} 
                      size={20} 
                      color={selectedAddress === address.id ? COLORS.primary : COLORS.textSecondary} 
                    />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    <Text style={styles.addressLine}>{address.address_line}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedAddress === address.id && styles.radioButtonSelected,
                ]}>
                  {selectedAddress === address.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 طريقة الدفع</Text>

          {/* COD */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentMethod === 'COD' && styles.paymentCardSelected,
            ]}
            onPress={() => setPaymentMethod('COD')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentContent}>
              <View style={[styles.paymentIcon, { backgroundColor: `${COLORS.success}15` }]}>
                <Ionicons name="cash" size={24} color={COLORS.success} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>الدفع عند الاستلام</Text>
                <Text style={styles.paymentDesc}>ادفع نقداً للسائق</Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === 'COD' && styles.radioButtonSelected,
            ]}>
              {paymentMethod === 'COD' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>

          {/* ShamCash */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentMethod === 'SHAMCASH' && styles.paymentCardSelected,
            ]}
            onPress={() => setPaymentMethod('SHAMCASH')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentContent}>
              <View style={[styles.paymentIcon, { backgroundColor: `${COLORS.info}15` }]}>
                <Ionicons name="wallet" size={24} color={COLORS.info} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>ShamCash</Text>
                <Text style={styles.paymentDesc}>محفظة إلكترونية</Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === 'SHAMCASH' && styles.radioButtonSelected,
            ]}>
              {paymentMethod === 'SHAMCASH' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 ملخص الطلب</Text>
          
          <View style={styles.summaryCard}>
            {items.map((item) => (
              <View key={item.menuItem.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>
                  {item.menuItem.name} × {item.quantity}
                </Text>
                <Text style={styles.summaryItemPrice}>
                  {(item.menuItem.price * item.quantity).toLocaleString()} ل.س
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Summary */}
      <View style={styles.bottomCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>المجموع</Text>
          <Text style={styles.totalSubValue}>{subtotal.toLocaleString()} ل.س</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>التوصيل</Text>
          <Text style={styles.totalSubValue}>{deliveryFee.toLocaleString()} ل.س</Text>
        </View>
        <View style={[styles.totalRow, styles.totalRowFinal]}>
          <Text style={styles.totalFinalLabel}>الإجمالي</Text>
          <Text style={styles.totalFinalValue}>{total.toLocaleString()} ل.س</Text>
        </View>

        <TouchableOpacity
          style={[styles.orderButton, submitting && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.orderButtonGradient}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <>
                <Text style={styles.orderButtonText}>تأكيد الطلب 🔥</Text>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.textWhite} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal visible={showAddAddress} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowAddAddress(false);
                setSelectedLocation(null);
              }} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة عنوان جديد</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Map for location selection */}
            <Text style={styles.mapLabel}>📍 حدد موقعك على الخريطة</Text>
            <LocationPicker
              initialLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              editable={true}
              height={200}
            />
            {selectedLocation && (
              <View style={styles.locationConfirmed}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.locationConfirmedText}>تم تحديد الموقع</Text>
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="اسم العنوان (مثال: المنزل)"
              placeholderTextColor={COLORS.textLight}
              value={newAddress.label}
              onChangeText={(text) => setNewAddress({ ...newAddress, label: text })}
              textAlign="right"
            />

            <TextInput
              style={[styles.modalInput, { minHeight: 80 }]}
              placeholder="العنوان بالتفصيل (الشارع، البناء، الطابق...)"
              placeholderTextColor={COLORS.textLight}
              value={newAddress.address_line}
              onChangeText={(text) => setNewAddress({ ...newAddress, address_line: text })}
              textAlign="right"
              multiline
            />

            <TextInput
              style={styles.modalInput}
              placeholder="المنطقة (اختياري)"
              placeholderTextColor={COLORS.textLight}
              value={newAddress.area}
              onChangeText={(text) => setNewAddress({ ...newAddress, area: text })}
              textAlign="right"
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleAddAddress} activeOpacity={0.7}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>حفظ العنوان</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModal}>
            <View style={[styles.alertIconContainer, { backgroundColor: `${COLORS.success}15` }]}>
              <Ionicons name="checkmark-circle" size={50} color={COLORS.success} />
            </View>
            <Text style={styles.alertTitle}>تم الطلب بنجاح! 🎉</Text>
            <Text style={styles.alertMessage}>
              {paymentMethod === 'COD' 
                ? 'سيتم توصيل طلبك قريباً' 
                : 'يرجى تحويل المبلغ عبر ShamCash'}
            </Text>
            <TouchableOpacity 
              style={styles.alertButton} 
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(main)/orders');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.alertButtonText}>حسناً</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showErrorModal} animationType="fade" transparent>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModal}>
            <View style={[styles.alertIconContainer, { backgroundColor: `${COLORS.error}15` }]}>
              <Ionicons name="close-circle" size={50} color={COLORS.error} />
            </View>
            <Text style={styles.alertTitle}>خطأ</Text>
            <Text style={styles.alertMessage}>{errorMessage}</Text>
            <TouchableOpacity 
              style={[styles.alertButton, { backgroundColor: COLORS.error }]} 
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.alertButtonText}>حسناً</Text>
            </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },

  // Header
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Section
  section: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },

  // Address Card
  addressCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  addressContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  addressLabel: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addressLine: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addAddressCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },

  // Radio Button
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  // Payment Card
  paymentCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  paymentContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  paymentTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  paymentDesc: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  summaryItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryItemName: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },

  // Bottom Card
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.large,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  totalRowFinal: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  totalSubValue: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  totalFinalLabel: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalFinalValue: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  orderButtonDisabled: {
    opacity: 0.7,
  },
  orderButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  orderButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  locationConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationConfirmedText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.success,
    fontWeight: '600',
  },
  modalButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },

  // Alert Modal
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  alertModal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  alertTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  alertButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.md,
  },
  alertButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
