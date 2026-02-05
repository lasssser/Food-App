import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number } | null;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  editable?: boolean;
  showOpenInMaps?: boolean;
  height?: number;
}

// Default location: Damascus, Syria
const DEFAULT_LOCATION = {
  latitude: 33.5138,
  longitude: 36.2765,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function LocationPicker({
  initialLocation,
  onLocationSelect,
  editable = true,
  showOpenInMaps = false,
  height = 250,
}: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng }
      : null
  );
  const [region, setRegion] = useState({
    ...DEFAULT_LOCATION,
    ...(initialLocation
      ? {
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
        }
      : {}),
  });

  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('يرجى السماح بالوصول للموقع');
        if (Platform.OS !== 'web') {
          Alert.alert(
            'صلاحية الموقع',
            'يرجى تفعيل صلاحية الموقع من الإعدادات',
            [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
            ]
          );
        }
        setLoading(false);
        return;
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      setRegion({
        ...newLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      // Animate to new location
      mapRef.current?.animateToRegion({
        ...newLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      onLocationSelect({
        lat: newLocation.latitude,
        lng: newLocation.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('فشل في تحديد الموقع');
    } finally {
      setLoading(false);
    }
  };

  // Handle map press
  const handleMapPress = (event: any) => {
    if (!editable) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    onLocationSelect({ lat: latitude, lng: longitude });
  };

  // Open location in external maps app
  const openInMaps = () => {
    if (!selectedLocation) return;

    const { latitude, longitude } = selectedLocation;
    const label = 'موقع التوصيل';

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    Linking.openURL(url as string);
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="موقع التوصيل"
            draggable={editable}
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSelectedLocation({ latitude, longitude });
              onLocationSelect({ lat: latitude, lng: longitude });
            }}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={36} color={COLORS.primary} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Controls overlay */}
      <View style={styles.controlsOverlay}>
        {editable && (
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="locate" size={20} color={COLORS.primary} />
                <Text style={styles.myLocationText}>موقعي الحالي</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {showOpenInMaps && selectedLocation && (
          <TouchableOpacity style={styles.openMapsBtn} onPress={openInMaps}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.openMapsText}>فتح في الخرائط</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Instructions */}
      {editable && !selectedLocation && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            اضغط على "موقعي الحالي" أو حدد موقعك على الخريطة
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    ...SHADOWS.small,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  myLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.small,
  },
  myLocationText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.primary,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.small,
  },
  openMapsText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: '#fff',
  },
  errorContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.error,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#fff',
    textAlign: 'center',
  },
});
