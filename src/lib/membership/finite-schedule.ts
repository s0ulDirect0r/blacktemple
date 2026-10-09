import type Stripe from 'stripe';
import { MEMBERSHIP_TERM_MONTHS, type TierId } from './config';
import { membershipStripe, stripeId } from './stripe';

/** Always create the finite schedule before collecting the first payment. */
export async function finiteMembershipSchedule(customer: string, paymentMethod: string, price: string, identity: {attemptId:string;userId:string;tier:TierId}) {
  const stripe = membershipStripe();
  const metadata = {app:'blacktemple_membership',...identity};
  let recovered: Stripe.SubscriptionSchedule | undefined;
  // Recover after provider idempotency keys expire, including a process/DB crash.
  for await(const schedule of stripe.subscriptionSchedules.list({customer,limit:100})) {
    if(schedule.metadata?.app===metadata.app && schedule.metadata.attemptId===identity.attemptId) {recovered=schedule;break;}
  }
  const schedule = recovered ?? await stripe.subscriptionSchedules.create({
    customer,start_date:'now',end_behavior:'cancel',metadata,
    default_settings:{collection_method:'charge_automatically',default_payment_method:paymentMethod},
    phases:[{items:[{price,quantity:1}],duration:{interval:'month',interval_count:MEMBERSHIP_TERM_MONTHS},metadata,proration_behavior:'none'}],
    expand:['subscription'],
  },{idempotencyKey:'bt-member-schedule:'+identity.attemptId});
  const phase = schedule.phases[0];
  if(schedule.end_behavior!=='cancel' || schedule.phases.length!==1 || !phase || phase.items.length!==1 || phase.items[0].quantity!==1 || stripeId(phase.items[0].price)!==price || schedule.metadata?.userId!==identity.userId) throw new Error('Finite membership schedule configuration mismatch');
  return schedule;
}

export async function collectFirstMembershipInvoice(subscriptionId: string, attemptId: string) {
  const stripe = membershipStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoiceId = stripeId(subscription.latest_invoice);
  if(!invoiceId) throw new Error('Membership invoice is missing');
  let invoice = await stripe.invoices.retrieve(invoiceId);
  if(invoice.status==='draft') invoice=await stripe.invoices.finalizeInvoice(invoiceId,{auto_advance:true},{idempotencyKey:'bt-member-finalize:'+attemptId});
  if(invoice.status==='open') {
    try {await stripe.invoices.pay(invoiceId,{}, {idempotencyKey:'bt-member-first-payment:'+attemptId});}
    catch(error) {if(!(error instanceof Error) || error.name!=='StripeCardError')throw error;}
  }
}
