import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem } from '../types';
import { formatPrice } from '../utils/formatPrice';

interface Props {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export const MenuItemCard: React.FC<Props> = ({ item, quantity, onAdd, onRemove }) => {
  return (
    <View style={[styles.card, !item.is_available && styles.unavailable]}>
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="fast-food" size={30} color="#ccc" />
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.price}>{formatPrice(item.price)} ل.س</Text>
      </View>
      
      <View style={styles.actions}>
        {item.is_available ? (
          quantity > 0 ? (
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={onRemove}
              >
                <Ionicons name="remove" size={20} color="#FF6B35" />
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={onAdd}
              >
                <Ionicons name="add" size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={onAdd}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )
        ) : (
          <Text style={styles.unavailableText}>غير متوفر</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unavailable: {
    opacity: 0.6,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 6,
    textAlign: 'right',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    minWidth: 24,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 12,
    color: '#999',
  },
});
