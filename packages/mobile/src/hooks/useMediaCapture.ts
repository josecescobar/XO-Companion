import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface MediaAsset {
  uri: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  fileName: string;
  fileSize?: number;
}

function toMediaAsset(
  result: ImagePicker.ImagePickerAsset,
  fallbackType: 'photo' | 'video',
): MediaAsset {
  const isVideo = result.type === 'video' || result.uri.match(/\.(mov|mp4|avi)$/i);
  return {
    uri: result.uri,
    type: isVideo ? 'video' : fallbackType,
    width: result.width,
    height: result.height,
    fileName: result.fileName ?? result.uri.split('/').pop() ?? 'media',
    fileSize: result.fileSize ?? undefined,
  };
}

export function useMediaCapture() {
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (camera.status !== 'granted' || library.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are needed to attach media. Please enable them in Settings.',
      );
      return false;
    }
    return true;
  }, []);

  const takePhoto = useCallback(async (): Promise<MediaAsset | null> => {
    const granted = await requestPermissions();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled || !result.assets.length) return null;
    return toMediaAsset(result.assets[0], 'photo');
  }, [requestPermissions]);

  const recordVideo = useCallback(async (): Promise<MediaAsset | null> => {
    const granted = await requestPermissions();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 10,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets.length) return null;
    return toMediaAsset(result.assets[0], 'video');
  }, [requestPermissions]);

  const pickFromLibrary = useCallback(async (): Promise<MediaAsset | null> => {
    const granted = await requestPermissions();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled || !result.assets.length) return null;
    return toMediaAsset(result.assets[0], 'photo');
  }, [requestPermissions]);

  return { requestPermissions, takePhoto, recordVideo, pickFromLibrary };
}
