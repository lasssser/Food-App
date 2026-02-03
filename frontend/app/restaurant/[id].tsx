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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantAPI } from '../../src/services/api';
import { useCartStore } from '../../src/store/cartStore';
import { Restaurant, MenuItem } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const { height } = Dimensions.get('window');
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

  const handleAddToCart = (menuItem: MenuItem) => {
    if (!restaurant) return;
    
    addItem(menuItem, restaurant);

    // Show animation feedback
    setAddedItems(prev => new Set(prev).add(menuItem.id));
    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(menuItem.id);
        return next;
      });
    }, 500);
  };

  const getItemQuantity = (itemId: string) => {
    const cartItem = items.find(i => i.menuItem.id === itemId);
    return cartItem?.quantity || 0;
  };

  const getTotalCartItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalCartPrice = () => {
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
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
                    onPress={() => handleAddToCart(item)}
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
});
