-- Sprint 9 migration — push altyapısı

-- push_subscriptions: web app (src/app/api/push/subscribe/route.ts) tarafından
-- lazy yaratılır; kimse abone olmadıysa mevcut olmaz. Admin sayfasının
-- crash etmemesi için burada idempotent olarak yaratılır (web app ile
-- şema uyumlu).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin broadcast push notification geçmişi.
CREATE TABLE IF NOT EXISTS push_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          TEXT NOT NULL,
  admin_email       TEXT,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  url               TEXT,
  segment_plan      TEXT,                          -- 'all' | 'free' | 'pro' | 'premier'
  segment_filter    JSONB,                         -- ilerisi için (region, lang vs.)
  target_count      INT NOT NULL DEFAULT 0,
  sent_count        INT NOT NULL DEFAULT 0,
  failed_count      INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'sent' | 'error'
  error             TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_campaigns_time
  ON push_campaigns (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_campaigns_admin
  ON push_campaigns (admin_id, started_at DESC);
