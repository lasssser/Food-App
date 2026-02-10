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
}

const getTrackingHTML = (driverLat: number, driverLng: number, restLat?: number | null, restLng?: number | null, driverName?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .leaflet-control-zoom,.leaflet-control-attribution{display:none!important}
    .driver-icon{
      width:46px;height:46px;background:linear-gradient(135deg,#E53935,#FF6B35);
      border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:22px;box-shadow:0 4px 16px rgba(229,57,53,0.5);
      animation:driverPulse 2s infinite;
    }
    @keyframes driverPulse{
      0%,100%{box-shadow:0 4px 16px rgba(229,57,53,0.5)}
      50%{box-shadow:0 4px 30px rgba(229,57,53,0.3),0 0 0 12px rgba(229,57,53,0.1)}
    }
    .rest-icon{
      width:38px;height:38px;background:#fff;border:2px solid #4CAF50;
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${driverLat},${driverLng}],15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
    
    var driverMarker=L.marker([${driverLat},${driverLng}],{
      icon:L.divIcon({html:'<div class="driver-icon">&#x1F6F5;</div>',iconSize:[46,46],iconAnchor:[23,23],className:''})
    }).addTo(map);
    
    ${restLat && restLng ? `
    var restMarker=L.marker([${restLat},${restLng}],{
      icon:L.divIcon({html:'<div class="rest-icon">&#x1F37D;</div>',iconSize:[38,38],iconAnchor:[19,19],className:''})
    }).addTo(map);
    
    var routeLine=L.polyline([[${driverLat},${driverLng}],[${restLat},${restLng}]],{
      color:'#E53935',weight:3,opacity:0.6,dashArray:'8,12',
    }).addTo(map);
    
    map.fitBounds([[${driverLat},${driverLng}],[${restLat},${restLng}]],{padding:[60,60]});
    ` : ''}
    
    document.addEventListener('message',function(e){
      try{
        var d=JSON.parse(e.data);
        if(d.type==='update'){
          driverMarker.setLatLng([d.lat,d.lng]);
          ${restLat && restLng ? `routeLine.setLatLngs([[d.lat,d.lng],[${restLat},${restLng}]]);` : ''}
          map.panTo([d.lat,d.lng],{animate:true,duration:1});
        }
      }catch(err){}
    });
  </script>
</body>
</html>`;

const PHASES = [
  { key: 'going_to_restaurant', label: 'في الطريق للمطعم', icon: 'restaurant-outline' },
  { key: 'at_restaurant', label: 'استلم الطلب', icon: 'bag-check-outline' },
  { key: 'delivering', label: 'في الطريق إليك', icon: 'bicycle' },
  { key: 'arrived', label: 'وصل!', icon: 'checkmark-circle' },
];

export default function LiveTrackingModal({ orderId, visible, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  const fetchData = async () => {
    try {
      const result = await orderAPI.getDriverLocation(orderId);
      
      // Driver is assigned
      if (result.driver_assigned) {
        setData(result);
        setError(null);
        // Update map if driver has location
        if (result.has_location && result.driver_location && webViewRef.current && !loading) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'update',
            lat: result.driver_location.lat,
            lng: result.driver_location.lng,
          }));
        }
      } else {
        // No driver assigned yet
        setData(null);
        setError(result.message || 'لم يتم تعيين سائق بعد');
      }
    } catch (e) {
      setError('فشل تحميل موقع السائق');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchData();
      intervalRef.current = setInterval(fetchData, 8000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible, orderId]);

  if (!visible) return null;

  const currentPhaseIndex = PHASES.findIndex(p => p.key === data?.phase);
  const eta = data?.phase === 'delivering' ? data?.eta_to_customer_min : data?.eta_to_restaurant_min;
  const hasLocation = data?.has_location && data?.driver_location;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Map or Waiting State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>جاري تحميل موقع السائق...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="location-outline" size={64} color="#ddd" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchData(); }}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : data?.driver_assigned && !hasLocation ? (
          /* Driver assigned but no location shared yet */
          <View style={styles.loadingContainer}>
            <Ionicons name="bicycle" size={64} color={COLORS.primary} />
            <Text style={[styles.errorText, { color: COLORS.textPrimary }]}>
              تم تعيين السائق: {data.driver_name}
            </Text>
            <Text style={styles.waitingLocationText}>
              بانتظار مشاركة السائق لموقعه...
            </Text>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
          </View>
        ) : hasLocation ? (
          <WebView
            ref={webViewRef}
            source={{ html: getTrackingHTML(
              data.driver_location.lat, data.driver_location.lng,
              data.restaurant_lat, data.restaurant_lng,
              data.driver_name
            )}}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : null}

        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} data-testid="tracking-close-btn">
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>

        {/* Bottom Card - show when driver is assigned (even without location) */}
        {data?.driver_assigned && !error && (
          <View style={styles.bottomCard}>
            {/* ETA */}
            {eta && hasLocation && (
              <Animated.View style={[styles.etaContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.etaNumber}>{eta}</Text>
                <Text style={styles.etaLabel}>دقيقة</Text>
              </Animated.View>
            )}

            {/* Phase Text */}
            <Text style={styles.phaseText}>{data.phase_text || 'السائق معين'}</Text>

            {/* Distance */}
            {hasLocation && data.distance_to_restaurant_km && (
              <Text style={styles.distanceText}>
                {data.phase === 'delivering' 
                  ? `على بعد ${data.distance_to_restaurant_km} كم منك`
                  : `على بعد ${data.distance_to_restaurant_km} كم من المطعم`}
              </Text>
            )}

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
              {PHASES.map((phase, i) => {
                const isActive = i <= currentPhaseIndex;
                const isCurrent = i === currentPhaseIndex;
                return (
                  <View key={phase.key} style={styles.progressStep}>
                    <View style={[styles.progressDot, isActive && styles.progressDotActive, isCurrent && styles.progressDotCurrent]}>
                      <Ionicons name={phase.icon as any} size={14} color={isActive ? '#fff' : '#ccc'} />
                    </View>
                    <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>{phase.label}</Text>
                    {i < PHASES.length - 1 && (
                      <View style={[styles.progressLine, isActive && styles.progressLineActive]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Driver Info + Call */}
            <View style={styles.driverRow}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => data.driver_phone && Linking.openURL(`tel:${data.driver_phone}`)}
                data-testid="tracking-call-btn"
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => data.driver_phone && Linking.openURL(`https://wa.me/${data.driver_phone}`)}
                data-testid="tracking-whatsapp-btn"
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{data.driver_name}</Text>
                <Text style={styles.driverSub}>السائق</Text>
              </View>
              <View style={styles.driverAvatar}>
                <Ionicons name="bicycle" size={24} color={COLORS.primary} />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#999' },
  errorText: { fontFamily: 'Cairo_400Regular', fontSize: 16, color: '#999', marginTop: 12 },
  waitingLocationText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#999', marginTop: 4 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: '#fff' },
  closeBtn: {
    position: 'absolute', top: 50, left: 16,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 16,
  },
  etaContainer: {
    alignSelf: 'center', backgroundColor: COLORS.primary,
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -56, marginBottom: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  etaNumber: { fontFamily: 'Cairo_700Bold', fontSize: 24, color: '#fff', lineHeight: 28 },
  etaLabel: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: -2 },
  phaseText: { fontFamily: 'Cairo_600SemiBold', fontSize: 17, color: COLORS.textPrimary, textAlign: 'center' },
  distanceText: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: '#999', textAlign: 'center', marginTop: 2, marginBottom: 16 },
  progressContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingHorizontal: 4 },
  progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotCurrent: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  progressLabel: { fontFamily: 'Cairo_400Regular', fontSize: 9, color: '#bbb', textAlign: 'center' },
  progressLabelActive: { color: COLORS.textPrimary, fontFamily: 'Cairo_600SemiBold' },
  progressLine: { position: 'absolute', top: 15, right: -20, width: 40, height: 2, backgroundColor: '#eee' },
  progressLineActive: { backgroundColor: COLORS.primary },
  driverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 16, padding: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center' },
  driverInfo: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  driverName: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: COLORS.textPrimary },
  driverSub: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: '#999' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  whatsappBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
});
