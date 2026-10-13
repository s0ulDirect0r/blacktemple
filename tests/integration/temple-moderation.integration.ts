import 'next/dist/server/node-environment-baseline';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { membershipDatabase } from '../../src/lib/membership/database';
import * as temple from '../../src/lib/temple/store';
import { MemberError } from '../../src/lib/membership/errors';

const database=process.env.TEMPLE_TEST_DATABASE_URL;
if(!database||!['127.0.0.1','localhost','[::1]'].includes(new URL(database).hostname)||process.env.VERCEL_ENV==='production'||process.env.MEMBERSHIP_LIVE_ENABLED==='true')throw new Error('Moderation regression tests require an isolated loopback TEMPLE_TEST_DATABASE_URL.');
process.env.MEMBERSHIP_DATABASE_URL=database;
const db=membershipDatabase(),suffix=randomUUID().slice(0,8);
async function seed(label:string,active=true){
  const userId='temple-moderation-'+label+'-'+suffix;
  await db.query('INSERT INTO member_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,NOW(),NOW())',[userId,'Private synthetic billing '+label,userId+'@example.test']);
  const attempt=randomUUID();
  await db.query("INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at) VALUES($1,$2,'witness','fixture_price',2000,'synthetic','completed',NOW()+INTERVAL '3 months')",[attempt,userId]);
  await db.query("INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end,paid_through) VALUES($1,$2,$3,'witness',$4,$5,$6,'active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '3 months',NOW()+$7::interval)",[randomUUID(),attempt,userId,'fixture_customer_'+userId,'fixture_subscription_'+userId,'fixture_schedule_'+userId,active?'1 month':'-1 day']);
  await temple.saveProfile(userId,{name:'Synthetic '+label,alias:'fix-'+label+'-'+suffix,persona:'Synthetic moderation regression fixture'});
  return userId;
}
const denied=(status:number)=>(error:unknown)=>error instanceof MemberError&&error.status===status;

