import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { formatPrice } from '../../src/utils/formatPrice';

export default function CartScreen() {
  const router = useRouter();
  const { items, restaurant, updateQuantity, removeItem, clearCart, getSubtotal, getItemCount } = useCartStore();
  const { isGuest, isAuthenticated } = useAuthStore();
  const [showNotes, setShowNotes] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(80)).current;
  const checkoutScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 0, duration: 500, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, delay: 150, useNativeDriver: true }),
      Animated.spring(bottomAnim, { toValue: 0, friction: 8, tension: 60, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const subtotal = getSubtotal();
  const deliveryFee = restaurant?.delivery_fee || 5000;
  const total = subtotal + deliveryFee;

  const handleClearCart = () => {
    Alert.alert(
      'تأكيد',
      'هل تريد مسح السلة بالكامل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'نعم', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>السلة</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>سلتك فارغة</Text>
          <Text style={styles.emptySubtitle}>أضف بعض الأطعمة الشهية!</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(main)/home')}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.browseButtonGradient}
            >
              <Text style={styles.browseButtonText}>تصفح المطاعم</Text>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.textWhite} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={{ opacity: headerAnim }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>مسح الكل</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>السلة</Text>
        <View style={{ width: 60 }} />
      </View>
      </Animated.View>

      {/* Restaurant Info */}
      {restaurant && (
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentAnim }] }}>
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.itemCount}>{getItemCount()} عناصر في السلة</Text>
          </View>
        </View>
        </Animated.View>
      )}

      {/* Cart Items */}
      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentAnim }] }}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 320 }}
      >
        {items.map((item) => {
          const addOnsTotal = item.selectedAddOns?.reduce((sum, addon) => sum + addon.price, 0) || 0;
          const itemTotal = (item.menuItem.price + addOnsTotal) * item.quantity;
          const itemKey = item.itemKey || item.menuItem.id;
          
          return (
            <View key={itemKey} style={styles.cartItem}>
              {item.menuItem.image && (
                <Image source={{ uri: item.menuItem.image }} style={styles.itemImage} />
              )}
              
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                {/* Show selected add-ons */}
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <View style={styles.addOnsContainer}>
                    {item.selectedAddOns.map((addon, index) => (
                      <Text key={index} style={styles.addOnText}>
                        + {addon.option_name}
                        {addon.price > 0 && ` (${formatPrice(addon.price)} ل.س)`}
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.itemPrice}>{formatPrice(itemTotal)} ل.س</Text>
              </View>

              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => {
                    if (item.quantity === 1) {
                      removeItem(itemKey);
                    } else {
                      updateQuantity(itemKey, item.quantity - 1);
                    }
                  }}
                >
                  <Ionicons 
                    name={item.quantity === 1 ? "trash-outline" : "remove"} 
                    size={18} 
                    color={item.quantity === 1 ? COLORS.error : COLORS.primary} 
                  />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{item.quantity}</Text>
                
                <TouchableOpacity
                  style={[styles.quantityButton, styles.quantityButtonAdd]}
                  onPress={() => updateQuantity(itemKey, item.quantity + 1)}
                >
                  <Ionicons name="add" size={18} color={COLORS.textWhite} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Add Notes */}
        <TouchableOpacity 
          style={styles.notesButton}
          onPress={() => setShowNotes(!showNotes)}
          activeOpacity={0.7}
        >
          <Text style={styles.notesText}>
            {showNotes ? 'إخفاء الملاحظات' : 'إضافة ملاحظات للطلب'}
          </Text>
          <Ionicons name={showNotes ? "chevron-up" : "create-outline"} size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        {showNotes && (
          <View style={styles.notesInputContainer}>
            <TextInput
              style={styles.notesInput}
              placeholder="اكتب ملاحظاتك هنا... مثلاً: بدون بصل، زيادة صوص"
              placeholderTextColor="#bbb"
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />
            {orderNotes.length > 0 && (
              <Text style={styles.notesCount}>{orderNotes.length} حرف</Text>
            )}
          </View>
        )}

        {/* Order Summary Card - inside scroll */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)} ل.س</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
            <Text style={styles.summaryValue}>{formatPrice(deliveryFee)} ل.س</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>الإجمالي</Text>
            <Text style={styles.totalValue}>{formatPrice(total)} ل.س</Text>
          </View>

          {/* Checkout Button - Show login prompt for guests */}
          {isGuest ? (
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => {
                Alert.alert(
                  'تسجيل الدخول مطلوب',
                  'يرجى تسجيل الدخول أو إنشاء حساب لإتمام الطلب',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تسجيل الدخول', onPress: () => {
                      const { setGuestMode } = useAuthStore.getState();
                      setGuestMode(false);
                      router.push('/(auth)/login');
                    }},
                  ]
                );
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.checkoutButtonGradient}
              >
                <Ionicons name="log-in-outline" size={24} color={COLORS.textWhite} />
                <Text style={styles.checkoutButtonText}>سجل دخولك للطلب</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push('/(main)/checkout')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.checkoutButtonGradient}
              >
                <Ionicons name="cart-outline" size={24} color={COLORS.textWhite} />
                <Text style={styles.checkoutButtonText}>اطلب الآن</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  clearText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.error,
    fontWeight: '600',
  },

  // Restaurant Info
  restaurantInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  restaurantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantDetails: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: SPACING.md,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  itemCount: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Scroll View
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Cart Item
  cartItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
  },
  itemDetails: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: SPACING.md,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  addOnsContainer: {
    marginBottom: 4,
  },
  addOnText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityButtonAdd: {
    backgroundColor: COLORS.primary,
    borderWidth: 0,
  },
  quantityText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    minWidth: 24,
    textAlign: 'center',
  },

  // Notes Button
  notesButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  notesInputContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  notesInput: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesCount: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    textAlign: 'left',
    marginTop: 4,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 100,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  checkoutButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 60,
    fontFamily: 'Cairo_400Regular',
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  browseButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  browseButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.sm,
  },
  browseButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
});
