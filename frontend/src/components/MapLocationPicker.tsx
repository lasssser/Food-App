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

const SYRIA_CENTER = { lat: 34.8, lng: 38.9 };

const getMapHTML = (lat: number, lng: number) => `
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
    .center-pin {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      font-size: 40px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      pointer-events: none;
      transition: transform 0.15s ease;
    }
    .center-pin.moving {
      transform: translate(-50%, -120%);
    }
    .center-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: #E53935;
      border-radius: 50%;
      z-index: 999;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin" id="pin">📍</div>
  <div class="center-dot"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${lat}, ${lng}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var pin = document.getElementById('pin');
    
    map.on('movestart', function() {
      pin.classList.add('moving');
    });
    
    map.on('moveend', function() {
      pin.classList.remove('moving');
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'location',
        lat: center.lat,
        lng: center.lng
      }));
    });

    // Send initial location
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'location',
        lat: ${lat},
        lng: ${lng}
      }));
    }, 500);

    // Listen for messages from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'setLocation') {
          map.flyTo([data.lat, data.lng], 16, { duration: 1.5 });
        }
      } catch(e) {}
    });
    
    document.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'setLocation') {
          map.flyTo([data.lat, data.lng], 16, { duration: 1.5 });
        }
      } catch(e) {}
    });
  </script>
</body>
</html>
`;

export default function MapLocationPicker({
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      const data = await response.json();
      if (data.display_name) {
        const parts = data.display_name.split(',').slice(0, 3).join('،');
        setAddress(parts.trim());
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
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setCurrentCoords({ lat: latitude, lng: longitude });
      
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: 'setLocation', lat: latitude, lng: longitude })
        );
      }
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&accept-language=ar`
      );
      const results = await response.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setCurrentCoords({ lat: newLat, lng: newLng });
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({ type: 'setLocation', lat: newLat, lng: newLng })
          );
        }
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

  const mapHTML = getMapHTML(currentCoords.lat, currentCoords.lng);

  // Web fallback using iframe
  const renderWebMap = () => (
    <View style={styles.mapContainer}>
      {Platform.OS === 'web' ? (
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentCoords.lng - 0.05},${currentCoords.lat - 0.03},${currentCoords.lng + 0.05},${currentCoords.lat + 0.03}&layer=mapnik&marker=${currentCoords.lat},${currentCoords.lng}`}
          style={{ width: '100%', height: '100%', border: 'none' } as any}
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#E53935" />
              <Text style={styles.mapLoadingText}>جاري تحميل الخريطة...</Text>
            </View>
          )}
        />
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>حدد موقع التوصيل</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity 
            onPress={searchLocation} 
            style={styles.searchBtn}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
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
        {renderWebMap()}

        {/* GPS Button */}
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={goToMyLocation}
          disabled={loadingGPS}
          activeOpacity={0.8}
        >
          {loadingGPS ? (
            <ActivityIndicator size="small" color="#E53935" />
          ) : (
            <Ionicons name="navigate" size={22} color="#E53935" />
          )}
        </TouchableOpacity>

        {/* Bottom Card */}
        <View style={styles.bottomCard}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={22} color="#E53935" />
            <View style={styles.addressInfo}>
              {loadingAddress ? (
                <ActivityIndicator size="small" color="#E53935" />
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>
                  {address || 'حرّك الخريطة لتحديد الموقع'}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={confirmLocation}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>تأكيد الموقع</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Cairo_700Bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#999',
  },
  gpsButton: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    }),
  },
  bottomCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      web: { boxShadow: '0px -4px 16px rgba(0,0,0,0.1)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 },
    }),
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
    textAlign: 'right',
    lineHeight: 22,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
});
