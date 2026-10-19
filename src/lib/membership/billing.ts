import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { capacityFor, MEMBERSHIP_TERM_MONTHS, MEMBERSHIP_TERMS_VERSION, money, paidCoverage, priceFor, type TierId } from './config';
import { collectFirstMembershipInvoice, finiteMembershipSchedule } from './finite-schedule';
import { MemberError } from './errors';
import { lock, transaction } from './database';
import { currentMembership, type Attempt, type Membership } from './store';
import { membershipPrice, membershipStripe, stripeId } from './stripe';

const APP = 'blacktemple_membership';
const billingLock = 'blacktemple-membership-billing';
const sec = (date: Date) => Math.floor(date.getTime() / 1000);
const date = (seconds: number) => new Date(seconds * 1000);

async function occupied(client: PoolClient, tier: TierId, excluding?: string) {
  const result = await client.query<{ count: string }>(`SELECT
    (SELECT COUNT(*) FROM memberships WHERE tier=$1 AND status NOT IN ('canceled','incomplete_expired') AND revoked_at IS NULL AND term_end>NOW()) +
    (SELECT COUNT(*) FROM membership_attempts WHERE tier=$1 AND status IN ('creating','open','activating') AND expires_at>NOW() AND id IS DISTINCT FROM $2::uuid) AS count`, [tier, excluding ?? null]);
  return Number(result.rows[0].count);
}

/** A revoked membership must stop billing before the same member enrolls again. */
async function endRevokedBilling(membership: Membership) {
  const stripe = membershipStripe();
  const schedule = await stripe.subscriptionSchedules.retrieve(membership.stripe_schedule_id);
  if (['active','not_started'].includes(schedule.status)) await stripe.subscriptionSchedules.cancel(schedule.id, { invoice_now: false, prorate: false }, { idempotencyKey: 'bt-member-revoked-cancel:' + membership.id });
}

/** Persist the reservation first, so a network timeout can resume the same attempt. */
export async function startMemberCheckout(user: { id: string; email: string; name: string }, tier: TierId) {
  if (process.env.MEMBERSHIP_CHECKOUT_ENABLED !== 'true') throw new MemberError(503, 'Membership checkout is not open yet.');
  const price = await membershipPrice(tier);
  const attemptId = await transaction(async client => {
    await lock(client, billingLock);
    const existingMembership = await currentMembership(user.id, client);
    // A revoked term no longer holds a place, so the member may enroll again.
    if (existingMembership?.revoked_at) await endRevokedBilling(existingMembership);
    else if (existingMembership && !['canceled','incomplete_expired'].includes(existingMembership.status) && existingMembership.term_end! > new Date()) throw new MemberError(409, 'You already have a membership term. Open My Membership to manage it.');
    const pending = (await client.query<Attempt>("SELECT * FROM membership_attempts WHERE user_id=$1 AND status IN ('creating','open','activating') ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [user.id])).rows[0];
    if (pending && pending.expires_at > new Date()) {
      if (pending.tier !== tier) throw new MemberError(409, 'Finish or close your existing checkout before choosing another membership.');
      return pending.id;
    }
    if (pending) await client.query("UPDATE membership_attempts SET status='expired',updated_at=NOW() WHERE id=$1", [pending.id]);
    const capacity = capacityFor(tier);
    if (capacity !== null && await occupied(client, tier) >= capacity) throw new MemberError(409, 'This membership is at capacity. Contact me about a future term.');
    const id = randomUUID();
    await client.query(`INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,'creating',NOW()+INTERVAL '40 minutes')`, [id,user.id,tier,price.id,priceFor(tier),MEMBERSHIP_TERMS_VERSION]);
    return id;
  });

  return transaction(async client => {
    await lock(client, 'membership-attempt:' + attemptId);
    const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1 AND user_id=$2 FOR UPDATE', [attemptId,user.id])).rows[0];
    if (!attempt || !['creating','open'].includes(attempt.status)) throw new MemberError(409, 'Checkout is being confirmed. Open My Membership in a moment.');
    const stripe = membershipStripe();
    if (attempt.checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(attempt.checkout_session_id);
      if (session.status === 'open' && session.url && session.expires_at > sec(new Date())) return { url: session.url, attemptId };
      throw new MemberError(409, session.status === 'complete' ? 'Checkout is being confirmed. Open My Membership in a moment.' : 'This checkout has expired. Close it in My Membership and try again.');
    }
    let customerId = (await client.query<{ stripe_customer_id: string }>('SELECT stripe_customer_id FROM membership_customers WHERE user_id=$1', [user.id])).rows[0]?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { app: APP, userId: user.id } }, { idempotencyKey: 'bt-member-customer:' + user.id });
      customerId = customer.id;
      await client.query('INSERT INTO membership_customers(user_id,stripe_customer_id) VALUES ($1,$2)', [user.id,customerId]);
    }
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    const metadata = { app: APP, attemptId, userId: user.id, tier, termsVersion: attempt.terms_version };
    const session = await stripe.checkout.sessions.create({
      mode: 'setup', customer: customerId, currency: 'usd', payment_method_types: ['card'],
      client_reference_id: user.id, metadata, setup_intent_data: { metadata },
      expires_at: sec(attempt.expires_at),
      success_url: origin + '/membership/return?checkout={CHECKOUT_SESSION_ID}',
      cancel_url: origin + '/members/membership?checkout=interrupted',
      custom_text: { submit: { message: `Authorize ${money(attempt.monthly_cents)} USD per month for three months (${money(attempt.monthly_cents * MEMBERSHIP_TERM_MONTHS)} USD total). The first payment follows card authorization. No fourth payment or automatic renewal.` } },
    }, { idempotencyKey: 'bt-member-checkout:' + attemptId });
    if (!session.url) throw new MemberError(503, 'Checkout did not return a link. Please try again.');
    await client.query("UPDATE membership_attempts SET status='open',stripe_customer_id=$2,checkout_session_id=$3,checkout_url=$4,updated_at=NOW() WHERE id=$1", [attemptId,customerId,session.id,session.url]);
    return { url: session.url, attemptId };
  });
}

