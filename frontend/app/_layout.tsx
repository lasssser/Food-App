import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, I18nManager, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { COLORS } from '../src/constants/theme';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Cairo_300Light, Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import Constants from 'expo-constants';
import SplashView from '../src/components/SplashView';

// Keep splash screen visible while fonts load
try { SplashScreen.preventAutoHideAsync(); } catch (e) { /* ignore */ }

// Force RTL for Arabic
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch (e) { /* ignore */ }

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_300Light,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [forceUpdate, setForceUpdate] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const appVersion = Constants.expoConfig?.version || '1.0.0';
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://akla-alsaree.cloud';
        const res = await fetch(`${API_URL}/api/app/version?current=${appVersion}`);
        const data = await res.json();
        if (data.force_update) {
          setForceUpdate(true);
        }
      } catch {}
    };
    checkVersion();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      const timer = setTimeout(() => setShowSplash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || showSplash) {
    return <SplashView />;
  }

  if (forceUpdate) {
    return (
      <View style={styles.updateContainer}>
        <View style={styles.updateCard}>
          <Image source={require('../assets/images/logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" />
          <Text style={styles.updateTitle}>تحديث مطلوب</Text>
          <Text style={styles.updateMsg}>يوجد إصدار جديد من التطبيق. يرجى التحديث للاستمرار.</Text>
          <TouchableOpacity style={styles.updateBtn} onPress={() => {
            Linking.openURL('https://akla-alsaree.cloud');
          }}>
            <Text style={styles.updateBtnText}>تحديث الآن</Text>
          </TouchableOpacity>
        </View>
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
  updateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8fa',
    padding: 32,
  },
  updateCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  updateTitle: {
    fontSize: 22,
    fontFamily: 'Cairo_700Bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  updateMsg: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  updateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
  },
  updateBtnText: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
});
