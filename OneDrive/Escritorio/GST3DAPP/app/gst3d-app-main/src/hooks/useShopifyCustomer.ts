import { useState, useCallback } from 'react';
import { ShopifyCustomerService } from '../services/ShopifyCustomerService';
import { ShopifyCustomerInfo } from '../types/shopify';

export const useShopifyCustomer = () => {
  const [customerInfo, setCustomerInfo] = useState<ShopifyCustomerInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectCustomer = useCallback(async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const shopifyService = ShopifyCustomerService.getInstance();
      const customer = await shopifyService.detectCustomerStatus();
      
      setCustomerInfo(customer);
      
      if (customer) {
        console.log('Customer detected:', customer);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error detecting customer:', err);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomerInfo(null);
    setError(null);
    const shopifyService = ShopifyCustomerService.getInstance();
    shopifyService.clearCustomer();
  }, []);

  return {
    customerInfo,
    isDetecting,
    error,
    detectCustomer,
    clearCustomer
  };
};

