# 📱 CONFIGURACIÓN iOS - GUÍA RÁPIDA

**Esta carpeta contiene toda la configuración necesaria para iOS.**

---

## 📋 ARCHIVOS IMPORTANTES

- `CONFIGURACION-XCODE.md` - Pasos para configurar Xcode
- `CONFIGURACION-APNS.md` - Pasos para configurar APNs en Firebase
- `GoogleService-Info.plist` - Configuración Firebase (debe estar presente)
- `Podfile` - Dependencias iOS
- `MyFirstApp.xcworkspace` - Proyecto Xcode (abrir este, NO .xcodeproj)

---

## 🚀 PASOS RÁPIDOS EN MAC

### **1. Instalar Dependencias**
```bash
cd gst3d-app-main
npm install
cd ios
pod install
cd ..
```

### **2. Abrir en Xcode**
```bash
cd ios
open MyFirstApp.xcworkspace
```

### **3. Configurar Capabilities**
Seguir: `CONFIGURACION-XCODE.md`

### **4. Configurar APNs**
Seguir: `CONFIGURACION-APNS.md`

### **5. Compilar y Probar**
- Seleccionar dispositivo físico
- Presionar Cmd+R

---

## ✅ CHECKLIST

- [ ] `npm install` ejecutado
- [ ] `pod install` ejecutado
- [ ] Xcode abierto con `.xcworkspace`
- [ ] Push Notifications capability agregada
- [ ] Background Modes → Remote notifications activado
- [ ] APNs Auth Key subida a Firebase
- [ ] App compila sin errores
- [ ] Notificaciones funcionan

---

**Para más detalles, ver los archivos de configuración específicos.**





