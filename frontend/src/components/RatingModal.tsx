import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { ratingAPI } from '../services/api';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  restaurantName: string;
  hasDriver: boolean;
  driverName?: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  visible,
  onClose,
  orderId,
  restaurantName,
  hasDriver,
  driverName,
  onSuccess,
}: RatingModalProps) {
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (restaurantRating < 1) {
      Alert.alert('تنبيه', 'يرجى تقييم المطعم');
      return;
    }

    setLoading(true);
    try {
      await ratingAPI.create({
        order_id: orderId,
        restaurant_rating: restaurantRating,
        driver_rating: hasDriver ? driverRating : undefined,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إرسال التقييم');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setRestaurantRating(5);
    setDriverRating(5);
    setComment('');
    onClose();
  };

  const renderStars = (rating: number, setRating: (r: number) => void, label: string) => (
    <View style={styles.ratingSection}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={36}
              color={star <= rating ? '#FFD700' : COLORS.border}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingValue}>
        {rating === 5 ? 'ممتاز!' : rating === 4 ? 'جيد جداً' : rating === 3 ? 'جيد' : rating === 2 ? 'مقبول' : 'ضعيف'}
      </Text>
    </View>
  );

  if (submitted) {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={50} color={COLORS.textWhite} />
            </View>
            <Text style={styles.successTitle}>شكراً لك! 🎉</Text>
            <Text style={styles.successMessage}>
              تقييمك يساعدنا على تحسين خدماتنا
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>تم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>قيّم تجربتك</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Restaurant Rating */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{restaurantName}</Text>
              <View style={styles.sectionIcon}>
                <Ionicons name="restaurant" size={20} color={COLORS.primary} />
              </View>
            </View>
            {renderStars(restaurantRating, setRestaurantRating, 'كيف كان الطعام؟')}
          </View>

          {/* Driver Rating */}
          {hasDriver && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{driverName || 'السائق'}</Text>
                <View style={[styles.sectionIcon, { backgroundColor: `${COLORS.success}15` }]}>
                  <Ionicons name="bicycle" size={20} color={COLORS.success} />
                </View>
              </View>
              {renderStars(driverRating, setDriverRating, 'كيف كانت خدمة التوصيل؟')}
            </View>
          )}

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>أضف تعليقاً (اختياري)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="شاركنا رأيك..."
              placeholderTextColor={COLORS.textLight}
              value={comment}
              onChangeText={setComment}
              multiline
              textAlign="right"
              maxLength={500}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.textWhite} />
                  <Text style={styles.submitButtonText}>إرسال التقييم</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ratingSection: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  starButton: {
    padding: 4,
  },
  ratingValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  commentSection: {
    padding: SPACING.lg,
  },
  commentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  submitButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Success State
  successContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    margin: SPACING.xl,
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  doneButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  doneButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