test('moderation reasons stay private, operators inspect media/links, and resolved reports permit a new versioned review',async()=>{
  try{
    const [author,reader,imageReporter,linkReporter,mod,expired]=await Promise.all(['author','reader','image','link','mod','expired'].map(label=>seed(label,label!=='expired')));
    await db.query('INSERT INTO temple_moderators(user_id) VALUES($1),($2)',[mod,expired]);
    const postId=randomUUID();await temple.savePost(author,{id:postId,body:'Synthetic reportable text'});
    const reports=await Promise.all([temple.report(reader,{kind:'post',targetId:postId,reason:'First review requested'}),temple.report(reader,{kind:'post',targetId:postId,reason:'Concurrent repeat request'})]);
    assert.equal(reports.filter(r=>r.reported).length,1);assert.equal(reports.filter(r=>r.duplicate).length,1);assert.equal(reports[0].id,reports[1].id);assert.equal(reports[0].contentVersion,1);
    await temple.moderate(mod,{kind:'post',targetId:postId,action:'hide',reason:'Private post removal explanation'});
    await temple.moderate(mod,{kind:'post',targetId:postId,action:'restore',reason:'Private post restoration explanation'});
    const owned=(await temple.feed(author,null,postId)).posts[0];
    assert.equal(owned.moderation_reason,'Private post restoration explanation');
    for(const viewer of [reader,mod]){
      const shared=(await temple.feed(viewer,null,postId)).posts[0];assert.equal(shared.moderation_reason,null);assert.ok(!JSON.stringify(shared).includes('Private post restoration explanation'));
    }
    const edited=await temple.savePost(author,{body:'Edited after first review',version:owned.version},postId);
    const fresh=await temple.report(reader,{kind:'post',targetId:postId,reason:'Please review the edited contribution'});
    assert.equal(fresh.reported,true);assert.equal(fresh.duplicate,false);assert.notEqual(fresh.id,reports[0].id);assert.equal(fresh.contentVersion,edited.version);
    const history=(await db.query('SELECT status,content_version FROM temple_reports WHERE reporter_id=(SELECT id FROM temple_profiles WHERE user_id=$1) AND target_id=$2 ORDER BY created_at,id',[reader,postId])).rows;
    assert.equal(history.length,2);assert.ok(history.some(r=>r.status==='resolved'&&r.content_version===1));assert.ok(history.some(r=>r.status==='open'&&r.content_version===edited.version));

    const replyId=randomUUID();await temple.saveComment(author,postId,{id:replyId,body:'Synthetic reply for review'});
    const firstReplyReport=await temple.report(reader,{kind:'comment',targetId:replyId,reason:'Please review this reply'});
    await temple.moderate(mod,{kind:'comment',targetId:replyId,action:'hide',reason:'Private reply removal explanation'});
    await temple.moderate(mod,{kind:'comment',targetId:replyId,action:'restore',reason:'Private reply restoration explanation'});
    const ownReply=(await temple.comments(author,postId,null)).comments.find(c=>c.id===replyId)!;
    assert.equal(ownReply.moderation_reason,'Private reply restoration explanation');
    for(const viewer of [reader,mod])assert.equal((await temple.comments(viewer,postId,null)).comments.find(c=>c.id===replyId)?.moderation_reason,null);
    const editedReply=await temple.saveComment(author,postId,{body:'Edited reply after resolution',version:ownReply.version},replyId);
    const nextReplyReport=await temple.report(reader,{kind:'comment',targetId:replyId,reason:'A new review of the edited reply'});
    assert.notEqual(nextReplyReport.id,firstReplyReport.id);assert.equal(nextReplyReport.reported,true);assert.equal(nextReplyReport.contentVersion,editedReply.version);

    const bytes=await sharp({create:{width:40,height:24,channels:3,background:'#7350a0'}}).png().toBuffer();
    const mediaId=randomUUID(),draftId=randomUUID(),imagePost=randomUUID(),linkPost=randomUUID();
    await temple.upload(author,mediaId,bytes,'image-only.png','Synthetic image-only contribution');
    await temple.upload(author,draftId,bytes,'draft.png','Private unattached synthetic draft');
    await temple.savePost(author,{id:imagePost,body:'',mediaIds:[mediaId]});
    await temple.savePost(author,{id:linkPost,body:'',link:'https://example.test/link-only'});
    await temple.report(imageReporter,{kind:'post',targetId:imagePost,reason:'Review this image-only offering'});
    await temple.report(linkReporter,{kind:'post',targetId:linkPost,reason:'Review this link-only offering'});
    await assert.rejects(temple.moderationQueue(reader),denied(403));
    let queue=await temple.moderationQueue(mod);
    const imageReport=queue.find(r=>r.target_id===imagePost),linkReport=queue.find(r=>r.target_id===linkPost);
    assert.equal(imageReport?.body,'');assert.equal(imageReport?.deleted_at,null);assert.equal(imageReport?.media[0].id,mediaId);assert.equal(imageReport?.media[0].alt,'Synthetic image-only contribution');
    assert.equal(linkReport?.body,'');assert.equal(linkReport?.link,'https://example.test/link-only');assert.equal(linkReport?.deleted_at,null);assert.deepEqual(linkReport?.media,[]);
    assert.ok(queue.some(r=>r.target_id===postId&&r.moderation_reason==='Private post restoration explanation'));
    assert.equal((await temple.moderationMediaFor(mod,mediaId)).bytes.equals(bytes),true);
    await assert.rejects(temple.moderationMediaFor(reader,mediaId),denied(403));await assert.rejects(temple.moderationMediaFor(expired,mediaId),denied(403));await assert.rejects(temple.moderationMediaFor(mod,draftId),denied(404));
    await temple.moderate(mod,{kind:'post',targetId:imagePost,action:'hide',reason:'Private image review explanation'});
    await temple.moderate(mod,{kind:'post',targetId:linkPost,action:'hide',reason:'Private link review explanation'});
    for(const viewer of [reader,mod])await assert.rejects(temple.mediaFor(viewer,mediaId),denied(404));
    assert.equal((await temple.moderationMediaFor(mod,mediaId)).bytes.equals(bytes),true);
    queue=await temple.moderationQueue(mod);assert.ok(queue.find(r=>r.target_id===imagePost)?.hidden_at);assert.equal(queue.find(r=>r.target_id===imagePost)?.media[0].id,mediaId);assert.equal(queue.find(r=>r.target_id===linkPost)?.link,'https://example.test/link-only');
    await assert.rejects(temple.feed(reader,null,linkPost),denied(404));
    await temple.deleteRecord(author,'post',imagePost);await assert.rejects(temple.moderationMediaFor(mod,mediaId),denied(404));
  }finally{await db.end();}
});
