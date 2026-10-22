import { rejectBots } from '@/lib/bot-guard';
import { checkoutSupport } from '@/lib/support/checkout';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const blocked = await rejectBots();
  if (blocked) return blocked;
  return checkoutSupport(request);
}
