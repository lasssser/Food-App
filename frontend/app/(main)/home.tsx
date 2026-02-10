import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { restaurantAPI, locationAPI, advertisementsAPI, categoriesAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

const fp = (n: number | null | undefined): string => {
  if (n == null || isNaN(Number(n))) return '0';
  const parts = Math.round(Number(n)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

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

interface City {
  id: string;
  name: string;
  name_en: string;
  lat: number;
  lng: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'all', name: 'الكل', icon: 'grid-outline' },
  { id: 'burger', name: 'برجر', icon: 'fast-food-outline' },
  { id: 'pizza', name: 'بيتزا', icon: 'pizza-outline' },
  { id: 'grills', name: 'مشاوي', icon: 'flame-outline' },
  { id: 'syrian', name: 'سوري', icon: 'restaurant-outline' },
  { id: 'pastries', name: 'فطائر', icon: 'cafe-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedCityName, setDetectedCityName] = useState<string>('كل المدن');
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Load cities and categories
  useEffect(() => {
    const loadCities = async () => {
      try {
        const data = await locationAPI.getCities();
        setCities(data || []);
      } catch {}
    };
    const loadCategories = async () => {
      try {
        const data = await categoriesAPI.getAll();
        if (data && data.length > 0) {
          setCategories(data);
        }
      } catch {}
    };
    loadCities();
    loadCategories();
  }, []);

  const detectLocation = async () => {
    setLocatingGPS(true);
    setGpsError(null);
    try {
      const { status } = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise<any>((_, reject) => setTimeout(() => reject('timeout'), 5000)),
      ]);
      if (status !== 'granted') {
        setGpsError('لم يتم منح إذن الموقع');
        setLocatingGPS(false);
        return null;
      }
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<any>((_, reject) => setTimeout(() => reject('timeout'), 8000)),
      ]);
      const result = await locationAPI.detectCity(loc.coords.latitude, loc.coords.longitude);
      
      // Check if user is outside coverage area
      if (result.outside_coverage) {
        setGpsError('أنت خارج نطاق التغطية. اختر مدينتك يدوياً.');
        setDetectedCity(null);
        setDetectedCityName('كل المدن');
        setLocatingGPS(false);
        return null;
      }
      
      setDetectedCity(result.city_id);
      setDetectedCityName(result.city_name);
      setGpsError(null);
      setLocatingGPS(false);
      return result.city_id;
    } catch (e) {
      setGpsError('تعذر تحديد الموقع');
      setDetectedCity(null);
      setDetectedCityName('كل المدن');
      setLocatingGPS(false);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const ads = await advertisementsAPI.getAll();
        setAdvertisements(ads);
      } catch {}
      await detectLocation();
    };
    init();
  }, []);

  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  // Debounce search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 500);
  };

  const fetchRestaurants = async () => {
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') {
        // Send category name for cuisine matching
        const cat = categories.find(c => c.id === selectedCategory);
        if (cat) filters.cuisine = cat.name;
      }
      if (detectedCity) filters.city_id = detectedCity;
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      const data = await restaurantAPI.getAll(filters);
      setRestaurants(data || []);
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
    }, [selectedCategory, detectedCity, debouncedSearch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await detectLocation();
    fetchRestaurants();
  };

  const selectCity = (cityId: string | null, cityName: string) => {
    setDetectedCity(cityId);
    setDetectedCityName(cityName);
    setShowCityModal(false);
  };

  const handleGPSDetect = async () => {
    const cityId = await detectLocation();
    if (cityId) {
      setShowCityModal(false);
    }
  };

  const featuredRestaurants = restaurants.filter(r => r.is_featured);
  const regularRestaurants = restaurants.filter(r => !r.is_featured);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <View style={s.loadingLogo}>
          <Ionicons name="restaurant" size={40} color={COLORS.primary} />
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        <Text style={s.loadingText}>جاري تحميل المطاعم...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* === CITY SELECTION MODAL === */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCityModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowCityModal(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={s.modalHandle} />

            {/* Title */}
            <Text style={s.modalTitle}>اختر منطقة التوصيل</Text>

            {/* GPS Button */}
            <TouchableOpacity
              style={s.gpsButton}
              onPress={handleGPSDetect}
              activeOpacity={0.7}
              disabled={locatingGPS}
              data-testid="gps-detect-btn"
            >
              <View style={s.gpsIconWrap}>
                {locatingGPS ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="navigate" size={22} color={COLORS.primary} />
                )}
              </View>
              <View style={s.gpsTextWrap}>
                <Text style={s.gpsTitle}>
                  {locatingGPS ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
                </Text>
                <Text style={s.gpsSubtitle}>
                  {gpsError ? gpsError : 'تحديد تلقائي عبر GPS'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.modalDivider}>
              <View style={s.modalDividerLine} />
              <Text style={s.modalDividerText}>أو اختر مدينة</Text>
              <View style={s.modalDividerLine} />
            </View>

            {/* All Cities Option */}
            <TouchableOpacity
              style={[s.cityItem, !detectedCity && s.cityItemActive]}
              onPress={() => selectCity(null, 'كل المدن')}
              activeOpacity={0.7}
              data-testid="city-all"
            >
              <View style={[s.cityIconWrap, !detectedCity && s.cityIconWrapActive]}>
                <Ionicons name="globe-outline" size={20} color={!detectedCity ? '#fff' : COLORS.textSecondary} />
              </View>
              <Text style={[s.cityName, !detectedCity && s.cityNameActive]}>كل المدن</Text>
              {!detectedCity && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            {/* City List */}
            <ScrollView style={s.cityList} showsVerticalScrollIndicator={false}>
              {cities.map((city) => {
                const isSelected = detectedCity === city.id;
                return (
                  <TouchableOpacity
                    key={city.id}
                    style={[s.cityItem, isSelected && s.cityItemActive]}
                    onPress={() => selectCity(city.id, city.name)}
                    activeOpacity={0.7}
                    data-testid={`city-${city.id}`}
                  >
                    <View style={[s.cityIconWrap, isSelected && s.cityIconWrapActive]}>
                      <Ionicons name="location-outline" size={20} color={isSelected ? '#fff' : COLORS.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cityName, isSelected && s.cityNameActive]}>{city.name}</Text>
                      <Text style={s.cityNameEn}>{city.name_en}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={s.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {/* === HEADER === */}
        <LinearGradient colors={['#E53935', '#B71C1C']} style={s.header}>
          {/* Top Row: Location + Map */}
          <View style={s.topRow}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.mapBtn} data-testid="map-btn">
              <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.locationPill}
              onPress={() => setShowCityModal(true)}
              activeOpacity={0.7}
              data-testid="location-pill-btn"
            >
              <View style={s.locationDot}>
                {locatingGPS ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="location" size={16} color="#fff" />
                )}
              </View>
              <View style={s.locationTextWrap}>
                <Text style={s.locationLabel}>التوصيل إلى</Text>
                <Text style={s.locationCity} numberOfLines={1}>{detectedCityName}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={s.greetingWrap}>
            <Text style={s.greetingMain}>
              {user?.name ? `أهلاً ${user.name.split(' ')[0]}` : 'شو ناكل اليوم؟'}
            </Text>
            <Text style={s.greetingSub}>
              {restaurants.length > 0 
                ? `${restaurants.filter(r => r.is_open).length} مطعم مفتوح الآن`
                : 'اكتشف المطاعم القريبة منك'}
            </Text>
          </View>

          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث عن مطعم أو نوع أكل..."
              placeholderTextColor="#bbb"
              value={searchQuery}
              onChangeText={handleSearchChange}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedSearch(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* === CATEGORIES === */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll} style={{ marginTop: 16, marginBottom: 8 }}>
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, active && s.catChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as any} size={18} color={active ? '#fff' : COLORS.textSecondary} />
                <Text style={[s.catText, active && s.catTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* === ADS BANNER === */}
        {advertisements.length > 0 && (
          <View style={s.adSection}>
            <TouchableOpacity
              style={s.adCard}
              activeOpacity={0.95}
              onPress={() => {
                const ad = advertisements[currentAdIndex];
                if (ad?.link_type === 'restaurant' && ad?.link_value) {
                  router.push(`/restaurant/${ad.link_value}`);
                }
              }}
            >
              <Image source={{ uri: advertisements[currentAdIndex]?.image_url }} style={s.adImg} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.adGrad}>
                <Text style={s.adTitle}>{advertisements[currentAdIndex]?.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {advertisements.length > 1 && (
              <View style={s.adDots}>
                {advertisements.map((_, i) => (
                  <View key={i} style={[s.adDot, currentAdIndex === i && s.adDotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* === FEATURED RESTAURANTS === */}
        {featuredRestaurants.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>المميزة</Text>
              <Ionicons name="star" size={18} color="#FF9800" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
              {featuredRestaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={s.featuredCard}
                  onPress={() => router.push(`/restaurant/${r.id}`)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: r.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={s.featuredImg} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.featuredGrad}>
                    <Text style={s.featuredName} numberOfLines={1}>{r.name}</Text>
                    <View style={s.featuredMeta}>
                      <View style={s.featuredRating}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={s.featuredRatingTxt}>{(r.rating ?? 0).toFixed(1)}</Text>
                      </View>
                      <Text style={s.featuredCuisine}>{r.cuisine_type}</Text>
                    </View>
                  </LinearGradient>
                  {!r.is_open && (
                    <View style={s.closedOverlay}>
                      <Text style={s.closedTxt}>مغلق</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* === ALL RESTAURANTS === */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.mapPill}>
              <Ionicons name="map" size={14} color="#fff" />
              <Text style={s.mapPillTxt}>الخريطة</Text>
            </TouchableOpacity>
            <Text style={s.sectionTitle}>المطاعم القريبة</Text>
          </View>

          {(regularRestaurants.length > 0 || featuredRestaurants.length > 0) ? (
            <View style={s.cardsWrap}>
              {(regularRestaurants.length > 0 ? regularRestaurants : filteredRestaurants).map((restaurant) => (
                <TouchableOpacity
                  key={restaurant.id}
                  style={s.card}
                  onPress={() => router.push(`/restaurant/${restaurant.id}`)}
                  activeOpacity={0.92}
                  data-testid={`restaurant-card-${restaurant.id}`}
                >
                  {/* Image */}
                  <View style={s.cardImgWrap}>
                    <Image
                      source={{ uri: restaurant.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600' }}
                      style={s.cardImg}
                    />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={s.cardImgGrad} />
                    
                    {/* Status Badge */}
                    <View style={[s.statusBadge, { backgroundColor: restaurant.is_open ? '#16a34a' : '#dc2626' }]}>
                      <View style={[s.statusDot, { backgroundColor: restaurant.is_open ? '#86efac' : '#fca5a5' }]} />
                      <Text style={s.statusTxt}>{restaurant.is_open ? 'مفتوح' : 'مغلق'}</Text>
                    </View>

                    {/* Featured Star */}
                    {restaurant.is_featured && (
                      <View style={s.featuredStar}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                      </View>
                    )}

                    {/* Name overlay on image */}
                    <View style={s.cardNameWrap}>
                      <Text style={s.cardName} numberOfLines={1}>{restaurant.name}</Text>
                      <Text style={s.cardCuisine}>{restaurant.cuisine_type}</Text>
                    </View>
                  </View>

                  {/* Info Row */}
                  <View style={s.cardInfo}>
                    <View style={s.cardInfoRow}>
                      {/* Rating */}
                      <View style={s.cardStat}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={s.cardStatBold}>{(restaurant.rating ?? 0).toFixed(1)}</Text>
                        <Text style={s.cardStatLight}>({restaurant.review_count ?? 0})</Text>
                      </View>

                      {/* Delivery time */}
                      <View style={s.cardStat}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                        <Text style={s.cardStatMed}>{restaurant.delivery_time || '30-45 د'}</Text>
                      </View>

                      {/* Delivery fee */}
                      <View style={s.cardStat}>
                        <Ionicons name="bicycle-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={s.cardStatMed}>{fp(restaurant.delivery_fee)} ل.س</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <View style={s.emptyCircle}>
                <Ionicons name="restaurant-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>لا توجد مطاعم</Text>
              <Text style={s.emptySub}>جرب تغيير الفلتر أو البحث</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8fa' },
  scrollView: { flex: 1 },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8fa' },
  loadingLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  loadingText: { marginTop: 16, fontSize: 15, fontFamily: 'Cairo_400Regular', color: COLORS.textSecondary },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mapBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },

  // Location Pill - Professional design
  locationPill: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  locationDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextWrap: { flex: 1, alignItems: 'flex-end' },
  locationLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)' },
  locationCity: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff' },

  greetingWrap: { alignItems: 'flex-end', marginBottom: 18 },
  greetingMain: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: '#fff', lineHeight: 36 },
  greetingSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, height: 50, ...SHADOWS.small },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: COLORS.textPrimary, marginHorizontal: 10, textAlign: 'right' },

  // City Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: height * 0.7,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  gpsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#FFE0E0',
  },
  gpsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  gpsTextWrap: { flex: 1, alignItems: 'flex-end' },
  gpsTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: COLORS.textPrimary },
  gpsSubtitle: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: COLORS.textSecondary, marginTop: 2 },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  modalDividerLine: { flex: 1, height: 1, backgroundColor: '#F0F0F0' },
  modalDividerText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: COLORS.textLight },
  cityList: { maxHeight: height * 0.35 },
  cityItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
  },
  cityItemActive: {
    backgroundColor: '#FFF5F5',
  },
  cityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityIconWrapActive: {
    backgroundColor: COLORS.primary,
  },
  cityName: { flex: 1, fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: COLORS.textPrimary, textAlign: 'right' },
  cityNameActive: { color: COLORS.primary },
  cityNameEn: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: COLORS.textLight, textAlign: 'right' },

  // Categories
  catScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 28, gap: 6, borderWidth: 1.5, borderColor: '#f0f0f0' },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: COLORS.textSecondary },
  catTextActive: { color: '#fff' },

  // Ads
  adSection: { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  adCard: { width: '100%', height: 160, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  adImg: { width: '100%', height: '100%' },
  adGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
  adTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  adDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  adDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  adDotActive: { backgroundColor: COLORS.primary, width: 22, borderRadius: 6 },

  // Sections
  section: { marginTop: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  mapPillTxt: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#fff' },

  // Featured horizontal
  featuredCard: { width: 200, height: 150, borderRadius: 18, overflow: 'hidden', ...SHADOWS.small },
  featuredImg: { width: '100%', height: '100%' },
  featuredGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', justifyContent: 'flex-end', padding: 12 },
  featuredName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  featuredMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 },
  featuredRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  featuredRatingTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#fff' },
  featuredCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  closedTxt: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#fff' },

  // Restaurant Cards
  cardsWrap: { paddingHorizontal: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', ...SHADOWS.small },
  cardImgWrap: { height: 180, position: 'relative' },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImgGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  
  statusBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#fff' },
  
  featuredStar: { position: 'absolute', top: 12, left: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  cardNameWrap: { position: 'absolute', bottom: 12, right: 14, left: 14 },
  cardName: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardCuisine: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.9)', textAlign: 'right' },

  cardInfo: { paddingHorizontal: 14, paddingVertical: 12 },
  cardInfoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardStat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  cardStatBold: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary },
  cardStatLight: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: COLORS.textLight },
  cardStatMed: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: COLORS.textSecondary },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 50 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: COLORS.textSecondary, marginTop: 4 },
});
