import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { restaurantPanelAPI } from '../../src/services/api';
import { MenuItem } from '../../src/types';

export default function RestaurantMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);

  const fetchMenu = async () => {
    try {
      const data = await restaurantPanelAPI.getMenu();
      setItems(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormCategory('');
    setFormAvailable(true);
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormPrice(item.price.toString());
    setFormCategory(item.category);
    setFormAvailable(item.is_available);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formPrice || !formCategory) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingItem) {
        await restaurantPanelAPI.updateMenuItem(editingItem.id, {
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          is_available: formAvailable,
        });
      } else {
        await restaurantPanelAPI.addMenuItem({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          category: formCategory,
        });
      }
      setShowModal(false);
      fetchMenu();
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل الحفظ');
    }
  };

  const handleDelete = (itemId: string) => {
    Alert.alert('تأكيد الحذف', 'هل تريد حذف هذا الصنف؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await restaurantPanelAPI.deleteMenuItem(itemId);
            fetchMenu();
          } catch (error: any) {
            Alert.alert('خطأ', error.response?.data?.detail || 'فشل الحذف');
          }
        },
      },
    ]);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await restaurantPanelAPI.updateMenuItem(item.id, {
        is_available: !item.is_available,
      });
      fetchMenu();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const sections = Object.entries(groupedItems).map(([title, data]) => ({
    title,
    data,
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#FF6B35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة القائمة</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((item) => (
              <View key={item.id} style={[styles.menuItem, !item.is_available && styles.unavailable]}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()} ل.س</Text>
                </View>
                
                <View style={styles.itemActions}>
                  <Switch
                    value={item.is_available}
                    onValueChange={() => handleToggleAvailability(item)}
                    trackColor={{ false: '#ccc', true: '#66BB6A' }}
                  />
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create" size={20} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash" size={20} color="#EF5350" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>لا توجد أصناف</Text>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Text style={styles.addButtonText}>إضافة صنف</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingItem ? 'تعديل صنف' : 'إضافة صنف'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>اسم الصنف *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="مثال: شاورما لحمة"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="وصف الصنف"
                multiline
                textAlign="right"
              />

              <Text style={styles.inputLabel}>السعر (ل.س) *</Text>
              <TextInput
                style={styles.input}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="8000"
                keyboardType="numeric"
                textAlign="right"
              />

              {!editingItem && (
                <>
                  <Text style={styles.inputLabel}>الفئة *</Text>
                  <TextInput
                    style={styles.input}
                    value={formCategory}
                    onChangeText={setFormCategory}
                    placeholder="مثال: شاورما"
                    textAlign="right"
                  />
                </>
              )}

              {editingItem && (
                <View style={styles.availabilityRow}>
                  <Switch
                    value={formAvailable}
                    onValueChange={setFormAvailable}
                    trackColor={{ false: '#ccc', true: '#66BB6A' }}
                  />
                  <Text style={styles.availabilityLabel}>متوفر</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  unavailable: {
    opacity: 0.6,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  addButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  availabilityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  availabilityLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
