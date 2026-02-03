import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function DriverProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#FF6B35" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <Text style={styles.userRole}>سائق توصيل</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>سجل التوصيلات</Text>
              <Ionicons name="document-text-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الأرباح</Text>
              <Ionicons name="wallet-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>الإشعارات</Text>
              <Ionicons name="notifications-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color="#999" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>المساعدة</Text>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
          <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
        </TouchableOpacity>

        <Text style={styles.version}>يلا ناكل؟ - تطبيق السائق v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingBottom: 30,
  },
});
