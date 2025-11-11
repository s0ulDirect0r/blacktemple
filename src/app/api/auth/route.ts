import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';

// Create a new JWT token
async function createToken() {
  const secret = new TextEncoder().encode(process.env.ADMIN_SECRET);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  
  return token;
}

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();
    
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = await createToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 