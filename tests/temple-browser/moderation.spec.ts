import { test,expect,type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const origin=process.env.TEMPLE_TEST_ORIGIN??'http://127.0.0.1:3003';
const headers={origin};
async function signIn(context:BrowserContext,key:string){expect((await context.request.post('/api/member-auth/sign-in/email',{headers,data:{email:`temple-preview-${key}@example.test`,password:'Synthetic-Temple-Test-Only-2026!'}})).status()).toBe(200);}
test('moderators can inspect image/link-only reports while reasons and hidden media remain private',async({browser})=>{
  const author=await browser.newContext({baseURL:origin}),reader=await browser.newContext({baseURL:origin}),mod=await browser.newContext({baseURL:origin}),anon=await browser.newContext({baseURL:origin});
  const ids:string[]=[];
  try{
    await signIn(author,'weaver');await signIn(reader,'spark');await signIn(mod,'moderator');
    const textId=randomUUID();ids.push(textId);
    expect((await author.request.post('/api/temple/feed',{headers,data:{id:textId,body:'Synthetic versioned review'}})).status()).toBe(201);
    const request={kind:'post',targetId:textId,reason:'Synthetic first review'};
    const first=await reader.request.post('/api/temple/reports',{headers,data:request});expect(first.status()).toBe(201);const firstReport=await first.json();expect(firstReport.reported).toBe(true);
    const duplicate=await reader.request.post('/api/temple/reports',{headers,data:request});expect(duplicate.status()).toBe(200);expect(await duplicate.json()).toMatchObject({reported:false,duplicate:true,id:firstReport.id});
    for(const action of ['hide','restore'])expect((await mod.request.post('/api/temple/moderation',{headers,data:{kind:'post',targetId:textId,action,reason:'Private author-only '+action}})).status()).toBe(200);
    const owned=(await (await author.request.get('/api/temple/feed/'+textId)).json()).posts[0];expect(owned.moderation_reason).toBe('Private author-only restore');
    for(const viewer of [reader,mod])expect((await (await viewer.request.get('/api/temple/feed/'+textId)).json()).posts[0].moderation_reason).toBeNull();
    const edit=await author.request.patch('/api/temple/feed/'+textId,{headers,data:{body:'Edited synthetic contribution',version:owned.version}});expect(edit.status()).toBe(200);const edited=await edit.json();
    const renewed=await reader.request.post('/api/temple/reports',{headers,data:{...request,reason:'New review after author edit'}});expect(renewed.status()).toBe(201);const renewedReport=await renewed.json();expect(renewedReport.id).not.toBe(firstReport.id);expect(renewedReport.contentVersion).toBe(edited.version);
    const replyId=randomUUID();expect((await author.request.post('/api/temple/feed/'+textId+'/comments',{headers,data:{id:replyId,body:'Synthetic reply'}})).status()).toBe(201);
    for(const action of ['hide','restore'])expect((await mod.request.post('/api/temple/moderation',{headers,data:{kind:'comment',targetId:replyId,action,reason:'Private reply-only '+action}})).status()).toBe(200);
    expect((await (await reader.request.get('/api/temple/feed/'+textId+'/comments')).json()).comments.find((c:{id:string})=>c.id===replyId).moderation_reason).toBeNull();

    const bytes=await sharp({create:{width:80,height:48,channels:3,background:'#7360a0'}}).png().toBuffer(),mediaId=randomUUID(),imageId=randomUUID(),linkId=randomUUID();ids.push(imageId,linkId);
    expect((await author.request.post('/api/temple/media',{headers,multipart:{id:mediaId,alt:'Synthetic image-only moderation fixture',file:{name:'reported.png',mimeType:'image/png',buffer:bytes}}})).status()).toBe(201);
    expect((await author.request.post('/api/temple/feed',{headers,data:{id:imageId,body:'',mediaIds:[mediaId]}})).status()).toBe(201);
    expect((await author.request.post('/api/temple/feed',{headers,data:{id:linkId,body:'',link:'https://example.test/moderation-link-only'}})).status()).toBe(201);
    for(const id of [imageId,linkId])expect((await author.request.post('/api/temple/reports',{headers,data:{kind:'post',targetId:id,reason:'Synthetic image or link review'}})).status()).toBe(201);
    expect((await reader.request.get('/api/temple/moderation')).status()).toBe(403);
    expect((await reader.request.get('/api/temple/moderation/media/'+mediaId)).status()).toBe(403);expect((await anon.request.get('/api/temple/moderation/media/'+mediaId)).status()).toBe(401);
    const page=await mod.newPage();await page.goto('/members/moderation');const imageCard=page.locator('article').filter({hasText:imageId}),linkCard=page.locator('article').filter({hasText:linkId});
    await expect(imageCard.getByRole('img',{name:'Synthetic image-only moderation fixture'})).toBeVisible();await expect(imageCard.getByText('Contribution was deleted.')).toHaveCount(0);await expect(linkCard.getByRole('link',{name:/moderation-link-only/})).toBeVisible();await expect(linkCard.getByText('Contribution was deleted.')).toHaveCount(0);
    await page.getByLabel('Reason shown to the author').fill('Synthetic hidden-image inspection');await imageCard.getByRole('button',{name:'Remove from shared room'}).click();await expect(imageCard.getByRole('button',{name:'Restore contribution'})).toBeEnabled();
    expect((await reader.request.get('/api/temple/media/'+mediaId)).status()).toBe(404);expect((await mod.request.get('/api/temple/media/'+mediaId)).status()).toBe(404);
    const protectedImage=await mod.request.get('/api/temple/moderation/media/'+mediaId);expect(protectedImage.status()).toBe(200);expect(protectedImage.headers()['cache-control']).toBe('private, no-store');expect((await protectedImage.body()).equals(bytes)).toBe(true);
    await page.reload();await expect(imageCard.getByRole('img')).toBeVisible();await imageCard.getByRole('img').scrollIntoViewIfNeeded();await expect.poll(()=>imageCard.getByRole('img').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    for(const width of [1280,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(0);const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(scan.violations.map(v=>v.id)).toEqual([]);}
  }finally{for(const id of ids)await author.request.delete('/api/temple/feed/'+id,{headers,data:{}});for(const context of [author,reader,mod,anon])await context.close();}
});