export async function abandonMemberCheckout(userId: string, attemptId: string) {
  return transaction(async client => {
    await lock(client, billingLock);
    await lock(client, 'membership-attempt:' + attemptId);
    const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1 AND user_id=$2 FOR UPDATE', [attemptId,userId])).rows[0];
    if (!attempt) throw new MemberError(404, 'Checkout was not found.');
    if (['completed','activating'].includes(attempt.status)) throw new MemberError(409, 'This checkout is already being confirmed.');
    if (attempt.checkout_session_id) {
      const session = await membershipStripe().checkout.sessions.retrieve(attempt.checkout_session_id);
      if (session.status === 'complete') throw new MemberError(409, 'Card authorization is already complete. Open My Membership while it is confirmed.');
      if (session.status === 'open') await membershipStripe().checkout.sessions.expire(session.id);
    }
    await client.query("UPDATE membership_attempts SET status='abandoned',updated_at=NOW() WHERE id=$1", [attemptId]);
  });
}

async function activateSetup(client: PoolClient, sessionId: string) {
  const stripe = membershipStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode !== 'setup' || session.status !== 'complete' || session.metadata?.app !== APP) return null;
  const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1 FOR UPDATE', [session.metadata.attemptId])).rows[0];
  if (!attempt || session.id !== attempt.checkout_session_id || session.client_reference_id !== attempt.user_id || session.metadata.userId !== attempt.user_id || stripeId(session.customer) !== attempt.stripe_customer_id) throw new Error('Membership checkout ownership mismatch');
  const existing = (await client.query<Membership>('SELECT * FROM memberships WHERE attempt_id=$1', [attempt.id])).rows[0];
  if (existing) return existing;
  if (['blocked','abandoned'].includes(attempt.status)) return null;
  const capacity = capacityFor(attempt.tier);
  if (capacity !== null && await occupied(client, attempt.tier, attempt.id) >= capacity) {
    await client.query("UPDATE membership_attempts SET status='blocked',updated_at=NOW() WHERE id=$1", [attempt.id]);
    return null; // A late setup completion must never charge after its seat is gone.
  }
  const setupId = stripeId(session.setup_intent);
  if (!setupId) throw new Error('Missing setup intent');
  const setup = await stripe.setupIntents.retrieve(setupId);
  const paymentMethod = stripeId(setup.payment_method);
  if (setup.status !== 'succeeded' || !paymentMethod || stripeId(setup.customer) !== attempt.stripe_customer_id || setup.livemode !== (process.env.MEMBERSHIP_BILLING_MODE === 'live')) throw new Error('Payment authorization is not verified');
  const price = await stripe.prices.retrieve(attempt.price_id);
  if (!price.active || price.unit_amount !== attempt.monthly_cents || price.currency !== 'usd' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new Error('Checkout price changed');
  const schedule = await finiteMembershipSchedule(attempt.stripe_customer_id!,paymentMethod,attempt.price_id,{attemptId:attempt.id,userId:attempt.user_id,tier:attempt.tier});
  const subscriptionId = stripeId(schedule.subscription);
  const phase = schedule.phases[0];
  if (!subscriptionId || !phase || schedule.end_behavior !== 'cancel') throw new Error('Finite membership schedule is missing');
  const membershipId = randomUUID();
  const membership = (await client.query<Membership>(`INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'activating',$8,$9) RETURNING *`, [membershipId,attempt.id,attempt.user_id,attempt.tier,attempt.stripe_customer_id,subscriptionId,schedule.id,date(phase.start_date),date(phase.end_date)])).rows[0];
  await client.query("UPDATE membership_attempts SET status='completed',updated_at=NOW() WHERE id=$1", [attempt.id]);
  await collectFirstMembershipInvoice(subscriptionId,attempt.id);
  return membership;
}

