import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

// Son 2 saat
const rows = await sql`
  SELECT task_id, prompt, status, created_at
  FROM tasks
  WHERE status IN ('processing', 'failed')
    AND created_at > NOW() - INTERVAL '2 hours'
  ORDER BY created_at DESC
`;
console.log(`Son 2 saatte aktif task: ${rows.length}`);
for (const r of rows) {
  const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 1000);
  console.log(`  [${r.status}] ${r.task_id.slice(0, 12)} | ${r.prompt?.slice(0, 40)} | ${Math.floor(age / 60)}dk ${age % 60}sn`);
}

// 10dk+ processing olanları failed yap
const result = await sql`
  UPDATE tasks
  SET status = 'failed',
      error_title = 'Zaman aşımı',
      error_message = 'Üretim 10 dakikadan uzun sürdü ve cevap gelmedi. Krediler iade edilmiş olabilir — lütfen tekrar dene.'
  WHERE status = 'processing'
    AND created_at < NOW() - INTERVAL '10 minutes'
  RETURNING task_id
`;
console.log(`\n${result.length} stale task failed olarak işaretlendi`);
