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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminSettings() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <View>
          <Text style={[styles.menuItemTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.menuIconContainer, danger && styles.dangerIcon]}>
          <Ionicons name={icon} size={22} color={danger ? '#ef4444' : '#6366f1'} />
        </View>
      </View>
    </TouchableOpacity>
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
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'م'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'مدير التطبيق'}</Text>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.adminBadgeText}>مدير النظام</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title="معلومات الحساب"
              subtitle={user?.phone}
              onPress={() => {}}
            />
            <MenuItem
              icon="key-outline"
              title="تغيير كلمة المرور"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات التطبيق</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="information-circle-outline"
              title="عن التطبيق"
              subtitle="يلا ناكل؟ - إصدار 1.0.0"
              onPress={() => {}}
            />
            <MenuItem
              icon="document-text-outline"
              title="سياسة الخصوصية"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
            <MenuItem
              icon="shield-outline"
              title="شروط الاستخدام"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              title="تسجيل الخروج"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>يلا ناكل؟ © 2025</Text>
          <Text style={styles.footerSubtext}>جميع الحقوق محفوظة</Text>
        </View>
      </ScrollView>
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
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'System',
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'System',
    textAlign: 'right',
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: '#fee2e2',
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    fontFamily: 'System',
    textAlign: 'right',
  },
  dangerText: {
    color: '#ef4444',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: 'System',
    textAlign: 'right',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'System',
    marginTop: 4,
  },
});
