import DeviceInfo from 'react-native-device-info';

export interface DeviceInfoData {
  appVersion: string;
  deviceModel: string;
  osVersion: string;
  language: string;
  timezone: string;
  brand: string;
  systemName: string;
  buildNumber: string;
  bundleId: string;
  isEmulator: boolean;
}

export class DeviceInfoService {
  private static instance: DeviceInfoService;

  static getInstance(): DeviceInfoService {
    if (!DeviceInfoService.instance) {
      DeviceInfoService.instance = new DeviceInfoService();
    }
    return DeviceInfoService.instance;
  }

  async getDeviceInfo(): Promise<DeviceInfoData> {
    try {
      const [
        appVersion,
        deviceModel,
        osVersion,
        language,
        timezone,
        brand,
        systemName,
        buildNumber,
        bundleId,
        isEmulator
      ] = await Promise.all([
        DeviceInfo.getVersion(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getDeviceLocale(),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        DeviceInfo.getBrand(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
        DeviceInfo.isEmulator()
      ]);

      return {
        appVersion,
        deviceModel,
        osVersion,
        language,
        timezone,
        brand,
        systemName,
        buildNumber,
        bundleId,
        isEmulator
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      
      // Valores por defecto en caso de error
      return {
        appVersion: '1.0.0',
        deviceModel: 'Unknown Device',
        osVersion: 'Unknown',
        language: 'es-ES',
        timezone: 'Europe/Madrid',
        brand: 'Unknown',
        systemName: 'Unknown',
        buildNumber: '1',
        bundleId: 'com.wichisoft.gst3d',
        isEmulator: false
      };
    }
  }

  // Método para generar segmentos basados en información del dispositivo
  generateDeviceSegments(deviceInfo: DeviceInfoData): string[] {
    const segments: string[] = [];

    // Segmento por plataforma
    segments.push(`platform_${deviceInfo.systemName.toLowerCase()}`);

    // Segmento por versión de app
    segments.push(`version_${deviceInfo.appVersion}`);

    // Segmento por marca del dispositivo
    if (deviceInfo.brand) {
      segments.push(`brand_${deviceInfo.brand.toLowerCase()}`);
    }

    // Segmento por modelo (simplificado)
    const modelSegment = deviceInfo.deviceModel
      .toLowerCase()
      .replace(/\s+/g, '_')
      .substring(0, 20); // Limitar longitud
    segments.push(`model_${modelSegment}`);

    // Segmento por versión de OS
    const osVersionSegment = deviceInfo.osVersion
      .replace(/\./g, '_')
      .substring(0, 10);
    segments.push(`os_${osVersionSegment}`);

    // Segmento por idioma
    if (deviceInfo.language) {
      const languageCode = deviceInfo.language.split('_')[0];
      segments.push(`language_${languageCode}`);
    }

    // Segmento por emulador
    if (deviceInfo.isEmulator) {
      segments.push('emulator_users');
    } else {
      segments.push('real_device_users');
    }

    return segments;
  }

  // Método para obtener información de debug
  getDebugInfo(deviceInfo: DeviceInfoData): string {
    return `
📱 Device Info:
- Model: ${deviceInfo.deviceModel}
- OS: ${deviceInfo.systemName} ${deviceInfo.osVersion}
- App Version: ${deviceInfo.appVersion}
- Language: ${deviceInfo.language}
- Timezone: ${deviceInfo.timezone}
- Brand: ${deviceInfo.brand}
- Is Emulator: ${deviceInfo.isEmulator ? 'Yes' : 'No'}
- Bundle ID: ${deviceInfo.bundleId}
    `.trim();
  }
}

