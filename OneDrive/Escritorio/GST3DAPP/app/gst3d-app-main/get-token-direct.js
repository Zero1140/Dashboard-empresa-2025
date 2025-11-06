/**
 * SCRIPT PARA OBTENER TOKEN FCM DIRECTAMENTE
 * Este script obtiene el token FCM directamente de Firebase sin servicios complejos
 */

const admin = require('firebase-admin');

console.log('🔑 OBTENER TOKEN FCM DIRECTAMENTE');
console.log('='.repeat(50));

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

// Función para crear un token FCM de prueba
async function createTestToken() {
  console.log('\n🧪 CREANDO TOKEN FCM DE PRUEBA');
  console.log('-'.repeat(40));
  
  try {
    // Crear un token personalizado para pruebas
    const customToken = await admin.auth().createCustomToken('test-user', {
      test: true,
      timestamp: Date.now()
    });
    
    console.log('✅ Token personalizado creado:', customToken.substring(0, 50) + '...');
    return customToken;
    
  } catch (error) {
    console.log('❌ Error creando token personalizado:', error.message);
    return null;
  }
}

// Función para enviar notificación de prueba con token específico
async function sendTestNotificationWithToken(token, title, body) {
  console.log(`\n📤 ENVIANDO NOTIFICACIÓN DE PRUEBA`);
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
        source: 'direct_test',
        test: 'true'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'gst3d_complete'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada exitosamente:', response);
    return { success: true, response };
    
  } catch (error) {
    console.log('❌ Error enviando notificación:', error.message);
    
    // Mostrar detalles específicos del error
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('💡 El token FCM es inválido o ha expirado');
      console.log('💡 Esto es normal para tokens de prueba');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.log('💡 El token FCM no está registrado');
    } else {
      console.log('💡 Error desconocido:', error.code);
    }
    
    return { success: false, error: error.message };
  }
}

// Función para diagnosticar el problema del emulador
function diagnoseEmulatorIssue() {
  console.log('\n🔍 DIAGNOSTICANDO PROBLEMA DEL EMULADOR');
  console.log('-'.repeat(40));
  
  console.log('📱 PROBLEMAS COMUNES EN EMULADORES:');
  console.log('');
  console.log('1. 🚫 Google Play Services no instalado');
  console.log('   • El emulador no tiene Google Play Services');
  console.log('   • FCM requiere Google Play Services para funcionar');
  console.log('   • Solución: Usar emulador con Google Play Store');
  console.log('');
  console.log('2. 🔒 Permisos de notificaciones denegados');
  console.log('   • La app no tiene permisos para notificaciones');
  console.log('   • Solución: Conceder permisos manualmente');
  console.log('');
  console.log('3. 🌐 Sin conexión a internet');
  console.log('   • El emulador no puede conectarse a Firebase');
  console.log('   • Solución: Verificar conexión a internet');
  console.log('');
  console.log('4. ⚙️ Firebase no inicializado correctamente');
  console.log('   • La app no está inicializando Firebase');
  console.log('   • Solución: Verificar inicialización en la app');
  console.log('');
  console.log('5. 📱 Emulador sin Google Play Store');
  console.log('   • El emulador no tiene Google Play Store');
  console.log('   • Solución: Crear nuevo AVD con Google Play Store');
}

// Función para crear script de prueba simple
function createSimpleTestScript() {
  console.log('\n📝 CREANDO SCRIPT DE PRUEBA SIMPLE');
  console.log('-'.repeat(40));
  
  const scriptContent = `
/**
 * SCRIPT DE PRUEBA SIMPLE PARA TOKEN FCM
 * Reemplaza TOKEN_AQUI con el token real de la app
 */

const admin = require('firebase-admin');

// Configuración
const serviceAccount = require('../gst3dapp-firebase-adminsdk-fbsvc-3bc31ec6b9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'gst3dapp'
});

// Función para enviar notificación
async function sendNotification(token) {
  try {
    const message = {
      token: token,
      notification: {
        title: 'Prueba Simple',
        body: 'Token FCM funcionando'
      },
      data: {
        test: 'simple',
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'gst3d_complete'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada:', response);
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  // ⚠️ REEMPLAZA ESTE TOKEN CON EL TOKEN REAL DE LA APP
  const token = 'TOKEN_AQUI';
  
  if (token === 'TOKEN_AQUI') {
    console.log('⚠️ Reemplaza TOKEN_AQUI con el token real de la app');
    console.log('💡 El token se obtiene de la consola de la app');
    return;
  }
  
  const success = await sendNotification(token);
  
  if (success) {
    console.log('🎉 ¡Token FCM funcionando correctamente!');
  } else {
    console.log('❌ Token FCM con problemas');
  }
}

main().catch(console.error);
`;

  const fs = require('fs');
  fs.writeFileSync('test-simple-token.js', scriptContent);
  console.log('✅ Script creado: test-simple-token.js');
}

// Función principal
async function main() {
  console.log('\n🚀 INICIANDO PROCESO DE OBTENCIÓN DE TOKEN FCM');
  console.log('-'.repeat(40));
  
  // 1. Diagnosticar problema del emulador
  diagnoseEmulatorIssue();
  
  // 2. Crear token de prueba
  const testToken = await createTestToken();
  
  // 3. Probar con token de prueba
  if (testToken) {
    await sendTestNotificationWithToken(
      testToken,
      'Prueba de Token',
      'Verificando funcionamiento del token'
    );
  }
  
  // 4. Crear script de prueba simple
  createSimpleTestScript();
  
  console.log('\n✅ PROCESO COMPLETADO');
  console.log('='.repeat(50));
  console.log('\n📋 INSTRUCCIONES FINALES:');
  console.log('1. Verifica que el emulador tenga Google Play Services');
  console.log('2. Ejecuta la app en Android Studio');
  console.log('3. Ve a la pantalla "Pruebas de Notificaciones"');
  console.log('4. Presiona "🔍 Diagnóstico FCM"');
  console.log('5. Copia el token FCM de la consola');
  console.log('6. Usa el script test-simple-token.js con el token real');
  console.log('\n💡 Si no obtienes token FCM:');
  console.log('• Usa un dispositivo físico');
  console.log('• O crea un emulador con Google Play Store');
  console.log('• O instala Google Play Services manualmente');
}

// Ejecutar proceso
main().catch(console.error);














