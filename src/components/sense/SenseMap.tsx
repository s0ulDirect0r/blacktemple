'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapEdge, MapNode } from '@/lib/sense/store';
import { sense } from './api';

interface Placed extends MapNode { x: number; y: number; r: number }

/** A small force layout: nodes repel, links pull, everything drifts to the middle. Deterministic, so the map doesn't reshuffle on every visit. */
function layout(nodes: MapNode[], edges: MapEdge[]): Placed[] {
  const placed = nodes.map((node, i) => {
    const angle = i * 2.399963; // golden angle spiral as a stable starting point
    const radius = 30 * Math.sqrt(i + 1);
    return { ...node, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, r: node.kind === 'tag' ? 3 : 4 + Math.sqrt(node.weight) * 2.5 };
  });
  const index = new Map(placed.map((p, i) => [p.id, i]));
  const springs = edges.map(e => [index.get(e.from)!, index.get(e.to)!] as const).filter(([a, b]) => a !== undefined && b !== undefined);
  for (let step = 0; step < 300; step++) {
    const cooling = 1 - step / 300;
    const force = placed.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const dx = placed[i].x - placed[j].x, dy = placed[i].y - placed[j].y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const push = 60000 / d2;
        const d = Math.sqrt(d2);
        force[i].x += (dx / d) * push; force[i].y += (dy / d) * push;
        force[j].x -= (dx / d) * push; force[j].y -= (dy / d) * push;
      }
    }
    for (const [a, b] of springs) {
      const dx = placed[b].x - placed[a].x, dy = placed[b].y - placed[a].y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const pull = (d - 130) * 0.04;
      force[a].x += (dx / d) * pull; force[a].y += (dy / d) * pull;
      force[b].x -= (dx / d) * pull; force[b].y -= (dy / d) * pull;
    }
    placed.forEach((p, i) => {
      force[i].x -= p.x * 0.004; force[i].y -= p.y * 0.004;
      p.x += Math.max(-12, Math.min(12, force[i].x)) * cooling;
      p.y += Math.max(-12, Math.min(12, force[i].y)) * cooling;
    });
  }
  return placed;
}

/** Notes as a star map. Click a note to open it, a tag to see what carries it. */
export default function SenseMap({ onOpenNote, onOpenTag, refreshKey }: { onOpenNote: (title: string) => void; onOpenTag: (tag: string) => void; refreshKey: unknown }) {
  const [data, setData] = useState<{ nodes: MapNode[]; edges: MapEdge[] } | null>(null);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  // The panel's size in pixels, so the map is drawn at life size and only shrinks when it outgrows the panel.
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 680 });
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [data]);

  useEffect(() => {
    sense<{ nodes: MapNode[]; edges: MapEdge[] }>('/map').then(setData).catch(e => setError(e instanceof Error ? e.message : 'Couldn’t draw the map.'));
  }, [refreshKey]);

  const placed = useMemo(() => (data ? layout(data.nodes, data.edges) : []), [data]);
  const byId = useMemo(() => new Map(placed.map(p => [p.id, p])), [placed]);
  const near = useMemo(() => {
    if (!hover || !data) return null;
    const ids = new Set([hover]);
    for (const e of data.edges) { if (e.from === hover) ids.add(e.to); if (e.to === hover) ids.add(e.from); }
    return ids;
  }, [hover, data]);

  if (error) return <p className="p-6 text-sm text-red-300">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-zinc-500">Charting the stars…</p>;
  if (!placed.length) return <p className="p-6 text-sm text-zinc-400">No stars yet. Write a note, or link a [[title]] in a post, and it appears here.</p>;

  // Fit the stars, but never zoom in past life size: a young map sits in the middle of the panel.
  const pad = 140;
  const xs = placed.map(p => p.x), ys = placed.map(p => p.y);
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, size.width);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, size.height);
  const minX = (Math.max(...xs) + Math.min(...xs)) / 2 - width / 2, minY = (Math.max(...ys) + Math.min(...ys)) / 2 - height / 2;
  const written = data.nodes.filter(n => n.kind === 'note').length, unwritten = data.nodes.filter(n => n.kind === 'unwritten').length;
  const dim = (id: string) => (near && !near.has(id) ? 0.25 : 1);

  return (
    <div ref={box} className="relative h-full">
      <p className="absolute left-5 top-3 text-xs text-zinc-500">{written} notes · {data.edges.filter(e => e.kind === 'link').length} links · {unwritten} unwritten</p>
      <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="h-full w-full" role="img" aria-label="Map of notes and the links between them">
        {data.edges.map(edge => {
          const a = byId.get(edge.from), b = byId.get(edge.to);
          if (!a || !b) return null;
          const lit = near?.has(edge.from) && near?.has(edge.to);
          return <line key={edge.from + '>' + edge.to} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={edge.kind === 'tag' ? '#b9f5ff' : '#c4b5fd'} strokeOpacity={near ? (lit ? 0.8 : 0.08) : edge.kind === 'tag' ? 0.2 : 0.35}
            strokeDasharray={edge.kind === 'tag' ? '3 5' : undefined} />;
        })}
        {placed.map(node => {
          const open = () => (node.kind === 'tag' ? onOpenTag(node.label.slice(1)) : onOpenNote(node.label));
          const fill = node.kind === 'note' ? '#c4b5fd' : node.kind === 'tag' ? '#b9f5ff' : 'none';
          return (
            <g key={node.id} opacity={dim(node.id)} className="cursor-pointer outline-none" tabIndex={0} role="button" aria-label={node.kind === 'tag' ? `Tag ${node.label}` : `${node.kind === 'unwritten' ? 'Unwritten note' : 'Note'} ${node.label}`}
              onMouseEnter={() => setHover(node.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(node.id)} onBlur={() => setHover(null)}
              onClick={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}>
              {hover === node.id && node.kind !== 'tag' && <circle cx={node.x} cy={node.y} r={node.r + 9} fill="none" stroke="#c4b5fd" strokeOpacity={0.45} />}
              <circle cx={node.x} cy={node.y} r={node.r} fill={fill} stroke={node.kind === 'unwritten' ? '#a1a1aa' : 'none'} strokeDasharray={node.kind === 'unwritten' ? '2 2' : undefined} />
              <circle cx={node.x} cy={node.y} r={Math.max(node.r + 6, 12)} fill="transparent" />
              <text x={node.x + node.r + 6} y={node.y + 4} fontSize={node.kind === 'tag' ? 11 : 12}
                fill={node.kind === 'note' ? '#e4e4e7' : node.kind === 'tag' ? '#a1a1aa' : '#71717a'}>{node.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-5 flex gap-4 text-xs text-zinc-500" aria-hidden="true">
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-300" />note</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#b9f5ff]" />tag</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full border border-dashed border-zinc-400" />unwritten</span>
        <span>size = backlinks</span>
      </div>
    </div>
  );
}
