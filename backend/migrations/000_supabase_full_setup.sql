-- ============================================================================
-- HEATLEDGER AI: Complete Supabase PostgreSQL Schema Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates ALL tables needed for the application to function.
-- ============================================================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. CORE AUTH TABLES (used by auth_service.py)
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    parent_org_id TEXT,
    is_consultant_portal BOOLEAN DEFAULT FALSE,
    is_sandbox INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
    updated_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    emp_id TEXT,
    designation TEXT,
    totp_secret_hex TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    email_verified INTEGER NOT NULL DEFAULT 1,
    last_step_up_at INTEGER,
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'QA_INSPECTOR', 'DISPATCH', 'VIEWER')),
    emp_id TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
    UNIQUE(user_id, organization_id)
);

-- =============================================
-- 2. SESSION & TOKEN TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS user_totp_recovery_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    used_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_totp_recovery_user ON user_totp_recovery_codes(user_id, used);

CREATE TABLE IF NOT EXISTS email_verifications (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    rate_key TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    window_start REAL NOT NULL,
    locked_until REAL NOT NULL DEFAULT 0,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_otp_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_email_purpose ON auth_otp_codes(email, purpose, used);

CREATE TABLE IF NOT EXISTS suppressed_emails (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_dispatch_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    template_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    message_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_unsubscribes (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_invitations (
    token TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    plant_id TEXT,
    invited_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- =============================================
-- 3. PLANTS & SUPPLIERS
-- =============================================

CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unlocode TEXT NOT NULL DEFAULT 'IN CCU',
    city TEXT NOT NULL DEFAULT 'Kolkata',
    state TEXT NOT NULL DEFAULT 'West Bengal',
    latitude NUMERIC(9, 6) NOT NULL DEFAULT 22.5726,
    longitude NUMERIC(9, 6) NOT NULL DEFAULT 88.3639,
    eu_installation_id TEXT NOT NULL DEFAULT 'IN-EU-01',
    created_at TEXT DEFAULT (NOW()::TEXT),
    updated_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mill_code TEXT,
    country_iso TEXT NOT NULL DEFAULT 'IN',
    contact_email TEXT,
    contact_phone TEXT,
    tier TEXT DEFAULT 'STANDARD',
    score REAL DEFAULT 50.0,
    last_cert_date TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT 'read',
    expires_at TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 4. DOCUMENTS & EXTRACTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id TEXT,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    uploaded_by TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS extraction_runs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'needs_manual_entry', 'failed')),
    model_used TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    duration_ms INT NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS extracted_fields (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    extraction_run_id TEXT NOT NULL REFERENCES extraction_runs(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    raw_value TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    page_number INT NOT NULL DEFAULT 1,
    bounding_box JSONB,
    corrected_value TEXT,
    corrected_by TEXT,
    corrected_at TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 5. METALLURGY & STANDARDS
-- =============================================

CREATE TABLE IF NOT EXISTS standards (
    id TEXT PRIMARY KEY,
    standard_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cn_codes TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS standard_limits (
    id TEXT PRIMARY KEY,
    standard_id TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    element_or_property TEXT NOT NULL,
    min_value NUMERIC(10, 4),
    max_value NUMERIC(10, 4),
    unit TEXT NOT NULL DEFAULT '%',
    UNIQUE(standard_id, element_or_property)
);

CREATE TABLE IF NOT EXISTS mill_certificates (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    supplier_id TEXT,
    certificate_number TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    standard_id TEXT,
    melt_and_pour_country TEXT NOT NULL DEFAULT 'IN',
    melting_route TEXT NOT NULL DEFAULT 'Basic Oxygen Furnace (BOF) / CC',
    has_explicit_melt_attestation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT DEFAULT (NOW()::TEXT),
    UNIQUE(organization_id, certificate_number)
);

CREATE TABLE IF NOT EXISTS heat_numbers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mill_certificate_id TEXT,
    heat_number TEXT NOT NULL,
    initial_weight_grams BIGINT NOT NULL DEFAULT 1000 CHECK (initial_weight_grams > 0),
    available_weight_grams BIGINT NOT NULL DEFAULT 1000 CHECK (available_weight_grams >= 0),
    allocated_weight_grams BIGINT NOT NULL DEFAULT 0 CHECK (allocated_weight_grams >= 0),
    cev_value NUMERIC(6, 4),
    cev_pass BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT (NOW()::TEXT),
    UNIQUE(organization_id, heat_number)
);

CREATE TABLE IF NOT EXISTS heats (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    heat_number TEXT NOT NULL,
    grade TEXT DEFAULT '',
    weight_kg REAL DEFAULT 0,
    supplier_id TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS chemistry_results (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    heat_id TEXT NOT NULL REFERENCES heat_numbers(id) ON DELETE CASCADE,
    element TEXT NOT NULL,
    measured_pct NUMERIC(6, 4) NOT NULL,
    min_spec NUMERIC(6, 4),
    max_spec NUMERIC(6, 4),
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL')),
    page_number INT DEFAULT 1,
    bounding_box JSONB,
    UNIQUE(heat_id, element)
);

CREATE TABLE IF NOT EXISTS mechanical_results (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    heat_id TEXT NOT NULL REFERENCES heat_numbers(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    measured_value NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    min_spec NUMERIC(10, 2),
    max_spec NUMERIC(10, 2),
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL')),
    UNIQUE(heat_id, property_name)
);

-- =============================================
-- 6. SHIPMENTS & TRACEABILITY LEDGER
-- =============================================

CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id TEXT,
    invoice_number TEXT NOT NULL,
    buyer_name TEXT NOT NULL DEFAULT '',
    destination_country TEXT NOT NULL DEFAULT 'DE',
    cn_code TEXT NOT NULL DEFAULT '7307',
    net_weight_grams BIGINT NOT NULL DEFAULT 1000,
    gross_weight_grams BIGINT NOT NULL DEFAULT 1000,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED', 'SIGNED', 'DISPATCHED', 'CLEARED')),
    departure_date TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT),
    updated_at TEXT DEFAULT (NOW()::TEXT),
    UNIQUE(organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS shipment_items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    heat_id TEXT NOT NULL REFERENCES heat_numbers(id) ON DELETE RESTRICT,
    allocated_weight_grams BIGINT NOT NULL CHECK (allocated_weight_grams > 0),
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id TEXT,
    heat_id TEXT,
    shipment_id TEXT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('CREDIT_RECEIPT', 'DEBIT_SHIPMENT', 'SCRAP_ADJUSTMENT')),
    quantity_grams BIGINT NOT NULL,
    balance_after_grams BIGINT NOT NULL CHECK (balance_after_grams >= 0),
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 7. DOSSIERS & CRYPTOGRAPHIC SIGNATURES
-- =============================================

CREATE TABLE IF NOT EXISTS outgoing_certificates (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id TEXT,
    certificate_number TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    compliance_mode TEXT NOT NULL DEFAULT 'TRANSFORMED_3_1',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    outgoing_cert_id TEXT,
    signer_id TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signature_type TEXT NOT NULL DEFAULT 'HMAC-SHA256',
    hmac_signature TEXT NOT NULL,
    canonical_message TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS signature_records (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    verification_code TEXT UNIQUE NOT NULL,
    signer_user_id TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_role TEXT NOT NULL DEFAULT 'QA_INSPECTOR',
    signer_designation TEXT DEFAULT 'Quality Assurance',
    invoice_number TEXT NOT NULL,
    heat_numbers TEXT NOT NULL DEFAULT '[]',
    pdf_sha256 TEXT NOT NULL,
    upstream_sha256 TEXT DEFAULT '',
    key_id TEXT NOT NULL,
    public_key_b64 TEXT NOT NULL,
    signature_b64 TEXT NOT NULL,
    canonical_message TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'VALID',
    superseded_by TEXT,
    revoked_at TEXT,
    revoked_reason TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS dossiers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id TEXT,
    pdf_storage_path TEXT NOT NULL DEFAULT '',
    xml_storage_path TEXT,
    sha256_pdf TEXT NOT NULL DEFAULT '',
    sha256_xml TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS share_links (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    dossier_id TEXT,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    max_views INT DEFAULT 100,
    view_count INT DEFAULT 0,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 8. CBAM & EMISSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS installations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    installation_id TEXT NOT NULL DEFAULT '',
    company_name TEXT NOT NULL DEFAULT '',
    unlocode TEXT NOT NULL DEFAULT '',
    latitude NUMERIC(9, 6) NOT NULL DEFAULT 0,
    longitude NUMERIC(9, 6) NOT NULL DEFAULT 0,
    sector TEXT NOT NULL DEFAULT 'Iron and Steel',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS energy_inputs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id TEXT,
    reporting_period TEXT NOT NULL DEFAULT '2026-Q1',
    grid_kwh NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    solar_kwh NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    fuel_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_production_grams BIGINT NOT NULL DEFAULT 1000,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS cbam_calculations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id TEXT,
    direct_see NUMERIC(8, 4) NOT NULL DEFAULT 0,
    indirect_see NUMERIC(8, 4) NOT NULL DEFAULT 0,
    precursor_see NUMERIC(8, 4) NOT NULL DEFAULT 0,
    actual_see_total NUMERIC(8, 4) NOT NULL DEFAULT 0,
    default_see_total NUMERIC(8, 4) NOT NULL DEFAULT 0,
    ets_price_eur NUMERIC(8, 2) NOT NULL DEFAULT 75.36,
    tax_savings_paise BIGINT NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 9. REGULATIONS & COMPLIANCE RULES
-- =============================================

CREATE TABLE IF NOT EXISTS regulations (
    id TEXT PRIMARY KEY,
    regulation_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    official_journal_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    regulation_id TEXT REFERENCES regulations(id) ON DELETE CASCADE,
    rule_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rule_results (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id TEXT,
    rule_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARNING')),
    message TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS supplier_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'EXPIRED')),
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS supplier_responses (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_id TEXT,
    document_id TEXT,
    submitted_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 10. PLATFORM OPERATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    actor_id TEXT,
    entity_type TEXT DEFAULT '',
    entity_id TEXT DEFAULT '',
    action TEXT NOT NULL,
    resource_type TEXT DEFAULT '',
    resource_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    user_name TEXT DEFAULT '',
    user_role TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    before_state TEXT DEFAULT '',
    after_state TEXT DEFAULT '',
    prev_hash TEXT,
    row_hash TEXT DEFAULT '',
    metadata JSONB,
    timestamp REAL DEFAULT 0,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS background_jobs (
    id TEXT PRIMARY KEY,
    queue_name TEXT NOT NULL DEFAULT 'default',
    payload JSONB NOT NULL DEFAULT '{}',
    priority INT NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    run_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger', 'success')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT DEFAULT '',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'in_app',
    event_type TEXT NOT NULL DEFAULT '*',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT DEFAULT (NOW()::TEXT),
    UNIQUE(user_id, channel, event_type)
);

CREATE TABLE IF NOT EXISTS usage_events (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metric_count INT NOT NULL DEFAULT 1,
    cost_micro_cents BIGINT NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    estimated_containers_month INT DEFAULT 0,
    monthly_containers INT DEFAULT 0,
    notes TEXT DEFAULT '',
    honeypot TEXT DEFAULT '',
    website TEXT DEFAULT '',
    source TEXT DEFAULT 'check_page',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    secret TEXT NOT NULL DEFAULT '',
    events TEXT NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 11. BILLING & SUBSCRIPTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL DEFAULT 'PILOT_AUDIT',
    plan_code TEXT DEFAULT 'PILOT_AUDIT',
    status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
    billing_cycle TEXT DEFAULT 'MONTHLY',
    razorpay_sub_id TEXT,
    current_period_end TEXT NOT NULL DEFAULT (NOW()::TEXT),
    created_at TEXT DEFAULT (NOW()::TEXT),
    updated_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL DEFAULT '',
    amount_paise BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PAID', 'OVERDUE')),
    paid_at TEXT,
    pdf_url TEXT,
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- 12. ADDITIONAL FEATURE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS mill_directory (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    mill_name TEXT NOT NULL,
    country TEXT DEFAULT 'IN',
    contact_email TEXT DEFAULT '',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS mill_chase_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    mill_name TEXT DEFAULT '',
    supplier_id TEXT DEFAULT '',
    heat_number TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- =============================================
-- 13. FUNNEL ANALYTICS (cookie-free)
-- =============================================

CREATE TABLE IF NOT EXISTS funnel_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    session_id TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    ip_hash TEXT DEFAULT '',
    created_at TEXT DEFAULT (NOW()::TEXT)
);

-- =============================================
-- DONE! All tables created.
-- =============================================
SELECT 'SUCCESS: All HeatLedger AI tables created successfully!' AS result;
SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'public';
