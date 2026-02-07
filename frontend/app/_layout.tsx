import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, I18nManager, Text, Image, Animated, Easing } from 'react-native';
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

// Animated Splash Screen Component
function SplashView() {
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const textOpacity = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Logo entrance: scale up + fade in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After logo appears, show text
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Start continuous pulse + shake
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Fire/shake effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 3,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -3,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 2,
            duration: 60,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -2,
            duration: 60,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.splashContainer}>
      {/* Glowing background circle */}
      <Animated.View style={[styles.splashGlow, { opacity: opacityAnim, transform: [{ scale: pulseAnim }] }]} />

      {/* Logo with animation */}
      <Animated.View
        style={[
          styles.splashLogoBox,
          {
            opacity: opacityAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.splashName}>أكلة عالسريع</Text>
        <Text style={styles.splashSlogan}>اطلب أشهى المأكولات بضغطة زر 🔥</Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={{ opacity: textOpacity, marginTop: 40 }}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        <Text style={styles.splashLoading}>جاري التحميل...</Text>
      </Animated.View>
    </View>
  );
}

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
    return <SplashView />;
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
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  splashLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
  },
  splashName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  splashSlogan: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
