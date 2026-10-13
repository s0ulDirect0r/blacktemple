// Local synthetic review only. No dotenv, providers, remote DBs or outgoing mail.
import 'next/dist/server/node-environment-baseline';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { memberAuth } from '../src/lib/membership/auth';
import { membershipDatabase } from '../src/lib/membership/database';
import { localTemplePreview } from '../src/lib/temple/preview';
import { saveProfile,ownProfile,upload,savePost } from '../src/lib/temple/store';

async function main(){
  if(!localTemplePreview()||!['127.0.0.1','localhost','[::1]'].includes(new URL(process.env.MEMBERSHIP_DATABASE_URL??'').hostname)||process.env.MEMBERSHIP_LIVE_ENABLED==='true'||process.env.MEMBERSHIP_BILLING_MODE==='live')throw new Error('Fixtures require an explicitly labeled loopback-only synthetic preview.');
  const db=membershipDatabase(),context=await memberAuth().$context;
  const password='Synthetic-Temple-Test-Only-2026!';
  for(const [key,name,active] of [['weaver','Synthetic Moon Weaver',true],['spark','Synthetic Spark Keeper',true],['moderator','Synthetic Room Keeper',true],['expired','Synthetic Quiet Patron',false]] as const){
    const email=`temple-preview-${key}@example.test`;
    let user=(await db.query<{id:string}>('SELECT id FROM member_user WHERE email=$1',[email])).rows[0];
    if(!user){user=await context.internalAdapter.createUser({name:'PRIVATE SYNTHETIC BILLING '+key,email,emailVerified:true},{method:'admin'});await context.internalAdapter.linkAccount({userId:user.id,providerId:'credential',accountId:user.id,password:await context.password.hash(password)});}
    if(!(await db.query('SELECT 1 FROM memberships WHERE user_id=$1',[user.id])).rowCount){const attempt=randomUUID();await db.query("INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at) VALUES($1,$2,'witness','fixture_price',2000,'synthetic','completed',NOW()+INTERVAL '3 months')",[attempt,user.id]);await db.query("INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end,paid_through) VALUES($1,$2,$3,'witness',$4,$5,$6,'active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '3 months',NOW()+$7::interval)",[randomUUID(),attempt,user.id,'fixture_customer_'+user.id,'fixture_subscription_'+user.id,'fixture_schedule_'+user.id,active?'1 month':'-1 day']);}
    if(!await ownProfile(user.id))await saveProfile(user.id,{name,alias:'preview-'+key,persona:'Synthetic local review account. Exploring little worlds, violet fragments and unfinished poems.'});
    if(key==='moderator')await db.query('INSERT INTO temple_moderators(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
    if(key==='weaver'&&!(await db.query("SELECT 1 FROM temple_posts p JOIN temple_profiles a ON a.id=p.author_id WHERE a.user_id=$1",[user.id])).rowCount){const mediaId=randomUUID(),bytes=await sharp({create:{width:900,height:600,channels:3,background:'#171023'}}).composite([{input:Buffer.from('<svg width="900" height="600"><circle cx="450" cy="300" r="130" fill="none" stroke="#c4b5fd" stroke-width="2"/><rect x="380" y="230" width="140" height="140" fill="none" stroke="#b9f5ff" stroke-width="2" transform="rotate(45 450 300)"/><circle cx="450" cy="300" r="8" fill="#b9f5ff"/></svg>')}]).png().toBuffer();await upload(user.id,mediaId,bytes,'synthetic-machine-study.png','Synthetic study: a violet circle holding a cyan diamond and a small light.');await savePost(user.id,{id:randomUUID(),body:'Synthetic preview · A little study of the Machine.\n\nA circle for the room.\nA diamond for the door.\nA small light for whatever comes next.',mediaIds:[mediaId],offering:true});}
  }
  console.log('Four synthetic local accounts are ready. No email, Stripe or Calendar operations performed.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Synthetic setup failed');process.exitCode=1;}).finally(()=>membershipDatabase().end());
