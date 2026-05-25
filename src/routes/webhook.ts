import { Context } from 'hono';
import Stripe from 'stripe';
import { pbList, pbUpdate, pbCreate, pbGetRecord } from '../lib/pocketbase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function handleStripeWebhook(c: Context): Promise<Response> {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');

  if (!sig) return c.json({ error: 'Missing stripe-signature header' }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const ordersData = await pbList('orders', {
      filter: `stripe_session_id='${session.id}'`,
      maxRecords: 1,
    });
    const order = ordersData.records?.[0];
    if (order) {
      await pbUpdate('orders', order.id, {
        capture_status: 'pending',
        payment_intent_id: session.payment_intent,
      });
    }
  }

  if (event.type === 'payment_intent.amount_capturable_updated') {
    const pi = event.data.object as Stripe.PaymentIntent;
    console.log(`Pre-auth confirmed: PI ${pi.id}, capturable: ${pi.amount_capturable}`);
  }

  if (event.type === 'payment_intent.canceled') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const ordersData = await pbList('orders', {
      filter: `payment_intent_id='${pi.id}'`,
      maxRecords: 1,
    });
    const order = ordersData.records?.[0];
    if (order && order.fields.capture_status !== 'cancelled') {
      await pbUpdate('orders', order.id, {
        capture_status: 'cancelled',
        state: 'Released',
      });
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const ordersData = await pbList('orders', { filter: `payment_intent_id='${pi.id}'`, maxRecords: 1 });
    const order = ordersData.records?.[0];
    if (order?.fields?.stripe_session_id) {
      const refData = await pbList('referrals', { filter: `stripe_session_id='${order.fields.stripe_session_id}' && status='pending'`, maxRecords: 1 });
      const referral = refData.records?.[0];
      if (referral) {
        const referrerId = referral.fields.referrer as string;
        if (referrerId) {
          await pbCreate('points_ledger', { user: referrerId, delta: 10, reason: 'referral_vested', ref_id: referral.id, created_at: new Date().toISOString() });
          await pbUpdate('referrals', referral.id, { status: 'awarded', vested_at: new Date().toISOString(), points_awarded: 10 });
          const refUser = await pbGetRecord('users', referrerId);
          if (refUser) await pbUpdate('users', referrerId, { points_balance: (refUser.fields.points_balance || 0) + 10 });
        }
      }
    }
  }

  return c.json({ received: true });
}
