
// Store checkout intent before authentication
export interface CheckoutIntent {
  priceId: string;
  planType: string;
  timestamp: number;
}

export const storeCheckoutIntent = (priceId: string, planType: string) => {
  const intent: CheckoutIntent = {
    priceId,
    planType,
    timestamp: Date.now()
  };
  sessionStorage.setItem('checkout_intent', JSON.stringify(intent));
};

export const getCheckoutIntent = (): CheckoutIntent | null => {
  const stored = sessionStorage.getItem('checkout_intent');
  if (!stored) return null;
  
  const intent = JSON.parse(stored) as CheckoutIntent;
  
  // Clear intents older than 30 minutes
  if (Date.now() - intent.timestamp > 30 * 60 * 1000) {
    clearCheckoutIntent();
    return null;
  }
  
  return intent;
};

export const clearCheckoutIntent = () => {
  sessionStorage.removeItem('checkout_intent');
};
