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
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { API_CONFIG, getApiHeaders } from '../../config/constants';

const DiagnosticScreen = ({ onBack }: { onBack?: () => void }) => {
  const [diagnostics, setDiagnostics] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [networkStatus, setNetworkStatus] = useState('unknown');

  const addDiagnostic = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDiagnostics(prev => [...prev, { message, type, timestamp }]);
  };

  const clearDiagnostics = () => {
    setDiagnostics([]);
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    clearDiagnostics();
    
    addDiagnostic('🔍 Iniciando diagnóstico completo...', 'info');
    
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
      
      addDiagnostic('✅ Diagnóstico completado', 'success');
      
    } catch (error) {
      addDiagnostic(`❌ Error durante diagnóstico: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const checkPermissions = async () => {
    addDiagnostic('🔐 Verificando permisos...', 'info');
    
    try {
      if (Platform.OS === 'android') {
        // Verificar permisos de notificaciones
        const notificationPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        // Verificar permisos de ubicación - ya no necesario con detección por IP
        const locationPermission = true; // Siempre true con detección por IP
        
        setPermissions({
          notifications: notificationPermission,
          internet: true, // INTERNET es implícito, no se verifica
          location: locationPermission
        });
        
        if (notificationPermission) {
          addDiagnostic('✅ Permisos de notificaciones: CONCEDIDOS', 'success');
        } else {
          addDiagnostic('❌ Permisos de notificaciones: DENEGADOS', 'error');
        }
        
        // INTERNET es implícito en Android, no se verifica
        addDiagnostic('✅ Permisos de internet: IMPLÍCITO (siempre concedido)', 'success');
        
        // Ubicación detectada automáticamente por IP
        addDiagnostic('✅ Ubicación: Detectada por IP (sin permisos GPS)', 'success');
      }
    } catch (error) {
      addDiagnostic(`❌ Error verificando permisos: ${error.message}`, 'error');
    }
  };

  const checkFirebase = async () => {
    addDiagnostic('🔥 Verificando Firebase...', 'info');
    
    try {
      // En SDKs recientes, hasPermission/isDeviceSupported no existen.
      // Validamos funcionalidad intentando obtener un token temporalmente.
      const testToken = await messaging().getToken();
      if (testToken) {
        addDiagnostic('✅ Firebase Messaging operativo (getToken OK)', 'success');
      } else {
        addDiagnostic('⚠️ Firebase Messaging sin token (revisar permisos/red)', 'warning');
      }
      
    } catch (error) {
      addDiagnostic(`❌ Error verificando Firebase: ${error.message}`, 'error');
    }
  };

  const checkConnectivity = async () => {
    addDiagnostic('🌐 Verificando conectividad...', 'info');
    
    try {
      // Intentar conectar al servidor
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(API_CONFIG.FULL_HEALTH_URL, {
        method: 'GET',
        headers: getApiHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        addDiagnostic('✅ Servidor: ACCESIBLE', 'success');
        addDiagnostic(`📊 Estado del servidor: ${data.status}`, 'info');
        setNetworkStatus('connected');
      } else {
        addDiagnostic(`❌ Servidor: NO ACCESIBLE (${response.status})`, 'error');
        setNetworkStatus('disconnected');
      }
      
    } catch (error) {
      addDiagnostic(`❌ Error de conectividad: ${error.message}`, 'error');
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
      } else {
        addDiagnostic('❌ Token FCM: NO OBTENIDO', 'error');
      }
      
    } catch (error) {
      addDiagnostic(`❌ Error obteniendo token FCM: ${error.message}`, 'error');
    }
  };

  const testTokenRegistration = async () => {
    if (!fcmToken) {
      addDiagnostic('⚠️ No se puede probar registro sin token FCM', 'warning');
      return;
    }
    
    addDiagnostic('📤 Probando registro de token...', 'info');
    
    try {
      const payload = {
        token: fcmToken,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        source: 'diagnostic_test',
        customerId: 'diagnostic_user',
        email: 'diagnostic@example.com'
      };

      const response = await fetch(API_CONFIG.FULL_TOKEN_URL, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        addDiagnostic('✅ Token registrado: EXITOSO', 'success');
        addDiagnostic(`📊 Respuesta: ${result.message}`, 'info');
      } else {
        const errorText = await response.text();
        addDiagnostic(`❌ Error registrando token: ${response.status}`, 'error');
        addDiagnostic(`📋 Detalles: ${errorText}`, 'error');
      }
      
    } catch (error) {
      addDiagnostic(`❌ Error en registro: ${error.message}`, 'error');
    }
  };

  const requestPermissions = async () => {
    addDiagnostic('🔐 Solicitando permisos...', 'info');
    
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          // PermissionsAndroid.PERMISSIONS.INTERNET, // INTERNET es implícito, no se solicita
          // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
        ]);
        
        Object.entries(granted).forEach(([permission, status]) => {
          if (status === PermissionsAndroid.RESULTS.GRANTED) {
            addDiagnostic(`✅ Permiso ${permission}: CONCEDIDO`, 'success');
          } else {
            addDiagnostic(`❌ Permiso ${permission}: DENEGADO`, 'error');
          }
        });
      }
    } catch (error) {
      addDiagnostic(`❌ Error solicitando permisos: ${error.message}`, 'error');
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Configuración de la App',
      'Para configurar permisos manualmente:\n\n1. Ve a Configuración > Aplicaciones > GST3D\n2. Permisos > Conceder todos los permisos\n3. Batería > No optimizar\n4. Notificaciones > Permitir',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const getDiagnosticColor = (type) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔍 Diagnóstico de Notificaciones</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runFullDiagnostic}
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
      </View>
      
      <ScrollView style={styles.diagnosticsContainer}>
        {diagnostics.map((diagnostic, index) => (
          <View key={index} style={styles.diagnosticItem}>
            <Text style={[styles.diagnosticText, { color: getDiagnosticColor(diagnostic.type) }]}>
              [{diagnostic.timestamp}] {diagnostic.message}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>📊 Estado Actual:</Text>
        <Text style={styles.statusText}>Token FCM: {fcmToken ? '✅ Disponible' : '❌ No disponible'}</Text>
        <Text style={styles.statusText}>Red: {networkStatus === 'connected' ? '✅ Conectada' : '❌ Desconectada'}</Text>
        <Text style={styles.statusText}>Permisos: {Object.values(permissions).every(p => p) ? '✅ Todos concedidos' : '⚠️ Algunos denegados'}</Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  diagnosticItem: {
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
});

export default DiagnosticScreen;