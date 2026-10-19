import AccountRecoveryForm from '@/components/membership/AccountRecoveryForm';
import styles from '@/components/membership/membership.module.css';
export const dynamic = 'force-dynamic';
export const metadata = {title:'Reset password',robots:{index:false,follow:false}};
export default function RecoverPage() {
  return <div className={styles.world}><main className={styles.authShell}><h1 className={styles.title}>Reset your password.</h1><p className={styles.prose} style={{marginBottom:30}}>Request a link to choose a new password for your account. Links expire after 15 minutes.</p><AccountRecoveryForm mode="recover" /></main></div>;
}
