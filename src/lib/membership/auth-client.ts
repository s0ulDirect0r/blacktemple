'use client';
import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const memberAuthClient = createAuthClient({
  basePath: '/api/member-auth',
  plugins: [inferAdditionalFields({ user: { emailUpdates: { type: 'boolean', required: false } } })],
});
