import React, { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import CookieManager, { Cookies } from '@react-native-cookies/cookies';
import messaging from '@react-native-firebase/messaging';
import { AppState, AppStateStatus, PermissionsAndroid, Platform, Text, View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { SafePermissions } from '../../utils/SafePermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShopifyCookieAnalyzer } from '../../utils/shopifyCookieAnalyzer';
import { ShopifyCookieAnalysis } from '../../types/shopify';
import { useShopifyCustomer } from '../../hooks/useShopifyCustomer';
import DiagnosticScreen from './DiagnosticScreen';
// El registro de tokens lo maneja App.tsx con la lógica exacta de FCMStatusMonitorScreen

// Función para solicitar permisos de ubicación y notificaciones
async function requestPermissions() {
  console.log('🔐 Solicitando permisos de ubicación y notificaciones...');
  
  if (Platform.OS === 'android') {
    try {
      // Permisos de ubicación ya no necesarios - usamos detección por IP
      console.log('✅ Ubicación: Detectada automáticamente por IP (sin permisos GPS)');

      // Solicitar permisos de notificaciones (Android 13+)
      let notificationPermission = 'granted';
      if (Platform.Version >= 33) {
        notificationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Permiso de Notificaciones',
            message: 'GST3D necesita enviar notificaciones para mantenerte informado sobre ofertas y novedades.',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );
      }

      console.log('✅ Ubicación: Detectada por IP');
      console.log('🔔 Permiso de notificaciones:', notificationPermission);

      if (notificationPermission === 'granted') {
        console.log('✅ Todos los permisos concedidos');
        return true;
      } else {
        console.log('⚠️ Permisos de notificaciones denegados');
        Alert.alert(
          'Permisos Requeridos',
          'Para una mejor experiencia, GST3D necesita permisos de notificaciones. La ubicación se detecta automáticamente por IP.',
          [{ text: 'Entendido' }]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  }
  
  return true; // iOS maneja permisos automáticamente
}

async function loadCookies(url: string) {
  const cookies = await AsyncStorage.getItem('cookies');
  if (cookies) {
    const parsedCookies = JSON.parse(cookies);
    Object.entries(parsedCookies).forEach(([name, cookie]) => {
      const cookieData = cookie as any;
      CookieManager.set(url, {
        name,
        value: cookieData.value,
        domain: cookieData.domain,
        path: cookieData.path,
        version: cookieData.version,
        expires: cookieData.expires,
      });
    });
  }
}

export const CounterM3Screen = () => {
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState as AppStateStatus);
  const watchdogTimeout = useRef<NodeJS.Timeout | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewReady, setWebViewReady] = useState(false);
  const [isConnectedToFCM, setIsConnectedToFCM] = useState(false);
  const [shopifyAnalysis, setShopifyAnalysis] = useState<ShopifyCookieAnalysis | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const [logs, setLogs] = useState('');
  const [logsFcm, setLogsFcm] = useState('');
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const SITE = 'https://gst3d.eu';

  // Usar el hook de Shopify
  const { 
    customerInfo, 
    isDetecting, 
    error, 
    detectCustomer, 
    clearCustomer 
  } = useShopifyCustomer();

  // Función para persistir cookies
  const persistCookies = async (cookies: Cookies) => {
    await AsyncStorage.setItem('cookies', JSON.stringify(cookies));
  };

  // Analizar cookies de Shopify
  const analyzeShopifyCookies = async (): Promise<ShopifyCookieAnalysis | null> => {
    try {
      const cookies = await CookieManager.get(SITE, true);
      const analysis = ShopifyCookieAnalyzer.analyzeCookies(cookies);
      
      setShopifyAnalysis(analysis);
      setLogs((prevLogs) => prevLogs + '\n' + `Shopify analysis: Customer ${analysis.customerId || 'none'}, Authenticated: ${analysis.isCustomerSignedIn}`);
      
      return analysis;
    } catch (error) {
      setLogs((prevLogs) => prevLogs + '\n' + `Error analyzing Shopify cookies: ${(error as Error).message}`);
      return null;
    }
  };

  // useEffect principal con manejo de errores mejorado
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Inicializando aplicación...');
        console.log('📱 Estado inicial - webViewLoading:', webViewLoading, 'webViewReady:', webViewReady);
        setLogs('🔄 Inicializando aplicación...');
        
        // 0. Solicitar permisos de ubicación y notificaciones
        setLogs(prevLogs => prevLogs + '\n🔐 Solicitando permisos...');
        const permissionsGranted = await requestPermissions();
        if (permissionsGranted) {
          setLogs(prevLogs => prevLogs + '\n✅ Permisos concedidos');
        } else {
          setLogs(prevLogs => prevLogs + '\n⚠️ Algunos permisos fueron denegados');
        }
        
        // 1. Cargar cookies
        await loadCookies(SITE);
        setLogs(prevLogs => prevLogs + '\n✅ Cookies cargadas exitosamente');
        
        // 2. Obtener token FCM (sin registrar - el registro lo maneja App.tsx con lógica de FCMStatusMonitorScreen)
        setLogsFcm('🔄 Obteniendo token FCM...');
        try {
          const token = await messaging().getToken();
          if (token) {
            setFcmToken(token);
            setLogsFcm('✅ Token FCM obtenido');
            setLogs(prevLogs => prevLogs + '\n✅ Token FCM obtenido exitosamente');
            setIsConnectedToFCM(true);
            
            // El registro en servidor lo maneja App.tsx con la lógica exacta de FCMStatusMonitorScreen
            console.log('ℹ️ [COUNTER] Token obtenido - El registro lo maneja App.tsx');
          } else {
            setLogsFcm('❌ No se pudo obtener token FCM');
            setLogs(prevLogs => prevLogs + '\n❌ Error al obtener token FCM');
          }
        } catch (error) {
          setLogsFcm('❌ Falló al obtener token FCM');
          setLogs(prevLogs => prevLogs + '\n❌ Error al obtener token FCM: ' + (error as Error).message);
        }
        
        // 4. Continuar con detección de customer
        setLogs(prevLogs => prevLogs + '\n🔄 Analizando cookies de Shopify...');
        const analysis = await analyzeShopifyCookies();
        
        if (analysis && ShopifyCookieAnalyzer.isCustomerAuthenticated(analysis)) {
          setLogs(prevLogs => prevLogs + '\n🔄 Detectando cliente...');
          await detectCustomer();
          setLogs(prevLogs => prevLogs + '\n✅ Cliente detectado');
        } else {
          setLogs(prevLogs => prevLogs + '\nℹ️ Usuario anónimo');
        }
        
        setLogs(prevLogs => prevLogs + '\n✅ Inicialización completada');
        
      } catch (error) {
        const errorMessage = (error as Error).message;
        setLogs(prevLogs => prevLogs + '\n❌ Error en inicialización: ' + errorMessage);
        setLogsFcm('❌ Error en inicialización');
        
        // Intentar continuar sin FCM si es posible
        console.warn('App initialized with errors, but continuing...');
        setLogs(prevLogs => prevLogs + '\n⚠️ Continuando con errores...');
      }
    };

    initializeApp();
  }, []);

  // Watchdog de reanudación: al volver a foreground, comprobar que el WebView responde
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Programar watchdog: si no responde en X ms, remontar/reload
        if (watchdogTimeout.current) {
          clearTimeout(watchdogTimeout.current);
        }
        watchdogTimeout.current = setTimeout(() => {
          console.warn('WebView no responde tras reanudar → remontando');
          setWebViewKey(prev => prev + 1);
        }, 1500);

        // Sonda de vida: pedir respuesta desde el WebView
        try {
          // @ts-ignore - RN WebView
          webViewRef.current?.injectJavaScript(`
            try {
              if (document && document.body && window && window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('WEBVIEW_ALIVE');
              }
            } catch (e) {}
          `);
        } catch (e) {
          // Si inyección falla, forzar remontaje
          console.warn('Fallo al inyectar sonda en WebView, remontando');
          setWebViewKey(prev => prev + 1);
        }
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (watchdogTimeout.current) {
        clearTimeout(watchdogTimeout.current);
      }
    };
  }, []);

  // Activar push cuando se detecta cliente
  useEffect(() => {
    if (customerInfo && !isConnectedToFCM) {
      // Simplemente marcar como conectado cuando hay cliente
      setIsConnectedToFCM(true);
      setLogs((prevLogs) => prevLogs + '\n' + `Push notifications activated for customer: ${customerInfo.email}`);
    }
  }, [customerInfo, isConnectedToFCM]);

  // Manejo de mensajes FCM en primer plano lo centraliza App.tsx

  // Cambio de navegación
  const onNavigationStateChange = async (navState: any) => {
    const url = navState.url;
    
    if (
      url.includes('/account') ||
      url.includes('/login') ||
      url.includes('/logout') ||
      url.includes('/register') ||
      url === 'https://gst3d.eu/' ||
      url === 'https://gst3d.eu'
    ) {
      setTimeout(async () => {
        try {
          const analysis = await analyzeShopifyCookies();
          
          if (analysis) {
            const isAuthenticated = ShopifyCookieAnalyzer.isCustomerAuthenticated(analysis);
            
            setLogsFcm(`Customer authenticated: ${isAuthenticated}, ID: ${analysis.customerId}`);
            
            if (isAuthenticated) {
              await detectCustomer();
            } else if (isConnectedToFCM) {
              setIsConnectedToFCM(false);
              clearCustomer();
              setLogs((prevLogs) => prevLogs + '\n' + 'Customer logged out, FCM disconnected');
            }
          }
        } catch (error) {
          setLogs((prevLogs) => prevLogs + '\n' + `Error in navigation change: ${(error as Error).message}`);
        }
      }, 1500);
    }
  };

  console.log('🔍 Renderizando - webViewLoading:', webViewLoading, 'webViewReady:', webViewReady);

  if (showDiagnostic) {
    return <DiagnosticScreen onBack={() => setShowDiagnostic(false)} />;
  }

  return (
    <>
      {/* Botón de diagnóstico flotante - visible solo en desarrollo */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.diagnosticButton}
          onPress={() => setShowDiagnostic(true)}
        >
          <Text style={styles.diagnosticButtonText}>🔍</Text>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1 }}>
          {/* Barra de estado del cliente */}
          {customerInfo && (
            <View style={{
              backgroundColor: '#e8f5e8',
              padding: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#4CAF50'
            }}>
              <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: 'bold' }}>
                👤 {customerInfo.displayName || customerInfo.email} | 
                🔔 FCM: {isConnectedToFCM ? 'Activo' : 'Inactivo'} |
                🔍 Detectando: {isDetecting ? 'Sí' : 'No'}
              </Text>
            </View>
          )}
          
          {/* Indicador de error */}
          {error && (
            <View style={{
              backgroundColor: '#ffebee',
              padding: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#f44336'
            }}>
              <Text style={{ fontSize: 12, color: '#c62828' }}>
                ❌ Error: {error}
              </Text>
            </View>
          )}
          
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ uri: SITE }}
            originWhitelist={['*']}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={true}
            webviewDebuggingEnabled={__DEV__}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            allowsBackForwardNavigationGestures={true}
            // ASEGURAR QUE NO INTERFIERA CON NOTIFICACIONES
            onShouldStartLoadWithRequest={() => true}
            onMessage={(event) => {
              const data = event.nativeEvent?.data;
              if (data === 'WEBVIEW_ALIVE') {
                console.log('WebView responde → OK');
                setWebViewReady(true);
                if (watchdogTimeout.current) {
                  clearTimeout(watchdogTimeout.current);
                  watchdogTimeout.current = null;
                }
                return;
              }
              // Mensajes generales del WebView
              console.log('📱 WebView message:', data);
            }}
            onNavigationStateChange={onNavigationStateChange}
            onLoadStart={() => {
              console.log('🚀 WebView empezó a cargar...');
              setWebViewLoading(true);
              setWebViewReady(false);
            }}
            onLoadEnd={() => {
              console.log('✅ WebView terminó de cargar completamente');
              setWebViewLoading(false);
              setWebViewReady(true);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('❌ WebView error: ', nativeEvent);
              setWebViewLoading(false);
              setWebViewReady(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('❌ WebView HTTP error: ', nativeEvent);
              setWebViewLoading(false);
              setWebViewReady(false);
            }}
            // ✅ UNIFICADO: Funciona en Android E iOS (desde RN WebView 11.23+)
            onRenderProcessGone={(event) => {
              const { nativeEvent } = event;
              console.warn('WebView process gone!', { 
                platform: Platform.OS, 
                ...nativeEvent 
              });
              
              // Estrategia unificada para ambas plataformas
              if (webViewRef.current) {
                try {
                  // @ts-ignore - reload existe en WebView pero TypeScript no lo detecta correctamente
                  webViewRef.current.reload();
                  console.log(`✅ [${Platform.OS}] WebView reloaded after process termination`);
                } catch (error) {
                  console.error(`❌ [${Platform.OS}] Error reloading WebView:`, error);
                  // Si reload falla, remontar completamente
                  setWebViewKey(prev => prev + 1);
                }
              } else {
                // Si no hay ref, remontar directamente
                setWebViewKey(prev => prev + 1);
              }
            }}
            style={{ flex: 1 }}
          />
        </View>
    </>
  );
};

const styles = StyleSheet.create({
  diagnosticButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#FF5722',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 9999,
  },
  diagnosticButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});