import { ShopifyCookieAnalysis } from '../types/shopify';
import { Cookies } from '@react-native-cookies/cookies';

export class ShopifyCookieAnalyzer {
  private static readonly SHOPIFY_COOKIES = [
    '_shopify_s',           // Session ID
    '_shopify_sa_t',        // Session timestamp
    'cart',                 // Cart token
    'cart_ts',              // Cart timestamp
    'customer_signed_in',   // Customer authentication status
    'customer_id',          // Customer ID
    'localization',         // Language/region
    'currency'              // Currency
  ];

  static analyzeCookies(cookies: Cookies): ShopifyCookieAnalysis {
    const analysis: ShopifyCookieAnalysis = {
      hasSession: false,
      isCustomerSignedIn: false,
      hasCart: false,
      customerId: null,
      sessionId: null,
      cartToken: null,
      customerEmail: null,
      timestamp: new Date().toISOString()
    };

    // Analizar cada cookie relevante
    Object.entries(cookies).forEach(([name, cookie]) => {
      if (this.SHOPIFY_COOKIES.includes(name)) {
        switch (name) {
          case '_shopify_s':
            analysis.hasSession = true;
            analysis.sessionId = cookie.value;
            break;
          case '_shopify_sa_t':
            // Verificar que la sesión no haya expirado (24 horas)
            const sessionTime = parseInt(cookie.value);
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime - sessionTime < 86400) { // 24 horas
              analysis.hasSession = true;
            }
            break;
          case 'customer_signed_in':
            analysis.isCustomerSignedIn = cookie.value === '1';
            break;
          case 'customer_id':
            analysis.customerId = cookie.value;
            break;
          case 'cart':
            analysis.hasCart = true;
            analysis.cartToken = cookie.value;
            break;
        }
      }
    });

    return analysis;
  }

  static isCustomerAuthenticated(analysis: ShopifyCookieAnalysis): boolean {
    return analysis.isCustomerSignedIn && 
           analysis.customerId !== null && 
           analysis.hasSession;
  }

  static getCustomerIdentifier(analysis: ShopifyCookieAnalysis): string | null {
    if (analysis.isCustomerSignedIn && analysis.customerId) {
      return `customer_${analysis.customerId}`;
    }
    return null;
  }

  static getCustomerEmail(analysis: ShopifyCookieAnalysis): string | null {
    // En Shopify, el email no siempre está en las cookies
    // Se puede obtener del customer_id o de la API
    if (analysis.customerId) {
      return `customer_${analysis.customerId}@gst3d.eu`;
    }
    return null;
  }
}

