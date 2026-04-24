-- Sprint 0 migration — admin altyapısı
-- Idempotent: IF NOT EXISTS + DEFAULT'lu kolonlar. Web app'i etkilemez.

-- Admin rol kolonu
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role) WHERE role <> 'user';

-- Soft delete alanları (ban + takedown)
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS takedown_at TIMESTAMPTZ;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS takedown_reason TEXT;

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      TEXT NOT NULL,
  admin_email   TEXT,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  before_state  JSONB,
  after_state   JSONB,
  payload       JSONB,
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin_time
  ON admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target
  ON admin_audit_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_time
  ON admin_audit_log (action, created_at DESC);

-- İlk superadmin
UPDATE users SET role = 'superadmin'
  WHERE email = 'emre@dreamadvertising.mk' AND role = 'user';
