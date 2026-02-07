import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

interface ImagePickerOptions {
  aspect?: [number, number];
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  compress?: number; // 0 to 1
}

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Pick and compress an image from the device gallery
 */
export async function pickAndCompressImage(
  options: ImagePickerOptions = {}
): Promise<CompressedImage | null> {
  const {
    aspect = [1, 1],
    quality = 0.8,
    maxWidth = 800,
    maxHeight = 800,
    compress = 0.7,
  } = options;

  try {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('تنبيه', 'يجب السماح بالوصول للصور لتتمكن من رفع صورة');
      return null;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const pickedImage = result.assets[0];
    
    // Compress and resize the image
    const manipulatedImage = await compressImage(pickedImage.uri, {
      maxWidth,
      maxHeight,
      compress,
    });

    return manipulatedImage;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('خطأ', 'فشل في اختيار الصورة');
    return null;
  }
}

/**
 * Compress an existing image
 */
export async function compressImage(
  uri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    compress?: number;
    format?: ImageManipulator.SaveFormat;
  } = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    compress = 0.7,
    format = ImageManipulator.SaveFormat.JPEG,
  } = options;

  try {
    // First, get the image dimensions
    const actions: ImageManipulator.Action[] = [];
    
    // Resize if needed
    actions.push({
      resize: {
        width: maxWidth,
        height: maxHeight,
      },
    });

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress,
        format,
        base64: true,
      }
    );

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      base64: manipulatedImage.base64 ? `data:image/jpeg;base64,${manipulatedImage.base64}` : undefined,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original if compression fails
    return { uri, width: 0, height: 0 };
  }
}

/**
 * Pick image for menu items (square aspect ratio)
 */
export async function pickMenuItemImage(): Promise<string | null> {
  const result = await pickAndCompressImage({
    aspect: [1, 1],
    maxWidth: 600,
    maxHeight: 600,
    compress: 0.5,
  });
  
  return result?.base64 || result?.uri || null;
}

/**
 * Pick image for restaurant cover (wide aspect ratio)
 */
export async function pickRestaurantImage(): Promise<string | null> {
  const result = await pickAndCompressImage({
    aspect: [16, 9],
    maxWidth: 1200,
    maxHeight: 675,
    compress: 0.5,
  });
  
  return result?.base64 || result?.uri || null;
}

/**
 * Get estimated file size from base64 string
 */
export function getBase64Size(base64: string): number {
  // Remove data URL prefix if exists
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  // Calculate approximate size in bytes
  const sizeInBytes = (base64Data.length * 3) / 4;
  return sizeInBytes;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
