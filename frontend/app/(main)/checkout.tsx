import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';
import { addressAPI, orderAPI, paymentAPI } from '../../src/services/api';
import { Address } from '../../src/types';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, restaurant, getSubtotal, getTotal, clearCart } = useCartStore();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'SHAMCASH'>('COD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  
  // Address Modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressArea, setNewAddressArea] = useState('');
  
  // ShamCash Modal
  const [showShamCashModal, setShowShamCashModal] = useState(false);
  const [shamCashRef, setShamCashRef] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await addressAPI.getAll();
      setAddresses(data);
      if (data.length > 0) {
        setSelectedAddress(data[0]);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingAddresses(false);
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
      setSelectedAddress(newAddress);
      setShowAddressModal(false);
      setNewAddressLabel('');
      setNewAddressLine('');
      setNewAddressArea('');
    } catch (error) {
      Alert.alert('خطأ', 'فشل إضافة العنوان');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('خطأ', 'يرجى اختيار عنوان التوصيل');
      return;
    }

    if (!restaurant) {
      Alert.alert('خطأ', 'لا يوجد مطعم محدد');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: restaurant.id,
        items: items.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
        })),
        address_id: selectedAddress.id,
        payment_method: paymentMethod,
        notes: notes || undefined,
      };

      const order = await orderAPI.create(orderData);

      if (paymentMethod === 'SHAMCASH') {
        setPendingOrderId(order.id);
        setShowShamCashModal(true);
      } else {
        // COD - Order placed successfully
        clearCart();
        Alert.alert('تم الطلب', 'تم إرسال طلبك بنجاح!', [
          {
            text: 'تتبع الطلب',
            onPress: () => router.replace('/(main)/orders'),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleShamCashVerify = async () => {
    if (!shamCashRef.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم العملية');
      return;
    }

    if (!pendingOrderId) return;

    setLoading(true);
    try {
      await paymentAPI.verifyPayment({
        order_id: pendingOrderId,
        reference: shamCashRef,
      });

      clearCart();
      setShowShamCashModal(false);
      Alert.alert('تم الطلب', 'تم إرسال طلبك وطلب التحقق من الدفع!', [
        {
          text: 'تتبع الطلب',
          onPress: () => router.replace('/(main)/orders'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال طلب التحقق');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getSubtotal();
  const deliveryFee = restaurant?.delivery_fee || 0;
  const total = getTotal();

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>السلة فارغة</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>إتمام الطلب</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <Text style={styles.addButton}>إضافة جديد</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
              <Ionicons name="location" size={20} color="#FF6B35" />
            </View>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FF6B35" />
              <Text style={styles.addAddressText}>أضف عنوان التوصيل</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress?.id === address.id && styles.addressCardSelected,
                ]}
                onPress={() => setSelectedAddress(address)}
              >
                <View style={styles.radioButton}>
                  {selectedAddress?.id === address.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  <Text style={styles.addressLine}>{address.address_line}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>طريقة الدفع</Text>
              <Ionicons name="card" size={20} color="#FF6B35" />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'COD' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('COD')}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'COD' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>الدفع عند الاستلام</Text>
              <Text style={styles.paymentDesc}>ادفع نقداً عند وصول طلبك</Text>
            </View>
            <Ionicons name="cash" size={28} color="#4CAF50" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'SHAMCASH' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('SHAMCASH')}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'SHAMCASH' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>ShamCash</Text>
              <Text style={styles.paymentDesc}>الدفع عبر محفظة ShamCash</Text>
            </View>
            <Ionicons name="wallet" size={28} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>ملاحظات</Text>
              <Ionicons name="document-text" size={20} color="#FF6B35" />
            </View>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="أضف ملاحظات للطلب (اختياري)"
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
              <Ionicons name="receipt" size={20} color="#FF6B35" />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
            {items.map((item) => (
              <View key={item.menuItem.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemPrice}>
                  {(item.menuItem.price * item.quantity).toLocaleString()} ل.س
                </Text>
                <Text style={styles.summaryItemName}>
                  {item.quantity}x {item.menuItem.name}
                </Text>
              </View>
            ))}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{subtotal.toLocaleString()} ل.س</Text>
              <Text style={styles.summaryLabel}>المجموع</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{deliveryFee.toLocaleString()} ل.س</Text>
              <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalValue}>{total.toLocaleString()} ل.س</Text>
              <Text style={styles.totalLabel}>الإجمالي</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading || !selectedAddress}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              تأكيد الطلب - {total.toLocaleString()} ل.س
            </Text>
          )}
        </TouchableOpacity>
      </View>

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

      {/* ShamCash Modal */}
      <Modal visible={showShamCashModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 24 }} />
              <Text style={styles.modalTitle}>الدفع عبر ShamCash</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.shamCashInfo}>
              <Text style={styles.shamCashTitle}>خطوات الدفع:</Text>
              <Text style={styles.shamCashStep}>1. افتح تطبيق ShamCash</Text>
              <Text style={styles.shamCashStep}>2. اختر "تحويل"</Text>
              <Text style={styles.shamCashStep}>3. حوّل {total.toLocaleString()} ل.س</Text>
              <Text style={styles.shamCashStep}>4. أدخل رقم العملية أدناه</Text>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="رقم العملية / المرجع"
              placeholderTextColor="#999"
              value={shamCashRef}
              onChangeText={setShamCashRef}
              textAlign="right"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.modalButton, loading && styles.modalButtonDisabled]}
              onPress={handleShamCashVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>تأكيد الدفع</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowShamCashModal(false);
                setPendingOrderId(null);
                setShamCashRef('');
              }}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
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
  addButton: {
    fontSize: 14,
    color: '#FF6B35',
  },
  addAddressButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF6B35',
    borderRadius: 12,
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    color: '#FF6B35',
  },
  addressCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 8,
  },
  addressCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
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
  },
  paymentOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentOptionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paymentDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#666',
  },
  summaryItemPrice: {
    fontSize: 14,
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  placeOrderButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.7,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    maxHeight: '80%',
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
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shamCashInfo: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  shamCashTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'right',
    marginBottom: 8,
  },
  shamCashStep: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    marginBottom: 4,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
