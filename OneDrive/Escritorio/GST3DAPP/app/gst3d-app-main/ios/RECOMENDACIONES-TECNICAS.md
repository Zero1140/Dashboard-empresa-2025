# 🔧 RECOMENDACIONES TÉCNICAS ADICIONALES - iOS

**Basado en mejores prácticas y recomendaciones técnicas**

---

## 📱 CONFIGURACIÓN iOS (En Windows - Antes de Mac)

### **1. Podfile - Versión Mínima iOS**

**Verificar que Podfile tiene:**
```ruby
platform :ios, '12.0'  # o superior
```

**✅ Estado actual:** Ya está configurado en `12.0` ✅

---

### **2. AppDelegate - Orden de Inicialización**

**⚠️ IMPORTANTE:** Si usas Notifee para notificaciones en foreground:

**Orden correcto:**
1. **Notifee** debe inicializarse **ANTES** de Firebase
2. Luego Firebase

**Ejemplo:**
```objective-c
// ✅ CORRECTO
// 1. Inicializar Notifee primero (si se usa)
// 2. Luego Firebase
[FIRApp configure];
```

**✅ Estado actual:** No se usa Notifee en AppDelegate, solo Firebase ✅

---

### **3. Info.plist - FirebaseAppDelegateProxyEnabled**

**Si planeas manejar notificaciones manualmente**, agregar:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

**Ubicación:** `ios/MyFirstApp/Info.plist`

**⚠️ Estado actual:** NO está configurado  
**Recomendación:** Agregar si necesitas control manual completo

**Nota:** Si usas React Native Firebase con manejo automático, puedes dejarlo sin esta clave.

---

### **4. Info.plist - UIBackgroundModes**

**Debe incluir:**
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

**✅ Estado actual:** Ya está configurado ✅

---

## 🍎 CONFIGURACIÓN EN MAC

### **1. CocoaPods - Actualizar Repositorio**

**⚠️ IMPORTANTE:** Antes de `pod install`, ejecutar:

```bash
pod repo update
```

**Razón:** Asegura que tienes las últimas versiones de los pods.

---

### **2. Xcode - Team ID y Bundle ID**

**Verificar que Xcode reconoce:**
- ✅ **Team ID** correcto
- ✅ **Bundle ID:** `com.wichisoft.gst3d`

**Si hay error "provisioning profile mismatch":**
- Verificar que Bundle ID coincide en:
  - Xcode → Signing & Capabilities
  - Info.plist
  - GoogleService-Info.plist
  - Firebase Console
  - Apple Developer Portal

---

### **3. Xcode - Capabilities**

**Verificar en Signing & Capabilities:**
- ✅ **Push Notifications** (debe tener checkmark verde)
- ✅ **Background Modes → Remote notifications** (debe estar activado)

---

### **4. Firebase - APNs Auth Key**

**Conectar en Firebase Console:**
1. Ir a: **Cloud Messaging → iOS**
2. Subir archivo `.p8` (APNs Auth Key)
3. Ingresar **Key ID** y **Team ID**

**✅ Estado:** Pendiente de configurar en Mac

---

## 🗄️ SERVIDOR PUSH - RECOMENDACIONES SUPABASE

### **1. Variables de Entorno**

**Verificar que existen:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxx
```

**✅ Estado actual:** Configurado en `supabase-client.js` ✅

**Nota:** Se usa `SERVICE_ROLE_KEY` (no `ANON_KEY`) porque el servidor necesita bypass RLS.

---

### **2. Estructura de Tabla Tokens**

**Campos recomendados:**
- `id` (uuid) ✅
- `token` (text) ✅
- `platform` ('ios' | 'android') ✅
- `created_at` (timestamp) ✅
- `user_id` (text/uuid) ⚠️ Opcional (actualmente usa `customerId` y `email`)

**✅ Estado actual:** Tabla `fcm_tokens` tiene estructura correcta  
**Nota:** `user_id` no es crítico si ya tienes `customerId` y `email`

---

### **3. Logs Estructurados**

**Recomendación:** Implementar logs estructurados con:
- **pino** (recomendado para Node.js)
- **winston** (alternativa)

**Beneficios:**
- Mejor debugging remoto
- Formato JSON estructurado
- Niveles de log (info, warn, error)
- Fácil integración con servicios de logging

**⚠️ Estado actual:** Usa `console.log`  
**Recomendación:** Migrar a pino o winston

**Ejemplo con pino:**
```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

logger.info({ token: 'xxx', action: 'registered' }, 'Token registered');
```

---

### **4. Cola de Retry para Notificaciones Fallidas**

**Recomendación:** Implementar cola con:
- **bull** (recomendado)
- **bee-queue** (alternativa ligera)
- **bullmq** (versión moderna de bull)

**Beneficios:**
- Reintentos automáticos de notificaciones fallidas
- Manejo de errores mejorado
- Persistencia de trabajos
- Priorización de notificaciones

**⚠️ Estado actual:** No implementado  
**Recomendación:** Implementar para producción

**Ejemplo con bull:**
```javascript
const Queue = require('bull');
const notificationQueue = new Queue('notifications', {
  redis: { host: 'localhost', port: 6379 }
});

notificationQueue.process(async (job) => {
  // Enviar notificación
  // Si falla, se reintenta automáticamente
});
```

---

## ✅ CHECKLIST DE RECOMENDACIONES

### **iOS (En Windows):**
- [x] Podfile tiene iOS 12.0+ ✅
- [x] UIBackgroundModes con remote-notification ✅
- [ ] FirebaseAppDelegateProxyEnabled (opcional, agregar si se necesita)
- [ ] Verificar orden Notifee → Firebase (si se usa Notifee)

### **iOS (En Mac):**
- [ ] `pod repo update` antes de `pod install`
- [ ] Verificar Team ID y Bundle ID en Xcode
- [ ] Verificar Capabilities en Xcode
- [ ] Conectar APNs Auth Key en Firebase

### **Servidor Push:**
- [x] Variables de entorno configuradas ✅
- [x] Estructura de tabla correcta ✅
- [ ] Logs estructurados (recomendado)
- [ ] Cola de retry (recomendado para producción)

---

## 📝 NOTAS

1. **FirebaseAppDelegateProxyEnabled:** Solo necesario si manejas notificaciones completamente manual. Si usas React Native Firebase, puede no ser necesario.

2. **Logs estructurados:** No es crítico, pero mejora mucho el debugging en producción.

3. **Cola de retry:** No es crítico para desarrollo, pero esencial para producción con alto volumen.

4. **user_id en tabla:** Opcional si ya tienes `customerId` y `email` para identificar usuarios.

---

**Estas recomendaciones mejoran la robustez y mantenibilidad del sistema.** 🚀





