'use client';

import type { Backlink, SenseNote, SensePost } from '@/lib/sense/store';

export type { Backlink, SenseNote, SensePost };

export interface Sidebar {
  channels: { slug: string; posts: number; lastAt: string | null }[];
  notes: { id: string; title: string; updatedAt: string; backlinks: number }[];
  unwritten: { key: string; title: string; backlinks: number }[];
  tags: { tag: string; count: number }[];
}

export interface Found {
  kind: 'post' | 'note';
  id: string;
  where: string;
  threadId: string | null;
  excerpt: string;
  createdAt: string;
}

function token() {
  return sessionStorage.getItem('adminSession') ?? '';
}

/** Call the Sense API with the admin token; throws the API's own error message. */
export async function sense<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token()}`);
  if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/sense${path}`, { ...init, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'That didn’t work. Try again.');
  }
  return response.json();
}

export function uploadImage(file: Blob) {
  return sense<{ id: string; url: string }>('/images', { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
}

/** Fetch a private image with the admin token and hand back an object URL. */
export async function imageObjectUrl(src: string) {
  const response = await fetch(src, { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) throw new Error('Image unavailable');
  return URL.createObjectURL(await response.blob());
}

export function timeLabel(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
