import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';

export class IOSCompatibilityService {
  private static instance: IOSCompatibilityService;
  private iosVersion: number = 0;
  private isIOS12OrLater: boolean = false;
  private isIOS13OrLater: boolean = false;
  private isIOS14OrLater: boolean = false;
  private isIOS15OrLater: boolean = false;

  private constructor() {
    this.initializeIOSVersion();
  }

  public static getInstance(): IOSCompatibilityService {
    if (!IOSCompatibilityService.instance) {
      IOSCompatibilityService.instance = new IOSCompatibilityService();
    }
    return IOSCompatibilityService.instance;
  }

  private async initializeIOSVersion(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        const systemVersion = await DeviceInfo.getSystemVersion();
        this.iosVersion = parseFloat(systemVersion);
        this.isIOS12OrLater = this.iosVersion >= 12.0;
        this.isIOS13OrLater = this.iosVersion >= 13.0;
        this.isIOS14OrLater = this.iosVersion >= 14.0;
        this.isIOS15OrLater = this.iosVersion >= 15.0;
      } catch (error) {
        console.error('Error al obtener versión de iOS:', error);
        this.iosVersion = 12.0;
        this.isIOS12OrLater = true;
      }
    }
  }

  public async requestNotificationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return true;
    }

    try {
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        return true;
      } else {
        this.showPermissionDeniedAlert();
        return false;
      }
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return false;
    }
  }

  private showPermissionDeniedAlert(): void {
    Alert.alert(
      'Permisos de Notificación',
      'Para recibir notificaciones de GST3D, por favor habilita los permisos en Configuración.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir a Configuración', onPress: () => DeviceInfo.openDeviceSettings() }
      ]
    );
  }

  public async getFCMToken(): Promise<string | null> {
    try {
      if (Platform.OS !== 'ios') {
        return null;
      }

      const authStatus = await messaging().hasPermission();
      if (authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
          authStatus !== messaging.AuthorizationStatus.PROVISIONAL) {
        return null;
      }

      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error al obtener token FCM:', error);
      return null;
    }
  }

  public getIOSVersion(): number {
    return this.iosVersion;
  }

  public isIOS12Plus(): boolean {
    return this.isIOS12OrLater;
  }

  public isIOS13Plus(): boolean {
    return this.isIOS13OrLater;
  }

  public isIOS14Plus(): boolean {
    return this.isIOS14OrLater;
  }

  public isIOS15Plus(): boolean {
    return this.isIOS15OrLater;
  }
}

export default IOSCompatibilityService;









