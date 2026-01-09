export interface ShopifyCookieAnalysis {
  hasSession: boolean;
  isCustomerSignedIn: boolean;
  hasCart: boolean;
  customerId: string | null;
  sessionId: string | null;
  cartToken: string | null;
  customerEmail: string | null;
  timestamp: string;
}

export interface ShopifyCustomerInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopifyPushPayload {
  token: string;
  customerId: string;
  email: string;
  platform: string;
  timestamp: string;
  shopifySessionId?: string;
  cartToken?: string;
}

export interface ShopifyNotificationData {
  customerId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notificationType?: string;
}

