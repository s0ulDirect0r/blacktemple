import { initBotId } from 'botid/client/core';

// Keep in sync with the rejectBots() calls in these routes.
initBotId({
  protect: [
    { path: '/api/calls/checkout', method: 'POST' },
    { path: '/api/support/checkout', method: 'POST' },
    { path: '/api/auth', method: 'POST' },
  ],
});
