import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, RefreshControl, ActivityIndicator, Dimensions, Modal, Pressable,
  Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { restaurantAPI, locationAPI, advertisementsAPI, categoriesAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';

const CARD_GAP = 12;

const fp = (n: number | null | undefined): string => {
  if (n == null || isNaN(Number(n))) return '0';
  const parts = Math.round(Number(n)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const CATEGORY_IMAGES: { [key: string]: string } = {
  'الكل': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
  'برجر': 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=200',
  'بيتزا': 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=200',
  'مشاوي': 'https://images.pexels.com/photos/2233729/pexels-photo-2233729.jpeg?auto=compress&cs=tinysrgb&w=200',
  'سوري': 'https://images.pexels.com/photos/5409015/pexels-photo-5409015.jpeg?auto=compress&cs=tinysrgb&w=200',
  'فطائر': 'https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg?auto=compress&cs=tinysrgb&w=200',
  'حلويات': 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=200',
  'قهوة': 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=200',
  'مشروبات': 'https://images.pexels.com/photos/1536849/pexels-photo-1536849.jpeg?auto=compress&cs=tinysrgb&w=200',
  'كوكتيل': 'https://images.pexels.com/photos/1042940/pexels-photo-1042940.jpeg?auto=compress&cs=tinysrgb&w=200',
};

interface Restaurant {
  id: string; name: string; description: string; image?: string;
  address: string; area: string; city_id?: string; cuisine_type: string;
  rating: number; review_count: number; is_open: boolean; is_featured?: boolean;
  delivery_fee: number; min_order: number; delivery_time: string;
}
interface City { id: string; name: string; name_en: string; lat: number; lng: number; }
interface Category { id: string; name: string; icon: string; }

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_SIZE = (screenWidth - 40 - CARD_GAP) / 2;
  const COLS = 5;
  const CAT_CARD = (screenWidth - 32 - (COLS - 1) * 8) / COLS;

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try { const c = await locationAPI.getCities(); setCities(c || []); } catch {}
      try { const cat = await categoriesAPI.getAll(); if (cat?.length) setCategories(cat); } catch {}
      try { const ads = await advertisementsAPI.getAll(); setAdvertisements(ads); } catch {}
      await detectLocation();
    };
    init();
  }, []);

  const detectLocation = async () => {
    setLocatingGPS(true); setGpsError(null);
    try {
      const { status } = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise<any>((_, rej) => setTimeout(() => rej('timeout'), 5000)),
      ]);
      if (status !== 'granted') { setGpsError('لم يتم منح إذن الموقع'); setLocatingGPS(false); return null; }
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<any>((_, rej) => setTimeout(() => rej('timeout'), 8000)),
      ]);
      const result = await locationAPI.detectCity(loc.coords.latitude, loc.coords.longitude);
      if (result.outside_coverage) {
        setGpsError('أنت خارج نطاق التغطية'); setDetectedCity(null); setDetectedCityName('كل المدن'); setLocatingGPS(false); return null;
      }
      setDetectedCity(result.city_id); setDetectedCityName(result.city_name);
      setGpsError(null); setLocatingGPS(false); return result.city_id;
    } catch { setGpsError('تعذر تحديد الموقع'); setDetectedCity(null); setDetectedCityName('كل المدن'); setLocatingGPS(false); return null; }
  };

  useEffect(() => {
    if (advertisements.length > 1) {
      const iv = setInterval(() => setCurrentAdIndex(p => (p + 1) % advertisements.length), 4000);
      return () => clearInterval(iv);
    }
  }, [advertisements.length]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const fetchRestaurants = async () => {
    try {
      const filters: any = {};
      if (selectedCategory !== 'all') { const cat = categories.find(c => c.id === selectedCategory); if (cat) filters.cuisine = cat.name; }
      if (detectedCity) filters.city_id = detectedCity;
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      const data = await restaurantAPI.getAll(filters);
      setRestaurants(data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchRestaurants(); }, [selectedCategory, detectedCity, debouncedSearch]);

  const onRefresh = async () => { setRefreshing(true); await detectLocation(); fetchRestaurants(); };
  const selectCity = (id: string | null, name: string) => { setDetectedCity(id); setDetectedCityName(name); setShowCityModal(false); };

  const featuredRestaurants = restaurants.filter(r => r.is_featured);
  const restaurantRows: Restaurant[][] = [];
  for (let i = 0; i < restaurants.length; i += 2) {
    restaurantRows.push(restaurants.slice(i, i + 2));
  }

  // Build category grid rows (COLS per row)
  const catRows: Category[][] = [];
  for (let i = 0; i < categories.length; i += COLS) {
    catRows.push(categories.slice(i, i + COLS));
  }

  if (loading) {
    return (
      <View style={s.loadBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadTxt}>جاري تحميل المطاعم...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ===== CITY MODAL ===== */}
      <Modal visible={showCityModal} animationType="slide" transparent onRequestClose={() => setShowCityModal(false)}>
        <Pressable style={s.mOverlay} onPress={() => setShowCityModal(false)}>
          <Pressable style={s.mSheet} onPress={e => e.stopPropagation()}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>اختر منطقة التوصيل</Text>
            <TouchableOpacity style={s.gpsBtn} onPress={async () => { const c = await detectLocation(); if (c) setShowCityModal(false); }} disabled={locatingGPS}>
              <View style={s.gpsIcon}>{locatingGPS ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="navigate" size={22} color={COLORS.primary} />}</View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.gpsTxt}>{locatingGPS ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}</Text>
                {gpsError && <Text style={s.gpsSub}>{gpsError}</Text>}
              </View>
            </TouchableOpacity>
            <View style={s.mDiv}><View style={s.mDivLine} /><Text style={s.mDivTxt}>أو اختر مدينة</Text><View style={s.mDivLine} /></View>
            <TouchableOpacity style={[s.cityRow, !detectedCity && s.cityRowActive]} onPress={() => selectCity(null, 'كل المدن')}>
              <Text style={[s.cityTxt, !detectedCity && { color: COLORS.primary, fontFamily: 'Cairo_700Bold' }]}>كل المدن</Text>
              {!detectedCity && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {cities.map(c => (
                <TouchableOpacity key={c.id} style={[s.cityRow, detectedCity === c.id && s.cityRowActive]} onPress={() => selectCity(c.id, c.name)}>
                  <Text style={[s.cityTxt, detectedCity === c.id && { color: COLORS.primary, fontFamily: 'Cairo_700Bold' }]}>{c.name}</Text>
                  {detectedCity === c.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFA' }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        
        {/* ===== RED HEADER ===== */}
        <LinearGradient colors={['#E53935', '#C62828']} style={s.header}>
          <TouchableOpacity style={s.locRow} onPress={() => setShowCityModal(true)} activeOpacity={0.8} data-testid="location-pill-btn">
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.8)" />
            <View style={s.locInfo}>
              <Text style={s.locLabel}>التوصيل إلى</Text>
              <Text style={s.locCity} numberOfLines={1}>{detectedCityName}</Text>
            </View>
            <View style={s.locIconWrap}>
              <Ionicons name="location" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Greeting + Map Button */}
          <View style={s.greetRow}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.headerMapBtn} data-testid="map-btn">
              <Ionicons name="map-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.greeting}>شو ناكل اليوم؟</Text>
          </View>

          <View style={s.searchBox}>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedSearch(''); }} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            <TextInput style={s.searchInput} placeholder="دور على مطعم أو أكلة..." placeholderTextColor="#aaa"
              value={searchQuery} onChangeText={handleSearchChange} textAlign="right" />
            <View style={s.searchIconWrap}>
              <Ionicons name="search" size={20} color="#999" />
            </View>
          </View>
        </LinearGradient>

        {/* ===== CATEGORIES FIXED GRID ===== */}
        {categories.length > 0 && (
          <View style={s.catGrid}>
            {catRows.map((row, ri) => (
              <View key={ri} style={s.catGridRow}>
                {row.map(cat => {
                  const active = selectedCategory === cat.id;
                  const imgUrl = CATEGORY_IMAGES[cat.name] || CATEGORY_IMAGES['الكل'];
                  return (
                    <TouchableOpacity key={cat.id} style={[s.catCard, { width: CAT_CARD }]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8} data-testid={`category-chip-${cat.id}`}>
                      <View style={[s.catImgWrap, { width: CAT_CARD - 4, height: CAT_CARD - 4 }, active && s.catImgWrapActive]}>
                        <Image source={{ uri: imgUrl }} style={s.catImg} />
                      </View>
                      <Text style={[s.catName, active && s.catNameActive]} numberOfLines={1}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ===== AD BANNER ===== */}
        {advertisements.length > 0 && (
          <View style={s.adWrap}>
            <TouchableOpacity style={s.adCard} activeOpacity={0.95}
              onPress={() => { const ad = advertisements[currentAdIndex]; if (ad?.link_type === 'restaurant' && ad?.link_value) router.push(`/restaurant/${ad.link_value}`); }}>
              <Image source={{ uri: advertisements[currentAdIndex]?.image_url }} style={s.adImg} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.adGrad}>
                <Text style={s.adTitle}>{advertisements[currentAdIndex]?.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {advertisements.length > 1 && (
              <View style={s.adDots}>
                {advertisements.map((_, i) => <View key={i} style={[s.adDot, currentAdIndex === i && s.adDotAct]} />)}
              </View>
            )}
          </View>
        )}

        {/* ===== FEATURED RESTAURANTS (horizontal, star badge) ===== */}
        {featuredRestaurants.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {featuredRestaurants.map(r => (
                <TouchableOpacity key={r.id} style={[s.featCard, { width: CARD_SIZE }]} onPress={() => router.push(`/restaurant/${r.id}`)} activeOpacity={0.92} data-testid={`featured-${r.id}`}>
                  <Image source={{ uri: r.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={s.featImg} />
                  {/* Yellow star for featured */}
                  <View style={s.featStar}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                  </View>
                  {!r.is_open && <View style={s.featClosed}><Text style={s.featClosedTxt}>مغلق</Text></View>}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.featGrad}>
                    <Text style={s.featName} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.featCuisine} numberOfLines={1}>{r.cuisine_type}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== RESTAURANTS 2-COLUMN GRID (RED cards) ===== */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>المطاعم القريبة</Text>
          </View>

          {restaurants.length > 0 ? (
            <View style={s.grid}>
              {restaurantRows.map((row, rowIdx) => (
                <View key={rowIdx} style={s.gridRow}>
                  {row.map(r => (
                    <TouchableOpacity key={r.id} style={[s.rCard, { width: CARD_SIZE }]} onPress={() => router.push(`/restaurant/${r.id}`)} activeOpacity={0.92} data-testid={`restaurant-card-${r.id}`}>
                      <Image
                        source={{ uri: r.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                        style={[s.rImg, { height: CARD_SIZE * 0.6 }]}
                      />
                      {/* Status badge */}
                      <View style={[s.statusBadge, { backgroundColor: r.is_open ? 'rgba(76,175,80,0.9)' : 'rgba(0,0,0,0.6)' }]}>
                        <Text style={s.statusTxt}>{r.is_open ? 'مفتوح' : 'مغلق'}</Text>
                      </View>
                      {/* Featured star */}
                      {r.is_featured && (
                        <View style={s.rStar}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                        </View>
                      )}
                      <View style={s.rInfo}>
                        <Text style={s.rName} numberOfLines={1}>{r.name}</Text>
                        <Text style={s.rCuisine} numberOfLines={1}>{r.cuisine_type}</Text>
                        <View style={s.rMeta}>
                          <View style={s.rMetaItem}>
                            <Text style={s.rRatingTxt}>{(r.rating ?? 0).toFixed(1)}</Text>
                            <Ionicons name="star" size={11} color="#FFD700" />
                          </View>
                          <Text style={s.rFee}>{fp(r.delivery_fee)} ل.س</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {row.length === 1 && <View style={{ width: CARD_SIZE }} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <Ionicons name="restaurant-outline" size={48} color="#ddd" />
              <Text style={s.emptyTxt}>لا توجد مطاعم</Text>
              <Text style={s.emptySub}>جرب تغيير الفلتر أو البحث</Text>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E53935' },
  loadBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  loadTxt: { marginTop: 16, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#999' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  locRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  locIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  locInfo: { flex: 1, alignItems: 'flex-end' },
  locLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)' },
  locCity: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff' },
  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 14 },
  greeting: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right', flex: 1 },
  headerMapBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 6, height: 50, ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 } }) },
  searchIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333', marginHorizontal: 10, textAlign: 'right' },

  // Categories Fixed Grid
  catGrid: { paddingHorizontal: 16, marginTop: 16, gap: 6 },
  catGridRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 8 },
  catCard: { alignItems: 'center', marginBottom: 4 },
  catImgWrap: { borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 2, borderColor: '#F0F0F0', ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 } }) },
  catImgWrapActive: { borderColor: COLORS.primary, borderWidth: 2.5 },
  catImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catName: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#555', marginTop: 4, textAlign: 'center' },
  catNameActive: { color: COLORS.primary, fontFamily: 'Cairo_700Bold' },

  // Ads
  adWrap: { paddingHorizontal: 16, marginTop: 14 },
  adCard: { width: '100%', height: 140, borderRadius: 18, overflow: 'hidden' },
  adImg: { width: '100%', height: '100%' },
  adGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 12 },
  adTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  adDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 },
  adDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ddd' },
  adDotAct: { backgroundColor: COLORS.primary, width: 20, borderRadius: 5 },

  // Featured
  featCard: { borderRadius: 16, overflow: 'hidden', height: 150, position: 'relative' },
  featImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  featStar: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  featClosed: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  featClosedTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },
  featGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', justifyContent: 'flex-end', padding: 10 },
  featName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },
  featCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },

  // Section
  section: { marginTop: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },

  // Restaurant Grid - RED cards
  grid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: CARD_GAP },
  rCard: {
    backgroundColor: '#C62828',
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 } }),
  },
  rImg: { width: '100%', resizeMode: 'cover' },
  statusBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusTxt: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#fff' },
  rStar: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  rInfo: { padding: 10 },
  rName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  rCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 1 },
  rMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  rMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rRatingTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#fff' },
  rFee: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: 'rgba(255,255,255,0.85)' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 50 },
  emptyTxt: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#999', marginTop: 12 },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#bbb', marginTop: 4 },

  // City Modal
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '70%' },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'center', marginBottom: 16 },
  gpsBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#FFE0E0' },
  gpsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  gpsTxt: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#222' },
  gpsSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#E53935', marginTop: 2 },
  mDiv: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  mDivLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  mDivTxt: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#bbb' },
  cityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  cityRowActive: { backgroundColor: '#FFF5F5' },
  cityTxt: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#333' },
});
