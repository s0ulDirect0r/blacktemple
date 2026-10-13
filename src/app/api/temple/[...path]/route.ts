import { authenticated, errorResponse, jsonObject, privateJson } from '@/lib/membership/http';
import { MemberError } from '@/lib/membership/errors';
import * as temple from '@/lib/temple/store';
import { exportResponse } from '@/lib/temple/export';
import { MAX_IMAGE_BYTES, uuid } from '@/lib/temple/validation';
import { boundedBytes } from '@/lib/temple/request';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Context={params:Promise<{path:string[]}>};
export async function handle(request:Request,context:Context) {
  try {
    const method=request.method,mutating=!['GET','HEAD'].includes(method),{path}=await context.params;
    const uploading=method==='POST'&&path.length===1&&path[0]==='media';
    // Multipart uploads get the same exact-origin protection as JSON writes.
    if(uploading) {
      const origin=process.env.BETTER_AUTH_URL;
      if(!origin||request.headers.get('origin')!==new URL(origin).origin) throw new MemberError(403,'Request origin is not allowed.');
      if(!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new MemberError(415,'Send an image upload.');
    }
    const session=await authenticated(request,mutating&&!uploading),userId=session.user.id;
    if(mutating)await temple.requestLimit(userId,uploading?'upload':'write',uploading?8:45);
    const url=new URL(request.url);
    const body=mutating&&!uploading?await jsonObject(new Request(request.url,{method,headers:request.headers,body:new Uint8Array(await boundedBytes(request,64*1024))})):{};
    const [space,id,action]=path;
    if(path.length>3) throw new MemberError(404,'Temple route not found.');
    if(space==='identity'&&path.length===1) {
      if(method==='GET') return privateJson({profile:await temple.ownProfile(userId),media:await temple.ownMedia(userId)});
      if(method==='PUT') return privateJson({profile:await temple.saveProfile(userId,body)});
    }
    if(space==='export'&&path.length===1&&method==='GET') {await temple.requestLimit(userId,'export',2);return await exportResponse(userId,url.searchParams.get('format')==='json');}
    if(space==='profiles'&&id&&path.length===2&&method==='GET') return privateJson({profile:await temple.publicProfile(userId,id)});
    if(space==='feed') {
      if(method==='GET'&&path.length<=2) return privateJson(await temple.feed(userId,url.searchParams.get('cursor'),id));
      if(method==='POST'&&path.length===1) return privateJson(await temple.savePost(userId,body),201);
      if(method==='PATCH'&&path.length===2) return privateJson(await temple.savePost(userId,body,id));
      if(method==='DELETE'&&path.length===2) return privateJson(await temple.deleteRecord(userId,'post',id));
      if(id&&action==='comments'&&method==='GET') return privateJson(await temple.comments(userId,id,url.searchParams.get('cursor')));
      if(id&&action==='comments'&&method==='POST') return privateJson(await temple.saveComment(userId,id,body),201);
      if(id&&action==='reaction'&&method==='PUT') return privateJson(await temple.reaction(userId,id,body.kind));
    }
    if(space==='comments'&&id&&path.length===2) {
      if(method==='DELETE') return privateJson(await temple.deleteRecord(userId,'comment',id));
      if(method==='PATCH') return privateJson(await temple.saveComment(userId,uuid(body.postId),body,id));
    }
    if(space==='media') {
      if(method==='POST'&&path.length===1) {
        await temple.communityAccess(userId);
        const length=Number(request.headers.get('content-length'));
        if(length>MAX_IMAGE_BYTES+65536) throw new MemberError(413,'Each image must be no larger than 8 MiB.');
        // Bound streamed multipart bytes even when Content-Length is omitted.
        const bounded=new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')!},body:new Uint8Array(await boundedBytes(request,MAX_IMAGE_BYTES+65536))});
        const data=await bounded.formData(),file=data.get('file');
        if(!(file instanceof File)||file.size>MAX_IMAGE_BYTES)throw new MemberError(400,'Choose a PNG, JPEG or WebP image under 8 MiB.');
        return privateJson(await temple.upload(userId,uuid(data.get('id')),Buffer.from(await file.arrayBuffer()),file.name,data.get('alt')),201);
      }
      if(method==='GET'&&id&&path.length===2) {
        const m=await temple.mediaFor(userId,id);
        return new Response(new Uint8Array(m.bytes),{headers:{'Content-Type':m.mime,'Content-Length':String(m.bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});
      }
      if(method==='DELETE'&&id&&path.length===2)return privateJson(await temple.removeMedia(userId,id));
    }
    if(space==='reports'&&path.length===1&&method==='POST')return privateJson(await temple.report(userId,body),201);
    if(space==='moderation'&&path.length===1) {
      if(method==='GET')return privateJson({reports:await temple.moderationQueue(userId)});
      if(method==='POST')return privateJson(await temple.moderate(userId,body));
    }
    throw new MemberError(404,'Temple route not found.');
  }catch(error){return errorResponse(error);}
}
export const GET=handle;
export const POST=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
