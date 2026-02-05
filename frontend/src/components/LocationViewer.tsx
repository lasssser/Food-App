import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
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

  const openInMaps = () => {
    const { lat, lng } = location;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Map placeholder */}
      <View style={[styles.mapContainer, { height }]}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="location" size={40} color={COLORS.primary} />
          <Text style={styles.locationText}>موقع التوصيل</Text>
          <Text style={styles.coordsText}>
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </Text>
        </View>

        {/* Navigate button overlay */}
        {showNavigateButton && (
          <TouchableOpacity style={styles.navigateBtn} onPress={openNavigation}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.navigateBtnText}>ابدأ التنقل</Text>
          </TouchableOpacity>
        )}

        {/* View on map button */}
        <TouchableOpacity style={styles.viewMapBtn} onPress={openInMaps}>
          <Ionicons name="map" size={18} color={COLORS.primary} />
          <Text style={styles.viewMapBtnText}>عرض على الخريطة</Text>
        </TouchableOpacity>
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    padding: SPACING.lg,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: 'Cairo_400Regular',
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
  viewMapBtn: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.small,
  },
  viewMapBtnText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.primary,
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
