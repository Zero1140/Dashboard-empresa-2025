/**
 * SOLUCIÓN DEFINITIVA PARA NOTIFICACIONES EN EMULADOR
 * Este script envía notificaciones directamente al emulador usando diferentes métodos
 */

const admin = require('firebase-admin');
const https = require('https');

console.log('🚀 SOLUCIÓN DEFINITIVA PARA NOTIFICACIONES EN EMULADOR');
console.log('='.repeat(60));

// Configuración de Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('../gst3dapp-firebase-adminsdk-fbsvc-3bc31ec6b9.json');
  console.log('✅ Archivo de credenciales Firebase encontrado');
} catch (error) {
  console.log('❌ Error cargando credenciales Firebase:', error.message);
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'gst3dapp'
  });
  console.log('✅ Firebase Admin inicializado correctamente');
} catch (error) {
  console.log('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

// Token FCM del emulador
const EMULATOR_TOKEN = 'fPgk-WPtS220H50vKqD00m:APA91bGIa8fBDedMK2BMumoM2tsQ4KnSqHtxRqy1Q3z5yMqqxfDFCA8HqwhWNZgSGdqEy6DC1BVVGuhXd1a84Vh5GZf6pX2ccA8cy2dTnpXgWoPjA1N31fE';

// Función para enviar notificación usando HTTP directo
async function sendNotificationViaHTTP(token, title, body) {
  console.log(`\n📤 ENVIANDO NOTIFICACIÓN VIA HTTP DIRECTO`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  console.log(`Título: ${title}`);
  console.log(`Mensaje: ${body}`);
  console.log('-'.repeat(40));
  
  try {
    const message = {
      to: token,
      notification: {
        title: title,
        body: body,
        sound: 'default'
      },
      data: {
        timestamp: Date.now().toString(),
        source: 'http_direct',
        test: 'true'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'gst3d_complete',
          sound: 'default'
        }
      }
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serviceAccount.private_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    const result = await response.text();
    console.log('✅ Respuesta HTTP:', result);
    return { success: true, response: result };
    
  } catch (error) {
    console.log('❌ Error HTTP:', error.message);
    return { success: false, error: error.message };
  }
}

// Función para enviar notificación usando Firebase Admin con configuración especial
async function sendNotificationWithSpecialConfig(token, title, body) {
  console.log(`\n📤 ENVIANDO NOTIFICACIÓN CON CONFIGURACIÓN ESPECIAL`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  console.log(`Título: ${title}`);
  console.log(`Mensaje: ${body}`);
  console.log('-'.repeat(40));
  
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: {
        timestamp: Date.now().toString(),
        source: 'special_config',
        test: 'true',
        priority: 'high'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'gst3d_complete',
          priority: 'high',
          defaultSound: true
        },
        data: {
          timestamp: Date.now().toString(),
          source: 'special_config',
          test: 'true'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada:', response);
    return { success: true, response };
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Función para enviar notificación solo con datos
async function sendDataOnlyNotification(token, title, body) {
  console.log(`\n📤 ENVIANDO NOTIFICACIÓN SOLO CON DATOS`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  console.log(`Título: ${title}`);
  console.log(`Mensaje: ${body}`);
  console.log('-'.repeat(40));
  
  try {
    const message = {
      token: token,
      data: {
        title: title,
        body: body,
        timestamp: Date.now().toString(),
        source: 'data_only',
        test: 'true',
        priority: 'high'
      },
      android: {
        priority: 'high',
        data: {
          title: title,
          body: body,
          timestamp: Date.now().toString(),
          source: 'data_only',
          test: 'true'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación solo datos enviada:', response);
    return { success: true, response };
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Función para enviar notificación usando el servidor local
async function sendNotificationViaLocalServer(token, title, body) {
  console.log(`\n📤 ENVIANDO NOTIFICACIÓN VIA SERVIDOR LOCAL`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  console.log(`Título: ${title}`);
  console.log(`Mensaje: ${body}`);
  console.log('-'.repeat(40));
  
  try {
    const payload = {
      token: token,
      title: title,
      body: body,
      data: {
        timestamp: Date.now().toString(),
        source: 'local_server',
        test: 'true'
      }
    };

    const response = await fetch('http://10.0.2.2:3000/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.text();
      console.log('✅ Notificación enviada via servidor local:', result);
      return { success: true, response: result };
    } else {
      console.log('❌ Error servidor local:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log('❌ Error servidor local:', error.message);
    return { success: false, error: error.message };
  }
}

// Función para probar todos los métodos
async function testAllMethods() {
  console.log('\n🧪 PROBANDO TODOS LOS MÉTODOS DE NOTIFICACIÓN');
  console.log('-'.repeat(40));
  
  const testNotifications = [
    {
      title: '🎉 Prueba Método 1',
      body: 'Notificación usando Firebase Admin estándar'
    },
    {
      title: '📡 Prueba Método 2',
      body: 'Notificación usando configuración especial'
    },
    {
      title: '📊 Prueba Método 3',
      body: 'Notificación solo con datos'
    },
    {
      title: '🌐 Prueba Método 4',
      body: 'Notificación via servidor local'
    },
    {
      title: '🔥 Prueba Método 5',
      body: 'Notificación via HTTP directo'
    }
  ];
  
  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];
    console.log(`\n📤 Probando método ${i + 1}: ${notification.title}`);
    
    let result = { success: false };
    
    switch (i) {
      case 0:
        result = await sendNotificationWithSpecialConfig(EMULATOR_TOKEN, notification.title, notification.body);
        break;
      case 1:
        result = await sendNotificationWithSpecialConfig(EMULATOR_TOKEN, notification.title, notification.body);
        break;
      case 2:
        result = await sendDataOnlyNotification(EMULATOR_TOKEN, notification.title, notification.body);
        break;
      case 3:
        result = await sendNotificationViaLocalServer(EMULATOR_TOKEN, notification.title, notification.body);
        break;
      case 4:
        result = await sendNotificationViaHTTP(EMULATOR_TOKEN, notification.title, notification.body);
        break;
    }
    
    if (result.success) {
      console.log('✅ Método exitoso');
    } else {
      console.log('❌ Método falló');
    }
    
    // Pausa entre pruebas
    if (i < testNotifications.length - 1) {
      console.log('⏳ Esperando 2 segundos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Función para enviar notificaciones masivas
async function sendMassiveNotifications() {
  console.log('\n🚀 ENVIANDO NOTIFICACIONES MASIVAS');
  console.log('-'.repeat(40));
  
  const massiveNotifications = [
    { title: '🎉 ¡NOTIFICACIÓN EXITOSA!', body: 'Tu sistema está funcionando' },
    { title: '📦 Pedido Procesado', body: 'Tu pedido ha sido procesado' },
    { title: '🎁 Promoción Especial', body: '¡Descuento del 25%!' },
    { title: '🛒 Recordatorio', body: 'Tienes productos en el carrito' },
    { title: '📍 Ubicación', body: '¡Estás cerca de nuestra tienda!' },
    { title: '⏰ Recordatorio', body: 'No olvides completar tu compra' },
    { title: '🎊 Oferta Flash', body: '¡Oferta por tiempo limitado!' },
    { title: '📱 App Actualizada', body: 'Nueva versión disponible' },
    { title: '🔔 Notificación', body: 'Mensaje importante para ti' },
    { title: '🎯 Personalizada', body: 'Contenido personalizado' }
  ];
  
  for (let i = 0; i < massiveNotifications.length; i++) {
    const notification = massiveNotifications[i];
    console.log(`\n📤 Enviando notificación ${i + 1}: ${notification.title}`);
    
    // Probar con el método que más probabilidades tenga de funcionar
    const result = await sendNotificationWithSpecialConfig(EMULATOR_TOKEN, notification.title, notification.body);
    
    if (result.success) {
      console.log('✅ Notificación enviada exitosamente');
    } else {
      console.log('❌ Notificación falló, intentando método alternativo...');
      
      // Intentar método alternativo
      const altResult = await sendDataOnlyNotification(EMULATOR_TOKEN, notification.title, notification.body);
      if (altResult.success) {
        console.log('✅ Notificación enviada con método alternativo');
      } else {
        console.log('❌ Ambos métodos fallaron');
      }
    }
    
    // Pausa entre notificaciones
    if (i < massiveNotifications.length - 1) {
      console.log('⏳ Esperando 1 segundo...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Función principal
async function main() {
  console.log('\n🚀 INICIANDO SOLUCIÓN DEFINITIVA');
  console.log('-'.repeat(40));
  
  console.log('📱 Token del emulador:', EMULATOR_TOKEN.substring(0, 30) + '...');
  
  // 1. Probar todos los métodos
  await testAllMethods();
  
  // 2. Enviar notificaciones masivas
  await sendMassiveNotifications();
  
  console.log('\n✅ SOLUCIÓN COMPLETADA');
  console.log('='.repeat(60));
  console.log('\n📱 VERIFICA EN TU EMULADOR:');
  console.log('• Las notificaciones deberían aparecer en la barra de estado');
  console.log('• Toca las notificaciones para abrir la app');
  console.log('• Revisa los logs de la app para confirmar recepción');
  console.log('\n🔧 SI NO RECIBES NOTIFICACIONES:');
  console.log('• El emulador no tiene Google Play Services');
  console.log('• Usa un dispositivo físico para pruebas reales');
  console.log('• O crea un emulador con Google Play Store');
}

// Ejecutar solución
main().catch(console.error);














