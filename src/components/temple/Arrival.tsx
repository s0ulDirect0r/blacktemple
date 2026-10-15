'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MAX_AVATAR_BYTES, suggestedAlias } from '@/lib/temple/arrival';
import type { Identity } from './api';
import styles from '@/components/membership/membership.module.css';
import ui from './arrival.module.css';

export default function Arrival() {
  const router = useRouter();
  const [name, setName] = useState(''), [alias, setAlias] = useState(''), [customAlias, setCustomAlias] = useState(false);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [entered, setEntered] = useState<Identity | null>(null);
  const input = useRef<HTMLInputElement>(null), mediaId = useRef<string | null>(null), submitting = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function chooseFile(next: File | null) {
    setError('');
    if (next && (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > MAX_AVATAR_BYTES)) {
      setError('Choose a still JPG, PNG or WebP picture under 3 MiB.'); if (input.current) input.current.value = ''; return;
    }
    setFile(next); setPreview(''); mediaId.current = null;
    if (!next && input.current) input.current.value = '';
  }
  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    const data = new FormData(); data.set('name', name); data.set('alias', alias);
    if (file) { mediaId.current ??= crypto.randomUUID(); data.set('file', file); data.set('mediaId', mediaId.current); data.set('alt', alt.trim() || `Portrait chosen by ${name.trim()}`); }
    try {
      const response = await fetch('/api/temple/arrival', { method: 'POST', credentials: 'same-origin', body: data, signal: AbortSignal.timeout(60000) });
      if (response.status === 401) { router.replace('/login?next=' + encodeURIComponent('/membership/welcome')); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your identity could not be saved. Please retry.');
      setEntered(result.profile);
      // A brief threshold opening; reduced-motion users enter immediately. The link stays usable.
      timer.current = setTimeout(() => router.replace('/members/feed?arrival=1'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
    } catch (failure) {
      setError(failure instanceof Error && !['TimeoutError', 'TypeError'].includes(failure.name) ? failure.message : 'Connection interrupted. Your name and picture are kept here. Retry to finish the same identity.');
    } finally { submitting.current = false; setBusy(false); }
  }
  if (entered) return <section className={ui.entered} aria-label="Your Temple identity is ready"><div className={`${ui.door} ${ui.openDoor}`} aria-hidden="true" />
    <p className={styles.eyebrow}>Welcome inside</p><h1 className={styles.title}>{entered.name}</h1>
    <p role="status">Your identity is ready. Opening the shared Temple…</p><Link className={styles.button} href="/members/feed?arrival=1">Enter the shared Temple ↗</Link>
  </section>;
  return <section className={ui.identity} aria-label="Choose your Temple identity">
    <p className={styles.eyebrow}>The threshold</p><h1 className={styles.title}>Who will you<br />become here?</h1>
    <p className={styles.prose}>You have a place in the Temple.<br />Choose the name you’ll carry inside.</p>
    <form className={`${styles.form} ${ui.form}`} onSubmit={enter} aria-busy={busy}>
      <fieldset className={ui.fields} disabled={busy}><legend className={ui.srOnly}>Your Temple identity</legend>
        <label>Temple name<input autoComplete="nickname" required minLength={2} maxLength={80} value={name} onChange={e => { setName(e.target.value); if (!customAlias) setAlias(suggestedAlias(e.target.value)); }} placeholder="A name of your choosing" /></label>
        <label className={ui.alias}>Temple alias<input required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_-]{2,29}" value={alias} onChange={e => { setCustomAlias(true); setAlias(e.target.value.toLowerCase()); }} aria-describedby="arrival-alias-help" /><span id="arrival-alias-help" className={styles.note}>Your unique @alias. Suggested from your name; change it if you like.</span></label>
        <div className={ui.portraitRow}><div className={ui.portrait}>{preview ? <Image unoptimized src={preview} width={80} height={80} alt="Your selected profile picture" /> : <span aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || '?'}</span>}</div>
          <div><label htmlFor="arrival-picture">Avatar / profile picture <span className={styles.note}>(optional)</span></label><input ref={input} id="arrival-picture" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => chooseFile(e.target.files?.[0] ?? null)} className={ui.fileInput} />
            <div className={ui.pictureActions}><button type="button" className={styles.secondary} onClick={() => input.current?.click()}>Choose a picture</button>{file && <button type="button" className={styles.secondary} onClick={() => chooseFile(null)}>Remove picture</button>}</div>
            <p className={styles.note}>A photo, artwork, or symbol. Still JPG, PNG or WebP · under 3 MiB.</p></div>
        </div>
        {file && <label>Picture description (optional)<input value={alt} maxLength={500} onChange={e => setAlt(e.target.value)} placeholder="e.g. A silver moth on a black background" /></label>}
        <button className={styles.button} disabled={busy}>{busy ? 'Saving your identity & picture…' : 'Take this name & enter ↗'}</button>
      </fieldset>
      {error && <div role="alert"><p className={styles.error}>{error}</p><p className={styles.note}>Your selection is kept. Retry, choose another alias, or <Link className={styles.textLink} href="/members/identity">open Identity &amp; export</Link> if you already have an identity.</p></div>}
    </form>
    {!busy && <Link className={`${styles.textLink} ${ui.skip}`} href="/members/feed">Enter quietly. Choose a name later.</Link>}
    <p className={styles.note}>This is how fellow members will know you. Your email and billing name aren’t shown in the shared room. Your name and picture can change anytime.</p>
  </section>;
}
