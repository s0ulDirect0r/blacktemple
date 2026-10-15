'use client';
import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { AVATAR_OUTPUT_SIZE, MAX_AVATAR_SOURCE_BYTES, avatarCrop, avatarImageHeader, clamp } from '@/lib/temple/avatar-crop';
import styles from '@/components/membership/membership.module.css';
import ui from './avatar-crop.module.css';

type Source = { image: HTMLImageElement; url: string; file: File; width: number; height: number };
type Props = { value: File | null; onChange: (file: File | null) => void; onEditingChange: (editing: boolean) => void; existingSrc?: string | null; initial?: string; disabled?: boolean; id?: string; previewAlt?: string };

export default function AvatarPicker({ value, onChange, onEditingChange, existingSrc, initial = '?', disabled = false, id, previewAlt = 'Your selected profile picture' }: Props) {
  const uniqueId = useId(), inputId = id ?? uniqueId + '-picture', helpId = uniqueId + '-help';
  const input = useRef<HTMLInputElement>(null), viewport = useRef<HTMLDivElement>(null), generation = useRef(0), applying = useRef(false);
  const committed = useRef<{source:Source;zoom:number;horizontal:number;vertical:number}|null>(null), sourceUrls=useRef(new Set<string>());
  const drag = useRef<{ id: number; x: number; y: number; horizontal: number; vertical: number } | null>(null);
  const [source, setSource] = useState<Source | null>(null), [preview, setPreview] = useState('');
  const [editing, setEditing] = useState(false), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [zoom, setZoom] = useState(1), [horizontal, setHorizontal] = useState(50), [vertical, setVertical] = useState(50);
  useEffect(() => {
    if (!value) return;
    const url = URL.createObjectURL(value); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  useEffect(() => () => { if (source && committed.current?.source.url!==source.url) {URL.revokeObjectURL(source.url);sourceUrls.current.delete(source.url);} }, [source]);
  useEffect(() => {const urls=sourceUrls.current, requests=generation;return () => { requests.current++;for(const url of urls)URL.revokeObjectURL(url);urls.clear(); };}, []);
  function reset() { setZoom(1); setHorizontal(50); setVertical(50); }
  function cancel() { generation.current++;setSource(committed.current?.source??null);if(committed.current){setZoom(committed.current.zoom);setHorizontal(committed.current.horizontal);setVertical(committed.current.vertical);}setLoading(false); setEditing(false); setError(''); onEditingChange(false); if (input.current) input.current.value = ''; }
  async function choose(file: File | null) {
    if (!file) return;
    const request = ++generation.current; setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_AVATAR_SOURCE_BYTES) {
      setError('Choose a JPG, PNG or WebP image under 20 MiB.'); if (input.current) input.current.value = ''; return;
    }
    setLoading(true); onEditingChange(true);
    const url = URL.createObjectURL(file);
    sourceUrls.current.add(url);
    try {
      if (!avatarImageHeader(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) throw new Error('This picture could not be read. Choose a JPG, PNG or WebP image.');
      const image = new window.Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('Choose a picture no larger than 24 megapixels.');
      if (request !== generation.current) { URL.revokeObjectURL(url);sourceUrls.current.delete(url); return; }
      setSource({ image, url, file, width: image.naturalWidth, height: image.naturalHeight }); reset(); setEditing(true); setLoading(false);
    } catch (failure) {
      URL.revokeObjectURL(url);
      sourceUrls.current.delete(url);
      if (request !== generation.current) return;
      setError(failure instanceof Error && failure.name === 'Error' ? failure.message : 'This picture could not be read. Try another JPG, PNG or WebP.');
      setLoading(false); onEditingChange(editing); if (input.current) input.current.value = '';
    }
  }
  const crop = source ? avatarCrop(source.width, source.height, zoom, horizontal, vertical) : null;
  async function apply() {
    if (!source || !crop || applying.current || disabled) return;
    const request=generation.current; applying.current = true; setSaving(true); setError('');
    try {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = AVATAR_OUTPUT_SIZE;
      const context = canvas.getContext('2d'); if (!context) throw new Error('This browser could not prepare your crop. Try another browser.');
      context.imageSmoothingQuality = 'high';
      context.drawImage(source.image, crop.x, crop.y, crop.side, crop.side, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Your crop could not be prepared. Please retry.')), 'image/png'));
      if(request!==generation.current)return;
      if(committed.current&&committed.current.source.url!==source.url){URL.revokeObjectURL(committed.current.source.url);sourceUrls.current.delete(committed.current.source.url);}
      committed.current={source,zoom,horizontal,vertical};
      onChange(new File([blob], 'temple-avatar.png', { type: 'image/png' }));
      setEditing(false); onEditingChange(false); if (input.current) input.current.value = '';
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your crop could not be prepared. Retry when ready.'); }
    finally { applying.current = false; setSaving(false); }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || saving || !source || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal, vertical };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const started = drag.current;
    if (!started || started.id !== event.pointerId || !source || !crop || disabled || saving) return;
    const size = event.currentTarget.clientWidth, scale = size / crop.side;
    const travelX = source.width * scale - size, travelY = source.height * scale - size;
    setHorizontal(travelX > 0 ? clamp(started.horizontal - (event.clientX - started.x) / travelX * 100, 0, 100) : 50);
    setVertical(travelY > 0 ? clamp(started.vertical - (event.clientY - started.y) / travelY * 100, 0, 100) : 50);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || saving) return;
    const step = event.shiftKey ? 10 : 2;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') setHorizontal(value => clamp(value + step, 0, 100));
      if (event.key === 'ArrowRight') setHorizontal(value => clamp(value - step, 0, 100));
      if (event.key === 'ArrowUp') setVertical(value => clamp(value + step, 0, 100));
      if (event.key === 'ArrowDown') setVertical(value => clamp(value - step, 0, 100));
    }
  }
  const shownPreview = value ? preview : existingSrc;
  return <fieldset className={ui.picker} disabled={disabled || saving}><legend>Avatar / profile picture <span className={styles.note}>(optional)</span></legend>
    <div className={ui.selection}><div className={ui.thumbnail}>{shownPreview ? <Image unoptimized src={shownPreview} width={80} height={80} alt={previewAlt} /> : <span aria-hidden="true">{initial || '?'}</span>}</div>
      <div><label htmlFor={inputId} className={ui.srOnly}>Choose avatar image</label><input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className={ui.fileInput} onChange={e => void choose(e.target.files?.[0] ?? null)} />
        <div className={ui.actions}><button type="button" className={styles.secondary} disabled={loading} onClick={() => input.current?.click()}>Choose a picture</button>{source && (value||existingSrc) && !editing && <button type="button" className={styles.secondary} onClick={() => { setEditing(true); onEditingChange(true); }}>Adjust crop</button>}
          {(value || existingSrc) && !editing && <button type="button" className={styles.secondary} onClick={() => { committed.current=null;setPreview(''); setSource(null); onChange(null); }}>Remove picture</button>}</div>
        <p className={styles.note}>A photo, artwork, or symbol. JPG, PNG or WebP · up to 20 MiB. Only your cropped copy is uploaded.</p>
      </div>
    </div>
    {loading && <p role="status" className={styles.note}>Opening your picture… <button type="button" className={styles.secondary} onClick={cancel}>Cancel</button></p>}
    {editing && source && crop && <section className={ui.editor} aria-label="Crop your avatar">
      <p id={helpId} className={styles.note}>Drag your picture or use the arrow keys and sliders. The circle shows how your avatar will look.</p>
      <div ref={viewport} className={ui.viewport} role="group" aria-label="Avatar crop preview" aria-describedby={helpId} tabIndex={0} onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <Image unoptimized draggable={false} className={ui.source} src={source.url} width={source.width} height={source.height} alt="Picture being framed for your avatar" style={{width:`${source.width / crop.side * 100}%`,height:`${source.height / crop.side * 100}%`,left:`${-crop.x / crop.side * 100}%`,top:`${-crop.y / crop.side * 100}%`}} />
        <div className={ui.circle} aria-hidden="true" />
      </div>
      <label className={ui.slider}>Zoom <output>{zoom.toFixed(2)}×</output><input aria-label="Zoom" aria-valuetext={`${zoom.toFixed(2)} times`} type="range" min="1" max="4" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
      <div className={ui.positions}><label className={ui.slider}>Horizontal position<input type="range" min="0" max="100" value={horizontal} disabled={source.width <= crop.side} onChange={e => setHorizontal(Number(e.target.value))} /></label><label className={ui.slider}>Vertical position<input type="range" min="0" max="100" value={vertical} disabled={source.height <= crop.side} onChange={e => setVertical(Number(e.target.value))} /></label></div>
      <div className={ui.actions}><button type="button" className={styles.button} onClick={() => void apply()}>{saving ? 'Preparing crop…' : 'Use this crop'}</button><button type="button" className={styles.secondary} onClick={reset}>Reset framing</button><button type="button" className={styles.secondary} onClick={cancel}>Cancel crop</button></div>
    </section>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </fieldset>;
}
