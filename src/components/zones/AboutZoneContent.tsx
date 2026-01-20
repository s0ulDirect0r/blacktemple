'use client';

export default function AboutZoneContent() {
  return (
    <div className="max-w-3xl mx-auto text-white">
      <h1 className="text-4xl font-bold mb-8 text-center">About Me</h1>

      <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-lg leading-relaxed">
        <p>
          I&apos;m Matthew D. Huff, a software engineer and artist based in New York
          City. I build things at the intersection of technology and creativity.
        </p>

        <p>
          By day, I work as a software engineer, building web applications with
          modern technologies like React, TypeScript, and Node.js. By night, I
          explore digital art, creative coding, and the boundaries of what&apos;s
          possible in the browser.
        </p>

        <p>
          This site serves as my digital gallery and portfolio — a place to
          showcase my artwork, projects, and writing. The 3D landing page you see
          was built with Three.js and represents my love for immersive web
          experiences.
        </p>

        <p>
          When I&apos;m not coding or creating art, you can find me reading
          philosophy, practicing meditation, or exploring the neighborhoods of
          NYC.
        </p>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-zinc-400">
            Interested in working together or just want to say hello? Feel free to
            reach out at{' '}
            <a
              href="mailto:matthewhuff89@gmail.com"
              className="text-white underline hover:text-zinc-300 transition-colors"
            >
              matthewhuff89@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
