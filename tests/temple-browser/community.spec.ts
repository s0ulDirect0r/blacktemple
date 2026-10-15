import { test,expect,type BrowserContext,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Pool } from 'pg';
import sharp from 'sharp';
import { randomUUID,createHash } from 'node:crypto';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const database=process.env.TEMPLE_TEST_DATABASE_URL;
if(!database||database!==process.env.MEMBERSHIP_DATABASE_URL||!['127.0.0.1','localhost','[::1]'].includes(new URL(database).hostname)||process.env.VERCEL_ENV)throw new Error('Community fixtures require the explicitly isolated local preview database.');
const origin=process.env.TEMPLE_TEST_ORIGIN??'http://127.0.0.1:3003',db=new Pool({connectionString:database});
// Repeated local journeys share a synthetic client address; clear only this disposable database's login throttles.
test.beforeEach(async()=>{await db.query('DELETE FROM member_rate_limit');});
const artifactDir=process.env.TEMPLE_TEST_ARTIFACT_DIR??'/tmp/temple-stage1-browser';
const password='Synthetic-Temple-Test-Only-2026!';
async function signIn(context:BrowserContext,key:string){const response=await context.request.post(origin+'/api/member-auth/sign-in/email',{headers:{origin},data:{email:`temple-preview-${key}@example.test`,password}});expect(response.status()).toBe(200);}
async function audit(page:Page){await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('h1')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(0);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);}
async function screenshot(page:Page,name:string){for(const image of await page.locator('img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);}await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifactDir+'/'+name,fullPage:true,style:'nextjs-portal { visibility: hidden !important; }'});}
test.afterAll(async()=>{await db.end();});
test('membership offering and private creative journey work on desktop and phone',async({browser})=>{
  await mkdir(artifactDir,{recursive:true});
  const a=await browser.newContext({baseURL:origin}),b=await browser.newContext({baseURL:origin}),mod=await browser.newContext({baseURL:origin}),anon=await browser.newContext({baseURL:origin});
  try{
    const publicPage=await anon.newPage();await publicPage.goto('/membership');await expect(publicPage.getByRole('heading',{name:'Why I’m building this'})).toBeVisible();await expect(publicPage.getByRole('heading',{name:'How patronage will be used'})).toBeVisible();await audit(publicPage);await screenshot(publicPage,'membership-desktop.png');await publicPage.setViewportSize({width:390,height:844});await audit(publicPage);await screenshot(publicPage,'membership-phone.png');
    for(const endpoint of ['feed','identity','export','moderation'])expect((await anon.request.get('/api/temple/'+endpoint)).status()).toBe(401);
    await publicPage.goto('/members/feed');await expect(publicPage).toHaveURL(/\/login/);
    await signIn(a,'weaver');await signIn(b,'spark');await signIn(mod,'moderator');
    expect((await a.request.post('/api/temple/feed',{headers:{origin},data:{id:randomUUID(),body:'x'.repeat(70*1024)}})).status()).toBe(413);
    expect((await a.request.post('/api/temple/feed',{headers:{origin:'https://evil.example.test'},data:{id:randomUUID(),body:'Rejected origin'}})).status()).toBe(403);
    expect((await a.request.post('/api/temple/media',{headers:{origin},multipart:{id:randomUUID(),alt:'Rejected unsafe image',file:{name:'unsafe.png',mimeType:'image/png',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')}}})).status()).toBe(400);
    const page=await a.newPage();await page.goto('/members/feed');await expect(page.getByRole('heading',{name:'The shared Temple',exact:true})).toBeVisible();await expect(page.getByText('Local synthetic preview · test accounts and contributions')).toBeVisible();await expect(page.getByText(/PRIVATE SYNTHETIC BILLING/)).toHaveCount(0);await audit(page);
    await page.getByRole('button',{name:'Bring an offering'}).click();await expect(page.getByLabel('Your offering')).toBeFocused();
    const body='Synthetic browser poem '+randomUUID()+'\n\nThis line survives refresh.',otherText='Another member’s private reply '+randomUUID();
    const composer=page.getByRole('form',{name:'Create a post'});await expect(composer.getByRole('button',{name:'Post ↗',exact:true})).toBeDisabled();await expect(composer.getByLabel('Link (optional)')).toHaveCount(0);expect((await composer.boundingBox())!.height).toBeLessThan(360);
    await composer.screenshot({path:artifactDir+'/compact-composer-desktop.png'});await page.setViewportSize({width:390,height:844});await audit(page);await composer.screenshot({path:artifactDir+'/compact-composer-phone.png'});await page.setViewportSize({width:1280,height:900});
    await page.getByLabel('Your offering').fill(body);await composer.getByRole('button',{name:'Link',exact:true}).click();await page.getByLabel('Link (optional)').fill('https://example.test/synthetic-art');
    const bytes=await sharp({create:{width:640,height:420,channels:3,background:'#231638'}}).png().toBuffer();const imagePath=artifactDir+'/synthetic-original.png';await writeFile(imagePath,bytes);
    let firstUpload=true;await page.route('**/api/temple/media',async route=>{if(firstUpload&&route.request().method()==='POST'){firstUpload=false;await route.fulfill({status:503,json:{error:'Synthetic upload interruption. Retry the same image.'}});}else await route.continue();});
    await page.getByLabel('Image file',{exact:true}).setInputFiles(imagePath);await page.getByLabel('Image 1 description',{exact:true}).fill('Synthetic violet field: unfinished light.');await expect(composer.getByRole('img',{name:'Selected image preview'})).toBeVisible();await composer.getByRole('button',{name:'Post ↗',exact:true}).click();await expect(page.getByText('Synthetic upload interruption. Retry the same image.')).toBeVisible();await expect(page.getByLabel('Your offering')).toHaveValue(body);
    let firstPublish=true;await page.route('**/api/temple/feed',async route=>{if(firstPublish&&route.request().method()==='POST'){firstPublish=false;const saved=await route.fetch();expect(saved.status()).toBe(201);await route.fulfill({status:503,json:{error:'Synthetic lost confirmation. Retry your kept draft.'}});}else await route.continue();});
    await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('region',{name:'Offering preview'})).toBeVisible();await page.getByRole('button',{name:'Post ↗',exact:true}).click();await expect(page.getByText(/Synthetic lost confirmation/)).toBeVisible();await expect(page.getByLabel('Your offering')).toHaveValue(body);await page.getByRole('button',{name:'Post ↗',exact:true}).click();await expect(page.getByText('Your offering is in the shared room.')).toBeVisible();
    let card=page.locator('article').filter({has:page.getByText(body,{exact:true})});await expect(card).toHaveCount(1);const href=await card.getByRole('link',{name:'Contribution link'}).getAttribute('href'),id=href!.split('/').at(-1)!;
    const imageSrc=await card.getByRole('img').getAttribute('src'),imageId=imageSrc!.split('/').at(-1)!;
    await page.reload();card=page.locator('article').filter({has:page.getByText(body,{exact:true})});await expect(card).toHaveCount(1);await card.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Your offering').fill(body+'\nA deliberate edit.');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText(body+'\nA deliberate edit.',{exact:true})).toBeVisible();
    const deny=await b.request.patch('/api/temple/feed/'+id,{headers:{origin},data:{body:'Unauthorized overwrite',version:2,mediaIds:[]}});expect(deny.status()).toBe(403);
    expect((await anon.request.get(imageSrc!)).status()).toBe(401);expect((await b.request.get(imageSrc!)).status()).toBe(200);
    const ownAPI=await a.request.get('/api/temple/feed/'+id),snapshot=await ownAPI.json();expect(JSON.stringify(snapshot)).not.toContain('PRIVATE SYNTHETIC BILLING');expect(JSON.stringify(snapshot)).not.toContain('@example.test');
    const bPage=await b.newPage();await bPage.goto(href!);await bPage.getByRole('button',{name:/Replies \d/}).click();await bPage.getByLabel('Leave a reply').fill(otherText);await bPage.getByRole('button',{name:'Reply',exact:true}).click();await expect(bPage.getByText(otherText,{exact:true})).toBeVisible();await bPage.getByRole('button',{name:/Spark/}).click();await expect(bPage.getByRole('button',{name:/Spark/})).toHaveAttribute('aria-pressed','true');
    await bPage.getByRole('button',{name:'Report',exact:true}).click();await bPage.getByLabel('What needs attention?').fill('Synthetic browser moderation review');await bPage.getByRole('button',{name:'Send report'}).click();await expect(bPage.getByText(/Report received/)).toBeVisible();
    const modPage=await mod.newPage();await modPage.goto('/members/moderation');await modPage.getByLabel('Reason shown to the author').fill('Synthetic review: temporarily removed for testing.');await modPage.locator('article').filter({hasText:id}).getByRole('button',{name:'Remove from shared room'}).click();await expect(modPage.getByText(/Moderation saved/)).toBeVisible();expect((await b.request.get(imageSrc!)).status()).toBe(404);
    await page.goto(href!);await expect(page.getByText(/Removed from the shared feed by a moderator/)).toBeVisible();await audit(page);await screenshot(page,'moderation-notice.png');
    await modPage.locator('article').filter({hasText:id}).getByRole('button',{name:'Restore contribution'}).click();await expect(modPage.locator('article').filter({hasText:id}).getByRole('button',{name:'Remove from shared room'})).toBeEnabled();expect((await b.request.get(imageSrc!)).status()).toBe(200);
    await page.goto('/members/identity');await expect(page.getByLabel('Temple name')).toHaveValue(/Synthetic/);await page.getByLabel('Temple name').fill('Synthetic Moon Weaver');await page.getByLabel('Creative persona').fill('Synthetic preview: making room for worlds still becoming.');await page.getByLabel('Choose avatar image').setInputFiles(imagePath);await page.getByRole('button',{name:'Use this crop',exact:true}).click();await expect(page.getByRole('img',{name:'Your chosen avatar'})).toBeVisible();await page.getByRole('button',{name:'Save your Temple identity'}).click();await expect(page.getByText(/Your chosen identity is saved/)).toBeVisible();await audit(page);await screenshot(page,'identity-export.png');
    const ownReply='My own portable reply '+randomUUID();await a.request.post('/api/temple/feed/'+id+'/comments',{headers:{origin},data:{id:randomUUID(),body:ownReply}});
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download my work'}).click();const download=await downloadPromise;await download.saveAs(artifactDir+'/synthetic-own-work.zip');
    execFileSync('python3',['-c',`import json,zipfile,hashlib,sys\nz=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;m=json.loads(z.read('manifest.json'))\nfor f in m['media']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']\nopen(sys.argv[2],'w').write(json.dumps(m))`,artifactDir+'/synthetic-own-work.zip',artifactDir+'/synthetic-manifest.json']);
    const manifest=JSON.parse(await readFile(artifactDir+'/synthetic-manifest.json','utf8'));expect(JSON.stringify(manifest)).not.toContain(otherText);expect(JSON.stringify(manifest)).toContain(ownReply);expect(manifest.media.find((m:{id:string})=>m.id===imageId).sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    await page.goto('/members/feed');await expect(page.getByText(body+'\nA deliberate edit.',{exact:true})).toBeVisible();await audit(page);await screenshot(page,'shared-temple-desktop.png');await page.setViewportSize({width:390,height:844});await audit(page);await screenshot(page,'shared-temple-phone.png');
    // Expiry is synthetic local data only; own export remains while shared data and others’ media deny access.
    const userId=(await db.query('SELECT id FROM member_user WHERE email=$1',['temple-preview-weaver@example.test'])).rows[0].id;
    await db.query("UPDATE memberships SET paid_through=NOW()-INTERVAL '1 day' WHERE user_id=$1",[userId]);expect((await a.request.get('/api/temple/feed')).status()).toBe(403);expect((await a.request.get('/api/temple/export?format=json')).status()).toBe(200);await page.goto('/members/feed');await expect(page.getByText(/An active paid membership opens/)).toBeVisible();await audit(page);await screenshot(page,'expired-access.png');
    await db.query("UPDATE memberships SET paid_through=NOW()+INTERVAL '1 month' WHERE user_id=$1",[userId]);
    expect((await a.request.delete('/api/temple/feed/'+id,{headers:{origin},data:{}})).status()).toBe(200);expect((await a.request.delete('/api/temple/feed/'+id,{headers:{origin},data:{}})).status()).toBe(200);expect((await b.request.get(imageSrc!)).status()).toBe(404);
  }finally{for(const context of [a,b,mod,anon])await context.close();}
});

test('compact composer keeps attachments optional and posts with the keyboard',async({browser})=>{
  const context=await browser.newContext({baseURL:origin});let postId:string|undefined;
  try{
    await mkdir(artifactDir,{recursive:true});await signIn(context,'weaver');const page=await context.newPage();await page.goto('/members/feed');await page.getByRole('button',{name:'Bring an offering'}).click();
    const composer=page.getByRole('form',{name:'Create a post'}),post=composer.getByRole('button',{name:'Post ↗',exact:true});
    await expect(post).toBeDisabled();await expect(composer.getByRole('button',{name:'Upload image',exact:true})).toHaveCount(0);await expect(composer.getByLabel('Link (optional)')).toHaveCount(0);
    await page.addStyleTag({content:'nextjs-portal{visibility:hidden!important}'});
    await composer.screenshot({path:artifactDir+'/compact-composer-desktop.png'});
    await page.setViewportSize({width:390,height:844});await audit(page);expect((await composer.boundingBox())!.height).toBeLessThan(360);await composer.screenshot({path:artifactDir+'/compact-composer-phone.png'});
    await page.setViewportSize({width:320,height:844});await audit(page);
    await composer.getByRole('button',{name:'Link',exact:true}).click();await composer.getByLabel('Link (optional)').fill('https://example.test/kept');await composer.getByRole('button',{name:'Remove link'}).click();await expect(composer.getByLabel('Link (optional)')).toHaveCount(0);
    const bytes=await sharp({create:{width:120,height:80,channels:3,background:'#604b90'}}).png().toBuffer();
    await composer.getByLabel('Image file',{exact:true}).setInputFiles([{name:'one.png',mimeType:'image/png',buffer:bytes},{name:'two.png',mimeType:'image/png',buffer:bytes}]);await expect(composer.getByRole('img',{name:'Selected image preview'})).toHaveCount(2);
    await composer.getByRole('button',{name:'Remove image 2',exact:true}).click();await composer.getByLabel('Image 1 description',{exact:true}).fill('Violet rectangle');await audit(page);
    await page.setViewportSize({width:390,height:844});await composer.screenshot({path:artifactDir+'/compact-composer-attachment-phone.png'});
    await composer.getByRole('button',{name:'Remove image 1',exact:true}).click();
    const body='Synthetic compact keyboard post '+randomUUID();await composer.getByLabel('Your offering',{exact:true}).fill(body);await composer.getByLabel('Your offering',{exact:true}).press('Control+Enter');await expect(page.getByText('Your offering is in the shared room.')).toBeVisible();
    const feed=await (await context.request.get('/api/temple/feed')).json();postId=feed.posts.find((item:{body:string})=>item.body===body)?.id;expect(postId).toBeTruthy();
  }finally{if(postId)await context.request.delete('/api/temple/feed/'+postId,{headers:{origin},data:{}});await context.close();}
});
