import { ShopifyCustomerInfo, ShopifyCookieAnalysis } from '../types/shopify';
import CookieManager from '@react-native-cookies/cookies';
import { ShopifyCookieAnalyzer } from '../utils/shopifyCookieAnalyzer';

export class ShopifyCustomerService {
  private static instance: ShopifyCustomerService;
  private customerInfo: ShopifyCustomerInfo | null = null;

  static getInstance(): ShopifyCustomerService {
    if (!ShopifyCustomerService.instance) {
      ShopifyCustomerService.instance = new ShopifyCustomerService();
    }
    return ShopifyCustomerService.instance;
  }

  async detectCustomerStatus(): Promise<ShopifyCustomerInfo | null> {
    try {
      // 1. Analizar cookies locales
      const cookieAnalysis = await this.analyzeLocalCookies();
      
      if (!cookieAnalysis.isCustomerSignedIn || !cookieAnalysis.customerId) {
        this.customerInfo = null;
        return null;
      }

      // 2. Crear información básica del cliente desde cookies
      const customerInfo: ShopifyCustomerInfo = {
        id: cookieAnalysis.customerId,
        email: cookieAnalysis.customerEmail || `customer_${cookieAnalysis.customerId}@gst3d.eu`,
        displayName: `Cliente ${cookieAnalysis.customerId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.customerInfo = customerInfo;
      return customerInfo;
    } catch (error) {
      console.error('Error detecting customer status:', error);
      return null;
    }
  }

  private async analyzeLocalCookies(): Promise<ShopifyCookieAnalysis> {
    const cookies = await CookieManager.get('https://gst3d.eu', true);
    return ShopifyCookieAnalyzer.analyzeCookies(cookies);
  }

  getCurrentCustomer(): ShopifyCustomerInfo | null {
    return this.customerInfo;
  }

  clearCustomer(): void {
    this.customerInfo = null;
  }

  async getCustomerFromCookies(): Promise<ShopifyCookieAnalysis | null> {
    try {
      return await this.analyzeLocalCookies();
    } catch (error) {
      console.error('Error getting customer from cookies:', error);
      return null;
    }
  }
}

