// Keep this absent until the owner approves both each real quote and permission.
export interface ApprovedTestimonial { quote:string;attribution:string;permissionApproved:true }
export default function Testimonials({quotes=[]}:{quotes?:ApprovedTestimonial[]}) {
  if(!quotes.length)return null;
  return <section aria-label="Member experiences">{quotes.map(q=><figure key={q.quote}><blockquote>{q.quote}</blockquote><figcaption>{q.attribution}</figcaption></figure>)}</section>;
}
