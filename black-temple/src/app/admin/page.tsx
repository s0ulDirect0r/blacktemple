import ArtUploader from "@/components/ArtUploader";
import { GalleryProvider } from "@/context/GalleryContext";

export default function AdminPage() {
  return (
    <GalleryProvider>
      <main className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Black Temple Admin</h1>
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Upload New Artwork</h2>
            <ArtUploader />
          </section>
        </div>
      </main>
    </GalleryProvider>
  );
} 