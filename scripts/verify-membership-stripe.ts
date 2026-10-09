import 'next/dist/server/node-environment-baseline';
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { membershipDatabase } from '../src/lib/membership/database';
import { membershipStripe, stripeId } from '../src/lib/membership/stripe';
import { collectFirstMembershipInvoice, finiteMembershipSchedule } from '../src/lib/membership/finite-schedule';
import { hasAccess } from '../src/lib/membership/config';
import { currentMembership } from '../src/lib/membership/store';

dotenv.config({path:'.env.local'});
const checks: string[] = [];
const artifacts = '../artifacts/membership';
const sleep = (ms:number) => new Promise(resolve=>setTimeout(resolve,ms));
const ok = (text:string) => { checks.push(text);console.log('PASS '+text); };
async function waitFor<T>(fn:()=>Promise<T|false|null>, timeout=150000):Promise<T> {
  const until=Date.now()+timeout;
  while(Date.now()<until){const value=await fn();if(value)return value as T;await sleep(1500);}
  throw new Error('Timed out waiting for Stripe/webhook state');
}
async function fixture(label:string) {
  const stripe=membershipStripe(),db=membershipDatabase(),id=randomUUID(),attemptId=randomUUID();
  await db.query('INSERT INTO member_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,false,NOW(),NOW())',[id,'Sandbox clock '+label,'clock-'+id+'@example.com']);
  const clock=await stripe.testHelpers.testClocks.create({frozen_time:Math.floor(Date.now()/1000),name:'Black Temple membership '+label});
  const customer=await stripe.customers.create({test_clock:clock.id,email:'clock-'+id+'@example.com',metadata:{app:'blacktemple_membership',userId:id}});
  const payment=await stripe.paymentMethods.attach('pm_card_visa',{customer:customer.id});
  const price=process.env.MEMBERSHIP_PRICE_WITNESS!;
  await db.query('INSERT INTO membership_customers(user_id,stripe_customer_id) VALUES ($1,$2)',[id,customer.id]);
  await db.query("INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,stripe_customer_id,expires_at) VALUES ($1,$2,'witness',$3,2000,'membership-draft-v1','completed',$4,NOW()+INTERVAL '3 months')",[attemptId,id,price,customer.id]);
  const schedule=await finiteMembershipSchedule(customer.id,payment.id,price,{attemptId,userId:id,tier:'witness'});
  const subscriptionId=stripeId(schedule.subscription)!;
  const phase=schedule.phases[0];
  await db.query("INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end) VALUES ($1,$2,$3,'witness',$4,$5,$6,'activating',$7,$8)",[randomUUID(),attemptId,id,customer.id,subscriptionId,schedule.id,new Date(phase.start_date*1000),new Date(phase.end_date*1000)]);
  // Shared production billing functions; the fixtures skip only hosted card setup.
  await collectFirstMembershipInvoice(subscriptionId,attemptId);
  await waitFor(async()=>{const member=await currentMembership(id);return member?.paid_through?member:false;});
  return {id,attemptId,clockId:clock.id,customerId:customer.id,subscriptionId,scheduleId:schedule.id,visaId:payment.id,termStart:phase.start_date,termEnd:phase.end_date};
}
async function advance(clockId:string,target:number) {
  const stripe=membershipStripe();
  await stripe.testHelpers.testClocks.advance(clockId,{frozen_time:target});
  return waitFor(async()=>{const clock=await stripe.testHelpers.testClocks.retrieve(clockId);return clock.status==='ready'?clock:false;});
}
async function paidInvoices(subscriptionId:string) {
  return (await membershipStripe().invoices.list({subscription:subscriptionId,limit:100})).data.filter(invoice=>invoice.status==='paid');
}
async function advancePayment(f:Awaited<ReturnType<typeof fixture>>,count:number) {
  const stripe=membershipStripe();
  const sub=await stripe.subscriptions.retrieve(f.subscriptionId);
  await advance(f.clockId,sub.items.data[0].current_period_end+7200);
  let invoices=await paidInvoices(f.subscriptionId);
  if(invoices.length<count){const clock=await stripe.testHelpers.testClocks.retrieve(f.clockId);await advance(f.clockId,clock.frozen_time+7200);}
  invoices=await waitFor(async()=>{const result=await paidInvoices(f.subscriptionId);return result.length===count?result:false;});
  await waitFor(async()=>{const member=await currentMembership(f.id);const newest=invoices[0].lines.data[0].period.end;return member?.paid_through && member.paid_through.getTime()>=newest*1000?member:false;});
  return invoices;
}
async function signedReplay(event:unknown) {
  const stripe=membershipStripe(),payload=JSON.stringify(event);
  const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET!});
  const response=await fetch(process.env.BETTER_AUTH_URL+'/api/membership/webhook',{method:'POST',headers:{'stripe-signature':signature,'content-type':'application/json'},body:payload});
  assert.equal(response.status,200);return response.json();
}
async function main() {
  assert.equal(process.env.MEMBERSHIP_BILLING_MODE,'test');
  assert.match(process.env.MEMBERSHIP_STRIPE_SECRET_KEY!,/^sk_test_/);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.MEMBERSHIP_DATABASE_URL!).hostname));
  const stripe=membershipStripe();assert.equal((await stripe.balance.retrieve()).livemode,false);
  const success=await fixture('three-payments');
  const same=await finiteMembershipSchedule(success.customerId,success.visaId,process.env.MEMBERSHIP_PRICE_WITNESS!,{attemptId:success.attemptId,userId:success.id,tier:'witness'});
  assert.equal(same.id,success.scheduleId);assert.equal((await stripe.subscriptionSchedules.list({customer:success.customerId})).data.length,1);ok('First paid invoice grants access; schedule recovery reuses one finite schedule');
  await advancePayment(success,2);ok('Test clock collects the second monthly payment automatically');
  const third=await advancePayment(success,3);assert.deepEqual(third.map(i=>i.amount_paid),[2000,2000,2000]);ok('Test clock collects the third monthly payment automatically');
  await advance(success.clockId,success.termEnd+7200);
  await waitFor(async()=>{const member=await currentMembership(success.id);return member?.status==='canceled'?member:false;});
  const ended=await currentMembership(success.id);assert.equal(hasAccess(ended,'studio',new Date((success.termEnd+1)*1000)),false);
  const finalSchedule=await stripe.subscriptionSchedules.retrieve(success.scheduleId);assert.equal(finalSchedule.end_behavior,'cancel');assert.equal(finalSchedule.status,'completed');
  await advance(success.clockId,success.termEnd+32*24*3600);
  assert.equal((await stripe.invoices.list({subscription:success.subscriptionId,limit:100})).data.length,3);
  assert.equal((await stripe.subscriptions.retrieve(success.subscriptionId)).status,'canceled');ok('Term expires automatically and advancing into month four creates no fourth invoice');
  const firstEvent=(await stripe.events.list({type:'customer.subscription.created',limit:100})).data.find(event=>event.type==='customer.subscription.created' && event.data.object.id===success.subscriptionId);
  assert.ok(firstEvent);await signedReplay({...firstEvent,id:'evt_expiry_order_'+randomUUID()});
  await waitFor(async()=>{const jobs=await membershipDatabase().query("SELECT COUNT(*)::int AS n FROM membership_webhook_jobs WHERE status!='complete'");return jobs.rows[0].n===0;});assert.equal((await currentMembership(success.id))?.status,'canceled');ok('Replayed old activation event cannot reopen an expired term');
  const failed=await fixture('payment-failure');
  const failingMethod=await stripe.paymentMethods.attach('pm_card_chargeCustomerFail',{customer:failed.customerId});
  await stripe.subscriptions.update(failed.subscriptionId,{default_payment_method:failingMethod.id});
  const sub=await stripe.subscriptions.retrieve(failed.subscriptionId);
  await advance(failed.clockId,sub.items.data[0].current_period_end+7200);
  const clock=await stripe.testHelpers.testClocks.retrieve(failed.clockId);await advance(failed.clockId,clock.frozen_time+7200);
  await waitFor(async()=>{const record=await currentMembership(failed.id);return record?.status==='past_due'?record:false;});
  const failedClock=await stripe.testHelpers.testClocks.retrieve(failed.clockId);
  assert.equal(hasAccess(await currentMembership(failed.id),'studio',new Date(failedClock.frozen_time*1000)),false);ok('A failed second charge does not grant an unpaid month');
  const open=(await stripe.invoices.list({subscription:failed.subscriptionId,limit:100})).data.find(invoice=>invoice.status==='open');assert.ok(open);
  await stripe.subscriptions.update(failed.subscriptionId,{default_payment_method:failed.visaId});
  await stripe.invoices.pay(open.id,{payment_method:failed.visaId});
  await waitFor(async()=>{const record=await currentMembership(failed.id);return record && hasAccess(record,'studio',new Date(failedClock.frozen_time*1000))?record:false;});ok('Paying the failed invoice restores the verified paid month');
  const payment=(await stripe.invoicePayments.list({invoice:open.id})).data.find(item=>item.status==='paid');assert.ok(payment);const intentId=stripeId(payment.payment.payment_intent);assert.ok(intentId);
  await stripe.refunds.create({payment_intent:intentId,amount:100});
  await waitFor(async()=>{const member=await currentMembership(failed.id);return member?.revoked_at?member:false;});assert.equal(hasAccess(await currentMembership(failed.id),'studio',new Date(failedClock.frozen_time*1000)),false);ok('A partial refund revokes access conservatively for review');
  await stripe.subscriptionSchedules.cancel(failed.scheduleId);
  const event=(await stripe.events.list({type:'invoice.paid',limit:100})).data.find(e=>e.type==='invoice.paid' && e.data.object.id===open.id);assert.ok(event);
  const badId='evt_retry_test_'+randomUUID();await signedReplay({...event,id:badId,data:{object:{...event.data.object,id:'in_missing_fixture'}}});
  await waitFor(async()=>{const job=(await membershipDatabase().query('SELECT * FROM membership_webhook_jobs WHERE stripe_event_id=$1',[badId])).rows[0];return job?.attempts>=1 && job.status==='pending' && job.last_error?job:false;});
  await membershipDatabase().query('DELETE FROM membership_webhook_jobs WHERE stripe_event_id=$1',[badId]);ok('A provider lookup failure remains durably queued for retry');
  const leaseId='evt_lease_test_'+randomUUID();
  await membershipDatabase().query("INSERT INTO membership_webhook_jobs(stripe_event_id,event_type,payload,status,lease_until) VALUES ($1,$2,$3,'processing',NOW()-INTERVAL '1 minute')",[leaseId,event.type,JSON.stringify({...event,id:leaseId})]);
  await waitFor(async()=>{const job=(await membershipDatabase().query('SELECT status FROM membership_webhook_jobs WHERE stripe_event_id=$1',[leaseId])).rows[0];return job?.status==='complete';});ok('A worker crash lease is reclaimed and processed safely');
  await mkdir(artifacts,{recursive:true});await writeFile(artifacts+'/stripe-lifecycle-verification.json',JSON.stringify({status:'passed',checks,successFixture:success,failureFixture:failed,thirdPaymentAmounts:third.map(i=>i.amount_paid),finishedAt:new Date().toISOString()},null,2));
}
main().catch(async error=>{await writeFile(artifacts+'/stripe-lifecycle-verification.json',JSON.stringify({status:'failed',checks,error:error instanceof Error?error.message:'Unknown error'},null,2));console.error(error instanceof Error?error.message:'Unknown error');process.exitCode=1;}).finally(()=>membershipDatabase().end());
