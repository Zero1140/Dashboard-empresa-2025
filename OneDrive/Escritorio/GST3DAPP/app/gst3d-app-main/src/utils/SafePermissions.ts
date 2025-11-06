import { Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';

/**
 * Utilidad para manejar permisos de manera segura, evitando errores de "permission is null"
 * Compatible con todas las versiones de Android
 */
export class SafePermissions {
  
  /**
   * Verifica si un permiso está concedido de manera segura
   * Compatible con todas las versiones de Android
   */
  static async checkPermission(permission: string): Promise<boolean> {
    if (!permission || permission === null || permission === undefined) {
      console.warn('⚠️ SafePermissions: Se intentó verificar un permiso nulo/undefined');
      return false;
    }

    if (Platform.OS !== 'android') {
      return true; // iOS maneja permisos de manera diferente
    }

    try {
      // Verificar si el permiso existe en esta versión de Android
      const hasPermission = await PermissionsAndroid.check(permission);
      console.log(`🔐 SafePermissions: Verificando ${permission}: ${hasPermission ? 'CONCEDIDO' : 'DENEGADO'}`);
      return hasPermission;
    } catch (error) {
      // Si el permiso no existe en esta versión de Android, considerarlo como concedido
      console.log(`⚠️ SafePermissions: Permiso ${permission} no disponible en esta versión de Android, considerando como concedido`);
      return true;
    }
  }

  /**
   * Solicita un permiso de manera segura
   * Compatible con todas las versiones de Android
   */
  static async requestPermission(permission: string, options?: any): Promise<string> {
    if (!permission || permission === null || permission === undefined) {
      console.warn('⚠️ SafePermissions: Se intentó solicitar un permiso nulo/undefined');
      return PermissionsAndroid.RESULTS.DENIED;
    }

    if (Platform.OS !== 'android') {
      return PermissionsAndroid.RESULTS.GRANTED; // iOS maneja permisos de manera diferente
    }

    try {
      const result = await PermissionsAndroid.request(permission, options);
      console.log(`🔐 SafePermissions: Solicitando ${permission}: ${result}`);
      return result;
    } catch (error) {
      // Si el permiso no existe en esta versión de Android, considerarlo como concedido
      console.log(`⚠️ SafePermissions: Permiso ${permission} no disponible en esta versión de Android, considerando como concedido`);
      return PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  /**
   * Solicita múltiples permisos de manera segura
   * Compatible con todas las versiones de Android
   */
  static async requestMultiplePermissions(permissions: string[]): Promise<Record<string, string>> {
    // Filtrar permisos nulos/undefined
    const validPermissions = permissions.filter(permission => 
      permission && permission !== null && permission !== undefined
    );

    if (validPermissions.length === 0) {
      console.warn('⚠️ SafePermissions: No hay permisos válidos para solicitar');
      return {};
    }

    if (Platform.OS !== 'android') {
      // Para iOS, simular que todos los permisos están concedidos
      const result: Record<string, string> = {};
      validPermissions.forEach(permission => {
        result[permission] = PermissionsAndroid.RESULTS.GRANTED;
      });
      return result;
    }

    try {
      console.log(`🔐 SafePermissions: Solicitando permisos:`, validPermissions);
      const result = await PermissionsAndroid.requestMultiple(validPermissions);
      console.log(`🔐 SafePermissions: Resultado de permisos:`, result);
      
      // Asegurar que todos los permisos tengan un resultado
      validPermissions.forEach(permission => {
        if (!result[permission]) {
          result[permission] = PermissionsAndroid.RESULTS.GRANTED; // Considerar como concedido si no hay resultado
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ SafePermissions: Error solicitando múltiples permisos:`, error);
      // En caso de error, considerar todos los permisos como concedidos
      const result: Record<string, string> = {};
      validPermissions.forEach(permission => {
        result[permission] = PermissionsAndroid.RESULTS.GRANTED;
      });
      return result;
    }
  }

  /**
   * Obtiene los permisos básicos necesarios para la app
   * Compatible con todas las versiones de Android
   */
  static getBasicPermissions(): string[] {
    const basicPermissions = [
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      PermissionsAndroid.PERMISSIONS.WAKE_LOCK,
      // PermissionsAndroid.PERMISSIONS.INTERNET, // INTERNET es implícito, no se verifica
      PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE
      // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
    ];

    // Filtrar permisos nulos/undefined
    return basicPermissions.filter(permission => 
      permission && permission !== null && permission !== undefined
    );
  }

  /**
   * Verifica todos los permisos básicos
   * Compatible con todas las versiones de Android
   */
  static async checkBasicPermissions(): Promise<Record<string, boolean>> {
    const permissions = this.getBasicPermissions();
    const results: Record<string, boolean> = {};

    for (const permission of permissions) {
      results[permission] = await this.checkPermission(permission);
    }

    return results;
  }

  /**
   * Solicita todos los permisos básicos de manera inteligente según la versión de Android
   * Compatible con todas las versiones de Android
   */
  static async requestBasicPermissions(): Promise<Record<string, string>> {
    try {
      // Obtener versión de Android
      const androidVersion = await DeviceInfo.getSystemVersion();
      const androidApiLevel = parseInt(androidVersion.split('.')[0]) || 0;
      
      console.log(`📱 SafePermissions: Solicitando permisos para Android API Level: ${androidApiLevel}`);
      
      // Permisos que siempre existen
          const alwaysAvailable = [
            // PermissionsAndroid.PERMISSIONS.INTERNET // INTERNET es implícito, no se solicita
            // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
          ];
      
      // Permisos específicos por versión
      const versionSpecificPermissions: Record<string, string[]> = {
        '23': [PermissionsAndroid.PERMISSIONS.WAKE_LOCK],
        '26': [PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE],
        '33': [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]
      };

      // Recopilar permisos a solicitar
      const permissionsToRequest: string[] = [...alwaysAvailable];
      
      for (const [minApi, permissions] of Object.entries(versionSpecificPermissions)) {
        if (androidApiLevel >= parseInt(minApi)) {
          permissionsToRequest.push(...permissions);
        }
      }

      // Filtrar permisos nulos/undefined
      const validPermissions = permissionsToRequest.filter(permission => 
        permission && permission !== null && permission !== undefined
      );

      console.log(`🔐 SafePermissions: Solicitando permisos:`, validPermissions);
      
      if (validPermissions.length === 0) {
        console.warn('⚠️ SafePermissions: No hay permisos válidos para solicitar');
        return {};
      }

      if (Platform.OS !== 'android') {
        // Para iOS, simular que todos los permisos están concedidos
        const result: Record<string, string> = {};
        validPermissions.forEach(permission => {
          result[permission] = PermissionsAndroid.RESULTS.GRANTED;
        });
        return result;
      }

      const result = await PermissionsAndroid.requestMultiple(validPermissions);
      console.log(`🔐 SafePermissions: Resultado de permisos:`, result);
      
      // Asegurar que todos los permisos tengan un resultado
      validPermissions.forEach(permission => {
        if (!result[permission]) {
          result[permission] = PermissionsAndroid.RESULTS.GRANTED; // Considerar como concedido si no hay resultado
        }
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ SafePermissions: Error solicitando permisos básicos:`, error);
      // En caso de error, considerar todos los permisos como concedidos
      const result: Record<string, string> = {};
      const allPermissions = [
        // PermissionsAndroid.PERMISSIONS.INTERNET, // INTERNET es implícito, no se solicita
        // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
        PermissionsAndroid.PERMISSIONS.WAKE_LOCK,
        PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      ];
      
      allPermissions.forEach(permission => {
        if (permission) {
          result[permission] = PermissionsAndroid.RESULTS.GRANTED;
        }
      });
      
      return result;
    }
  }

  /**
   * Verifica permisos de manera inteligente según la versión de Android
   * Solo verifica permisos que realmente existen en la versión actual de Android
   */
  static async checkSmartPermissions(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      // Obtener versión de Android
      const androidVersion = await DeviceInfo.getSystemVersion();
      const androidApiLevel = parseInt(androidVersion.split('.')[0]) || 0;
      
      console.log(`📱 SafePermissions: Android API Level: ${androidApiLevel}`);
      
      // Permisos que siempre existen (desde Android 6.0 / API 23)
          const alwaysAvailable = [
            // INTERNET es implícito en Android y no se puede verificar
            // NO agregar aquí - causaría falsos negativos
            // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
          ];
      
      // Permisos específicos por versión de Android
      const versionSpecificPermissions: Record<string, string[]> = {
        // Android 6.0+ (API 23+)
        '23': [
          PermissionsAndroid.PERMISSIONS.WAKE_LOCK
        ],
        // Android 8.0+ (API 26+)
        '26': [
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE
        ],
        // Android 13+ (API 33+)
        '33': [
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        ]
      };

      // Verificar permisos que siempre existen
      for (const permission of alwaysAvailable) {
        if (permission) {
          try {
            results[permission] = await PermissionsAndroid.check(permission);
            console.log(`🔐 SafePermissions: ${permission}: ${results[permission] ? 'CONCEDIDO' : 'DENEGADO'}`);
          } catch (error) {
            console.log(`⚠️ SafePermissions: Error verificando ${permission}, considerando como concedido`);
            results[permission] = true; // Considerar como concedido si no se puede verificar
          }
        }
      }

      // Verificar permisos específicos por versión
      for (const [minApi, permissions] of Object.entries(versionSpecificPermissions)) {
        if (androidApiLevel >= parseInt(minApi)) {
          for (const permission of permissions) {
            if (permission) {
              try {
                results[permission] = await PermissionsAndroid.check(permission);
                console.log(`🔐 SafePermissions: ${permission} (API ${minApi}+): ${results[permission] ? 'CONCEDIDO' : 'DENEGADO'}`);
              } catch (error) {
                console.log(`⚠️ SafePermissions: Error verificando ${permission}, considerando como concedido`);
                results[permission] = true; // Considerar como concedido si no se puede verificar
              }
            }
          }
        } else {
          // Para versiones anteriores, considerar permisos como concedidos
          for (const permission of permissions) {
            if (permission) {
              results[permission] = true;
              console.log(`✅ SafePermissions: ${permission} no requerido en API ${androidApiLevel}, considerando como concedido`);
            }
          }
        }
      }

      console.log(`📊 SafePermissions: Resumen de permisos:`, results);
      return results;
      
    } catch (error) {
      console.error(`❌ SafePermissions: Error en checkSmartPermissions:`, error);
      // En caso de error, devolver permisos básicos como concedidos
          return {
            // [PermissionsAndroid.PERMISSIONS.INTERNET]: true, // INTERNET es implícito, no se verifica
            [PermissionsAndroid.PERMISSIONS.WAKE_LOCK]: true,
            [PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE]: true,
            [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]: true
            // ACCESS_FINE_LOCATION removido - ya no necesario con detección por IP
          };
    }
  }
}
