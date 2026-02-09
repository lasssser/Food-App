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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { restaurantAPI, locationAPI, advertisementsAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

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
  { id: 'all', name: 'الكل', icon: 'grid-outline' },
  { id: 'برجر', name: 'برجر', icon: 'fast-food-outline' },
  { id: 'إيطالي', name: 'بيتزا', icon: 'pizza-outline' },
  { id: 'مشاوي', name: 'مشاوي', icon: 'flame-outline' },
  { id: 'شامي', name: 'سوري', icon: 'restaurant-outline' },
  { id: 'فطائر', name: 'فطائر', icon: 'cafe-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedCityName, setDetectedCityName] = useState<string>('جاري التحديد...');
  const [locatingGPS, setLocatingGPS] = useState(false);

  const detectLocation = async () => {
    setLocatingGPS(true);
    try {
      const { status } = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise<any>((_, reject) => setTimeout(() => reject('timeout'), 3000)),
      ]);
      if (status === 'granted') {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
          new Promise<any>((_, reject) => setTimeout(() => reject('timeout'), 4000)),
        ]);
        const result = await locationAPI.detectCity(loc.coords.latitude, loc.coords.longitude);
        setDetectedCity(result.city_id);
        setDetectedCityName(result.city_name);
        setLocatingGPS(false);
        return result.city_id;
      }
    } catch {}
    setDetectedCity(null);
    setDetectedCityName('كل المدن');
    setLocatingGPS(false);
    return null;
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

  const fetchRestaurants = async () => {
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') filters.cuisine = selectedCategory;
      if (detectedCity) filters.city_id = detectedCity;
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
    }, [selectedCategory, detectedCity])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await detectLocation();
    fetchRestaurants();
  };

  const handleRelocate = async () => {
    const cityId = await detectLocation();
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') filters.cuisine = selectedCategory;
      if (cityId) filters.city_id = cityId;
      const data = await restaurantAPI.getAll(filters);
      setRestaurants(data || []);
    } catch {}
  };

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.includes(searchQuery) || r.cuisine_type.includes(searchQuery)
  );

  const featuredRestaurants = filteredRestaurants.filter(r => r.is_featured);
  const regularRestaurants = filteredRestaurants.filter(r => !r.is_featured);

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
      <Animated.ScrollView
        style={s.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
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

            <TouchableOpacity style={s.locationPill} onPress={handleRelocate} activeOpacity={0.7} data-testid="relocate-btn">
              <View style={s.locationDot}>
                {locatingGPS ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="location" size={14} color="#fff" />
                )}
              </View>
              <View style={s.locationTextWrap}>
                <Text style={s.locationLabel}>التوصيل إلى</Text>
                <Text style={s.locationCity} numberOfLines={1}>{detectedCityName}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={s.greetingWrap}>
            <Text style={s.greetingMain}>
              {user?.name ? `أهلاً ${user.name.split(' ')[0]}` : 'شو ناكل اليوم؟'}
            </Text>
            <Text style={s.greetingSub}>
              {filteredRestaurants.length > 0 
                ? `${filteredRestaurants.filter(r => r.is_open).length} مطعم مفتوح الآن`
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
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* === CATEGORIES === */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll} style={{ marginTop: 16, marginBottom: 8 }}>
          {CATEGORIES.map((cat) => {
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
                        <Text style={s.cardStatMed}>{(restaurant.delivery_fee ?? 0).toLocaleString()} ل.س</Text>
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
      </Animated.ScrollView>
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
  locationPill: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12, gap: 8 },
  locationDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  locationTextWrap: { flex: 1, alignItems: 'flex-end' },
  locationLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.65)' },
  locationCity: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },

  greetingWrap: { alignItems: 'flex-end', marginBottom: 18 },
  greetingMain: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: '#fff', lineHeight: 36 },
  greetingSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, height: 50, ...SHADOWS.small },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: COLORS.textPrimary, marginHorizontal: 10, textAlign: 'right' },

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
