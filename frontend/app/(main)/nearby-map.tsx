import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { restaurantAPI } from '../../src/services/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

const getMapHTML = (lat: number, lng: number, restaurants: any[]) => {
  const markers = restaurants.map(r => {
    if (!r.lat || !r.lng) return '';
    const isOpen = r.is_open;
    return `
      L.marker([${r.lat}, ${r.lng}], {
        icon: L.divIcon({
          html: '<div class="rest-pin ${isOpen ? 'open' : 'closed'}"><span>🍽️</span></div>',
          iconSize: [44, 52],
          iconAnchor: [22, 52],
          className: ''
        })
      }).addTo(map).on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'restaurant_click',
          id: '${r.id}',
          name: '${r.name.replace(/'/g, "\\'")}',
          is_open: ${r.is_open},
          rating: ${r.rating || 0},
          distance_km: ${r.distance_km || 0},
          delivery_time: '${r.delivery_time || ''}',
        }));
      });
    `;
  }).join('\n');

  const restCount = restaurants.filter(r => r.lat && r.lng).length;
  const openCount = restaurants.filter(r => r.lat && r.lng && r.is_open).length;

  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    
    /* Restaurant pin */
    .rest-pin {
      width: 44px; height: 44px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    }
    .rest-pin span { transform: rotate(45deg); font-size: 20px; }
    .rest-pin.open { background: linear-gradient(135deg, #E53935, #FF6B35); }
    .rest-pin.closed { background: #9e9e9e; }
    
    /* User location */
    .user-dot {
      width: 18px; height: 18px;
      background: #E53935; border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(229,57,53,0.2), 0 2px 8px rgba(0,0,0,0.3);
      animation: userPulse 2.5s infinite;
    }
    @keyframes userPulse {
      0%,100% { box-shadow: 0 0 0 6px rgba(229,57,53,0.2), 0 2px 8px rgba(0,0,0,0.3); }
      50% { box-shadow: 0 0 0 16px rgba(229,57,53,0.05), 0 2px 8px rgba(0,0,0,0.3); }
    }
    
    /* Custom zoom controls */
    .custom-zoom {
      position: absolute; bottom: 100px; right: 16px; z-index: 1000;
      display: flex; flex-direction: column; gap: 4px;
    }
    .zoom-btn {
      width: 44px; height: 44px;
      background: white; border: none; border-radius: 12px;
      font-size: 22px; font-weight: bold; color: #333;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
      cursor: pointer; user-select: none;
      transition: background 0.15s;
    }
    .zoom-btn:active { background: #f0f0f0; }
    
    /* My location button */
    .my-loc-btn {
      position: absolute; bottom: 100px; left: 16px; z-index: 1000;
      width: 44px; height: 44px;
      background: white; border: none; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
      cursor: pointer;
    }
    .my-loc-btn:active { background: #f0f0f0; }
    
    /* Info bar */
    .info-bar {
      position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 1000;
      background: linear-gradient(135deg, #E53935, #FF6B35);
      border-radius: 16px; padding: 12px 16px;
      display: flex; align-items: center; justify-content: center; gap: 16px;
      box-shadow: 0 4px 16px rgba(229,57,53,0.3);
    }
    .info-item { text-align: center; color: white; }
    .info-num { font-size: 20px; font-weight: bold; }
    .info-label { font-size: 11px; opacity: 0.9; }
    .info-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.3); }
    
    /* Hide default leaflet controls */
    .leaflet-control-zoom { display: none !important; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${lat}, ${lng}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // User location
    L.marker([${lat}, ${lng}], {
      icon: L.divIcon({
        html: '<div class="user-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: ''
      })
    }).addTo(map);

    // Restaurant markers
    ${markers}
  </script>
</body>
</html>`;
};

export default function NearbyMapScreen() {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState({ lat: 33.5138, lng: 36.2765 });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      let lat = 33.5138;
      let lng = 36.2765;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Add timeout to prevent infinite loading
          const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000));
          
          try {
            const loc = await Promise.race([locationPromise, timeoutPromise]) as any;
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          } catch (e) {
            console.log('Location timeout, using default');
          }
          setUserLocation({ lat, lng });
        }
      } catch (e) {
        console.log('Location permission denied, using default');
      }

      try {
        const data = await restaurantAPI.getNearby(lat, lng, 50);
        setRestaurants(data || []);
      } catch (e) {
        console.error('Error fetching nearby:', e);
      }
      setLoading(false);
    };
    
    // Safety timeout - always stop loading after 8 seconds
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);
    init().finally(() => clearTimeout(safetyTimeout));
  }, []);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'restaurant_click') {
        setSelectedRestaurant(data);
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل الخريطة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <WebView
        ref={webViewRef}
        source={{ html: getMapHTML(userLocation.lat, userLocation.lng, restaurants) }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={styles.mapLoading} size="large" color={COLORS.primary} />}
      />

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>المطاعم القريبة</Text>
          <Text style={styles.headerCount}>{restaurants.filter(r => r.is_open).length} مطعم مفتوح</Text>
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Bottom Info Bar - hide when restaurant card is shown */}
      {!selectedRestaurant && (
        <View style={styles.bottomInfoBar}>
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarNum}>{restaurants.filter(r => r.lat && r.lng).length}</Text>
            <Text style={styles.infoBarLabel}>مطعم</Text>
          </View>
          <View style={styles.infoBarDivider} />
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarNum}>{restaurants.filter(r => r.lat && r.lng && r.is_open).length}</Text>
            <Text style={styles.infoBarLabel}>مفتوح الآن</Text>
          </View>
          <View style={styles.infoBarDivider} />
          <View style={styles.infoBarItem}>
            <Text style={[styles.infoBarNum, { fontSize: 14 }]}>أكلة عالسريع</Text>
            <Text style={styles.infoBarLabel}>اطلب من أي مكان</Text>
          </View>
        </View>
      )}

      {/* Selected Restaurant Card */}
      {selectedRestaurant && (
        <View style={styles.restaurantCard}>
          <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedRestaurant(null)}>
            <Ionicons name="close-circle" size={28} color="#999" />
          </TouchableOpacity>
          
          {/* Restaurant Name + Status */}
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardName}>{selectedRestaurant.name}</Text>
            <View style={[styles.cardStatusBadge, { backgroundColor: selectedRestaurant.is_open ? '#dcfce7' : '#fee2e2' }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedRestaurant.is_open ? '#16a34a' : '#dc2626', marginLeft: 6 }} />
              <Text style={[styles.cardStatusText, { color: selectedRestaurant.is_open ? '#16a34a' : '#dc2626' }]}>
                {selectedRestaurant.is_open ? 'مفتوح' : 'مغلق'}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around', backgroundColor: '#f8f9fa', borderRadius: 12, paddingVertical: 12, marginBottom: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: COLORS.textPrimary }}>{selectedRestaurant.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#999', marginTop: 2 }}>التقييم</Text>
            </View>
            {selectedRestaurant.distance_km > 0 && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location" size={16} color={COLORS.primary} />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: COLORS.textPrimary }}>{selectedRestaurant.distance_km}</Text>
                </View>
                <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#999', marginTop: 2 }}>كم</Text>
              </View>
            )}
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time" size={16} color="#F57C00" />
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: COLORS.textPrimary }}>{selectedRestaurant.delivery_time || '30 د'}</Text>
              </View>
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#999', marginTop: 2 }}>التوصيل</Text>
            </View>
          </View>

          {/* Order Button */}
          <TouchableOpacity
            onPress={() => router.push(`/restaurant/${selectedRestaurant.id}`)}
            activeOpacity={0.8}
            style={{ backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="restaurant" size={20} color="#fff" />
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' }}>عرض القائمة والطلب</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: COLORS.textSecondary },
  map: { flex: 1 },
  mapLoading: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  headerCenter: {
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: COLORS.textPrimary },
  headerCount: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: COLORS.textSecondary },
  restaurantCard: {
    position: 'absolute', bottom: 100, left: SPACING.lg, right: SPACING.lg,
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
  },
  closeCard: { position: 'absolute', top: 12, left: 12, zIndex: 10 },
  cardName: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  cardStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  cardStatusText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  // Bottom Info Bar
  bottomInfoBar: {
    position: 'absolute', bottom: 85, left: SPACING.lg, right: SPACING.lg,
    backgroundColor: COLORS.primary, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  infoBarItem: { alignItems: 'center' },
  infoBarNum: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: '#fff' },
  infoBarLabel: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  infoBarDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
});
