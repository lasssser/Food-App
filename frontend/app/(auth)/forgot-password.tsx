import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        phone: phone.trim(),
        reason: reason.trim() || undefined,
      });
      setMessage(response.data.message);
      setSubmitted(true);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>تم إرسال الطلب</Text>
          <Text style={styles.successMessage}>{message}</Text>
          <Text style={styles.successHint}>
            سيتواصل معك فريق الدعم عبر واتساب أو اتصال هاتفي للتحقق من هويتك وإعادة تعيين كلمة المرور
          </Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backToLoginText}>العودة لتسجيل الدخول</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient colors={[COLORS.primary, '#FF6B35']} style={styles.iconGradient}>
              <Ionicons name="lock-open" size={40} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>نسيت كلمة المرور؟</Text>
          <Text style={styles.subtitle}>أدخل رقم هاتفك المسجل وسنرسل طلبك للإدارة لإعادة تعيين كلمة المرور</Text>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="رقم الهاتف المسجل"
                placeholderTextColor={COLORS.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* Reason (optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.optionalLabel}>سبب الطلب (اختياري)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="مثال: نسيت كلمة المرور..."
              placeholderTextColor={COLORS.textLight}
              value={reason}
              onChangeText={setReason}
              textAlign="right"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, (!phone.trim() || loading) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={!phone.trim() || loading}
          >
            <LinearGradient colors={[COLORS.primary, '#FF6B35']} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitText}>إرسال الطلب</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              سيقوم فريق الدعم بالتحقق من هويتك عبر واتساب أو اتصال هاتفي قبل إعادة تعيين كلمة المرور
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.xl, paddingTop: SPACING.md },
  backBtn: { alignSelf: 'flex-end', marginBottom: SPACING.xl },
  iconContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  iconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'Cairo_700Bold', fontSize: 24, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  inputContainer: { marginBottom: SPACING.lg },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, height: 54, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  input: { flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 15, color: COLORS.textPrimary },
  optionalLabel: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: COLORS.textLight, textAlign: 'right', marginBottom: 6 },
  reasonInput: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 14, fontFamily: 'Cairo_400Regular', color: COLORS.textPrimary, textAlign: 'right', borderWidth: 1, borderColor: COLORS.border, minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { marginTop: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  submitText: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' },
  infoBox: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginTop: SPACING.xl, backgroundColor: '#E3F2FD', padding: SPACING.md, borderRadius: RADIUS.md },
  infoText: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: '#1565C0', flex: 1, textAlign: 'right', lineHeight: 20 },
  // Success state
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  successIcon: { marginBottom: SPACING.lg },
  successTitle: { fontFamily: 'Cairo_700Bold', fontSize: 22, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successMessage: { fontFamily: 'Cairo_400Regular', fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  successHint: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  backToLoginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: RADIUS.lg },
  backToLoginText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: '#fff' },
});
