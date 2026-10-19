'use client';
import { useRef,useState } from 'react';
import styles from '@/components/membership/membership.module.css';
import ui from './temple.module.css';
import type { Media } from './api';

export default function ImageUpload({onUploaded,disabled=false,label='Add an image'}:{onUploaded:(media:Media)=>void;disabled?:boolean;label?:string}) {
  const [alt,setAlt]=useState(''),[file,setFile]=useState<File|null>(null),[progress,setProgress]=useState<number|null>(null),[error,setError]=useState('');
  const id=useRef<string|null>(null),input=useRef<HTMLInputElement>(null),busy=useRef(false);
  function upload() {
    if(busy.current||!file)return;
    if(file.size>8*1024*1024||!alt.trim()){setError('Choose an image under 8 MiB and describe it.');return;}
    busy.current=true;setProgress(0);setError('');id.current??=crypto.randomUUID();
    const data=new FormData();data.set('file',file);data.set('alt',alt);data.set('id',id.current);
    const request=new XMLHttpRequest();request.open('POST','/api/temple/media');request.timeout=60000;
    request.upload.onprogress=event=>{if(event.lengthComputable)setProgress(Math.round(event.loaded/event.total*100));};
    const finish=()=>{busy.current=false;setProgress(null);};
    request.onerror=request.ontimeout=()=>{finish();setError('Upload interrupted. Your selection is kept; retry when ready.');};
    request.onload=()=>{finish();let result;try{result=JSON.parse(request.responseText);}catch{setError('The upload could not be confirmed. Retry with the same image.');return;}
      if(request.status<200||request.status>=300){setError(result.error??'Upload failed. Try again.');return;}
      onUploaded(result);setFile(null);setAlt('');id.current=null;if(input.current)input.current.value='';};
    request.send(data);
  }
  return <fieldset className={ui.upload} disabled={disabled||progress!==null}><legend>{label}</legend>
    <label>Image file<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{setFile(e.target.files?.[0]??null);id.current=null;setError('');}} /></label>
    <label>Image description<input value={alt} maxLength={500} onChange={e=>setAlt(e.target.value)} placeholder="What should someone know without seeing it?" /></label>
    <p className={styles.note}>Still PNG, JPEG or WebP · 8 MiB per image. Original files stay private.</p>
    <button type="button" className={styles.secondary} disabled={!file||!alt.trim()||progress!==null} onClick={upload}>{progress===null?'Upload image':`Uploading ${progress}%`}</button>
    {progress!==null&&<p role="status">Uploading {progress}%. Keep this page open.</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
  </fieldset>;
}
