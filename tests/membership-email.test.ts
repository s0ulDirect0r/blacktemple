import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { accountEmail, encryptEmail, decryptEmail, deliverAccountEmail, captureDirectory, EmailDeliveryError } from '../src/lib/membership/email';
import { accountCallback, handleAccountRequest } from '../src/lib/membership/auth-route';
import { GET as accountGet } from '../src/app/api/member-auth/[...all]/route';

test('unconfigured hosted account responses stay private and reveal no configuration values', async () => {
  const previous = process.env.MEMBERSHIP_DATABASE_URL;
  delete process.env.MEMBERSHIP_DATABASE_URL;
  try {
    const response = await accountGet(new Request('https://preview.example.test/api/member-auth/get-session'));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.deepEqual(await response.json(), { error: 'Sign-in is not configured yet.' });
  } finally {
    if (previous === undefined) delete process.env.MEMBERSHIP_DATABASE_URL;
    else process.env.MEMBERSHIP_DATABASE_URL = previous;
  }
});

test('account email URLs are owned and payload encryption authenticates changes',()=>{
  const previous={...process.env};
  try {
    process.env.BETTER_AUTH_URL='http://localhost:3002';process.env.BETTER_AUTH_SECRET='test-secret-'.repeat(4);
    const mail=accountEmail('reset','fixture@example.test','http://localhost:3002/api/member-auth/reset-password/fake?callbackURL=%2Flogin%2Freset');
    const encrypted=encryptEmail(mail);
    assert.ok(!encrypted.includes('fixture')&&!encrypted.includes('callbackURL'));
    assert.deepEqual(decryptEmail(encrypted),mail);
    assert.throws(()=>decryptEmail(encrypted.slice(0,-3)+'AAA'));
    assert.throws(()=>accountEmail('verify','fixture@example.test','https://attacker.test/verify'));
    assert.throws(()=>accountEmail('verify','fixture@example.test','http://localhost:3002/login?token=fake'));
  } finally {process.env=previous;}
});
test('local captures are private, idempotent and never invoke a provider',async()=>{
  const previous={...process.env}, directory=await mkdtemp(path.join(tmpdir(),'member-email-test-'));
  try {
    Object.assign(process.env,{BETTER_AUTH_URL:'http://localhost:3002',MEMBERSHIP_DATABASE_URL:'postgresql://127.0.0.1/local',MEMBERSHIP_EMAIL_MODE:'capture',MEMBERSHIP_EMAIL_CAPTURE_DIR:directory});delete process.env.VERCEL_ENV;
    const mail={to:'fixture@example.test',subject:'Test',text:'Local only',html:'<p>Local only</p>'};
    const noNetwork:typeof fetch=async()=>{throw new Error('Unexpected network');};
    assert.equal(await deliverAccountEmail('fixture-id',mail,noNetwork),'local-capture');
    await deliverAccountEmail('fixture-id',mail,noNetwork);
    const files=await readdir(directory);assert.equal(files.length,1);
    assert.equal((await stat(path.join(directory,files[0]))).mode&0o777,0o600);
    assert.equal((await stat(directory)).mode&0o777,0o700);
    assert.equal(JSON.parse(await readFile(path.join(directory,files[0]),'utf8')).to,mail.to);
    process.env.MEMBERSHIP_EMAIL_CAPTURE_DIR='/tmp/public/mail';assert.throws(captureDirectory);
    process.env.MEMBERSHIP_EMAIL_CAPTURE_DIR=directory;process.env.VERCEL_ENV='production';assert.throws(captureDirectory);
  } finally {process.env=previous;await rm(directory,{recursive:true,force:true});}
});
test('provider sending requires explicit activation and uses retry-safe requests',async()=>{
  const previous={...process.env};
  try {
    Object.assign(process.env,{MEMBERSHIP_EMAIL_MODE:'resend',MEMBERSHIP_EMAIL_FROM:'Accounts <accounts@example.test>',MEMBERSHIP_EMAIL_RESEND_API_KEY:'fixture-not-a-real-key'});delete process.env.MEMBERSHIP_EMAIL_SEND_ENABLED;
    const mail={to:'fixture@example.test',subject:'Test',text:'Test',html:'<p>Test</p>'};
    let calls=0;
    const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(input,'https://api.resend.com/emails');assert.equal(new Headers(init?.headers).get('Idempotency-Key'),'bt-account/job');assert.equal(init?.redirect,'error');return Response.json({id:'provider-fixture'});};
    await assert.rejects(deliverAccountEmail('job',mail,transport),EmailDeliveryError);assert.equal(calls,0);
    process.env.MEMBERSHIP_EMAIL_SEND_ENABLED='true';assert.equal(await deliverAccountEmail('job',mail,transport),'provider-fixture');assert.equal(calls,1);
    await assert.rejects(deliverAccountEmail('job',mail,async()=>new Response(null,{status:429})),(error:unknown)=>error instanceof EmailDeliveryError&&error.retryable);
    await assert.rejects(deliverAccountEmail('job',mail,async()=>new Response(null,{status:403})),(error:unknown)=>error instanceof EmailDeliveryError&&!error.retryable);
  } finally {process.env=previous;}
});
test('auth redirects, origins, malformed JSON and public response normalization',async()=>{
  const previous=process.env.BETTER_AUTH_URL;process.env.BETTER_AUTH_URL='http://localhost:3002';
  try {
    assert.throws(()=>accountCallback('https://attacker.test/login','/login','http://localhost:3002'));
    assert.throws(()=>accountCallback('//attacker.test/login','/login','http://localhost:3002'));
    assert.throws(()=>accountCallback('/members','/login','http://localhost:3002'));
    const handlers={GET:async()=>Response.json({}),POST:async()=>Response.json({user:{id:'private'},token:'private'})};
    const request=(body:string,origin='http://localhost:3002')=>new Request('http://localhost:3002/api/member-auth/sign-up/email',{method:'POST',headers:{origin,'Content-Type':'application/json'},body});
    assert.equal((await handleAccountRequest(request('{}','https://attacker.test'),handlers)).status,403);
    assert.equal((await handleAccountRequest(request('null'),handlers)).status,400);
    assert.equal((await handleAccountRequest(request('{"callbackURL":"https://attacker.test/login"}'),handlers)).status,400);
    assert.deepEqual(await (await handleAccountRequest(request('{}'),handlers)).json(),{status:true});
    assert.equal((await handleAccountRequest(new Request('http://localhost:3002/api/member-auth/list-users'),handlers)).status,404);
  } finally {if(previous===undefined)delete process.env.BETTER_AUTH_URL;else process.env.BETTER_AUTH_URL=previous;}
});
