'use client';

import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiGithub,
  FiLinkedin,
} from 'react-icons/fi';

export default function ResumeZoneContent() {
  return (
    <div className="max-w-4xl mx-auto text-white">
      {/* Header */}
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="font-pixel text-lg sm:text-xl md:text-2xl mb-4">Matthew D. Huff</h1>
        <div className="flex flex-wrap justify-center items-center gap-4 text-zinc-400 text-sm">
          <span className="flex items-center gap-1">
            <FiMapPin className="w-4 h-4" />
            New York, NY
          </span>
          <span className="flex items-center gap-1">
            <FiPhone className="w-4 h-4" />
            205-542-1170
          </span>
          <a
            href="mailto:matthewhuff89@gmail.com"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <FiMail className="w-4 h-4" />
            matthewhuff89@gmail.com
          </a>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-4 mt-3 text-sm">
          <a
            href="https://github.com/s0ulDirect0r"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <FiGithub className="w-4 h-4" />
            github.com/s0ulDirect0r
          </a>
          <a
            href="https://linkedin.com/in/matthewdhuff"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <FiLinkedin className="w-4 h-4" />
            linkedin.com/matthewdhuff
          </a>
        </div>
      </header>

      {/* Experience Section */}
      <section className="mb-8 sm:mb-12">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-zinc-800">
          Experience
        </h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Landings */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Software Engineer</h3>
                <p className="text-zinc-400">Landings</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                New York, NY — 2025
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Informed sales strategy by building a map using Next.js and H3 to
                  display evaluated properties.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Set up continuous integration process using GitHub Actions to
                  automatically deploy front-end and back-end servers to Google Cloud
                  Run.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Developed pipeline in Express.js to persist property evaluations to
                  Google Cloud SQL and restructured existing database schemas to ensure
                  clarity and consistency in data handling across the application.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Increased developer velocity by resolving 800+ TypeScript and ESLint
                  warnings and errors, documenting onboarding steps for new developers,
                  and adding precommit code validation hooks.
                </span>
              </li>
            </ul>
          </article>

          {/* Independent Artist */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Independent Artist</h3>
                <p className="text-zinc-400">Multiple Countries</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                2021-2025
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Created and shared over 200 pieces of digital art and 11 short
                  stories via Twitter/X.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Wrote, edited, designed, self-published, and sold over 100 copies of
                  an original fictional novel titled{' '}
                  <a
                    href="https://a.co/d/02ZNaiuC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="italic underline hover:text-white transition-colors"
                  >
                    An Infinite Heart
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Earned thousands of dollars making commissioned artwork for
                  individuals based on their desires.
                </span>
              </li>
            </ul>
          </article>

          {/* Scrimmage */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Contract Software Engineer</h3>
                <p className="text-zinc-400">Scrimmage</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                Brooklyn, NY — 2020-2021
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Built a cross-platform mobile app with messaging and scheduling for
                  baseball and softball games using Flutter, Dart, Firebase, and
                  Firestore.
                </span>
              </li>
            </ul>
          </article>

          {/* SquareFoot */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Software Engineer</h3>
                <p className="text-zinc-400">SquareFoot</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                New York, NY — 2017-2019
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Collaborated closely with commercial real-estate brokers to inform
                  product road-map in support of key metrics including conversation
                  rate and deal volume.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Improved UX by developing the V2 of the customer-facing front-end
                  using React and TypeScript.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Developed GraphQL queries and interfaces to support commercial
                  property search across states.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>Maintained and debugged the Ruby on Rails backend.</span>
              </li>
            </ul>
          </article>

          {/* Butterfly.ai */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Software Engineer</h3>
                <p className="text-zinc-400">Butterfly.ai</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                Brooklyn, NY — 2016-2017
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Built full-stack features for the employee-manager feedback product
                  using Javascript, React, Redux, PostgreSQL, and Node.js.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Supported timely and consistent user participation by scheduling
                  reminder emails using cron jobs.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Improved dashboard load times and responsiveness by identifying
                  performance bottlenecks and implementing optimizations, making it
                  easier for leadership to understand the product&apos;s operating
                  profile and determine product direction.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Managed application deployments to AWS and Google Cloud Platform.
                </span>
              </li>
            </ul>
          </article>

          {/* Goldbean */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold">Software Engineer</h3>
                <p className="text-zinc-400">Goldbean</p>
              </div>
              <span className="text-zinc-500 text-sm mt-1 sm:mt-0">
                New York, NY — 2015-2016
              </span>
            </div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Rearchitected Node.js microservice configuration to support
                  white-label deployments, thereby unlocking new customer segments for
                  the business.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-600">•</span>
                <span>
                  Implemented a gift subscription payment system, allowing GoldBean to
                  gain market share by encouraging users to invite their friends and
                  family onto the platform.
                </span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
