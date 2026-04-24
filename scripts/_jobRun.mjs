/**
 * Script'ler için run tracking helper'ı.
 *
 * Kullanım:
 *   import { wrapJob } from "./_jobRun.mjs";
 *   await wrapJob({ name: "audit-songs", mode: dryRun ? "dry-run" : "execute" }, async () => {
 *     // ...orijinal script body
 *     return { scanned: 123, fixed: 10 };  // summary — UI'da JSON olarak görünür
 *   });
 *
 * DATABASE_URL yoksa tracking sessizce skip edilir (script yine çalışır).
 */
import { neon } from "@neondatabase/serverless";
import { hostname } from "node:os";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function insertRun(sql, name, mode, args) {
  try {
    const rows = await sql`
      INSERT INTO job_runs (job_name, status, mode, args, host)
      VALUES (${name}, 'running', ${mode ?? null}, ${
        args ? JSON.stringify(args) : null
      }, ${hostname()})
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  } catch (err) {
    // job_runs tablosu yoksa migration yapılmamış demektir; sessiz geç
    console.warn("[jobRun] insertRun skipped:", err?.message ?? err);
    return null;
  }
}

async function finishRun(sql, id, status, durationMs, summary, error) {
  if (!id) return;
  try {
    await sql`
      UPDATE job_runs
      SET status       = ${status},
          finished_at  = NOW(),
          duration_ms  = ${durationMs},
          summary      = ${summary ? JSON.stringify(summary) : null},
          error        = ${error ?? null}
      WHERE id = ${id}
    `;
  } catch (err) {
    console.warn("[jobRun] finishRun skipped:", err?.message ?? err);
  }
}

/**
 * @param {{name: string, mode?: "dry-run"|"execute", args?: object}} opts
 * @param {() => Promise<object|void>} fn
 * @returns {Promise<object|void>}
 */
export async function wrapJob(opts, fn) {
  const sql = getSql();
  const start = Date.now();
  const runId = sql ? await insertRun(sql, opts.name, opts.mode, opts.args) : null;

  try {
    const summary = await fn();
    const dur = Date.now() - start;
    await finishRun(sql, runId, "success", dur, summary ?? null, null);
    return summary;
  } catch (err) {
    const dur = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    await finishRun(sql, runId, "error", dur, null, msg);
    throw err;
  }
}
