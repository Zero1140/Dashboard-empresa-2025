import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  RefreshControl,
  Clipboard,
  NativeModules,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { SafePermissions } from '../../utils/SafePermissions';
import { API_CONFIG, getApiHeaders, debugLog } from '../../config/constants';

const { FCMLogModule } = NativeModules;

interface DiagnosticLog {
  message: string;
  type: string;
  timestamp: string;
  details?: string;
  level?: string;
}

const FCMStatusMonitorScreen: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [networkStatus, setNetworkStatus] = useState<string>('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const [nativeLogs, setNativeLogs] = useState<DiagnosticLog[]>([]);

  // DEBUG: Log inicial del componente
  console.log('📊 [FCM_MONITOR] ===========================================');
  console.log('📊 [FCM_MONITOR] FCMStatusMonitorScreen component loaded!');
  console.log('📊 [FCM_MONITOR] This is the main screen!');
  console.log('📊 [FCM_MONITOR] ===========================================');

  const addDiagnostic = (message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDiagnostics((prev) => [...prev, { message, type, timestamp }]);
  };

  const clearDiagnostics = () => {
    setDiagnostics([]);
    setNativeLogs([]);
    // Limpiar logs nativos también
    if (FCMLogModule) {
      FCMLogModule.clearLogs().catch((err: any) => {
        console.error('Error clearing native logs:', err);
      });
    }
  };

  // Función para cargar logs nativos de Android
  const loadNativeLogs = async () => {
    if (!FCMLogModule) {
      console.warn('FCMLogModule not available');
      return;
    }
    
    try {
      const logsJson = await FCMLogModule.getLogs();
      const logs = JSON.parse(logsJson) || [];
      
      const formattedLogs: DiagnosticLog[] = logs.map((log: any) => ({
        message: log.message || '',
        type: log.level || 'info', // mapear level a type para compatibilidad
        timestamp: log.timestamp || '',
        details: log.details || '',
        level: log.level || 'info',
      }));
      
      setNativeLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading native logs:', error);
    }
  };

  const copyLogs = () => {
    const logsText = diagnostics.map(d => 
      `[${d.timestamp}] ${d.message}`
    ).join('\n');
    
    Clipboard.setString(logsText);
    
    Alert.alert(
      'Logs Copiados',
      'Todos los logs han sido copiados al portapapeles',
      [{ text: 'OK' }]
    );
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await runFullDiagnostic();
    setIsRefreshing(false);
  };

  const runFullDiagnostic = async (clearPreviousLogs: boolean = true) => {
    setIsRunning(true);
    if (clearPreviousLogs) {
      clearDiagnostics();
    }
    setLastUpdate(new Date().toLocaleTimeString());
    
    addDiagnostic('🔍 Iniciando diagnóstico completo de FCM...', 'info');
    
    try {
      // 1. Verificar permisos
      await checkPermissions();
      
      // 2. Verificar Firebase
      await checkFirebase();
      
      // 3. Verificar conectividad
      await checkConnectivity();
      
      // 4. Verificar token FCM
      await checkFCMToken();
      
      // 5. Intentar registro de token
      await testTokenRegistration();
      
      // 6. Verificar estado del servidor
      await checkServerStatus();
      
      addDiagnostic('✅ Diagnóstico completado', 'success');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error durante diagnóstico: ${errorMessage}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const checkPermissions = async () => {
    addDiagnostic('🔐 Verificando permisos...', 'info');
    
    try {
      if (Platform.OS === 'android') {
        // Usar la nueva función inteligente de permisos
        const permissions = await SafePermissions.checkSmartPermissions();
        
        setPermissions(permissions);
        
        // Verificar permisos específicos
        const notificationPermission = permissions[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS];
        
        if (notificationPermission) {
          addDiagnostic('✅ Permisos de notificaciones: CONCEDIDOS', 'success');
        } else {
          addDiagnostic('❌ Permisos de notificaciones: DENEGADOS', 'error');
        }
        
        // INTERNET es implícito en Android, no se verifica
        addDiagnostic('✅ Permisos de internet: IMPLÍCITO (siempre concedido)', 'success');
        
        // Permisos de ubicación ya no necesarios con detección por IP
        addDiagnostic('✅ Ubicación: Detectada por IP (sin permisos GPS)', 'success');
        
        // Mostrar estado general de permisos
        const allGranted = Object.values(permissions).every(p => p);
        if (allGranted) {
          addDiagnostic('✅ Todos los permisos están concedidos', 'success');
        } else {
          addDiagnostic('⚠️ Algunos permisos pueden estar denegados', 'warning');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error verificando permisos: ${errorMessage}`, 'error');
    }
  };

  const checkFirebase = async () => {
    addDiagnostic('🔥 Verificando Firebase...', 'info');
    
    try {
      // En SDKs recientes, hasPermission/isDeviceSupported no existen.
      // Validamos operatividad llamando a getToken.
      const testToken = await messaging().getToken();
      if (testToken) {
        addDiagnostic('✅ Firebase Messaging operativo (getToken OK)', 'success');
      } else {
        addDiagnostic('⚠️ Firebase Messaging sin token (revisar permisos/red)', 'warning');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error verificando Firebase: ${errorMessage}`, 'error');
    }
  };

  const checkConnectivity = async () => {
    addDiagnostic('🌐 Verificando conectividad con servidor...', 'info');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(API_CONFIG.FULL_HEALTH_URL, {
        method: 'GET',
        headers: getApiHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        addDiagnostic('✅ Conectividad: ACTIVA', 'success');
        addDiagnostic('✅ Servidor: ACCESIBLE', 'success');
        addDiagnostic(`📊 Estado: ${data.status}`, 'info');
        addDiagnostic(`📊 Uptime: ${Math.floor(data.uptime / 60)} minutos`, 'info');
        addDiagnostic(`📊 Tokens registrados: ${data.tokens}`, 'info');
        setNetworkStatus('connected');
        setServerResponse(data);
      } else {
        addDiagnostic(`⚠️ Servidor respondió con error: ${response.status}`, 'warning');
        setNetworkStatus('disconnected');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error de conectividad: ${errorMessage}`, 'error');
      addDiagnostic('💡 Posibles causas:', 'error');
      addDiagnostic('   • Sin conexión a internet', 'error');
      addDiagnostic('   • Servidor temporalmente no disponible', 'error');
      addDiagnostic('   • Firewall bloqueando conexión', 'error');
      setNetworkStatus('error');
    }
  };

  const checkFCMToken = async () => {
    addDiagnostic('🔑 Verificando token FCM...', 'info');
    
    try {
      const token = await messaging().getToken();
      
      if (token) {
        setFcmToken(token);
        addDiagnostic('✅ Token FCM: OBTENIDO', 'success');
        addDiagnostic(`📋 Token: ${token.substring(0, 20)}...`, 'info');
        addDiagnostic(`📏 Longitud del token: ${token.length} caracteres`, 'info');
      } else {
        addDiagnostic('❌ Token FCM: NO OBTENIDO', 'error');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error obteniendo token FCM: ${errorMessage}`, 'error');
    }
  };

  const requestPermissions = async () => {
    addDiagnostic('🔐 Solicitando permisos...', 'info');
    
    try {
      if (Platform.OS === 'android') {
        // Solicitar permisos de notificaciones
        const notificationResult = await SafePermissions.requestPermission(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Permisos de Notificaciones',
            message: 'Esta app necesita permisos para enviar notificaciones push',
            buttonNeutral: 'Preguntar más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );
        
        if (notificationResult === PermissionsAndroid.RESULTS.GRANTED) {
          addDiagnostic('✅ Permisos de notificaciones: CONCEDIDOS', 'success');
        } else {
          addDiagnostic('❌ Permisos de notificaciones: DENEGADOS', 'error');
        }
        
        // Permisos de ubicación ya no necesarios con detección por IP
        addDiagnostic('✅ Ubicación: Detectada automáticamente por IP', 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error solicitando permisos: ${errorMessage}`, 'error');
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const testTokenRegistration = async () => {
    // Obtener token FCM si no está disponible
    let tokenToRegister = fcmToken;
    
    if (!tokenToRegister) {
      addDiagnostic('🔑 Obteniendo token FCM...', 'info');
      try {
        tokenToRegister = await messaging().getToken();
        if (tokenToRegister) {
          setFcmToken(tokenToRegister);
          addDiagnostic('✅ Token obtenido', 'success');
          addDiagnostic(`🔑 Token completo: ${tokenToRegister}`, 'info');
        } else {
          addDiagnostic('⚠️ No se pudo obtener token FCM', 'warning');
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addDiagnostic(`❌ Error obteniendo token: ${errorMessage}`, 'error');
        return;
      }
    }
    
    addDiagnostic('═══════════════════════════════════════', 'info');
    addDiagnostic('📤 REGISTRO DETALLADO EN SERVIDOR', 'info');
    addDiagnostic('═══════════════════════════════════════', 'info');
    addDiagnostic(`🌐 URL: https://gst3d-push-server-g.onrender.com/api/push/token`, 'info');
    addDiagnostic(`🔑 Token inicio: ${tokenToRegister.substring(0, 30)}...`, 'info');
    addDiagnostic(`📏 Longitud: ${tokenToRegister.length} chars`, 'info');
    addDiagnostic(`📱 Plataforma: ${Platform.OS}`, 'info');
    addDiagnostic(`📱 Versión: ${Platform.Version}`, 'info');
    
    try {
      const payload = {
        token: tokenToRegister,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        source: 'fcm_monitor_detailed_test',
        customerId: 'app_user',
        email: 'user@gst3d.eu',
        deviceInfo: {
          model: Platform.OS,
          version: Platform.Version,
          timestamp: new Date().toISOString()
        }
      };

      addDiagnostic('📦 Payload creado, enviando...', 'info');
      addDiagnostic(`📋 Payload size: ${JSON.stringify(payload).length} bytes`, 'info');
      
      // Logs detallados ANTES del fetch
      console.log('🔴 [FCM_MONITOR] ===== ANTES DEL FETCH =====');
      console.log('🔴 [FCM_MONITOR] URL:', API_CONFIG.FULL_TOKEN_URL);
      console.log('🔴 [FCM_MONITOR] Headers:', getApiHeaders());
      console.log('🔴 [FCM_MONITOR] Payload:', JSON.stringify(payload));
      console.log('🔴 [FCM_MONITOR] Ejecutando fetch...');
      addDiagnostic(`🔴 URL: ${API_CONFIG.FULL_TOKEN_URL}`, 'info');
      addDiagnostic('🔴 Ejecutando fetch...', 'info');
      
      const startTime = Date.now();
      const response = await fetch(API_CONFIG.FULL_TOKEN_URL, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload)
      });
      console.log('🟢 [FCM_MONITOR] Fetch completado - Status:', response.status);
      const endTime = Date.now();
      const duration = endTime - startTime;

      addDiagnostic(`⏱️ Tiempo respuesta: ${duration}ms`, 'info');
      addDiagnostic(`📥 Status: ${response.status} ${response.statusText}`, 'info');
      addDiagnostic(`📥 OK: ${response.ok}`, 'info');

      if (response.ok) {
        const result = await response.json();
        addDiagnostic('═══════════════════════════════════════', 'success');
        addDiagnostic('✅ TOKEN REGISTRADO EXITOSAMENTE', 'success');
        addDiagnostic('═══════════════════════════════════════', 'success');
        addDiagnostic(`📊 Status: ${result.status}`, 'success');
        addDiagnostic(`📊 Mensaje: ${result.message}`, 'success');
        
        // Mostrar país detectado
        if (result.data?.country) {
          addDiagnostic(`🌍 País detectado: ${result.data.country}`, 'info');
          addDiagnostic(`📍 País completo: ${result.data.countryName}`, 'info');
          addDiagnostic(`🏙️ Ciudad: ${result.data.city}`, 'info');
        }
        
        addDiagnostic(`📊 Respuesta: ${JSON.stringify(result)}`, 'success');
        setServerResponse(result);
      } else {
        const errorText = await response.text();
        addDiagnostic('═══════════════════════════════════════', 'error');
        addDiagnostic('❌ ERROR EN REGISTRO', 'error');
        addDiagnostic('═══════════════════════════════════════', 'error');
        addDiagnostic(`📊 Status Code: ${response.status}`, 'error');
        addDiagnostic(`📊 Error del servidor: ${errorText}`, 'error');
        
        if (response.status === 403) {
          addDiagnostic('💡 Token Bearer inválido', 'warning');
        } else if (response.status === 404) {
          addDiagnostic('💡 Endpoint no existe', 'warning');
        } else if (response.status === 500) {
          addDiagnostic('💡 Error interno servidor', 'warning');
        } else if (!response.status) {
          addDiagnostic('💡 SIN CONEXIÓN AL SERVIDOR', 'warning');
          addDiagnostic('   • Verifica internet', 'warning');
          addDiagnostic('   • Servidor puede estar caído', 'warning');
        }
      }
      
    } catch (error) {
      console.error('🔴 [FCM_MONITOR] ===== ERROR EN PETICIÓN =====');
      console.error('🔴 [FCM_MONITOR] Error completo:', error);
      
      addDiagnostic('═══════════════════════════════════════', 'error');
      addDiagnostic('❌ ERROR EN PETICIÓN (EXCEPCIÓN)', 'error');
      addDiagnostic('═══════════════════════════════════════', 'error');
      
      // Información detallada del error
      const errorType = error instanceof Error ? error.constructor.name : typeof error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      addDiagnostic(`📋 Tipo error: ${errorType}`, 'error');
      addDiagnostic(`📋 Mensaje: ${errorMessage}`, 'error');
      addDiagnostic(`📋 Detalles: ${JSON.stringify(error)}`, 'error');
      
      if (error instanceof Error && error.stack) {
        const stackPreview = error.stack.substring(0, 500);
        addDiagnostic(`📋 Stack trace: ${stackPreview}`, 'error');
      }
      
      // Análisis específico del error
      if (error instanceof Error && error.message.includes('Network request failed')) {
        addDiagnostic('💡 CAUSA PROBABLE: FALLO DE RED', 'warning');
        addDiagnostic('   • Dispositivo sin internet', 'warning');
        addDiagnostic('   • Firewall bloqueando HTTPS', 'warning');
        addDiagnostic('   • Operador bloqueando conexiones', 'warning');
        addDiagnostic('   • Servidor dormido/caído', 'warning');
        addDiagnostic('   • DNS no resuelve dominio', 'warning');
      } else if (error instanceof Error && error.message.includes('timeout')) {
        addDiagnostic('💡 CAUSA PROBABLE: TIMEOUT', 'warning');
        addDiagnostic('   • Servidor lento en responder', 'warning');
        addDiagnostic('   • Render en cold start', 'warning');
        addDiagnostic('   • Red muy lenta', 'warning');
      } else if (error instanceof Error && error.message.includes('Aborted')) {
        addDiagnostic('💡 CAUSA PROBABLE: CANCELADO', 'warning');
        addDiagnostic('   • Timeout muy corto', 'warning');
        addDiagnostic('   • Petición abortada manualmente', 'warning');
      } else if (error instanceof Error && error.message.includes('Failed to fetch')) {
        addDiagnostic('💡 CAUSA PROBABLE: SIN CONEXIÓN', 'warning');
        addDiagnostic('   • Servidor no alcanzable', 'warning');
        addDiagnostic('   • URL incorrecta', 'warning');
        addDiagnostic('   • Puerto bloqueado', 'warning');
      }
      
      // Información adicional
      addDiagnostic('═══════════════════════════════════════', 'info');
      addDiagnostic('📊 INFORMACIÓN DE DIAGNÓSTICO:', 'info');
      addDiagnostic(`URL: ${API_CONFIG.FULL_TOKEN_URL}`, 'info');
      addDiagnostic(`Headers: ${JSON.stringify(getApiHeaders())}`, 'info');
      addDiagnostic(`Platform: ${Platform.OS} ${Platform.Version}`, 'info');
      addDiagnostic(`Timestamp: ${new Date().toISOString()}`, 'info');
    }
  };

  const checkServerStatus = async () => {
    addDiagnostic('🖥️ Verificando estado del servidor...', 'info');
    
    try {
      const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.TOKENS_INFO_ENDPOINT, {
        method: 'GET',
        headers: getApiHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        addDiagnostic('✅ Estado del servidor: DISPONIBLE', 'success');
        addDiagnostic(`📊 Servidor activo desde: ${data.uptime || 'N/A'}`, 'info');
        addDiagnostic(`📈 Tokens registrados: ${data.registeredTokens || 'N/A'}`, 'info');
      } else {
        addDiagnostic(`⚠️ Estado del servidor: ${response.status}`, 'warning');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDiagnostic(`❌ Error verificando estado: ${errorMessage}`, 'error');
    }
  };



  const getDiagnosticColor = (type: string) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      case 'error': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  // Cargar logs nativos periódicamente
  useEffect(() => {
    // Cargar logs inmediatamente
    loadNativeLogs();
    
    // Actualizar logs cada 2 segundos cuando la app está en foreground
    const interval = setInterval(() => {
      loadNativeLogs();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Ejecutar diagnóstico automáticamente al cargar
  useEffect(() => {
    console.log('🚀 [FCM_MONITOR] useEffect ejecutado - Iniciando diagnóstico automático');
    addDiagnostic('🚀 Iniciando registro automático de token...', 'info');
    
    // Ejecutar registro inmediatamente
    const initializeToken = async () => {
      try {
        addDiagnostic('═══════════════════════════════════════', 'info');
        addDiagnostic('🚀 INICIO DE REGISTRO AUTOMÁTICO', 'info');
        addDiagnostic('═══════════════════════════════════════', 'info');
        
        // Obtener token
        addDiagnostic('🔑 Obteniendo token FCM...', 'info');
        const token = await messaging().getToken();
        
        if (token) {
          setFcmToken(token);
          addDiagnostic('✅ Token FCM obtenido', 'success');
          addDiagnostic(`📏 Longitud del token: ${token.length} caracteres`, 'info');
          
          // Registrar en servidor inmediatamente
          addDiagnostic('═══════════════════════════════════════', 'info');
          addDiagnostic('📤 REGISTRANDO EN SERVIDOR', 'info');
          addDiagnostic('═══════════════════════════════════════', 'info');
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

          console.log('🔴 [FCM_MONITOR] ===== INICIO REGISTRO AUTOMÁTICO =====');
          console.log('🔴 [FCM_MONITOR] URL:', API_CONFIG.FULL_TOKEN_URL);
          console.log('🔴 [FCM_MONITOR] Ejecutando fetch automático...');
          
          // LOGS VISIBLES
          addDiagnostic('🔴 URL: https://gst3d-push-server-g.onrender.com/api/push/token', 'info');
          addDiagnostic('🔴 Ejecutando fetch en este momento...', 'info');
          addDiagnostic('⏳ Esperando respuesta del servidor...', 'info');
          
          const startTime = Date.now();
          const response = await fetch(API_CONFIG.FULL_TOKEN_URL, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(payload)
          });
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.log('🟢 [FCM_MONITOR] Fetch automático completado - Status:', response.status);
          addDiagnostic(`⏱️ Tiempo de respuesta: ${duration}ms`, 'info');
          addDiagnostic(`📊 Status Code: ${response.status}`, 'info');

          if (response.ok) {
            const result = await response.json();
            addDiagnostic('═══════════════════════════════════════', 'success');
            addDiagnostic('✅ TOKEN REGISTRADO AUTOMÁTICAMENTE', 'success');
            addDiagnostic('═══════════════════════════════════════', 'success');
            addDiagnostic(`📊 Mensaje: ${result.message}`, 'success');
            
            // Mostrar país detectado
            if (result.data?.country) {
              addDiagnostic(`🌍 País detectado: ${result.data.country}`, 'info');
              addDiagnostic(`📍 País: ${result.data.countryName}`, 'info');
              addDiagnostic(`🏙️ Ciudad: ${result.data.city}`, 'info');
            }
            
            setServerResponse(result);
          } else {
            addDiagnostic('═══════════════════════════════════════', 'error');
            addDiagnostic('❌ ERROR EN REGISTRO AUTOMÁTICO', 'error');
            addDiagnostic('═══════════════════════════════════════', 'error');
            addDiagnostic(`📊 Status Code: ${response.status}`, 'error');
            const errorText = await response.text();
            addDiagnostic(`📊 Error del servidor: ${errorText}`, 'error');
          }
        } else {
          addDiagnostic('❌ No se obtuvo token FCM', 'error');
        }
        
        // Ejecutar diagnóstico completo después (sin limpiar logs previos)
        await runFullDiagnostic(false);
      } catch (error) {
        console.error('🔴 [FCM_MONITOR] Error en inicialización automática:', error);
        
        addDiagnostic('═══════════════════════════════════════', 'error');
        addDiagnostic('❌ ERROR EN INICIALIZACIÓN AUTOMÁTICA', 'error');
        addDiagnostic('═══════════════════════════════════════', 'error');
        addDiagnostic(`Tipo: ${error instanceof Error ? error.constructor.name : typeof error}`, 'error');
        addDiagnostic(`Mensaje: ${error instanceof Error ? error.message : String(error)}`, 'error');
        addDiagnostic(`Stack: ${error instanceof Error ? (error.stack || 'N/A').substring(0, 300) : 'N/A'}`, 'error');
        
        // Intentar diagnóstico de todos modos (sin limpiar logs previos)
        await runFullDiagnostic(false);
      }
    };
    
    initializeToken();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Monitor FCM - Estado en Tiempo Real</Text>
        <Text style={styles.subtitle}>Última actualización: {lastUpdate || 'Nunca'}</Text>
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>✅ PANTALLA PRINCIPAL - MONITOR FCM ACTIVO</Text>
        </View>
        <View style={styles.debugBanner2}>
          <Text style={styles.debugText2}>🚀 ESTA ES LA PANTALLA CORRECTA - NO WEBVIEW</Text>
        </View>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>📊 Estado Actual:</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Token FCM:</Text>
          <Text style={[styles.statusValue, { color: fcmToken ? '#4CAF50' : '#F44336' }]}>
            {fcmToken ? '✅ Disponible' : '❌ No disponible'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Red:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(networkStatus) }]}>
            {networkStatus === 'connected' ? '✅ Conectada' : '❌ Desconectada'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Permisos:</Text>
          <Text style={[styles.statusValue, { color: Object.values(permissions).every(p => p) ? '#4CAF50' : '#FF9800' }]}>
            {Object.values(permissions).every(p => p) ? '✅ Todos concedidos' : '⚠️ Algunos denegados'}
          </Text>
        </View>
        {fcmToken && (
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>Token FCM:</Text>
            <Text style={styles.tokenText}>{fcmToken}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => runFullDiagnostic()}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🔄 Ejecutando...' : '🚀 Ejecutar Diagnóstico'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={requestPermissions}
        >
          <Text style={styles.buttonText}>🔐 Solicitar Permisos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={openSettings}
        >
          <Text style={styles.buttonText}>⚙️ Configuración</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearDiagnostics}
        >
          <Text style={styles.buttonText}>🗑️ Limpiar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: '#9C27B0' }]}
          onPress={copyLogs}
        >
          <Text style={styles.buttonText}>📋 Copiar Logs</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.diagnosticsContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {/* Logs nativos de Android */}
        {nativeLogs.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📱 Logs Nativos Android (Tiempo Real):</Text>
          </View>
        )}
        {nativeLogs.map((log, index) => (
          <View key={`native-${index}`} style={styles.diagnosticItem}>
            <Text style={[styles.diagnosticText, { color: getDiagnosticColor(log.level || log.type) }]}>
              [{log.timestamp}] {log.message}
            </Text>
            {log.details && (
              <Text style={[styles.diagnosticDetails, { color: getDiagnosticColor(log.level || log.type) }]}>
                {log.details}
              </Text>
            )}
          </View>
        ))}
        
        {/* Separador */}
        {nativeLogs.length > 0 && diagnostics.length > 0 && (
          <View style={styles.separator}>
            <Text style={styles.separatorText}>───────────────────────────</Text>
          </View>
        )}
        
        {/* Logs de React Native */}
        {diagnostics.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Logs de Diagnóstico:</Text>
          </View>
        )}
        {diagnostics.map((diagnostic, index) => (
          <View key={`diagnostic-${index}`} style={styles.diagnosticItem}>
            <Text style={[styles.diagnosticText, { color: getDiagnosticColor(diagnostic.type) }]}>
              [{diagnostic.timestamp}] {diagnostic.message}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  debugBanner: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  debugText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  debugBanner2: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  debugText2: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tokenText: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '48%',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  diagnosticsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diagnosticItem: {
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 14,
    lineHeight: 20,
  },
  diagnosticDetails: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  separator: {
    marginVertical: 16,
    alignItems: 'center',
  },
  separatorText: {
    color: '#999',
    fontSize: 12,
  },
});

export default FCMStatusMonitorScreen;
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  debugText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  debugBanner2: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  debugText2: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tokenText: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '48%',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  diagnosticsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diagnosticItem: {
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 14,
    lineHeight: 20,
  },
  diagnosticDetails: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  separator: {
    marginVertical: 16,
    alignItems: 'center',
  },
  separatorText: {
    color: '#999',
    fontSize: 12,
  },
});

export default FCMStatusMonitorScreen;
