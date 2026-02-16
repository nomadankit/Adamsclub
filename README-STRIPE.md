
# Stripe Checkout Integration Guide

## Required Secrets (Add in Replit Secrets)

Configure these secrets in your Replit workspace under **Tools → Secrets**:

1. **STRIPE_SECRET_KEY** - Your Stripe secret key (starts with `sk_test_`)
2. **VITE_STRIPE_PUBLISHABLE_KEY** - Your Stripe publishable key (starts with `pk_test_`)
3. **VITE_STRIPE_BASIC_PRICE_ID** - Price ID for Basic plan (starts with `price_`)
4. **VITE_STRIPE_PREMIUM_PRICE_ID** - Price ID for Premium plan (starts with `price_`)
5. **VITE_STRIPE_VIP_PRICE_ID** - Price ID for VIP plan (starts with `price_`)

## How to Get Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (pk_test_...)
3. Reveal and copy your **Secret key** (sk_test_...)

## How to Create Price IDs

1. Go to https://dashboard.stripe.com/test/products
2. Create a product for each plan (Basic, Premium, VIP)
3. Add a recurring subscription price to each product
4. Copy the Price ID (price_...) for each plan

## How to Run Locally/on Replit

1. Ensure all secrets are configured
2. Click the **Run** button in Replit
3. Navigate to the Upgrade Plan page
4. Click any "Upgrade to..." button

## How to Switch Products

To use different Stripe products/prices:

1. Update the price IDs in Replit Secrets:
   - `VITE_STRIPE_BASIC_PRICE_ID`
   - `VITE_STRIPE_PREMIUM_PRICE_ID`
   - `VITE_STRIPE_VIP_PRICE_ID`
2. Restart the application (stop and click Run again)

## Testing with Stripe Test Card

When redirected to Stripe Checkout:

- **Card Number**: 4242 4242 4242 4242
- **Expiry Date**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

After successful payment, you'll be redirected to `/account?payment_success=true&type=subscription`

## Troubleshooting

### Checkout doesn't open
1. Check browser console (F12) for errors
2. Verify all secrets are set in Replit Secrets
3. Visit `/api/stripe/health` to check configuration status
4. Ensure price IDs exist in your Stripe dashboard

### "No price ID configured" error
- Verify the price ID secrets are set with exact names above
- Restart the application after adding secrets

### Redirect blocked
- Ensure you're not testing in an embedded iframe
- Open the app in a new browser tab
- Check for any browser popup blockers

## Verification Steps

1. **Server Health Check**:
   ```bash
   curl https://your-repl-url.repl.co/api/stripe/health
   ```
   Should return: `{ "ok": true, "test_mode": true, ... }`

2. **Session Creation**:
   ```bash
   curl -X POST https://your-repl-url.repl.co/api/stripe/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"priceId":"price_xxx","planType":"basic"}' \
     --cookie "your-session-cookie"
   ```
   Should return: `{ "url": "https://checkout.stripe.com/..." }`

3. **Full Flow Test**:
   - Click "Upgrade to Basic/Premium/VIP"
   - Should redirect to `https://checkout.stripe.com/...`
   - Complete payment with test card
   - Should redirect back to `/account?payment_success=true`

## Important Notes

- Always use TEST mode keys (sk_test_*, pk_test_*)
- Never commit secrets to version control
- Price IDs must match products in your Stripe dashboard
- Checkout opens in top-level window (not iframe)
