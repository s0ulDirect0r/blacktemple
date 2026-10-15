import Feed from '@/components/temple/Feed';
import Image from 'next/image';
import { requireMemberSession } from '@/lib/membership/auth';
import { ownProfile } from '@/lib/temple/store';
import styles from '@/components/membership/membership.module.css';
import ui from '@/components/temple/arrival.module.css';
export const metadata={title:'Shared Temple'};
export default async function FeedPage({searchParams}:{searchParams:Promise<{arrival?:string}>}){
  const arrived=(await searchParams).arrival==='1';
  const profile=arrived?await ownProfile((await requireMemberSession()).user.id):null;
  return <>{profile&&<section className={ui.greeting} aria-label="Your Temple welcome">{profile.avatar_id&&<Image unoptimized className={ui.portrait} src={'/api/temple/media/'+profile.avatar_id} width={80} height={80} alt="Your Temple portrait" />}<div><p className={styles.eyebrow}>Welcome inside</p><h2>{profile.name}, you have a place here.</h2><p className={styles.prose}>Bring something unfinished, or simply take a look around.</p></div></section>}<Feed /></>;
}
