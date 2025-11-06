import Foundation
import FirebaseCore

/// Configuración de Firebase para iOS
/// Este archivo sigue las mejores prácticas mostradas en la documentación de Firebase
class FirebaseConfig {
    
    /// Configura Firebase al inicializar la aplicación
    static func configure() {
        // Verificar que el archivo GoogleService-Info.plist existe
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") else {
            print("❌ Error: No se encontró GoogleService-Info.plist")
            return
        }
        
        // Configurar Firebase
        FirebaseApp.configure()
        print("✅ Firebase configurado correctamente para iOS")
        print("📱 Proyecto: gst3dapp")
        print("🔑 API Key: AIzaSyASHeHbmoA8ixDCb69chCbehq1XQ9fRB9M")
    }
    
    /// Verifica el estado de la configuración de Firebase
    static func checkConfiguration() -> Bool {
        guard let app = FirebaseApp.app() else {
            print("❌ Firebase no está configurado")
            return false
        }
        
        print("✅ Firebase está configurado correctamente")
        print("📱 App Name: \(app.name)")
        print("🔧 Options: \(app.options.projectID ?? "N/A")")
        
        return true
    }
}







