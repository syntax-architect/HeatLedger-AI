-- ============================================================================
-- HEATLEDGER AI: Migration 003 - Auth Sessions, Refresh Tokens & TOTP Recovery
-- Provides database-backed token rotation, single-use recovery codes, and reset tokens.
-- Rollback Note: Forward-only migration.
-- To reverse in disaster recovery:
-- DROP TABLE IF EXISTS password_reset_tokens;
-- DROP TABLE IF EXISTS totp_recovery_codes;
-- DROP TABLE IF EXISTS refresh_tokens;
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    replaced_by TEXT,
    ip_address TEXT,
    user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS user_totp_recovery_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_totp_recovery_user ON user_totp_recovery_codes(user_id, used);
