import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { isCardDecline } from '../src/lib/membership/finite-schedule';
import { failureReason } from '../src/lib/membership/jobs';

// Build errors the way the SDK does for HTTP responses: the class is chosen by status code.
const fromResponse = (statusCode: number, type: string, code?: string) => Stripe.errors.StripeError.generate({ statusCode, type, code, message: 'fixture' } as never);

test('first-payment declines are recognized from errors the installed Stripe SDK actually throws', () => {
  assert.equal(isCardDecline(fromResponse(402, 'card_error', 'card_declined')), true);
  assert.equal(isCardDecline(fromResponse(400, 'invalid_request_error')), false);
  assert.equal(isCardDecline(fromResponse(400, 'idempotency_error')), false);
  assert.equal(isCardDecline(fromResponse(500, 'api_error')), false);
  assert.equal(isCardDecline(new Error('network')), false);
  assert.equal(isCardDecline({ type: 'StripeCardError' }), false);
});

test('job failure reasons are useful to operators but bounded and free of secrets', () => {
  assert.equal(failureReason(fromResponse(402, 'card_error', 'card_declined')), 'StripeCardError:card_declined');
  assert.equal(failureReason(new Error('Membership checkout ownership mismatch')), 'Error: Membership checkout ownership mismatch');
  assert.equal(failureReason(new Error('sent to member@example.com with sk_test_abc123 and whsec_xyz')), 'Error: sent to <email> with <redacted> and <redacted>');
  assert.equal(failureReason(new Error('x'.repeat(500))).length, 200);
  assert.equal(failureReason('not an error'), 'UnknownError');
});
