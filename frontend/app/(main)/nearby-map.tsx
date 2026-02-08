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
    const color = r.is_open ? '#22c55e' : '#ef4444';
    const emoji = r.is_open ? '🟢' : '🔴';
    return `
      L.marker([${r.lat}, ${r.lng}], {
        icon: L.divIcon({
          html: '<div style="background:white;border:2px solid ${color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🍽️</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
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
      }).bindPopup('<div style="text-align:center;font-family:sans-serif;direction:rtl;"><b>${r.name.replace(/'/g, "\\'")}</b><br>${emoji} ${r.is_open ? "مفتوح" : "مغلق"}<br>${r.distance_km ? r.distance_km + " كم" : ""}</div>');
    `;
  }).join('\n');

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
    html, body, #map { width: 100%; height: 100%; }
    .user-location {
      width: 16px; height: 16px;
      background: #4285f4; border: 3px solid white;
      border-radius: 50%; box-shadow: 0 0 10px rgba(66,133,244,0.5);
    }
    .user-pulse {
      width: 40px; height: 40px;
      background: rgba(66,133,244,0.15);
      border-radius: 50%;
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6} 50%{transform:translate(-50%,-50%) scale(1.5);opacity:0} }
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

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // User location marker
    L.marker([${lat}, ${lng}], {
      icon: L.divIcon({
        html: '<div style="position:relative;"><div class="user-pulse"></div><div class="user-location"></div></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
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
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {
        console.log('Location error, using default');
      }

      try {
        const data = await restaurantAPI.getNearby(userLocation.lat, userLocation.lng, 50);
        setRestaurants(data || []);
      } catch (e) {
        console.error('Error fetching nearby:', e);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Refetch when location changes
  useEffect(() => {
    if (!loading) {
      restaurantAPI.getNearby(userLocation.lat, userLocation.lng, 50)
        .then(data => setRestaurants(data || []))
        .catch(console.error);
    }
  }, [userLocation]);

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

      {/* Selected Restaurant Card */}
      {selectedRestaurant && (
        <View style={styles.restaurantCard}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => router.push(`/restaurant/${selectedRestaurant.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{selectedRestaurant.name}</Text>
              <View style={styles.cardStats}>
                <View style={styles.cardStat}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.cardStatText}>{selectedRestaurant.rating?.toFixed(1) || '0.0'}</Text>
                </View>
                {selectedRestaurant.distance_km > 0 && (
                  <View style={styles.cardStat}>
                    <Ionicons name="location" size={14} color={COLORS.info} />
                    <Text style={styles.cardStatText}>{selectedRestaurant.distance_km} كم</Text>
                  </View>
                )}
                <View style={styles.cardStat}>
                  <Ionicons name="time" size={14} color={COLORS.textLight} />
                  <Text style={styles.cardStatText}>{selectedRestaurant.delivery_time}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardStatusBadge, { backgroundColor: selectedRestaurant.is_open ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.cardStatusText, { color: selectedRestaurant.is_open ? '#16a34a' : '#dc2626' }]}>
                {selectedRestaurant.is_open ? 'مفتوح' : 'مغلق'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedRestaurant(null)}>
            <Ionicons name="close" size={18} color={COLORS.textLight} />
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
    position: 'absolute', bottom: 30, left: SPACING.lg, right: SPACING.lg,
    backgroundColor: 'white', borderRadius: RADIUS.lg, padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardName: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: COLORS.textPrimary },
  cardStats: { flexDirection: 'row-reverse', gap: 12, marginTop: 6 },
  cardStat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  cardStatText: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: COLORS.textSecondary },
  cardStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  cardStatusText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
  closeCard: { position: 'absolute', top: 8, left: 8 },
});
