'use client';
import { useEffect, useRef } from 'react';
import ui from './confirmation.module.css';

export default function ConfirmationPortal({ confirmed, slow }: { confirmed: boolean; slow: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const phase = useRef({ confirmed, slow, openedAt: 0 });
  useEffect(() => { phase.current = { confirmed, slow, openedAt: confirmed ? performance.now() : 0 }; }, [confirmed, slow]);
  useEffect(() => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, width = 280, height = 290, disposed = false;
    const start = performance.now();
    function draw(now: number) {
      if (!element || !context || disposed) return;
      const t = motion.matches ? 2 : (now - start) / 1000;
      const opening = phase.current.confirmed ? Math.min(1, (now - phase.current.openedAt) / 680) : 0;
      const ease = 1 - Math.pow(1 - opening, 3);
      const scale = Math.min(width / 280, height / 290);
      context.clearRect(0, 0, width, height);
      context.save(); context.translate(width / 2, height / 2); context.scale(scale, scale);
      const rx = 65 * (1 + ease * 1.7), ry = 94 * (1 + ease * 1.7);
      const haze = context.createRadialGradient(0, 0, 8, 0, 0, 132 * (1 + ease));
      haze.addColorStop(0, `rgba(65,28,105,${0.12 + ease * 0.28})`); haze.addColorStop(.6, 'rgba(112,63,170,.13)'); haze.addColorStop(1, 'rgba(100,60,150,0)');
      context.fillStyle = haze; context.fillRect(-250, -280, 500, 560);
      // A translucent, uneven membrane gives the coalescing edge body between its light currents.
      context.beginPath();
      for (const edge of [1, -1]) {
        for (let i = 0; i <= 100; i++) {
          const angle = (edge === 1 ? i : 100 - i) / 100 * Math.PI * 2;
          const wave = Math.sin(angle * 5 + t * .65) * 2.6 + Math.cos(angle * 9 - t * .42) * 1.6;
          const thickness = 4 + Math.sin(angle * 4 - t * .6) * 2;
          const x = Math.cos(angle) * (rx + wave + edge * thickness), y = Math.sin(angle) * (ry + wave + edge * thickness);
          if (!i) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
      }
      context.fillStyle = 'rgba(167,110,235,.25)'; context.shadowColor = '#a56eeb'; context.shadowBlur = 22; context.fill('evenodd');
      // Uneven, overlapping currents make a liquid rim rather than a rigid loading ring.
      for (let layer = 0; layer < 3; layer++) {
        context.beginPath();
        for (let i = 0; i <= 100; i++) {
          const angle = i / 100 * Math.PI * 2;
          const wave = Math.sin(angle * 5 + t * .65 + layer) * 2.6 + Math.cos(angle * 9 - t * .42) * 1.6;
          const x = Math.cos(angle) * (rx + wave + layer * 3);
          const y = Math.sin(angle) * (ry + wave + layer * 3);
          if (!i) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath(); context.strokeStyle = layer === 1 ? 'rgba(185,245,255,.7)' : 'rgba(180,133,246,.55)';
        context.shadowColor = layer === 1 ? '#b9f5ff' : '#b17bea'; context.shadowBlur = 15; context.lineWidth = layer === 0 ? 2.5 : .8; context.stroke();
      }
      context.shadowBlur = 0;
      // Loose sparks spiral inward and join the membrane. This cycle conveys waiting, not a percentage.
      for (let i = 0; i < 28; i++) {
        const cycle = ((t * (phase.current.slow ? .11 : .18)) + i * .137) % 1;
        const distance = (1 - cycle) * 56;
        const angle = i * 2.399 + t * .25 + cycle * .85;
        const x = Math.cos(angle) * (rx + distance), y = Math.sin(angle) * (ry + distance * .8);
        const size = i % 5 === 0 ? 3 : 2;
        context.globalAlpha = Math.sin(cycle * Math.PI) * (1 - opening);
        context.fillStyle = i % 3 ? '#c4a0fb' : '#b9f5ff'; context.fillRect(Math.round(x), Math.round(y), size, size);
      }
      context.globalAlpha = 1;
      for (let i = 0; i < 18; i++) {
        const angle = i / 18 * Math.PI * 2 + t * .12;
        const x = Math.cos(angle) * (rx + Math.sin(t + i) * 3), y = Math.sin(angle) * (ry + Math.cos(t * .8 + i) * 3);
        context.fillStyle = i % 4 ? '#c4a0fb' : '#d6fbff'; context.shadowColor = '#c4b5fd'; context.shadowBlur = 10;
        context.beginPath(); context.arc(x, y, 1.2 + (Math.sin(t * .7 + i) + 1), 0, Math.PI * 2); context.fill();
      }
      if (opening > 0) {
        const light = context.createRadialGradient(0, 0, 0, 0, 0, 145);
        light.addColorStop(0, `rgba(185,245,255,${ease * .24})`); light.addColorStop(1, 'rgba(156,104,220,0)');
        context.fillStyle = light; context.fillRect(-180, -220, 360, 440);
      }
      context.restore();
    }
    function tick(now: number) {
      if (disposed) return;
      if (now - last >= 1000 / 30) { draw(now); last = now; }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      if (motion.matches) draw(performance.now()); else frame = requestAnimationFrame(tick);
    }
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height; element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); draw(performance.now());
    });
    observer.observe(element); motion.addEventListener('change', resume); document.addEventListener('visibilitychange', resume); resume();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener('change', resume); document.removeEventListener('visibilitychange', resume); };
  }, []);
  return <div className={ui.portal} aria-hidden="true"><canvas ref={canvas} className={ui.canvas} /></div>;
}
