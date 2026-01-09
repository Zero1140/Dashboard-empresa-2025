/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {App} from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';

console.log('🚀 [INDEX] Starting app registration...');

// PASO CRÍTICO: Configurar handler de background INMEDIATAMENTE
console.log('🔧 [INDEX] Setting up background message handler IMMEDIATELY...');

// Configurar handler de background ANTES de cualquier otra cosa
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📨 [INDEX] Background message received:', {
    messageId: remoteMessage.messageId,
    from: remoteMessage.from,
    notification: remoteMessage.notification ? {
      title: remoteMessage.notification.title,
      body: remoteMessage.notification.body
    } : null,
    data: remoteMessage.data
  });
  
  try {
    // PROCESAR MENSAJE COMPLETO
    await processBackgroundMessage(remoteMessage);
    console.log('✅ [INDEX] Background message processed successfully');
  } catch (error) {
    console.error('❌ [INDEX] Error processing background message:', error);
  }
});

// Función para procesar mensajes en background
const processBackgroundMessage = async (remoteMessage) => {
  const { messageId, notification, data } = remoteMessage;
  
  // 1. Determinar tipo de mensaje
  const messageType = data?.type || 'general';
  console.log('🔍 [INDEX] Processing message type:', messageType);
  
  // 2. Extraer información del mensaje
  const title = notification?.title || data?.title || 'Notificación GST3D';
  const body = notification?.body || data?.body || data?.message || 'Mensaje recibido';
  
  // 3. Procesar según el tipo
  switch (messageType) {
    case 'order_update':
      console.log('📦 [INDEX] Processing order update notification');
      await handleOrderUpdate(data);
      break;
    case 'promotion':
      console.log('🎯 [INDEX] Processing promotion notification');
      await handlePromotion(data);
      break;
    case 'cart_reminder':
      console.log('🛒 [INDEX] Processing cart reminder notification');
      await handleCartReminder(data);
      break;
    default:
      console.log('📱 [INDEX] Processing general notification');
      await handleGeneralNotification(data);
      break;
  }
  
  // 4. Guardar estadísticas
  await saveNotificationStats(messageId, messageType, 'background');
};

// Handlers específicos para cada tipo de mensaje
const handleOrderUpdate = async (data) => {
  console.log('📦 [INDEX] Order update data:', data);
  // Aquí se puede agregar lógica específica para actualizaciones de pedidos
};

const handlePromotion = async (data) => {
  console.log('🎯 [INDEX] Promotion data:', data);
  // Aquí se puede agregar lógica específica para promociones
};

const handleCartReminder = async (data) => {
  console.log('🛒 [INDEX] Cart reminder data:', data);
  // Aquí se puede agregar lógica específica para recordatorios de carrito
};

const handleGeneralNotification = async (data) => {
  console.log('📱 [INDEX] General notification data:', data);
  // Aquí se puede agregar lógica general
};

const saveNotificationStats = async (messageId, type, source) => {
  try {
    // Guardar estadísticas de notificaciones recibidas
    const stats = {
      messageId,
      type,
      source,
      timestamp: new Date().toISOString(),
      processed: true
    };
    console.log('📊 [INDEX] Notification stats saved:', stats);
  } catch (error) {
    console.error('❌ [INDEX] Error saving notification stats:', error);
  }
};

console.log('✅ [INDEX] Background message handler configured');

// Manejar renovación automática de tokens (iOS y Android)
console.log('🔄 [INDEX] Setting up token refresh handler...');
messaging().onTokenRefresh(async (token) => {
  console.log('🔄 [INDEX] Token FCM renovado:', token.substring(0, 20) + '...');
  
  // ✅ MEJORA: Guardar token localmente primero
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('fcm_token', token);
    await AsyncStorage.setItem('fcm_token_timestamp', Date.now().toString());
    await AsyncStorage.setItem('fcm_token_registered', 'false'); // Marcar como pendiente
    await AsyncStorage.setItem('fcm_token_retry_count', '0');
    console.log('✅ [INDEX] Token renovado guardado localmente');
  } catch (error) {
    console.error('❌ [INDEX] Error guardando token renovado localmente:', error);
  }
  
  try {
    // Registrar nuevo token automáticamente en servidor
    const { Platform } = require('react-native');
    const { API_CONFIG, getApiHeaders } = require('./src/config/constants');
    
    const payload = {
      token: token,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      source: 'token_refresh_auto',
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
      // ✅ Marcar como registrado
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('fcm_token_registered', 'true');
      console.log('✅ [INDEX] Token renovado registrado en servidor');
    } else {
      console.error('❌ [INDEX] Error registrando token renovado:', response.status);
      console.warn('⚠️ [INDEX] Token guardado localmente - se reintentará automáticamente');
    }
  } catch (error) {
    console.error('❌ [INDEX] Error procesando token refresh:', error);
    console.warn('⚠️ [INDEX] Token guardado localmente - se reintentará automáticamente');
  }
});

console.log('✅ [INDEX] Token refresh handler configured');

// Registrar la app inmediatamente después del handler
console.log('📱 [INDEX] Registering app component:', appName);
AppRegistry.registerComponent(appName, () => App);
console.log('✅ [INDEX] App registration completed');
