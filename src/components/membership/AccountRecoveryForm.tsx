'use client';
import Link from 'next/link';
import { useState } from 'react';
import { memberAuthClient } from '@/lib/membership/auth-client';
import styles from './membership.module.css';

export default function AccountRecoveryForm({ mode, token, invalid = false }: { mode: 'recover'|'verify'|'reset'; token?: string; invalid?: boolean }) {
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [error,setError] = useState(''), [complete,setComplete] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      if (mode === 'reset') {
        const password = String(form.get('password') ?? '');
        if (password !== form.get('confirm')) {setError('The passwords do not match.');return;}
        const result = await memberAuthClient.resetPassword({token,newPassword:password});
        if (result.error) {setError('This link is invalid, expired, or already used. Request a new password reset link.');return;}
        window.history.replaceState(null,'','/login/reset');
        setComplete(true); setMessage('Your password has been reset. Sign in with your new password.');
      } else {
        const email = String(form.get('email') ?? '').trim();
        const result = mode === 'recover'
          ? await memberAuthClient.requestPasswordReset({email,redirectTo:'/login/reset'})
          : await memberAuthClient.sendVerificationEmail({email,callbackURL:'/login?verified=1'});
        if (result.error) {setError(result.error.status===429 ? 'Too many requests. Please wait before trying again.' : 'The account service is temporarily unavailable. Please try again.');return;}
        setMessage(mode === 'recover' ? 'If an account exists for this email, a password reset link will be sent. Check your inbox. Requests are limited; wait at least a minute before requesting another link.' : 'If this email belongs to an account that needs verification, a verification link will be sent. Check your inbox. Requests are limited; wait at least a minute before requesting another link.');
      }
    } catch {setError('The account service could not be reached. Please try again.');}
    finally {setBusy(false);}
  }
  const unavailable = mode==='reset' && (invalid || !token);
  return <>
    {unavailable && <p role="alert" className={styles.error}>This link is invalid, expired, or already used. <Link className={styles.textLink} href="/login/recover">Request a new password reset link</Link>.</p>}
    {!unavailable && !complete && <form className={styles.form} onSubmit={submit}>
      {mode==='reset' ? <>
        <label>New password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
        <label>Confirm new password<input name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
        <p className={styles.note}>Use at least 12 characters. Resetting your password signs out your existing sessions.</p>
      </> : <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>}
      <button type="submit" className={styles.button} disabled={busy}>{busy?'Please wait…':mode==='reset'?'Reset password':mode==='verify'?'Request verification link':'Request reset link'}</button>
    </form>}
    {message && <p role="status" className={styles.success} style={{marginTop:24}}>{message}</p>}
    {error && <p role="alert" className={styles.error} style={{marginTop:24}}>{error}</p>}
    <p className={styles.note} style={{marginTop:26}}><Link className={styles.textLink} href="/login">Back to sign in</Link>{mode==='reset' && !complete && <> · <Link className={styles.textLink} href="/login/recover">Request a new link</Link></>}</p>
  </>;
}
