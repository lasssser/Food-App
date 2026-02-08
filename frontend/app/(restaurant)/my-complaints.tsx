import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface Complaint {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  user_name: string;
  user_phone: string;
  order_id?: string;
  admin_response?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'جديدة', color: '#f59e0b', bg: '#fef3c7' },
  in_progress: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#dbeafe' },
  resolved: { label: 'تم الحل', color: '#22c55e', bg: '#dcfce7' },
  closed: { label: 'مغلقة', color: '#6b7280', bg: '#f3f4f6' },
};

export default function RestaurantComplaintsScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      const data = await restaurantPanelAPI.getRestaurantComplaints();
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComplaints();
  }, []);

  const handleRespond = async () => {
    if (!selectedComplaint || !responseText.trim()) return;
    setSubmitting(true);
    try {
      await restaurantPanelAPI.respondToComplaint(selectedComplaint.id, responseText.trim(), 'resolved');
      setShowDetailModal(false);
      setResponseText('');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error) {
      console.error('Error responding to complaint:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate();
      const month = d.getMonth() + 1;
      return `${day}/${month} ${h}:${m}`;
    } catch { return ''; }
  };

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
    
    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => { setSelectedComplaint(item); setShowDetailModal(true); }}
        activeOpacity={0.7}
      >
        <View style={styles.complaintHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={styles.complaintSubject} numberOfLines={1}>{item.subject}</Text>
        </View>
        <Text style={styles.complaintMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.complaintFooter}>
          <Text style={styles.complaintDate}>{formatDate(item.created_at)}</Text>
          <View style={styles.customerInfo}>
            <Ionicons name="person" size={14} color={COLORS.textLight} />
            <Text style={styles.customerName}>{item.user_name}</Text>
          </View>
        </View>
        {item.order_id && (
          <View style={styles.orderTag}>
            <Ionicons name="receipt-outline" size={12} color={COLORS.info} />
            <Text style={styles.orderTagText}>طلب #{String(item.order_id).slice(0, 8)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>شكاوى الزبائن</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          {complaints.filter(c => c.status === 'open').length} شكوى جديدة
        </Text>
      </LinearGradient>

      <FlatList
        data={complaints}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="happy-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>لا توجد شكاوى</Text>
            <Text style={styles.emptySubtext}>لم يرسل أي زبون شكوى بعد</Text>
          </View>
        }
      />

      {/* Detail + Respond Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowDetailModal(false); setResponseText(''); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تفاصيل الشكوى</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedComplaint && (
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.detailHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_CONFIG[selectedComplaint.status] || STATUS_CONFIG.open).bg }]}>
                    <Text style={[styles.statusText, { color: (STATUS_CONFIG[selectedComplaint.status] || STATUS_CONFIG.open).color }]}>
                      {(STATUS_CONFIG[selectedComplaint.status] || STATUS_CONFIG.open).label}
                    </Text>
                  </View>
                  <Text style={styles.detailSubject}>{selectedComplaint.subject}</Text>
                </View>

                <View style={styles.customerCard}>
                  <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
                    <Text style={styles.customerCardName}>{selectedComplaint.user_name}</Text>
                    <Text style={styles.customerCardPhone}>{selectedComplaint.user_phone}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>الشكوى:</Text>
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{selectedComplaint.message}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(selectedComplaint.created_at)}</Text>
                </View>

                {selectedComplaint.admin_response ? (
                  <View style={styles.responseSection}>
                    <View style={styles.responseLabelContainer}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#22c55e" />
                      <Text style={styles.responseLabel}>ردك:</Text>
                    </View>
                    <View style={styles.responseBox}>
                      <Text style={styles.responseBoxText}>{selectedComplaint.admin_response}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.respondSection}>
                    <Text style={styles.sectionLabel}>اكتب ردك:</Text>
                    <TextInput
                      style={styles.respondInput}
                      placeholder="اكتب ردك على الشكوى هنا..."
                      placeholderTextColor={COLORS.textLight}
                      value={responseText}
                      onChangeText={setResponseText}
                      textAlign="right"
                      multiline
                      numberOfLines={4}
                    />
                    <TouchableOpacity
                      style={[styles.respondButton, (!responseText.trim() || submitting) && { opacity: 0.6 }]}
                      onPress={handleRespond}
                      disabled={!responseText.trim() || submitting}
                    >
                      <LinearGradient colors={[COLORS.success, '#43A047']} style={styles.respondButtonGradient}>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.respondButtonText}>{submitting ? 'جاري الإرسال...' : 'إرسال الرد'}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', fontFamily: 'Cairo_700Bold' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Cairo_400Regular', textAlign: 'center', marginTop: 4 },
  listContent: { padding: SPACING.lg },
  complaintCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.small },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  complaintSubject: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, fontFamily: 'Cairo_600SemiBold', textAlign: 'right', marginLeft: SPACING.md },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: 'Cairo_400Regular' },
  complaintMessage: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'Cairo_400Regular', textAlign: 'right', lineHeight: 20 },
  complaintFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  complaintDate: { fontSize: 12, color: COLORS.textLight, fontFamily: 'Cairo_400Regular' },
  customerInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  customerName: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'Cairo_400Regular' },
  orderTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: `${COLORS.info}10`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-end' },
  orderTagText: { fontSize: 11, color: COLORS.info, fontFamily: 'Cairo_400Regular' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'Cairo_600SemiBold', marginTop: SPACING.md },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, fontFamily: 'Cairo_400Regular', marginTop: SPACING.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: 'Cairo_700Bold' },
  modalBody: { padding: SPACING.lg },
  detailHeader: { marginBottom: SPACING.lg },
  detailSubject: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, fontFamily: 'Cairo_700Bold', textAlign: 'right', marginTop: SPACING.md },
  customerCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.lg },
  customerCardName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, fontFamily: 'Cairo_600SemiBold' },
  customerCardPhone: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo_400Regular' },
  detailSection: { marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'Cairo_600SemiBold', textAlign: 'right', marginBottom: SPACING.sm },
  messageBox: { backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: RADIUS.md },
  messageText: { fontSize: 15, color: COLORS.textPrimary, fontFamily: 'Cairo_400Regular', textAlign: 'right', lineHeight: 24 },
  dateText: { fontSize: 12, color: COLORS.textLight, fontFamily: 'Cairo_400Regular', textAlign: 'right', marginTop: SPACING.sm },
  responseSection: { backgroundColor: '#f0fdf4', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: SPACING.lg },
  responseLabelContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  responseLabel: { fontSize: 14, fontWeight: '600', color: '#166534', fontFamily: 'Cairo_600SemiBold' },
  responseBox: { backgroundColor: '#fff', padding: SPACING.md, borderRadius: RADIUS.sm },
  responseBoxText: { fontSize: 14, color: COLORS.textPrimary, fontFamily: 'Cairo_400Regular', textAlign: 'right', lineHeight: 22 },
  respondSection: { marginBottom: SPACING.lg },
  respondInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, fontFamily: 'Cairo_400Regular', color: COLORS.textPrimary, textAlign: 'right', minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  respondButton: { borderRadius: RADIUS.md, overflow: 'hidden' },
  respondButtonGradient: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: SPACING.md },
  respondButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Cairo_700Bold' },
});
