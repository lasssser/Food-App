import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant } from '../types';

interface Props {
  restaurant: Restaurant;
  onPress: () => void;
}

export const RestaurantCard: React.FC<Props> = ({ restaurant, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {restaurant.image ? (
          <Image source={{ uri: restaurant.image }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="restaurant" size={40} color="#ccc" />
          </View>
        )}
        {!restaurant.is_open && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>مغلق</Text>
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.cuisine}>{restaurant.cuisine_type}</Text>
        
        <View style={styles.row}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({restaurant.review_count})</Text>
          </View>
          
          <View style={styles.deliveryInfo}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.deliveryTime}>{restaurant.delivery_time}</Text>
          </View>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.deliveryFee}>
            توصيل: {formatPrice(restaurant.delivery_fee)} ل.س
          </Text>
          <Text style={styles.minOrder}>
            الحد الأدنى: {formatPrice(restaurant.min_order)} ل.س
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140,
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
    backgroundColor: '#f0f0f0',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  cuisine: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
  },
  deliveryInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#666',
  },
  deliveryFee: {
    fontSize: 12,
    color: '#666',
  },
  minOrder: {
    fontSize: 12,
    color: '#999',
  },
});
