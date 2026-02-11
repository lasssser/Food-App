import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading, isGuest, user, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    if (isAuthenticated) {
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
    } else if (isGuest) {
      router.replace('/(main)/home');
    } else {
      // Go directly to home as guest instead of login
      const { setGuestMode } = useAuthStore.getState();
      setGuestMode(true);
      router.replace('/(main)/home');
    }
  }, [isReady, isLoading, isAuthenticated, isGuest]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>جاري التحميل...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
});
