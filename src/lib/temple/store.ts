import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { membershipDatabase, transaction, lock } from '@/lib/membership/database';
import { hasAccess } from '@/lib/membership/config';
import { currentMembership } from '@/lib/membership/store';
import { MemberError } from '@/lib/membership/errors';
import { inspectImage } from './media';
import { postInput, profileInput, revision, text, uuid, REACTIONS, pageCursor } from './validation';

export interface Profile { id: string; name: string; alias: string; persona: string; avatar_id: string | null; version: number; created_at: Date; updated_at: Date }
export async function ownProfile(userId: string, client: Pick<PoolClient,'query'> = membershipDatabase()) { return (await client.query<Profile>('SELECT id,name,alias,persona,avatar_id,version,created_at,updated_at FROM temple_profiles WHERE user_id=$1', [userId])).rows[0] ?? null; }
export async function moderator(userId: string) { return Boolean((await membershipDatabase().query('SELECT 1 FROM temple_moderators WHERE user_id=$1',[userId])).rowCount); }
export async function communityAccess(userId: string) { if (!hasAccess(await currentMembership(userId))) throw new MemberError(403,'An active paid membership opens the shared Temple. Your own export remains available in Identity & export.'); }
export async function requireProfile(userId: string) { const p = await ownProfile(userId); if (!p) throw new MemberError(409,'Choose your Temple identity before contributing.'); return p; }
export async function publicProfile(userId:string,id:string) {
  await communityAccess(userId);
  const profile=(await membershipDatabase().query<Profile>('SELECT id,name,alias,persona,avatar_id,version,created_at,updated_at FROM temple_profiles WHERE id=$1',[uuid(id)])).rows[0];
  if(!profile)throw new MemberError(404,'Temple identity not found.');return profile;
}
async function limit(client: Pick<PoolClient,'query'>, userId: string, bucket = 'write', maximum = 30) {
  const result = await client.query<{count:number}>(`INSERT INTO temple_action_limits(user_id,bucket) VALUES($1,$2)
    ON CONFLICT(user_id,bucket) DO UPDATE SET count=CASE WHEN temple_action_limits.started_at<NOW()-INTERVAL '1 minute' THEN 1 ELSE temple_action_limits.count+1 END,
    started_at=CASE WHEN temple_action_limits.started_at<NOW()-INTERVAL '1 minute' THEN NOW() ELSE temple_action_limits.started_at END RETURNING count`, [userId,bucket]);
  if (result.rows[0].count > maximum) throw new MemberError(429,'Please pause a moment before trying again.');
}
// Request throttles commit before validation/decoding, so failed attempts count too.
export async function requestLimit(userId:string,bucket:string,maximum:number) {return limit(membershipDatabase(),userId,'request:'+bucket,maximum);}
export async function saveProfile(userId: string, body: Record<string, unknown>) {
  const input = profileInput(body);
  try { return await transaction(async client => {
    await lock(client,'temple-author:'+userId); await limit(client,userId);
    const old = await ownProfile(userId,client);
    if (old && revision(body.version) !== old.version) throw new MemberError(409,'Your identity changed in another window. Reload before saving.');
    if (input.avatarId && !(await client.query('SELECT 1 FROM temple_media WHERE id=$1 AND author_id=$2 AND post_id IS NULL',[input.avatarId,old?.id ?? null])).rowCount) throw new MemberError(403,'Choose an avatar you uploaded.');
    const p = (await client.query<Profile>(`INSERT INTO temple_profiles(id,user_id,name,alias,persona,avatar_id) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(user_id) DO UPDATE SET name=$3,alias=$4,persona=$5,avatar_id=$6,version=temple_profiles.version+1,updated_at=NOW()
      RETURNING id,name,alias,persona,avatar_id,version,created_at,updated_at`,[old?.id ?? randomUUID(),userId,input.name,input.alias,input.persona,input.avatarId])).rows[0];
    return p;
  }); } catch(error) { if ((error as {code?:string}).code==='23505') throw new MemberError(409,'That alias is already in use. Choose another.'); throw error; }
}
const authorSQL = `json_build_object('id',a.id,'name',a.name,'alias',a.alias,'avatarId',a.avatar_id) AS author`;
export async function feed(userId: string, cursor: string | null = null, single?: string) {
  await communityAccess(userId);
  const p = await ownProfile(userId), page = pageCursor(cursor);
  const rows = (await membershipDatabase().query(`SELECT p.id,p.body,p.link,p.offering,p.version,p.created_at,p.updated_at,p.hidden_at,
    CASE WHEN p.author_id=$1 THEN p.moderation_reason ELSE NULL END AS moderation_reason,${authorSQL},
    COALESCE((SELECT json_agg(json_build_object('id',m.id,'alt',m.alt,'width',m.width,'height',m.height) ORDER BY m.created_at,m.id) FROM temple_media m WHERE m.post_id=p.id),'[]') AS media,
    (SELECT COUNT(*)::int FROM temple_comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL AND c.hidden_at IS NULL) AS comment_count,
    COALESCE((SELECT json_object_agg(kind,n) FROM (SELECT kind,COUNT(*)::int n FROM temple_reactions WHERE post_id=p.id GROUP BY kind) r),'{}') AS reactions,
    (SELECT kind FROM temple_reactions WHERE post_id=p.id AND author_id=$1) AS my_reaction
    FROM temple_posts p JOIN temple_profiles a ON a.id=p.author_id
    WHERE p.deleted_at IS NULL AND (p.hidden_at IS NULL OR p.author_id=$1) AND ($2::uuid IS NULL OR p.id=$2)
    AND ($3::timestamptz IS NULL OR (p.created_at,p.id)<($3,$4::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,[p?.id ?? null,single ? uuid(single):null,page?.[0]??null,page?.[1]??null])).rows;
  if(single && !rows.length) throw new MemberError(404,'That contribution is not available.');
  const posts = rows.slice(0,20), last = posts.at(-1);
  const signal = (await membershipDatabase().query<{count:number}>("SELECT COUNT(*)::int count FROM temple_posts WHERE deleted_at IS NULL AND hidden_at IS NULL AND offering AND created_at>=date_trunc('day',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'")).rows[0].count;
  return { posts, cursor: rows.length>20 && last ? Buffer.from(JSON.stringify([last.created_at,last.id])).toString('base64url'):null, offeringsToday:signal, profile:p, isModerator:await moderator(userId) };
}
export async function savePost(userId: string, body: Record<string, unknown>, id?: string) {
  await communityAccess(userId); const p = await requireProfile(userId), input=postInput(body), recordId=uuid(id??body.id);
  return transaction(async client => {
    await lock(client,'temple-author:'+userId); await limit(client,userId);
    const old=(await client.query('SELECT * FROM temple_posts WHERE id=$1 FOR UPDATE',[recordId])).rows[0];
    if(old && old.author_id!==p.id) throw new MemberError(403,'You can edit only your own contributions.');
    if(!id && old) { if(old.deleted_at) throw new MemberError(409,'That contribution was deleted. Start a new offering.'); return {id:recordId,version:old.version}; }
    if(id && (!old || old.deleted_at)) throw new MemberError(404,'Contribution not found.');
    if(id && revision(body.version)!==old.version) throw new MemberError(409,'This contribution changed. Reload before editing.');
    if(old?.hidden_at) throw new MemberError(403,'This contribution is under moderation. Contact support before editing.');
    const media=(await client.query('SELECT id,post_id FROM temple_media WHERE id=ANY($1::uuid[]) AND author_id=$2 AND NOT EXISTS(SELECT 1 FROM temple_profiles WHERE avatar_id=temple_media.id) FOR UPDATE',[input.mediaIds,p.id])).rows;
    if(media.length!==input.mediaIds.length || media.some(m=>m.post_id && m.post_id!==recordId)) throw new MemberError(403,'Attach only your own available images.');
    const result=(await client.query(`INSERT INTO temple_posts(id,author_id,body,link,offering) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(id) DO UPDATE SET body=$3,link=$4,offering=$5,version=temple_posts.version+1,updated_at=NOW() WHERE temple_posts.author_id=$2 RETURNING id,version`,[recordId,p.id,input.body,input.link,input.offering])).rows[0];
    if(!result) throw new MemberError(409,'Contribution identifier is already in use. Start a new offering.');
    await client.query('UPDATE temple_media SET post_id=NULL WHERE post_id=$1',[recordId]);
    await client.query('UPDATE temple_media SET post_id=$1 WHERE id=ANY($2::uuid[])',[recordId,input.mediaIds]); return result;
  });
}
export async function deleteRecord(userId:string, kind:'post'|'comment', id:string) {
  await communityAccess(userId); const p=await requireProfile(userId); uuid(id);
  return transaction(async client=>{
    await lock(client,'temple-author:'+userId); await limit(client,userId);
    const table=kind==='post'?'temple_posts':'temple_comments';
    const row=(await client.query(`SELECT author_id FROM ${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!row) throw new MemberError(404,'Contribution not found.');
    if(row.author_id!==p.id) throw new MemberError(403,'You can delete only your own contributions.');
    await client.query(`UPDATE ${table} SET body='',deleted_at=COALESCE(deleted_at,NOW()),updated_at=NOW(),version=version+1${kind==='post'?',link=NULL':''} WHERE id=$1 AND deleted_at IS NULL`,[id]);
    if(kind==='post') { await client.query('DELETE FROM temple_media WHERE post_id=$1',[id]); await client.query('DELETE FROM temple_reactions WHERE post_id=$1',[id]); }
    return {deleted:true};
  });
}
async function availablePost(client:PoolClient,id:string) { if(!(await client.query('SELECT 1 FROM temple_posts WHERE id=$1 AND deleted_at IS NULL AND hidden_at IS NULL',[uuid(id)])).rowCount) throw new MemberError(404,'That contribution is not available.'); }
export async function comments(userId:string,postId:string,cursor:string|null) {
  await communityAccess(userId); const p=await ownProfile(userId), page=pageCursor(cursor);
  const db=membershipDatabase();
  if(!(await db.query('SELECT 1 FROM temple_posts WHERE id=$1 AND deleted_at IS NULL AND hidden_at IS NULL',[uuid(postId)])).rowCount) throw new MemberError(404,'That contribution is not available.');
  const rows=(await db.query(`SELECT c.id,c.post_id,c.body,c.version,c.created_at,c.updated_at,c.hidden_at,
    CASE WHEN c.author_id=$2 THEN c.moderation_reason ELSE NULL END AS moderation_reason,${authorSQL}
    FROM temple_comments c JOIN temple_profiles a ON a.id=c.author_id WHERE c.post_id=$1 AND c.deleted_at IS NULL AND (c.hidden_at IS NULL OR c.author_id=$2)
    AND ($3::timestamptz IS NULL OR (c.created_at,c.id)<($3,$4::uuid)) ORDER BY c.created_at DESC,c.id DESC LIMIT 31`,[postId,p?.id??null,page?.[0]??null,page?.[1]??null])).rows;
  const items=rows.slice(0,30), last=items.at(-1);return {comments:items,cursor:rows.length>30&&last?Buffer.from(JSON.stringify([last.created_at,last.id])).toString('base64url'):null};
}
export async function saveComment(userId:string,postId:string,body:Record<string,unknown>,id?:string) {
  await communityAccess(userId); const p=await requireProfile(userId), content=text(body.body,1,4000,'Reply'),recordId=uuid(id??body.id);
  return transaction(async client=>{
    await lock(client,'temple-author:'+userId); await limit(client,userId); await availablePost(client,postId);
    const old=(await client.query('SELECT * FROM temple_comments WHERE id=$1 FOR UPDATE',[recordId])).rows[0];
    if(old && (old.author_id!==p.id || old.post_id!==postId)) throw new MemberError(403,'You can edit only your own replies.');
    if(!id&&old) { if(old.deleted_at) throw new MemberError(409,'This reply was deleted.'); return {id:recordId}; }
    if(id&&(!old||old.deleted_at)) throw new MemberError(404,'Reply not found.');
    if(old?.hidden_at) throw new MemberError(403,'This reply is under moderation. Contact support.');
    if(id&&revision(body.version)!==old.version) throw new MemberError(409,'This reply changed. Reload before saving.');
    const saved=(await client.query(`INSERT INTO temple_comments(id,post_id,author_id,body) VALUES($1,$2,$3,$4)
      ON CONFLICT(id) DO UPDATE SET body=$4,version=temple_comments.version+1,updated_at=NOW() WHERE temple_comments.author_id=$3 AND temple_comments.post_id=$2 RETURNING id,version`,[recordId,postId,p.id,content])).rows[0];
    if(!saved) throw new MemberError(409,'Reply identifier is already in use. Start a new reply.'); return saved;
  });
}
export async function reaction(userId:string,postId:string,kind:unknown) {
  await communityAccess(userId); const p=await requireProfile(userId);
  if(kind!==null&&!REACTIONS.includes(kind as typeof REACTIONS[number])) throw new MemberError(400,'Choose spark, resonance or wonder.');
  return transaction(async client=>{await limit(client,userId); await availablePost(client,postId);
    if(kind===null) await client.query('DELETE FROM temple_reactions WHERE post_id=$1 AND author_id=$2',[postId,p.id]);
    else await client.query('INSERT INTO temple_reactions(post_id,author_id,kind) VALUES($1,$2,$3) ON CONFLICT(post_id,author_id) DO UPDATE SET kind=$3',[postId,p.id,kind]);
    return {kind}; });
}
export async function upload(userId:string,id:string,bytes:Buffer,name:string,alt:unknown) {
  await communityAccess(userId); const p=await requireProfile(userId); uuid(id); const metadata=await inspectImage(bytes,name,alt);
  return transaction(async client=>{
    await lock(client,'temple-author:'+userId); await limit(client,userId,'upload',8);
    const old=(await client.query('SELECT author_id,sha256 FROM temple_media WHERE id=$1',[id])).rows[0];
    if(old) {if(old.author_id!==p.id || old.sha256!==metadata.sha256) throw new MemberError(409,'Upload identifier is already in use.'); return {id,...metadata};}
    const used=(await client.query<{size:string}>('SELECT COALESCE(SUM(octet_length(bytes)),0) size FROM temple_media WHERE author_id=$1',[p.id])).rows[0];
    if(Number(used.size)+bytes.length>64*1024*1024) throw new MemberError(409,'Your 64 MiB image allowance is full. Remove unused images in Identity & export.');
    await client.query('INSERT INTO temple_media(id,author_id,filename,mime,alt,bytes,sha256,width,height) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,p.id,metadata.filename,metadata.mime,metadata.alt,bytes,metadata.sha256,metadata.width,metadata.height]);return {id,...metadata};
  });
}
export async function mediaFor(userId:string,id:string) {
  const db=membershipDatabase(), p=await ownProfile(userId);
  const m=(await db.query(`SELECT m.*,p.hidden_at,p.deleted_at,EXISTS(SELECT 1 FROM temple_profiles WHERE avatar_id=m.id) avatar FROM temple_media m LEFT JOIN temple_posts p ON p.id=m.post_id WHERE m.id=$1`,[uuid(id)])).rows[0];
  if(!m) throw new MemberError(404,'Image not available.');
  if(m.author_id!==p?.id) {await communityAccess(userId); if(!m.avatar && (!m.post_id || m.hidden_at || m.deleted_at)) throw new MemberError(404,'Image not available.');}
  return m as {bytes:Buffer;mime:string;filename:string};
}
/** Separate operator access: never widen ordinary member or draft-image access. */
export async function moderationMediaFor(userId:string,id:string) {
  await communityAccess(userId);
  if(!await moderator(userId))throw new MemberError(403,'Moderator access required.');
  const media=(await membershipDatabase().query<{bytes:Buffer;mime:string;filename:string}>(`SELECT m.bytes,m.mime,m.filename
    FROM temple_media m JOIN temple_posts p ON p.id=m.post_id
    WHERE m.id=$1 AND p.deleted_at IS NULL AND (p.hidden_at IS NOT NULL OR
      EXISTS(SELECT 1 FROM temple_reports r WHERE r.target_kind='post' AND r.target_id=p.id))`,[uuid(id)])).rows[0];
  if(!media)throw new MemberError(404,'Reported image not available.');
  return media;
}
export async function removeMedia(userId:string,id:string) {
  const p=await requireProfile(userId); uuid(id);
  return transaction(async client=>{await lock(client,'temple-author:'+userId);await limit(client,userId);
    const result=await client.query('DELETE FROM temple_media WHERE id=$1 AND author_id=$2 AND post_id IS NULL AND NOT EXISTS(SELECT 1 FROM temple_profiles WHERE avatar_id=temple_media.id)',[id,p.id]);
    if(!result.rowCount) throw new MemberError(409,'Remove the image from its contribution or avatar first.'); return {deleted:true};});
}
export async function ownMedia(userId:string) {const p=await ownProfile(userId);return (await membershipDatabase().query('SELECT id,filename,alt,post_id,octet_length(bytes) size FROM temple_media WHERE author_id=$1 ORDER BY created_at DESC',[p?.id??null])).rows;}
export async function report(userId:string,body:Record<string,unknown>) {
  await communityAccess(userId);const p=await requireProfile(userId),kind=body.kind,id=uuid(body.targetId),reason=text(body.reason,5,1000,'Report');
  if(kind!=='post'&&kind!=='comment') throw new MemberError(400,'Choose a contribution or reply.');
  return transaction(async client=>{await limit(client,userId,'report',5);await lock(client,'temple-review:'+kind+':'+id);
    const table=kind==='post'?'temple_posts':'temple_comments';
    const target=(await client.query<{version:number}>(`SELECT version FROM ${table} WHERE id=$1 AND deleted_at IS NULL AND hidden_at IS NULL FOR SHARE`,[id])).rows[0];
    if(!target) throw new MemberError(404,'Contribution not available.');
    const inserted=(await client.query<{id:string;content_version:number}>(`INSERT INTO temple_reports(id,reporter_id,target_kind,target_id,reason,content_version)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(reporter_id,target_kind,target_id) WHERE status='open' DO NOTHING RETURNING id,content_version`,[randomUUID(),p.id,kind,id,reason,target.version])).rows[0];
    if(inserted)return {id:inserted.id,reported:true,duplicate:false,contentVersion:inserted.content_version};
    const open=(await client.query<{id:string;content_version:number|null}>("SELECT id,content_version FROM temple_reports WHERE reporter_id=$1 AND target_kind=$2 AND target_id=$3 AND status='open'",[p.id,kind,id])).rows[0];
    return {id:open.id,reported:false,duplicate:true,contentVersion:open.content_version}; });
}
export async function moderationQueue(userId:string) {
  await communityAccess(userId);if(!await moderator(userId)) throw new MemberError(403,'Moderator access required.');
  return (await membershipDatabase().query(`SELECT r.id,r.target_kind,r.target_id,r.reason,r.status,r.created_at,r.content_version,
    COALESCE(p.body,c.body) body,p.link,COALESCE(p.version,c.version) current_version,
    COALESCE(p.hidden_at,c.hidden_at) hidden_at,COALESCE(p.deleted_at,c.deleted_at) deleted_at,
    COALESCE(p.moderation_reason,c.moderation_reason) moderation_reason,
    COALESCE((SELECT json_agg(json_build_object('id',m.id,'alt',m.alt,'width',m.width,'height',m.height) ORDER BY m.created_at,m.id)
      FROM temple_media m WHERE m.post_id=p.id),'[]') AS media
    FROM temple_reports r LEFT JOIN temple_posts p ON r.target_kind='post' AND p.id=r.target_id LEFT JOIN temple_comments c ON r.target_kind='comment' AND c.id=r.target_id
    ORDER BY (r.status='open') DESC,r.created_at DESC LIMIT 100`)).rows;
}
export async function moderate(userId:string,body:Record<string,unknown>) {
  await communityAccess(userId);if(!await moderator(userId)) throw new MemberError(403,'Moderator access required.');
  const kind=body.kind,id=uuid(body.targetId),action=body.action,reason=text(body.reason,5,1000,'Moderation reason');
  if((kind!=='post'&&kind!=='comment')||(action!=='hide'&&action!=='restore'&&action!=='dismiss')) throw new MemberError(400,'Invalid moderation action.');
  return transaction(async client=>{await limit(client,userId);await lock(client,'temple-review:'+kind+':'+id);
    if(action!=='dismiss') {const table=kind==='post'?'temple_posts':'temple_comments';
      const result=await client.query(`UPDATE ${table} SET hidden_at=${action==='hide'?'NOW()':'NULL'},moderation_reason=$2,updated_at=NOW(),version=version+1 WHERE id=$1 AND deleted_at IS NULL`,[id,reason]);
      if(!result.rowCount) throw new MemberError(404,'Contribution not available.');
      await client.query('INSERT INTO temple_moderation_events(id,moderator_user_id,target_kind,target_id,action,reason) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),userId,kind,id,action,reason]); }
    await client.query("UPDATE temple_reports SET status='resolved' WHERE target_kind=$1 AND target_id=$2",[kind,id]);return {updated:true}; });
}
