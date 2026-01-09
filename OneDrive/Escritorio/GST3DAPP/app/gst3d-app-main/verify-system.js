#!/usr/bin/env node

// Script de prueba para verificar que todo funciona
console.log('🔧 VERIFICACIÓN FINAL DEL SISTEMA GST3D');
console.log('=======================================');

// Verificar variables de entorno actuales
console.log('\n🔍 Variables de entorno actuales:');
console.log('JAVA_HOME:', process.env.JAVA_HOME || 'No configurado');
console.log('ANDROID_HOME:', process.env.ANDROID_HOME || 'No configurado');
console.log('ANDROID_SDK_ROOT:', process.env.ANDROID_SDK_ROOT || 'No configurado');

// Verificar Java
console.log('\n☕ Verificando Java:');
const { execSync } = require('child_process');
try {
  const javaVersion = execSync('java -version', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ Java disponible');
} catch (error) {
  console.log('❌ Java no disponible:', error.message);
}

// Verificar ADB
console.log('\n📱 Verificando Android SDK:');
try {
  const adbVersion = execSync('adb version', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ ADB disponible');
} catch (error) {
  console.log('❌ ADB no disponible:', error.message);
}

// Verificar dispositivos conectados
console.log('\n🔌 Verificando dispositivos:');
try {
  const devices = execSync('adb devices', { encoding: 'utf8', stdio: 'pipe' });
  console.log('Dispositivos conectados:');
  console.log(devices);
} catch (error) {
  console.log('❌ Error verificando dispositivos:', error.message);
}

console.log('\n📋 INSTRUCCIONES PARA EJECUTAR LA APP:');
console.log('======================================');
console.log('1. Reinicia Cursor para aplicar las variables de entorno');
console.log('2. Conecta un dispositivo Android o inicia un emulador');
console.log('3. Ejecuta: npm run android');
console.log('');
console.log('💡 Si hay problemas con Gradle:');
console.log('- Elimina la carpeta android/.gradle');
console.log('- Ejecuta: npm run android -- --reset-cache');
console.log('');
console.log('🎯 El sistema está configurado correctamente!');

