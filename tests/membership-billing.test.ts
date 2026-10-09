import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { isCardDecline } from '../src/lib/membership/finite-schedule';

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
