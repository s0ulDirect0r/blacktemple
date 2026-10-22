import { senseHandler } from '@/lib/sense/http';
import { MemberError } from '@/lib/membership/errors';
import { MAX_IMAGE_BYTES, saveImage } from '@/lib/sense/images';

export const dynamic = 'force-dynamic';

/** The raw image bytes as the request body. Returns `{ id, url, width, height }`. */
export const POST = senseHandler(async (_actor, request) => {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new MemberError(413, 'Images can be up to 4 MB.');
  return saveImage(Buffer.from(await request.arrayBuffer()));
});
