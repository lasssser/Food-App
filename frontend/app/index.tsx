import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { seedAPI } from '../src/services/api';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading, isGuest, user, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try { await seedAPI.seed(); } catch (e) {}
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  if (isLoading || !isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    const role = user?.role || 'customer';
    if (role === 'admin' || role === 'moderator') {
      return <Redirect href="/(admin)/dashboard" />;
    } else if (role === 'restaurant') {
      return <Redirect href="/(restaurant)/dashboard" />;
    } else if (role === 'driver') {
      return <Redirect href="/(driver)/dashboard" />;
    }
    return <Redirect href="/(main)/home" />;
  }

  if (isGuest) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
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
