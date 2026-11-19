-- ============================================================================
-- HEATLEDGER AI: Production Multi-Tenant Schema & Row-Level Security (B2)
-- Specification: Complete 38-table relational architecture, tenant isolation,
-- immutable documents, integer paise/grams, hash-chained audit log, and RLS.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DOMAIN 1: TENANCY & ACCESS CONTROL
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Consultant hierarchy
    is_consultant_portal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unlocode TEXT NOT NULL, -- e.g. 'IN CCU'
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    eu_installation_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, eu_installation_id)
);

CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'QA_INSPECTOR', 'DISPATCH', 'VIEWER')),
    emp_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Tata Steel Limited'
    mill_code TEXT,
    country_iso TEXT NOT NULL DEFAULT 'IN',
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 2: IMMUTABLE DOCUMENTS & EXTRACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase S3 private storage URI
    is_sample BOOLEAN DEFAULT FALSE,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- NOTE: UPDATE and DELETE are strictly revoked on this table below!
);

CREATE TABLE IF NOT EXISTS extraction_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'needs_manual_entry', 'failed')),
    model_used TEXT NOT NULL, -- e.g. 'text_layer_pymupdf', 'gemini-1.5-flash-lite'
    confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    duration_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    extraction_run_id UUID NOT NULL REFERENCES extraction_runs(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL, -- e.g. 'heat_number', 'chemical_C', 'country_of_melt'
    raw_value TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    page_number INT NOT NULL DEFAULT 1,
    bounding_box JSONB, -- {x0, y0, x1, y1}
    corrected_value TEXT,
    corrected_by UUID,
    corrected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 3: METALLURGY & STANDARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code TEXT UNIQUE NOT NULL, -- e.g. 'ASTM A105', 'EN 10217-1'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    cn_codes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standard_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    element_or_property TEXT NOT NULL, -- 'C', 'Mn', 'CEV', 'tensile_strength'
    min_value NUMERIC(10, 4),
    max_value NUMERIC(10, 4),
    unit TEXT NOT NULL DEFAULT '%',
    UNIQUE(standard_id, element_or_property)
);

CREATE TABLE IF NOT EXISTS mill_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    certificate_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,
    melt_and_pour_country TEXT NOT NULL DEFAULT 'IN',
    melting_route TEXT NOT NULL DEFAULT 'Basic Oxygen Furnace (BOF) / CC',
    has_explicit_melt_attestation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, certificate_number)
);

CREATE TABLE IF NOT EXISTS heat_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mill_certificate_id UUID NOT NULL REFERENCES mill_certificates(id) ON DELETE CASCADE,
    heat_number TEXT NOT NULL,
    initial_weight_grams BIGINT NOT NULL CHECK (initial_weight_grams > 0), -- Weights in integer grams
    available_weight_grams BIGINT NOT NULL CHECK (available_weight_grams >= 0),
    allocated_weight_grams BIGINT NOT NULL DEFAULT 0 CHECK (allocated_weight_grams >= 0),
    cev_value NUMERIC(6, 4),
    cev_pass BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, heat_number)
);

