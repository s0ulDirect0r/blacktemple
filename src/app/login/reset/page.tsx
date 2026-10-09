import AccountRecoveryForm from '@/components/membership/AccountRecoveryForm';
import styles from '@/components/membership/membership.module.css';
export const dynamic = 'force-dynamic';
export const metadata = {title:'Choose a new password',robots:{index:false,follow:false}};
export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string;error?:string}>}) {
  const params=await searchParams;
  const token=typeof params.token==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(params.token) ? params.token : undefined;
  return <div className={styles.world}><main className={styles.authShell}><h1 className={styles.title}>Choose a new password.</h1><AccountRecoveryForm mode="reset" token={token} invalid={Boolean(params.error)} /></main></div>;
}
