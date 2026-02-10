import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantAPI, ratingAPI } from '../../src/services/api';
import { useCartStore } from '../../src/store/cartStore';
import { Restaurant, MenuItem, AddOnGroup, SelectedAddOn } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface Rating {
  id: string;
  user_name: string;
  restaurant_rating: number;
  driver_rating?: number;
  comment?: string;
  created_at: string;
}

const { height, width } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.32;

const fp = (n: number | null | undefined): string => {
  if (n == null || isNaN(Number(n))) return '0';
  const parts = Math.round(Number(n)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, items } = useCartStore();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  
  // Add-on Modal State
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<{ [groupId: string]: string[] }>({});
  const [loadingAddOns, setLoadingAddOns] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const [restaurantData, menuData, ratingsData] = await Promise.all([
            restaurantAPI.getById(id!),
            restaurantAPI.getMenu(id!),
            ratingAPI.getRestaurantRatings(id!, 10),
          ]);
          setRestaurant(restaurantData);
          setMenuItems(menuData);
          setRatings(ratingsData);
        } catch (error) {
          console.error('Error fetching restaurant:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [id])
  );

  const menuCategories = [...new Set(menuItems.map((item) => item.category))];
  const categories = ['all', ...menuCategories, 'ratings'];
  const categoryLabels: { [key: string]: string } = { all: 'الكل', ratings: 'التقييمات' };

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => item.category === selectedCategory);

  const fetchAddOns = async (menuItemId: string): Promise<AddOnGroup[]> => {
    try {
      setLoadingAddOns(true);
      const data = await restaurantAPI.getMenuItemAddOns(id!, menuItemId);
      setAddOnGroups(data || []);
      const initialSelections: { [groupId: string]: string[] } = {};
      (data || []).forEach((group: AddOnGroup) => {
        initialSelections[group.id] = group.is_required && group.options.length > 0
          ? [group.options[0].id] : [];
      });
      setSelectedAddOns(initialSelections);
      return data || [];
    } catch (error) {
      setAddOnGroups([]);
      return [];
    } finally {
      setLoadingAddOns(false);
    }
  };

  const handleAddToCartPress = async (menuItem: MenuItem) => {
    if (!restaurant) return;
    setSelectedMenuItem(menuItem);
    const fetchedAddOns = await fetchAddOns(menuItem.id);
    if (fetchedAddOns.length === 0) {
      addToCartDirectly(menuItem);
    } else {
      setShowAddOnModal(true);
    }
  };

  const addToCartDirectly = (menuItem: MenuItem) => {
    if (!restaurant) return;
    addItem(menuItem, restaurant, []);
    showAddedFeedback(menuItem.id);
    setSelectedMenuItem(null);
  };

  const showAddedFeedback = (itemId: string) => {
    setAddedItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setAddedItems(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    }, 500);
  };

  const handleAddOnSelect = (groupId: string, optionId: string, maxSelections: number) => {
    setSelectedAddOns(prev => {
      const current = prev[groupId] || [];
      if (maxSelections === 1) return { ...prev, [groupId]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter(i => i !== optionId) };
      if (current.length < maxSelections) return { ...prev, [groupId]: [...current, optionId] };
      return prev;
    });
  };

  const confirmAddToCart = () => {
    if (!selectedMenuItem || !restaurant) return;
    const missingRequired = addOnGroups.some(
      g => g.is_required && (!selectedAddOns[g.id] || selectedAddOns[g.id].length === 0)
    );
    if (missingRequired) return;

    const addOns: SelectedAddOn[] = [];
    addOnGroups.forEach(group => {
      (selectedAddOns[group.id] || []).forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) addOns.push({ group_name: group.name, option_name: option.name, price: option.price });
      });
    });
    addItem(selectedMenuItem, restaurant, addOns);
    showAddedFeedback(selectedMenuItem.id);
    setShowAddOnModal(false);
    setSelectedMenuItem(null);
    setSelectedAddOns({});
  };

  const calculateAddOnsTotal = () => {
    let total = 0;
    addOnGroups.forEach(group => {
      (selectedAddOns[group.id] || []).forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) total += option.price;
      });
    });
    return total;
  };

  const getItemQuantity = (itemId: string) => items.find(i => i.menuItem.id === itemId)?.quantity || 0;
  const getTotalCartItems = () => items.reduce((sum, item) => sum + item.quantity, 0);
  const getTotalCartPrice = () => items.reduce((sum, item) => {
    const addOnsPrice = item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0;
    return sum + (item.menuItem.price + addOnsPrice) * item.quantity;
  }, 0);

  if (loading) {
    return (
      <View style={st.loadWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={st.loadTxt}>جاري تحميل المنيو...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={st.errorWrap}>
        <Ionicons name="alert-circle-outline" size={60} color="#ddd" />
        <Text style={st.errorTxt}>المطعم غير موجود</Text>
        <TouchableOpacity style={st.errorBtn} onPress={() => router.back()}>
          <Text style={st.errorBtnTxt}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.container}>
      {/* ===== HERO ===== */}
      <View style={st.hero}>
        <Image
          source={{ uri: restaurant.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600' }}
          style={st.heroImg}
        />
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={st.heroOverlay} />
        
        {/* Navigation buttons */}
        <SafeAreaView style={st.heroNav}>
          <TouchableOpacity style={st.heroBtn} onPress={() => router.back()} data-testid="back-button">
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.heroBtn} data-testid="favorite-button">
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Restaurant Info */}
        <View style={st.heroInfo}>
          <View style={st.heroStatusRow}>
            <View style={[st.heroBadge, { backgroundColor: restaurant.is_open ? 'rgba(76,175,80,0.9)' : 'rgba(229,57,53,0.9)' }]}>
              <Text style={st.heroBadgeTxt}>{restaurant.is_open ? 'مفتوح الآن' : 'مغلق'}</Text>
            </View>
          </View>
          <Text style={st.heroName}>{restaurant.name}</Text>
          <Text style={st.heroCuisine}>{restaurant.cuisine_type}</Text>
          <View style={st.heroStats}>
            <View style={st.heroStat}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={st.heroStatVal}>{(restaurant.rating ?? 0).toFixed(1)}</Text>
              <Text style={st.heroStatLabel}>({restaurant.review_count}+)</Text>
            </View>
            <View style={st.heroStatDiv} />
            <View style={st.heroStat}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={st.heroStatVal}>{restaurant.delivery_time || '30 د'}</Text>
            </View>
            <View style={st.heroStatDiv} />
            <View style={st.heroStat}>
              <Ionicons name="bicycle-outline" size={14} color="#fff" />
              <Text style={st.heroStatVal}>{fp(restaurant.delivery_fee)} ل.س</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ===== CONTENT ===== */}
      <View style={st.content}>
        {/* Info Cards */}
        <View style={st.infoRow}>
          <View style={st.infoCard}>
            <View style={[st.infoIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="time" size={20} color="#F57C00" />
            </View>
            <Text style={st.infoVal}>{restaurant.delivery_time || '30 د'}</Text>
            <Text style={st.infoLabel}>وقت التوصيل</Text>
          </View>
          <View style={st.infoCard}>
            <View style={[st.infoIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="bicycle" size={20} color="#43A047" />
            </View>
            <Text style={st.infoVal}>{fp(restaurant.delivery_fee)} ل.س</Text>
            <Text style={st.infoLabel}>رسوم التوصيل</Text>
          </View>
          <View style={st.infoCard}>
            <View style={[st.infoIcon, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="cart" size={20} color="#F9A825" />
            </View>
            <Text style={st.infoVal}>{fp(restaurant.min_order)} ل.س</Text>
            <Text style={st.infoLabel}>الحد الأدنى</Text>
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.catTabs}
          contentContainerStyle={st.catTabsContent}
        >
          {categories.map((cat) => {
            const label = categoryLabels[cat] || cat;
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[st.catTab, active && st.catTabActive]}
                onPress={() => setSelectedCategory(cat)}
                data-testid={`menu-category-${cat}`}
              >
                <Text style={[st.catTabTxt, active && st.catTabTxtActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Menu / Ratings */}
        <ScrollView
          style={st.menuList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {selectedCategory === 'ratings' ? (
            <View style={st.ratingsWrap}>
              {/* Summary */}
              <View style={st.ratingSummary}>
                <Text style={st.ratingBig}>{(restaurant.rating ?? 0).toFixed(1)}</Text>
                <View style={st.ratingStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons key={s} name={s <= Math.round(restaurant.rating ?? 0) ? 'star' : 'star-outline'} size={18} color="#FFD700" />
                  ))}
                </View>
                <Text style={st.ratingCount}>{restaurant.review_count} تقييم</Text>
              </View>
              {ratings.length === 0 ? (
                <View style={st.noRatings}>
                  <Ionicons name="chatbubble-ellipses-outline" size={50} color="#ddd" />
                  <Text style={st.noRatingsTxt}>لا توجد تقييمات بعد</Text>
                  <Text style={st.noRatingsSub}>كن أول من يقيّم هذا المطعم!</Text>
                </View>
              ) : (
                ratings.map(r => (
                  <View key={r.id} style={st.ratingCard}>
                    <View style={st.ratingHeader}>
                      <View style={st.ratingStarsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Ionicons key={s} name={s <= r.restaurant_rating ? 'star' : 'star-outline'} size={14} color="#FFD700" />
                        ))}
                      </View>
                      <View style={st.ratingUser}>
                        <View style={st.userAvatar}><Ionicons name="person" size={14} color="#fff" /></View>
                        <Text style={st.userName}>{r.user_name}</Text>
                      </View>
                    </View>
                    {r.comment && <Text style={st.ratingComment}>{r.comment}</Text>}
                    <Text style={st.ratingDate}>
                      {new Date(r.created_at).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ) : (
            filteredItems.map(item => (
              <View key={item.id} style={st.menuItem} data-testid={`menu-item-${item.id}`}>
                <View style={st.menuItemRow}>
                  <View style={st.menuItemInfo}>
                    <Text style={st.menuItemName}>{item.name}</Text>
                    {item.description && <Text style={st.menuItemDesc} numberOfLines={2}>{item.description}</Text>}
                    <Text style={st.menuItemPrice}>{fp(item.price)} ل.س</Text>
                  </View>
                  <View style={st.menuItemImgWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={st.menuItemImg} />
                    ) : (
                      <View style={[st.menuItemImg, st.menuItemPlaceholder]}>
                        <Ionicons name="restaurant-outline" size={28} color="#ddd" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={[st.addBtn, addedItems.has(item.id) && st.addBtnDone, !item.is_available && st.addBtnOff]}
                      onPress={() => handleAddToCartPress(item)}
                      disabled={!item.is_available}
                      activeOpacity={0.8}
                      data-testid={`add-to-cart-${item.id}`}
                    >
                      {getItemQuantity(item.id) > 0 ? (
                        <View style={st.qtyBadge}><Text style={st.qtyTxt}>{getItemQuantity(item.id)}</Text></View>
                      ) : (
                        <Ionicons name={addedItems.has(item.id) ? "checkmark" : "add"} size={22} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ===== FLOATING CART ===== */}
      {items.length > 0 && (
        <TouchableOpacity
          style={st.floatCart}
          onPress={() => router.push('/(main)/cart')}
          activeOpacity={0.9}
          data-testid="floating-cart-btn"
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={st.floatCartInner}>
            <View style={st.cartBadge}><Text style={st.cartBadgeTxt}>{getTotalCartItems()}</Text></View>
            <Text style={st.floatCartTxt}>عرض السلة</Text>
            <Text style={st.floatCartPrice}>{fp(getTotalCartPrice())} ل.س</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ===== ADD-ON MODAL ===== */}
      <Modal visible={showAddOnModal} animationType="slide" transparent onRequestClose={() => { setShowAddOnModal(false); setSelectedMenuItem(null); }}>
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <View style={st.modalHead}>
              <TouchableOpacity style={st.modalClose} onPress={() => { setShowAddOnModal(false); setSelectedMenuItem(null); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={st.modalTitle}>{selectedMenuItem?.name || 'اختر الإضافات'}</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
              {loadingAddOns ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : (
                addOnGroups.map(group => (
                  <View key={group.id} style={st.addonGroup}>
                    <View style={st.addonGroupHead}>
                      <Text style={st.addonGroupTitle}>{group.name}</Text>
                      <View style={st.addonGroupMeta}>
                        {group.is_required && <View style={st.reqBadge}><Text style={st.reqTxt}>مطلوب</Text></View>}
                        {group.max_selections > 1 && <Text style={st.maxTxt}>اختر حتى {group.max_selections}</Text>}
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      {group.options.map(option => {
                        const sel = selectedAddOns[group.id]?.includes(option.id);
                        return (
                          <TouchableOpacity key={option.id} style={[st.addonOpt, sel && st.addonOptSel]}
                            onPress={() => handleAddOnSelect(group.id, option.id, group.max_selections)}>
                            <View style={st.addonOptRow}>
                              <View style={[st.chk, sel && st.chkSel, group.max_selections === 1 && st.radio]}>
                                {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                              </View>
                              <Text style={[st.addonOptName, sel && st.addonOptNameSel]}>{option.name}</Text>
                            </View>
                            {option.price > 0 && <Text style={st.addonOptPrice}>+{fp(option.price)} ل.س</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={st.modalFoot}>
              <View style={st.modalTotalRow}>
                <Text style={st.modalTotalLabel}>السعر الكلي:</Text>
                <Text style={st.modalTotalVal}>{fp((selectedMenuItem?.price || 0) + calculateAddOnsTotal())} ل.س</Text>
              </View>
              <TouchableOpacity style={st.modalAddBtn} onPress={confirmAddToCart} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={st.modalAddBtnInner}>
                  <Ionicons name="cart" size={20} color="#fff" />
                  <Text style={st.modalAddBtnTxt}>أضف إلى السلة</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadTxt: { marginTop: 12, fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#999' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  errorTxt: { fontSize: 18, fontFamily: 'Cairo_600SemiBold', color: '#666', marginTop: 16 },
  errorBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16, marginTop: 20 },
  errorBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Cairo_700Bold' },

  // Hero
  hero: { height: HERO_HEIGHT, position: 'relative' },
  heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  heroInfo: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  heroStatusRow: { flexDirection: 'row-reverse', marginBottom: 8 },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  heroBadgeTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#fff' },
  heroName: { fontSize: 28, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroCuisine: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginBottom: 10 },
  heroStats: { flexDirection: 'row-reverse', alignItems: 'center' },
  heroStat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  heroStatVal: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#fff' },
  heroStatLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)' },
  heroStatDiv: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },

  // Content
  content: { flex: 1, backgroundColor: '#F5F5F5', marginTop: -12, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },

  // Info Row
  infoRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...Platform.select({
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    }),
  },
  infoCard: { flex: 1, alignItems: 'center', gap: 4 },
  infoIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoVal: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#222' },
  infoLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#999' },

  // Category Tabs
  catTabs: { marginTop: 14, maxHeight: 54 },
  catTabsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  catTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEE' },
  catTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catTabTxt: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#666' },
  catTabTxtActive: { color: '#fff' },

  // Menu List
  menuList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    }),
  },
  menuItemRow: { flexDirection: 'row-reverse', padding: 12 },
  menuItemInfo: { flex: 1, paddingLeft: 12, alignItems: 'flex-end' },
  menuItemName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right', marginBottom: 4 },
  menuItemDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#999', textAlign: 'right', marginBottom: 8, lineHeight: 18 },
  menuItemPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: COLORS.primary },
  menuItemImgWrap: { position: 'relative' },
  menuItemImg: { width: 88, height: 88, borderRadius: 14, resizeMode: 'cover' },
  menuItemPlaceholder: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  addBtn: { position: 'absolute', bottom: -8, right: -8, width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  addBtnDone: { backgroundColor: COLORS.success },
  addBtnOff: { backgroundColor: '#bbb' },
  qtyBadge: { backgroundColor: '#FFC107', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  qtyTxt: { color: '#333', fontSize: 13, fontFamily: 'Cairo_700Bold' },

  // Floating Cart
  floatCart: { position: 'absolute', bottom: 20, left: 16, right: 16, borderRadius: 18, overflow: 'hidden', ...SHADOWS.large },
  floatCartInner: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  cartBadge: { backgroundColor: '#fff', borderRadius: 50, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  cartBadgeTxt: { color: COLORS.primary, fontSize: 14, fontFamily: 'Cairo_700Bold' },
  floatCartTxt: { flex: 1, fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'center' },
  floatCartPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff' },

  // Ratings
  ratingsWrap: { padding: 4 },
  ratingSummary: { backgroundColor: '#fff', borderRadius: 18, padding: 24, marginBottom: 16, alignItems: 'center', ...SHADOWS.small },
  ratingBig: { fontSize: 44, fontFamily: 'Cairo_700Bold', color: '#222' },
  ratingStars: { flexDirection: 'row-reverse', gap: 3, marginTop: 4 },
  ratingCount: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#999', marginTop: 6 },
  noRatings: { alignItems: 'center', paddingVertical: 40 },
  noRatingsTxt: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: '#999', marginTop: 12 },
  noRatingsSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#bbb', marginTop: 4 },
  ratingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOWS.small },
  ratingHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ratingStarsRow: { flexDirection: 'row-reverse', gap: 2 },
  ratingUser: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  userAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#333' },
  ratingComment: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#666', lineHeight: 20, textAlign: 'right', marginBottom: 6 },
  ratingDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#bbb', textAlign: 'right' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#F5F5F5', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalClose: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'center', flex: 1 },
  modalBody: { padding: 16 },
  addonGroup: { marginBottom: 20 },
  addonGroupHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addonGroupTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  addonGroupMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reqTxt: { color: '#fff', fontSize: 11, fontFamily: 'Cairo_700Bold' },
  maxTxt: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#999' },
  addonOpt: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EEE' },
  addonOptSel: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  addonOptRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  chk: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  chkSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radio: { borderRadius: 11 },
  addonOptName: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333' },
  addonOptNameSel: { fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },
  addonOptPrice: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#4CAF50' },
  modalFoot: { padding: 16, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#fff' },
  modalTotalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTotalLabel: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#999' },
  modalTotalVal: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: COLORS.primary },
  modalAddBtn: { borderRadius: 16, overflow: 'hidden' },
  modalAddBtnInner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  modalAddBtnTxt: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#fff' },
});
