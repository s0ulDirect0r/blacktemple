import { studioForMember } from '@/lib/membership/content';
import { authenticated, errorResponse, privateJson } from '@/lib/membership/http';
export async function GET(request: Request) {
  try { return privateJson({ entries: await studioForMember((await authenticated(request)).user.id) }); }
  catch (error) { return errorResponse(error); }
}
