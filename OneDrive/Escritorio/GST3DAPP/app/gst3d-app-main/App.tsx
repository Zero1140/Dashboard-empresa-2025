import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CounterM3Screen } from './src/presentation/screens/CounterM3Screen';
import DiagnosticScreen from './src/presentation/screens/DiagnosticScreen';
import SplashScreen from './src/presentation/components/splash/SplashScreen';
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { ShopifyPushService } from './src/services/ShopifyPushService';
import { API_CONFIG, getApiHeaders } from './src/config/constants';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TokenRetryService from './src/utils/TokenRetryService';

// ✅ MEJORADA: Función de registro que SIEMPRE guarda el token localmente
const registerTokenWithServer = async (token: string) => {
  // ✅ PASO 1: GUARDAR TOKEN LOCALMENTE INMEDIATAMENTE (CRÍTICO)
  try {
    await AsyncStorage.setItem('fcm_token', token);
    await AsyncStorage.setItem('fcm_token_timestamp', Date.now().toString());
    await AsyncStorage.setItem('fcm_token_registered', 'false'); // Marcar como pendiente
    await AsyncStorage.setItem('fcm_token_retry_count', '0'); // Resetear contador
    console.log('✅ [APP] Token guardado localmente (siempre, incluso si falla el registro)');
  } catch (error) {
    console.error('❌ [APP] Error guardando token localmente:', error);
    // Continuar aunque falle el guardado local
  }

  try {
    console.log('🔴 [APP] ===== INICIO REGISTRO AUTOMÁTICO DE TOKEN =====');
    console.log('🔴 [APP] URL:', API_CONFIG.FULL_TOKEN_URL);
    console.log('🔴 [APP] Ejecutando fetch automático...');
    
    const payload = {
      token: token,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      source: 'fcm_monitor_auto_startup',
      customerId: 'app_user',
      email: 'user@gst3d.eu',
      deviceInfo: {
        model: Platform.OS,
        version: Platform.Version,
        timestamp: new Date().toISOString()
      }
    };

    const startTime = Date.now();
    const response = await fetch(API_CONFIG.FULL_TOKEN_URL, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payload)
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('🟢 [APP] Fetch automático completado - Status:', response.status);
    console.log('⏱️ Tiempo de respuesta:', duration, 'ms');

    if (response.ok) {
      const result = await response.json();
      console.log('✅ [APP] TOKEN REGISTRADO AUTOMÁTICAMENTE');
      console.log('📊 Mensaje:', result.message);
      
      // ✅ Marcar como registrado
      await AsyncStorage.setItem('fcm_token_registered', 'true');
      
      // Mostrar país detectado
      if (result.data?.country) {
        console.log('🌍 País detectado:', result.data.country);
        console.log('📍 País:', result.data.countryName);
        console.log('🏙️ Ciudad:', result.data.city);
      }
      
      return { success: true, result };
    } else {
      const errorText = await response.text();
      console.error('❌ [APP] ERROR EN REGISTRO AUTOMÁTICO');
      console.error('📊 Status Code:', response.status);
      console.error('📊 Error del servidor:', errorText);
      console.warn('⚠️ [APP] Token guardado localmente - se reintentará automáticamente');
      
      // El token está guardado localmente, el sistema de reintentos lo procesará
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    console.error('🔴 [APP] Error en registro automático de token:', error);
    console.error('Tipo:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Mensaje:', error instanceof Error ? error.message : String(error));
    console.warn('⚠️ [APP] Token guardado localmente - se reintentará cuando haya conexión');
    
    // El token está guardado localmente, el sistema de reintentos lo procesará
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('main'); // Pantalla principal con WebView después del splash
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showGlobalSplash, setShowGlobalSplash] = useState(true); // Splash global antes de cualquier pantalla
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 [APP] Initializing app with automatic FCM token...');
        
        // Solicitar permisos automáticamente
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('❌ [APP] Permisos de notificaciones denegados');
            console.log('⚠️ [APP] Continuando sin permisos - El usuario puede conceder después');
            // NO hacer return - continuar la inicialización
          } else {
            console.log('✅ [APP] Permisos de notificaciones concedidos');
          }
        } else if (Platform.OS === 'ios') {
          // ✅ Solicitar permisos iOS usando React Native Firebase (sin opciones deprecated)
          try {
            const authStatus = await messaging().requestPermission();
            
            const enabled = 
              authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            
            if (enabled) {
              console.log('✅ [APP] Permisos de notificaciones iOS concedidos:', authStatus);
              // Registro automático para APNs (iOS específico)
              // @ts-ignore - ios.registerForRemoteNotifications existe en runtime pero no en tipos
              if (Platform.OS === 'ios' && (messaging() as any).ios) {
                await (messaging() as any).ios.registerForRemoteNotifications();
              }
            } else {
              console.log('❌ [APP] Permisos de notificaciones iOS denegados:', authStatus);
              console.log('⚠️ [APP] El usuario puede conceder permisos en Configuración');
              // NO hacer return - continuar la inicialización
            }
          } catch (error) {
            console.error('❌ [APP] Error solicitando permisos iOS:', error);
            // Continuar sin permisos - el usuario puede conceder después
          }
        }
        
        // OBTENER Y REGISTRAR TOKEN FCM (usando lógica exacta de FCMStatusMonitorScreen)
        console.log('🔑 [APP] Obteniendo token FCM...');
        let fcmToken: string | null = null;
        
        try {
          // Verificar permisos antes de obtener token (iOS específico)
          if (Platform.OS === 'ios') {
            const authStatus = await messaging().hasPermission();
            if (authStatus !== messaging.AuthorizationStatus.AUTHORIZED && 
                authStatus !== messaging.AuthorizationStatus.PROVISIONAL) {
              console.warn('⚠️ [APP] Permisos iOS no concedidos, token puede ser inválido');
            }
          }
          
          fcmToken = await messaging().getToken();
        
          if (fcmToken) {
            console.log('✅ [APP] Token FCM obtenido:', fcmToken.substring(0, 20) + '...');
            console.log('📏 [APP] Longitud del token:', fcmToken.length);
            
            // Registrar token usando la función exacta de FCMStatusMonitorScreen
            console.log('📤 [APP] Registrando token en servidor...');
            const result = await registerTokenWithServer(fcmToken);
            
            if (result.success) {
              console.log('✅ [APP] Token registrado exitosamente');
              // Configurar listeners de notificaciones
              setupNotificationListeners();
            } else {
              console.error('❌ [APP] Error registrando token:', result.error);
              // Continuar pero advertir al usuario (opcional)
            }
          } else {
            console.warn('⚠️ [APP] No se pudo obtener token FCM');
            console.warn('💡 [APP] Verificar permisos de notificaciones');
          }
        } catch (error) {
          console.error('❌ [APP] Error obteniendo token FCM:', error);
          // Continuar la app pero sin notificaciones
        }
        
        setIsInitialized(true);
        setAppReady(true);
        console.log('✅ [APP] App initialization completed');
        
        // ✅ MEJORA CRÍTICA: Iniciar sistema de reintentos de tokens
        const retryService = TokenRetryService.getInstance();
        retryService.startRetryScheduler();
        retryService.setupNetworkListener();
        
        // ✅ Verificar si hay tokens pendientes al iniciar
        const checkPendingToken = async () => {
          try {
            const token = await AsyncStorage.getItem('fcm_token');
            const registered = await AsyncStorage.getItem('fcm_token_registered');
            
            if (token && registered !== 'true') {
              console.log('🔄 [APP] Token pendiente encontrado al iniciar, intentando registro...');
              await registerTokenWithServer(token);
            }
          } catch (error) {
            console.error('❌ [APP] Error verificando token pendiente:', error);
          }
        };
        checkPendingToken();
        
        // Ocultar splash después de un delay mínimo para mejor UX (3.5 segundos)
        setTimeout(() => {
          setShowGlobalSplash(false);
          console.log('✅ [APP] Splash screen ocultado, mostrando pantalla principal');
        }, 3500);
        
      } catch (error) {
        console.error('❌ [APP] Error during app initialization:', error);
        setIsInitialized(true);
        setAppReady(true);
        // Ocultar splash incluso si hay errores después de 3 segundos
        setTimeout(() => {
          setShowGlobalSplash(false);
        }, 3000);
      }
    };

    initializeApp();
  }, []);

  // Función para inicializar ShopifyPushService automáticamente
  const initializeShopifyPushService = async () => {
    try {
      console.log('🛒 [APP] Inicializando ShopifyPushService...');
      
      // DETECTAR CUSTOMER INFO DINÁMICAMENTE
      const customerInfo = await detectCustomerInfo();
      
      if (customerInfo) {
        console.log('👤 [APP] Customer detectado:', customerInfo.email);
        
        const pushService = ShopifyPushService.getInstance();
        const success = await pushService.initializeForCustomer(customerInfo);
        
        if (success) {
          console.log('✅ [APP] ShopifyPushService inicializado exitosamente para customer:', customerInfo.email);
        } else {
          console.log('❌ [APP] Error inicializando ShopifyPushService para customer:', customerInfo.email);
        }
      } else {
        console.log('⚠️ [APP] No se detectó customer info - usando modo anónimo');
        
        // Crear customer info anónimo para testing
        const anonymousCustomerInfo = {
          id: `anonymous_${Date.now()}`,
          email: `anonymous_${Date.now()}@gst3d.eu`,
          displayName: 'Usuario Anónimo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const pushService = ShopifyPushService.getInstance();
        const success = await pushService.initializeForCustomer(anonymousCustomerInfo);
        
        if (success) {
          console.log('✅ [APP] ShopifyPushService inicializado en modo anónimo');
        } else {
          console.log('❌ [APP] Error inicializando ShopifyPushService en modo anónimo');
        }
      }
    } catch (error) {
      console.log('❌ [APP] Error inicializando ShopifyPushService:', error);
    }
  };

  // Función para detectar información del customer dinámicamente
  const detectCustomerInfo = async () => {
    try {
      console.log('🔍 [APP] Detectando información del customer...');
      
      // Importar CookieManager dinámicamente
      const CookieManager = require('@react-native-cookies/cookies').default;
      
      // Obtener cookies de Shopify
      const cookies = await CookieManager.get('https://gst3d.eu', true);
      
      console.log('🍪 [APP] Cookies obtenidas:', Object.keys(cookies));
      
      // Verificar si hay customer autenticado
      const isCustomerSignedIn = cookies['customer_signed_in']?.value === '1';
      const customerId = cookies['customer_id']?.value;
      const customerEmail = cookies['customer_email']?.value;
      
      if (isCustomerSignedIn && customerId) {
        console.log('✅ [APP] Customer autenticado detectado:', {
          id: customerId,
          email: customerEmail || `customer_${customerId}@gst3d.eu`,
          signedIn: isCustomerSignedIn
        });
        
        return {
          id: customerId,
          email: customerEmail || `customer_${customerId}@gst3d.eu`,
          displayName: customerEmail ? customerEmail.split('@')[0] : `Cliente ${customerId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        console.log('ℹ️ [APP] No hay customer autenticado');
        return null;
      }
    } catch (error) {
      console.error('❌ [APP] Error detectando customer info:', error);
      return null;
    }
  };

  // Función para configurar listeners de notificaciones
  const setupNotificationListeners = () => {
    console.log('🔔 [APP] Configurando listeners de notificaciones...');
    
    // Listener para notificaciones en foreground - COMPLETO
    messaging().onMessage(async remoteMessage => {
      console.log('📱 [APP] Notificación recibida en foreground:', remoteMessage);
      
      try {
        // PROCESAR MENSAJE EN FOREGROUND
        await processForegroundMessage(remoteMessage);
        
        // MOSTRAR NOTIFICACIÓN MANUALMENTE
        await showForegroundNotification(remoteMessage);
        
        console.log('✅ [APP] Foreground notification processed and displayed');
      } catch (error) {
        console.error('❌ [APP] Error processing foreground notification:', error);
      }
    });

    // Listener para cuando la app se abre desde una notificación
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 [APP] App abierta desde notificación:', remoteMessage);
      
      try {
        // PROCESAR APERTURA DESDE NOTIFICACIÓN
        handleNotificationOpen(remoteMessage);
      } catch (error) {
        console.error('❌ [APP] Error handling notification open:', error);
      }
    });

    // Verificar si la app se abrió desde una notificación (cold start)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📱 [APP] App abierta desde notificación (cold start):', remoteMessage);
          
          try {
            // PROCESAR APERTURA EN COLD START
            handleNotificationOpen(remoteMessage);
          } catch (error) {
            console.error('❌ [APP] Error handling cold start notification:', error);
          }
        }
      });

    console.log('✅ [APP] Listeners de notificaciones configurados');
  };

  // Función para procesar mensajes en foreground
  const processForegroundMessage = async (remoteMessage: any) => {
    const { messageId, notification, data } = remoteMessage;
    
    // Determinar tipo de mensaje
    const messageType = data?.type || 'general';
    console.log('🔍 [APP] Processing foreground message type:', messageType);
    
    // Procesar según el tipo
    switch (messageType) {
      case 'order_update':
        console.log('📦 [APP] Processing order update in foreground');
        break;
      case 'promotion':
        console.log('🎯 [APP] Processing promotion in foreground');
        break;
      case 'cart_reminder':
        console.log('🛒 [APP] Processing cart reminder in foreground');
        break;
      default:
        console.log('📱 [APP] Processing general notification in foreground');
        break;
    }
    
    // Guardar estadísticas
    await saveForegroundNotificationStats(messageId, messageType);
  };

  // Función para mostrar notificación en foreground usando notifee
  const showForegroundNotification = async (remoteMessage: any) => {
    const { notification, data } = remoteMessage;
    
    const title = notification?.title || data?.title || 'Notificación GST3D';
    const body = notification?.body || data?.body || data?.message || 'Mensaje recibido';
    
    try {
      // Crear canal (solo Android, iOS ignora)
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'gst3d_complete',
          name: 'Notificaciones completas',
          importance: AndroidImportance.HIGH,
        });
      }
      
      // Mostrar notificación
      await notifee.displayNotification({
        title,
        body,
        data: data || {},
        ios: {
          sound: 'default',
          // ✅ CRÍTICO: foregroundPresentationOptions permite mostrar en foreground
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        android: {
          channelId: 'gst3d_complete',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      });
      
      console.log('🔔 [APP] Foreground notification displayed:', { title, body });
    } catch (error) {
      console.error('❌ [APP] Error displaying foreground notification:', error);
    }
  };

  // Función para manejar apertura desde notificación
  const handleNotificationOpen = (remoteMessage: any) => {
    const { notification, data } = remoteMessage;
    
    console.log('🔓 [APP] Handling notification open:', {
      title: notification?.title,
      body: notification?.body,
      data: data
    });
    
    // Navegar a pantalla específica según el tipo de notificación
    const messageType = data?.type || 'general';
    
    switch (messageType) {
      case 'order_update':
        console.log('📦 [APP] Navigating to order details');
        // setCurrentScreen('order-details');
        break;
      case 'promotion':
        console.log('🎯 [APP] Navigating to promotions');
        // setCurrentScreen('promotions');
        break;
      case 'cart_reminder':
        console.log('🛒 [APP] Navigating to cart');
        // setCurrentScreen('cart');
        break;
      default:
        console.log('📱 [APP] Staying on current screen');
        break;
    }
  };

  // Función para guardar estadísticas de notificaciones en foreground
  const saveForegroundNotificationStats = async (messageId: string, type: string) => {
    try {
      const stats = {
        messageId,
        type,
        source: 'foreground',
        timestamp: new Date().toISOString(),
        processed: true
      };
      console.log('📊 [APP] Foreground notification stats saved:', stats);
    } catch (error) {
      console.error('❌ [APP] Error saving foreground notification stats:', error);
    }
  };

  const renderCurrentScreen = () => {
    return <CounterM3Screen />;
  };

  // Mostrar splash global antes de cualquier pantalla
  if (showGlobalSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          setShowGlobalSplash(false);
          console.log('✅ [APP] Splash screen finalizado por callback');
        }}
        duration={3500}
        showProgress={true}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {renderCurrentScreen()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({});
