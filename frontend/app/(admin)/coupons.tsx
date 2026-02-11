import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { couponsAPI } from '../../src/services/api';

const DISCOUNT_TYPES = [
  { key: 'percentage', label: 'نسبة مئوية %', icon: 'trending-down' },
  { key: 'fixed', label: 'مبلغ ثابت', icon: 'cash-outline' },
  { key: 'free_delivery', label: 'توصيل مجاني', icon: 'bicycle-outline' },
];

export default function CouponsScreen() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_order: '', max_uses: '100', expires_days: '30' });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const data = await couponsAPI.getAll();
      setCoupons(data || []);
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { Alert.alert('تنبيه', 'أدخل كود الكوبون'); return; }
    setSaving(true);
    try {
      await couponsAPI.create({
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        min_order: Number(form.min_order) || 0,
        max_uses: Number(form.max_uses) || 100,
        expires_at: form.expires_days ? new Date(Date.now() + Number(form.expires_days) * 86400000).toISOString() : null,
      });
      setShowModal(false);
      setForm({ code: '', discount_type: 'percentage', discount_value: '', min_order: '', max_uses: '100', expires_days: '30' });
      fetchCoupons();
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.detail || 'فشل إنشاء الكوبون');
    } finally { setSaving(false); }
  };

  const handleToggle = async (coupon: any) => {
    try {
      await couponsAPI.update(coupon.id, { is_active: !coupon.is_active });
      fetchCoupons();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!confirm('حذف هذا الكوبون؟')) return;
    }
    try {
      await couponsAPI.delete(id);
      fetchCoupons();
    } catch {}
  };

  if (loading) return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn} data-testid="coupons-back-btn">
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>كوبونات الخصم</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={st.addBtn} data-testid="add-coupon-btn">
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {coupons.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="pricetag-outline" size={48} color="#ddd" />
            <Text style={st.emptyTxt}>لا توجد كوبونات</Text>
            <TouchableOpacity onPress={() => setShowModal(true)} style={st.emptyBtn}>
              <Text style={st.emptyBtnTxt}>إنشاء كوبون جديد</Text>
            </TouchableOpacity>
          </View>
        ) : coupons.map(c => (
          <View key={c.id} style={[st.card, !c.is_active && { opacity: 0.5 }]} data-testid={`coupon-card-${c.id}`}>
            <View style={st.cardTop}>
              <View style={st.cardCode}>
                <Text style={st.codeText}>{c.code}</Text>
                <View style={[st.typeBadge, { backgroundColor: c.discount_type === 'free_delivery' ? '#E3F2FD' : '#FFF3E0' }]}>
                  <Text style={[st.typeText, { color: c.discount_type === 'free_delivery' ? '#1565C0' : '#E65100' }]}>
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : c.discount_type === 'fixed' ? `${c.discount_value} ل.س` : 'توصيل مجاني'}
                  </Text>
                </View>
              </View>
              <View style={st.cardActions}>
                <TouchableOpacity onPress={() => handleToggle(c)} data-testid={`toggle-coupon-${c.id}`}>
                  <Ionicons name={c.is_active ? 'toggle' : 'toggle-outline'} size={28} color={c.is_active ? '#4CAF50' : '#999'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(c.id)} data-testid={`delete-coupon-${c.id}`}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={st.cardInfo}>
              <Text style={st.infoTxt}>الحد الأدنى: {c.min_order || 0} ل.س</Text>
              <Text style={st.infoTxt}>الاستخدام: {c.used_count}/{c.max_uses}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
              <Text style={st.modalTitle}>كوبون جديد</Text>
              <View style={{ width: 24 }} />
            </View>

            <TextInput style={st.input} placeholder="كود الكوبون (مثال: WELCOME50)" placeholderTextColor="#aaa" value={form.code} onChangeText={t => setForm({...form, code: t.toUpperCase()})} textAlign="right" autoCapitalize="characters" data-testid="coupon-code-input" />

            <Text style={st.label}>نوع الخصم</Text>
            <View style={st.typeRow}>
              {DISCOUNT_TYPES.map(dt => (
                <TouchableOpacity key={dt.key} style={[st.typeOption, form.discount_type === dt.key && st.typeOptionActive]} onPress={() => setForm({...form, discount_type: dt.key})} data-testid={`type-${dt.key}`}>
                  <Ionicons name={dt.icon as any} size={18} color={form.discount_type === dt.key ? '#6366f1' : '#999'} />
                  <Text style={[st.typeOptionTxt, form.discount_type === dt.key && { color: '#6366f1' }]}>{dt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.discount_type !== 'free_delivery' && (
              <TextInput style={st.input} placeholder={form.discount_type === 'percentage' ? 'قيمة الخصم (%)' : 'قيمة الخصم (ل.س)'} placeholderTextColor="#aaa" value={form.discount_value} onChangeText={t => setForm({...form, discount_value: t})} textAlign="right" keyboardType="numeric" data-testid="discount-value-input" />
            )}

            <TextInput style={st.input} placeholder="الحد الأدنى للطلب (ل.س)" placeholderTextColor="#aaa" value={form.min_order} onChangeText={t => setForm({...form, min_order: t})} textAlign="right" keyboardType="numeric" data-testid="min-order-input" />

            <TextInput style={st.input} placeholder="عدد مرات الاستخدام الأقصى" placeholderTextColor="#aaa" value={form.max_uses} onChangeText={t => setForm({...form, max_uses: t})} textAlign="right" keyboardType="numeric" data-testid="max-uses-input" />

            <TextInput style={st.input} placeholder="مدة الصلاحية بالأيام (مثال: 30)" placeholderTextColor="#aaa" value={form.expires_days} onChangeText={t => setForm({...form, expires_days: t})} textAlign="right" keyboardType="numeric" data-testid="expires-days-input" />

            <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving} data-testid="save-coupon-btn">
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={st.saveBtnGrad}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.saveBtnTxt}>إنشاء الكوبون</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: '#999' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 12, marginTop: 8 },
  emptyBtnTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...Platform.select({ default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  codeText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1f2937', letterSpacing: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
  cardActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardInfo: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoTxt: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1f2937' },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, textAlign: 'right' },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#6b7280', textAlign: 'right', marginBottom: 8 },
  typeRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  typeOption: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeOptionActive: { borderColor: '#6366f1', backgroundColor: '#EEF2FF' },
  typeOptionTxt: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#6b7280' },
  saveBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  saveBtnTxt: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#fff' },
});
