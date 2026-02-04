import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../src/services/api';

type UserRole = 'all' | 'customer' | 'restaurant' | 'driver';

interface User {
  id: string;
  name: string;
  phone: string;
  role?: string;
  is_active?: boolean;
  is_online?: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  customer: 'عميل',
  restaurant: 'مطعم',
  driver: 'سائق',
  admin: 'مدير',
};

const ROLE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  restaurant: '#22c55e',
  driver: '#f59e0b',
  admin: '#6366f1',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const role = selectedRole === 'all' ? undefined : selectedRole;
      const data = await adminAPI.getUsers(role, searchQuery || undefined);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('خطأ', 'فشل في جلب قائمة المستخدمين');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [selectedRole, searchQuery]);

  const handleSearch = () => {
    setLoading(true);
    fetchUsers();
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const newStatus = !user.is_active;
      await adminAPI.updateUserStatus(user.id, newStatus);
      Alert.alert('نجاح', newStatus ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error('Error toggling user status:', error);
      Alert.alert('خطأ', 'فشل في تحديث حالة المستخدم');
    }
  };

  const getRoleLabel = (role?: string) => ROLE_LABELS[role || 'customer'] || 'عميل';
  const getRoleColor = (role?: string) => ROLE_COLORS[role || 'customer'] || '#3b82f6';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY');
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setShowUserModal(true);
      }}
    >
      <View style={styles.userInfo}>
        <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
      </View>
      <View style={styles.userMeta}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {getRoleLabel(item.role)}
          </Text>
        </View>
        {item.is_online !== undefined && (
          <View style={[styles.statusDot, { backgroundColor: item.is_online ? '#22c55e' : '#9ca3af' }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderRoleFilter = () => (
    <View style={styles.filterContainer}>
      {(['all', 'customer', 'restaurant', 'driver'] as UserRole[]).map((role) => (
        <TouchableOpacity
          key={role}
          style={[
            styles.filterButton,
            selectedRole === role && styles.filterButtonActive,
          ]}
          onPress={() => {
            setSelectedRole(role);
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.filterText,
              selectedRole === role && styles.filterTextActive,
            ]}
          >
            {role === 'all' ? 'الكل' : ROLE_LABELS[role]}
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
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <Text style={styles.headerSubtitle}>{users.length} مستخدم</Text>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالاسم أو الهاتف..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchUsers(); }}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Filter */}
      {renderRoleFilter()}

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>لا يوجد مستخدمين</Text>
            </View>
          }
        />
      )}

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تفاصيل المستخدم</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedUser && (
              <View style={styles.modalBody}>
                <View style={[styles.modalAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                  <Text style={styles.modalAvatarText}>{selectedUser.name.charAt(0)}</Text>
                </View>
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) + '20', alignSelf: 'center', marginBottom: 20 }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(selectedUser.role) }]}>
                    {getRoleLabel(selectedUser.role)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>{selectedUser.phone}</Text>
                  <Text style={styles.detailLabel}>رقم الهاتف</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>{formatDate(selectedUser.created_at)}</Text>
                  <Text style={styles.detailLabel}>تاريخ التسجيل</Text>
                </View>
                {selectedUser.is_active !== undefined && (
                  <View style={styles.detailRow}>
                    <View style={[styles.statusBadge, { backgroundColor: selectedUser.is_active ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ color: selectedUser.is_active ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: '600' }}>
                        {selectedUser.is_active ? 'نشط' : 'موقوف'}
                      </Text>
                    </View>
                    <Text style={styles.detailLabel}>الحالة</Text>
                  </View>
                )}

                {selectedUser.role !== 'admin' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: selectedUser.is_active !== false ? '#fee2e2' : '#dcfce7' }]}
                    onPress={() => toggleUserStatus(selectedUser)}
                  >
                    <Text style={[styles.actionButtonText, { color: selectedUser.is_active !== false ? '#ef4444' : '#22c55e' }]}>
                      {selectedUser.is_active !== false ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                    </Text>
                  </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
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
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  userDetails: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'System',
  },
  userPhone: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'System',
    marginTop: 2,
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
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
    paddingBottom: 40,
    maxHeight: '80%',
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
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'System',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
