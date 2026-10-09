import 'next/dist/server/node-environment-baseline';
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { SignJWT } from 'jose';
import { membershipDatabase } from '../src/lib/membership/database';
import { tokenHash, encryptEmail, processNextAccountEmail } from '../src/lib/membership/email';

dotenv.config({path:'.env.local'});
const checks:string[]=[];
const origin=process.env.BETTER_AUTH_URL!;
const db=membershipDatabase();
let address=1;
const fixtureEmail='account-cleanup-'+randomUUID()+'@example.test';
const password='Fixture!'+randomUUID();
function headers(cookie?:string,ip?:string) {return {'Content-Type':'application/json',origin,'x-forwarded-for':ip??'127.0.1.'+(address++),...(cookie?{cookie}:{})};}
async function post(route:string,body:unknown,cookie?:string,ip?:string) {
  return fetch(origin+route,{method:'POST',headers:headers(cookie,ip),body:JSON.stringify(body),redirect:'manual'});
}
async function captured(kind:'verify'|'reset',to=fixtureEmail) {
  const directory=process.env.MEMBERSHIP_EMAIL_CAPTURE_DIR!;
  for(let i=0;i<50;i++) {
    const found=[];
    for(const file of await readdir(directory).catch(()=>[])) {
      if(!file.endsWith('.json'))continue;
      const message=JSON.parse(await readFile(path.join(directory,file),'utf8')) as {id:string;to:string;text:string};
      if(message.to===to&&message.id.startsWith(kind+':'))found.push(message);
    }
    if(found.length)return found;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('Expected captured account email was not delivered');
}
const link=(message:{text:string})=>message.text.match(/https?:\/\/\S+/)?.[0]??'';
async function resetRequest() {const r=await post('/api/member-auth/request-password-reset',{email:fixtureEmail,redirectTo:'/login/reset'});assert.equal(r.status,200);return r;}
async function clearFixtureMailThrottle(kind:'verify'|'reset') {await db.query('DELETE FROM member_email_rate_limits WHERE address_hash=$1',[tokenHash(kind+':'+fixtureEmail)]);}
async function main() {
  if(!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.MEMBERSHIP_DATABASE_URL!).hostname)||process.env.MEMBERSHIP_EMAIL_MODE!=='capture'||process.env.MEMBERSHIP_EMAIL_SEND_ENABLED==='true'||process.env.MEMBERSHIP_BILLING_MODE!=='test')throw Error('This verifier requires the dedicated local sandbox and captured email only');
  assert.equal((await fetch(origin+'/api/members/membership')).status,401);
  assert.equal((await fetch(origin+'/members',{redirect:'manual'})).status,307);
  assert.equal((await fetch(origin+'/calls',{redirect:'manual'})).status,307);
  const first=await post('/api/member-auth/sign-up/email',{name:'Account Cleanup Fixture',email:fixtureEmail,password});
  assert.equal(first.status,200);assert.deepEqual(await first.json(),{status:true});assert.equal(first.headers.get('set-cookie'),null);
  const repeated=await post('/api/member-auth/sign-up/email',{name:'Duplicate Fixture',email:fixtureEmail,password});
  assert.equal(repeated.status,200);assert.deepEqual(await repeated.json(),{status:true});
  const unverified=await post('/api/member-auth/sign-in/email',{email:fixtureEmail,password});
  const unknown=await post('/api/member-auth/sign-in/email',{email:'missing-'+randomUUID()+'@example.test',password});
  assert.equal(unverified.status,401);assert.equal(unknown.status,401);assert.deepEqual(await unverified.json(),await unknown.json());
  checks.push('Signup and duplicate signup have identical public success responses; unverified login and unknown login are indistinguishable and create no session');

  const user=(await db.query<{id:string}>('SELECT id FROM member_user WHERE email=$1',[fixtureEmail])).rows[0];
  const verification=link((await captured('verify'))[0]);
  const verifyUrl=new URL(verification);assert.equal(verifyUrl.origin,origin);assert.equal(verifyUrl.pathname,'/api/member-auth/verify-email');
  const attempts=await Promise.all([fetch(verification,{redirect:'manual'}),fetch(verification,{redirect:'manual'})]);
  assert.equal(attempts.filter(r=>r.headers.get('location')?.includes('verified=1')).length,1);
  assert.equal(attempts.filter(r=>r.headers.get('location')?.includes('verification=used')).length,1);
  assert.ok(attempts.every(r=>r.headers.get('cache-control')?.includes('no-store')&&r.headers.get('referrer-policy')==='no-referrer'));
  const token=await new SignJWT({email:fixtureEmail}).setProtectedHeader({alg:'HS256'}).setIssuedAt(Math.floor(Date.now()/1000)-7200).setExpirationTime(Math.floor(Date.now()/1000)-3600).sign(new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!));
  await db.query('INSERT INTO member_email_tokens(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'1 hour\')',[tokenHash(token),user.id]);
  const expired=await fetch(origin+'/api/member-auth/verify-email?token='+encodeURIComponent(token)+'&callbackURL=%2Flogin',{redirect:'manual'});
  assert.ok(expired.headers.get('location')?.includes('TOKEN_EXPIRED'));
  const forged=await fetch(origin+'/api/member-auth/verify-email?token=forged&callbackURL=%2Flogin',{redirect:'manual'});assert.ok(forged.headers.get('location')?.includes('verification=invalid'));
  checks.push('Verification links are consumed once under concurrent replay; native signature/expiry validation rejects expired and forged tokens');

  const signedIn=await post('/api/member-auth/sign-in/email',{email:fixtureEmail,password});assert.equal(signedIn.status,200);
  const setCookie=signedIn.headers.get('set-cookie')!;assert.ok(/httponly/i.test(setCookie)&&/samesite=lax/i.test(setCookie));
  const cookie=setCookie.split(';')[0];
  assert.equal((await fetch(origin+'/api/members/membership',{headers:{cookie}})).status,200);
  assert.equal((await fetch(origin+'/api/members/studio',{headers:{cookie}})).status,403);
  assert.equal((await fetch(origin+'/api/membership/process',{headers:{cookie}})).status,401);
  checks.push('Verified free account has only owned account access; paid studio and scheduler remain locked');

  const resetKnown=await resetRequest();
  const resetUnknown=await post('/api/member-auth/request-password-reset',{email:'missing-'+randomUUID()+'@example.test',redirectTo:'/login/reset'});
  assert.equal(resetUnknown.status,200);assert.deepEqual(await resetKnown.json(),await resetUnknown.json());
  const resendKnown=await post('/api/member-auth/send-verification-email',{email:fixtureEmail,callbackURL:'/login'});
  const resendUnknown=await post('/api/member-auth/send-verification-email',{email:'missing-'+randomUUID()+'@example.test',callbackURL:'/login'});
  assert.equal(resendKnown.status,200);assert.deepEqual(await resendKnown.json(),await resendUnknown.json());
  const resetMessages=await captured('reset'),resetLink=link(resetMessages[0]);
  const resetCallback=await fetch(resetLink,{redirect:'manual'});assert.equal(resetCallback.status,302);
  const resetToken=new URL(resetCallback.headers.get('location')!,origin).searchParams.get('token')!;
  await db.query('UPDATE member_verification SET "expiresAt"=NOW()-INTERVAL \'1 second\' WHERE identifier=$1',['reset-password:'+resetToken]);
  const expiredReset=await post('/api/member-auth/reset-password',{token:resetToken,newPassword:'New!'+randomUUID()});assert.equal(expiredReset.status,400);
  checks.push('Password recovery and verification resend avoid account enumeration; expired reset token is rejected');

  await clearFixtureMailThrottle('reset');await resetRequest();
  let messages=await captured('reset');
  for(let i=0;i<50&&messages.length<2;i++){await new Promise(resolve=>setTimeout(resolve,200));messages=await captured('reset');}
  assert.ok(messages.length>=2);
  const newMessage=messages.find(m=>m.id!==resetMessages[0].id)!;
  const resetAgain=await fetch(link(newMessage),{redirect:'manual'}),newToken=new URL(resetAgain.headers.get('location')!,origin).searchParams.get('token')!;
  const newPassword='Reset!'+randomUUID();
  const resets=await Promise.all([post('/api/member-auth/reset-password',{token:newToken,newPassword}),post('/api/member-auth/reset-password',{token:newToken,newPassword})]);
  assert.equal(resets.filter(r=>r.status===200).length,1);assert.equal(resets.filter(r=>r.status===400).length,1);
  assert.equal((await fetch(origin+'/api/members/membership',{headers:{cookie}})).status,401);
  assert.equal((await post('/api/member-auth/sign-in/email',{email:fixtureEmail,password})).status,401);
  assert.equal((await post('/api/member-auth/sign-in/email',{email:fixtureEmail,password:newPassword})).status,200);
  checks.push('Concurrent reset consumes one token once, changes credentials, revokes existing sessions and rejects the old password');

  const sameIP='127.0.2.200';const responses=[];
  for(let i=0;i<4;i++)responses.push(await post('/api/member-auth/request-password-reset',{email:'missing-rate@example.test'},undefined,sameIP));
  assert.equal(responses[3].status,429);
  await clearFixtureMailThrottle('reset');
  const before=(await db.query<{count:string}>("SELECT COUNT(*) FROM member_email_jobs WHERE id LIKE 'reset:%'")).rows[0].count;
  for(let i=0;i<3;i++)await resetRequest();
  const after=(await db.query<{count:string}>("SELECT COUNT(*) FROM member_email_jobs WHERE id LIKE 'reset:%'")).rows[0].count;
  assert.equal(Number(after)-Number(before),1);
  assert.equal((await post('/api/member-auth/request-password-reset',{email:fixtureEmail,redirectTo:'https://attacker.test/login/reset'})).status,400);
  const foreign=await fetch(origin+'/api/member-auth/request-password-reset',{method:'POST',headers:{origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({email:fixtureEmail})});assert.equal(foreign.status,403);
  const externalVerification=new URL(verification);externalVerification.searchParams.set('callbackURL','https://attacker.test/login');
  const outside=await fetch(externalVerification,{redirect:'manual'});assert.equal(outside.status,400);
  checks.push('Repeated requests are limited by IP and mailbox; foreign origins and external redirects are rejected');

  const recoveredId='verify:'+tokenHash('lease-'+randomUUID());
  await db.query("INSERT INTO member_email_jobs(id,kind,encrypted_payload,status,attempts,lease_until,expires_at) VALUES($1,'verify',$2,'processing',1,NOW()-INTERVAL '1 second',NOW()+INTERVAL '1 minute')",[recoveredId,encryptEmail({to:'worker-fixture@example.test',subject:'Fixture',text:'Local fixture',html:'<p>Local fixture</p>'})]);
  for(let i=0;i<20;i++){await processNextAccountEmail();const row=(await db.query<{status:string}>('SELECT status FROM member_email_jobs WHERE id=$1',[recoveredId])).rows[0];if(row.status==='complete')break;}
  const recovered=(await db.query<{status:string;encrypted_payload:string|null}>('SELECT status,encrypted_payload FROM member_email_jobs WHERE id=$1',[recoveredId])).rows[0];assert.equal(recovered.status,'complete');assert.equal(recovered.encrypted_payload,null);
  const expiredId='reset:'+tokenHash('expired-'+randomUUID());
  await db.query("INSERT INTO member_email_jobs(id,kind,encrypted_payload,expires_at) VALUES($1,'reset',$2,NOW()-INTERVAL '1 second')",[expiredId,encryptEmail({to:'worker-expiry-fixture@example.test',subject:'Expired',text:'Expired fixture',html:'<p>Expired fixture</p>'})]);
  await processNextAccountEmail();assert.equal((await db.query<{status:string}>('SELECT status FROM member_email_jobs WHERE id=$1',[expiredId])).rows[0].status,'expired');
  checks.push('Email worker recovers an expired processing lease, clears completed encrypted payloads, and drops expired links without delivery');
  // Keep fixture identifiers and token-bearing capture files private; the report contains no credentials.
  const report={status:'passed',checks,outgoingEmails:0,mode:'private-local-capture',finishedAt:new Date().toISOString()};
  const output=process.env.MEMBERSHIP_AUTH_REPORT ?? path.join(tmpdir(), 'blacktemple-membership-auth-'+randomUUID()+'.json');
  await writeFile(output,JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error instanceof assert.AssertionError?'Account verification assertion failed: '+error.message:'Account verification failed; inspect private local server logs.');process.exitCode=1;}).finally(()=>db.end());
