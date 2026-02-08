import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { orderAPI } from '../services/api';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface Props {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  restaurantLat?: number;
  restaurantLng?: number;
  deliveryAddress?: string;
}

const getTrackingHTML = (
  driverLat: number, driverLng: number,
  restLat?: number, restLng?: number,
  driverName?: string
) => `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .driver-marker {
      width: 40px; height: 40px;
      background: #E53935; border: 3px solid white;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 20px; box-shadow: 0 3px 12px rgba(229,57,53,0.4);
    }
    .driver-pulse {
      width: 60px; height: 60px;
      background: rgba(229,57,53,0.15); border-radius: 50%;
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6} 50%{transform:translate(-50%,-50%) scale(1.8);opacity:0} }
    .rest-marker {
      width: 36px; height: 36px;
      background: white; border: 2px solid #22c55e;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${driverLat}, ${driverLng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    
    var driverMarker = L.marker([${driverLat}, ${driverLng}], {
      icon: L.divIcon({
        html: '<div style="position:relative;"><div class="driver-pulse"></div><div class="driver-marker">🛵</div></div>',
        iconSize: [40, 40], iconAnchor: [20, 20], className: ''
      })
    }).addTo(map).bindPopup('<b>${driverName || "السائق"}</b>');
    
    ${restLat && restLng ? `
    L.marker([${restLat}, ${restLng}], {
      icon: L.divIcon({
        html: '<div class="rest-marker">🍽️</div>',
        iconSize: [36, 36], iconAnchor: [18, 18], className: ''
      })
    }).addTo(map).bindPopup('المطعم');
    
    var bounds = L.latLngBounds([[${driverLat}, ${driverLng}], [${restLat}, ${restLng}]]);
    map.fitBounds(bounds, { padding: [50, 50] });
    ` : ''}
    
    window.updateDriverLocation = function(lat, lng) {
      driverMarker.setLatLng([lat, lng]);
      map.panTo([lat, lng], { animate: true, duration: 1 });
    };
    
    document.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'update_location') {
          window.updateDriverLocation(data.lat, data.lng);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>`;

export default function LiveTrackingModal({ orderId, visible, onClose, restaurantLat, restaurantLng, deliveryAddress }: Props) {
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchDriverLocation = async () => {
    try {
      const data = await orderAPI.getDriverLocation(orderId);
      if (data.driver_location) {
        setDriverInfo(data);
        setError(null);
        // Update map marker
        if (webViewRef.current && !loading) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'update_location',
            lat: data.driver_location.lat,
            lng: data.driver_location.lng,
          }));
        }
      } else {
        setError('لم يتم تعيين سائق بعد');
      }
    } catch (e) {
      setError('فشل تحميل موقع السائق');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchDriverLocation();
      // Poll every 10 seconds
      intervalRef.current = setInterval(fetchDriverLocation, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, orderId]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>جاري تحميل موقع السائق...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchDriverLocation(); }}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : driverInfo?.driver_location ? (
          <WebView
            ref={webViewRef}
            source={{ html: getTrackingHTML(
              driverInfo.driver_location.lat,
              driverInfo.driver_location.lng,
              restaurantLat,
              restaurantLng,
              driverInfo.driver_name
            )}}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تتبع السائق</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Driver Info Card */}
        {driverInfo && !error && (
          <View style={styles.driverCard}>
            <View style={styles.driverCardContent}>
              <View style={styles.driverAvatar}>
                <Ionicons name="bicycle" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverInfo.driver_name}</Text>
                <Text style={styles.orderStatus}>
                  {driverInfo.order_status === 'driver_assigned' ? 'في الطريق للمطعم' :
                   driverInfo.order_status === 'picked_up' ? 'استلم الطلب' :
                   driverInfo.order_status === 'out_for_delivery' ? 'في الطريق إليك' :
                   driverInfo.order_status}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => driverInfo.driver_phone && Linking.openURL(`tel:${driverInfo.driver_phone}`)}
              >
                <Ionicons name="call" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: COLORS.textSecondary },
  errorText: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: COLORS.textSecondary },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: 'white' },
  map: { flex: 1 },
  header: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  headerTitle: {
    fontFamily: 'Cairo_700Bold', fontSize: 16, color: COLORS.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    overflow: 'hidden',
  },
  driverCard: {
    position: 'absolute', bottom: 30, left: SPACING.lg, right: SPACING.lg,
    backgroundColor: 'white', borderRadius: RADIUS.lg, padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  driverCardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  driverDetails: { flex: 1, alignItems: 'flex-end' },
  driverName: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: COLORS.textPrimary },
  orderStatus: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: COLORS.success, marginTop: 2 },
  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
  },
});
