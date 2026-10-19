import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingAccountAllowed } from '../src/lib/membership/staging-policy';
import { deliverAccountEmail, EmailDeliveryError } from '../src/lib/membership/email';
import { handleAccountRequest } from '../src/lib/membership/auth-route';
import { membershipPreflight } from '../src/lib/membership/preflight';

test('staged account restriction permits one exact inbox and fails closed for bad configuration',()=>{
  const env={MEMBERSHIP_STAGING_MODE:'true',MEMBERSHIP_BILLING_MODE:'test',MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:'fixture@example.test'};
  assert.equal(stagingAccountAllowed(' FIXTURE@EXAMPLE.TEST ',env),true);
  assert.equal(stagingAccountAllowed('fixture+alias@example.test',env),false);
  assert.equal(stagingAccountAllowed('other@example.test',env),false);
  for (const patch of [{MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:''},{MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:'first@example.test,second@example.test'},{MEMBERSHIP_BILLING_MODE:'live'},{VERCEL_ENV:'production'},{MEMBERSHIP_LIVE_ENABLED:'true'},{MEMBERSHIP_STAGING_MODE:'invalid'}]) assert.equal(stagingAccountAllowed('fixture@example.test',{...env,...patch}),false);
  assert.equal(stagingAccountAllowed('ordinary@example.test',{}),true);
  assert.equal(stagingAccountAllowed('fixture@example.test',{VERCEL_ENV:'preview'}),false);
});
test('staged delivery blocks other recipients before any provider call',async()=>{
  const previous={...process.env};
  try {
    Object.assign(process.env,{MEMBERSHIP_STAGING_MODE:'true',MEMBERSHIP_BILLING_MODE:'test',MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:'fixture@example.test',MEMBERSHIP_EMAIL_MODE:'resend',MEMBERSHIP_EMAIL_SEND_ENABLED:'true',MEMBERSHIP_EMAIL_FROM:'Accounts <accounts@example.test>',MEMBERSHIP_EMAIL_RESEND_API_KEY:'not-a-real-key'});delete process.env.VERCEL_ENV;delete process.env.MEMBERSHIP_LIVE_ENABLED;
    let calls=0;const transport:typeof fetch=async()=>{calls++;return Response.json({id:'fixture'});};
    const mail={to:'other@example.test',subject:'Fixture',text:'Fixture',html:'<p>Fixture</p>'};
    await assert.rejects(deliverAccountEmail('job',mail,transport),(error:unknown)=>error instanceof EmailDeliveryError&&!error.retryable&&error.category==='staging-recipient-not-allowed');assert.equal(calls,0);
    assert.equal(await deliverAccountEmail('job',{...mail,to:'fixture@example.test'},transport),'fixture');assert.equal(calls,1);
  }finally{process.env=previous;}
});
test('staged auth avoids creating other accounts while preserving generic public responses',async()=>{
  const previous={...process.env};
  try {
    Object.assign(process.env,{MEMBERSHIP_STAGING_MODE:'true',MEMBERSHIP_BILLING_MODE:'test',MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:'fixture@example.test',BETTER_AUTH_URL:'https://sandbox.example.test'});delete process.env.VERCEL_ENV;delete process.env.MEMBERSHIP_LIVE_ENABLED;
    let calls=0;const handlers={GET:async()=>Response.json({}),POST:async()=>{calls++;return Response.json({status:true});}};
    const request=(route:string,email:string)=>new Request('https://sandbox.example.test/api/member-auth/'+route,{method:'POST',headers:{origin:'https://sandbox.example.test','content-type':'application/json'},body:JSON.stringify({email})});
    for(const route of ['sign-up/email','request-password-reset','send-verification-email'])assert.deepEqual(await (await handleAccountRequest(request(route,'other@example.test'),handlers)).json(),{status:true});
    assert.equal((await handleAccountRequest(request('sign-in/email','other@example.test'),handlers)).status,401);assert.equal(calls,0);
    assert.equal((await handleAccountRequest(request('sign-up/email','fixture@example.test'),handlers)).status,200);assert.equal(calls,1);
    assert.ok(membershipPreflight({...process.env,MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:''},'preview').errors.includes('Staging requires one explicitly approved email recipient.'));
  }finally{process.env=previous;}
});
