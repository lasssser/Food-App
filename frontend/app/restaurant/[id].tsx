import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant, MenuItem } from '../../src/types';
import { restaurantAPI } from '../../src/services/api';
import { MenuItemCard } from '../../src/components/MenuItemCard';
import { CartButton } from '../../src/components/CartButton';
import { useCartStore } from '../../src/store/cartStore';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();
  const { items, addItem, removeItem, updateQuantity } = useCartStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [restaurantData, menuData] = await Promise.all([
          restaurantAPI.getById(id),
          restaurantAPI.getMenu(id),
        ]);
        setRestaurant(restaurantData);
        setMenuItems(menuData);
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((item) => item.category))];
    return cats;
  }, [menuItems]);

  const sections = useMemo(() => {
    const filteredItems = selectedCategory
      ? menuItems.filter((item) => item.category === selectedCategory)
      : menuItems;

    const grouped = filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    return Object.entries(grouped).map(([title, data]) => ({
      title,
      data,
    }));
  }, [menuItems, selectedCategory]);

  const getItemQuantity = (itemId: string) => {
    const cartItem = items.find((item) => item.menuItem.id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleAddItem = (menuItem: MenuItem) => {
    if (restaurant) {
      addItem(menuItem, restaurant);
    }
  };

  const handleRemoveItem = (menuItemId: string) => {
    const quantity = getItemQuantity(menuItemId);
    if (quantity > 1) {
      updateQuantity(menuItemId, quantity - 1);
    } else {
      removeItem(menuItemId);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>المطعم غير موجود</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.reviewCount}>({restaurant.review_count} تقييم)</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.infoText}>{restaurant.delivery_time}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="bicycle-outline" size={14} color="#666" />
              <Text style={styles.infoText}>توصيل: {restaurant.delivery_fee.toLocaleString()} ل.س</Text>
            </View>
          </View>
          <Text style={styles.minOrder}>
            الحد الأدنى للطلب: {restaurant.min_order.toLocaleString()} ل.س
          </Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === null && styles.categoryChipTextActive,
            ]}
          >
            الكل
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Items */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            quantity={getItemQuantity(item.id)}
            onAdd={() => handleAddItem(item)}
            onRemove={() => handleRemoveItem(item.id)}
          />
        )}
        contentContainerStyle={styles.menuContent}
        stickySectionHeadersEnabled
      />

      {/* Cart Button */}
      <CartButton onPress={() => router.push('/(main)/cart')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  backLink: {
    fontSize: 16,
    color: '#FF6B35',
  },
  header: {
    flexDirection: 'row-reverse',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewCount: {
    fontSize: 13,
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  minOrder: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  categoriesScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  menuContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 8,
    textAlign: 'right',
  },
});
