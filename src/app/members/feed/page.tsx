import Feed, { type FeedData } from '@/components/temple/Feed';
import { requireMemberSession } from '@/lib/membership/auth';
import { MemberError } from '@/lib/membership/errors';
import { feed } from '@/lib/temple/store';
export const metadata={title:'Shared Temple'};
export default async function FeedPage(){
  const session=await requireMemberSession('/members/feed');
  let initialData:FeedData|null=null,initialError='';
  try {
    // Resolve the private room before navigation commits, avoiding an empty loading view.
    initialData=JSON.parse(JSON.stringify(await feed(session.user.id))) as FeedData;
  } catch(error) {
    initialError=error instanceof MemberError?error.message:'The shared Temple could not be opened. Please try again.';
  }
  return <Feed initialData={initialData} initialError={initialError}/>;
}
