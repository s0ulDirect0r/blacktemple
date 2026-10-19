import { checkoutSupport } from '@/lib/support/checkout';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return checkoutSupport(request);
}
