import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, RefreshControl, ActivityIndicator, Dimensions, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { restaurantAPI, locationAPI, advertisementsAPI, categoriesAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48 - 12) / 2;

const fp = (n: number | null | undefined): string => {
  if (n == null || isNaN(Number(n))) return '0';
  const parts = Math.round(Number(n)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
  const toggleFav = (id: string) => { setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const featuredRestaurants = restaurants.filter(r => r.is_featured);

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
      {/* City Modal */}
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        
        {/* ===== RED HEADER ===== */}
        <LinearGradient colors={['#E53935', '#C62828']} style={s.header}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.headerIcon} data-testid="map-btn">
              <Ionicons name="map-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.locPill} onPress={() => setShowCityModal(true)} data-testid="location-pill-btn">
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={s.locCity} numberOfLines={1}>{detectedCityName}</Text>
              <Ionicons name="location" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={20} color="#bbb" />
            <TextInput style={s.searchInput} placeholder="ابحث عن مطعم أو نوع أكل..." placeholderTextColor="#bbb"
              value={searchQuery} onChangeText={handleSearchChange} textAlign="right" />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedSearch(''); }}><Ionicons name="close-circle" size={20} color="#ccc" /></TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ===== AD BANNER ===== */}
        {advertisements.length > 0 && (
          <View style={s.adWrap}>
            <TouchableOpacity style={s.adCard} activeOpacity={0.95}
              onPress={() => { const ad = advertisements[currentAdIndex]; if (ad?.link_type === 'restaurant' && ad?.link_value) router.push(`/restaurant/${ad.link_value}`); }}>
              <Image source={{ uri: advertisements[currentAdIndex]?.image_url }} style={s.adImg} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.adGrad}>
                <Text style={s.adTitle}>{advertisements[currentAdIndex]?.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {advertisements.length > 1 && (
              <View style={s.adDots}>{advertisements.map((_, i) => <View key={i} style={[s.adDot, currentAdIndex === i && s.adDotAct]} />)}</View>
            )}
          </View>
        )}

        {/* ===== FEATURED HORIZONTAL ===== */}
        {featuredRestaurants.length > 0 && (
          <View style={s.sec}>
            <Text style={s.secTitle}>المطاعم المميزة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {featuredRestaurants.map(r => (
                <TouchableOpacity key={r.id} style={s.fCard} onPress={() => router.push(`/restaurant/${r.id}`)} activeOpacity={0.92}>
                  <Image source={{ uri: r.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={s.fImg} />
                  {!r.is_open && <View style={s.fClosed}><Text style={s.fClosedTxt}>مغلق</Text></View>}
                  <View style={s.fInfo}>
                    <Text style={s.fName} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.fCuisine}>{r.cuisine_type}</Text>
                    <View style={s.fRow}>
                      <Text style={s.fPrice}>{fp(r.delivery_fee)} ل.س</Text>
                      <View style={s.fRating}><Ionicons name="star" size={12} color="#FFD700" /><Text style={s.fRatingTxt}>{(r.rating ?? 0).toFixed(1)}</Text></View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== CATEGORIES ===== */}
        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll} style={{ marginTop: 12 }}>
            {categories.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity key={cat.id} style={[s.catChip, active && s.catChipAct]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8}>
                  <Ionicons name={cat.icon as any} size={16} color={active ? '#fff' : COLORS.textSecondary} />
                  <Text style={[s.catTxt, active && s.catTxtAct]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ===== RESTAURANTS LIST ===== */}
        <View style={s.sec}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => router.push('/(main)/nearby-map')} style={s.mapPill}>
              <Ionicons name="map" size={14} color="#fff" /><Text style={s.mapPillTxt}>الخريطة</Text>
            </TouchableOpacity>
            <Text style={s.secTitle2}>كل المطاعم</Text>
          </View>

          {restaurants.length > 0 ? (
            <View style={s.listWrap}>
              {restaurants.map(r => (
                <TouchableOpacity key={r.id} style={s.rCard} onPress={() => router.push(`/restaurant/${r.id}`)} activeOpacity={0.93} data-testid={`restaurant-card-${r.id}`}>
                  {/* Image */}
                  <View style={s.rImgWrap}>
                    <Image source={{ uri: r.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={s.rImg} />
                  </View>
                  {/* Info */}
                  <View style={s.rInfo}>
                    <View style={s.rTop}>
                      <TouchableOpacity onPress={() => toggleFav(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={favorites.has(r.id) ? 'heart' : 'heart-outline'} size={22} color={favorites.has(r.id) ? '#E53935' : '#ccc'} />
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={s.rName} numberOfLines={1}>{r.name}</Text>
                        <Text style={s.rCuisine} numberOfLines={1}>{r.cuisine_type} - {r.area || r.address}</Text>
                      </View>
                    </View>
                    <View style={s.rBottom}>
                      <View style={[s.rBadge, { backgroundColor: r.is_open ? '#E8F5E9' : '#FFEBEE' }]}>
                        <Text style={[s.rBadgeTxt, { color: r.is_open ? '#2E7D32' : '#C62828' }]}>{r.is_open ? 'مفتوح' : 'مغلق'}</Text>
                      </View>
                      <View style={s.rStars}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={s.rStarTxt}>{(r.rating ?? 0).toFixed(1)}</Text>
                      </View>
                      <Text style={s.rDelivery}>{fp(r.delivery_fee)} ل.س</Text>
                    </View>
                  </View>
                </TouchableOpacity>
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  loadBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadTxt: { marginTop: 16, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#999' },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  locCity: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333', marginHorizontal: 10, textAlign: 'right' },

  // Ads
  adWrap: { paddingHorizontal: 16, marginTop: 16 },
  adCard: { width: '100%', height: 150, borderRadius: 18, overflow: 'hidden' },
  adImg: { width: '100%', height: '100%' },
  adGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  adTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#fff', textAlign: 'right' },
  adDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 },
  adDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ddd' },
  adDotAct: { backgroundColor: COLORS.primary, width: 20, borderRadius: 5 },

  // Featured
  sec: { marginTop: 20 },
  secTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#222', paddingHorizontal: 16, marginBottom: 12, textAlign: 'right' },
  secTitle2: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  fCard: { width: CARD_W, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  fImg: { width: '100%', height: 110, resizeMode: 'cover' },
  fClosed: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  fClosedTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },
  fInfo: { padding: 10 },
  fName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  fCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#999', textAlign: 'right', marginTop: 2 },
  fRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  fPrice: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },
  fRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fRatingTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#222' },

  // Categories
  catScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, gap: 5 },
  catChipAct: { backgroundColor: COLORS.primary },
  catTxt: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#666' },
  catTxtAct: { color: '#fff' },

  // Map pill
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  mapPillTxt: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#fff' },

  // Restaurant List
  listWrap: { paddingHorizontal: 16, gap: 12 },
  rCard: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0', padding: 10, gap: 12 },
  rImgWrap: { width: 90, height: 90, borderRadius: 14, overflow: 'hidden' },
  rImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  rInfo: { flex: 1, justifyContent: 'space-between' },
  rTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#222', textAlign: 'right' },
  rCuisine: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#999', textAlign: 'right', marginTop: 1 },
  rBottom: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 },
  rStars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rStarTxt: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#222' },
  rDelivery: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },
  rBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  rBadgeTxt: { fontSize: 10, fontFamily: 'Cairo_700Bold' },

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
