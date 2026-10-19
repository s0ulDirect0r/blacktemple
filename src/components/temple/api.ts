export async function api<T=Record<string,unknown>>(path:string,method='GET',body?:unknown):Promise<T> {
  const response=await fetch('/api/temple/'+path,{method,credentials:'same-origin',cache:'no-store',headers:body!==undefined?{'Content-Type':'application/json'}:undefined,body:body!==undefined?JSON.stringify(body):undefined});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error??'That could not be completed. Try again.');
  return result;
}
export type Identity={id:string;name:string;alias:string;persona:string;avatar_id:string|null;version:number};
export type Author={id:string;name:string;alias:string;avatarId:string|null};
export type Media={id:string;alt:string;width:number;height:number};
export type Contribution={id:string;body:string;link:string|null;offering:boolean;version:number;created_at:string;updated_at:string;hidden_at:string|null;moderation_reason:string|null;author:Author;media:Media[];comment_count:number;reactions:Record<string,number>;my_reaction:string|null};
export type Reply={id:string;post_id:string;body:string;version:number;created_at:string;hidden_at:string|null;moderation_reason:string|null;author:Author};
