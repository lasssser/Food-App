import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

// ======= Shared map HTML generator =======
const SYRIA_CENTER = { lat: 34.8, lng: 38.9 };
const DAMASCUS = { lat: 33.5138, lng: 36.2765 };

const getPickerMapHTML = (lat: number, lng: number) => `
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
    .leaflet-control-attribution { display: none !important; }
    .center-pin {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -100%); z-index: 1000;
      font-size: 40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      pointer-events: none; transition: transform 0.15s ease;
    }
    .center-pin.moving { transform: translate(-50%, -120%); }
    .center-dot {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 6px; height: 6px; background: #E53935;
      border-radius: 50%; z-index: 999; pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin" id="pin">&#x1F4CD;</div>
  <div class="center-dot"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var pin = document.getElementById('pin');
    map.on('movestart', function() { pin.classList.add('moving'); });
    map.on('moveend', function() {
      pin.classList.remove('moving');
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location', lat: center.lat, lng: center.lng }));
    });
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location', lat: ${lat}, lng: ${lng} }));
    }, 500);
    window.addEventListener('message', function(e) {
      try { var d = JSON.parse(e.data); if (d.type === 'setLocation') map.flyTo([d.lat, d.lng], 16, { duration: 1.5 }); } catch(ex) {}
    });
    document.addEventListener('message', function(e) {
      try { var d = JSON.parse(e.data); if (d.type === 'setLocation') map.flyTo([d.lat, d.lng], 16, { duration: 1.5 }); } catch(ex) {}
    });
  </script>
</body>
</html>`;

// ======= Inline Map Location Picker (for embedding in forms) =======
interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number } | null;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  editable?: boolean;
  showOpenInMaps?: boolean;
  height?: number;
}

