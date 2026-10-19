import { Readable } from 'node:stream';
import { transaction, lock } from '@/lib/membership/database';
import { ownProfile } from './store';
import { zip } from './zip';
import { filename } from './validation';

export async function ownWork(userId:string) {
  return transaction(async client=>{
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await lock(client,'temple-author:'+userId);
    const profile=await ownProfile(userId,client), authorId=profile?.id??null;
    const posts=(await client.query('SELECT id,author_id,body,link,offering,version,created_at,updated_at,hidden_at,moderation_reason FROM temple_posts WHERE author_id=$1 AND deleted_at IS NULL ORDER BY created_at,id',[authorId])).rows;
    const replies=(await client.query('SELECT id,post_id,author_id,body,version,created_at,updated_at,hidden_at,moderation_reason FROM temple_comments WHERE author_id=$1 AND deleted_at IS NULL ORDER BY created_at,id',[authorId])).rows;
    const files=(await client.query('SELECT id,author_id,post_id,filename,mime,alt,sha256,width,height,created_at,bytes FROM temple_media WHERE author_id=$1 ORDER BY created_at,id',[authorId])).rows as {id:string;author_id:string;post_id:string|null;filename:string;mime:string;alt:string;sha256:string;width:number;height:number;created_at:Date;bytes:Buffer}[];
    const media=files.map(({bytes,...m})=>({...m,size:bytes.length,path:`media/${m.id}-${filename(m.filename)}`}));
    return {manifest:{schema:'blacktemple.own-work',schemaVersion:1,exportedAt:new Date().toISOString(),visibility:'private',profile,posts,replies,media},files};
  });
}
export async function exportResponse(userId:string,jsonOnly=false) {
  const {manifest,files}=await ownWork(userId);
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  if(jsonOnly) return Response.json(manifest,{headers});
  const md = [`# My Black Temple work`, `\n${manifest.profile?.name??'No Temple identity yet'}${manifest.profile ? ' (@'+manifest.profile.alias+')':''}`, '\nPrivate export. This contains only your own work. Reply parent IDs do not include another member’s contribution.',
    ...manifest.posts.map(p=>`\n## Offering ${p.id}\n\nCreated: ${new Date(p.created_at).toISOString()}\n\n${p.body}${p.link?'\n\nLink: <'+p.link+'>':''}\n\n${manifest.media.filter(m=>m.post_id===p.id).map(m=>`Image: ${m.path}\nDescription: ${m.alt}`).join('\n\n')}`),
    ...manifest.replies.map(c=>`\n## Reply ${c.id}\n\nParent contribution: ${c.post_id}\nCreated: ${new Date(c.created_at).toISOString()}\n\n${c.body}`)].join('\n');
  async function* entries() {
    yield {name:'manifest.json',bytes:Buffer.from(JSON.stringify(manifest,null,2))};
    yield {name:'my-work.md',bytes:Buffer.from(md)};
    yield {name:'README.txt',bytes:Buffer.from('Black Temple own-work export, schema version 1.\nmanifest.json is authoritative; timestamps use ISO 8601.\nOriginal images are unchanged; verify SHA-256 against each media record.\nReply parent IDs are opaque references, not copies of others’ work.\nAttribution uses your stable community ID and current chosen identity.\nDeleted work is excluded; moderated own work remains exportable.\nNo billing/auth names, email addresses, other members’ replies or reactions are included.\n')};
    for(const f of files) yield {name:`media/${f.id}-${filename(f.filename)}`,bytes:f.bytes};
  }
  return new Response(Readable.toWeb(Readable.from(zip(entries()))) as ReadableStream,{headers:{...headers,'Content-Type':'application/zip','Content-Disposition':'attachment; filename="black-temple-my-work.zip"'}});
}
