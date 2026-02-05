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
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import MapLocationPicker from '../../src/components/MapLocationPicker';

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
  const [districtSearch, setDistrictSearch] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
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
        {/* Header */}
        <View style={styles.header}>
          {/* Location Bar */}
          <TouchableOpacity 
            style={styles.locationBar}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={18} color="#fff" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>التوصيل إلى</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {selectedCity?.name 
                  ? `${selectedCity.name}${selectedDistrict ? ` - ${selectedDistrict.name}` : ''}`
                  : 'اختر موقعك'}
              </Text>
            </View>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingTextBox}>
              <Text style={styles.greetingTitle}>شو ناكل اليوم؟ 😋</Text>
              <Text style={styles.greetingSubtitle}>
                {selectedCity 
                  ? `${restaurants.length} مطعم متوفر في ${selectedCity.name}` 
                  : 'اختر موقعك لعرض المطاعم'}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="دور على مطعم أو أكلة..."
              placeholderTextColor="#bbb"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#bbb" />
              </TouchableOpacity>
            )}
          </View>
        </View>

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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                if (selectedCityLocal) {
                  setSelectedCityLocal(null);
                  setDistrictSearch('');
                } else {
                  setShowLocationModal(false);
                }
              }}>
                <Ionicons 
                  name={selectedCityLocal ? "arrow-forward" : "close"} 
                  size={24} 
                  color={COLORS.textPrimary} 
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedCityLocal ? `أحياء ${selectedCityLocal.name}` : 'اختر مدينتك'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* City Selection */}
            {!selectedCityLocal ? (
              <ScrollView style={styles.locationScroll} showsVerticalScrollIndicator={false}>
                {/* Map button */}
                <TouchableOpacity
                  style={styles.mapPickerBtn}
                  onPress={() => {
                    setShowLocationModal(false);
                    setTimeout(() => setShowMapPicker(true), 300);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.mapPickerIcon}>
                    <Ionicons name="map" size={24} color="#fff" />
                  </View>
                  <View style={styles.mapPickerInfo}>
                    <Text style={styles.mapPickerTitle}>حدد على الخريطة</Text>
                    <Text style={styles.mapPickerSubtitle}>اختر موقعك بدقة من الخريطة</Text>
                  </View>
                  <Ionicons name="chevron-back" size={20} color="#999" />
                </TouchableOpacity>

                <Text style={styles.locationHint}>أو اختر مدينتك</Text>
                <View style={styles.cityGrid}>
                  {cities.map((city) => {
                    const cityIcons: { [key: string]: string } = {
                      'دمشق': '🏛️', 'حلب': '🏰', 'حمص': '🌆', 'اللاذقية': '🌊', 'طرطوس': '⛵',
                    };
                    const isSelected = selectedCity?.id === city.id;
                    return (
                      <TouchableOpacity
                        key={city.id}
                        style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                        onPress={() => setSelectedCityLocal(city)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cityCardIcon}>{cityIcons[city.name] || '📍'}</Text>
                        <Text style={[styles.cityCardName, isSelected && styles.cityCardNameSelected]}>
                          {city.name}
                        </Text>
                        <Text style={styles.cityCardCount}>
                          {city.districts?.length || 0} حي
                        </Text>
                        {isSelected && (
                          <View style={styles.cityCardCheck}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              /* District Selection */
              <View style={{ flex: 1 }}>
                {/* District Search */}
                <View style={styles.districtSearchBox}>
                  <Ionicons name="search" size={18} color="#999" />
                  <TextInput
                    style={styles.districtSearchInput}
                    placeholder={`ابحث في أحياء ${selectedCityLocal.name}...`}
                    placeholderTextColor="#bbb"
                    value={districtSearch}
                    onChangeText={setDistrictSearch}
                    textAlign="right"
                  />
                </View>

                {/* Select city without district */}
                <TouchableOpacity
                  style={styles.allCityBtn}
                  onPress={() => {
                    setLocation(selectedCityLocal);
                    setSelectedCityLocal(null);
                    setDistrictSearch('');
                    setShowLocationModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={18} color={COLORS.primary} />
                  <Text style={styles.allCityBtnText}>كل {selectedCityLocal.name}</Text>
                </TouchableOpacity>

                {/* Districts List */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.districtGrid}>
                    {(selectedCityLocal.districts || [])
                      .filter((d) => d.name.includes(districtSearch))
                      .map((district) => {
                        const isSelected = selectedDistrict?.id === district.id && selectedCity?.id === selectedCityLocal.id;
                        return (
                          <TouchableOpacity
                            key={district.id}
                            style={[styles.districtChip, isSelected && styles.districtChipSelected]}
                            onPress={() => {
                              setLocation(selectedCityLocal, district);
                              setSelectedCityLocal(null);
                              setDistrictSearch('');
                              setShowLocationModal(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.districtChipText, isSelected && styles.districtChipTextSelected]}>
                              {district.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </ScrollView>
              </View>
            )}
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  locationBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.75)',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
  greetingRow: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  greetingTextBox: {
    alignItems: 'flex-end',
  },
  greetingTitle: {
    fontSize: 24,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
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
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginHorizontal: 10,
  },

  // Categories
  categoriesContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  badgeFeatured: {
    backgroundColor: '#FF9800',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_700Bold',
    color: '#333',
  },

  // Location modal
  locationScroll: {
    padding: 16,
  },
  locationHint: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  cityCard: {
    width: '45%',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  cityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F5',
  },
  cityCardIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  cityCardName: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  cityCardNameSelected: {
    color: COLORS.primary,
  },
  cityCardCount: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#aaa',
  },
  cityCardCheck: {
    position: 'absolute',
    top: 8,
    left: 8,
  },

  // District selection
  districtSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  districtSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
    marginHorizontal: 8,
  },
  allCityBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  allCityBtnText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.primary,
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  districtChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  districtChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  districtChipText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    color: '#555',
  },
  districtChipTextSelected: {
    color: '#fff',
  },

  // OLD - keep for compatibility
  citiesList: {
    padding: 16,
  },
  cityItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  cityItemSelected: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cityName: {
    fontSize: 17,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
  },
  cityNameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
