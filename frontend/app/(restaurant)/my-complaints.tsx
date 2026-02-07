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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { complaintsAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface Complaint {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  admin_response?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fef3c7' },
  in_progress: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#dbeafe' },
  resolved: { label: 'تم الحل', color: '#22c55e', bg: '#dcfce7' },
};

export default function MyComplaintsScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchComplaints = async () => {
    try {
      const data = await complaintsAPI.getMyComplaints();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY') + ' ' + date.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  };

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const statusConfig = getStatusConfig(item.status);
    const hasResponse = item.admin_response && item.admin_response.trim().length > 0;
    
    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => {
          setSelectedComplaint(item);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.complaintHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.complaintSubject} numberOfLines={1}>{item.subject}</Text>
        </View>

        <Text style={styles.complaintMessage} numberOfLines={2}>
          {item.message}
        </Text>

        <View style={styles.complaintFooter}>
          <Text style={styles.complaintDate}>{formatDate(item.created_at)}</Text>
          {hasResponse && (
            <View style={styles.responseIndicator}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#22c55e" />
              <Text style={styles.responseText}>تم الرد</Text>
            </View>
          )}
        </View>
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
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>شكاواي</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Complaints List */}
      <FlatList
        data={complaints}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>لا توجد شكاوى</Text>
            <Text style={styles.emptySubtext}>لم ترسل أي شكوى بعد</Text>
          </View>
        }
      />

      {/* Complaint Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تفاصيل الشكوى</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedComplaint && (
              <View style={styles.modalBody}>
                <View style={styles.detailHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(selectedComplaint.status).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusConfig(selectedComplaint.status).color }]}>
                      {getStatusConfig(selectedComplaint.status).label}
                    </Text>
                  </View>
                  <Text style={styles.detailSubject}>{selectedComplaint.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>الشكوى:</Text>
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{selectedComplaint.message}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(selectedComplaint.created_at)}</Text>
                </View>

                {selectedComplaint.admin_response && selectedComplaint.admin_response.trim().length > 0 && (
                  <View style={styles.responseSection}>
                    <View style={styles.responseLabelContainer}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#22c55e" />
                      <Text style={styles.responseLabel}>رد الإدارة:</Text>
                    </View>
                    <View style={styles.responseBox}>
                      <Text style={styles.responseText}>{selectedComplaint.admin_response}</Text>
                    </View>
                    {selectedComplaint.updated_at && (
                      <Text style={styles.responseDateText}>{formatDate(selectedComplaint.updated_at)}</Text>
                    )}
                  </View>
                )}

                {!selectedComplaint.admin_response && (
                  <View style={styles.waitingSection}>
                    <Ionicons name="time-outline" size={24} color="#f59e0b" />
                    <Text style={styles.waitingText}>في انتظار الرد من الإدارة</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Cairo_400Regular',
  },
  listContent: {
    padding: SPACING.lg,
  },
  complaintCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  complaintSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Cairo_400Regular',
  },
  complaintMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    lineHeight: 20,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  complaintDate: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: 'Cairo_400Regular',
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
    fontFamily: 'Cairo_400Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'Cairo_400Regular',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    fontFamily: 'Cairo_400Regular',
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: 'Cairo_400Regular',
  },
  modalBody: {
    padding: SPACING.lg,
  },
  detailHeader: {
    marginBottom: SPACING.lg,
  },
  detailSubject: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginTop: SPACING.md,
  },
  detailSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  messageBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    lineHeight: 24,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
  responseSection: {
    backgroundColor: '#f0fdf4',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  responseLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    fontFamily: 'Cairo_400Regular',
  },
  responseBox: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  responseDateText: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
  waitingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  waitingText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
    fontFamily: 'Cairo_400Regular',
  },
});
