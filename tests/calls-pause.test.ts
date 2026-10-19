// Next's proxy test helpers expect its Node runtime globals to be initialized.
import 'next/dist/server/node-environment-baseline';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from '@/proxy';

test('calls page remains accessible with checkout return parameters', () => {
  const response = proxy(new NextRequest('https://www.blacktemple.dev/calls?hold=example&_rsc=example'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('client navigation and prefetch requests reach the calls access check', () => {
  assert.equal(unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url: '/calls?_rsc=example',
    headers: { rsc: '1', 'next-router-prefetch': '1' },
  }), true);
});

test('new availability and checkout requests reach their route handlers', () => {
  for (const [path, method] of [['/api/calls/slots', 'GET'], ['/api/calls/checkout', 'POST']]) {
    const response = proxy(new NextRequest(`https://www.blacktemple.dev${path}`, { method }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  }
});

test('payment confirmation, webhooks, hold release and support stay outside the access check', () => {
  for (const path of ['/calls/booked?session_id=example', '/api/calls/webhook', '/api/calls/release', '/support', '/api/support/checkout', '/', '/portfolio', '/writing', '/privacy']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), false, path);
  }
});
