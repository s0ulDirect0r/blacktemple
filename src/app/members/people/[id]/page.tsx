import { requireMemberSession } from '@/lib/membership/auth';
import { publicProfile } from '@/lib/temple/store';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/membership/membership.module.css';
import ui from '@/components/temple/temple.module.css';
export const metadata={title:'Temple identity'};
export default async function ProfilePage({params}:{params:Promise<{id:string}>}) {
  const session=await requireMemberSession(),{id}=await params;
  const p=await publicProfile(session.user.id,id).catch(()=>null);
  if(!p)return <section className={styles.empty}><h2>This identity is not available.</h2><p className={styles.prose}>Active membership is needed to see other members&apos; chosen identities. If your membership is active, try again in a moment.</p><Link className={styles.textLink} href="/members/identity">Your own identity &amp; export</Link></section>;
  return <section className={ui.profile}><p className={styles.eyebrow}>Chosen Temple identity · Members-only</p>{p.avatar_id&&<Image unoptimized width={44} height={44} className={ui.avatar} src={'/api/temple/media/'+p.avatar_id} alt="" />}<h2 className={styles.lead}>{p.name}</h2><p className={styles.note}>@{p.alias}</p><p className={ui.body} style={{marginTop:24}}>{p.persona||'A creative persona still taking shape.'}</p><div className={styles.actions}><Link className={styles.textLink} href="/members/feed">Return to the shared room</Link></div></section>;
}
