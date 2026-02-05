import React, { useEffect, useState, useCallback } from 'react';
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
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantPanelAPI } from '../../src/services/api';
import { MenuItem, AddOnGroup } from '../../src/types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

interface AddOnOption {
  name: string;
  price: number;
}

export default function AddOnsManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddOnGroup | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const [formMaxSelections, setFormMaxSelections] = useState('1');
  const [formOptions, setFormOptions] = useState<AddOnOption[]>([{ name: '', price: 0 }]);

  const fetchMenu = async () => {
    try {
      const data = await restaurantPanelAPI.getMenu();
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAddOns = async (itemId: string) => {
    try {
      setLoadingAddOns(true);
      const data = await restaurantPanelAPI.getMenuItemAddOns(itemId);
      setAddOnGroups(data || []);
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      setAddOnGroups([]);
    } finally {
      setLoadingAddOns(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [])
  );

  useEffect(() => {
    if (selectedItem) {
      fetchAddOns(selectedItem.id);
    }
  }, [selectedItem]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
    if (selectedItem) {
      fetchAddOns(selectedItem.id);
    }
  };

  const openAddModal = () => {
    setEditingGroup(null);
    setFormName('');
    setFormRequired(false);
    setFormMaxSelections('1');
    setFormOptions([{ name: '', price: 0 }]);
    setShowModal(true);
  };

  const openEditModal = (group: AddOnGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormRequired(group.is_required);
    setFormMaxSelections(group.max_selections.toString());
    setFormOptions(group.options.map(o => ({ name: o.name, price: o.price })));
    setShowModal(true);
  };

  const addOption = () => {
    setFormOptions([...formOptions, { name: '', price: 0 }]);
  };

  const removeOption = (index: number) => {
    if (formOptions.length > 1) {
      setFormOptions(formOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: 'name' | 'price', value: string) => {
    const updated = [...formOptions];
    if (field === 'price') {
      updated[index].price = parseFloat(value) || 0;
    } else {
      updated[index].name = value;
    }
    setFormOptions(updated);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      return;
    }

    const validOptions = formOptions.filter(o => o.name.trim());
    if (validOptions.length === 0) {
      return;
    }

    try {
      const data = {
        name: formName,
        is_required: formRequired,
        max_selections: parseInt(formMaxSelections) || 1,
        options: validOptions,
      };

      if (editingGroup) {
        await restaurantPanelAPI.updateAddOnGroup(editingGroup.id, data);
      } else if (selectedItem) {
        await restaurantPanelAPI.createAddOnGroup(selectedItem.id, data);
      }

      setShowModal(false);
      if (selectedItem) {
        fetchAddOns(selectedItem.id);
      }
    } catch (error: any) {
      console.error('Error saving add-on group:', error);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    
    try {
      await restaurantPanelAPI.deleteAddOnGroup(groupToDelete);
      if (selectedItem) {
        fetchAddOns(selectedItem.id);
      }
    } catch (error) {
      console.error('Error deleting add-on group:', error);
    } finally {
      setConfirmDeleteVisible(false);
      setGroupToDelete(null);
    }
  };

  const confirmDelete = (groupId: string) => {
    setGroupToDelete(groupId);
    setConfirmDeleteVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>إدارة الإضافات</Text>
        <Text style={styles.headerSubtitle}>أضف إضافات لأصناف القائمة</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Menu Items Selector */}
        <Text style={styles.sectionLabel}>اختر صنف:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.itemsScroll}
          contentContainerStyle={styles.itemsScrollContent}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemChip,
                selectedItem?.id === item.id && styles.itemChipActive,
              ]}
              onPress={() => setSelectedItem(item)}
            >
              <Text
                style={[
                  styles.itemChipText,
                  selectedItem?.id === item.id && styles.itemChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add-ons Section */}
        {selectedItem ? (
          <View style={styles.addOnsSection}>
            <View style={styles.addOnsHeader}>
              <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                <Ionicons name="add" size={20} color={COLORS.textWhite} />
                <Text style={styles.addButtonText}>إضافة مجموعة</Text>
              </TouchableOpacity>
              <Text style={styles.addOnsTitle}>
                إضافات: {selectedItem.name}
              </Text>
            </View>

            {loadingAddOns ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : addOnGroups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="options-outline" size={50} color={COLORS.textLight} />
                <Text style={styles.emptyText}>لا توجد إضافات لهذا الصنف</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                  <Text style={styles.emptyButtonText}>إضافة مجموعة إضافات</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={addOnGroups}
                keyExtractor={(item) => item.id}
                renderItem={({ item: group }) => (
                  <View style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupActions}>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => openEditModal(group)}
                        >
                          <Ionicons name="create-outline" size={20} color={COLORS.info} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => confirmDelete(group.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <View style={styles.groupMeta}>
                          {group.is_required && (
                            <View style={styles.requiredBadge}>
                              <Text style={styles.requiredText}>مطلوب</Text>
                            </View>
                          )}
                          <Text style={styles.maxText}>
                            اختر حتى {group.max_selections}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.optionsList}>
                      {group.options.map((option, index) => (
                        <View key={index} style={styles.optionItem}>
                          <Text style={styles.optionPrice}>
                            {option.price > 0 ? `+${option.price.toLocaleString()} ل.س` : 'مجاني'}
                          </Text>
                          <Text style={styles.optionName}>{option.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.groupsList}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
              />
            )}
          </View>
        ) : (
          <View style={styles.selectPrompt}>
            <Ionicons name="restaurant-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.selectPromptText}>اختر صنف لإدارة إضافاته</Text>
          </View>
        )}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingGroup ? 'تعديل مجموعة الإضافات' : 'إضافة مجموعة إضافات'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>اسم المجموعة *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="مثال: الصلصات"
                textAlign="right"
              />

              <View style={styles.switchRow}>
                <Switch
                  value={formRequired}
                  onValueChange={setFormRequired}
                  trackColor={{ false: COLORS.border, true: COLORS.success }}
                  thumbColor={COLORS.textWhite}
                />
                <Text style={styles.switchLabel}>مجموعة إجبارية</Text>
              </View>

              <Text style={styles.inputLabel}>الحد الأقصى للاختيارات</Text>
              <TextInput
                style={styles.input}
                value={formMaxSelections}
                onChangeText={setFormMaxSelections}
                placeholder="1"
                keyboardType="numeric"
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الخيارات *</Text>
              {formOptions.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <TouchableOpacity
                    style={styles.removeOptionButton}
                    onPress={() => removeOption(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={option.price > 0 ? option.price.toString() : ''}
                    onChangeText={(val) => updateOption(index, 'price', val)}
                    placeholder="السعر"
                    keyboardType="numeric"
                    textAlign="right"
                  />
                  <TextInput
                    style={[styles.input, styles.nameInput]}
                    value={option.name}
                    onChangeText={(val) => updateOption(index, 'name', val)}
                    placeholder="اسم الخيار"
                    textAlign="right"
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addOptionText}>إضافة خيار</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>حفظ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmDeleteVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons name="warning-outline" size={50} color={COLORS.warning} />
            <Text style={styles.confirmTitle}>تأكيد الحذف</Text>
            <Text style={styles.confirmMessage}>هل تريد حذف هذه المجموعة؟</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>حذف</Text>
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  itemsScroll: {
    maxHeight: 50,
    marginBottom: SPACING.lg,
  },
  itemsScrollContent: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  itemChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  itemChipText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  itemChipTextActive: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  addOnsSection: {
    flex: 1,
  },
  addOnsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addOnsTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  addButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xxxl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  emptyButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  selectPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPromptText: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  groupsList: {
    paddingBottom: SPACING.xxl,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  groupHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  groupInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  groupMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  requiredBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  requiredText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  maxText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
  },
  groupActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  optionsList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  optionItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  optionName: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.success,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
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
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalForm: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textPrimary,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  nameInput: {
    flex: 2,
    marginBottom: 0,
  },
  priceInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeOptionButton: {
    padding: 4,
  },
  addOptionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  addOptionText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButton: {
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
  },
  
  // Confirm Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  confirmContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Cairo_400Regular',
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  confirmMessage: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
});
