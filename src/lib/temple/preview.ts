export function localTemplePreview() {
  if(process.env.TEMPLE_LOCAL_PREVIEW!=='true'||process.env.VERCEL_ENV)return false;
  try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(process.env.BETTER_AUTH_URL??'').hostname);}catch{return false;}
}
