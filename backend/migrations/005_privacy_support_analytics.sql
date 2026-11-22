-- ============================================================================
-- HEATLEDGER AI: Migration 005 - Privacy, Support & Product Analytics
-- Prompts: R6 & R7
-- Provides:
-- 1. privacy_settings (retention period, AI consent, deletion schedule)
-- 2. privacy_audit_events (statutory audit logging for export and deletion)
-- 3. support_tickets (in-app problem reports with screen name and request id)
-- 4. product_analytics_events (8 canonical lifecycle events without trackers)
--
-- Rollback Note: Forward-only migration.
-- To reverse in disaster recovery:
-- DROP TABLE IF EXISTS product_analytics_events;
-- DROP TABLE IF EXISTS support_tickets;
-- DROP TABLE IF EXISTS privacy_audit_events;
-- DROP TABLE IF EXISTS privacy_settings;
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_settings (
    organization_id TEXT PRIMARY KEY,
    retention_years INTEGER NOT NULL DEFAULT 7,
    ai_extraction_consent INTEGER NOT NULL DEFAULT 1,
    deletion_requested_at TEXT,
    deletion_scheduled_for TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_audit_events (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    screen_name TEXT NOT NULL,
    request_id TEXT,
    message TEXT NOT NULL,
    contact_email TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_analytics_events (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    event_name TEXT NOT NULL,
    properties_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_analytics_org ON product_analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_analytics_event ON product_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON support_tickets(organization_id);
