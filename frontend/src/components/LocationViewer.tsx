import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';

interface LocationViewerProps {
  location: { lat: number; lng: number };
  addressText?: string;
  height?: number;
  showNavigateButton?: boolean;
}

export default function LocationViewer({
  location,
  addressText,
  height = 180,
  showNavigateButton = true,
}: LocationViewerProps) {
  const openNavigation = () => {
    const { lat, lng } = location;
    const label = 'موقع التوصيل';

    // Open in Google Maps / Apple Maps / Browser
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.openURL(url as string);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={[styles.mapContainer, { height }]}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: location.lat,
              longitude: location.lng,
            }}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={32} color={COLORS.primary} />
            </View>
          </Marker>
        </MapView>

        {/* Navigate button overlay */}
        {showNavigateButton && (
          <TouchableOpacity style={styles.navigateBtn} onPress={openNavigation}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.navigateBtnText}>ابدأ التنقل</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Address text */}
      {addressText && (
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.addressText}>{addressText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateBtn: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.small,
  },
  navigateBtnText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: '#fff',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
});
