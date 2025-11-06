# 🔐 CONFIGURACIÓN APNs AUTH KEY - FIREBASE

**IMPORTANTE:** Necesitas una cuenta de Apple Developer para esto.

---

## 🎯 PASO 1: Crear Auth Key en Apple Developer

### **1.1 Acceder a Apple Developer**

1. **Ir a:** https://developer.apple.com/account/resources/authkeys/list
2. **Iniciar sesión** con tu cuenta de Apple Developer

### **1.2 Crear Nueva Auth Key**

1. **Clic en el botón "+"** (arriba a la izquierda) o "Create a key"

2. **Completar información:**
   - **Key Name:** `GST3D APNs Key` (o el nombre que prefieras)
   - **Activar:** ✅ **Apple Push Notifications service (APNs)**
   - **Clic en "Continue"**

3. **Revisar y confirmar:**
   - Verificar que APNs está activado
   - Clic en "Register"

4. **Descargar archivo:**
   - ⚠️ **IMPORTANTE:** Solo puedes descargar el archivo UNA VEZ
   - Clic en "Download" para descargar el archivo `.p8`
   - **Guardar en un lugar seguro** (no lo perderás, pero es mejor tenerlo)

5. **Anotar información:**
   - **Key ID:** Aparece en la página (ejemplo: `W5JQ293XS8`)
   - **Team ID:** Aparece en la parte superior de la página (ejemplo: `ABC123DEF4`)
   - **Guardar esta información** (la necesitarás después)

---

## 🔥 PASO 2: Subir Auth Key a Firebase

### **2.1 Acceder a Firebase Console**

1. **Ir a:** https://console.firebase.google.com
2. **Seleccionar proyecto:** `gst3dapp` (o el nombre de tu proyecto)

### **2.2 Ir a Cloud Messaging**

1. **Clic en el ícono de configuración** ⚙️ (arriba a la izquierda)
2. **Seleccionar:** "Project settings"
3. **Ir a la pestaña:** "Cloud Messaging"

### **2.3 Configurar APNs para iOS**

1. **Buscar la sección:** "Apple app configuration" o "iOS app configuration"

2. **En "APNs Authentication Key":**
   - Clic en **"Upload"** o **"Browse"**
   - Seleccionar el archivo `.p8` que descargaste

3. **Completar información:**
   - **Key ID:** Ingresar el Key ID que anotaste (ejemplo: `W5JQ293XS8`)
   - **Team ID:** Ingresar el Team ID que anotaste (ejemplo: `ABC123DEF4`)

4. **Clic en "Upload"** o **"Save"**

### **2.4 Verificar**

1. **Debe aparecer:**
   - ✅ "APNs Authentication Key uploaded"
   - ✅ Key ID y Team ID mostrados

2. **Si hay error:**
   - Verificar que el archivo `.p8` es correcto
   - Verificar que Key ID y Team ID son correctos
   - Verificar que la key tiene permisos de APNs

---

## ✅ VERIFICACIÓN

### **Checklist:**
- [ ] Auth Key creada en Apple Developer
- [ ] Archivo `.p8` descargado y guardado
- [ ] Key ID anotado
- [ ] Team ID anotado
- [ ] Auth Key subida a Firebase Console
- [ ] Key ID ingresado correctamente
- [ ] Team ID ingresado correctamente
- [ ] Firebase muestra "APNs Authentication Key uploaded"

---

## 🚨 PROBLEMAS COMUNES

### **Error: "Invalid key file"**
**Solución:**
- Verificar que descargaste el archivo `.p8` correcto
- Verificar que el archivo no está corrupto
- Intentar descargar nuevamente (si es posible)

### **Error: "Invalid Key ID"**
**Solución:**
- Verificar que copiaste el Key ID correctamente
- El Key ID es una cadena de 10 caracteres (ejemplo: `W5JQ293XS8`)
- No incluyas espacios

### **Error: "Invalid Team ID"**
**Solución:**
- Verificar que copiaste el Team ID correctamente
- El Team ID es una cadena de 10 caracteres (ejemplo: `ABC123DEF4`)
- Puedes encontrarlo en: Apple Developer → Membership

### **Error: "Key does not have APNs permission"**
**Solución:**
- Verificar que al crear la key, activaste ✅ "Apple Push Notifications service (APNs)"
- Si no lo activaste, necesitas crear una nueva key

---

## 📝 NOTAS IMPORTANTES

### **Seguridad:**
- ⚠️ El archivo `.p8` es sensible - no lo compartas
- ⚠️ Guarda el archivo en un lugar seguro
- ⚠️ Si pierdes el archivo, necesitas crear una nueva key

### **Limitaciones:**
- Puedes tener hasta **2 Auth Keys** por cuenta de desarrollador
- Cada key puede usarse para múltiples apps
- La key no expira (a diferencia de los certificados)

### **Alternativa (No recomendada):**
- También puedes usar certificados APNs (`.p12`), pero Auth Keys son más modernas y fáciles de usar

---

## 🎯 SIGUIENTE PASO

Después de completar esta configuración:

1. ✅ Verificar que Firebase muestra la key subida
2. ✅ Probar envío de notificación desde el servidor
3. ✅ Verificar recepción en dispositivo iOS

**¡Configuración APNs completada!** ✅





