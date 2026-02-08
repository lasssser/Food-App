import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { driverAPI } from '../../src/services/api';
import * as Location from 'expo-location';
import { COLORS } from '../../src/constants/theme';

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  const locationInterval = useRef<any>(null);
  
  // Register push notifications
  usePushNotifications();

  // Auto-update driver location every 15 seconds
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await driverAPI.updateLocation(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        // Silently fail
      }
    };

    updateLocation(); // Initial update
    locationInterval.current = setInterval(updateLocation, 15000); // Every 15s

    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), height: 65 + insets.bottom }],
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="available"
        options={{
          title: 'طلبات متاحة',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myorders"
        options={{
          title: 'توصيلاتي',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-complaints"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
  },
});
