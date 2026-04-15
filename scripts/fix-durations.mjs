#!/usr/bin/env node
/**
 * duration IS NULL kayıtları için Suno record-info'dan duration alıp yazar.
 */
import { neon } from "@neondatabase/serverless";

const { DATABASE_URL, SUNO_API_KEY } = process.env;
if (!DATABASE_URL || !SUNO_API_KEY) {
  console.error("Eksik env");
  process.exit(1);
}
const SUNO_BASE = "https://api.sunoapi.org";
const sql = neon(DATABASE_URL);

async function fetchTaskSongs(taskId) {
  const res = await fetch(
    `${SUNO_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
    { headers: { Authorization: `Bearer ${SUNO_API_KEY}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data?.response?.sunoData ?? [];
}

const rows = await sql`
  SELECT id, task_id FROM songs
  WHERE duration IS NULL AND task_id IS NOT NULL
`;
console.log(`Güncellenecek: ${rows.length}`);

const byTask = new Map();
for (const r of rows) {
  if (!byTask.has(r.task_id)) byTask.set(r.task_id, []);
  byTask.get(r.task_id).push(r.id);
}

let ok = 0, failed = 0;
for (const [taskId, ids] of byTask) {
  const sunoSongs = await fetchTaskSongs(taskId);
  for (const id of ids) {
    const suno = sunoSongs.find((s) => s.id === id);
    const duration = suno?.duration;
    if (typeof duration === "number" && duration > 0) {
      await sql`UPDATE songs SET duration = ${duration} WHERE id = ${id}`;
      console.log(`  ✓ ${id} duration=${duration}s`);
      ok++;
    } else {
      console.log(`  ✗ ${id} (Suno duration yok)`);
      failed++;
    }
  }
}
console.log(`\n✓ ${ok} | ✗ ${failed}`);
