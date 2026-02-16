
# Stripe Testing Guide

## Required Secrets

Add these to Replit's Secrets panel:

1. **STRIPE_SECRET_KEY** - Your Stripe secret key (starts with `sk_test_`)
2. **STRIPE_PUBLISHABLE_KEY** - Your Stripe publishable key (starts with `pk_test_`)
3. **VITE_STRIPE_PUBLISHABLE_KEY** - Same as STRIPE_PUBLISHABLE_KEY (for client)
4. **STRIPE_WEBHOOK_SECRET** - Webhook signing secret (starts with `whsec_`)
5. **VITE_STRIPE_BASIC_PRICE_ID** - Price ID for Basic plan (starts with `price_`)
6. **VITE_STRIPE_PREMIUM_PRICE_ID** - Price ID for Premium plan (starts with `price_`)
7. **VITE_STRIPE_VIP_PRICE_ID** - Price ID for VIP plan (starts with `price_`)

## How to Get Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (pk_test_...)
3. Reveal and copy your **Secret key** (sk_test_...)
4. For webhook secret: Go to Developers → Webhooks → Add endpoint → Use `/api/webhook` → Copy the signing secret

## How to Create Price IDs

1. Go to https://dashboard.stripe.com/test/products
2. Create a product for each plan (Basic, Premium, VIP)
3. Add a recurring price to each product
4. Copy the Price ID (price_...) for each

## How to Test

1. Click any "Upgrade to..." button
2. You should be redirected to Stripe's hosted checkout page (checkout.stripe.com)
3. Use test card: **4242 4242 4242 4242**
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

## Troubleshooting

If checkout doesn't open:

1. Check server console for errors
2. Check browser console (F12) → Network tab
3. Verify all secrets are set correctly
4. Ensure price IDs exist in your Stripe dashboard
5. Check `/api/stripe/health` endpoint returns `{ ok: true }`

## Changing Products

To use different products/prices:

1. Update the price IDs in Replit Secrets
2. Restart the application
