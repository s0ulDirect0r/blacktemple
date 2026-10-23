import AdminAuth from '@/components/AdminAuth';
import SenseApp from '@/components/sense/SenseApp';

export const metadata = { title: 'Sense', robots: { index: false, follow: false } };

export default function SensePage() {
  return (
    <AdminAuth>
      <SenseApp />
    </AdminAuth>
  );
}
