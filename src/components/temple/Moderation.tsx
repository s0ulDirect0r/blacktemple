'use client';
import { useEffect,useState } from 'react';
import { api } from './api';
import Image from 'next/image';
import type { Media } from './api';
import styles from '@/components/membership/membership.module.css';
import ui from './temple.module.css';
type Report={id:string;target_kind:string;target_id:string;reason:string;status:string;body:string|null;link:string|null;media:Media[];hidden_at:string|null;deleted_at:string|null;content_version:number|null;current_version:number|null;moderation_reason:string|null};
export default function Moderation(){
  const [reports,setReports]=useState<Report[]|null>(null),[error,setError]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function load(){try{setReports((await api<{reports:Report[]}>('moderation')).reports);setError('');}catch(e){setReports(null);setError((e as Error).message);}}
  useEffect(()=>{void load();},[]);
  async function act(report:Report,action:string){setBusy(true);try{await api('moderation','POST',{kind:report.target_kind,targetId:report.target_id,action,reason});setNotice('Moderation saved. The affected author sees the reason on their contribution.');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className={ui.room}>
    <p className={styles.eyebrow}>Private operator room</p>
    <h2 className={styles.lead}>Care for the shared room</h2>
    <p className={styles.prose}>Review reports, remove contributions from the room, or restore them. Removal preserves the author&apos;s private export. Billing and membership controls are separate.</p>
    <label className={styles.form} style={{marginTop:24}}>Reason shown to the author<textarea value={reason} minLength={5} maxLength={1000} rows={3} onChange={e=>setReason(e.target.value)} /></label>
    {!reports&&!error&&<p role="status">Opening reports…</p>}
    {error&&<p role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={load}>Retry</button></p>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {reports?.length===0&&<p className={styles.empty}>No reports need review.</p>}
    {reports?.map(r=><article key={r.id} className={ui.post}>
      <p className={styles.eyebrow}>{r.target_kind} · {r.status}</p>
      {r.deleted_at?<p className={styles.note}>Contribution was deleted.</p>:<>
        {r.body&&<p className={ui.body}>{r.body}</p>}
        {r.link&&<p className={ui.link}><a className={styles.textLink} href={r.link} target="_blank" rel="noopener noreferrer">{r.link} ↗</a></p>}
        {!!r.media.length&&<div className={ui.images}>{r.media.map(m=><figure key={m.id}><Image unoptimized src={'/api/temple/moderation/media/'+m.id} width={m.width} height={m.height} alt={m.alt} /><figcaption>{m.alt}</figcaption></figure>)}</div>}
        {r.body===null&&<p className={styles.note}>Contribution is unavailable.</p>}
      </>}
      <p className={styles.prose}>Report: {r.reason}</p>
      <p className={styles.note}>Record {r.target_id} · Reported version {r.content_version??'not recorded'} · Current version {r.current_version??'unavailable'}</p>
      {r.content_version!==null&&r.current_version!==r.content_version&&<p className={styles.note}>The record changed since this report. Showing its current state.</p>}
      {r.moderation_reason&&<p className={styles.note}>Latest reason shown to the author: {r.moderation_reason}</p>}
      <div className={ui.tools}><button disabled={busy||reason.trim().length<5||!!r.deleted_at||r.body===null} className={styles.secondary} onClick={()=>act(r,r.hidden_at?'restore':'hide')}>{r.hidden_at?'Restore contribution':'Remove from shared room'}</button>{r.status==='open'&&<button disabled={busy||reason.trim().length<5} className={styles.secondary} onClick={()=>act(r,'dismiss')}>Dismiss report</button>}</div>
    </article>)}
  </div>;
}
