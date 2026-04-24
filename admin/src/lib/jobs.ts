import sql from "@/lib/db";

export interface JobRun {
  id: string;
  jobName: string;
  status: "running" | "success" | "error";
  mode: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  args: unknown;
  summary: unknown;
  error: string | null;
  host: string | null;
}

export interface JobStatusSummary {
  jobName: string;
  lastStatus: string | null;
  lastStartedAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
}

/**
 * Her job için son çalışma durumu + istatistik. Catalog'daki her isim için
 * bir satır döner (hiç çalışmamışsa lastStatus = null).
 */
export async function getJobStatuses(
  jobNames: string[],
): Promise<Map<string, JobStatusSummary>> {
  if (jobNames.length === 0) return new Map();

  const rows = (await sql`
    WITH last_run AS (
      SELECT DISTINCT ON (job_name)
        job_name, status, started_at, duration_ms, error
      FROM job_runs
      WHERE job_name = ANY(${jobNames}::text[])
      ORDER BY job_name, started_at DESC
    ),
    stats AS (
      SELECT job_name,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'success')::int AS ok,
             COUNT(*) FILTER (WHERE status = 'error')::int AS err
      FROM job_runs
      WHERE job_name = ANY(${jobNames}::text[])
      GROUP BY job_name
    )
    SELECT
      l.job_name,
      l.status,
      l.started_at,
      l.duration_ms,
      l.error,
      COALESCE(s.total, 0) AS total,
      COALESCE(s.ok, 0)    AS ok,
      COALESCE(s.err, 0)   AS err
    FROM last_run l
    LEFT JOIN stats s ON s.job_name = l.job_name
  `) as {
    job_name: string;
    status: string;
    started_at: string;
    duration_ms: number | null;
    error: string | null;
    total: number;
    ok: number;
    err: number;
  }[];

  const out = new Map<string, JobStatusSummary>();
  for (const r of rows) {
    out.set(r.job_name, {
      jobName: r.job_name,
      lastStatus: r.status,
      lastStartedAt: r.started_at,
      lastDurationMs: r.duration_ms,
      lastError: r.error,
      totalRuns: r.total,
      successRuns: r.ok,
      errorRuns: r.err,
    });
  }
  return out;
}

/**
 * Bir job için son N çalışma.
 */
export async function getJobRuns(
  jobName: string,
  limit = 20,
): Promise<JobRun[]> {
  const rows = (await sql`
    SELECT id, job_name, status, mode, started_at, finished_at,
           duration_ms, args, summary, error, host
    FROM job_runs
    WHERE job_name = ${jobName}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    job_name: string;
    status: string;
    mode: string | null;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    args: unknown;
    summary: unknown;
    error: string | null;
    host: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    jobName: r.job_name,
    status: r.status as JobRun["status"],
    mode: r.mode,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationMs: r.duration_ms,
    args: r.args,
    summary: r.summary,
    error: r.error,
    host: r.host,
  }));
}
