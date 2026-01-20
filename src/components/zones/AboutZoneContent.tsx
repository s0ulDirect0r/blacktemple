"use client";

import Image from "next/image";

export default function AboutZoneContent() {
  return (
    <div className="max-w-3xl mx-auto text-white">
      <h1 className="font-pixel text-lg sm:text-xl md:text-2xl mb-8 text-center">
        About Me
      </h1>

      {/* Profile photo */}
      <div className="flex justify-center mb-8">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-2 border-zinc-700">
          <Image
            src="https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/_ADS3423.jpeg"
            alt="Matthew D. Huff"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-lg leading-relaxed">
        <p>
          I&apos;m Matthew D. Huff, a software engineer and artist currently
          based in New York City.
        </p>

        <p>
          I'm always looking for the dopest and most challenging projects I can
          find for my current level. My project "godcell" is an example of that,
          using LLMs, Three.js, ECS, and other technologies to build a wild
          evolutionary survival multiplayer game. I'm a bit eclectic in my
          tastes on that note! I'm as likely to get locked in building out a
          front end, setting up an API, building a test suite, as I am to get
          pilled on multiplayer games and sun simulators!
        </p>

        <p>
          I'm a bit of a wanderer in search of the perfect synthesis of
          knowledge, creativity, and wisdom. To that end, I practice the fine
          crafts of software engineering, meditation, digital painting, and as
          of late I've been having quite an intense mathematics arc!
        </p>

        <p>
          I'm currently looking for full time opportunities as a product
          engineer, to continue walking the path of service through helping
          companies complete their missions using my creativity and intellect.
        </p>

        <p></p>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-zinc-400">
            Interested in working together or just want to say hello? Feel free
            to reach out at{" "}
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
