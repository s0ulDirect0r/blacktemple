'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import styles from './Atmosphere.module.css';

const Starfield3D = dynamic(() => import('./Starfield3D'), { ssr: false });
function allow3D() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
}
function subscribePreferences(notify: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  media.addEventListener('change', notify);
  connection?.addEventListener('change', notify);
  return () => { media.removeEventListener('change', notify); connection?.removeEventListener('change', notify); };
}

// Two painted layers, rather than one DOM element or animation per star.
function stars(seed: number, count: number) {
  let value = seed;
  const random = () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * 100);
    const y = Math.round(random() * 100);
    const alpha = (0.2 + random() * 0.4).toFixed(2);
    return `radial-gradient(circle at ${x}% ${y}%, rgba(210,220,255,${alpha}) 0 1px, transparent 1.6px)`;
  }).join(',');
}
const distantStars = stars(31, 28);
const nearStars = stars(107, 14);

export default function Atmosphere() {
  const enable3D = useSyncExternalStore(subscribePreferences, allow3D, () => false);
  const sky = useRef<HTMLDivElement>(null);
  const comet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = sky.current!;
    const cursor = comet.current!;
    const page = cursor.closest<HTMLElement>('.portfolio-page')!;
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const dots = Array.from(cursor.children) as HTMLElement[];
    let frame = 0;
    let target: HTMLElement | null = null;
    let x = 0, y = 0;
    let visible = false;
    const positions = dots.map(() => ({ x: 0, y: 0 }));
    const clearTarget = () => {
      target?.removeAttribute('data-comet-target');
      target = null;
    };
    const hide = () => {
      visible = false;
      cursor.dataset.visible = 'false';
      page.removeAttribute('data-comet-cursor');
      clearTarget();
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const tick = () => {
      frame = 0;
      if (!visible) return;
      let unsettled = false;
      positions.forEach((point, i) => {
        const leader = i === 0 ? { x, y } : positions[i - 1];
        point.x += (leader.x - point.x) * (i === 0 ? 1 : 0.35);
        point.y += (leader.y - point.y) * (i === 0 ? 1 : 0.35);
        const dx = leader.x - point.x, dy = leader.y - point.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        dots[i].style.transform = `translate3d(${point.x}px, ${point.y}px, 0) rotate(${i === 0 ? 0 : angle}deg)`;
        if (i > 0) dots[i].style.setProperty('--length', `${Math.max(3, Math.hypot(dx, dy) + 4)}px`);
        if (Math.abs(point.x - x) + Math.abs(point.y - y) > 0.15) unsettled = true;
      });
      // No permanent render loop: stop once the tail catches up.
      if (unsettled) frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || document.querySelector('dialog[open]') || document.getSelection()?.type === 'Range') { hide(); return; }
      x = event.clientX; y = event.clientY;
      if (!visible) positions.forEach(point => { point.x = x; point.y = y; });
      visible = true;
      cursor.dataset.visible = 'true';
      page.setAttribute('data-comet-cursor', 'true');
      const next = event.target instanceof Element ? event.target.closest<HTMLElement>('a, button, summary, h1, h2, h3') : null;
      if (target !== next) {
        clearTarget(); target = next;
        target?.setAttribute('data-comet-target', 'true');
      }
      cursor.dataset.active = String(Boolean(target));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const update = () => {
      document.removeEventListener('pointermove', move);
      hide();
      field.dataset.paused = String(document.hidden || Boolean(connection?.saveData));
      if (media.matches && !document.hidden && !connection?.saveData) document.addEventListener('pointermove', move, { passive: true });
    };
    update();
    media.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('keydown', hide);
    return () => {
      hide();
      document.removeEventListener('pointermove', move);
      media.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      document.removeEventListener('keydown', hide);
    };
  }, []);

  return <>
    <div ref={sky} className={styles.sky} aria-hidden="true">
      <div className={styles.distant} style={{ backgroundImage: distantStars }} />
      <div className={styles.near} style={{ backgroundImage: nearStars }} />
      {enable3D && <Starfield3D />}
    </div>
    <div ref={comet} className={styles.comet} aria-hidden="true">
      <span className={styles.star} />
      {Array.from({ length: 18 }, (_, i) => <span key={i} className={styles.tail} style={{ opacity: (1 - i / 18) * 0.8, height: Math.max(1, 7 - i * 0.35) }} />)}
    </div>
  </>;
}
