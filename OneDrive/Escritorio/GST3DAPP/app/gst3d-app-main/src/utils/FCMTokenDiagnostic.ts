/**
 * Utilidades para diagnóstico de tokens FCM
 */
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Permisos de notificaciones',
          message: 'Esta app necesita permisos para enviar notificaciones',
          buttonPositive: 'OK',
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }
  
  return true;
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error obteniendo token FCM:', error);
    return null;
  }
}

export async function storeFCMToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('fcm_token', token);
    console.log('✅ Token FCM guardado en AsyncStorage');
  } catch (error) {
    console.error('❌ Error guardando token FCM:', error);
  }
}

export async function getStoredFCMToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('fcm_token');
    return token;
  } catch (error) {
    console.error('❌ Error obteniendo token FCM almacenado:', error);
    return null;
  }
}

export async function diagnoseFCMToken(): Promise<any> {
  const diagnosis = {
    platform: Platform.OS,
    permissionsGranted: false,
    tokenAvailable: false,
    token: null,
    storedToken: null,
    error: null
  };

  try {
    // Verificar permisos
    diagnosis.permissionsGranted = await requestPermissions();
    
    // Obtener token
    diagnosis.token = await getFCMToken();
    diagnosis.tokenAvailable = !!diagnosis.token;
    
    // Obtener token almacenado
    diagnosis.storedToken = await getStoredFCMToken();
    
    console.log('🔍 Diagnóstico FCM:', diagnosis);
    return diagnosis;
  } catch (error) {
    diagnosis.error = error.message;
    console.error('❌ Error en diagnóstico FCM:', error);
    return diagnosis;
  }
}









