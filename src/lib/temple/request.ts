import { MemberError } from '@/lib/membership/errors';

export async function boundedBytes(request: Request, maximum: number) {
  if(Number(request.headers.get('content-length'))>maximum)throw new MemberError(413,'This request is too large.');
  const reader=request.body?.getReader();
  if(!reader)return Buffer.alloc(0);
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
    for(;;){
      const part=await reader.read();
      if(part.done)break;
      total+=part.value.length;
      if(total>maximum)throw new MemberError(413,'This request is too large.');
      chunks.push(part.value);
    }
  }finally{await reader.cancel();}
  return Buffer.concat(chunks);
}
