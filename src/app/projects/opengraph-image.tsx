import { getAllProjects } from '@/lib/mdx';
import {
  Kicker,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  PIXEL_FONT,
  PixelTitle,
  SANS_FONT,
  ogColors,
  ogImage,
} from '@/lib/og';
import { SITE_TITLE } from '@/lib/site';

export const alt = 'Code — software projects by Matthew D. Huff';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Regenerated hourly in the background; crawlers always get the cached PNG.
export const revalidate = 3600;

type ProjectCard = { title: string; description: string; stack: string[] };

const FALLBACK_PROJECTS: ProjectCard[] = [
  {
    title: 'GODCELL',
    description: 'A real-time multiplayer evolution game: begin as a fragile cyber-cell and fight to transcend.',
    stack: ['TypeScript', 'Three.js', 'Socket.io'],
  },
  {
    title: 'Sun Simulator',
    description: 'Real-time 3D visualization of stellar evolution, from nebula collapse to black hole.',
    stack: ['Three.js', 'WebGL', 'GLSL'],
  },
];

function loadProjects(): ProjectCard[] {
  try {
    const projects = getAllProjects()
      .slice(0, 2)
      .map((p) => ({ title: p.title, description: p.description, stack: p.techStack.slice(0, 4) }));
    return projects.length > 0 ? projects : FALLBACK_PROJECTS;
  } catch (error) {
    console.error('[og] projects: could not read MDX projects:', error);
    return FALLBACK_PROJECTS;
  }
}

export default async function Image() {
  const projects = loadProjects();

  return ogImage(
    <OgFrame seed={31} align="flex-start">
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Kicker>{SITE_TITLE}</Kicker>
        <PixelTitle size={64}>CODE</PixelTitle>

        <div style={{ display: 'flex', marginTop: 44, gap: 24, width: '100%' }}>
          {projects.map((project) => (
            <div
              key={project.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '28px 30px',
                backgroundColor: 'rgba(24, 24, 27, 0.85)',
                border: `2px solid ${ogColors.border}`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: PIXEL_FONT,
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: ogColors.fg,
                }}
              >
                {project.title.toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: SANS_FONT,
                  fontSize: 19,
                  lineHeight: 1.45,
                  color: ogColors.muted,
                  marginTop: 16,
                }}
              >
                {project.description}
              </div>
              {project.stack.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    fontFamily: SANS_FONT,
                    fontSize: 15,
                    color: ogColors.faint,
                    marginTop: 18,
                  }}
                >
                  {project.stack.join(' · ')}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </OgFrame>
  );
}
