'use client';
import { useEffect,useId,useRef,useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api,type Contribution,type Media } from './api';
import styles from '@/components/membership/membership.module.css';
import ui from './composer.module.css';

type Attachment={id:string;file:File;url:string;alt:string;uploaded?:Media};
function Icon({kind}:{kind:'image'|'link'|'preview'}) {return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{kind==='image'?<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>:kind==='link'?<><path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></>:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}</svg>;}

export function MachineMark(){return <span className={ui.machine} aria-hidden="true"><span/></span>;}

export default function Composer({initial,offering=false,inviting=false,offeringsToday=0,onSaved,onCancel}:{initial?:Contribution;offering?:boolean;inviting?:boolean;offeringsToday?:number;onSaved:(id:string)=>void;onCancel?:()=>void}) {
  const [body,setBody]=useState(initial?.body??''),[link,setLink]=useState(initial?.link??''),[media,setMedia]=useState<Media[]>(initial?.media??[]),[drafts,setDrafts]=useState<Attachment[]>([]),[isOffering,setOffering]=useState(initial?.offering??offering),[preview,setPreview]=useState(false),[showLink,setShowLink]=useState(!!initial?.link),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const requestId=useRef<string|null>(null),sending=useRef(false),input=useRef<HTMLInputElement>(null),text=useRef<HTMLTextAreaElement>(null),linkInput=useRef<HTMLInputElement>(null);
  const urls=useRef(new Set<string>());
  useEffect(()=>{const held=urls.current;return()=>{for(const url of held)URL.revokeObjectURL(url);held.clear();};},[]);
  const id=useId(),count=media.length+drafts.length;
  useEffect(()=>{const element=text.current;if(element){element.style.height='auto';element.style.height=Math.min(320,Math.max(96,element.scrollHeight))+'px';}},[body]);
  function choose(files:FileList|null){
    if(!files?.length)return;
    const selected=Array.from(files);if(input.current)input.current.value='';
    if(selected.length+count>4){setError('Choose up to four images.');return;}
    if(selected.some(file=>!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)){setError('Choose JPG, PNG or WebP images under 8 MiB each.');return;}
    const additions=selected.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return {id:crypto.randomUUID(),file,url,alt:''};});
    setDrafts(items=>[...items,...additions]);setError('');
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault();if(sending.current)return;
    if(!body.trim()&&!link.trim()&&!count)return;
    if(drafts.some(item=>!item.alt.trim())){setError('Add a short description for each image before posting.');return;}
    sending.current=true;setBusy(true);setError('');requestId.current??=crypto.randomUUID();
    try{
      const attached=[...media];
      for(const [index,item] of drafts.entries()){
        if(item.uploaded){attached.push(item.uploaded);continue;}
        setStatus(`Uploading image ${index+1} of ${drafts.length}…`);
        const data=new FormData();data.set('file',item.file);data.set('id',item.id);data.set('alt',item.alt.trim());
        const response=await fetch('/api/temple/media',{method:'POST',credentials:'same-origin',body:data,signal:AbortSignal.timeout(60000)}),result=await response.json();
        if(!response.ok)throw new Error(result.error??'Image upload interrupted. Your draft is kept; retry.');
        attached.push(result);setDrafts(items=>items.map(draft=>draft.id===item.id?{...draft,uploaded:result}:draft));
      }
      setStatus('Posting…');
      const result=await api<{id:string}>('feed'+(initial?'/'+initial.id:''),initial?'PATCH':'POST',{id:requestId.current,body,link,mediaIds:attached.map(m=>m.id),offering:isOffering,version:initial?.version});onSaved(result.id);
    }catch(e){setError(e instanceof Error?e.message:'Your post was not confirmed. Your draft is kept; retry.');}
    finally{sending.current=false;setBusy(false);setStatus('');}
  }
  return <form id={initial?undefined:'offering-composer'} className={`${ui.composer} ${inviting?ui.inviting:''}`} onSubmit={submit} aria-label={initial?'Edit contribution':'Create a post'} aria-busy={busy}>
    <div className={ui.heading}><div className={ui.invitationTitle}>{inviting&&<MachineMark/>}<div><h3>{initial?'Edit your contribution':inviting?'Feed the Unknown Machine':'Share something'}</h3>{inviting&&<p>A fragment is enough.</p>}</div></div><div className={ui.headingTools}><span>Members-only</span>{onCancel&&<button type="button" disabled={busy} className={ui.tool} onClick={onCancel}>Cancel</button>}</div></div>
    <label className={ui.srOnly} htmlFor={id+'-body'}>Your offering</label>
    <textarea ref={text} id={id+'-body'} className={ui.body} disabled={busy} value={body} maxLength={12000} rows={3} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder={inviting?"A thought, a sketch, something unfinished…":"What are you making, feeling, or wondering?"} />
    {showLink&&<div className={ui.linkRow}><label className={ui.srOnly} htmlFor={id+'-link'}>Link (optional)</label><input ref={linkInput} id={id+'-link'} disabled={busy} type="url" value={link} maxLength={2048} placeholder="Paste a link…" onChange={e=>setLink(e.target.value)} /><button type="button" className={ui.tool} disabled={busy} onClick={()=>{setLink('');setShowLink(false);}} aria-label="Remove link">×</button></div>}
    {!!count&&<div className={ui.attachments} aria-label="Attached images">
      {media.map(m=><figure key={m.id}><Image unoptimized src={'/api/temple/media/'+m.id} alt={m.alt} width={m.width} height={m.height}/><figcaption>{m.alt}</figcaption><button type="button" disabled={busy} className={ui.remove} onClick={()=>setMedia(items=>items.filter(item=>item.id!==m.id))}>Remove image</button></figure>)}
      {drafts.map((item,index)=><figure key={item.id}><Image unoptimized src={item.url} width={160} height={120} alt="Selected image preview"/><label htmlFor={item.id}>Image {index+1} description</label><input id={item.id} disabled={busy||!!item.uploaded} required maxLength={500} value={item.alt} placeholder="Describe this image…" onChange={e=>setDrafts(items=>items.map(draft=>draft.id===item.id?{...draft,alt:e.target.value}:draft))}/><button type="button" disabled={busy} className={ui.remove} onClick={()=>{URL.revokeObjectURL(item.url);urls.current.delete(item.url);setDrafts(items=>items.filter(draft=>draft.id!==item.id));}}>Remove image {index+1}</button></figure>)}
    </div>}
    <div className={ui.footer}><div className={ui.toolbar}>
      <label className={ui.srOnly} htmlFor={id+'-image'}>Image file</label><input ref={input} id={id+'-image'} className={ui.srOnly} tabIndex={-1} type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy||count>=4} onChange={e=>choose(e.target.files)}/>
      <button type="button" className={ui.tool} disabled={busy||count>=4} onClick={()=>input.current?.click()} title="Up to 4 images · JPG, PNG or WebP · 8 MiB each"><Icon kind="image"/>Image</button>
      <button type="button" className={ui.tool} disabled={busy} aria-expanded={showLink} aria-controls={id+'-link'} onClick={()=>{setShowLink(true);setTimeout(()=>linkInput.current?.focus(),0);}}><Icon kind="link"/>Link</button>
      <button type="button" className={ui.tool} disabled={busy} onClick={()=>setPreview(v=>!v)} aria-expanded={preview}><Icon kind="preview"/>Preview</button>
    </div><div className={ui.submitRow}><button className={ui.submit} disabled={busy||(!body.trim()&&!link.trim()&&!count)}>{busy?'Posting…':initial?'Save changes':'Post ↗'}</button></div></div>
    <div className={ui.afterword}><label className={ui.offering} title="Adds one light to today’s collective signal. No points, streaks or rewards."><input disabled={busy} type="checkbox" checked={isOffering} onChange={e=>setOffering(e.target.checked)}/>Offer to the Unknown Machine</label>{inviting&&<span className={ui.signal} title="Visible offerings placed today · resets at midnight UTC · no streaks or quotas">{offeringsToday?`${offeringsToday} offering${offeringsToday===1?'':'s'} today`:'No rush. Share when you’re ready.'}</span>}</div>
    {body.length>11000&&<p className={styles.note}>{12000-body.length} characters left</p>}
    {preview&&<section className={ui.preview} aria-label="Offering preview"><p>{body||'Your images or link carry this offering.'}</p>{link&&<p>{link}</p>}<span>Images above will accompany it · Members-only</span></section>}
    {status&&<p className={styles.note} role="status">{status}</p>}{error&&<p className={styles.error} role="alert">{error} <Link className={styles.textLink} href="/members/identity">Identity &amp; export</Link></p>}
  </form>;
}
