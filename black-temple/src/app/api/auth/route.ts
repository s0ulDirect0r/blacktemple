import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Auth route hit');
    console.log(process.env.BLOB_READ_WRITE_TOKEN);
    console.log(process.env.ADMIN_SECRET);
    console.log('ADMIN_SECRET env var exists:', !!process.env.ADMIN_SECRET);
    
    const data = await request.formData();
    const adminSecret = data.get('ADMIN_SECRET') as string;
    
    console.log('Received secret length:', adminSecret?.length);
    console.log('Expected secret length:', process.env.ADMIN_SECRET?.length);
    console.log('Secrets match:', adminSecret === process.env.ADMIN_SECRET);
    
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 