import React, { useState } from 'react';
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
  lat: 33.5138,
  lng: 36.2765,
};

export default function LocationPicker({
  initialLocation,
  onLocationSelect,
  editable = true,
  showOpenInMaps = false,
  height = 250,
}: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);

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
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      onLocationSelect(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('فشل في تحديد الموقع');
    } finally {
      setLoading(false);
    }
  };

  // Open location in external maps app
  const openInMaps = () => {
    if (!selectedLocation) return;

    const { lat, lng } = selectedLocation;
    const label = 'موقع التوصيل';

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    Linking.openURL(url as string);
  };

  // Generate OpenStreetMap embed URL
  const getMapUrl = () => {
    const loc = selectedLocation || DEFAULT_LOCATION;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.01},${loc.lat - 0.01},${loc.lng + 0.01},${loc.lat + 0.01}&layer=mapnik&marker=${loc.lat},${loc.lng}`;
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Map placeholder with location info */}
      <View style={styles.mapPlaceholder}>
        {selectedLocation ? (
          <>
            <Ionicons name="location" size={48} color={COLORS.primary} />
            <Text style={styles.locationText}>تم تحديد الموقع ✓</Text>
            <Text style={styles.coordsText}>
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.placeholderText}>اضغط على "موقعي الحالي" لتحديد موقعك</Text>
          </>
        )}
      </View>

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

        {(showOpenInMaps || selectedLocation) && selectedLocation && (
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    padding: SPACING.lg,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: SPACING.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  coordsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: 'Cairo_400Regular',
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    fontFamily: 'Cairo_400Regular',
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
});
