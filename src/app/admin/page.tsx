import ArtUploader from "@/components/ArtUploader";
import ProjectManager from "@/components/ProjectManager";
import ImageManager from "@/components/ImageManager";
import { GalleryProvider } from "@/context/GalleryContext";
import AdminAuth from "@/components/AdminAuth";
import MembersPanel from "@/components/MembersPanel";
import FeedbackPanel from "@/components/FeedbackPanel";

export default function AdminPage() {
  return (
    <AdminAuth>
      <GalleryProvider>
        <main className="min-h-screen p-8">
          <h1 className="text-4xl font-bold mb-4">Black Temple Admin</h1>
          <p className="mb-8"><a href="/admin/sense" className="text-violet-300 underline">Open Sense →</a></p>
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Members</h2>
              <MembersPanel />
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">ESCALATION feedback</h2>
              <FeedbackPanel />
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Projects</h2>
              <ProjectManager />
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Upload New Artwork</h2>
              <ArtUploader />
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Manage Artwork</h2>
              <ImageManager />
            </section>
          </div>
        </main>
      </GalleryProvider>
    </AdminAuth>
  );
} 