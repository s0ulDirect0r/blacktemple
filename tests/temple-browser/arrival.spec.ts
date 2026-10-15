import 'next/dist/server/node-environment-baseline';
import { test, expect, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
import { membershipDatabase } from '../../src/lib/membership/database';
import { memberAuth } from '../../src/lib/membership/auth';

const origin=process.env.TEMPLE_TEST_ORIGIN!,db=membershipDatabase(),suffix=randomUUID().slice(0,8);
const password='Synthetic-Arrival-Only-2026!';
test.use({navigationTimeout:60000});
const users:Record<string,{id:string;email:string;checkout:string}>={};
test.beforeAll(async()=>{
  const auth=await memberAuth().$context,hash=await auth.password.hash(password);
  for(const key of ['main','plain','quiet','unpaid']){
    const email=`arrival-${key}-${suffix}@example.test`;
    const u=await auth.internalAdapter.createUser({name:'PRIVATE TEST BILLING '+key,email,emailVerified:true},{method:'admin'});
    await auth.internalAdapter.linkAccount({userId:u.id,providerId:'credential',accountId:u.id,password:hash});
    const attempt=randomUUID(),checkout='fixture_arrival_'+randomUUID();
    await db.query("INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at,checkout_session_id) VALUES($1,$2,'witness','fixture_price',2000,'fixture','completed',NOW()+INTERVAL '3 months',$3)",[attempt,u.id,checkout]);
    await db.query("INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end,paid_through) VALUES($1,$2,$3,'witness',$4,$5,$6,'active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '3 months',CASE WHEN $7 THEN NOW()+INTERVAL '1 month' ELSE NULL END)",[randomUUID(),attempt,u.id,'fixture_customer_'+u.id,'fixture_subscription_'+u.id,'fixture_schedule_'+u.id,['plain','quiet'].includes(key)]);
    users[key]={id:u.id,email,checkout};
  }
});
test.afterAll(async()=>{await db.end();});
async function signIn(context:BrowserContext,key:string){const r=await context.request.post(origin+'/api/member-auth/sign-in/email',{headers:{origin},data:{email:users[key].email,password},timeout:60000});expect(r.status()).toBe(200);}
async function audit(page:import('@playwright/test').Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);}

