/**
 * Servicio para reintentar registro de tokens FCM pendientes
 * Garantiza que los tokens siempre se registren en el servidor
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { API_CONFIG, getApiHeaders } from '../config/constants';

class TokenRetryService {
  private static instance: TokenRetryService;
  private retryInterval: NodeJS.Timeout | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private readonly maxRetries = 5;
  private readonly baseDelay = 5000; // 5 segundos
  private readonly TOKEN_KEY = 'fcm_token';
  private readonly REGISTERED_KEY = 'fcm_token_registered';
  private readonly RETRY_COUNT_KEY = 'fcm_token_retry_count';
  private readonly TIMESTAMP_KEY = 'fcm_token_timestamp';

  static getInstance(): TokenRetryService {
    if (!TokenRetryService.instance) {
      TokenRetryService.instance = new TokenRetryService();
    }
    return TokenRetryService.instance;
  }

  /**
   * Reintenta el registro de un token pendiente
   */
  async retryPendingToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      const registered = await AsyncStorage.getItem(this.REGISTERED_KEY);
      const retryCountStr = await AsyncStorage.getItem(this.RETRY_COUNT_KEY);
      const retryCount = retryCountStr ? parseInt(retryCountStr, 10) : 0;

      // No hay token o ya está registrado
      if (!token || registered === 'true') {
        return;
      }

      // Máximo de reintentos alcanzado
      if (retryCount >= this.maxRetries) {
        console.warn('⚠️ [RETRY] Máximo de reintentos alcanzado para token FCM');
        // Resetear contador después de 1 hora
        const timestamp = await AsyncStorage.getItem(this.TIMESTAMP_KEY);
        if (timestamp) {
          const tokenAge = Date.now() - parseInt(timestamp, 10);
          if (tokenAge > 3600000) { // 1 hora
            await AsyncStorage.setItem(this.RETRY_COUNT_KEY, '0');
            console.log('🔄 [RETRY] Contador de reintentos reseteado');
          }
        }
        return;
      }

      // Verificar conexión
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log('⏳ [RETRY] Sin conexión, esperando...');
        return;
      }

      console.log(`🔄 [RETRY] Intentando registrar token (intento ${retryCount + 1}/${this.maxRetries})...`);

      // Intentar registro
      const payload = {
        token: token,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        source: 'token_retry_automatic',
        customerId: 'app_user',
        email: 'user@gst3d.eu',
        deviceInfo: {
          model: Platform.OS,
          version: Platform.Version,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(API_CONFIG.FULL_TOKEN_URL, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // ✅ Éxito: marcar como registrado
        await AsyncStorage.setItem(this.REGISTERED_KEY, 'true');
        await AsyncStorage.removeItem(this.RETRY_COUNT_KEY);
        console.log('✅ [RETRY] Token registrado exitosamente en reintento');
      } else {
        // ❌ Fallo: incrementar contador y programar siguiente reintento
        const newRetryCount = retryCount + 1;
        await AsyncStorage.setItem(this.RETRY_COUNT_KEY, newRetryCount.toString());
        
        // Backoff exponencial: 5s, 10s, 20s, 40s, 80s
        const delay = this.baseDelay * Math.pow(2, retryCount);
        
        console.log(`⏳ [RETRY] Reintentando en ${delay}ms (intento ${newRetryCount}/${this.maxRetries})`);
        
        // Programar siguiente reintento
        setTimeout(() => {
          this.retryPendingToken();
        }, delay);
      }
    } catch (error) {
      console.error('❌ [RETRY] Error en reintento de token:', error);
      // Incrementar contador de reintentos
      const retryCountStr = await AsyncStorage.getItem(this.RETRY_COUNT_KEY);
      const retryCount = retryCountStr ? parseInt(retryCountStr, 10) : 0;
      if (retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        setTimeout(() => {
          this.retryPendingToken();
        }, delay);
      }
    }
  }

  /**
   * Inicia el scheduler de reintentos periódicos
   */
  startRetryScheduler(): void {
    // Verificar inmediatamente si hay tokens pendientes
    this.retryPendingToken();

    // Verificar cada 30 segundos si hay tokens pendientes
    this.retryInterval = setInterval(() => {
      this.retryPendingToken();
    }, 30000);

    console.log('✅ [RETRY] Scheduler de reintentos iniciado');
  }

  /**
   * Detiene el scheduler de reintentos
   */
  stopRetryScheduler(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    console.log('🛑 [RETRY] Scheduler de reintentos detenido');
  }

  /**
   * Configura listener de cambios de red
   */
  setupNetworkListener(): void {
    if (this.networkUnsubscribe) {
      return; // Ya está configurado
    }

    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('✅ [RETRY] Conexión detectada, verificando tokens pendientes...');
        this.retryPendingToken();
      }
    });

    console.log('✅ [RETRY] Listener de red configurado');
  }
}

export default TokenRetryService;


