import ArtUploader from "@/components/ArtUploader";
import ArtGallery from "@/components/ArtGallery";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Black Temple Art Gallery</h1>
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Upload New Artwork</h2>
          <ArtUploader />
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
          <ArtGallery />
        </section>
      </div>
    </main>
  );
}
