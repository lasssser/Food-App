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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
  customer: 'زبون',
  restaurant: 'مطعم',
  driver: 'سائق',
  moderator: 'مشرف',
  admin: 'مدير',
};

const ROLE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  restaurant: '#22c55e',
  driver: '#f59e0b',
  moderator: '#8b5cf6',
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('customer');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const role = selectedRole === 'all' ? undefined : selectedRole;
      const data = await adminAPI.getUsers(role, searchQuery || undefined);
      setUsers(data.users?.filter((u: User) => u.role !== 'admin') || []);
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
    setActionLoading(true);
    try {
      const newStatus = user.is_active === false ? true : false;
      await adminAPI.updateUserStatus(user.id, newStatus);
      if (Platform.OS === 'web') {
        alert(newStatus ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
      } else {
        Alert.alert('نجاح', newStatus ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
      }
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error('Error toggling user status:', error);
      if (Platform.OS === 'web') {
        alert('فشل في تحديث حالة المستخدم');
      } else {
        Alert.alert('خطأ', 'فشل في تحديث حالة المستخدم');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!editName.trim()) {
      if (Platform.OS === 'web') {
        alert('يرجى إدخال الاسم');
      } else {
        Alert.alert('خطأ', 'يرجى إدخال الاسم');
      }
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.updateUser(selectedUser.id, editName.trim(), editPhone.trim() || undefined);
      if (Platform.OS === 'web') {
        alert('تم تحديث بيانات المستخدم');
      } else {
        Alert.alert('نجاح', 'تم تحديث بيانات المستخدم');
      }
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      const errorMsg = error.response?.data?.detail || 'فشل في تحديث البيانات';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('خطأ', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      if (Platform.OS === 'web') {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      } else {
        Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.resetUserPassword(selectedUser.id, newPassword);
      if (Platform.OS === 'web') {
        alert('تم إعادة تعيين كلمة المرور');
      } else {
        Alert.alert('نجاح', 'تم إعادة تعيين كلمة المرور');
      }
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMsg = error.response?.data?.detail || 'فشل في إعادة تعيين كلمة المرور';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('خطأ', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteUser(selectedUser.id);
      if (Platform.OS === 'web') {
        alert('تم حذف الحساب بنجاح');
      } else {
        Alert.alert('نجاح', 'تم حذف الحساب بنجاح');
      }
      setShowDeleteModal(false);
      setShowUserModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMsg = error.response?.data?.detail || 'فشل في حذف الحساب';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('خطأ', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = () => {
    setShowUserModal(false);
    setShowDeleteModal(true);
  };

  const openRoleModal = (user: User) => {
    setNewUserRole(user.role || 'customer');
    setShowUserModal(false);
    setShowRoleModal(true);
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminAPI.changeUserRole(selectedUser.id, newUserRole);
      if (Platform.OS === 'web') {
        alert('تم تغيير دور المستخدم بنجاح');
      } else {
        Alert.alert('نجاح', 'تم تغيير دور المستخدم بنجاح');
      }
      setShowRoleModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      const errorMsg = error.response?.data?.detail || 'فشل في تغيير دور المستخدم';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('خطأ', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => ROLE_LABELS[role || 'customer'] || 'زبون';
  const getRoleColor = (role?: string) => ROLE_COLORS[role || 'customer'] || '#3b82f6';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY');
  };

  const openEditModal = (user: User) => {
    setEditName(user.name);
    setEditPhone(user.phone);
    setShowUserModal(false);
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setNewPassword('');
    setShowUserModal(false);
    setShowPasswordModal(true);
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
        {item.is_active === false && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>موقوف</Text>
          </View>
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

      {/* User Actions Modal */}
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
              <Text style={styles.modalTitle}>إدارة المستخدم</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.userProfileSection}>
                  <View style={[styles.modalAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Text style={styles.modalAvatarText}>{selectedUser.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) + '20', alignSelf: 'center' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(selectedUser.role) }]}>
                      {getRoleLabel(selectedUser.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                    <Text style={styles.infoLabel}>رقم الهاتف</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{formatDate(selectedUser.created_at)}</Text>
                    <Text style={styles.infoLabel}>تاريخ التسجيل</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={[styles.statusBadge, { backgroundColor: selectedUser.is_active !== false ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ color: selectedUser.is_active !== false ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: '600' }}>
                        {selectedUser.is_active !== false ? 'نشط' : 'موقوف'}
                      </Text>
                    </View>
                    <Text style={styles.infoLabel}>الحالة</Text>
                  </View>
                </View>

                <View style={styles.actionsSection}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#e0e7ff' }]}
                    onPress={() => openEditModal(selectedUser)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="create-outline" size={20} color="#6366f1" />
                    <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>تعديل البيانات</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]}
                    onPress={() => openPasswordModal(selectedUser)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="key-outline" size={20} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>إعادة تعيين كلمة المرور</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: selectedUser.is_active !== false ? '#fee2e2' : '#dcfce7' }]}
                    onPress={() => toggleUserStatus(selectedUser)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color={selectedUser.is_active !== false ? '#ef4444' : '#22c55e'} />
                    ) : (
                      <>
                        <Ionicons
                          name={selectedUser.is_active !== false ? 'ban' : 'checkmark-circle-outline'}
                          size={20}
                          color={selectedUser.is_active !== false ? '#ef4444' : '#22c55e'}
                        />
                        <Text style={[styles.actionBtnText, { color: selectedUser.is_active !== false ? '#ef4444' : '#22c55e' }]}>
                          {selectedUser.is_active !== false ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#dbeafe', borderColor: '#3b82f6', borderWidth: 1 }]}
                    onPress={() => openRoleModal(selectedUser)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="swap-horizontal" size={20} color="#3b82f6" />
                    <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>تغيير الدور</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}
                    onPress={openDeleteModal}
                    disabled={actionLoading}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>حذف الحساب نهائياً</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تعديل البيانات</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>الاسم</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="اسم المستخدم"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.inputLabel}>رقم الهاتف</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="رقم الهاتف"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEditUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>حفظ التغييرات</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إعادة تعيين كلمة المرور</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#f59e0b' }]}
                onPress={handleResetPassword}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>إعادة تعيين</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color="#ef4444" />
            </View>
            <Text style={styles.deleteModalTitle}>تأكيد الحذف</Text>
            <Text style={styles.deleteModalText}>
              هل أنت متأكد من حذف حساب "{selectedUser?.name}"؟
            </Text>
            <Text style={styles.deleteModalWarning}>
              هذا الإجراء لا يمكن التراجع عنه!
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelDeleteBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>نعم، احذف</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        visible={showRoleModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.roleModalContent}>
            <View style={styles.roleIconContainer}>
              <Ionicons name="people" size={40} color="#3b82f6" />
            </View>
            <Text style={styles.deleteModalTitle}>تغيير دور المستخدم</Text>
            <Text style={styles.deleteModalText}>
              اختر الدور الجديد لـ "{selectedUser?.name}"
            </Text>
            
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  newUserRole === 'customer' && styles.roleOptionSelected,
                ]}
                onPress={() => setNewUserRole('customer')}
              >
                <Ionicons 
                  name="person" 
                  size={24} 
                  color={newUserRole === 'customer' ? '#fff' : '#3b82f6'} 
                />
                <Text style={[
                  styles.roleOptionText,
                  newUserRole === 'customer' && styles.roleOptionTextSelected,
                ]}>زبون</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  newUserRole === 'restaurant' && styles.roleOptionSelected,
                  { backgroundColor: newUserRole === 'restaurant' ? '#22c55e' : '#dcfce7' }
                ]}
                onPress={() => setNewUserRole('restaurant')}
              >
                <Ionicons 
                  name="restaurant" 
                  size={24} 
                  color={newUserRole === 'restaurant' ? '#fff' : '#22c55e'} 
                />
                <Text style={[
                  styles.roleOptionText,
                  { color: newUserRole === 'restaurant' ? '#fff' : '#22c55e' },
                ]}>صاحب مطعم</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  newUserRole === 'driver' && styles.roleOptionSelected,
                  { backgroundColor: newUserRole === 'driver' ? '#f59e0b' : '#fef3c7' }
                ]}
                onPress={() => setNewUserRole('driver')}
              >
                <Ionicons 
                  name="bicycle" 
                  size={24} 
                  color={newUserRole === 'driver' ? '#fff' : '#f59e0b'} 
                />
                <Text style={[
                  styles.roleOptionText,
                  { color: newUserRole === 'driver' ? '#fff' : '#f59e0b' },
                ]}>سائق</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => setShowRoleModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelDeleteBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: '#3b82f6' }]}
                onPress={handleChangeRole}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>تغيير</Text>
                )}
              </TouchableOpacity>
            </View>
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
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
  },
  userDetails: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
  },
  userPhone: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
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
    fontFamily: 'Cairo_400Regular',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  inactiveText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontFamily: 'Cairo_400Regular',
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
    maxHeight: '85%',
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
    fontFamily: 'Cairo_400Regular',
  },
  modalBody: {
    padding: 20,
  },
  userProfileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Cairo_400Regular',
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
    marginBottom: 8,
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionsSection: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Cairo_400Regular',
  },
  formSection: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Cairo_400Regular',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Cairo_400Regular',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 15,
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalWarning: {
    fontSize: 13,
    color: '#ef4444',
    fontFamily: 'Cairo_400Regular',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelDeleteBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelDeleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'Cairo_400Regular',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Cairo_400Regular',
  },
  roleModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleOptions: {
    width: '100%',
    gap: 12,
    marginVertical: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    gap: 10,
  },
  roleOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    fontFamily: 'Cairo_400Regular',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
});
