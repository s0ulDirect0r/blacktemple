import Image from 'next/image';
import { getAllProjects } from '@/lib/mdx';
import { FiGithub, FiExternalLink, FiCode } from 'react-icons/fi';

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-12">Projects</h1>

          {projects.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No projects yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <article
                  key={project.slug}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors group"
                >
                  {/* Project image */}
                  {project.imageUrl ? (
                    <div className="aspect-video bg-zinc-800 overflow-hidden relative">
                      <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                      <FiCode className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}

                  {/* Project content */}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-3 group-hover:text-zinc-300 transition-colors">
                      {project.title}
                    </h2>

                    <p className="text-zinc-400 mb-4">
                      {project.description}
                    </p>

                    {/* Tech stack */}
                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.techStack.map((tech, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center space-x-3">
                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                          <FiGithub className="w-4 h-4" />
                          <span>Code</span>
                        </a>
                      )}

                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                          <FiExternalLink className="w-4 h-4" />
                          <span>Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
