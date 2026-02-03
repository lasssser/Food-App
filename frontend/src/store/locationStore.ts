import { create } from 'zustand';

export interface District {
  id: string;
  name: string;
  name_en: string;
}

export interface City {
  id: string;
  name: string;
  name_en: string;
  districts: District[];
}

interface LocationState {
  cities: City[];
  selectedCity: City | null;
  selectedDistrict: District | null;
  lat: number | null;
  lng: number | null;
  isLocationSet: boolean;
  
  setCities: (cities: City[]) => void;
  setLocation: (city: City, district?: District, lat?: number, lng?: number) => void;
  clearLocation: () => void;
  getCityName: () => string;
  getDistrictName: () => string;
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  cities: [],
  selectedCity: null,
  selectedDistrict: null,
  lat: null,
  lng: null,
  isLocationSet: false,

  setCities: (cities: City[]) => {
    set({ cities });
  },

  setLocation: (city: City, district?: District, lat?: number, lng?: number) => {
    set({
      selectedCity: city,
      selectedDistrict: district || null,
      lat: lat || null,
      lng: lng || null,
      isLocationSet: true,
    });
  },

  clearLocation: () => {
    set({
      selectedCity: null,
      selectedDistrict: null,
      lat: null,
      lng: null,
      isLocationSet: false,
    });
  },

  getCityName: () => {
    const { selectedCity } = get();
    return selectedCity?.name || 'اختر المدينة';
  },

  getDistrictName: () => {
    const { selectedDistrict } = get();
    return selectedDistrict?.name || '';
  },
}));
