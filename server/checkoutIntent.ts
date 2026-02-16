
import { storage } from './storage';

export interface CheckoutIntent {
  id: string;
  userId?: string;
  priceId: string;
  planSlug: string;
  status: 'pending' | 'consumed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

const INTENT_TTL = 15 * 60 * 1000; // 15 minutes

// Server-side allowlist of valid price IDs
const VALID_PRICE_IDS: Record<string, string> = {
  'starter': 'price_1SBLHoD0boAhB99ci4T5bUxh',
  'basic': 'price_1SBLHoD0boAhB99ci4T5bUxh',
  'premium': 'price_1SBLI9D0boAhB99c4PWMz6CY',
  'vip': 'price_1SBLIRD0boAhB99ckwLGwGXW',
  // New subscription plans
  'base-explorer': process.env.STRIPE_BASE_EXPLORER_PRICE_ID || 'price_1SjNUDD0boAhB99ci0QnGBke',
  'premium-adventurer': process.env.STRIPE_PREMIUM_ADVENTURER_PRICE_ID || 'price_1SjNW3D0boAhB99cCpCEnhEj',
  'vip-pathfinder': process.env.STRIPE_VIP_PATHFINDER_PRICE_ID || 'price_1SjNWaD0boAhB99cTGYq3Dzh'
};

const intents = new Map<string, CheckoutIntent>();

export function validatePlanSlug(planSlug: string): string | null {
  return VALID_PRICE_IDS[planSlug.toLowerCase()] || null;
}

export function createIntent(planSlug: string, userId?: string): CheckoutIntent {
  const priceId = validatePlanSlug(planSlug);
  if (!priceId) {
    throw new Error('Invalid plan slug');
  }

  const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const intent: CheckoutIntent = {
    id: intentId,
    userId,
    priceId,
    planSlug: planSlug.toLowerCase(),
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + INTENT_TTL)
  };

  intents.set(intentId, intent);

  // Clean up expired intents
  cleanupExpiredIntents();

  return intent;
}

export function getIntent(intentId: string): CheckoutIntent | null {
  const intent = intents.get(intentId);

  if (!intent) {
    return null;
  }

  // Check if expired
  if (intent.expiresAt < new Date()) {
    intent.status = 'expired';
    return null;
  }

  return intent;
}

export function consumeIntent(intentId: string, userId: string): CheckoutIntent | null {
  const intent = getIntent(intentId);

  if (!intent) {
    return null;
  }

  if (intent.status !== 'pending') {
    return null;
  }

  // If intent has a userId, verify it matches
  if (intent.userId && intent.userId !== userId) {
    return null;
  }

  // Claim the intent if it was unclaimed
  if (!intent.userId) {
    intent.userId = userId;
  }

  intent.status = 'consumed';
  intents.set(intentId, intent);

  return intent;
}

function cleanupExpiredIntents() {
  const now = new Date();
  for (const [id, intent] of Array.from(intents.entries())) {
    if (intent.expiresAt < now || intent.status === 'consumed') {
      intents.delete(id);
    }
  }
}
