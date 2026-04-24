import sql from "@/lib/db";

export interface ReportEntry {
  id: string;
  reporterId: string;
  reporterEmail: string | null;
  reporterDisplayName: string | null;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface ReportGroup {
  targetType: string;
  targetId: string;
  count: number;
  firstReportedAt: string;
  lastReportedAt: string;
  reports: ReportEntry[];
  /** target_type === 'song' için doldurulur */
  song: {
    id: string;
    title: string;
    imageKey: string | null;
    audioKey: string | null;
    creatorId: string | null;
    creatorEmail: string | null;
    creatorDisplayName: string | null;
    takedownAt: string | null;
    status: string;
  } | null;
  /** target_type === 'user' için doldurulur */
  user: {
    id: string;
    email: string;
    displayName: string;
    bannedAt: string | null;
  } | null;
  /** target_type === 'comment' için doldurulur */
  comment: {
    id: string;
    body: string;
    songId: string;
    authorId: string;
    authorEmail: string | null;
  } | null;
}

export interface ReportSearchParams {
  status?: string; // all | open | dismissed | actioned
  targetType?: string; // all | song | user | comment
  limit: number;
  offset: number;
}

export async function searchReportGroups(
  params: ReportSearchParams,
): Promise<{ groups: ReportGroup[]; totalReports: number }> {
  const status =
    params.status && params.status !== "all" ? params.status : null;
  const targetType =
    params.targetType && params.targetType !== "all" ? params.targetType : null;

  // Tüm raporları çek, uygulamada grupla (küçük hacim; scale'de farklı strateji)
  const rows = (await sql`
    SELECT r.id, r.reporter_id, r.target_type, r.target_id,
           r.reason, r.note, r.status, r.created_at,
           u.email AS reporter_email, u.display_name AS reporter_display_name
    FROM reports r
    LEFT JOIN users u ON u.id::text = r.reporter_id
    WHERE (${status}::text IS NULL OR r.status = ${status})
      AND (${targetType}::text IS NULL OR r.target_type = ${targetType})
    ORDER BY r.created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    reporter_id: string;
    target_type: string;
    target_id: string;
    reason: string;
    note: string | null;
    status: string;
    created_at: string;
    reporter_email: string | null;
    reporter_display_name: string | null;
  }[];

  const totalReports = rows.length;

  // Grupla
  const map = new Map<string, ReportGroup>();
  for (const r of rows) {
    const key = `${r.target_type}:${r.target_id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        targetType: r.target_type,
        targetId: r.target_id,
        count: 0,
        firstReportedAt: r.created_at,
        lastReportedAt: r.created_at,
        reports: [],
        song: null,
        user: null,
        comment: null,
      };
      map.set(key, g);
    }
    g.reports.push({
      id: r.id,
      reporterId: r.reporter_id,
      reporterEmail: r.reporter_email,
      reporterDisplayName: r.reporter_display_name,
      reason: r.reason,
      note: r.note,
      status: r.status,
      createdAt: r.created_at,
    });
    g.count += 1;
    if (r.created_at < g.firstReportedAt) g.firstReportedAt = r.created_at;
    if (r.created_at > g.lastReportedAt) g.lastReportedAt = r.created_at;
  }

  // Target detaylarını toplu hydrate et
  const songIds: string[] = [];
  const userIds: string[] = [];
  const commentIds: string[] = [];
  for (const g of map.values()) {
    if (g.targetType === "song") songIds.push(g.targetId);
    else if (g.targetType === "user") userIds.push(g.targetId);
    else if (g.targetType === "comment") commentIds.push(g.targetId);
  }

  if (songIds.length > 0) {
    const songs = (await sql`
      SELECT s.id, s.title, s.image_key, s.audio_key,
             s.status, s.takedown_at, s.created_by,
             u.email AS creator_email, u.display_name AS creator_display_name
      FROM songs s
      LEFT JOIN users u ON u.id::text = s.created_by
      WHERE s.id = ANY(${songIds}::text[])
    `) as {
      id: string;
      title: string;
      image_key: string | null;
      audio_key: string | null;
      status: string;
      takedown_at: string | null;
      created_by: string | null;
      creator_email: string | null;
      creator_display_name: string | null;
    }[];
    for (const s of songs) {
      const g = map.get(`song:${s.id}`);
      if (g) {
        g.song = {
          id: s.id,
          title: s.title,
          imageKey: s.image_key,
          audioKey: s.audio_key,
          status: s.status,
          takedownAt: s.takedown_at,
          creatorId: s.created_by,
          creatorEmail: s.creator_email,
          creatorDisplayName: s.creator_display_name,
        };
      }
    }
  }

  if (userIds.length > 0) {
    const users = (await sql`
      SELECT id::text, email, display_name, banned_at
      FROM users WHERE id::text = ANY(${userIds}::text[])
    `) as {
      id: string;
      email: string;
      display_name: string;
      banned_at: string | null;
    }[];
    for (const u of users) {
      const g = map.get(`user:${u.id}`);
      if (g) {
        g.user = {
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          bannedAt: u.banned_at,
        };
      }
    }
  }

  if (commentIds.length > 0) {
    const comments = (await sql`
      SELECT c.id, c.body, c.song_id, c.user_id,
             u.email AS author_email
      FROM song_comments c
      LEFT JOIN users u ON u.id::text = c.user_id
      WHERE c.id = ANY(${commentIds}::text[])
    `) as {
      id: string;
      body: string;
      song_id: string;
      user_id: string;
      author_email: string | null;
    }[];
    for (const c of comments) {
      const g = map.get(`comment:${c.id}`);
      if (g) {
        g.comment = {
          id: c.id,
          body: c.body,
          songId: c.song_id,
          authorId: c.user_id,
          authorEmail: c.author_email,
        };
      }
    }
  }

  const groups = Array.from(map.values()).sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return b.lastReportedAt.localeCompare(a.lastReportedAt);
  });

  return { groups, totalReports };
}

export async function countOpenReports(): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM reports WHERE status = 'open'
  `) as { c: number }[];
  return rows[0]?.c ?? 0;
}
