import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { adminRoleRequestsAPI } from '../../src/services/api';

interface RoleRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  requested_role: string;
  status: string;
  full_name: string;
  phone: string;
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_area?: string;
  vehicle_type?: string;
  license_number?: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function RoleRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const statusFilter = filter === 'all' ? undefined : filter;
      const response = await adminRoleRequestsAPI.getAll(statusFilter);
      setRequests(response.requests);
      setPendingCount(response.pending_count);
    } catch (error) {
      console.error('Error fetching role requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleApprove = async (requestId: string) => {
    Alert.alert(
      'تأكيد الموافقة',
      'هل أنت متأكد من الموافقة على هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'موافقة',
          onPress: async () => {
            setProcessing(true);
            try {
              await adminRoleRequestsAPI.approve(requestId);
              Alert.alert('تم', 'تمت الموافقة على الطلب بنجاح');
              setShowDetailsModal(false);
              fetchRequests();
            } catch (error: any) {
              Alert.alert('خطأ', error.response?.data?.detail || 'فشل في الموافقة على الطلب');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل أنت متأكد من رفض هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await adminRoleRequestsAPI.reject(requestId);
              Alert.alert('تم', 'تم رفض الطلب');
              setShowDetailsModal(false);
              fetchRequests();
            } catch (error: any) {
              Alert.alert('خطأ', error.response?.data?.detail || 'فشل في رفض الطلب');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleIcon = (role: string) => {
    return role === 'driver' ? 'car' : 'restaurant';
  };

  const getRoleColor = (role: string) => {
    return role === 'driver' ? COLORS.info : COLORS.success;
  };

  const getRoleName = (role: string) => {
    return role === 'driver' ? 'سائق' : 'صاحب مطعم';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; text: string; bg: string }> = {
      pending: { color: COLORS.warning, text: 'قيد المراجعة', bg: `${COLORS.warning}15` },
      approved: { color: COLORS.success, text: 'تمت الموافقة', bg: `${COLORS.success}15` },
      rejected: { color: COLORS.error, text: 'مرفوض', bg: `${COLORS.error}15` },
    };
    return config[status] || config.pending;
  };

  const renderRequestCard = (request: RoleRequest) => {
    const statusBadge = getStatusBadge(request.status);
    const roleColor = getRoleColor(request.requested_role);

    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => {
          setSelectedRequest(request);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>
          <View style={[styles.roleIcon, { backgroundColor: `${roleColor}15` }]}>
            <Ionicons name={getRoleIcon(request.requested_role)} size={24} color={roleColor} />
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.userName}>{request.full_name}</Text>
          <Text style={styles.userPhone}>{request.phone}</Text>
          <View style={styles.roleTag}>
            <Text style={[styles.roleTagText, { color: roleColor }]}>
              يريد التقدم كـ {getRoleName(request.requested_role)}
            </Text>
          </View>
          {request.requested_role === 'restaurant' && request.restaurant_name && (
            <Text style={styles.restaurantName}>المطعم: {request.restaurant_name}</Text>
          )}
          {request.requested_role === 'driver' && request.vehicle_type && (
            <Text style={styles.vehicleType}>المركبة: {request.vehicle_type}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
          <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>طلبات تغيير الدور</Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'pending', label: 'قيد المراجعة' },
          { key: 'approved', label: 'مقبولة' },
          { key: 'rejected', label: 'مرفوضة' },
          { key: 'all', label: 'الكل' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color={COLORS.textLight} />
              <Text style={styles.emptyText}>لا توجد طلبات</Text>
            </View>
          ) : (
            requests.map(renderRequestCard)
          )}
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDetailsModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedRequest && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
              {/* Request Info Header */}
              <View style={styles.detailsHeader}>
                <View
                  style={[
                    styles.detailsHeaderIcon,
                    { backgroundColor: `${getRoleColor(selectedRequest.requested_role)}15` },
                  ]}
                >
                  <Ionicons
                    name={getRoleIcon(selectedRequest.requested_role)}
                    size={40}
                    color={getRoleColor(selectedRequest.requested_role)}
                  />
                </View>
                <Text style={styles.detailsHeaderTitle}>
                  طلب التقدم كـ {getRoleName(selectedRequest.requested_role)}
                </Text>
                <View
                  style={[
                    styles.statusBadgeLarge,
                    { backgroundColor: getStatusBadge(selectedRequest.status).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTextLarge,
                      { color: getStatusBadge(selectedRequest.status).color },
                    ]}
                  >
                    {getStatusBadge(selectedRequest.status).text}
                  </Text>
                </View>
              </View>

              {/* User Info */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>معلومات مقدم الطلب</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsValue}>{selectedRequest.full_name}</Text>
                  <Text style={styles.detailsLabel}>الاسم الكامل</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsValue}>{selectedRequest.phone}</Text>
                  <Text style={styles.detailsLabel}>رقم الهاتف</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsValue}>{selectedRequest.user_name}</Text>
                  <Text style={styles.detailsLabel}>اسم المستخدم</Text>
                </View>
              </View>

              {/* Restaurant Info */}
              {selectedRequest.requested_role === 'restaurant' && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>معلومات المطعم</Text>
                  {selectedRequest.restaurant_name && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsValue}>{selectedRequest.restaurant_name}</Text>
                      <Text style={styles.detailsLabel}>اسم المطعم</Text>
                    </View>
                  )}
                  {selectedRequest.restaurant_address && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsValue}>{selectedRequest.restaurant_address}</Text>
                      <Text style={styles.detailsLabel}>العنوان</Text>
                    </View>
                  )}
                  {selectedRequest.restaurant_area && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsValue}>{selectedRequest.restaurant_area}</Text>
                      <Text style={styles.detailsLabel}>المنطقة</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Driver Info */}
              {selectedRequest.requested_role === 'driver' && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>معلومات السائق</Text>
                  {selectedRequest.vehicle_type && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsValue}>{selectedRequest.vehicle_type}</Text>
                      <Text style={styles.detailsLabel}>نوع المركبة</Text>
                    </View>
                  )}
                  {selectedRequest.license_number && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsValue}>{selectedRequest.license_number}</Text>
                      <Text style={styles.detailsLabel}>رقم الرخصة</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>ملاحظات مقدم الطلب</Text>
                  <Text style={styles.notesText}>{selectedRequest.notes}</Text>
                </View>
              )}

              {/* Dates */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>التواريخ</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsValue}>{formatDate(selectedRequest.created_at)}</Text>
                  <Text style={styles.detailsLabel}>تاريخ الطلب</Text>
                </View>
                {selectedRequest.status !== 'pending' && (
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsValue}>{formatDate(selectedRequest.updated_at)}</Text>
                    <Text style={styles.detailsLabel}>تاريخ المعالجة</Text>
                  </View>
                )}
              </View>

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>ملاحظات الإدارة</Text>
                  <Text style={styles.notesText}>{selectedRequest.admin_notes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(selectedRequest.id)}
                    disabled={processing}
                    activeOpacity={0.7}
                  >
                    {processing ? (
                      <ActivityIndicator color={COLORS.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        <Text style={styles.rejectButtonText}>رفض</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(selectedRequest.id)}
                    disabled={processing}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[COLORS.success, '#2E7D32']}
                      style={styles.approveButtonGradient}
                    >
                      {processing ? (
                        <ActivityIndicator color={COLORS.textWhite} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.textWhite} />
                          <Text style={styles.approveButtonText}>موافقة</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  pendingBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  filterTabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
  },
  cardContent: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  userPhone: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleTag: {
    marginTop: SPACING.sm,
  },
  roleTagText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
  },
  restaurantName: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  vehicleType: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
  },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  detailsHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  detailsHeaderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailsHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Cairo_700Bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statusBadgeLarge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  statusTextLarge: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  detailsLabel: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  detailsValue: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    textAlign: 'right',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: `${COLORS.error}15`,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.error,
  },
  approveButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  approveButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
    color: COLORS.textWhite,
  },
});
