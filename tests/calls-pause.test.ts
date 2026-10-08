// Next's proxy test helpers expect its Node runtime globals to be initialized.
import 'next/dist/server/node-environment-baseline';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from '@/proxy';

test('paused calls redirect home temporarily without carrying checkout parameters', () => {
  const response = proxy(new NextRequest('https://www.blacktemple.dev/calls?hold=example&_rsc=example'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.blacktemple.dev/');
});

test('the pause also applies to client navigation and prefetch requests', () => {
  assert.equal(unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url: '/calls?_rsc=example',
    headers: { rsc: '1', 'next-router-prefetch': '1' },
  }), true);
});

test('new availability and checkout requests are unavailable while paused', async () => {
  for (const [path, method] of [['/api/calls/slots', 'GET'], ['/api/calls/checkout', 'POST']]) {
    const response = proxy(new NextRequest(`https://www.blacktemple.dev${path}`, { method }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Call bookings are temporarily unavailable.' });
  }
});

test('payment confirmation, webhooks, hold release and other pages stay outside the pause', () => {
  for (const path of ['/calls/booked?session_id=example', '/api/calls/webhook', '/api/calls/release', '/', '/portfolio', '/writing', '/privacy']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), false, path);
  }
});
