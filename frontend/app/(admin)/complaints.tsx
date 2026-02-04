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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../src/services/api';

type ComplaintStatus = 'all' | 'pending' | 'in_progress' | 'resolved';

interface Complaint {
  id: string;
  user_id: string;
  user_name?: string;
  order_id?: string;
  subject: string;
  description: string;
  status: string;
  admin_response?: string;
  created_at: string;
  resolved_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fef3c7' },
  in_progress: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#dbeafe' },
  resolved: { label: 'تم الحل', color: '#22c55e', bg: '#dcfce7' },
};

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);

  const fetchComplaints = async () => {
    try {
      const status = selectedStatus === 'all' ? undefined : selectedStatus;
      const data = await adminAPI.getComplaints(status);
      setComplaints(data.complaints || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [selectedStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComplaints();
  }, [selectedStatus]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY') + ' ' + date.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  };

  const handleRespond = async (newStatus: string) => {
    if (!selectedComplaint) return;
    if (!responseText.trim() && newStatus === 'resolved') {
      Alert.alert('خطأ', 'يرجى كتابة رد قبل إغلاق الشكوى');
      return;
    }

    setResponding(true);
    try {
      await adminAPI.respondToComplaint(selectedComplaint.id, responseText, newStatus);
      Alert.alert('نجاح', 'تم تحديث الشكوى بنجاح');
      setShowModal(false);
      setResponseText('');
      fetchComplaints();
    } catch (error) {
      console.error('Error responding to complaint:', error);
      Alert.alert('خطأ', 'فشل في تحديث الشكوى');
    } finally {
      setResponding(false);
    }
  };

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const statusConfig = getStatusConfig(item.status);
    return (
      <TouchableOpacity
        style={styles.complaintCard}
        onPress={() => {
          setSelectedComplaint(item);
          setResponseText(item.admin_response || '');
          setShowModal(true);
        }}
      >
        <View style={styles.complaintHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.complaintSubject} numberOfLines={1}>{item.subject}</Text>
        </View>

        <Text style={styles.complaintDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.complaintFooter}>
          <Text style={styles.complaintDate}>{formatDate(item.created_at)}</Text>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user_name || 'مستخدم'}</Text>
            <Ionicons name="person" size={14} color="#6b7280" />
          </View>
        </View>

        {item.order_id && (
          <View style={styles.orderTag}>
            <Text style={styles.orderTagText}>طلب #{item.order_id.slice(-6)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      {(['all', 'pending', 'in_progress', 'resolved'] as ComplaintStatus[]).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            selectedStatus === status && styles.filterButtonActive,
          ]}
          onPress={() => {
            setSelectedStatus(status);
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.filterText,
              selectedStatus === status && styles.filterTextActive,
            ]}
          >
            {status === 'all' ? 'الكل' : (STATUS_CONFIG[status]?.label || status)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>إدارة الشكاوى</Text>
        <Text style={styles.headerSubtitle}>{complaints.length} شكوى</Text>
      </LinearGradient>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Complaints List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={complaints}
          renderItem={renderComplaint}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>لا يوجد شكاوى</Text>
            </View>
          }
        />
      )}

      {/* Complaint Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تفاصيل الشكوى</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedComplaint && (
              <FlatList
                data={[selectedComplaint]}
                renderItem={() => (
                  <View style={styles.modalBody}>
                    <View style={styles.complaintDetailHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(selectedComplaint.status).bg }]}>
                        <Text style={[styles.statusText, { color: getStatusConfig(selectedComplaint.status).color }]}>
                          {getStatusConfig(selectedComplaint.status).label}
                        </Text>
                      </View>
                      <Text style={styles.modalSubject}>{selectedComplaint.subject}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{selectedComplaint.user_name || 'مستخدم'}</Text>
                        <Text style={styles.detailLabel}>المستخدم</Text>
                      </View>
                      {selectedComplaint.order_id && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailValue}>#{selectedComplaint.order_id.slice(-6)}</Text>
                          <Text style={styles.detailLabel}>رقم الطلب</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>{formatDate(selectedComplaint.created_at)}</Text>
                        <Text style={styles.detailLabel}>التاريخ</Text>
                      </View>
                    </View>

                    <View style={styles.descriptionSection}>
                      <Text style={styles.descriptionLabel}>وصف الشكوى:</Text>
                      <Text style={styles.descriptionText}>{selectedComplaint.description}</Text>
                    </View>

                    {selectedComplaint.status !== 'resolved' && (
                      <View style={styles.responseSection}>
                        <Text style={styles.responseLabel}>الرد على الشكوى:</Text>
                        <TextInput
                          style={styles.responseInput}
                          placeholder="اكتب ردك هنا..."
                          placeholderTextColor="#9ca3af"
                          value={responseText}
                          onChangeText={setResponseText}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />

                        <View style={styles.actionButtons}>
                          {selectedComplaint.status === 'pending' && (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#dbeafe' }]}
                              onPress={() => handleRespond('in_progress')}
                              disabled={responding}
                            >
                              {responding ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                              ) : (
                                <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>بدء المعالجة</Text>
                              )}
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#dcfce7', flex: 1 }]}
                            onPress={() => handleRespond('resolved')}
                            disabled={responding}
                          >
                            {responding ? (
                              <ActivityIndicator size="small" color="#22c55e" />
                            ) : (
                              <Text style={[styles.actionButtonText, { color: '#22c55e' }]}>تم الحل</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {selectedComplaint.admin_response && selectedComplaint.status === 'resolved' && (
                      <View style={styles.previousResponseSection}>
                        <Text style={styles.previousResponseLabel}>رد المدير:</Text>
                        <Text style={styles.previousResponseText}>{selectedComplaint.admin_response}</Text>
                      </View>
                    )}
                  </View>
                )}
                keyExtractor={() => 'complaint'}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  complaintCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  complaintDescription: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
    textAlign: 'right',
    lineHeight: 20,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  complaintDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'System',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    marginRight: 6,
  },
  orderTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderTagText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
    fontFamily: 'System',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontFamily: 'System',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
  },
  modalBody: {
    padding: 20,
  },
  complaintDetailHeader: {
    marginBottom: 20,
  },
  modalSubject: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: 12,
  },
  detailSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: 'System',
    textAlign: 'right',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  responseSection: {
    marginBottom: 20,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 8,
  },
  responseInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  previousResponseSection: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  previousResponseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 8,
  },
  previousResponseText: {
    fontSize: 14,
    color: '#166534',
    fontFamily: 'System',
    textAlign: 'right',
    lineHeight: 22,
  },
});
