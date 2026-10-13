import 'next/dist/server/node-environment-baseline';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import sharp from 'sharp';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { membershipDatabase } from '../../src/lib/membership/database';
import * as temple from '../../src/lib/temple/store';
import { ownWork,exportResponse } from '../../src/lib/temple/export';
import { MemberError } from '../../src/lib/membership/errors';

const database=process.env.TEMPLE_TEST_DATABASE_URL;
if(!database||!['127.0.0.1','localhost','[::1]'].includes(new URL(database).hostname)||process.env.VERCEL_ENV==='production'||process.env.MEMBERSHIP_LIVE_ENABLED==='true')throw new Error('Integration tests require an explicitly isolated loopback TEMPLE_TEST_DATABASE_URL, never production.');
process.env.MEMBERSHIP_DATABASE_URL=database;
const db=membershipDatabase();
const suffix=randomUUID().slice(0,8),users=['a','b','expired','moderator'].map(n=>'temple-integration-'+n+'-'+suffix);
async function seed(userId:string,active=true){
  await db.query('INSERT INTO member_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,NOW(),NOW())',[userId,'PRIVATE BILLING NAME '+userId,userId+'@example.test']);
  const attempt=randomUUID();
  await db.query("INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at) VALUES($1,$2,'witness','fixture_price',2000,'fixture','completed',NOW()+INTERVAL '3 months')",[attempt,userId]);
  await db.query("INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end,paid_through) VALUES($1,$2,$3,'witness',$4,$5,$6,'active',NOW()-INTERVAL '1 month',NOW()+INTERVAL '2 months',NOW()+$7::interval)",[randomUUID(),attempt,userId,'fixture_customer_'+userId,'fixture_subscription_'+userId,'fixture_schedule_'+userId,active?'1 month':'-1 day']);
  return temple.saveProfile(userId,{name:'Synthetic '+userId.split('-')[2],alias:'test-'+userId.split('-')[2]+'-'+suffix,persona:'Explicitly synthetic integration account'});
}
test('private PostgreSQL community: ownership, concurrency, originals, moderation and portable own-work export',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'temple-export-check-'));
  try{
    // Aliases must be different: seed with a randomized suffix before the length bound.
    for(let i=0;i<users.length;i++)await seed(users[i],i!==2);
    const [a,b,expired,mod]=users,pa=await temple.requireProfile(a),pb=await temple.requireProfile(b);
    await db.query('INSERT INTO temple_moderators(user_id) VALUES($1)',[mod]);
    await assert.rejects(temple.feed(expired),e=>e instanceof MemberError&&e.status===403);
    const bytes=await sharp({create:{width:24,height:16,channels:3,background:'#7350a0'}}).png().toBuffer(),mediaId=randomUUID();
    await temple.upload(a,mediaId,bytes,'original.png','Synthetic violet artwork');await temple.upload(a,mediaId,bytes,'original.png','Synthetic violet artwork');
    const id=randomUUID(),body='A synthetic poem\n\nwith a private second stanza.';
    const input={id,body,mediaIds:[mediaId],offering:true,link:'https://example.test/art'};
    await Promise.all([temple.savePost(a,input),temple.savePost(a,input)]);assert.equal(Number((await db.query('SELECT COUNT(*) count FROM temple_posts WHERE id=$1',[id])).rows[0].count),1);
    await assert.rejects(temple.savePost(b,{...input,version:1},id),e=>e instanceof MemberError&&e.status===403);
    await assert.rejects(temple.deleteRecord(b,'post',id),e=>e instanceof MemberError&&e.status===403);
    await assert.rejects(temple.savePost(b,{id:randomUUID(),body:'stolen',mediaIds:[mediaId]}),e=>e instanceof MemberError&&e.status===403);
    const visible=await temple.feed(b),serialized=JSON.stringify(visible);assert.ok(serialized.includes('Synthetic a'));assert.ok(!serialized.includes('PRIVATE BILLING NAME'));assert.ok(!serialized.includes('@example.test'));assert.ok(!serialized.includes(a));
    assert.equal((await temple.mediaFor(b,mediaId)).bytes.equals(bytes),true);await assert.rejects(temple.mediaFor(expired,mediaId),e=>e instanceof MemberError&&e.status===403);
    const draft=randomUUID();await temple.upload(a,draft,bytes,'draft.png','Private draft');await assert.rejects(temple.mediaFor(b,draft),e=>e instanceof MemberError&&e.status===404);
    const replyId=randomUUID(),otherReply=randomUUID();await temple.saveComment(a,id,{id:replyId,body:'My own reply'});await temple.saveComment(b,id,{id:otherReply,body:'OTHER MEMBER PRIVATE REPLY'});
    await assert.rejects(temple.saveComment(b,id,{body:'stolen',version:1},replyId),e=>e instanceof MemberError&&e.status===403);
    await temple.saveComment(a,id,{body:'My revised reply',version:1},replyId);await assert.rejects(temple.saveComment(a,id,{body:'stale',version:1},replyId),e=>e instanceof MemberError&&e.status===409);
    await temple.reaction(b,id,'spark');await temple.reaction(b,id,'spark');assert.equal(Number((await db.query('SELECT COUNT(*) count FROM temple_reactions WHERE post_id=$1',[id])).rows[0].count),1);await temple.reaction(b,id,null);await temple.reaction(b,id,null);
    await temple.savePost(a,{...input,body:body+'\nAn edit',version:1},id);await assert.rejects(temple.savePost(a,{...input,version:1},id),e=>e instanceof MemberError&&e.status===409);
    const newProfile=await temple.saveProfile(a,{name:'The Chosen Weaver',alias:'chosen-'+suffix,persona:'A changed identity',version:pa.version});assert.equal(newProfile.id,pa.id);assert.equal((await db.query('SELECT name FROM member_user WHERE id=$1',[a])).rows[0].name,'PRIVATE BILLING NAME '+a);
    await temple.report(b,{kind:'post',targetId:id,reason:'Synthetic moderation report'});await temple.report(b,{kind:'post',targetId:id,reason:'Repeated report'});
    await assert.rejects(temple.moderate(b,{kind:'post',targetId:id,action:'hide',reason:'Unauthorized removal'}),e=>e instanceof MemberError&&e.status===403);
    await temple.moderate(mod,{kind:'post',targetId:id,action:'hide',reason:'Synthetic review removal'});
    assert.ok(!(await temple.feed(b)).posts.some(p=>p.id===id));await assert.rejects(temple.mediaFor(b,mediaId),e=>e instanceof MemberError&&e.status===404);assert.equal((await temple.feed(a)).posts.find(p=>p.id===id)?.moderation_reason,'Synthetic review removal');
    await temple.moderate(mod,{kind:'post',targetId:id,action:'restore',reason:'Synthetic review restored'});assert.ok((await temple.feed(b)).posts.some(p=>p.id===id));
    const own=await ownWork(a);assert.equal(own.manifest.posts.length,1);assert.equal(own.manifest.replies.length,1);assert.equal(own.manifest.posts[0].id,id);assert.equal(own.manifest.posts[0].body,body+'\nAn edit');
    assert.ok(!JSON.stringify(own.manifest).includes('OTHER MEMBER PRIVATE REPLY'));assert.ok(!JSON.stringify(own.manifest).includes(pb.id));assert.ok(!JSON.stringify(own.manifest).includes('PRIVATE BILLING NAME'));assert.ok(!JSON.stringify(own.manifest).includes('@example.test'));
    const response=await exportResponse(a);await writeFile(path.join(dir,'own.zip'),Buffer.from(await response.arrayBuffer()));
    // Independent standard ZIP reader verifies full fidelity and every original attachment hash.
    execFileSync('python3',['-c',`import json,zipfile,hashlib,sys\nfrom pathlib import Path\nz=zipfile.ZipFile(sys.argv[1]);z.testzip();m=json.loads(z.read('manifest.json'))\nfor f in m['media']:\n assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']\nPath(sys.argv[2]).write_text(json.dumps(m))\n`,path.join(dir,'own.zip'),path.join(dir,'roundtrip.json')]);
    const roundtrip=JSON.parse(await readFile(path.join(dir,'roundtrip.json'),'utf8'));assert.deepEqual(roundtrip.posts,JSON.parse(JSON.stringify(own.manifest.posts)));assert.deepEqual(roundtrip.replies,JSON.parse(JSON.stringify(own.manifest.replies)));assert.equal(roundtrip.media[0].sha256,createHash('sha256').update(bytes).digest('hex'));
    await db.query("UPDATE memberships SET paid_through=NOW()-INTERVAL '1 day' WHERE user_id=$1",[a]);await assert.rejects(temple.feed(a),e=>e instanceof MemberError&&e.status===403);assert.equal((await ownWork(a)).manifest.posts.length,1);assert.equal((await temple.mediaFor(a,mediaId)).bytes.equals(bytes),true);
    await db.query("UPDATE memberships SET paid_through=NOW()+INTERVAL '1 month' WHERE user_id=$1",[a]);await temple.deleteRecord(a,'post',id);await temple.deleteRecord(a,'post',id);await assert.rejects(temple.mediaFor(a,mediaId),e=>e instanceof MemberError&&e.status===404);
    assert.equal((await ownWork(a)).manifest.posts.length,0);assert.equal((await ownWork(b)).manifest.replies[0].id,otherReply);assert.equal((await ownWork(b)).manifest.posts.length,0);
    assert.equal((await ownWork(a)).manifest.profile?.id,pa.id);
    const pagingUser='temple-integration-paging-'+suffix;
    const paging=await seed(pagingUser);
    for(let i=0;i<25;i++)await db.query("INSERT INTO temple_posts(id,author_id,body,created_at) VALUES($1,$2,$3,NOW()-$4*INTERVAL '1 second')",[randomUUID(),paging.id,'Synthetic pagination '+i,i]);
    const pageIds=new Set<string>();let cursor:string|null=null,pagingCount=0;
    do{const page=await temple.feed(b,cursor);for(const post of page.posts){assert.ok(!pageIds.has(post.id));pageIds.add(post.id);if(post.author.id===paging.id)pagingCount++;}cursor=page.cursor;}while(cursor);
    assert.equal(pagingCount,25);
    const raceId=randomUUID(),results=await Promise.allSettled([temple.savePost(a,{id:raceId,body:'Owned by A'}),temple.savePost(b,{id:raceId,body:'Owned by B'})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const race=(await db.query('SELECT author_id,body FROM temple_posts WHERE id=$1',[raceId])).rows[0];assert.equal(race.body,race.author_id===pa.id?'Owned by A':'Owned by B');
    await assert.rejects(temple.savePost(race.author_id===pa.id?b:a,{id:raceId,body:'overwrite'}),e=>e instanceof MemberError&&e.status===403);
    const hiddenReply=randomUUID();await temple.saveComment(b,raceId,{id:hiddenReply,body:'Own reply retained under moderation'});await temple.moderate(mod,{kind:'comment',targetId:hiddenReply,action:'hide',reason:'Synthetic comment review'});
    assert.ok(!(await temple.comments(a,raceId,null)).comments.some(c=>c.id===hiddenReply));assert.ok((await ownWork(b)).manifest.replies.some(c=>c.id===hiddenReply));
  }finally{await rm(dir,{recursive:true,force:true});await db.end();}
});
