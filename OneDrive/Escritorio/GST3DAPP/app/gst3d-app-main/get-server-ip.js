/**
 * OBTENER IP REAL DEL SERVIDOR PARA DISPOSITIVOS FÍSICOS
 */

const os = require('os');

function getServerIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Buscar IPv4, no interno, no loopback
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`🌐 IP del servidor encontrada: ${interface.address}`);
        console.log(`📱 URL para dispositivos físicos: http://${interface.address}:3000/api/push/token`);
        return interface.address;
      }
    }
  }
  
  console.log('❌ No se encontró IP del servidor');
  return null;
}

console.log('🔍 BUSCANDO IP DEL SERVIDOR PARA DISPOSITIVOS FÍSICOS');
console.log('='.repeat(60));

const serverIP = getServerIP();

if (serverIP) {
  console.log('\n✅ INSTRUCCIONES:');
  console.log('1. 📱 Actualiza la IP en App.tsx y ShopifyPushServiceSimple.ts');
  console.log('2. 🔄 Regenera el APK');
  console.log('3. 📲 Instala en dispositivo físico');
  console.log('4. 🧪 Prueba las notificaciones');
} else {
  console.log('\n❌ No se pudo determinar la IP del servidor');
  console.log('💡 Verifica tu conexión de red');
}














