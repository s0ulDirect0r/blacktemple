import { sql } from '@/lib/db';
import { GALLERY_PAGE_SIZE } from '@/constants/gallery';
import { ArtworkImage, Project } from '@/types/artwork';
import { ProjectCountSummary } from '@/types/gallery';


interface ArtworkRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  project_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ProjectCountRow {
  id: string;
  name: string;
  image_count: string | number;
}

interface GalleryImagesResult {
  images: ArtworkImage[];
  hasMore: boolean;
}
function mapRowToArtwork(row: ArtworkRow): ArtworkImage {
  return {
    id: row.id,
    url: row.url,
    metadata: {
      title: row.title,
      description: row.description ?? undefined,
      projectId: row.project_id ?? undefined,
      tags: row.tags ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function getGalleryImages({
  projectId = null,
  limit,
  offset = 0,
}: {
  projectId?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<GalleryImagesResult> {
  const params: (string | number)[] = [];
  const clauses: string[] = [
    `SELECT 
      id,
      url,
      title,
      description,
      project_id,
      tags,
      created_at,
      updated_at
    FROM artworks`,
  ];

  if (projectId === 'unassigned') {
    clauses.push('WHERE project_id IS NULL');
  } else if (projectId) {
    params.push(projectId);
    clauses.push(`WHERE project_id = $${params.length}`);
  }

  const normalizedOffset = typeof offset === 'number' && offset > 0 ? Math.floor(offset) : 0;

  let effectiveLimit: number | undefined;
  let detectRemaining = false;

  if (typeof limit === 'number' && !Number.isNaN(limit)) {
    if (limit <= 0) {
      effectiveLimit = undefined;
    } else {
      effectiveLimit = Math.min(limit, 60);
      detectRemaining = true;
    }
  } else {
    effectiveLimit = GALLERY_PAGE_SIZE;
    detectRemaining = true;
  }

  const queryLimit = detectRemaining && typeof effectiveLimit === 'number' ? effectiveLimit + 1 : effectiveLimit;

  clauses.push('ORDER BY created_at DESC');

  if (typeof queryLimit === 'number') {
    params.push(queryLimit);
    clauses.push(`LIMIT $${params.length}`);
  }

  if (normalizedOffset > 0) {
    params.push(normalizedOffset);
    clauses.push(`OFFSET $${params.length}`);
  }

  const query = clauses.join('\n');
  const rows = (await sql(query, params)) as ArtworkRow[];

  let hasMore = false;
  let processedRows: ArtworkRow[] = rows;

  if (detectRemaining && typeof effectiveLimit === 'number' && rows.length > effectiveLimit) {
    hasMore = true;
    processedRows = rows.slice(0, effectiveLimit);
  }

  return {
    images: processedRows.map(mapRowToArtwork),
    hasMore,
  };
}

export async function getGalleryProjects(): Promise<Project[]> {
  const rows = (await sql`
    SELECT id, name, description, created_at
    FROM projects
    ORDER BY name;
  `) as ProjectRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    created_at: row.created_at,
  }));
}

export async function getProjectCountSummary(): Promise<ProjectCountSummary> {
  const [projectCounts, unassignedCount, totalCount] = await Promise.all([
    sql`
      SELECT 
        p.id,
        p.name,
        COUNT(a.id) AS image_count
      FROM projects p
      LEFT JOIN artworks a ON p.id::text = a.project_id
      GROUP BY p.id, p.name
      ORDER BY p.name;
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM artworks
      WHERE project_id IS NULL;
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM artworks;
    `,
  ]);

  const projectCountRows = projectCounts as ProjectCountRow[];
  const unassignedRows = unassignedCount as Array<{ count: string | number }>;
  const totalRows = totalCount as Array<{ count: string | number }>;

  return {
    projects: projectCountRows.map((p) => ({
      id: p.id,
      name: p.name,
      count: Number(p.image_count),
    })),
    unassigned: Number(unassignedRows[0]?.count ?? 0),
    total: Number(totalRows[0]?.count ?? 0),
  };
}
