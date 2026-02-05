import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantAPI, locationAPI, advertisementsAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore, City, District } from '../../src/store/locationStore';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface Restaurant {
  id: string;
  name: string;
  description: string;
  image?: string;
  address: string;
  area: string;
  city_id?: string;
  cuisine_type: string;
  rating: number;
  review_count: number;
  is_open: boolean;
  is_featured?: boolean;
  delivery_fee: number;
  min_order: number;
  delivery_time: string;
}

const CATEGORIES = [
  { id: 'all', name: 'الكل', icon: '🍽️' },
  { id: 'برجر', name: 'برجر', icon: '🍔' },
  { id: 'إيطالي', name: 'بيتزا', icon: '🍕' },
  { id: 'مشاوي', name: 'مشاوي', icon: '🍗' },
  { id: 'شامي', name: 'سوري', icon: '🥙' },
  { id: 'فطائر', name: 'فطائر', icon: '🥧' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedCity, selectedDistrict, cities, setCities, setLocation, isLocationSet } = useLocationStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCityLocal, setSelectedCityLocal] = useState<City | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Fetch cities and advertisements on mount
  useEffect(() => {
    const loadData = async () => {
      // Load cities
      if (cities.length === 0) {
        try {
          const data = await locationAPI.getCities();
          setCities(data);
        } catch (error) {
          console.error('Error loading cities:', error);
        }
      }
      // Load advertisements
      try {
        const ads = await advertisementsAPI.getAll();
        setAdvertisements(ads);
      } catch (error) {
        console.error('Error loading advertisements:', error);
      }
    };
    loadData();
  }, []);

  // Auto-rotate advertisements
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  const fetchRestaurants = async () => {
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') {
        filters.cuisine = selectedCategory;
      }
      // Filter by city if location is set
      if (selectedCity) {
        filters.city_id = selectedCity.id;
      }
      const data = await restaurantAPI.getAll(filters);
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRestaurants();
    }, [selectedCategory, selectedCity])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.includes(searchQuery) || r.cuisine_type.includes(searchQuery)
  );

  const renderRestaurantCard = (restaurant: Restaurant, index: number) => (
    <TouchableOpacity
      key={restaurant.id}
      style={styles.restaurantCard}
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      activeOpacity={0.9}
    >
      {/* Image Container - 70% */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: restaurant.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600' }}
          style={styles.restaurantImage}
        />
        {/* Overlay Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageOverlay}
        />
        
        {/* Badges */}
        <View style={styles.badgesContainer}>
          {restaurant.is_open ? (
            <View style={[styles.badge, styles.badgeOpen]}>
              <Text style={styles.badgeText}>🟢 مفتوح</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeClosed]}>
              <Text style={styles.badgeText}>🔴 مغلق</Text>
            </View>
          )}
          {restaurant.is_featured && (
            <View style={[styles.badge, styles.badgeFeatured]}>
              <Text style={styles.badgeText}>⭐ مميز</Text>
            </View>
          )}
        </View>

        {/* Restaurant Name on Image */}
        <View style={styles.imageTextContainer}>
          <Text style={styles.restaurantNameOnImage}>{restaurant.name}</Text>
          <Text style={styles.cuisineTypeOnImage}>{restaurant.cuisine_type}</Text>
        </View>
      </View>

      {/* Info Container - 30% */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={COLORS.accent} />
            <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({restaurant.review_count})</Text>
          </View>
          
          <View style={styles.deliveryInfo}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.deliveryText}>{restaurant.delivery_time}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.feeContainer}>
            <Ionicons name="bicycle-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.feeText}>توصيل: {restaurant.delivery_fee.toLocaleString()} ل.س</Text>
          </View>
          
          <Text style={styles.minOrder}>الحد الأدنى: {restaurant.min_order.toLocaleString()} ل.س</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل المطاعم...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          {/* Location Bar */}
          <TouchableOpacity 
            style={styles.locationBar}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons name="chevron-down" size={20} color={COLORS.textWhite} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>التوصيل إلى</Text>
              <Text style={styles.locationText}>
                {selectedCity?.name || 'اختر موقعك'}
                {selectedDistrict && ` - ${selectedDistrict.name}`}
              </Text>
            </View>
            <Ionicons name="location" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerGreeting}>شو ناكل اليوم؟ 😋</Text>
              <Text style={styles.headerSubtitle}>
                {selectedCity 
                  ? `${restaurants.length} مطعم في ${selectedCity.name}` 
                  : 'اختر موقعك لعرض المطاعم'}
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>🍽️</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="دور على مطعم أو أكلة..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Advertisements Slider */}
        {advertisements.length > 0 && (
          <View style={styles.adsContainer}>
            <TouchableOpacity
              style={styles.adCard}
              activeOpacity={0.9}
              onPress={() => {
                const ad = advertisements[currentAdIndex];
                if (ad?.link_type === 'restaurant' && ad?.link_value) {
                  router.push(`/restaurant/${ad.link_value}`);
                }
              }}
            >
              <Image
                source={{ uri: advertisements[currentAdIndex]?.image_url }}
                style={styles.adImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.adOverlay}
              >
                <Text style={styles.adTitle}>{advertisements[currentAdIndex]?.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* Dots Indicator */}
            {advertisements.length > 1 && (
              <View style={styles.dotsContainer}>
                {advertisements.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentAdIndex === index && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={styles.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>المطاعم القريبة 🔥</Text>
        </View>

        {/* Restaurant Cards */}
        <View style={styles.restaurantsContainer}>
          {filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant, index) => renderRestaurantCard(restaurant, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>
                {selectedCity ? 'لا توجد مطاعم متاحة في هذه المدينة' : 'اختر موقعك أولاً'}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedCity ? 'جرب تغيير الفلتر أو البحث' : 'اضغط على "التوصيل إلى" لاختيار مدينتك'}
              </Text>
              {!selectedCity && (
                <TouchableOpacity 
                  style={styles.selectLocationButton}
                  onPress={() => setShowLocationModal(true)}
                >
                  <Text style={styles.selectLocationButtonText}>اختر موقعك</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>اختر المدينة</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.citiesList}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.cityItem,
                    selectedCity?.id === city.id && styles.cityItemSelected,
                  ]}
                  onPress={() => {
                    setLocation(city);
                    setShowLocationModal(false);
                  }}
                >
                  <Text style={[
                    styles.cityName,
                    selectedCity?.id === city.id && styles.cityNameSelected,
                  ]}>
                    {city.name}
                  </Text>
                  {selectedCity?.id === city.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  scrollView: {
    flex: 1,
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
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  locationBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  locationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationLabel: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  locationText: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerGreeting: {
    fontSize: 28,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 30,
    fontFamily: 'Cairo_400Regular',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 54,
    ...SHADOWS.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
  },

  // Categories
  categoriesContainer: {
    marginTop: -20,
    marginBottom: SPACING.lg,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    marginLeft: SPACING.sm,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryTextActive: {
    color: COLORS.textWhite,
  },

  // Advertisements
  adsContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  adCard: {
    width: '100%',
    height: 150,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  adTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Restaurant Cards
  restaurantsContainer: {
    paddingHorizontal: SPACING.lg,
  },
  restaurantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  badgesContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeOpen: {
    backgroundColor: COLORS.success,
  },
  badgeClosed: {
    backgroundColor: COLORS.error,
  },
  badgeDiscount: {
    backgroundColor: COLORS.accent,
  },
  badgeText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  imageTextContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
  },
  restaurantNameOnImage: {
    fontSize: 22,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  cuisineTypeOnImage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
  },

  // Info Container
  infoContainer: {
    padding: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  reviewCount: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  feeContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  feeText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  minOrder: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    fontFamily: 'Cairo_400Regular',
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectLocationButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  selectLocationButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  citiesList: {
    padding: SPACING.lg,
  },
  cityItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  cityItemSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cityName: {
    fontSize: 17,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  cityNameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
