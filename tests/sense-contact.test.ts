import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactLinks, normalizeEmail, normalizePhone, normalizeTelegram } from '../src/lib/sense/contact';

test('reads phone numbers however they’re typed', () => {
  assert.equal(normalizePhone('+1 (205) 555-0142'), '+12055550142');
  assert.equal(normalizePhone('205.555.0142'), '+12055550142');
  assert.equal(normalizePhone('1 205 555 0142'), '+12055550142');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('555-0142'), null);
  assert.equal(normalizePhone('call me'), null);
  assert.equal(normalizePhone('+1 205 555 0142 ext 9'), null);
});

test('reads Telegram usernames from a name, an @name or a link', () => {
  assert.equal(normalizeTelegram('@some_one'), 'some_one');
  assert.equal(normalizeTelegram('https://t.me/some_one/'), 'some_one');
  assert.equal(normalizeTelegram('some one'), null);
  assert.equal(normalizeTelegram('abc'), null);
});

test('builds a link for each app the person can be reached on', () => {
  assert.deepEqual(contactLinks({ phone: '+12055550142', telegram: 'some_one' }), [
    { app: 'iMessage', url: 'sms:+12055550142' },
    { app: 'WhatsApp', url: 'https://wa.me/12055550142' },
    { app: 'Telegram', url: 'https://t.me/some_one' },
    { app: 'Signal', url: 'https://signal.me/#p/+12055550142' },
  ]);
  assert.deepEqual(contactLinks({ phone: null, telegram: 'some_one' }), [{ app: 'Telegram', url: 'https://t.me/some_one' }]);
  assert.equal(contactLinks({ phone: '+12055550142', telegram: null })[2].url, 'https://t.me/+12055550142');
  assert.deepEqual(contactLinks({ phone: null, telegram: null }), []);
  assert.deepEqual(contactLinks({ phone: null, telegram: null, email: 'a@example.com' }), [{ app: 'Email', url: 'mailto:a@example.com' }]);
});

test('reads email addresses', () => {
  assert.equal(normalizeEmail('  Someone@Example.com '), 'someone@example.com');
  assert.equal(normalizeEmail('someone@example'), null);
  assert.equal(normalizeEmail('some one@example.com'), null);
  assert.equal(normalizeEmail('not an email'), null);
});
