# 📱 CONFIGURACIÓN XCODE - PASOS MANUALES

**IMPORTANTE:** Estos pasos deben hacerse en Mac con Xcode instalado.

---

## 🚀 PASO 1: Instalar CocoaPods y Actualizar Repositorio

1. **Instalar CocoaPods (si no está instalado):**
```bash
sudo gem install cocoapods
```

2. **Actualizar repositorio de CocoaPods (IMPORTANTE):**
```bash
cd gst3d-app-main/ios
pod repo update
```

⚠️ **CRÍTICO:** Ejecutar `pod repo update` ANTES de `pod install` para evitar problemas de dependencias.

3. **Instalar pods:**
```bash
pod install
```

## 🚀 PASO 2: Abrir Proyecto

1. **Navegar al proyecto:**
```bash
cd gst3d-app-main/ios
open MyFirstApp.xcworkspace
```

⚠️ **CRÍTICO:** Abrir `.xcworkspace` NO `.xcodeproj` (porque usa CocoaPods)

2. **Esperar a que Xcode indexe el proyecto** (puede tardar 1-2 minutos)

---

## 🎯 PASO 2: Seleccionar Target Correcto

1. En el navegador izquierdo de Xcode, verás:
   ```
   MyFirstApp (proyecto raíz)
   └── MyFirstApp (target) ← SELECCIONAR ESTE
   └── Pods
   ```

2. **Seleccionar el TARGET "MyFirstApp"** (NO el proyecto raíz)

3. Verificar que la barra superior muestra:
   - Target: `MyFirstApp`
   - Device: Tu dispositivo o simulador

---

## ⚙️ PASO 3: Configurar Signing & Capabilities

1. **Ir a la pestaña "Signing & Capabilities"** (arriba en el editor)

2. **Verificar Signing:**
   - ✅ **Team:** Seleccionar tu equipo de desarrollo
   - ✅ **Bundle Identifier:** `com.wichisoft.gst3d`
   - ✅ **Automatically manage signing:** Activado (recomendado)

3. **⚠️ NUEVO: Verificar Team ID y Bundle ID:**
   - Verificar que Xcode reconoce tu **Team ID** correctamente
   - Verificar que el **Bundle ID** coincide en:
     - Xcode → Signing & Capabilities
     - Info.plist
     - GoogleService-Info.plist
     - Firebase Console
   - Si hay error "provisioning profile mismatch", verificar que todos coinciden

4. **Si hay errores de signing:**
   - Verificar que tu Apple ID está agregado en Xcode → Preferences → Accounts
   - Verificar que tienes un certificado válido
   - Verificar que el Bundle ID está registrado en Apple Developer

---

## 🔔 PASO 4: Agregar Push Notifications Capability

1. **En la sección "Capabilities":**
   - Clic en el botón **"+ Capability"** (arriba a la izquierda)

2. **Buscar "Push Notifications":**
   - Escribir "Push" en el buscador
   - Seleccionar **"Push Notifications"**

3. **Verificar que aparece:**
   ```
   ✅ Push Notifications
   ```

4. **Si aparece un error:**
   - Verificar que el Bundle ID es correcto
   - Verificar que tienes permisos en Apple Developer

---

## 🔄 PASO 5: Agregar Background Modes Capability

1. **Clic en "+ Capability" nuevamente**

2. **Buscar "Background Modes":**
   - Escribir "Background" en el buscador
   - Seleccionar **"Background Modes"**

3. **Activar "Remote notifications":**
   - Dentro de Background Modes, activar:
     - ✅ **Remote notifications**

4. **Resultado esperado:**
   ```
   ✅ Background Modes
      ✅ Remote notifications
   ```

---

## 📄 PASO 6: Verificar GoogleService-Info.plist

1. **En el navegador izquierdo:**
   - Buscar `GoogleService-Info.plist`
   - Debe estar en: `ios/GoogleService-Info.plist`

2. **Verificar que está en el target:**
   - Seleccionar el archivo
   - Ir a la pestaña "File Inspector" (ícono de documento)
   - En "Target Membership", verificar que:
     - ✅ **MyFirstApp** está marcado

3. **Si no está marcado:**
   - Marcar la casilla ✅ MyFirstApp

---

## 🔍 PASO 7: Verificar Info.plist

1. **Abrir:** `ios/MyFirstApp/Info.plist`

2. **Verificar que tiene:**
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

3. **Si no está:**
   - Agregar manualmente o
   - Verificar que Background Modes capability está activada

---

## ✅ VERIFICACIÓN FINAL

### **Checklist:**
- [ ] Proyecto abierto con `.xcworkspace`
- [ ] Target "MyFirstApp" seleccionado
- [ ] Bundle ID: `com.wichisoft.gst3d`
- [ ] Team seleccionado
- [ ] ✅ Push Notifications capability agregada
- [ ] ✅ Background Modes → Remote notifications activado
- [ ] GoogleService-Info.plist en el target
- [ ] Info.plist tiene UIBackgroundModes

---

## 🚨 PROBLEMAS COMUNES

### **Error: "No signing certificate found"**
**Solución:**
1. Xcode → Preferences → Accounts
2. Agregar tu Apple ID
3. Clic en "Download Manual Profiles"
4. Volver a Signing & Capabilities y seleccionar Team

### **Error: "Push Notifications capability requires a valid provisioning profile"**
**Solución:**
1. Verificar que tienes cuenta de desarrollador Apple
2. Verificar que el Bundle ID está registrado en Apple Developer
3. Activar "Automatically manage signing"

### **Error: "GoogleService-Info.plist not found"**
**Solución:**
1. Verificar que el archivo existe en `ios/`
2. Arrastrarlo al proyecto en Xcode
3. Asegurarse de que está en el target "MyFirstApp"

---

## 📝 NOTAS

- **NO cierres Xcode** hasta completar todos los pasos
- **Guarda el proyecto** después de cada cambio (Cmd+S)
- Si algo no funciona, **revisa los logs** en la parte inferior de Xcode

---

**¡Configuración de Xcode completada!** ✅

**Siguiente paso:** Configurar APNs Auth Key en Firebase (ver `CONFIGURACION-APNS.md`)

