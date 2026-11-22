-- ============================================================================
-- HEATLEDGER AI: Migration 002 - Notification Preferences Alignment
-- Fixes schema mismatch by ensuring structured boolean columns and composite uniqueness.
-- Rollback Note: Forward-only migration.
-- To reverse in disaster recovery: DROP TABLE IF EXISTS notification_preferences;
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    in_app INTEGER NOT NULL DEFAULT 1,
    email INTEGER NOT NULL DEFAULT 1,
    whatsapp INTEGER NOT NULL DEFAULT 0,
    regulatory_deadlines INTEGER NOT NULL DEFAULT 1,
    signoff_alerts INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_org_user ON notification_preferences(organization_id, user_id);
