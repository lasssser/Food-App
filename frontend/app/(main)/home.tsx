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

// Category food images mapping
const CATEGORY_IMAGES: { [key: string]: string } = {
  'الكل': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
  'برجر': 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=200',
  'بيتزا': 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=200',
  'مشاوي': 'https://images.pexels.com/photos/2233729/pexels-photo-2233729.jpeg?auto=compress&cs=tinysrgb&w=200',
  'سوري': 'https://images.pexels.com/photos/5409015/pexels-photo-5409015.jpeg?auto=compress&cs=tinysrgb&w=200',
  'فطائر': 'https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg?auto=compress&cs=tinysrgb&w=200',
  'حلويات': 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=200',
  'قهوة': 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=200',
  'مشروبات': 'https://images.pexels.com/photos/1232152/pexels-photo-1232152.jpeg?auto=compress&cs=tinysrgb&w=200',
  'كوكتيل': 'https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=200',
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
  const CAT_CARD_SIZE = 80;
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
        setGpsError('أنت خارج نطاق التغطية. اختر مدينتك يدوياً.');
        setDetectedCity(null); setDetectedCityName('كل المدن'); setLocatingGPS(false); return null;
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

  if (loading) {
    return (
      <View style={s.loadBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadTxt}>جاري تحميل المطاعم...</Text>
      </View>
    );
  }

  // Build restaurant grid rows (2 per row)
  const restaurantRows: Restaurant[][] = [];
  for (let i = 0; i < restaurants.length; i += 2) {
    restaurantRows.push(restaurants.slice(i, i + 2));
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
          <Text style={s.greeting}>شو ناكل اليوم؟</Text>
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

        {/* ===== CATEGORIES GRID (Square cards with food images) ===== */}
        {categories.length > 0 && (
          <View style={s.catSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
              {categories.map(cat => {
                const active = selectedCategory === cat.id;
                const imgUrl = CATEGORY_IMAGES[cat.name] || CATEGORY_IMAGES['الكل'];
                return (
                  <TouchableOpacity key={cat.id} style={[s.catCard, { width: CAT_CARD_SIZE }]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8} data-testid={`category-chip-${cat.id}`}>
                    <View style={[s.catImgWrap, { width: CAT_CARD_SIZE, height: CAT_CARD_SIZE }, active && s.catImgWrapActive]}>
                      <Image source={{ uri: imgUrl }} style={s.catImg} />
                    </View>
                    <Text style={[s.catName, active && s.catNameActive]} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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

        {/* ===== RESTAURANTS 2-COLUMN GRID ===== */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.mapBtn} data-testid="map-btn">
              <Ionicons name="map-outline" size={16} color={COLORS.primary} />
              <Text style={s.mapBtnTxt}>الخريطة</Text>
            </TouchableOpacity>
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
                        style={[s.rImg, { height: CARD_SIZE * 0.65 }]}
                      />
                      {/* Status badge */}
                      <View style={[s.statusBadge, { backgroundColor: r.is_open ? '#E8F5E9' : '#FFEBEE' }]}>
                        <View style={[s.statusDot, { backgroundColor: r.is_open ? '#4CAF50' : '#E53935' }]} />
                        <Text style={[s.statusTxt, { color: r.is_open ? '#2E7D32' : '#C62828' }]}>
                          {r.is_open ? 'مفتوح' : 'مغلق'}
                        </Text>
                      </View>
                      <View style={s.rInfo}>
                        <Text style={s.rName} numberOfLines={1}>{r.name}</Text>
                        <Text style={s.rCuisine} numberOfLines={1}>{r.cuisine_type}</Text>
                        <View style={s.rMeta}>
                          <View style={s.rMetaItem}>
                            <Text style={s.rRatingTxt}>{(r.rating ?? 0).toFixed(1)}</Text>
                            <Ionicons name="star" size={12} color="#FFD700" />
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
  greeting: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right', marginTop: 16, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 6, height: 50, ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 } }) },
  searchIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333', marginHorizontal: 10, textAlign: 'right' },

  // Categories - Square cards
  catSection: { marginTop: 18 },
  catScroll: { paddingHorizontal: 16, gap: 12 },
  catCard: { alignItems: 'center' },
  catCardActive: {},
  catImgWrap: {
    borderRadius: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 } }),
  },
  catImgWrapActive: { borderColor: COLORS.primary, borderWidth: 2.5 },
  catImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catName: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#555', marginTop: 6, textAlign: 'center' },
  catNameActive: { color: COLORS.primary, fontFamily: 'Cairo_700Bold' },

  // Ads
  adWrap: { paddingHorizontal: 16, marginTop: 18 },
  adCard: { width: '100%', height: 150, borderRadius: 20, overflow: 'hidden' },
  adImg: { width: '100%', height: '100%' },
  adGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
  adTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  adDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  adDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  adDotAct: { backgroundColor: COLORS.primary, width: 22, borderRadius: 5 },

  // Section
  section: { marginTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}12`, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.primary}25` },
  mapBtnTxt: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },

  // Restaurant Grid
  grid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: CARD_GAP },
  rCard: {
    width: CARD_SIZE,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 } }),
  },
  rImg: { width: '100%', height: CARD_SIZE * 0.65, resizeMode: 'cover' },
  statusBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  rInfo: { padding: 10 },
  rName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  rCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#999', textAlign: 'right', marginTop: 1 },
  rMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  rMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rRatingTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#333' },
  rFee: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },

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
