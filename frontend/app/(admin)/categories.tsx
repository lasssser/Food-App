import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../src/constants/theme';

const ICONS = [
  'grid-outline', 'fast-food-outline', 'pizza-outline', 'flame-outline',
  'restaurant-outline', 'cafe-outline', 'ice-cream-outline', 'wine-outline',
  'beer-outline', 'fish-outline', 'nutrition-outline', 'leaf-outline',
];

interface Category {
  id: string;
  name: string;
  name_en: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('restaurant-outline');
  const [sortOrder, setSortOrder] = useState('99');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch {
      Alert.alert('خطأ', 'فشل تحميل الأصناف');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditingCat(null);
    setName(''); setNameEn(''); setIcon('restaurant-outline'); setSortOrder('99');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name); setNameEn(cat.name_en || ''); setIcon(cat.icon); setSortOrder(String(cat.sort_order));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'اسم الصنف مطلوب'); return; }
    setSaving(true);
    try {
      if (editingCat) {
        await api.put(`/admin/categories/${editingCat.id}`, {
          name: name.trim(), name_en: nameEn.trim(), icon, sort_order: parseInt(sortOrder) || 99,
        });
      } else {
        await api.post('/admin/categories', {
          name: name.trim(), name_en: nameEn.trim(), icon, sort_order: parseInt(sortOrder) || 99,
        });
      }
      setShowModal(false);
      fetchCategories();
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  const handleDelete = (cat: Category) => {
    if (cat.id === 'all') { Alert.alert('تنبيه', 'لا يمكن حذف صنف "الكل"'); return; }
    Alert.alert('تأكيد', `حذف صنف "${cat.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/admin/categories/${cat.id}`);
          fetchCategories();
        } catch { Alert.alert('خطأ', 'فشل الحذف'); }
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-forward" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إدارة الأصناف</Text>
        <TouchableOpacity onPress={openAdd} style={s.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCategories(); }} colors={[COLORS.primary]} />}
      >
        {categories.map((cat) => (
          <View key={cat.id} style={s.card}>
            <View style={s.cardLeft}>
              <View style={s.iconBox}>
                <Ionicons name={cat.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={s.catName}>{cat.name}</Text>
                {cat.name_en ? <Text style={s.catNameEn}>{cat.name_en}</Text> : null}
                <Text style={s.catOrder}>ترتيب: {cat.sort_order}</Text>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity onPress={() => openEdit(cat)} style={s.editBtn}>
                <Ionicons name="create-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              {cat.id !== 'all' && (
                <TouchableOpacity onPress={() => handleDelete(cat)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{editingCat ? 'تعديل صنف' : 'إضافة صنف جديد'}</Text>

            <Text style={s.label}>اسم الصنف (عربي) *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="مثال: حلويات" textAlign="right" />

            <Text style={s.label}>اسم الصنف (إنجليزي)</Text>
            <TextInput style={s.input} value={nameEn} onChangeText={setNameEn} placeholder="Example: Sweets" textAlign="left" />

            <Text style={s.label}>الترتيب</Text>
            <TextInput style={s.input} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" textAlign="center" />

            <Text style={s.label}>الأيقونة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[s.iconChoice, icon === ic && s.iconChoiceActive]}
                >
                  <Ionicons name={ic as any} size={24} color={icon === ic ? '#fff' : COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={s.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOWS.small },
  cardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: `${COLORS.primary}10`, justifyContent: 'center', alignItems: 'center' },
  catName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary, textAlign: 'right' },
  catNameEn: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: COLORS.textSecondary, textAlign: 'right' },
  catOrder: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: COLORS.textLight, textAlign: 'right' },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: COLORS.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, fontFamily: 'Cairo_400Regular', marginBottom: 14, borderWidth: 1, borderColor: '#eee' },
  iconChoice: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  iconChoiceActive: { backgroundColor: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: COLORS.textSecondary },
  saveBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#fff' },
});
