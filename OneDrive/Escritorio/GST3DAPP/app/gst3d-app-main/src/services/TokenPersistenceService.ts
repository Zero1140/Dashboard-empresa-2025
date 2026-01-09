import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

interface StoredTokenData {
  token: string;
  timestamp: number;
  platform: string;
  customerId?: string;
  email?: string;
  registered?: boolean;
}

export class TokenPersistenceService {
  private static instance: TokenPersistenceService;
  private readonly TOKEN_KEY = '@gst3d_fcm_token';
  private readonly TOKEN_EXPIRY_HOURS = 24 * 7; // 7 días

  static getInstance(): TokenPersistenceService {
    if (!TokenPersistenceService.instance) {
      TokenPersistenceService.instance = new TokenPersistenceService();
    }
    return TokenPersistenceService.instance;
  }

  /**
   * Guarda el token FCM con metadatos
   */
  async saveToken(tokenData: StoredTokenData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      console.log('✅ Token FCM guardado en almacenamiento local');
    } catch (error) {
      console.error('❌ Error guardando token:', error);
      throw error;
    }
  }

  /**
   * Recupera el token FCM guardado
   */
  async getStoredToken(): Promise<StoredTokenData | null> {
    try {
      const stored = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (!stored) return null;

      const tokenData: StoredTokenData = JSON.parse(stored);
      
      // Verificar si el token ha expirado
      const now = Date.now();
      const expiryTime = tokenData.timestamp + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      if (now > expiryTime) {
        console.log('⚠️ Token FCM expirado, necesita renovación');
        await this.clearStoredToken();
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('❌ Error recuperando token:', error);
      return null;
    }
  }

  /**
   * Verifica si el token actual es válido y actualizado
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const currentToken = await messaging().getToken();
      const storedToken = await this.getStoredToken();
      
      if (!storedToken || !currentToken) {
        return false;
      }

      return storedToken.token === currentToken;
    } catch (error) {
      console.error('❌ Error verificando validez del token:', error);
      return false;
    }
  }

  /**
   * Renueva el token si es necesario
   */
  async renewTokenIfNeeded(): Promise<string | null> {
    try {
      const isValid = await this.isTokenValid();
      
      if (!isValid) {
        console.log('🔄 Renovando token FCM...');
        
        // Obtener nuevo token
        const newToken = await messaging().getToken();
        
        if (newToken) {
          // Guardar nuevo token
          const tokenData: StoredTokenData = {
            token: newToken,
            timestamp: Date.now(),
            platform: Platform.OS
          };
          
          await this.saveToken(tokenData);
          console.log('✅ Token FCM renovado exitosamente');
          
          return newToken;
        }
      }
      
      const stored = await this.getStoredToken();
      return stored?.token || null;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      return null;
    }
  }

  /**
   * Limpia el token guardado
   */
  async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      console.log('🗑️ Token FCM eliminado del almacenamiento local');
    } catch (error) {
      console.error('❌ Error eliminando token:', error);
    }
  }

  /**
   * Actualiza metadatos del token (customer info)
   */
  async updateTokenMetadata(customerId?: string, email?: string): Promise<void> {
    try {
      const stored = await this.getStoredToken();
      if (stored) {
        stored.customerId = customerId;
        stored.email = email;
        stored.timestamp = Date.now();
        
        await this.saveToken(stored);
        console.log('✅ Metadatos del token actualizados');
      }
    } catch (error) {
      console.error('❌ Error actualizando metadatos:', error);
    }
  }

  /**
   * Obtiene información del token para debugging
   */
  async getTokenInfo(): Promise<any> {
    try {
      const stored = await this.getStoredToken();
      const currentToken = await messaging().getToken();
      const isValid = await this.isTokenValid();
      
      return {
        stored: stored,
        current: currentToken,
        isValid: isValid,
        platform: Platform.OS,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error obteniendo información del token:', error);
      return null;
    }
  }
}

