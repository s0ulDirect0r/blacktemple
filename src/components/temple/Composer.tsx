'use client';
import { useRef,useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ImageUpload from './ImageUpload';
import { api,type Contribution,type Media } from './api';
import styles from '@/components/membership/membership.module.css';
import ui from './temple.module.css';

export default function Composer({initial,offering=false,onSaved,onCancel}:{initial?:Contribution;offering?:boolean;onSaved:(id:string)=>void;onCancel?:()=>void}) {
  const [body,setBody]=useState(initial?.body??''),[link,setLink]=useState(initial?.link??''),[media,setMedia]=useState<Media[]>(initial?.media??[]),[isOffering,setOffering]=useState(initial?.offering??offering),[preview,setPreview]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const requestId=useRef<string|null>(null),sending=useRef(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setError('');requestId.current??=crypto.randomUUID();
    try{const result=await api<{id:string}>('feed'+(initial?'/'+initial.id:''),initial?'PATCH':'POST',{id:requestId.current,body,link,mediaIds:media.map(m=>m.id),offering:isOffering,version:initial?.version});onSaved(result.id);}
    catch(e){setError(e instanceof Error?e.message:'Your offering was not confirmed. Your draft is kept; retry.');}
    finally{sending.current=false;setBusy(false);}
  }
  return <form id={initial?undefined:'offering-composer'} className={`${styles.form} ${ui.composer}`} onSubmit={submit}>
    <h3>{initial?'Edit your contribution':'What did you create today?'}</h3><p className={styles.note}>Members-only. A poem, sketch, idea or unfinished fragment is enough. There is no daily obligation.</p>
    <label>Your offering<textarea disabled={busy} value={body} maxLength={12000} rows={6} onChange={e=>setBody(e.target.value)} placeholder="Leave a little of your world here…" /></label>
    <label>Link (optional)<input disabled={busy} type="url" value={link} maxLength={2048} placeholder="https://" onChange={e=>setLink(e.target.value)} /></label>
    {media.length>0&&<div className={ui.images}>{media.map(m=><figure key={m.id}><Image unoptimized src={'/api/temple/media/'+m.id} alt={m.alt} width={m.width} height={m.height} /><figcaption>{m.alt}</figcaption><button type="button" className={styles.secondary} onClick={()=>setMedia(items=>items.filter(item=>item.id!==m.id))}>Remove image</button></figure>)}</div>}
    {media.length<4&&<ImageUpload disabled={busy} onUploaded={m=>setMedia(items=>[...items,m])} />}
    <label className={styles.consent}><input disabled={busy} type="checkbox" checked={isOffering} onChange={e=>setOffering(e.target.checked)} />Feed the Unknown Machine with this offering</label>
    <p className={styles.note}>This adds one light to today&apos;s collective signal. No points, streaks or rewards.</p>
    <div className={styles.actions}><button className={styles.button} disabled={busy}>{busy?'Saving…':initial?'Save changes':'Place your offering ↗'}</button><button type="button" className={styles.secondary} onClick={()=>setPreview(v=>!v)} aria-expanded={preview}>Preview</button>{onCancel&&<button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>}</div>
    {preview&&<section className={ui.preview} aria-label="Offering preview"><p className={ui.body}>{body||'Your images or link carry this offering.'}</p>{link&&<p className={ui.link}>{link}</p>}<p className={styles.note}>Images above will accompany it. Visibility: members-only.</p></section>}
    {error&&<p className={styles.error} role="alert">{error} <Link className={styles.textLink} href="/members/identity">Identity &amp; export</Link></p>}
    <p className={styles.note}>Drafts stay in this page while it is open. Unattached uploads can be removed in Identity &amp; export.</p>
  </form>;
}
