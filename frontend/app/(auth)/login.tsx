import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, setGuestMode } = useAuthStore();
  const router = useRouter();

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    // Form slide up
    Animated.parallel([
      Animated.timing(formSlide, { toValue: 0, duration: 600, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const onBtnPressIn = () => Animated.spring(btnScale, { toValue: 0.95, friction: 8, useNativeDriver: true }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const user = await login(phone, password);
      if (user.role === 'admin' || user.role === 'moderator') {
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Red Section */}
            <Animated.View style={[styles.topSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>أكلة عالسريع</Text>
              <Text style={styles.appSlogan}>اطلب أشهى المأكولات بضغطة زر</Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View style={[styles.formSection, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}>
              <Text style={styles.formTitle}>تسجيل الدخول</Text>

              {/* Phone Input */}
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={20} color="#bbb" />
                <TextInput
                  style={styles.input}
                  placeholder="رقم الهاتف"
                  placeholderTextColor="#bbb"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputBox}>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#bbb"
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور"
                  placeholderTextColor="#bbb"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                />
                <Ionicons name="lock-closed-outline" size={20} color="#bbb" />
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                    <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Guest Button */}
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleGuestBrowse}
                activeOpacity={0.8}
              >
                <Text style={styles.guestBtnText}>تصفح كضيف 👀</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerRow}>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.registerLink}>إنشاء حساب جديد</Text>
                  </TouchableOpacity>
                </Link>
                <Text style={styles.registerText}>ليس لديك حساب؟ </Text>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>Powered by Wethaq Digital Solutions</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Top section
  topSection: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoWrapper: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
    }),
  },
  logoImage: {
    width: 130,
    height: 130,
  },
  appName: {
    fontSize: 30,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
    marginBottom: 4,
  },
  appSlogan: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.85)',
  },

  // Form section
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'Cairo_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: '#333',
    paddingHorizontal: 10,
  },

  // Login button
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: '#bbb',
    marginHorizontal: 16,
  },

  // Guest button
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  guestBtnText: {
    fontSize: 15,
    fontFamily: 'Cairo_600SemiBold',
    color: '#666',
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: '#999',
  },
  registerLink: {
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    color: COLORS.primary,
  },

  // Footer
  footer: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    color: '#ccc',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
});
