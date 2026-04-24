-- Sprint 6 migration — job_runs tablosu
-- Script'lerin son çalıştırma geçmişini admin UI'da göstermek için.

CREATE TABLE IF NOT EXISTS job_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name     TEXT NOT NULL,             -- 'audit-songs', 'backfill-bunny', vb.
  status       TEXT NOT NULL,             -- 'running' | 'success' | 'error'
  mode         TEXT,                      -- 'dry-run' | 'execute' | null
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  duration_ms  INTEGER,
  args         JSONB,                     -- script argümanları (opsiyonel)
  summary      JSONB,                     -- başarılı sonuç özeti (rowcount vb.)
  error        TEXT,                      -- hata mesajı (eğer status='error')
  host         TEXT,                      -- hangi makine/servis çalıştırdı
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name_time
  ON job_runs (job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status
  ON job_runs (status, started_at DESC);
