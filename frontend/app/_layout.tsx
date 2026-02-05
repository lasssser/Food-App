import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, I18nManager, Text } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { seedAPI } from '../src/services/api';
import { COLORS } from '../src/constants/theme';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Cairo_300Light, Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// Force RTL for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Set default font for all Text components
const originalRender = Text.render;
Text.render = function (...args: any[]) {
  const origin = originalRender.call(this, ...args);
  return React.cloneElement(origin, {
    style: [{ fontFamily: 'Cairo_400Regular' }, origin.props.style],
  });
};

export default function RootLayout() {
  const { isLoading, isAuthenticated, isGuest, user, checkAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  
  // Load Cairo fonts
  const [fontsLoaded] = useFonts({
    Cairo_300Light,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  
  // Initialize push notifications
  const { expoPushToken, notification, loading: pushLoading, error: pushError } = usePushNotifications();
  
  useEffect(() => {
    if (expoPushToken) {
      console.log('📱 Push notifications enabled with token:', expoPushToken.slice(0, 30) + '...');
    }
    if (pushError) {
      console.log('⚠️ Push notification setup error:', pushError);
    }
  }, [expoPushToken, pushError]);

  useEffect(() => {
    const init = async () => {
      // Seed database with demo data
      try {
        await seedAPI.seed();
      } catch (e) {
        // Ignore if already seeded
      }
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  useEffect(() => {
    if (!isReady || isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';
    const inRestaurantGroup = segments[0] === '(restaurant)';
    const inDriverGroup = segments[0] === '(driver)';
    const inAdminGroup = segments[0] === '(admin)';

    // Guest mode - allow browsing main screens
    if (isGuest && inAuthGroup) {
      router.replace('/(main)/home');
      return;
    }

    // Not authenticated and not guest - redirect to login
    if (!isAuthenticated && !isGuest && !inAuthGroup) {
      router.replace('/(auth)/login');
    } 
    // Authenticated user in auth group - redirect based on role
    else if (isAuthenticated && inAuthGroup) {
      const role = user?.role || 'customer';
      if (role === 'admin' || role === 'moderator') {
        router.replace('/(admin)/dashboard');
      } else if (role === 'restaurant') {
        router.replace('/(restaurant)/dashboard');
      } else if (role === 'driver') {
        router.replace('/(driver)/dashboard');
      } else {
        router.replace('/(main)/home');
      }
    }
  }, [isAuthenticated, isGuest, segments, isLoading, isReady, user, fontsLoaded]);

  if (!fontsLoaded || !isReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(restaurant)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="restaurant" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
