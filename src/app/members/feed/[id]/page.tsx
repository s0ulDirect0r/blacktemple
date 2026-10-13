import Feed from '@/components/temple/Feed';
export const metadata={title:'Temple contribution'};
export default async function ContributionPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Feed postId={id} />;}
