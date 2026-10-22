import { NextResponse } from 'next/server';
import { createAdminToken, isAdminSecret } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    if (!isAdminSecret(secret)) {
      // Slow down online guessing; there is no shared store for a real rate limit.
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = await createAdminToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
