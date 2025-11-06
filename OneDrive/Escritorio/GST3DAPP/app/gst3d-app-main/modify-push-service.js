/**
 * SCRIPT PARA MODIFICAR EL SERVICIO DE NOTIFICACIONES
 * Este script modifica el ShopifyPushService para obtener el token FCM directamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 MODIFICANDO SERVICIO DE NOTIFICACIONES');
console.log('='.repeat(50));

// Función para crear una versión simplificada del servicio
function createSimplifiedPushService() {
  console.log('\n📝 CREANDO SERVICIO DE NOTIFICACIONES SIMPLIFICADO');
  console.log('-'.repeat(40));
  
  const simplifiedService = `
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SimplifiedPushService {
  private static instance: SimplifiedPushService;
  private fcmToken: string | null = null;

  static getInstance(): SimplifiedPushService {
    if (!SimplifiedPushService.instance) {
      SimplifiedPushService.instance = new SimplifiedPushService();
    }
    return SimplifiedPushService.instance;
  }

  // Función simplificada para obtener token FCM
  async getFCMTokenDirectly(): Promise<string | null> {
    try {
      console.log('🔑 [SIMPLIFIED] Obteniendo token FCM directamente...');
      
      // Solicitar permisos primero
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('❌ [SIMPLIFIED] Permisos de notificaciones denegados');
          return null;
        }
        console.log('✅ [SIMPLIFIED] Permisos de notificaciones concedidos');
      }
      
      // Obtener token FCM directamente
      const token = await messaging().getToken();
      console.log('✅ [SIMPLIFIED] Token FCM obtenido:', token);
      
      // Guardar token
      this.fcmToken = token;
      await AsyncStorage.setItem('fcm_token', token);
      
      return token;
      
    } catch (error) {
      console.error('❌ [SIMPLIFIED] Error obteniendo token FCM:', error);
      return null;
    }
  }

  // Función para mostrar token en consola
  async showTokenInConsole(): Promise<void> {
    const token = await this.getFCMTokenDirectly();
    
    if (token) {
      console.log('🎯 [SIMPLIFIED] TOKEN FCM REAL:');
      console.log('='.repeat(60));
      console.log(token);
      console.log('='.repeat(60));
      console.log('📋 Copia este token para usar en las pruebas');
    } else {
      console.log('❌ [SIMPLIFIED] No se pudo obtener el token FCM');
      console.log('💡 Posibles causas:');
      console.log('• Google Play Services no instalado');
      console.log('• Permisos de notificaciones denegados');
      console.log('• Emulador sin Google Play Store');
      console.log('• Conexión a internet');
    }
  }

  // Función para registrar token en servidor
  async registerTokenInServer(token: string): Promise<boolean> {
    try {
      console.log('📤 [SIMPLIFIED] Registrando token en servidor...');
      
      const payload = {
        token: token,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        source: 'simplified_service'
      };

      const response = await fetch('http://10.0.2.2:3000/api/push/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ [SIMPLIFIED] Token registrado en servidor');
        return true;
      } else {
        console.log('❌ [SIMPLIFIED] Error registrando token:', response.status);
        return false;
      }
      
    } catch (error) {
      console.log('❌ [SIMPLIFIED] Error registrando token:', error.message);
      return false;
    }
  }

  // Función para probar notificaciones
  async testNotifications(): Promise<void> {
    const token = await this.getFCMTokenDirectly();
    
    if (!token) {
      console.log('❌ [SIMPLIFIED] No hay token FCM para probar');
      return;
    }

    console.log('🧪 [SIMPLIFIED] Probando notificaciones...');
    
    // Registrar token en servidor
    await this.registerTokenInServer(token);
    
    // Mostrar token para copiar
    await this.showTokenInConsole();
  }
}
`;

  // Guardar servicio simplificado
  const servicePath = path.join(__dirname, 'src', 'services', 'SimplifiedPushService.ts');
  fs.writeFileSync(servicePath, simplifiedService);
  console.log('✅ Servicio simplificado creado:', servicePath);
}

// Función para crear pantalla de prueba simplificada
function createSimplifiedTestScreen() {
  console.log('\n📱 CREANDO PANTALLA DE PRUEBA SIMPLIFICADA');
  console.log('-'.repeat(40));
  
  const testScreen = `
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SimplifiedPushService } from '../services/SimplifiedPushService';

export const SimplifiedTestScreen: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getToken = async () => {
    setIsLoading(true);
    try {
      const service = SimplifiedPushService.getInstance();
      const fcmToken = await service.getFCMTokenDirectly();
      setToken(fcmToken);
      
      if (fcmToken) {
        Alert.alert(
          'Token FCM Obtenido',
          \`Token: \${fcmToken.substring(0, 20)}...\`,
          [
            { text: 'Copiar', onPress: () => console.log('Token completo:', fcmToken) },
            { text: 'Cerrar' }
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo obtener el token FCM');
      }
    } catch (error) {
      Alert.alert('Error', \`Error: \${error.message}\`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotifications = async () => {
    setIsLoading(true);
    try {
      const service = SimplifiedPushService.getInstance();
      await service.testNotifications();
    } catch (error) {
      Alert.alert('Error', \`Error: \${error.message}\`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 Prueba Simplificada de Token FCM</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={getToken}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '🔄 Obteniendo...' : '🔑 Obtener Token FCM'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={testNotifications}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '🔄 Probando...' : '🧪 Probar Notificaciones'}
        </Text>
      </TouchableOpacity>

      {token && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Token FCM:</Text>
          <Text style={styles.tokenValue} numberOfLines={3}>
            {token}
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>ℹ️ Información:</Text>
        <Text style={styles.infoText}>
          • Este servicio obtiene el token FCM directamente
        </Text>
        <Text style={styles.infoText}>
          • Revisa la consola para ver el token completo
        </Text>
        <Text style={styles.infoText}>
          • Copia el token para usar en las pruebas
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tokenContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tokenValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});
`;

  // Guardar pantalla de prueba
  const screenPath = path.join(__dirname, 'src', 'presentation', 'screens', 'SimplifiedTestScreen.tsx');
  fs.writeFileSync(screenPath, testScreen);
  console.log('✅ Pantalla de prueba creada:', screenPath);
}

// Función para crear script de prueba final
function createFinalTestScript() {
  console.log('\n📝 CREANDO SCRIPT DE PRUEBA FINAL');
  console.log('-'.repeat(40));
  
  const finalScript = `
/**
 * SCRIPT DE PRUEBA FINAL CON TOKEN FCM REAL
 * Usa este script una vez que obtengas el token FCM real
 */

