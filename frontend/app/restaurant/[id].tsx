import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantAPI } from '../../src/services/api';
import { useCartStore } from '../../src/store/cartStore';
import { Restaurant, MenuItem, AddOnGroup, SelectedAddOn } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const { height, width } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.35;

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, items } = useCartStore();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('الأكثر طلباً');
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
          const [restaurantData, menuData] = await Promise.all([
            restaurantAPI.getById(id!),
            restaurantAPI.getMenu(id!),
          ]);
          setRestaurant(restaurantData);
          setMenuItems(menuData);
        } catch (error) {
          console.error('Error fetching restaurant:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [id])
  );

  const categories = ['الأكثر طلباً', ...new Set(menuItems.map((item) => item.category))];

  const filteredItems = selectedCategory === 'الأكثر طلباً'
    ? menuItems.slice(0, 6)
    : menuItems.filter((item) => item.category === selectedCategory);

  const fetchAddOns = async (menuItemId: string): Promise<AddOnGroup[]> => {
    try {
      setLoadingAddOns(true);
      const response = await fetch(`/api/restaurants/${id}/menu/${menuItemId}/addons`);
      const data = await response.json();
      setAddOnGroups(data || []);
      
      // Initialize selections for required groups
      const initialSelections: { [groupId: string]: string[] } = {};
      (data || []).forEach((group: AddOnGroup) => {
        if (group.is_required && group.options.length > 0) {
          initialSelections[group.id] = [group.options[0].id];
        } else {
          initialSelections[group.id] = [];
        }
      });
      setSelectedAddOns(initialSelections);
      return data || [];
    } catch (error) {
      console.error('Error fetching add-ons:', error);
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
    
    // If no add-ons, add directly to cart
    if (fetchedAddOns.length === 0) {
      addToCartDirectly(menuItem);
    } else {
      setShowAddOnModal(true);
    }
  };

  // This effect handles the case when addOnGroups is loaded
  useEffect(() => {
    if (selectedMenuItem && !loadingAddOns) {
      if (addOnGroups.length === 0 && !showAddOnModal) {
        addToCartDirectly(selectedMenuItem);
      } else if (addOnGroups.length > 0 && !showAddOnModal) {
        setShowAddOnModal(true);
      }
    }
  }, [addOnGroups, loadingAddOns]);

  const addToCartDirectly = (menuItem: MenuItem) => {
    if (!restaurant) return;
    addItem(menuItem, restaurant, []);
    showAddedFeedback(menuItem.id);
    setSelectedMenuItem(null);
  };

  const showAddedFeedback = (itemId: string) => {
    setAddedItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 500);
  };

  const handleAddOnSelect = (groupId: string, optionId: string, maxSelections: number) => {
    setSelectedAddOns(prev => {
      const currentSelections = prev[groupId] || [];
      
      if (maxSelections === 1) {
        // Single selection - replace
        return { ...prev, [groupId]: [optionId] };
      } else {
        // Multiple selections
        if (currentSelections.includes(optionId)) {
          // Deselect
          return { ...prev, [groupId]: currentSelections.filter(id => id !== optionId) };
        } else if (currentSelections.length < maxSelections) {
          // Add selection
          return { ...prev, [groupId]: [...currentSelections, optionId] };
        }
        return prev;
      }
    });
  };

  const confirmAddToCart = () => {
    if (!selectedMenuItem || !restaurant) return;
    
    // Check if all required groups have selections
    const missingRequired = addOnGroups.some(
      group => group.is_required && (!selectedAddOns[group.id] || selectedAddOns[group.id].length === 0)
    );
    
    if (missingRequired) {
      // Could show an alert, but for now just return
      return;
    }
    
    // Build selected add-ons array
    const addOns: SelectedAddOn[] = [];
    addOnGroups.forEach(group => {
      const selected = selectedAddOns[group.id] || [];
      selected.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) {
          addOns.push({
            group_name: group.name,
            option_name: option.name,
            price: option.price,
          });
        }
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
      const selected = selectedAddOns[group.id] || [];
      selected.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) {
          total += option.price;
        }
      });
    });
    return total;
  };

  const getItemQuantity = (itemId: string) => {
    const cartItem = items.find(i => i.menuItem.id === itemId);
    return cartItem?.quantity || 0;
  };

  const getTotalCartItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalCartPrice = () => {
    return items.reduce((sum, item) => {
      const addOnsPrice = item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0;
      return sum + (item.menuItem.price + addOnsPrice) * item.quantity;
    }, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل المنيو...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>المطعم غير موجود</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: restaurant.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600' }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.heroOverlay}
        />
        
        {/* Back Button */}
        <SafeAreaView style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-forward" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="heart-outline" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Restaurant Info on Hero */}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{restaurant.name}</Text>
          <Text style={styles.heroCuisine}>{restaurant.cuisine_type}</Text>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="star" size={18} color={COLORS.accent} />
              <Text style={styles.heroStatText}>{restaurant.rating.toFixed(1)}</Text>
              <Text style={styles.heroStatLabel}>({restaurant.review_count}+ تقييم)</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={18} color={COLORS.textWhite} />
              <Text style={styles.heroStatText}>{restaurant.delivery_time}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="bicycle-outline" size={18} color={COLORS.textWhite} />
              <Text style={styles.heroStatText}>{restaurant.delivery_fee.toLocaleString()} ل.س</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Content */}
      <View style={styles.menuContainer}>
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesTabs}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                selectedCategory === category && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <ScrollView
          style={styles.menuList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.menuItemDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.menuItemPrice}>
                    {item.price.toLocaleString()} ل.س
                  </Text>
                </View>
                
                <View style={styles.menuItemImageContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                  ) : (
                    <View style={[styles.menuItemImage, styles.menuItemImagePlaceholder]}>
                      <Ionicons name="restaurant-outline" size={30} color={COLORS.textLight} />
                    </View>
                  )}
                  
                  {/* Add Button */}
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      addedItems.has(item.id) && styles.addButtonActive,
                      !item.is_available && styles.addButtonDisabled,
                    ]}
                    onPress={() => handleAddToCartPress(item)}
                    disabled={!item.is_available}
                    activeOpacity={0.8}
                  >
                    {getItemQuantity(item.id) > 0 ? (
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>{getItemQuantity(item.id)}</Text>
                      </View>
                    ) : (
                      <Ionicons 
                        name={addedItems.has(item.id) ? "checkmark" : "add"} 
                        size={24} 
                        color={COLORS.textWhite} 
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Floating Cart Button */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => router.push('/(main)/cart')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.floatingCartGradient}
          >
            <View style={styles.floatingCartContent}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {getTotalCartItems()}
                </Text>
              </View>
              <Text style={styles.floatingCartText}>عرض السلة</Text>
              <Text style={styles.floatingCartPrice}>
                {getTotalCartPrice().toLocaleString()} ل.س
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Add-on Selection Modal */}
      <Modal
        visible={showAddOnModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddOnModal(false);
          setSelectedMenuItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAddOnModal(false);
                  setSelectedMenuItem(null);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedMenuItem?.name || 'اختر الإضافات'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {loadingAddOns ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : (
                addOnGroups.map((group) => (
                  <View key={group.id} style={styles.addOnGroup}>
                    <View style={styles.addOnGroupHeader}>
                      <Text style={styles.addOnGroupTitle}>{group.name}</Text>
                      <View style={styles.addOnGroupMeta}>
                        {group.is_required && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>مطلوب</Text>
                          </View>
                        )}
                        {group.max_selections > 1 && (
                          <Text style={styles.maxSelectionsText}>
                            اختر حتى {group.max_selections}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.addOnOptions}>
                      {group.options.map((option) => {
                        const isSelected = selectedAddOns[group.id]?.includes(option.id);
                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.addOnOption,
                              isSelected && styles.addOnOptionSelected,
                            ]}
                            onPress={() => handleAddOnSelect(group.id, option.id, group.max_selections)}
                          >
                            <View style={styles.addOnOptionContent}>
                              <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxSelected,
                                group.max_selections === 1 && styles.radioButton,
                              ]}>
                                {isSelected && (
                                  <Ionicons 
                                    name="checkmark" 
                                    size={16} 
                                    color={COLORS.textWhite} 
                                  />
                                )}
                              </View>
                              <Text style={[
                                styles.addOnOptionName,
                                isSelected && styles.addOnOptionNameSelected,
                              ]}>
                                {option.name}
                              </Text>
                            </View>
                            {option.price > 0 && (
                              <Text style={styles.addOnOptionPrice}>
                                +{option.price.toLocaleString()} ل.س
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>السعر الكلي:</Text>
                <Text style={styles.modalTotalPrice}>
                  {((selectedMenuItem?.price || 0) + calculateAddOnsTotal()).toLocaleString()} ل.س
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={confirmAddToCart}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.modalAddButtonGradient}
                >
                  <Ionicons name="cart" size={22} color={COLORS.textWhite} />
                  <Text style={styles.modalAddButtonText}>أضف إلى السلة</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: SPACING.lg,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  backButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Hero
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  heroName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
    marginBottom: 4,
  },
  heroCuisine: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  heroStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  heroStat: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  heroStatText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  heroDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: SPACING.md,
  },

  // Menu Container
  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    marginTop: -RADIUS.xl,
  },

  // Category Tabs
  categoriesTabs: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTabTextActive: {
    color: COLORS.textWhite,
  },

  // Menu List
  menuList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  menuItemContent: {
    flexDirection: 'row-reverse',
    padding: SPACING.md,
  },
  menuItemInfo: {
    flex: 1,
    paddingLeft: SPACING.md,
    alignItems: 'flex-end',
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  menuItemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  menuItemImageContainer: {
    position: 'relative',
  },
  menuItemImage: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    resizeMode: 'cover',
  },
  menuItemImagePlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  addButtonActive: {
    backgroundColor: COLORS.success,
    transform: [{ scale: 1.1 }],
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  quantityBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  floatingCartGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  floatingCartContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartBadge: {
    backgroundColor: COLORS.textWhite,
    borderRadius: RADIUS.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  floatingCartText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'center',
  },
  floatingCartPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  
  // Add-on Group
  addOnGroup: {
    marginBottom: SPACING.xl,
  },
  addOnGroupHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  addOnGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  addOnGroupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requiredBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  requiredText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: 'bold',
  },
  maxSelectionsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
  // Add-on Options
  addOnOptions: {
    gap: SPACING.sm,
  },
  addOnOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addOnOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  addOnOptionContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radioButton: {
    borderRadius: 12,
  },
  addOnOptionName: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  addOnOptionNameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  addOnOptionPrice: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Modal Footer
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  modalTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTotalLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalTotalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalAddButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  modalAddButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  modalAddButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
});