export function LocationPicker({
  initialLocation,
  onLocationSelect,
  editable = true,
  height = 250,
}: LocationPickerProps) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(initialLocation || null);
  const [mapReady, setMapReady] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('صلاحية الموقع', 'يرجى تفعيل صلاحية الموقع من الإعدادات');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newLoc = { lat: location.coords.latitude, lng: location.coords.longitude };
      setSelectedLocation(newLoc);
      onLocationSelect(newLoc);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'setLocation', ...newLoc }));
      }
    } catch {
      Alert.alert('خطأ', 'فشل في تحديد الموقع');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location') {
        const loc = { lat: data.lat, lng: data.lng };
        setSelectedLocation(loc);
        onLocationSelect(loc);
      }
    } catch {}
  };

  const initLat = initialLocation?.lat || DAMASCUS.lat;
  const initLng = initialLocation?.lng || DAMASCUS.lng;

  return (
    <View style={[inlineStyles.container, { height }]} data-testid="location-picker-inline">
      {Platform.OS === 'web' ? (
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${initLng - 0.01},${initLat - 0.01},${initLng + 0.01},${initLat + 0.01}&layer=mapnik&marker=${initLat},${initLng}`}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 } as any}
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: getPickerMapHTML(initLat, initLng) }}
          style={{ flex: 1, borderRadius: 12 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          onLoad={() => setMapReady(true)}
          startInLoadingState
          renderLoading={() => (
            <View style={inlineStyles.mapLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          scrollEnabled={false}
          nestedScrollEnabled={false}
        />
      )}

      {/* GPS Button overlay */}
      {editable && (
        <TouchableOpacity
          style={inlineStyles.gpsBtn}
          onPress={getCurrentLocation}
          disabled={loading}
          data-testid="location-picker-gps-btn"
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="locate" size={18} color={COLORS.primary} />
              <Text style={inlineStyles.gpsBtnText}>موقعي</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {selectedLocation && (
        <View style={inlineStyles.coordsBadge}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
          <Text style={inlineStyles.coordsText}>تم التحديد</Text>
        </View>
      )}
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb', ...SHADOWS.small },
  mapLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  gpsBtn: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4,
    ...SHADOWS.small,
  },
  gpsBtnText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: COLORS.primary },
  coordsBadge: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
    ...SHADOWS.small,
  },
  coordsText: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: COLORS.success },
});

// ======= Full-screen Map Location Picker (Modal) =======
interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
    district?: string;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export function MapLocationPicker({
  visible,
  onClose,
  onLocationSelected,
  initialLatitude,
  initialLongitude,
}: MapLocationPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [currentCoords, setCurrentCoords] = useState({
    lat: initialLatitude || SYRIA_CENTER.lat,
    lng: initialLongitude || SYRIA_CENTER.lng,
  });
  const [address, setAddress] = useState('');
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name.split(',').slice(0, 3).join('،').trim());
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location') {
        setCurrentCoords({ lat: data.lat, lng: data.lng });
        reverseGeocode(data.lat, data.lng);
      }
    } catch {}
  };

  const goToMyLocation = async () => {
    setLoadingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الموقع');
        setLoadingGPS(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      setCurrentCoords({ lat: latitude, lng: longitude });
      webViewRef.current?.postMessage(JSON.stringify({ type: 'setLocation', lat: latitude, lng: longitude }));
    } catch {
      Alert.alert('خطأ', 'لم نتمكن من تحديد موقعك');
    } finally {
      setLoadingGPS(false);
    }
  };

  const searchLocation = async () => {
    if (!searchText.trim()) return;
    setSearchLoading(true);
    try {
      const query = encodeURIComponent(searchText + ' سوريا');
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&accept-language=ar`);
      const results = await response.json();
      if (results.length > 0) {
        const newLat = parseFloat(results[0].lat);
        const newLng = parseFloat(results[0].lon);
        setCurrentCoords({ lat: newLat, lng: newLng });
        webViewRef.current?.postMessage(JSON.stringify({ type: 'setLocation', lat: newLat, lng: newLng }));
      } else {
        Alert.alert('', 'لم يتم العثور على نتائج');
      }
    } catch {
      Alert.alert('خطأ', 'فشل البحث');
    } finally {
      setSearchLoading(false);
    }
  };

  const confirmLocation = () => {
    onLocationSelected({
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
      address: address || `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={fullStyles.container}>
        {/* Header */}
        <View style={fullStyles.header}>
          <TouchableOpacity onPress={onClose} style={fullStyles.closeBtn} data-testid="map-picker-close">
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={fullStyles.headerTitle}>حدد موقع التوصيل</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Bar */}
        <View style={fullStyles.searchRow}>
          <TouchableOpacity onPress={searchLocation} style={fullStyles.searchBtn} disabled={searchLoading} data-testid="map-picker-search">
            {searchLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={18} color="#fff" />}
          </TouchableOpacity>
          <TextInput
            style={fullStyles.searchInput}
            placeholder="ابحث عن مكان... مثلاً: المزة، دمشق"
            placeholderTextColor="#bbb"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchLocation}
            textAlign="right"
            returnKeyType="search"
          />
        </View>

        {/* Map */}
        <View style={fullStyles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentCoords.lng - 0.05},${currentCoords.lat - 0.03},${currentCoords.lng + 0.05},${currentCoords.lat + 0.03}&layer=mapnik&marker=${currentCoords.lat},${currentCoords.lng}`}
              style={{ width: '100%', height: '100%', border: 'none' } as any}
            />
          ) : (
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: getPickerMapHTML(currentCoords.lat, currentCoords.lng) }}
              style={fullStyles.map}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={fullStyles.mapLoading}>
                  <ActivityIndicator size="large" color="#E53935" />
                  <Text style={fullStyles.mapLoadingText}>جاري تحميل الخريطة...</Text>
                </View>
              )}
            />
          )}
        </View>

        {/* GPS Button */}
        <TouchableOpacity style={fullStyles.gpsButton} onPress={goToMyLocation} disabled={loadingGPS} activeOpacity={0.8} data-testid="map-picker-gps">
          {loadingGPS ? <ActivityIndicator size="small" color="#E53935" /> : <Ionicons name="navigate" size={22} color="#E53935" />}
        </TouchableOpacity>

        {/* Bottom Card */}
        <View style={fullStyles.bottomCard}>
          <View style={fullStyles.addressRow}>
            <Ionicons name="location" size={22} color="#E53935" />
            <View style={fullStyles.addressInfo}>
              {loadingAddress ? (
                <ActivityIndicator size="small" color="#E53935" />
              ) : (
                <Text style={fullStyles.addressText} numberOfLines={2}>
                  {address || 'حرّك الخريطة لتحديد الموقع'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={fullStyles.confirmBtn} onPress={confirmLocation} activeOpacity={0.8} data-testid="map-picker-confirm">
            <Text style={fullStyles.confirmBtnText}>تأكيد الموقع</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const fullStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333', fontFamily: 'Cairo_700Bold' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', gap: 8 },
  searchInput: { flex: 1, height: 44, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333' },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  mapLoadingText: { marginTop: 10, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#999' },
  gpsButton: {
    position: 'absolute', bottom: 200, right: 16, width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  bottomCard: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  addressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16 },
  addressInfo: { flex: 1 },
  addressText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#333', textAlign: 'right', lineHeight: 22 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E53935', paddingVertical: 14, borderRadius: 14 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Cairo_700Bold', color: '#fff' },
});

// Default export for backward compatibility
export default LocationPicker;