async function reconcileSubscription(client: PoolClient, subscriptionId: string) {
  const stripe = membershipStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  let membership: Membership | undefined = (await client.query<Membership>('SELECT * FROM memberships WHERE stripe_subscription_id=$1 FOR UPDATE', [subscriptionId])).rows[0];
  if (!membership && subscription.metadata.app === APP && subscription.metadata.attemptId) {
    const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1', [subscription.metadata.attemptId])).rows[0];
    if (attempt?.checkout_session_id) membership = await activateSetup(client, attempt.checkout_session_id) ?? undefined;
  }
  if (!membership) return;
  if (stripeId(subscription.customer) !== membership.stripe_customer_id || subscription.metadata.userId !== membership.user_id) throw new Error('Subscription ownership mismatch');
  const invoices = await stripe.invoices.list({ subscription: subscriptionId, limit: 100 });
  const paidPeriods: { start: Date; end: Date }[] = [];
  const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1', [membership.attempt_id])).rows[0];
  for (const invoice of invoices.data) {
    const line = invoice.lines.data.find(item => !item.parent?.subscription_item_details?.proration && item.amount === priceFor(membership!.tier) && item.quantity === 1 && stripeId(item.pricing?.price_details?.price) === attempt.price_id);
    if (!line) continue;
    const periodStart = date(line.period.start), periodEnd = date(line.period.end);
    if (periodStart < membership.term_start! || periodStart >= membership.term_end! || periodEnd > membership.term_end!) continue;
    if (stripeId(invoice.customer) !== membership.stripe_customer_id) throw new Error('Invoice ownership mismatch');
    const payments = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 10 });
    let chargeId: string | null = null;
    let disputed = false, refunded = false;
    let verifiedAmount = 0;
    for (const payment of payments.data) {
      const intentId = stripeId(payment.payment.payment_intent);
      if (!intentId) continue;
      const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
      const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
      if (charge) {
        chargeId = charge.id;
        // A dispute revokes access; a full refund (`refunded`) removes this month; a partial refund changes nothing.
        if (charge.disputed) disputed = true;
        if (charge.refunded) refunded = true;
        if (payment.status === 'paid' && intent.status === 'succeeded' && intent.currency === 'usd' && stripeId(intent.customer) === membership.stripe_customer_id && charge.paid && !disputed && !refunded) verifiedAmount += payment.amount_paid ?? 0;
      }
    }
    const validPaid = invoice.status === 'paid' && invoice.currency === 'usd' && invoice.amount_paid >= priceFor(membership.tier) && verifiedAmount >= priceFor(membership.tier) && !disputed && !refunded;
    if (validPaid) paidPeriods.push({ start: periodStart, end: periodEnd });
    if (disputed) await client.query('UPDATE memberships SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id=$1', [membership.id]);
    await client.query(`INSERT INTO membership_invoices(stripe_invoice_id,membership_id,status,currency,amount_due,amount_paid,period_start,period_end,hosted_url,charge_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (stripe_invoice_id) DO UPDATE SET status=EXCLUDED.status,amount_paid=EXCLUDED.amount_paid,hosted_url=EXCLUDED.hosted_url,charge_id=EXCLUDED.charge_id,updated_at=NOW()`, [invoice.id,membership.id,invoice.status ?? 'unknown',invoice.currency,invoice.amount_due,invoice.amount_paid,periodStart,periodEnd,invoice.hosted_invoice_url,chargeId]);
  }
  const paidThrough = paidCoverage(membership.term_start!, membership.term_end!, paidPeriods);
  const next = subscription.items.data[0]?.current_period_end;
  const nextPayment = next && date(next) < membership.term_end! && !['canceled','incomplete_expired'].includes(subscription.status) ? date(next) : null;
  await client.query('UPDATE memberships SET status=$2,paid_through=$3,next_payment_at=$4,updated_at=NOW() WHERE id=$1', [membership.id,subscription.status,paidThrough,nextPayment]);
}

