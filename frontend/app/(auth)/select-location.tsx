import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { locationAPI } from '../../src/services/api';
import { useLocationStore, City, District } from '../../src/store/locationStore';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

export default function SelectLocationScreen() {
  const router = useRouter();
  const { cities, setCities, setLocation, selectedCity } = useLocationStore();
  const [loading, setLoading] = useState(true);
  const [selectedCityLocal, setSelectedCityLocal] = useState<City | null>(null);
  const [selectedDistrictLocal, setSelectedDistrictLocal] = useState<District | null>(null);
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const data = await locationAPI.getCities();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (city: City) => {
    setSelectedCityLocal(city);
    setSelectedDistrictLocal(null);
    setShowDistrictModal(true);
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrictLocal(district);
    setShowDistrictModal(false);
  };

  const handleConfirm = () => {
    if (selectedCityLocal) {
      setLocation(selectedCityLocal, selectedDistrictLocal || undefined);
      router.replace('/(main)/home');
    }
  };

  const handleSkipDistrict = () => {
    setShowDistrictModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل المدن...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <Ionicons name="location" size={50} color={COLORS.textWhite} />
            <Text style={styles.headerTitle}>اختر موقعك</Text>
            <Text style={styles.headerSubtitle}>
              اختر مدينتك لنعرض لك المطاعم القريبة منك
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>المدن المتاحة</Text>
        
        <ScrollView 
          style={styles.citiesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.citiesContent}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={[
                styles.cityCard,
                selectedCityLocal?.id === city.id && styles.cityCardSelected,
              ]}
              onPress={() => handleCitySelect(city)}
              activeOpacity={0.7}
            >
              <View style={styles.cityInfo}>
                <Text style={[
                  styles.cityName,
                  selectedCityLocal?.id === city.id && styles.cityNameSelected,
                ]}>
                  {city.name}
                </Text>
                <Text style={styles.cityNameEn}>{city.name_en}</Text>
              </View>
              
              {selectedCityLocal?.id === city.id ? (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={20} color={COLORS.textWhite} />
                </View>
              ) : (
                <Ionicons name="chevron-back" size={24} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Location Display */}
        {selectedCityLocal && (
          <View style={styles.selectedLocation}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <Text style={styles.selectedLocationText}>
              {selectedCityLocal.name}
              {selectedDistrictLocal && ` - ${selectedDistrictLocal.name}`}
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedCityLocal && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedCityLocal}
        >
          <LinearGradient
            colors={selectedCityLocal ? [COLORS.primary, COLORS.primaryDark] : [COLORS.textLight, COLORS.textLight]}
            style={styles.confirmButtonGradient}
          >
            <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
            <Ionicons name="arrow-back" size={20} color={COLORS.textWhite} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* District Selection Modal */}
      <Modal
        visible={showDistrictModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>اختر المنطقة</Text>
              <TouchableOpacity onPress={handleSkipDistrict}>
                <Text style={styles.skipText}>تخطي</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.districtsList}>
              {selectedCityLocal?.districts.map((district) => (
                <TouchableOpacity
                  key={district.id}
                  style={[
                    styles.districtItem,
                    selectedDistrictLocal?.id === district.id && styles.districtItemSelected,
                  ]}
                  onPress={() => handleDistrictSelect(district)}
                >
                  <Text style={[
                    styles.districtName,
                    selectedDistrictLocal?.id === district.id && styles.districtNameSelected,
                  ]}>
                    {district.name}
                  </Text>
                  {selectedDistrictLocal?.id === district.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.xl,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginTop: SPACING.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    marginTop: -SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },
  citiesList: {
    flex: 1,
  },
  citiesContent: {
    paddingBottom: SPACING.lg,
  },
  cityCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cityCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  cityInfo: {
    alignItems: 'flex-end',
  },
  cityName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cityNameSelected: {
    color: COLORS.primary,
  },
  cityNameEn: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedLocation: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  selectedLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textWhite,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  districtsList: {
    padding: SPACING.lg,
  },
  districtItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  districtItemSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  districtName: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  districtNameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
