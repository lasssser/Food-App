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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !phone || !password || !confirmPassword) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      await register(name, phone, password);
      router.replace('/(main)/home');
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
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
                <Text style={styles.logoEmoji}>🍔</Text>
              </View>
              <Text style={styles.title}>أكلة عالسريع</Text>
              <Text style={styles.subtitle}>سجّل الآن واستمتع بأشهى المأكولات</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>إنشاء حساب جديد</Text>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="الاسم الكامل"
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                </View>
              </View>

              {/* Phone Input */}
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

              {/* Password Input */}
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="تأكيد كلمة المرور"
                  placeholderTextColor={COLORS.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                />
                <View style={styles.inputIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textLight} />
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.registerButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textWhite} />
                  ) : (
                    <>
                      <Text style={styles.registerButtonText}>إنشاء الحساب</Text>
                      <Ionicons name="person-add" size={20} color={COLORS.textWhite} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLink}>تسجيل الدخول</Text>
                  </TouchableOpacity>
                </Link>
                <Text style={styles.loginText}>لديك حساب بالفعل؟ </Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
                <Text style={styles.featureText}>حساب آمن</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="gift" size={20} color={COLORS.accent} />
                <Text style={styles.featureText}>عروض حصرية</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="time" size={20} color={COLORS.accent} />
                <Text style={styles.featureText}>توصيل سريع</Text>
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
    height: height * 0.40,
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
    padding: SPACING.xl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  logoEmoji: {
    fontSize: 45,
  },
  title: {
    fontSize: 32,
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
    padding: SPACING.xl,
    ...SHADOWS.large,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIconContainer: {
    width: 36,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.sm,
  },
  eyeButton: {
    padding: SPACING.sm,
  },

  // Register Button
  registerButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  registerButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  registerButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
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
