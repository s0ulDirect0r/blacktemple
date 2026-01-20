'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useGallery } from '@/context/GalleryContext';

export default function HorizontalProjectFilter() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    projectCounts,
    refreshProjectCounts,
    fetchProjects,
  } = useGallery();
  const [isPending, startTransition] = useTransition();
  const hasFetchedProjects = useRef(projects.length > 0);
  const hasFetchedCounts = useRef(
    projectCounts.total > 0 || projectCounts.projects.length > 0 || projectCounts.unassigned > 0
  );

  useEffect(() => {
    if (hasFetchedProjects.current) {
      return;
    }

    hasFetchedProjects.current = true;
    fetchProjects().catch(() => {
      hasFetchedProjects.current = false;
    });
  }, [fetchProjects]);

  useEffect(() => {
    if (hasFetchedCounts.current) {
      return;
    }

    hasFetchedCounts.current = true;
    refreshProjectCounts().catch(() => {
      hasFetchedCounts.current = false;
    });
  }, [refreshProjectCounts]);

  const getProjectCount = (projectId: string | null): number => {
    if (!projectId) {
      return projectCounts.unassigned;
    }
    const project = projectCounts.projects.find(p => p.id === projectId);
    return project ? project.count : 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    startTransition(() => {
      if (value === 'all') {
        setSelectedProjectId(null);
      } else {
        setSelectedProjectId(value);
      }
    });
  };

  return (
    <div className="mb-8 flex justify-center" aria-busy={isPending}>
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-4xl">
        {/* All Projects */}
        <button
          onClick={() => startTransition(() => setSelectedProjectId(null))}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs whitespace-nowrap transition-all border-2 border-white rounded-full font-black ${
            !selectedProjectId
              ? 'bg-white text-black'
              : 'text-white hover:bg-white hover:text-black'
          }`}
        >
          All Projects
        </button>

        {/* Unassigned */}
        <button
          onClick={() => startTransition(() => setSelectedProjectId('unassigned'))}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs whitespace-nowrap transition-all border-2 border-white rounded-full font-black ${
            selectedProjectId === 'unassigned'
              ? 'bg-white text-black'
              : 'text-white hover:bg-white hover:text-black'
          }`}
        >
          Unassigned
        </button>

        {/* Project List */}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => startTransition(() => setSelectedProjectId(project.id))}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs whitespace-nowrap transition-all border-2 border-white rounded-full font-black ${
              selectedProjectId === project.id
                ? 'bg-white text-black'
                : 'text-white hover:bg-white hover:text-black'
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  );
}
