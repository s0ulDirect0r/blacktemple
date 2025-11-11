import ArtUploader from "@/components/ArtUploader";
import ProjectManager from "@/components/ProjectManager";
import ImageManager from "@/components/ImageManager";
import { GalleryProvider } from "@/context/GalleryContext";
import AdminAuth from "@/components/AdminAuth";

export default function AdminPage() {
  return (
    <AdminAuth>
      <GalleryProvider>
        <main className="min-h-screen p-8">
          <h1 className="text-4xl font-bold mb-8">Black Temple Admin</h1>
          <div className="space-y-12">
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