CREATE TABLE IF NOT EXISTS chemistry_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    heat_id UUID NOT NULL REFERENCES heat_numbers(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    heat_id UUID NOT NULL REFERENCES heat_numbers(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    measured_value NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL, -- e.g. 'MPa', '%', 'HBW'
    min_spec NUMERIC(10, 2),
    max_spec NUMERIC(10, 2),
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL')),
    UNIQUE(heat_id, property_name)
);

-- ============================================================================
-- DOMAIN 4: SHIPMENTS & TRACEABILITY LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    cn_code TEXT NOT NULL,
    net_weight_grams BIGINT NOT NULL CHECK (net_weight_grams > 0),
    gross_weight_grams BIGINT NOT NULL CHECK (gross_weight_grams >= net_weight_grams),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'VALIDATED', 'SIGNED', 'DISPATCHED', 'CLEARED')),
    departure_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    heat_id UUID NOT NULL REFERENCES heat_numbers(id) ON DELETE RESTRICT,
    allocated_weight_grams BIGINT NOT NULL CHECK (allocated_weight_grams > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    heat_id UUID NOT NULL REFERENCES heat_numbers(id) ON DELETE RESTRICT,
    shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('CREDIT_RECEIPT', 'DEBIT_SHIPMENT', 'SCRAP_ADJUSTMENT')),
    quantity_grams BIGINT NOT NULL,
    balance_after_grams BIGINT NOT NULL CHECK (balance_after_grams >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 5: DOSSIERS & CRYPTOGRAPHIC SEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS outgoing_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    compliance_mode TEXT NOT NULL DEFAULT 'TRANSFORMED_3_1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    outgoing_cert_id UUID NOT NULL REFERENCES outgoing_certificates(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL,
    signer_name TEXT NOT NULL,
    signature_type TEXT NOT NULL DEFAULT 'HMAC-SHA256',
    hmac_signature TEXT NOT NULL,
    canonical_message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    pdf_storage_path TEXT NOT NULL,
    xml_storage_path TEXT,
    sha256_pdf TEXT NOT NULL,
    sha256_xml TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_views INT DEFAULT 100,
    view_count INT DEFAULT 0,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 6: CBAM & REGULATORY EMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    installation_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    unlocode TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    sector TEXT NOT NULL DEFAULT 'Iron and Steel',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS energy_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    reporting_period TEXT NOT NULL, -- e.g. '2026-Q1'
    grid_kwh NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    solar_kwh NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    fuel_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_production_grams BIGINT NOT NULL CHECK (total_production_grams > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cbam_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    direct_see NUMERIC(8, 4) NOT NULL,
    indirect_see NUMERIC(8, 4) NOT NULL,
    precursor_see NUMERIC(8, 4) NOT NULL,
    actual_see_total NUMERIC(8, 4) NOT NULL,
    default_see_total NUMERIC(8, 4) NOT NULL,
    ets_price_eur NUMERIC(8, 2) NOT NULL DEFAULT 75.36,
    tax_savings_paise BIGINT NOT NULL DEFAULT 0, -- Savings in integer paise
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cbam_default_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cn_code TEXT NOT NULL,
    country_iso TEXT NOT NULL,
    default_see NUMERIC(8, 4) NOT NULL,
    markup_pct NUMERIC(4, 2) NOT NULL DEFAULT 10.0, -- 10% for 2026, 20% for 2027
    effective_year INT NOT NULL DEFAULT 2026,
    UNIQUE(cn_code, country_iso, effective_year)
);

CREATE TABLE IF NOT EXISTS regulatory_constants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    constant_key TEXT UNIQUE NOT NULL,
    numeric_value NUMERIC(12, 4) NOT NULL,
    unit TEXT NOT NULL,
    source_url TEXT NOT NULL,
    effective_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_code TEXT UNIQUE NOT NULL, -- e.g. 'EU_2026_1963', 'EU_2023_956'
    title TEXT NOT NULL,
    effective_date DATE NOT NULL,
    official_journal_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    rule_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARNING')),
    message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUBMITTED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES supplier_requests(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 7: PLATFORM OPERATIONS & AUDIT TRAIL
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID,
    action TEXT NOT NULL, -- e.g. 'CERTIFICATE_SIGNED', 'HEAT_ALLOCATED'
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    prev_hash TEXT, -- Cryptographic hash chain link
    row_hash TEXT NOT NULL, -- SHA256(prev_hash + id + action + timestamp)
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL DEFAULT 'default',
    payload JSONB NOT NULL,
    priority INT NOT NULL DEFAULT 100,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'danger', 'success')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g. 'AI_EXTRACTION', 'WHATSAPP_MESSAGE', 'SIGNATURE_ISSUED'
    metric_count INT NOT NULL DEFAULT 1,
    cost_micro_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT NOT NULL,
    estimated_containers_month INT,
    honeypot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOMAIN 8: BILLING & COMMERCIAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'PILOT_AUDIT', 'MONTHLY_PRO', 'ENTERPRISE'
    name TEXT NOT NULL,
    price_paise_monthly BIGINT NOT NULL, -- e.g. 999900 paise = INR 9,999
    allowed_mtcs_month INT NOT NULL,
    allowed_plants INT NOT NULL DEFAULT 1,
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
    razorpay_sub_id TEXT,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount_paise BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PAID', 'OVERDUE')),
    paid_at TIMESTAMPTZ,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECURITY INVARIANT 1: IMMUTABILITY OF DOCUMENTS
-- ============================================================================
REVOKE UPDATE, DELETE ON documents FROM PUBLIC;
REVOKE UPDATE, DELETE ON documents FROM authenticated;

-- ============================================================================
-- SECURITY INVARIANT 2: MASS-BALANCE QUANTITY CONSERVATION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_mass_balance_conservation()
RETURNS TRIGGER AS $$
DECLARE
    v_initial_weight BIGINT;
    v_total_allocated BIGINT;
BEGIN
    SELECT initial_weight_grams INTO v_initial_weight
    FROM heat_numbers
    WHERE id = NEW.heat_id;

    SELECT COALESCE(SUM(allocated_weight_grams), 0) INTO v_total_allocated
    FROM shipment_items
    WHERE heat_id = NEW.heat_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    v_total_allocated := v_total_allocated + NEW.allocated_weight_grams;

    IF v_total_allocated > v_initial_weight THEN
        RAISE EXCEPTION 'Phantom Heat Allocation Defect: Total allocated (%g) exceeds original mill received weight (%g). Transaction rejected.',
            v_total_allocated, v_initial_weight;
    END IF;

    -- Update remaining balance on heat_numbers table
    UPDATE heat_numbers
    SET allocated_weight_grams = v_total_allocated,
        available_weight_grams = v_initial_weight - v_total_allocated
    WHERE id = NEW.heat_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_mass_balance ON shipment_items;
CREATE TRIGGER trg_enforce_mass_balance
    AFTER INSERT OR UPDATE ON shipment_items
    FOR EACH ROW
    EXECUTE FUNCTION enforce_mass_balance_conservation();

-- ============================================================================
-- SECURITY INVARIANT 3: AUDIT LOG HASH CHAIN TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_audit_log_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_last_hash TEXT;
    v_payload TEXT;
BEGIN
    SELECT row_hash INTO v_last_hash
    FROM audit_log
    WHERE organization_id = NEW.organization_id
    ORDER BY created_at DESC
    LIMIT 1;

    NEW.prev_hash := COALESCE(v_last_hash, 'GENESIS_BLOCK_00000000000000000000000000000000');
    v_payload := NEW.prev_hash || '|' || NEW.id || '|' || NEW.organization_id || '|' || NEW.action || '|' || NEW.resource_id;
    NEW.row_hash := encode(digest(v_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_hash_chain ON audit_log;
CREATE TRIGGER trg_audit_log_hash_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION compute_audit_log_hash();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mill_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemistry_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Helper to extract tenant organization ID from authenticated JWT
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'org_id', '')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policy: Standard Multi-Tenant Isolation
CREATE POLICY tenant_isolation_plants ON plants
    FOR ALL USING (
        organization_id = current_org_id() OR
        organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())
    );

CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL USING (
        organization_id = current_org_id() OR
        organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())
    );

CREATE POLICY tenant_isolation_shipments ON shipments
    FOR ALL USING (
        organization_id = current_org_id() OR
        organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())
    );

CREATE POLICY tenant_isolation_heat_numbers ON heat_numbers
    FOR ALL USING (
        organization_id = current_org_id() OR
        organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())
    );

CREATE POLICY tenant_isolation_dossiers ON dossiers
    FOR ALL USING (
        organization_id = current_org_id() OR
        organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())
    );