test('confirmed return opens identity; avatar saves atomically and retries a lost confirmation',async({browser})=>{
  const context=await browser.newContext({baseURL:origin}),anonymous=await browser.newContext({baseURL:origin});
  try{
    await signIn(context,'main');const page=await context.newPage();
    await page.goto('/membership/return?checkout='+users.main.checkout);
    await expect(page.getByRole('heading',{name:'Opening your membership…'})).toBeVisible();
    expect((await context.request.get('/membership/welcome',{maxRedirects:0})).status()).toBe(307);
    await db.query("UPDATE memberships SET paid_through=NOW()+INTERVAL '1 month' WHERE user_id=$1",[users.main.id]);
    await expect(page).toHaveURL(/\/membership\/welcome/,{timeout:20000});
    await expect(page.getByRole('heading',{name:'Who will you become here?'})).toBeVisible();
    await expect(page.getByText('Welcome video coming soon')).toBeVisible();
    await expect(page.locator('video,iframe')).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});await audit(page);
    await page.screenshot({path:test.info().outputPath('welcome-phone.png'),fullPage:true});
    await page.getByLabel('Temple name',{exact:true}).fill('Synthetic Night Orchard');
    await expect(page.getByLabel('Temple alias',{exact:false})).toHaveValue('synthetic-night-orchard');
    const bytes=await sharp({create:{width:72,height:72,channels:3,background:'#7350a0'}}).png().toBuffer();
    await page.locator('#arrival-picture').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:bytes});
    await expect(page.getByRole('img',{name:'Your selected profile picture'})).toBeVisible();
    await page.getByLabel('Picture description (optional)').fill('Synthetic violet portrait');
    // A forged PNG must leave no partial identity behind.
    const bad=await context.request.post('/api/temple/arrival',{headers:{origin},multipart:{name:'Invalid Picture',alias:'invalid-'+suffix,mediaId:randomUUID(),file:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not an image')}}});expect(bad.status()).toBe(400);
    expect((await (await context.request.get('/api/temple/identity')).json()).profile).toBeNull();
    await page.getByLabel('Temple alias',{exact:false}).fill('preview-weaver');
    await page.getByRole('button',{name:'Take this name & enter'}).click();
    await expect(page.getByText('That alias is already in use. Choose another.')).toBeVisible();
    expect((await (await context.request.get('/api/temple/identity')).json()).profile).toBeNull();
    expect(Number((await db.query('SELECT count(*) FROM temple_media m JOIN temple_profiles p ON p.id=m.author_id WHERE p.user_id=$1',[users.main.id])).rows[0].count)).toBe(0);
    await page.getByLabel('Temple alias',{exact:false}).fill('night-'+suffix);
    let lost=false;
    await page.route('**/api/temple/arrival',async route=>{if(!lost){lost=true;const response=await route.fetch();expect(response.status()).toBe(201);await route.fulfill({status:503,json:{error:'Synthetic lost confirmation. Retry your kept identity.'}});}else await route.continue();});
    await page.getByRole('button',{name:'Take this name & enter'}).click();await expect(page.getByText('Synthetic lost confirmation. Retry your kept identity.')).toBeVisible();
    await expect(page.getByRole('img',{name:'Your selected profile picture'})).toBeVisible();
    await page.getByRole('button',{name:'Take this name & enter'}).click();await expect(page).toHaveURL(/\/members\/feed\?arrival=1/,{timeout:20000});
    await expect(page.getByRole('heading',{name:'Synthetic Night Orchard, you have a place here.'})).toBeVisible();
    await expect(page.getByRole('img',{name:'Your Temple portrait'})).toBeVisible();
    const profile=(await (await context.request.get('/api/temple/identity')).json()).profile;
    const image=await context.request.get('/api/temple/media/'+profile.avatar_id);expect(image.status()).toBe(200);expect(createHash('sha256').update(await image.body()).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect((await anonymous.request.get('/api/temple/media/'+profile.avatar_id)).status()).toBe(401);
    expect((await db.query('SELECT count(*)::int n FROM temple_profiles WHERE user_id=$1',[users.main.id])).rows[0].n).toBe(1);
    expect((await db.query('SELECT name FROM member_user WHERE id=$1',[users.main.id])).rows[0].name).toBe('PRIVATE TEST BILLING main');
    await page.reload();await expect(page.getByRole('img',{name:'Your Temple portrait'})).toBeVisible();
    await page.goto('/membership/welcome');await expect(page).toHaveURL(/\/members\/feed$/);
    const login=await anonymous.request.get('/membership/welcome',{maxRedirects:0});expect(login.headers().location).toContain('next=%2Fmembership%2Fwelcome');
    await page.setViewportSize({width:320,height:844});await audit(page);
    await page.screenshot({path:test.info().outputPath('feed-phone.png'),fullPage:true});
  }finally{await context.close();await anonymous.close();}
});

test('picture is optional; quiet entry can resume; unpaid members cannot create an identity',async({browser})=>{
  for(const key of ['plain','quiet','unpaid']){
    const context=await browser.newContext({baseURL:origin});
    try{
      await signIn(context,key);const page=await context.newPage();await page.goto('/membership/welcome');
      if(key==='unpaid'){
        await expect(page).toHaveURL(/\/members\/membership/);
        expect((await context.request.post('/api/temple/arrival',{headers:{origin},multipart:{name:'Unpaid Identity',alias:'unpaid-'+suffix}})).status()).toBe(403);
        continue;
      }
      if(key==='quiet'){
        await page.getByRole('link',{name:'Enter quietly. Choose a name later.'}).click();await expect(page).toHaveURL(/\/members\/feed/);
        expect((await (await context.request.get('/api/temple/identity')).json()).profile).toBeNull();
        await page.goto('/membership/welcome');await expect(page.getByRole('heading',{name:'Who will you become here?'})).toBeVisible();continue;
      }
      await page.getByLabel('Temple name',{exact:true}).fill('Quiet Light');await page.getByLabel('Temple alias',{exact:false}).fill('light-'+suffix);
      await page.getByRole('button',{name:'Take this name & enter'}).click();await expect(page).toHaveURL(/\/members\/feed\?arrival=1/,{timeout:20000});
      expect((await (await context.request.get('/api/temple/identity')).json()).profile.avatar_id).toBeNull();
    }finally{await context.close();}
  }
});
