import { senseHandler, type IdParams } from '@/lib/sense/http';
import { MemberError } from '@/lib/membership/errors';
import { loadImage } from '@/lib/sense/images';

export const dynamic = 'force-dynamic';

export const GET = senseHandler<IdParams>(async (_actor, _request, { params }) => {
  const image = await loadImage((await params).id);
  if (!image) throw new MemberError(404, 'That image is gone.');
  const body = Buffer.isBuffer(image.body) ? new Uint8Array(image.body) : image.body;
  return new Response(body, { headers: { 'Content-Type': image.contentType, 'Cache-Control': 'private, max-age=86400', 'Content-Security-Policy': "default-src 'none'" } });
});
