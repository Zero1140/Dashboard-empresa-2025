import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  timezone: string;
}

export class LocationService {
  private static instance: LocationService;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Obtiene la ubicación del usuario usando detección por IP
   * Más rápido, simple y sin necesidad de permisos de GPS
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      console.log('🌐 [LOCATION] Obteniendo ubicación por IP...');
      
      // Usar API gratuita de detección por IP
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ [LOCATION] Ubicación obtenida por IP:', {
        country: data.country_code,
        region: data.region,
        city: data.city,
        timezone: data.timezone
      });

      return {
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        country: data.country_code || 'ES',
        region: data.region || 'Desconocido',
        city: data.city || 'Ciudad',
        timezone: data.timezone || 'Europe/Madrid'
      };

    } catch (error) {
      console.error('❌ [LOCATION] Error obteniendo ubicación por IP:', error);
      
      // Fallback a configuración del dispositivo
      return this.getFallbackLocation();
    }
  }

  /**
   * Fallback usando configuración del dispositivo
   */
  private async getFallbackLocation(): Promise<LocationData> {
    try {
      console.log('🔄 [LOCATION] Usando fallback de configuración del dispositivo...');
      
      // Obtener configuración regional del dispositivo
      const locale = Platform.OS === 'android' 
        ? await this.getAndroidLocale()
        : this.getIOSLocale();

      const country = this.getCountryFromLocale(locale);
      const region = this.getRegionFromCountry(country);
      const city = this.getCityFromCountry(country);
      const timezone = this.getTimezoneFromCountry(country);

      console.log('✅ [LOCATION] Fallback aplicado:', { country, region, city, timezone });

      return {
        latitude: 0,
        longitude: 0,
        country,
        region,
        city,
        timezone
      };

    } catch (error) {
      console.error('❌ [LOCATION] Error en fallback:', error);
      
      // Último fallback: España por defecto
      return {
        latitude: 40.4168,
        longitude: -3.7038,
        country: 'ES',
        region: 'Madrid',
        city: 'Madrid',
        timezone: 'Europe/Madrid'
      };
    }
  }

  /**
   * Obtiene la configuración regional de Android
   */
  private async getAndroidLocale(): Promise<string> {
    try {
      // Usar NativeModules para obtener configuración regional
      const { NativeModules } = require('react-native');
      if (NativeModules.I18nManager) {
        return await NativeModules.I18nManager.getLocale();
      }
      return 'es_ES'; // Fallback
    } catch (error) {
      return 'es_ES'; // Fallback
    }
  }

  /**
   * Obtiene la configuración regional de iOS
   */
  private getIOSLocale(): string {
    try {
      const { NativeModules } = require('react-native');
      if (NativeModules.SettingsManager) {
        return NativeModules.SettingsManager.settings.AppleLocale || 'es_ES';
      }
      return 'es_ES'; // Fallback
    } catch (error) {
      return 'es_ES'; // Fallback
    }
  }

  /**
   * Mapea configuración regional a código de país
   */
  private getCountryFromLocale(locale: string): string {
    const localeMap: Record<string, string> = {
      'pt_PT': 'PT',
      'pt_BR': 'BR',
      'es_ES': 'ES',
      'es_MX': 'MX',
      'es_AR': 'AR',
      'en_US': 'US',
      'en_GB': 'GB',
      'en_CA': 'CA',
      'fr_FR': 'FR',
      'fr_CA': 'CA',
      'de_DE': 'DE',
      'it_IT': 'IT',
      'nl_NL': 'NL',
      'ru_RU': 'RU',
      'zh_CN': 'CN',
      'ja_JP': 'JP',
      'ko_KR': 'KR',
      'ar_SA': 'SA',
      'hi_IN': 'IN',
      'th_TH': 'TH',
      'vi_VN': 'VN',
      'tr_TR': 'TR',
      'pl_PL': 'PL',
      'sv_SE': 'SE',
      'no_NO': 'NO',
      'da_DK': 'DK',
      'fi_FI': 'FI',
      'cs_CZ': 'CZ',
      'hu_HU': 'HU',
      'ro_RO': 'RO',
      'bg_BG': 'BG',
      'hr_HR': 'HR',
      'sk_SK': 'SK',
      'sl_SI': 'SI',
      'et_EE': 'EE',
      'lv_LV': 'LV',
      'lt_LT': 'LT',
      'el_GR': 'GR',
      'he_IL': 'IL',
      'uk_UA': 'UA',
      'be_BY': 'BY',
      'ka_GE': 'GE',
      'hy_AM': 'AM',
      'az_AZ': 'AZ',
      'kk_KZ': 'KZ',
      'ky_KG': 'KG',
      'uz_UZ': 'UZ',
      'tg_TJ': 'TJ',
      'mn_MN': 'MN',
      'my_MM': 'MM',
      'km_KH': 'KH',
      'lo_LA': 'LA',
      'si_LK': 'LK',
      'ne_NP': 'NP',
      'bn_BD': 'BD',
      'ur_PK': 'PK',
      'fa_IR': 'IR',
      'ku_TR': 'TR',
      'ar_EG': 'EG',
      'ar_MA': 'MA',
      'ar_TN': 'TN',
      'ar_DZ': 'DZ',
      'ar_LY': 'LY',
      'ar_SD': 'SD',
      'ar_IQ': 'IQ',
      'ar_SY': 'SY',
      'ar_LB': 'LB',
      'ar_JO': 'JO',
      'ar_PS': 'PS',
      'ar_AE': 'AE',
      'ar_QA': 'QA',
      'ar_BH': 'BH',
      'ar_KW': 'KW',
      'ar_OM': 'OM',
      'ar_YE': 'YE',
      'sw_KE': 'KE',
      'sw_TZ': 'TZ',
      'sw_UG': 'UG',
      'am_ET': 'ET',
      'ti_ET': 'ET',
      'om_ET': 'ET',
      'so_SO': 'SO',
      'ha_NG': 'NG',
      'yo_NG': 'NG',
      'ig_NG': 'NG',
      'zu_ZA': 'ZA',
      'xh_ZA': 'ZA',
      'af_ZA': 'ZA',
      'en_ZA': 'ZA',
      'en_NG': 'NG',
      'en_KE': 'KE',
      'en_GH': 'GH',
      'en_UG': 'UG',
      'en_TZ': 'TZ',
      'en_ZW': 'ZW',
      'en_BW': 'BW',
      'en_NA': 'NA',
      'en_SZ': 'SZ',
      'en_LS': 'LS',
      'en_MW': 'MW',
      'en_ZM': 'ZM',
      'en_MZ': 'MZ',
      'en_AO': 'AO',
      'en_CM': 'CM',
      'en_CI': 'CI',
      'en_SN': 'SN',
      'en_ML': 'ML',
      'en_BF': 'BF',
      'en_NE': 'NE',
      'en_TD': 'TD',
      'en_CF': 'CF',
      'en_CG': 'CG',
      'en_CD': 'CD',
      'en_GA': 'GA',
      'en_GQ': 'GQ',
      'en_ST': 'ST',
      'en_CV': 'CV',
      'en_GW': 'GW',
      'en_GN': 'GN',
      'en_SL': 'SL',
      'en_LR': 'LR',
      'en_GM': 'GM',
      'en_GH': 'GH',
      'en_TG': 'TG',
      'en_BJ': 'BJ'
    };

    return localeMap[locale] || 'ES';
  }

  /**
   * Obtiene región desde código de país
   */
  private getRegionFromCountry(country: string): string {
    const regionMap: Record<string, string> = {
      'PT': 'Portugal',
      'BR': 'Brasil',
      'ES': 'España',
      'MX': 'México',
      'AR': 'Argentina',
      'US': 'Estados Unidos',
      'GB': 'Reino Unido',
      'CA': 'Canadá',
      'FR': 'Francia',
      'DE': 'Alemania',
      'IT': 'Italia',
      'NL': 'Países Bajos',
      'RU': 'Rusia',
      'CN': 'China',
      'JP': 'Japón',
      'KR': 'Corea del Sur',
      'SA': 'Arabia Saudí',
      'IN': 'India',
      'TH': 'Tailandia',
      'VN': 'Vietnam',
      'TR': 'Turquía',
      'PL': 'Polonia',
      'SE': 'Suecia',
      'NO': 'Noruega',
      'DK': 'Dinamarca',
      'FI': 'Finlandia',
      'CZ': 'República Checa',
      'HU': 'Hungría',
      'RO': 'Rumanía',
      'BG': 'Bulgaria',
      'HR': 'Croacia',
      'SK': 'Eslovaquia',
      'SI': 'Eslovenia',
      'EE': 'Estonia',
      'LV': 'Letonia',
      'LT': 'Lituania',
      'GR': 'Grecia',
      'IL': 'Israel',
      'UA': 'Ucrania',
      'BY': 'Bielorrusia',
      'GE': 'Georgia',
      'AM': 'Armenia',
      'AZ': 'Azerbaiyán',
      'KZ': 'Kazajistán',
      'KG': 'Kirguistán',
      'UZ': 'Uzbekistán',
      'TJ': 'Tayikistán',
      'MN': 'Mongolia',
      'MM': 'Myanmar',
      'KH': 'Camboya',
      'LA': 'Laos',
      'LK': 'Sri Lanka',
      'NP': 'Nepal',
      'BD': 'Bangladesh',
      'PK': 'Pakistán',
      'IR': 'Irán',
      'EG': 'Egipto',
      'MA': 'Marruecos',
      'TN': 'Túnez',
      'DZ': 'Argelia',
      'LY': 'Libia',
      'SD': 'Sudán',
      'IQ': 'Irak',
      'SY': 'Siria',
      'LB': 'Líbano',
      'JO': 'Jordania',
      'PS': 'Palestina',
      'AE': 'Emiratos Árabes Unidos',
      'QA': 'Catar',
      'BH': 'Baréin',
      'KW': 'Kuwait',
      'OM': 'Omán',
      'YE': 'Yemen',
      'KE': 'Kenia',
      'TZ': 'Tanzania',
      'UG': 'Uganda',
      'SO': 'Somalia',
      'ET': 'Etiopía',
      'NG': 'Nigeria',
      'ZA': 'Sudáfrica',
      'ZW': 'Zimbabue',
      'BW': 'Botsuana',
      'NA': 'Namibia',
      'SZ': 'Suazilandia',
      'LS': 'Lesoto',
      'MW': 'Malaui',
      'ZM': 'Zambia',
      'MZ': 'Mozambique',
      'AO': 'Angola',
      'CM': 'Camerún',
      'CI': 'Costa de Marfil',
      'SN': 'Senegal',
      'ML': 'Malí',
      'BF': 'Burkina Faso',
      'NE': 'Níger',
      'TD': 'Chad',
      'CF': 'República Centroafricana',
      'CG': 'República del Congo',
      'CD': 'República Democrática del Congo',
      'GA': 'Gabón',
      'GQ': 'Guinea Ecuatorial',
      'ST': 'Santo Tomé y Príncipe',
      'CV': 'Cabo Verde',
      'GW': 'Guinea-Bisáu',
      'GN': 'Guinea',
      'SL': 'Sierra Leona',
      'LR': 'Liberia',
      'GM': 'Gambia',
      'GH': 'Ghana',
      'TG': 'Togo',
      'BJ': 'Benín'
    };

    return regionMap[country] || 'Desconocido';
  }

  /**
   * Obtiene ciudad desde código de país
   */
  private getCityFromCountry(country: string): string {
    const cityMap: Record<string, string> = {
      'PT': 'Lisboa',
      'BR': 'São Paulo',
      'ES': 'Madrid',
      'MX': 'Ciudad de México',
      'AR': 'Buenos Aires',
      'US': 'Nueva York',
      'GB': 'Londres',
      'CA': 'Toronto',
      'FR': 'París',
      'DE': 'Berlín',
      'IT': 'Roma',
      'NL': 'Ámsterdam',
      'RU': 'Moscú',
      'CN': 'Pekín',
      'JP': 'Tokio',
      'KR': 'Seúl',
      'SA': 'Riad',
      'IN': 'Nueva Delhi',
      'TH': 'Bangkok',
      'VN': 'Ho Chi Minh',
      'TR': 'Estambul',
      'PL': 'Varsovia',
      'SE': 'Estocolmo',
      'NO': 'Oslo',
      'DK': 'Copenhague',
      'FI': 'Helsinki',
      'CZ': 'Praga',
      'HU': 'Budapest',
      'RO': 'Bucarest',
      'BG': 'Sofía',
      'HR': 'Zagreb',
      'SK': 'Bratislava',
      'SI': 'Liubliana',
      'EE': 'Tallin',
      'LV': 'Riga',
      'LT': 'Vilna',
      'GR': 'Atenas',
      'IL': 'Jerusalén',
      'UA': 'Kiev',
      'BY': 'Minsk',
      'GE': 'Tiflis',
      'AM': 'Ereván',
      'AZ': 'Bakú',
      'KZ': 'Nursultán',
      'KG': 'Biskek',
      'UZ': 'Taskent',
      'TJ': 'Dusambé',
      'MN': 'Ulán Bator',
      'MM': 'Naipyidó',
      'KH': 'Nom Pen',
      'LA': 'Vientián',
      'LK': 'Colombo',
      'NP': 'Katmandú',
      'BD': 'Daca',
      'PK': 'Islamabad',
      'IR': 'Teherán',
      'EG': 'El Cairo',
      'MA': 'Rabat',
      'TN': 'Túnez',
      'DZ': 'Argel',
      'LY': 'Trípoli',
      'SD': 'Jartum',
      'IQ': 'Bagdad',
      'SY': 'Damasco',
      'LB': 'Beirut',
      'JO': 'Amán',
      'PS': 'Ramala',
      'AE': 'Abu Dabi',
      'QA': 'Doha',
      'BH': 'Manama',
      'KW': 'Kuwait',
      'OM': 'Mascate',
      'YE': 'Saná',
      'KE': 'Nairobi',
      'TZ': 'Dodoma',
      'UG': 'Kampala',
      'SO': 'Mogadiscio',
      'ET': 'Adís Abeba',
      'NG': 'Abuja',
      'ZA': 'Pretoria',
      'ZW': 'Harare',
      'BW': 'Gaborone',
      'NA': 'Windhoek',
      'SZ': 'Mbabane',
      'LS': 'Maseru',
      'MW': 'Lilongüe',
      'ZM': 'Lusaka',
      'MZ': 'Maputo',
      'AO': 'Luanda',
      'CM': 'Yaundé',
      'CI': 'Yamusukro',
      'SN': 'Dakar',
      'ML': 'Bamako',
      'BF': 'Uagadugú',
      'NE': 'Niamey',
      'TD': 'Yamena',
      'CF': 'Bangui',
      'CG': 'Brazzaville',
      'CD': 'Kinsasa',
      'GA': 'Libreville',
      'GQ': 'Malabo',
      'ST': 'São Tomé',
      'CV': 'Praia',
      'GW': 'Bisáu',
      'GN': 'Conakri',
      'SL': 'Freetown',
      'LR': 'Monrovia',
      'GM': 'Banjul',
      'GH': 'Accra',
      'TG': 'Lomé',
      'BJ': 'Porto Novo'
    };

    return cityMap[country] || 'Ciudad';
  }

  /**
   * Obtiene zona horaria desde código de país
   */
  private getTimezoneFromCountry(country: string): string {
    const timezoneMap: Record<string, string> = {
      'PT': 'Europe/Lisbon',
      'BR': 'America/Sao_Paulo',
      'ES': 'Europe/Madrid',
      'MX': 'America/Mexico_City',
      'AR': 'America/Argentina/Buenos_Aires',
      'US': 'America/New_York',
      'GB': 'Europe/London',
      'CA': 'America/Toronto',
      'FR': 'Europe/Paris',
      'DE': 'Europe/Berlin',
      'IT': 'Europe/Rome',
      'NL': 'Europe/Amsterdam',
      'RU': 'Europe/Moscow',
      'CN': 'Asia/Shanghai',
      'JP': 'Asia/Tokyo',
      'KR': 'Asia/Seoul',
      'SA': 'Asia/Riyadh',
      'IN': 'Asia/Kolkata',
      'TH': 'Asia/Bangkok',
      'VN': 'Asia/Ho_Chi_Minh',
      'TR': 'Europe/Istanbul',
      'PL': 'Europe/Warsaw',
      'SE': 'Europe/Stockholm',
      'NO': 'Europe/Oslo',
      'DK': 'Europe/Copenhagen',
      'FI': 'Europe/Helsinki',
      'CZ': 'Europe/Prague',
      'HU': 'Europe/Budapest',
      'RO': 'Europe/Bucharest',
      'BG': 'Europe/Sofia',
      'HR': 'Europe/Zagreb',
      'SK': 'Europe/Bratislava',
      'SI': 'Europe/Ljubljana',
      'EE': 'Europe/Tallinn',
      'LV': 'Europe/Riga',
      'LT': 'Europe/Vilnius',
      'GR': 'Europe/Athens',
      'IL': 'Asia/Jerusalem',
      'UA': 'Europe/Kiev',
      'BY': 'Europe/Minsk',
      'GE': 'Asia/Tbilisi',
      'AM': 'Asia/Yerevan',
      'AZ': 'Asia/Baku',
      'KZ': 'Asia/Almaty',
      'KG': 'Asia/Bishkek',
      'UZ': 'Asia/Tashkent',
      'TJ': 'Asia/Dushanbe',
      'MN': 'Asia/Ulaanbaatar',
      'MM': 'Asia/Yangon',
      'KH': 'Asia/Phnom_Penh',
      'LA': 'Asia/Vientiane',
      'LK': 'Asia/Colombo',
      'NP': 'Asia/Kathmandu',
      'BD': 'Asia/Dhaka',
      'PK': 'Asia/Karachi',
      'IR': 'Asia/Tehran',
      'EG': 'Africa/Cairo',
      'MA': 'Africa/Casablanca',
      'TN': 'Africa/Tunis',
      'DZ': 'Africa/Algiers',
      'LY': 'Africa/Tripoli',
      'SD': 'Africa/Khartoum',
      'IQ': 'Asia/Baghdad',
      'SY': 'Asia/Damascus',
      'LB': 'Asia/Beirut',
      'JO': 'Asia/Amman',
      'PS': 'Asia/Gaza',
      'AE': 'Asia/Dubai',
      'QA': 'Asia/Qatar',
      'BH': 'Asia/Bahrain',
      'KW': 'Asia/Kuwait',
      'OM': 'Asia/Muscat',
      'YE': 'Asia/Aden',
      'KE': 'Africa/Nairobi',
      'TZ': 'Africa/Dar_es_Salaam',
      'UG': 'Africa/Kampala',
      'SO': 'Africa/Mogadishu',
      'ET': 'Africa/Addis_Ababa',
      'NG': 'Africa/Lagos',
      'ZA': 'Africa/Johannesburg',
      'ZW': 'Africa/Harare',
      'BW': 'Africa/Gaborone',
      'NA': 'Africa/Windhoek',
      'SZ': 'Africa/Mbabane',
      'LS': 'Africa/Maseru',
      'MW': 'Africa/Blantyre',
      'ZM': 'Africa/Lusaka',
      'MZ': 'Africa/Maputo',
      'AO': 'Africa/Luanda',
      'CM': 'Africa/Douala',
      'CI': 'Africa/Abidjan',
      'SN': 'Africa/Dakar',
      'ML': 'Africa/Bamako',
      'BF': 'Africa/Ouagadougou',
      'NE': 'Africa/Niamey',
      'TD': 'Africa/Ndjamena',
      'CF': 'Africa/Bangui',
      'CG': 'Africa/Brazzaville',
      'CD': 'Africa/Kinshasa',
      'GA': 'Africa/Libreville',
      'GQ': 'Africa/Malabo',
      'ST': 'Africa/Sao_Tome',
      'CV': 'Atlantic/Cape_Verde',
      'GW': 'Africa/Bissau',
      'GN': 'Africa/Conakry',
      'SL': 'Africa/Freetown',
      'LR': 'Africa/Monrovia',
      'GM': 'Africa/Banjul',
      'GH': 'Africa/Accra',
      'TG': 'Africa/Lome',
      'BJ': 'Africa/Porto-Novo'
    };

    return timezoneMap[country] || 'Europe/Madrid';
  }

  /**
   * Método legacy para compatibilidad (ahora usa IP)
   */
  async requestLocationPermission(): Promise<boolean> {
    // Con detección por IP no necesitamos permisos de GPS
    console.log('✅ [LOCATION] Permisos de ubicación no requeridos (detección por IP)');
    return true;
  }
}