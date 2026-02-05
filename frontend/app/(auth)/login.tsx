import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, setGuestMode } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const user = await login(phone, password);
      if (user.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else if (user.role === 'restaurant') {
        router.replace('/(restaurant)/dashboard');
      } else if (user.role === 'driver') {
        router.replace('/(driver)/dashboard');
      } else {
        router.replace('/(main)/home');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBrowse = () => {
    if (setGuestMode) {
      setGuestMode(true);
    }
    router.replace('/(main)/home');
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800' }}
        style={styles.backgroundImage}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', COLORS.secondary]}
        style={styles.overlay}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>أكلة عالسريع</Text>
              <Text style={styles.subtitle}>اطلب أشهى المأكولات بضغطة زر</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>تسجيل الدخول</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="رقم الهاتف"
                  placeholderTextColor={COLORS.textLight}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
                <View style={styles.inputIconContainer}>
                  <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                />
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textWhite} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
                      <Ionicons name="arrow-back" size={20} color={COLORS.textWhite} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.divider} />
              </View>

              {/* Guest Browse Button */}
              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestBrowse}
                activeOpacity={0.8}
              >
                <Text style={styles.guestButtonText}>تصفح كضيف 👀</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.registerLink}>إنشاء حساب جديد</Text>
                  </TouchableOpacity>
                </Link>
                <Text style={styles.registerText}>ليس لديك حساب؟ </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'visible',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  logoEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.sm,
  },
  eyeButton: {
    padding: SPACING.sm,
  },

  // Login Button
  loginButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  loginButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  loginButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.sm,
    color: COLORS.textLight,
    fontSize: 12,
  },

  // Guest Button
  guestButton: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  guestButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Register
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },

  // Features
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.xxl,
  },
  featureItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
