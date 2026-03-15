# Stripe — SaaS

Checkout sessions, webhooks, subscriptions, customer portal, and test mode patterns.

---

## SDK Initialization

Single Stripe client instance, initialized once:

```typescript
// src/lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
```

**Never import Stripe in client components.** The secret key must stay server-side. Use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` only for Stripe.js (the client-side library) if you need embedded payment forms.

---

## Checkout Sessions

Stripe Checkout is a hosted payment page. You create a session server-side and redirect the user to it.

```typescript
// src/lib/stripe/checkout.ts
import { stripe } from './client.js';

export async function createCheckoutSession(params: {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId, // Used in webhook to link Stripe customer to your user
    },
    subscription_data: {
      metadata: {
        user_id: params.userId,
      },
    },
  });
}
```

**Always pass `user_id` in metadata.** This is how your webhook handler knows which user to provision. Without it, you can't link the Stripe customer to your database user.

### One-Time Payments

Change `mode` to `'payment'` for one-time purchases:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { user_id: userId },
});
```

### Server Action for Checkout

```typescript
// src/app/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/stripe/checkout';

export async function subscribe(priceId: string) {
  const user = await getAuthenticatedUser(); // Your auth helper
  if (!user) throw new Error('Unauthorized');

  const session = await createCheckoutSession({
    userId: user.id,
    priceId,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  redirect(session.url!);
}
```

---

## Webhook Handler

The webhook endpoint receives events from Stripe and updates your database.

```typescript
// src/app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe/client';
import { handleWebhookEvent } from '@/lib/stripe/webhooks';

export async function POST(req: Request) {
  const body = await req.text(); // Raw body for signature verification
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}:`, err);
    return new Response('Webhook handler error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
```

### Event Handler Logic

```typescript
// src/lib/stripe/webhooks.ts
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function handleWebhookEvent(event: Stripe.Event) {
  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId) throw new Error('Missing user_id in session metadata');

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
      }, { onConflict: 'user_id' });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions').update({
        status: subscription.status,
        stripe_price_id: subscription.items.data[0]?.price.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions').update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase.from('subscriptions').update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', invoice.subscription as string);
      break;
    }

    default:
      // Unhandled event type — log but don't fail
      console.error(`Unhandled webhook event type: ${event.type}`);
  }
}
```

### Events to Handle

At minimum, handle these events:

| Event | When | Action |
|-------|------|--------|
| `checkout.session.completed` | User completes checkout | Provision access |
| `customer.subscription.updated` | Plan change, renewal, trial end | Sync subscription state |
| `customer.subscription.deleted` | Subscription canceled | Revoke access |
| `invoice.payment_failed` | Payment declined | Mark as past_due, notify user |

---

## Customer Portal

Stripe's hosted portal lets users manage their subscription (upgrade, downgrade, cancel, update payment method) without you building any UI.

```typescript
// src/lib/stripe/portal.ts
import { stripe } from './client.js';

export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}
```

```typescript
// Server Action to redirect to portal
'use server';

import { redirect } from 'next/navigation';
import { createPortalSession } from '@/lib/stripe/portal';

export async function manageSubscription() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) throw new Error('No subscription found');

  const session = await createPortalSession({
    customerId: sub.stripe_customer_id,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  redirect(session.url);
}
```

**Configure the portal in Stripe Dashboard** (Settings > Billing > Customer Portal) to enable/disable features like cancellation, plan switching, and payment method updates.

---

## Checking Subscription Status

Gate features based on subscription status:

```typescript
// src/lib/stripe/access.ts
import { createClient } from '@/lib/supabase/server';

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  return data?.status === 'active' || data?.status === 'trialing';
}
```

Use this in Server Components, Server Actions, and API routes:

```typescript
// In a page
const isPro = await hasActiveSubscription(user.id);
if (!isPro) redirect('/pricing');
```

---

## Test Mode

Stripe test mode uses separate API keys (`sk_test_...`, `pk_test_...`) and a completely isolated environment. No real money is ever charged.

### Test Cards

| Number | Behaviour |
|--------|-----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | Requires 3D Secure |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date and any 3-digit CVC.

### Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login (one time)
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret (`whsec_...`). Set this as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Trigger Test Events

```bash
# Trigger a specific event
stripe trigger checkout.session.completed

# Trigger with a specific customer
stripe trigger customer.subscription.updated --add customer:cus_test_123
```

### Stripe Dashboard (Test Mode)

Toggle "Test mode" in the top-right of the Stripe Dashboard. All test-mode data (customers, subscriptions, invoices) is visible here. Use it to verify your webhook handlers are working.

---

## Pricing Page Pattern

Keep pricing data in a constants file, not hardcoded in JSX:

```typescript
// src/lib/constants.ts
export const PLANS = [
  {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: ['Up to 3 projects', 'Community support'],
  },
  {
    name: 'Pro',
    price: 12,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: ['Unlimited projects', 'Priority support', 'API access'],
  },
] as const;
```

This makes pricing changes a single-file edit, and the same data drives both the pricing page UI and checkout logic.
