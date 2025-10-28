'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useGallery } from '@/context/GalleryContext';
import { FiMenu, FiX, FiFolder, FiImage } from 'react-icons/fi';

export default function ProjectFilter() {
  const { 
    projects, 
    selectedProjectId, 
    setSelectedProjectId,
    projectCounts,
    refreshProjectCounts,
    fetchProjects,
  } = useGallery();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-4 z-50 p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-white hover:bg-zinc-800 transition-colors"
        aria-label="Toggle project menu"
      >
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-busy={isPending}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-white">Projects</h2>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {/* All Projects */}
              <button
                onClick={() => {
                  startTransition(() => setSelectedProjectId(null));
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  !selectedProjectId
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FiFolder />
                  <span>All Projects</span>
                </div>
                <span className="text-sm bg-zinc-800 px-2 py-0.5 rounded">
                  {projectCounts.total}
                </span>
              </button>

              {/* Unassigned */}
              <button
                onClick={() => {
                  startTransition(() => setSelectedProjectId('unassigned'));
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedProjectId === 'unassigned'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FiImage />
                  <span>Unassigned</span>
                </div>
                <span className="text-sm bg-zinc-800 px-2 py-0.5 rounded">
                  {projectCounts.unassigned}
                </span>
              </button>

              {/* Project List */}
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    startTransition(() => setSelectedProjectId(project.id));
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    selectedProjectId === project.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiFolder />
                    <span>{project.name}</span>
                  </div>
                  <span className="text-sm bg-zinc-800 px-2 py-0.5 rounded">
                    {getProjectCount(project.id)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