const admin = require('firebase-admin');

// Configuración
const serviceAccount = require('../gst3dapp-firebase-adminsdk-fbsvc-3bc31ec6b9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'gst3dapp'
});

// Función para enviar notificación final
async function sendFinalNotification(token) {
  try {
    const message = {
      token: token,
      notification: {
        title: '🎉 ¡Notificación Exitosa!',
        body: 'Tu sistema de notificaciones está funcionando correctamente'
      },
      data: {
        test: 'final',
        timestamp: Date.now().toString(),
        success: 'true'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'gst3d_complete'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación final enviada:', response);
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🚀 PRUEBA FINAL DE NOTIFICACIONES');
  console.log('='.repeat(50));
  
  // ⚠️ REEMPLAZA ESTE TOKEN CON EL TOKEN REAL DE LA APP
  const token = 'TOKEN_FCM_REAL_AQUI';
  
  if (token === 'TOKEN_FCM_REAL_AQUI') {
    console.log('⚠️ Reemplaza TOKEN_FCM_REAL_AQUI con el token real');
    console.log('💡 Usa el servicio simplificado para obtener el token');
    return;
  }
  
  const success = await sendFinalNotification(token);
  
  if (success) {
    console.log('🎉 ¡SISTEMA DE NOTIFICACIONES FUNCIONANDO!');
    console.log('✅ Todas las pruebas completadas exitosamente');
  } else {
    console.log('❌ Sistema de notificaciones con problemas');
  }
}

main().catch(console.error);
`;

  fs.writeFileSync('test-final-notifications.js', finalScript);
  console.log('✅ Script final creado: test-final-notifications.js');
}

// Función principal
function main() {
  console.log('\n🚀 INICIANDO MODIFICACIÓN DEL SERVICIO');
  console.log('-'.repeat(40));
  
  // 1. Crear servicio simplificado
  createSimplifiedPushService();
  
  // 2. Crear pantalla de prueba
  createSimplifiedTestScreen();
  
  // 3. Crear script de prueba final
  createFinalTestScript();
  
  console.log('\n✅ MODIFICACIÓN COMPLETADA');
  console.log('='.repeat(50));
  console.log('\n📋 ARCHIVOS CREADOS:');
  console.log('• src/services/SimplifiedPushService.ts');
  console.log('• src/presentation/screens/SimplifiedTestScreen.tsx');
  console.log('• test-final-notifications.js');
  console.log('\n🔧 PRÓXIMOS PASOS:');
  console.log('1. Agrega SimplifiedTestScreen a tu App.tsx');
  console.log('2. Ejecuta la app en Android Studio');
  console.log('3. Ve a la pantalla simplificada');
  console.log('4. Presiona "Obtener Token FCM"');
  console.log('5. Copia el token de la consola');
  console.log('6. Usa test-final-notifications.js con el token real');
}

// Ejecutar modificación
main();














