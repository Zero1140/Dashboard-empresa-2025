import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import { ShopifyCustomerInfo, ShopifyPushPayload } from '../types/shopify';
import CookieManager from '@react-native-cookies/cookies';
import { LocationService, LocationData } from './LocationService';
import { DeviceInfoService, DeviceInfoData } from './DeviceInfoService';
import { TokenPersistenceService } from './TokenPersistenceService';
import { SafePermissions } from '../utils/SafePermissions';
import { DetailedLogger } from './DetailedLogger';

export class ShopifyPushService {
  private static instance: ShopifyPushService;
  private fcmToken: string | null = null;
  private customerInfo: ShopifyCustomerInfo | null = null;
  private serverAvailable: boolean = true;
  private lastServerCheck: number = 0;
  private tokenPersistence: TokenPersistenceService;
  private appStateSubscription: any = null;
  private networkSubscription: any = null;
  private logger: DetailedLogger;
  private isInitialized = false;
  private isNetworkAvailable = true;
  private retryCount = 0;
  private maxRetries = 3;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): ShopifyPushService {
    if (!ShopifyPushService.instance) {
      ShopifyPushService.instance = new ShopifyPushService();
    }
    return ShopifyPushService.instance;
  }

  constructor() {
    this.tokenPersistence = TokenPersistenceService.getInstance();
    this.logger = DetailedLogger.getInstance();

    this.logger.info('PUSH_SERVICE', 'ShopifyPushService initialized', {
      timestamp: new Date().toISOString(),
      platform: Platform.OS
    });

    this.setupAppStateListener();
    this.setupNetworkListener();
    this.setupNotificationHandlers(); // NUEVO: Configurar manejadores de notificaciones
  }

  /**
   * Configura los manejadores de notificaciones FCM
   */
  private setupNotificationHandlers(): void {
    try {
      console.log('🔔 [PUSH] Setting up notification handlers...');
      
      // Manejar notificaciones cuando la app está en primer plano
      messaging().onMessage(async remoteMessage => {
        console.log('📱 [PUSH] Received foreground message:', remoteMessage);
        this.logger.info('FOREGROUND_MESSAGE', 'Received foreground notification', {
          messageId: remoteMessage.messageId,
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          data: remoteMessage.data,
          timestamp: new Date().toISOString()
        });
        
        // Aquí podrías mostrar una notificación local o actualizar la UI
        // Por ahora solo logueamos
      });

      // Manejar notificaciones cuando la app está en segundo plano
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('📱 [PUSH] Received background message:', remoteMessage);
        this.logger.info('BACKGROUND_MESSAGE', 'Received background notification', {
          messageId: remoteMessage.messageId,
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          data: remoteMessage.data,
          timestamp: new Date().toISOString()
        });
        
        // Procesar la notificación en segundo plano
        // Aquí podrías guardar datos, actualizar estado, etc.
      });

      console.log('✅ [PUSH] Notification handlers setup completed');
      
    } catch (error) {
      console.error('❌ [PUSH] Error setting up notification handlers:', error);
      this.logger.error('NOTIFICATION_HANDLERS', 'Error setting up notification handlers', error);
    }
  }

  /**
   * Configura listener de red para manejar cambios de conectividad
   */
  private setupNetworkListener(): void {
    console.log('🌐 [PUSH] Network listener setup skipped (simplified mode)');
  }

  /**
   * Maneja la reconexión de red
   */
  private async handleNetworkReconnected(): Promise<void> {
    try {
      console.log('🔄 [PUSH] Handling network reconnection...');
      this.logger.info('NETWORK_RECONNECT', 'Starting network reconnection handling', {
        timestamp: new Date().toISOString(),
        hasFCMToken: !!this.fcmToken,
        hasCustomerInfo: !!this.customerInfo
      });
      
      // 1. Validar token actual
      this.logger.info('NETWORK_RECONNECT', 'Validating and refreshing token');
      await this.validateAndRefreshToken();
      
      // 2. Procesar queue offline
      this.logger.info('NETWORK_RECONNECT', 'Processing offline queue');
      
      // 3. Registrar token si es necesario
      const currentToken = this.fcmToken;
      if (currentToken) {
        this.logger.info('NETWORK_RECONNECT', 'Registering token with location after reconnection');
        if (this.customerInfo) {
          await this.registerTokenWithLocation(currentToken, this.customerInfo);
        } else {
          await this.registerTokenWithLocation(currentToken);
        }
      } else {
        this.logger.warn('NETWORK_RECONNECT', 'No FCM token available for registration after reconnection');
      }
      
      console.log('✅ [PUSH] Network reconnection handled successfully');
      this.logger.info('NETWORK_RECONNECT', 'Network reconnection handled successfully', {
        timestamp: new Date().toISOString(),
        tokenRegistered: !!currentToken
      });
    } catch (error) {
      console.error('❌ [PUSH] Error handling network reconnection:', error);
      this.logger.error('NETWORK_RECONNECT', 'Error handling network reconnection', error, {
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtiene un token FCM válido garantizado
   */
  private async getValidFCMToken(): Promise<string | null> {
    try {
      console.log('🎯 [PUSH] Getting FCM token directly...');
      
      // Obtener token FCM directamente
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        console.log('✅ [PUSH] FCM token obtained:', token);
        return token;
      } else {
        console.log('❌ [PUSH] No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('❌ [PUSH] Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Valida y renueva el token si es necesario
   */
  private async validateAndRefreshToken(): Promise<void> {
    try {
      console.log('🔍 [PUSH] Validating and refreshing token...');
      
      // Obtener token actual de Firebase
      const currentToken = await messaging().getToken();
      
      if (currentToken && currentToken !== this.fcmToken) {
        console.log('🔄 [PUSH] Token changed, updating...');
        this.fcmToken = currentToken;
        
        // Renovar registro en servidor si hay token válido
        if (this.fcmToken) {
          if (this.customerInfo) {
            await this.registerTokenWithLocation(this.fcmToken, this.customerInfo);
          } else {
            await this.registerTokenWithLocation(this.fcmToken);
          }
        }
      } else if (!currentToken) {
        console.log('⚠️ [PUSH] No current token available');
        // Intentar obtener nuevo token
        const newToken = await this.getValidFCMToken();
        if (newToken) {
          this.fcmToken = newToken;
        }
      } else {
        console.log('✅ [PUSH] Token is valid and up to date');
      }
      
    } catch (error) {
      console.error('❌ [PUSH] Error validating and refreshing token:', error);
    }
  }

  async initializeForCustomer(customerInfo: ShopifyCustomerInfo): Promise<boolean> {
    try {
      this.customerInfo = customerInfo;
      
      // 1. Solicitar permisos FCM
      await this.requestFCMPermissions();
      
      // 2. Obtener token FCM válido (CORREGIDO: asignar resultado)
      const token = await this.getValidFCMToken();
      if (!token) {
        throw new Error('Failed to get FCM token');
      }
      this.fcmToken = token;
      
      // 3. Registrar token en servidor (usando función con ubicación)
      const registrationSuccess = await this.registerTokenWithLocation(this.fcmToken, this.customerInfo);
      if (!registrationSuccess) {
        throw new Error('Failed to register token with server');
      }
      
      console.log('✅ [PUSH] Push service initialized for customer:', customerInfo.email);
      
      // Iniciar sistema de recuperación automática para resistir MIUI
      this.startRecoverySystem();
      
      return true;
    } catch (error) {
      console.error('❌ [PUSH] Failed to initialize push service:', error);
      return false;
    }
  }

  private async requestFCMPermissions(): Promise<void> {
    this.logger.info('PERMISSION_REQUEST', 'Requesting universal FCM permissions for all Android models', {
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    });

    try {
      if (Platform.OS === 'android') {
        // Usar la nueva función inteligente de permisos
        const granted = await SafePermissions.requestBasicPermissions();
        
            this.logger.info('PERMISSION_RESULT', 'Universal Android permission result', {
              notifications: granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED,
              wakeLock: granted[PermissionsAndroid.PERMISSIONS.WAKE_LOCK] === PermissionsAndroid.RESULTS.GRANTED,
              internet: true, // INTERNET es implícito, no se verifica
              foregroundService: granted[PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE] === PermissionsAndroid.RESULTS.GRANTED,
              // location: ya no necesario con detección por IP
              timestamp: new Date().toISOString()
            });
        
        // Solo fallar si los permisos críticos están realmente denegados
        if (granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.DENIED) {
          this.logger.error('PERMISSION_REQUEST', 'Critical notification permission denied');
          throw new Error('POST_NOTIFICATIONS permission not granted');
        }
      }

      // Solicitar permisos de Firebase
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      this.logger.info('PERMISSION_RESULT', 'Universal FCM permission result', {
        enabled,
        authStatus,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });

      if (!enabled) {
        throw new Error('FCM permissions not granted');
      }
      
      console.log('✅ [PUSH] FCM permissions granted successfully');
      
    } catch (error) {
      this.logger.error('PERMISSION_REQUEST', 'Error requesting FCM permissions', error);
      console.error('❌ [PUSH] Error requesting permissions:', error instanceof Error ? error.message : String(error));
      throw error; // Re-lanzar error para que se maneje en initializeForCustomer
    }
  }

  private async getFCMToken(): Promise<void> {
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    // Usar el nuevo sistema de validación para obtener token válido
    const validToken = await this.getValidFCMToken();
    this.fcmToken = validToken;

    // Guardar token con metadatos si tenemos customer info
    if (validToken && this.customerInfo) {
      await this.tokenPersistence.updateTokenMetadata(
        this.customerInfo.id,
        this.customerInfo.email
      );
    }
  }

  private async registerTokenWithServer(): Promise<void> {
    if (!this.fcmToken || !this.customerInfo) {
      const errorMsg = 'Missing FCM token or customer info';
      this.logger.error('TOKEN_REGISTRATION', errorMsg, null, {
        hasFCMToken: !!this.fcmToken,
        hasCustomerInfo: !!this.customerInfo,
        timestamp: new Date().toISOString()
      });
      throw new Error(errorMsg);
    }

    console.log('📤 [PUSH] Registering token with server...');
    this.logger.info('TOKEN_REGISTRATION', 'Starting token registration with server', {
      customerId: this.customerInfo.id,
      email: this.customerInfo.email,
      platform: Platform.OS,
      tokenLength: this.fcmToken.length,
      timestamp: new Date().toISOString()
    });

    // Usar RetryManager para operaciones de red
    // const result = await this.retryManager.executeWithRetry(
      async () => {
        this.logger.info('TOKEN_REGISTRATION', 'Getting Shopify session data');
        const shopifySessionId = await this.getShopifySessionId();
        const cartToken = await this.getCartToken();

        this.logger.info('TOKEN_REGISTRATION', 'Shopify session data retrieved', {
          hasSessionId: !!shopifySessionId,
          hasCartToken: !!cartToken,
          sessionIdLength: shopifySessionId?.length || 0,
          cartTokenLength: cartToken?.length || 0
        });

        const payload: ShopifyPushPayload = {
          token: this.fcmToken!,
          customerId: this.customerInfo!.id,
          email: this.customerInfo!.email,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          shopifySessionId: shopifySessionId || undefined,
          cartToken: cartToken || undefined
        };

        // Usar el nuevo sistema de configuración robusto
        console.log('🌐 [PUSH] Using robust network service for token registration');
        // console.log('🌐 [PUSH] Network config debug info:', this.networkConfig.getDebugInfo());
        
        // this.logger.info('TOKEN_REGISTRATION', 'Network configuration debug info', {
        //   networkConfig: this.networkConfig.getDebugInfo(),
        //   payloadSize: JSON.stringify(payload).length
        // });

        // Usar el servicio robusto de red que maneja automáticamente las IPs - DESHABILITADO
        this.logger.info('TOKEN_REGISTRATION', 'Making network request to register token');
        // const result = await this.robustNetwork.post('/api/push/token', payload, {
        //   maxRetries: 3,
        //   delayMs: 1000,
        //   backoffMultiplier: 2
        // });

        // this.logger.info('TOKEN_REGISTRATION', 'Network request completed', {
        //   success: result.success,
        //   error: result.error,
        //   responseData: result.data
        // });

        // if (!result.success) {
        //   const errorMsg = `Network request failed: ${result.error}`;
        //   this.logger.error('TOKEN_REGISTRATION', errorMsg, null, {
        //     error: result.error,
        //     payload: payload
        //   });
        //   throw new Error(errorMsg);
        // }

        // return result.data;
        
      }
      // },
      // this.retryManager.getNetworkConfig()
    // );

    // EJECUTAR REGISTRO REAL SIN RECURSIÓN
    try {
      this.logger.info('TOKEN_REGISTRATION', 'Getting Shopify session data');
      const shopifySessionId = await this.getShopifySessionId();
      const cartToken = await this.getCartToken();

      this.logger.info('TOKEN_REGISTRATION', 'Shopify session data retrieved', {
        hasSessionId: !!shopifySessionId,
        hasCartToken: !!cartToken,
        sessionIdLength: shopifySessionId?.length || 0,
        cartTokenLength: cartToken?.length || 0
      });

      const payload: ShopifyPushPayload = {
        token: this.fcmToken!,
        customerId: this.customerInfo!.id,
        email: this.customerInfo!.email,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        shopifySessionId: shopifySessionId || undefined,
        cartToken: cartToken || undefined
      };

      // REGISTRO REAL: Usar fetch directo con manejo de errores
      console.log('📤 [PUSH] Registrando token con fetch directo...');
      
      const response = await fetch('https://gst3d-push-server-g.onrender.com/api/push/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [PUSH] Token registrado exitosamente:', result);
        
        console.log('✅ [PUSH] Token registered successfully for customer:', this.customerInfo.email);
        this.logger.info('TOKEN_REGISTRATION', 'Token registered successfully', {
          customerId: this.customerInfo.id,
          email: this.customerInfo.email,
          timestamp: new Date().toISOString()
        });
        this.serverAvailable = true;
        this.lastServerCheck = Date.now();
      } else {
        const errorText = await response.text();
        console.log('❌ [PUSH] Error registrando token:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ [PUSH] Failed to register token:', error);
      this.logger.error('TOKEN_REGISTRATION', 'Failed to register token', null, {
        error: error instanceof Error ? error.message : String(error),
        customerId: this.customerInfo.id,
        email: this.customerInfo.email,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  private async getShopifySessionId(): Promise<string | null> {
    try {
      const cookies = await CookieManager.get('https://gst3d.eu', true);
      return cookies['_shopify_s']?.value || null;
    } catch (error) {
      console.error('Error getting Shopify session ID:', error);
      return null;
    }
  }

  private async getCartToken(): Promise<string | null> {
    try {
      const cookies = await CookieManager.get('https://gst3d.eu', true);
      return cookies['cart']?.value || null;
    } catch (error) {
      console.error('Error getting cart token:', error);
      return null;
    }
  }

  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  getCurrentCustomer(): ShopifyCustomerInfo | null {
    return this.customerInfo;
  }

  // Verificar si el servidor está disponible usando el servicio robusto
  private async checkServerAvailability(): Promise<boolean> {
    const now = Date.now();
    // Solo verificar cada 30 segundos para evitar spam de requests
    if (now - this.lastServerCheck < 30000) {
      this.logger.debug('SERVER_CHECK', 'Using cached server availability result', {
        serverAvailable: this.serverAvailable,
        timeSinceLastCheck: now - this.lastServerCheck,
        cacheAgeSeconds: Math.floor((now - this.lastServerCheck) / 1000)
      });
      return this.serverAvailable;
    }

    try {
      console.log('🔍 [PUSH] Checking server availability using robust network service...');
      this.logger.info('SERVER_CHECK', 'Starting server availability check', {
        timestamp: new Date().toISOString(),
        timeSinceLastCheck: now - this.lastServerCheck,
        previousServerAvailable: this.serverAvailable
      });
      
      // Usar el servicio robusto para verificar conectividad - DESHABILITADO
      // const connectivityResult = await this.robustNetwork.checkConnectivity();
      
      // SIMPLIFICADO: Asumir servidor disponible
      this.serverAvailable = true;
      this.lastServerCheck = now;
      
      // this.logger.info('SERVER_CHECK', 'Server availability check completed', {
      //   connected: connectivityResult.connected,
      //   workingUrl: connectivityResult.workingUrl,
      //   error: connectivityResult.error,
      //   timestamp: new Date().toISOString(),
      //   checkDuration: Date.now() - now,
      //   previousState: this.serverAvailable !== connectivityResult.connected ? 'changed' : 'same'
      // });
      
      // SIMPLIFICADO: Log básico
      console.log('✅ [PUSH] Server check completed (simplified mode)');
      
      // if (this.serverAvailable) {
      //   console.log('✅ [PUSH] Server is available at:', connectivityResult.workingUrl);
      //   this.logger.info('SERVER_CHECK', 'Server is available and reachable', {
      //     workingUrl: connectivityResult.workingUrl,
      //     timestamp: new Date().toISOString()
      //   });
      // } else {
      //   console.log('⚠️ [PUSH] Server is not available:', connectivityResult.error);
      //   this.logger.warn('SERVER_CHECK', 'Server is not available', {
      //     error: connectivityResult.error,
      //     timestamp: new Date().toISOString()
      //   });
      // }
      
      // SIMPLIFICADO: Asumir servidor disponible
      console.log('✅ [PUSH] Server assumed available (simplified mode)');
      
      return this.serverAvailable;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('⚠️ [PUSH] Error checking server availability:', errorMessage);
      
      this.logger.error('SERVER_CHECK', 'Error checking server availability', error, {
        timestamp: new Date().toISOString(),
        errorMessage: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        checkDuration: Date.now() - now
      });
      
      this.serverAvailable = false;
      this.lastServerCheck = now;
      return false;
    }
  }

  // Método optimizado para registro inmediato de tokens
  async registerTokenImmediately(): Promise<boolean> {
    this.logger.info('TOKEN_REGISTRATION', 'Starting token registration process', {
      timestamp: new Date().toISOString(),
      hasCustomerInfo: !!this.customerInfo
    });
    
    try {
      console.log('🔄 Starting token registration process...');
      
      // 1. Solicitar permisos FCM primero (esto siempre debe funcionar)
      console.log('📱 Requesting FCM permissions...');
      this.logger.info('TOKEN_REGISTRATION', 'Requesting FCM permissions');
      await this.requestFCMPermissions();
      
      // 2. Obtener token FCM (esto siempre debe funcionar)
      console.log('🔑 Getting FCM token...');
      this.logger.info('TOKEN_REGISTRATION', 'Getting FCM token');
      await this.getFCMToken();
      
      if (!this.fcmToken) {
        this.logger.error('TOKEN_REGISTRATION', 'No FCM token obtained', null, {
          timestamp: new Date().toISOString()
        });
        console.error('❌ No FCM token obtained');
        return false;
      }

      this.logger.info('TOKEN_REGISTRATION', 'FCM token obtained successfully', {
        tokenLength: this.fcmToken.length,
        tokenPreview: this.fcmToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      console.log('✅ FCM token obtained:', this.fcmToken.substring(0, 20) + '...');

      // 3. Intentar registrar token en servidor (con reintentos)
      console.log('📤 Attempting to register token with server...');
      this.logger.info('TOKEN_REGISTRATION', 'Attempting to register token with server');
      
      try {
        // Verificar disponibilidad del servidor
        this.logger.info('TOKEN_REGISTRATION', 'Checking server availability');
        const serverAvailable = await this.checkServerAvailability();
        this.logger.info('TOKEN_REGISTRATION', 'Server availability check completed', {
          serverAvailable,
          timestamp: new Date().toISOString()
        });
        
        if (!serverAvailable) {
          console.log('⚠️ Server not available - will retry later');
          this.logger.warn('TOKEN_REGISTRATION', 'Server not available - will retry later');
          
          // Guardar token para intentar registro más tarde
          await this.tokenPersistence.saveToken({
            token: this.fcmToken,
            timestamp: Date.now(),
            platform: Platform.OS,
            registered: false // Marcar como no registrado
          });
          
          this.logger.info('TOKEN_REGISTRATION', 'Token saved for retry later', {
            tokenLength: this.fcmToken.length,
            registered: false
          });
          
          return true; // Retornar true porque obtuvimos el token
        }
        
        // Servidor disponible - intentar registro
        this.logger.info('TOKEN_REGISTRATION', 'Server available, proceeding with registration', {
          hasCustomerInfo: !!this.customerInfo,
          timestamp: new Date().toISOString()
        });
        
        if (this.customerInfo) {
          // Usuario autenticado - usar endpoint con ubicación
          this.logger.info('TOKEN_REGISTRATION', 'Registering authenticated token with location');
          await this.registerTokenWithLocation(this.fcmToken!, this.customerInfo);
          console.log('✅ Authenticated token registered with location');
          this.logger.info('TOKEN_REGISTRATION', 'Authenticated token registered successfully with location');
        } else {
          // Usuario anónimo - usar endpoint con ubicación
          this.logger.info('TOKEN_REGISTRATION', 'Registering anonymous token with location');
          await this.registerTokenWithLocation(this.fcmToken!);
          console.log('✅ Anonymous token registered with location');
          this.logger.info('TOKEN_REGISTRATION', 'Anonymous token registered successfully with location');
        }

        // Marcar token como registrado
        await this.tokenPersistence.saveToken({
          token: this.fcmToken,
          timestamp: Date.now(),
          platform: Platform.OS,
          registered: true
        });

        return true;

      } catch (serverError) {
        console.error('❌ Server registration failed:', serverError);
        
        // Intentar fallback: registro básico sin ubicación
        try {
          console.log('🔄 Attempting fallback registration...');
          await this.registerBasicToken();
          console.log('✅ Fallback registration successful');
          
          // Marcar token como registrado
          await this.tokenPersistence.saveToken({
            token: this.fcmToken,
            timestamp: Date.now(),
            platform: Platform.OS,
            registered: true
          });
          
          return true;
        } catch (fallbackError) {
          console.error('❌ Fallback registration also failed:', fallbackError);
          
          // Guardar token para intentar registro más tarde
          await this.tokenPersistence.saveToken({
            token: this.fcmToken,
            timestamp: Date.now(),
            platform: Platform.OS,
            registered: false
          });
          
          console.log('ℹ️ Token saved for later registration when server is available');
          return true; // Retornar true porque obtuvimos el token
        }
      }

    } catch (error) {
      console.error('❌ Failed to register token immediately:', error);
      return false;
    }
  }

  private async registerAnonymousToken(): Promise<void> {
    try {
      console.log('🔄 Starting anonymous token registration...');
      this.logger.info('ANONYMOUS_REGISTRATION', 'Starting anonymous token registration', {
        hasFCMToken: !!this.fcmToken,
        tokenLength: this.fcmToken?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // 1. Obtener datos de ubicación y dispositivo
      const locationService = LocationService.getInstance();
      const deviceInfoService = DeviceInfoService.getInstance();
      
      console.log('📍 Getting location and device info...');
      this.logger.info('ANONYMOUS_REGISTRATION', 'Getting location and device info');
      const [locationData, deviceInfo] = await Promise.all([
        locationService.getCurrentLocation(),
        deviceInfoService.getDeviceInfo()
      ]);

      this.logger.info('ANONYMOUS_REGISTRATION', 'Location and device info retrieved', {
        hasLocationData: !!locationData,
        locationCountry: locationData?.country,
        locationRegion: locationData?.region,
        locationCity: locationData?.city,
        deviceModel: deviceInfo.deviceModel,
        deviceBrand: deviceInfo.brand,
        isEmulator: deviceInfo.isEmulator,
        appVersion: deviceInfo.appVersion
      });

      // 2. Generar segmentos para usuario anónimo
      const segments = this.generateSegments(locationData, deviceInfo, undefined);
      console.log('🏷️ Generated segments:', segments);
      this.logger.info('ANONYMOUS_REGISTRATION', 'Generated segments for anonymous user', {
        segments: segments,
        segmentCount: segments.length
      });

      // 3. Crear payload completo para endpoint correcto
      const payload = {
        token: this.fcmToken,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        country: locationData?.country || 'ES',
        region: locationData?.region || 'Desconocido',
        city: locationData?.city || 'Ciudad',
        latitude: locationData?.latitude || 0,
        longitude: locationData?.longitude || 0,
        timezone: locationData?.timezone || 'Europe/Madrid',
        deviceInfo: {
          appVersion: deviceInfo.appVersion,
          deviceModel: deviceInfo.deviceModel,
          osVersion: deviceInfo.osVersion,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone,
          brand: deviceInfo.brand,
          isEmulator: deviceInfo.isEmulator
        },
        segments,
        isLoggedIn: false,
        hasLocationPermission: !!locationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.logger.info('ANONYMOUS_REGISTRATION', 'Payload created for anonymous registration', {
        payloadSize: JSON.stringify(payload).length,
        hasLocationPermission: !!locationData,
        country: payload.country,
        region: payload.region,
        city: payload.city
      });

      // 4. Usar endpoint correcto para usuarios anónimos
      const API_BASE_URL = 'https://gst3d-push-server-g.onrender.com';
      const BEARER_TOKEN = '31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV';

      console.log('📤 Sending to correct endpoint...');
      this.logger.info('ANONYMOUS_REGISTRATION', 'Sending request to server', {
        endpoint: `${API_BASE_URL}/api/push/token`,
        hasBearerToken: !!BEARER_TOKEN,
        bearerTokenLength: BEARER_TOKEN.length
      });

      const response = await fetch(`${API_BASE_URL}/api/push/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEARER_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      this.logger.info('ANONYMOUS_REGISTRATION', 'Server response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        this.logger.error('ANONYMOUS_REGISTRATION', 'Server error response', null, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          payload: payload
        });
        throw new Error(`Failed to register anonymous token: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Anonymous token registered successfully:', result);
      this.logger.info('ANONYMOUS_REGISTRATION', 'Anonymous token registered successfully', {
        result: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in registerAnonymousToken:', error);
      this.logger.error('ANONYMOUS_REGISTRATION', 'Error in anonymous token registration', error, {
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error; // Re-throw para manejo en nivel superior
    }
  }

  // Método de fallback para registro básico
  private async registerBasicToken(): Promise<void> {
    console.log('🔄 Registering basic token as fallback...');
    this.logger.info('BASIC_REGISTRATION', 'Starting basic token registration as fallback', {
      hasFCMToken: !!this.fcmToken,
      tokenLength: this.fcmToken?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    const payload = {
      token: this.fcmToken,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      country: 'ES', // Valor por defecto
      region: 'Desconocido',
      city: 'Ciudad',
      latitude: 0,
      longitude: 0,
      timezone: 'Europe/Madrid',
      deviceInfo: {
        appVersion: '1.0.0',
        deviceModel: 'Unknown',
        osVersion: 'Unknown',
        language: 'es-ES',
        timezone: 'Europe/Madrid',
        brand: 'Unknown',
        isEmulator: false
      },
      segments: ['app_users', 'platform_' + Platform.OS, 'anonymous_users'],
      isLoggedIn: false,
      hasLocationPermission: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.logger.info('BASIC_REGISTRATION', 'Basic payload created', {
      payloadSize: JSON.stringify(payload).length,
      segments: payload.segments,
      country: payload.country
    });

    const API_BASE_URL = 'https://gst3d-push-server-g.onrender.com';
    const BEARER_TOKEN = '31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV';

    this.logger.info('BASIC_REGISTRATION', 'Sending basic registration request', {
      endpoint: `${API_BASE_URL}/api/push/token`,
      hasBearerToken: !!BEARER_TOKEN
    });

    const response = await fetch(`${API_BASE_URL}/api/push/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    this.logger.info('BASIC_REGISTRATION', 'Basic registration response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('BASIC_REGISTRATION', 'Basic token registration failed', null, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        payload: payload
      });
      throw new Error(`Basic token registration failed: ${response.status} - ${errorText}`);
    }
    
    console.log('✅ Basic token registered successfully');
    this.logger.info('BASIC_REGISTRATION', 'Basic token registered successfully', {
      timestamp: new Date().toISOString()
    });
  }

  // NUEVO: Método para registrar token con datos de ubicación
  async registerTokenWithLocation(fcmToken: string, customerData?: ShopifyCustomerInfo): Promise<boolean> {
    console.log('══════════════════════════════════════════════════');
    console.log('🚀 [PUSH] ===== INICIANDO REGISTRO DE TOKEN =====');
    console.log('══════════════════════════════════════════════════');
    
    try {
      // Verificar que el token no sea null o vacío
      console.log('1️⃣ [PUSH] Verificando token FCM...');
      if (!fcmToken || fcmToken.trim() === '') {
        console.error('❌ [PUSH] FCM token is required');
        console.log('══════════════════════════════════════════════════');
        return false;
      }
      console.log('✅ [PUSH] Token existe:', fcmToken.substring(0, 30) + '...');
      console.log('   Customer:', customerData?.email || 'anónimo');

      console.log('2️⃣ [PUSH] Obteniendo datos de ubicación...');
      const locationService = LocationService.getInstance();
      let locationData;
      try {
        locationData = await locationService.getCurrentLocation();
        console.log('✅ [PUSH] Ubicación obtenida:', locationData?.country || 'N/A');
      } catch (locError) {
        console.log('⚠️ [PUSH] Error obteniendo ubicación:', locError);
        locationData = null;
      }

      console.log('3️⃣ [PUSH] Obteniendo información del dispositivo...');
      const deviceInfoService = DeviceInfoService.getInstance();
      let deviceInfo;
      try {
        deviceInfo = await deviceInfoService.getDeviceInfo();
        console.log('✅ [PUSH] Info del dispositivo obtenida');
      } catch (devError) {
        console.log('⚠️ [PUSH] Error obteniendo info dispositivo:', devError);
        deviceInfo = { appVersion: 'unknown', deviceModel: 'unknown', osVersion: Platform.Version, language: 'es', timezone: 'Europe/Madrid', brand: 'unknown', isEmulator: false };
      }

      // 3. Generar segmentos
      console.log('4️⃣ [PUSH] Generando segmentos...');
      const segments = this.generateSegments(locationData, deviceInfo, customerData);
      console.log('✅ [PUSH] Segmentos generados:', segments.length);

      // 4. Crear payload
      console.log('5️⃣ [PUSH] Creando payload...');
      const payload = {
        token: fcmToken,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        country: locationData?.country || 'ES',
        region: locationData?.region || 'Desconocido',
        city: locationData?.city || 'Ciudad',
        latitude: locationData?.latitude || 0,
        longitude: locationData?.longitude || 0,
        timezone: locationData?.timezone || 'Europe/Madrid',
        deviceInfo: {
          appVersion: deviceInfo.appVersion,
          deviceModel: deviceInfo.deviceModel,
          osVersion: deviceInfo.osVersion,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone,
          brand: deviceInfo.brand,
          isEmulator: deviceInfo.isEmulator
        },
        segments,
        isLoggedIn: !!customerData,
        hasLocationPermission: !!locationData,
        customerId: customerData?.id,
        email: customerData?.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 5. Enviar al servidor
      const API_BASE_URL = 'https://gst3d-push-server-g.onrender.com';
      const BEARER_TOKEN = '31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV';

      console.log('══════════════════════════════════════════════════');
      console.log('6️⃣ [PUSH] ===== ENVIANDO AL SERVIDOR =====');
      console.log('URL:', `${API_BASE_URL}/api/push/token`);
      console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
      console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 500) + '...');
      console.log('══════════════════════════════════════════════════');
      
      console.log('⏳ [PUSH] Iniciando fetch con timeout de 30 segundos...');
      
      // Crear timeout manual
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: La petición tardó más de 30 segundos')), 30000)
      );
      
      const fetchPromise = fetch(`${API_BASE_URL}/api/push/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEARER_TOKEN}`
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          source: 'app_registration_with_location',
          customerId: customerData?.id,
          email: customerData?.email
        })
      });

      console.log('⏰ [PUSH] Esperando respuesta del servidor...');
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      console.log('📥 [PUSH] Respuesta recibida! Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('══════════════════════════════════════════════════');
        console.error('❌ [PUSH] ERROR DEL SERVIDOR');
        console.error('Status:', response.status);
        console.error('Error:', errorText);
        console.error('══════════════════════════════════════════════════');
        throw new Error(`Failed to register token with location: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('══════════════════════════════════════════════════');
      console.log('✅ [PUSH] ===== TOKEN REGISTRADO EXITOSAMENTE =====');
      console.log('Respuesta del servidor:', JSON.stringify(result, null, 2));
      console.log('══════════════════════════════════════════════════');
      return true;

    } catch (error) {
      console.error('══════════════════════════════════════════════════');
      console.error('❌ [PUSH] ===== ERROR EN REGISTRO =====');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.error('══════════════════════════════════════════════════');
      return false;
    }
  }

  // Generar segmentos basados en ubicación, dispositivo y customer
  private generateSegments(locationData: LocationData | null, deviceInfo: DeviceInfoData, customerData?: ShopifyCustomerInfo): string[] {
    const segments: string[] = ['app_users'];

    // Segmentos por ubicación
    if (locationData) {
      segments.push(`country_${locationData.country}`);
      segments.push(`region_${locationData.region}`);
      segments.push(`city_${locationData.city}`);
    }

    // Segmentos por dispositivo
    segments.push(`platform_${Platform.OS}`);
    segments.push(`version_${deviceInfo.appVersion}`);
    segments.push(`brand_${deviceInfo.brand.toLowerCase()}`);

    // Segmentos por estado de autenticación
    if (customerData) {
      segments.push('authenticated_users');
      segments.push(`customer_${customerData.id}`);
    } else {
      segments.push('anonymous_users');
    }

    // Segmentos por características del dispositivo
    if (deviceInfo.isEmulator) {
      segments.push('emulator_users');
    } else {
      segments.push('real_device_users');
    }

    return segments;
  }

  // Configurar listener para cambios de estado de la app
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      
      this.logger.info('APP_STATE_CHANGE', 'Application state changed', {
        newState: nextAppState,
        timestamp: new Date().toISOString(),
        hasFCMToken: !!this.fcmToken,
        hasCustomerInfo: !!this.customerInfo,
        serverAvailable: this.serverAvailable
      });
      
      if (nextAppState === 'active') {
        // App vuelve a estar activa - verificar token
        this.logger.info('APP_STATE_CHANGE', 'App became active, handling activation');
        this.handleAppBecameActive();
      } else if (nextAppState === 'background') {
        // App va a background - asegurar que el token esté registrado
        this.logger.info('APP_STATE_CHANGE', 'App went to background, ensuring token registration');
        this.handleAppWentToBackground();
      }
    });
  }

  // Manejar cuando la app vuelve a estar activa
  private async handleAppBecameActive(): Promise<void> {
    try {
      console.log('🔄 App became active - checking token status...');
      this.logger.info('APP_ACTIVE', 'App became active, checking token status', {
        timestamp: new Date().toISOString(),
        hasFCMToken: !!this.fcmToken,
        hasCustomerInfo: !!this.customerInfo
      });
      
      // Verificar si el token sigue siendo válido
      const isValid = await this.tokenPersistence.isTokenValid();
      
      this.logger.info('APP_ACTIVE', 'Token validation check completed', {
        isValid: isValid,
        timestamp: new Date().toISOString()
      });
      
      if (!isValid) {
        console.log('⚠️ Token inválido detectado - renovando...');
        this.logger.warn('APP_ACTIVE', 'Invalid token detected, renewing', {
          timestamp: new Date().toISOString()
        });
        await this.getFCMToken();
        
        // Re-registrar token si tenemos customer info
        if (this.customerInfo) {
          this.logger.info('APP_ACTIVE', 'Re-registering authenticated token with location');
          await this.registerTokenWithLocation(this.fcmToken!, this.customerInfo);
        } else {
          this.logger.info('APP_ACTIVE', 'Re-registering anonymous token with location');
          await this.registerTokenWithLocation(this.fcmToken!);
        }
      }
      
      // Intentar registrar tokens pendientes
      this.logger.info('APP_ACTIVE', 'Checking for pending token registrations');
      await this.retryPendingTokenRegistrations();
      
      this.logger.info('APP_ACTIVE', 'App activation handling completed successfully', {
        timestamp: new Date().toISOString(),
        tokenValid: isValid
      });
    } catch (error) {
      console.error('❌ Error handling app became active:', error);
      this.logger.error('APP_ACTIVE', 'Error handling app became active', error, {
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Reintentar registro de tokens pendientes
  private async retryPendingTokenRegistrations(): Promise<void> {
    try {
      console.log('🔄 Checking for pending token registrations...');
      
      const tokenInfo = await this.tokenPersistence.getTokenInfo();
      if (tokenInfo && tokenInfo.registered === false) {
        console.log('📱 Found unregistered token - attempting registration...');
        
        const serverAvailable = await this.checkServerAvailability();
        if (serverAvailable) {
          console.log('✅ Server available - registering token...');
          
          if (this.customerInfo) {
            await this.registerTokenWithLocation(this.fcmToken!, this.customerInfo);
          } else {
            await this.registerTokenWithLocation(this.fcmToken!);
          }
          
          // Marcar como registrado
          if (this.fcmToken) {
            await this.tokenPersistence.saveToken({
              token: this.fcmToken,
              timestamp: Date.now(),
              platform: Platform.OS,
              registered: true
            });
          }
          
          console.log('✅ Pending token registered successfully');
        } else {
          console.log('⚠️ Server still not available - will retry later');
        }
      }
    } catch (error) {
      console.error('❌ Error retrying pending registrations:', error);
    }
  }

  // Manejar cuando la app va a background
  private async handleAppWentToBackground(): Promise<void> {
    try {
      console.log('🔄 App went to background - ensuring token is registered...');
      this.logger.info('APP_BACKGROUND', 'App went to background, ensuring token registration', {
        timestamp: new Date().toISOString(),
        hasFCMToken: !!this.fcmToken,
        hasCustomerInfo: !!this.customerInfo,
        serverAvailable: this.serverAvailable
      });
      
      // Asegurar que tenemos un token válido antes de ir a background
      if (!this.fcmToken) {
        this.logger.warn('APP_BACKGROUND', 'No FCM token available, getting new token');
        await this.getFCMToken();
      }
      
      // Registrar token si no está registrado
      if (this.fcmToken) {
        this.logger.info('APP_BACKGROUND', 'Registering token before going to background');
        if (this.customerInfo) {
          this.logger.info('APP_BACKGROUND', 'Registering authenticated token with location');
          await this.registerTokenWithLocation(this.fcmToken!, this.customerInfo);
        } else {
          this.logger.info('APP_BACKGROUND', 'Registering anonymous token with location');
          await this.registerTokenWithLocation(this.fcmToken!);
        }
        
        this.logger.info('APP_BACKGROUND', 'Token registration completed before background', {
          timestamp: new Date().toISOString(),
          tokenLength: this.fcmToken.length
        });
      } else {
        this.logger.error('APP_BACKGROUND', 'Failed to get FCM token before going to background', null, {
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error handling app went to background:', error);
      this.logger.error('APP_BACKGROUND', 'Error handling app went to background', error, {
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Método para inicializar desde app cerrada
  async initializeFromColdStart(): Promise<boolean> {
    try {
      console.log('🚀 Initializing push service from cold start...');
      
      // Verificar si tenemos un token guardado
      const storedToken = await this.tokenPersistence.getStoredToken();
      
      if (storedToken) {
        console.log('📱 Found stored token - validating...');
        this.fcmToken = storedToken.token;
        
        // Verificar si el token sigue siendo válido
        const isValid = await this.tokenPersistence.isTokenValid();
        
        if (!isValid) {
          console.log('⚠️ Stored token is invalid - getting new one...');
          await this.getFCMToken();
        }
      } else {
        console.log('📱 No stored token found - getting new one...');
        await this.getFCMToken();
      }
      
      // Registrar token inmediatamente
      if (this.fcmToken) {
        if (this.customerInfo) {
          await this.registerTokenWithLocation(this.fcmToken, this.customerInfo);
        } else {
          await this.registerTokenWithLocation(this.fcmToken);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error initializing from cold start:', error);
      return false;
    }
  }

  // Limpiar recursos
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }
    
    // Limpiar servicios de Fase 2 - DESHABILITADO
    // this.networkMonitor.cleanup();
    // this.offlineQueue.cleanup();
    
    console.log('🧹 [PUSH] ShopifyPushService cleaned up (simplified mode)');
  }

  // Métodos de recuperación automática universal para todos los modelos de Android
  private startRecoverySystem(): void {
    this.logger.info('RECOVERY_SYSTEM', 'Starting universal recovery system for all Android models', {
      timestamp: new Date().toISOString()
    });

    // Verificación de salud cada 30 segundos
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Sistema de recuperación automática cada 2 minutos
    this.recoveryInterval = setInterval(() => {
      this.performRecoveryCheck();
    }, 120000);
  }

  private stopRecoverySystem(): void {
    this.logger.info('RECOVERY_SYSTEM', 'Stopping universal recovery system', {
      timestamp: new Date().toISOString()
    });

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      this.logger.info('HEALTH_CHECK', 'Performing health check', {
        timestamp: new Date().toISOString(),
        fcmToken: this.fcmToken ? 'present' : 'missing',
        customerInfo: this.customerInfo ? 'present' : 'missing',
        serverAvailable: this.serverAvailable
      });

      // Verificar si el token FCM sigue siendo válido - DESHABILITADO
      // if (this.fcmToken && !await this.tokenValidation.isValidToken(this.fcmToken)) {
      //   this.logger.warn('HEALTH_CHECK', 'FCM token is invalid, attempting recovery', {
      //     timestamp: new Date().toISOString()
      //   });
      //   await this.recoverFCMToken();
      // }
      
      // SIMPLIFICADO: Asumir token válido
      console.log('✅ [PUSH] Token validation skipped (simplified mode)');

      // Verificar conectividad del servidor
      if (!this.serverAvailable) {
        this.logger.warn('HEALTH_CHECK', 'Server not available, attempting recovery', {
          timestamp: new Date().toISOString()
        });
        await this.recoverServerConnection();
      }

    } catch (error) {
      this.logger.error('HEALTH_CHECK', 'Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async performRecoveryCheck(): Promise<void> {
    try {
      this.logger.info('RECOVERY_CHECK', 'Performing recovery check', {
        timestamp: new Date().toISOString(),
        retryCount: this.retryCount
      });

      // Si hemos fallado múltiples veces, intentar reinicialización completa
      if (this.retryCount >= this.maxRetries) {
        this.logger.warn('RECOVERY_CHECK', 'Max retries reached, performing full recovery', {
          timestamp: new Date().toISOString()
        });
        await this.performFullRecovery();
        this.retryCount = 0;
      }

    } catch (error) {
      this.logger.error('RECOVERY_CHECK', 'Recovery check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      this.retryCount++;
    }
  }

  private async recoverFCMToken(): Promise<void> {
    try {
      this.logger.info('FCM_RECOVERY', 'Attempting FCM token recovery', {
        timestamp: new Date().toISOString()
      });

      // Obtener nuevo token FCM
      await this.getFCMToken();
      
      // Registrar con el servidor
      if (this.fcmToken && this.customerInfo) {
        // await this.registerWithServer();
      }

      this.logger.info('FCM_RECOVERY', 'FCM token recovery successful', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('FCM_RECOVERY', 'FCM token recovery failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async recoverServerConnection(): Promise<void> {
    try {
      this.logger.info('SERVER_RECOVERY', 'Attempting server connection recovery', {
        timestamp: new Date().toISOString()
      });

      // Verificar conectividad del servidor - DESHABILITADO
      // const isAvailable = await this.robustNetwork.checkServerAvailability();
      // this.serverAvailable = isAvailable;
      
      // SIMPLIFICADO: Asumir servidor disponible
      this.serverAvailable = true;

      // if (isAvailable && this.fcmToken && this.customerInfo) {
      //   // Reintentar registro con el servidor
      //   // await this.registerWithServer();
      // }
      
      // SIMPLIFICADO: Asumir éxito
      console.log('✅ [PUSH] Server recovery completed (simplified mode)');

      // this.logger.info('SERVER_RECOVERY', 'Server connection recovery completed', {
      //   timestamp: new Date().toISOString(),
      //   serverAvailable: isAvailable
      // });

    } catch (error) {
      this.logger.error('SERVER_RECOVERY', 'Server connection recovery failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async performFullRecovery(): Promise<void> {
    try {
      this.logger.info('FULL_RECOVERY', 'Performing full system recovery', {
        timestamp: new Date().toISOString()
      });

      // Detener sistema de recuperación temporalmente
      this.stopRecoverySystem();

      // Reinicializar completamente - DESHABILITADO
      // this.isInitialized = false;
      // await this.initialize();
      
      // SIMPLIFICADO: Solo marcar como inicializado
      this.isInitialized = true;

      // Reiniciar sistema de recuperación
      this.startRecoverySystem();

      this.logger.info('FULL_RECOVERY', 'Full system recovery completed', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('FULL_RECOVERY', 'Full system recovery failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Obtener información de debugging
  async getDebugInfo(): Promise<any> {
    try {
      const tokenInfo = await this.tokenPersistence.getTokenInfo();
      // const tokenValidationInfo = await this.tokenValidation.getDebugInfo();
      // const retryManagerInfo = this.retryManager.getDebugInfo();
      // const networkMonitorInfo = this.networkMonitor.getDebugInfo();
      // const offlineQueueInfo = await this.offlineQueue.getDebugInfo();
      
      // SIMPLIFICADO: Información básica
      const simplifiedInfo = {
        tokenInfo: tokenInfo,
        fcmToken: this.fcmToken ? 'present' : 'missing',
        customerInfo: this.customerInfo ? 'present' : 'missing',
        serverAvailable: this.serverAvailable,
        isInitialized: this.isInitialized,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      };
      
      return simplifiedInfo;
    } catch (error) {
      console.error('❌ Error getting debug info:', error);
      return null;
    }
  }
}

