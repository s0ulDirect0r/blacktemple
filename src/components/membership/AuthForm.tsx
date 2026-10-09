'use client';
import Link from 'next/link';
import { useState } from 'react';
import { memberAuthClient } from '@/lib/membership/auth-client';
import { safeReturnPath, MEMBERSHIP_SUPPORT_EMAIL } from '@/lib/membership/config';
import styles from './membership.module.css';

export default function AuthForm({ next, configured }: { next: string; configured: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim(), password = String(form.get('password') ?? '');
    try {
      const result = mode === 'signup'
        ? await memberAuthClient.signUp.email({ name: String(form.get('name') ?? '').trim(), email, password })
        : await memberAuthClient.signIn.email({ email, password });
      if (result.error) { setError(result.error.status === 429 ? 'Too many requests. Please wait before trying again.' : mode === 'login' ? 'That email and password could not sign you in. Check your details, verify your email, or request a password reset.' : 'The account could not be created. Check your details and try again.'); return; }
      if (mode === 'signup') { setMessage('If this email can be registered, a verification link will be sent. Verify your email, then return here to sign in. If you already have an account, sign in or reset your password.'); return; }
      window.location.replace(safeReturnPath(next));
    } catch { setError('Sign-in could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }
  return <>
    <div className={styles.actions} style={{ marginBottom: 28 }}>
      <button type="button" className={mode === 'login' ? styles.button : styles.secondary} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
      <button type="button" className={mode === 'signup' ? styles.button : styles.secondary} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
    </div>
    <form className={styles.form} onSubmit={submit}>
      {mode === 'signup' && <label>Your name<input name="name" required maxLength={100} autoComplete="name" /></label>}
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
      {mode === 'signup' && <p className={styles.note}>Use at least 12 characters. Your account is free; choosing a membership comes next.</p>}
      {!configured && <p className={styles.error}>Account sign-in is not configured yet.</p>}
      {message && <p role="status" className={styles.success}>{message}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" className={styles.button} disabled={busy || !configured}>{busy ? 'Opening the door…' : mode === 'signup' ? 'Create my account ↗' : 'Enter ↗'}</button>
    </form>
    <p className={styles.note} style={{ marginTop: 26 }}><Link className={styles.textLink} href="/login/recover">Reset password</Link> · <Link className={styles.textLink} href="/login/verify">Resend verification</Link>. Need account help? <a className={styles.textLink} href={`mailto:${MEMBERSHIP_SUPPORT_EMAIL}`}>Write to me</a>.</p>
    <p className={styles.note} style={{ marginTop: 18 }}><Link className={styles.textLink} href="/membership">Explore memberships</Link> · <Link className={styles.textLink} href="/privacy">Privacy</Link></p>
  </>;
}
