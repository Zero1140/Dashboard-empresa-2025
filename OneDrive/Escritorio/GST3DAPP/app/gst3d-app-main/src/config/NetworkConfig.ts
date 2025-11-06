import { Platform } from 'react-native';

/**
 * Configuración centralizada de red para la aplicación
 * Maneja automáticamente la detección de emulador vs dispositivo real
 */
export class NetworkConfig {
  private static instance: NetworkConfig;
  private _apiBaseUrl: string | null = null;
  private _isEmulator: boolean | null = null;

  private constructor() {}

  public static getInstance(): NetworkConfig {
    if (!NetworkConfig.instance) {
      NetworkConfig.instance = new NetworkConfig();
    }
    return NetworkConfig.instance;
  }

  /**
   * Detecta si la app está ejecutándose en un emulador
   */
  public isEmulator(): boolean {
    if (this._isEmulator !== null) {
      return this._isEmulator;
    }

    if (Platform.OS === 'android') {
      this._isEmulator = (
        __DEV__ ||
        Platform.constants.Fingerprint === 'generic' ||
        Platform.constants.Brand === 'google' ||
        Platform.constants.Model?.includes('sdk') ||
        Platform.constants.Model?.includes('emulator')
      );
    } else if (Platform.OS === 'ios') {
      this._isEmulator = (
        __DEV__ ||
        Platform.constants.simulator === true
      );
    } else {
      this._isEmulator = false;
    }

    return this._isEmulator;
  }

  public getApiBaseUrl(): string {
    if (this._apiBaseUrl) {
      return this._apiBaseUrl;
    }

    // Siempre usar Render (no hay diferencia entre emulador y dispositivo real)
    this._apiBaseUrl = 'https://gst3d-push-server-g.onrender.com';

    return this._apiBaseUrl;
  }

  public getBearerToken(): string {
    return '31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV';
  }

  public reset(): void {
    this._apiBaseUrl = null;
    this._isEmulator = null;
  }
}