async function reserveCompletedSetup(sessionId: string) {
  const session = await membershipStripe().checkout.sessions.retrieve(sessionId);
  if (session.mode !== 'setup' || session.status !== 'complete' || session.metadata?.app !== APP) return;
  await transaction(async client => {
    await lock(client, billingLock);
    const attempt = (await client.query<Attempt>('SELECT * FROM membership_attempts WHERE id=$1 FOR UPDATE', [session.metadata!.attemptId])).rows[0];
    if (!attempt || attempt.checkout_session_id !== session.id || attempt.user_id !== session.client_reference_id || attempt.user_id !== session.metadata!.userId || attempt.stripe_customer_id !== stripeId(session.customer)) throw new Error('Checkout ownership mismatch');
    if (['completed','activating','blocked','abandoned'].includes(attempt.status)) return;
    const capacity = capacityFor(attempt.tier);
    if (capacity !== null && await occupied(client, attempt.tier, attempt.id) >= capacity) {
      await client.query("UPDATE membership_attempts SET status='blocked',updated_at=NOW() WHERE id=$1", [attempt.id]);
      return;
    }
    // A confirmed authorization holds its place durably while a webhook retries.
    // It does not grant access, and it survives a crash after a Stripe API call.
    await client.query("UPDATE membership_attempts SET status='activating',expires_at=NOW()+INTERVAL '3 months',updated_at=NOW() WHERE id=$1", [attempt.id]);
  });
}

/** Signed event IDs are deduplicated; each change reads canonical Stripe state. */
export async function handleMembershipEvent(event: Stripe.Event) {
  if (event.livemode !== (process.env.MEMBERSHIP_BILLING_MODE === 'live')) throw new Error('Wrong webhook mode');
  if (event.type === 'checkout.session.completed') await reserveCompletedSetup(event.data.object.id);
  return transaction(async client => {
    await lock(client, billingLock);
    if ((await client.query('SELECT 1 FROM membership_webhook_events WHERE stripe_event_id=$1', [event.id])).rowCount) return { duplicate: true };
    const object = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const membership = await activateSetup(client, event.data.object.id);
      if (membership) await reconcileSubscription(client, membership.stripe_subscription_id);
    } else if (event.type === 'checkout.session.expired') {
      const session = await membershipStripe().checkout.sessions.retrieve(event.data.object.id);
      if (session.status === 'expired') await client.query("UPDATE membership_attempts SET status='expired',updated_at=NOW() WHERE checkout_session_id=$1 AND status IN ('creating','open')", [session.id]);
    } else if (object.object === 'subscription') {
      await reconcileSubscription(client, object.id);
    } else if (object.object === 'invoice') {
      const invoice = await membershipStripe().invoices.retrieve(object.id);
      const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription);
      if (subscriptionId) await reconcileSubscription(client, subscriptionId);
    } else if (object.object === 'subscription_schedule') {
      const schedule = await membershipStripe().subscriptionSchedules.retrieve(object.id);
      const stored = (await client.query<Membership>('SELECT * FROM memberships WHERE stripe_schedule_id=$1', [schedule.id])).rows[0];
      const subscriptionId = stripeId(schedule.subscription) ?? stripeId(schedule.released_subscription) ?? stored?.stripe_subscription_id;
      if (subscriptionId) await reconcileSubscription(client, subscriptionId);
    } else if (object.object === 'charge' || object.object === 'dispute') {
      const chargeId = object.object === 'charge' ? object.id : stripeId(object.charge);
      const membership = (await client.query<Membership>('SELECT m.* FROM memberships m JOIN membership_invoices i ON i.membership_id=m.id WHERE i.charge_id=$1 LIMIT 1', [chargeId])).rows[0];
      if (membership) await reconcileSubscription(client, membership.stripe_subscription_id);
    }
    await client.query('INSERT INTO membership_webhook_events(stripe_event_id,event_type) VALUES ($1,$2)', [event.id,event.type]);
    return { duplicate: false };
  });
}
