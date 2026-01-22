'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FiGithub, FiExternalLink, FiCode, FiX } from 'react-icons/fi';

interface Project {
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
  images?: string[];
  techStack?: string[];
  repoUrl?: string;
  demoUrl?: string;
}

interface LightboxState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  projectTitle: string;
}

export default function ProjectsZoneContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    images: [],
    currentIndex: 0,
    projectTitle: '',
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/mdx-projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Get all images for a project (images array or fallback to imageUrl)
  const getProjectImages = (project: Project): string[] => {
    if (project.images && project.images.length > 0) {
      return project.images;
    }
    if (project.imageUrl) {
      return [project.imageUrl];
    }
    return [];
  };

  const openLightbox = (project: Project, imageIndex: number) => {
    const images = getProjectImages(project);
    setLightbox({
      isOpen: true,
      images,
      currentIndex: imageIndex,
      projectTitle: project.title,
    });
  };

  const closeLightbox = () => {
    setLightbox(prev => ({ ...prev, isOpen: false }));
  };

  const goToImage = (index: number) => {
    setLightbox(prev => ({ ...prev, currentIndex: index }));
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToImage((lightbox.currentIndex - 1 + lightbox.images.length) % lightbox.images.length);
      } else if (e.key === 'ArrowRight') {
        goToImage((lightbox.currentIndex + 1) % lightbox.images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, lightbox.currentIndex, lightbox.images.length]);

  return (
    <div className="max-w-6xl mx-auto text-white">
      <h1 className="font-pixel text-lg sm:text-xl md:text-2xl text-center mb-6 sm:mb-12">Code</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-t-2 border-zinc-500 border-solid rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>No projects yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          {projects.map((project) => {
            const images = getProjectImages(project);
            const displayImages = images.slice(0, 4); // Max 4 images

            return (
              <article
                key={project.slug}
                className="flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors group"
              >
                {/* Project images */}
                {displayImages.length > 0 ? (
                  <div className={`bg-zinc-800 ${displayImages.length === 1 ? 'aspect-video' : 'aspect-[2/1]'}`}>
                    {displayImages.length === 1 ? (
                      // Single image - full width
                      <div
                        className="relative w-full h-full cursor-pointer overflow-hidden"
                        onClick={() => openLightbox(project, 0)}
                      >
                        <Image
                          src={displayImages[0]}
                          alt={project.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      // 2x2 grid for multiple images
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className={`relative overflow-hidden ${displayImages[index] ? 'cursor-pointer' : 'bg-zinc-800'}`}
                            onClick={() => displayImages[index] && openLightbox(project, index)}
                          >
                            {displayImages[index] ? (
                              <Image
                                src={displayImages[index]}
                                alt={`${project.title} ${index + 1}`}
                                fill
                                sizes="(min-width: 768px) 25vw, 50vw"
                                className="object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-zinc-800/50" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                    <FiCode className="w-12 h-12 text-zinc-600" />
                  </div>
                )}

                {/* Project content */}
                <div className="flex-1 flex flex-col p-4 sm:p-6">
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-zinc-300 transition-colors">
                    {project.title}
                  </h2>

                  <p className="text-zinc-400 mb-4">{project.description}</p>

                  {/* Tech stack */}
                  {project.techStack && project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                  <div className="flex items-center gap-3 mt-auto pt-4">
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-lg text-sm text-zinc-200 hover:text-white transition-all"
                      >
                        <FiGithub className="w-4 h-4" />
                        <span>View Code</span>
                      </a>
                    )}

                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg text-sm text-white transition-all"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        <span>View Project</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal - rendered via portal to escape parent constraints */}
      {lightbox.isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <FiX className="w-8 h-8" />
          </button>

          {/* Image container */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.images[lightbox.currentIndex]}
              alt={`${lightbox.projectTitle} - Image ${lightbox.currentIndex + 1}`}
              width={1200}
              height={800}
              className="object-contain max-h-[85vh] rounded-lg"
            />

            {/* Navigation arrows (only show if multiple images) */}
            {lightbox.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage((lightbox.currentIndex - 1 + lightbox.images.length) % lightbox.images.length);
                  }}
                  className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage((lightbox.currentIndex + 1) % lightbox.images.length);
                  }}
                  className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Image indicators */}
          {lightbox.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {lightbox.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === lightbox.currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
