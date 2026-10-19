import AccountRecoveryForm from '@/components/membership/AccountRecoveryForm';
import styles from '@/components/membership/membership.module.css';
export const dynamic = 'force-dynamic';
export const metadata = {title:'Verify email',robots:{index:false,follow:false}};
export default function VerifyPage() {
  return <div className={styles.world}><main className={styles.authShell}><h1 className={styles.title}>Verify your email.</h1><p className={styles.prose} style={{marginBottom:30}}>Confirm your email address before signing in. Verification links expire after one hour.</p><AccountRecoveryForm mode="verify" /></main></div>;
}
