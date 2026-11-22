-- ============================================================================
-- HEATLEDGER AI: Comprehensive Row-Level Security & Mass-Balance (Prompt S4)
-- Enforces cross-tenant database isolation, session context setting,
-- service-role permissions, and anti-phantom mass-balance trigger enforcement.
-- Rollback Note: Forward-only migration.
-- To reverse in disaster recovery:
-- DROP TRIGGER IF EXISTS trg_enforce_mass_balance ON shipment_items;
-- DROP FUNCTION IF EXISTS enforce_mass_balance_conservation();
-- ============================================================================

-- Function: Extract active tenant organization ID from session variable or JWT claim
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.org_id', true), '')::uuid,
        NULLIF(current_setting('app.current_organization_id', true), '')::uuid,
        NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'org_id', '')::uuid
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if active caller is the authorized background service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.is_service_role', true), '')::boolean,
        (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'),
        false
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 1. Enable & Force Row Level Security on all Multi-Tenant Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
    payload_json TEXT NOT NULL,
    retries INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants FORCE ROW LEVEL SECURITY;

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields FORCE ROW LEVEL SECURITY;

ALTER TABLE mill_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mill_certificates FORCE ROW LEVEL SECURITY;

ALTER TABLE heat_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_numbers FORCE ROW LEVEL SECURITY;

ALTER TABLE chemistry_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemistry_results FORCE ROW LEVEL SECURITY;

ALTER TABLE mechanical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanical_results FORCE ROW LEVEL SECURITY;

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments FORCE ROW LEVEL SECURITY;

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items FORCE ROW LEVEL SECURITY;

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE outgoing_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_certificates FORCE ROW LEVEL SECURITY;

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures FORCE ROW LEVEL SECURITY;

ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers FORCE ROW LEVEL SECURITY;

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links FORCE ROW LEVEL SECURITY;

ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations FORCE ROW LEVEL SECURITY;

ALTER TABLE energy_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_inputs FORCE ROW LEVEL SECURITY;

ALTER TABLE cbam_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_calculations FORCE ROW LEVEL SECURITY;

ALTER TABLE rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_results FORCE ROW LEVEL SECURITY;

ALTER TABLE supplier_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE supplier_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_responses FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE auth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_refresh_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Tenant Isolation Policies (Strict organization_id Matching)
-- ----------------------------------------------------------------------------

-- Organizations Table
DROP POLICY IF EXISTS tenant_isolation_organizations ON organizations;
CREATE POLICY tenant_isolation_organizations ON organizations
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (id = current_org_id() OR parent_org_id = current_org_id()))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND id = current_org_id())
        OR is_service_role()
    );

-- Plants Table
DROP POLICY IF EXISTS tenant_isolation_plants ON plants;
CREATE POLICY tenant_isolation_plants ON plants
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Memberships Table
DROP POLICY IF EXISTS tenant_isolation_memberships ON memberships;
CREATE POLICY tenant_isolation_memberships ON memberships
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- API Keys Table
DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;
CREATE POLICY tenant_isolation_api_keys ON api_keys
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Suppliers Table
DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers;
CREATE POLICY tenant_isolation_suppliers ON suppliers
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Documents Table
DROP POLICY IF EXISTS tenant_isolation_documents ON documents;
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Extraction Runs Table
DROP POLICY IF EXISTS tenant_isolation_extraction_runs ON extraction_runs;
CREATE POLICY tenant_isolation_extraction_runs ON extraction_runs
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Extracted Fields Table
DROP POLICY IF EXISTS tenant_isolation_extracted_fields ON extracted_fields;
CREATE POLICY tenant_isolation_extracted_fields ON extracted_fields
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Mill Certificates Table
DROP POLICY IF EXISTS tenant_isolation_mill_certificates ON mill_certificates;
CREATE POLICY tenant_isolation_mill_certificates ON mill_certificates
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Heat Numbers Table
DROP POLICY IF EXISTS tenant_isolation_heat_numbers ON heat_numbers;
CREATE POLICY tenant_isolation_heat_numbers ON heat_numbers
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Chemistry Results Table
DROP POLICY IF EXISTS tenant_isolation_chemistry_results ON chemistry_results;
CREATE POLICY tenant_isolation_chemistry_results ON chemistry_results
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Mechanical Results Table
DROP POLICY IF EXISTS tenant_isolation_mechanical_results ON mechanical_results;
CREATE POLICY tenant_isolation_mechanical_results ON mechanical_results
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Shipments Table
DROP POLICY IF EXISTS tenant_isolation_shipments ON shipments;
CREATE POLICY tenant_isolation_shipments ON shipments
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Shipment Items Table
DROP POLICY IF EXISTS tenant_isolation_shipment_items ON shipment_items;
CREATE POLICY tenant_isolation_shipment_items ON shipment_items
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Ledger Entries Table
DROP POLICY IF EXISTS tenant_isolation_ledger_entries ON ledger_entries;
CREATE POLICY tenant_isolation_ledger_entries ON ledger_entries
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Outgoing Certificates Table
DROP POLICY IF EXISTS tenant_isolation_outgoing_certificates ON outgoing_certificates;
CREATE POLICY tenant_isolation_outgoing_certificates ON outgoing_certificates
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Signatures Table
DROP POLICY IF EXISTS tenant_isolation_signatures ON signatures;
CREATE POLICY tenant_isolation_signatures ON signatures
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Dossiers Table
DROP POLICY IF EXISTS tenant_isolation_dossiers ON dossiers;
CREATE POLICY tenant_isolation_dossiers ON dossiers
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Share Links Table
DROP POLICY IF EXISTS tenant_isolation_share_links ON share_links;
CREATE POLICY tenant_isolation_share_links ON share_links
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Installations Table
DROP POLICY IF EXISTS tenant_isolation_installations ON installations;
CREATE POLICY tenant_isolation_installations ON installations
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Energy Inputs Table
DROP POLICY IF EXISTS tenant_isolation_energy_inputs ON energy_inputs;
CREATE POLICY tenant_isolation_energy_inputs ON energy_inputs
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- CBAM Calculations Table
DROP POLICY IF EXISTS tenant_isolation_cbam_calculations ON cbam_calculations;
CREATE POLICY tenant_isolation_cbam_calculations ON cbam_calculations
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Rule Results Table
DROP POLICY IF EXISTS tenant_isolation_rule_results ON rule_results;
CREATE POLICY tenant_isolation_rule_results ON rule_results
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Supplier Requests Table
DROP POLICY IF EXISTS tenant_isolation_supplier_requests ON supplier_requests;
CREATE POLICY tenant_isolation_supplier_requests ON supplier_requests
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Supplier Responses Table
DROP POLICY IF EXISTS tenant_isolation_supplier_responses ON supplier_responses;
CREATE POLICY tenant_isolation_supplier_responses ON supplier_responses
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Audit Log Table
DROP POLICY IF EXISTS tenant_isolation_audit_log ON audit_log;
CREATE POLICY tenant_isolation_audit_log ON audit_log
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND (organization_id = current_org_id() OR organization_id IN (SELECT id FROM organizations WHERE parent_org_id = current_org_id())))
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Notifications Table
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Notification Preferences Table
DROP POLICY IF EXISTS tenant_isolation_notification_preferences ON notification_preferences;
CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Webhooks Table
DROP POLICY IF EXISTS tenant_isolation_webhooks ON webhooks;
CREATE POLICY tenant_isolation_webhooks ON webhooks
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Subscriptions Table
DROP POLICY IF EXISTS tenant_isolation_subscriptions ON subscriptions;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Invoices Table
DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Auth Refresh Tokens Table
DROP POLICY IF EXISTS tenant_isolation_auth_refresh_tokens ON auth_refresh_tokens;
CREATE POLICY tenant_isolation_auth_refresh_tokens ON auth_refresh_tokens
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- Background Jobs Table
DROP POLICY IF EXISTS tenant_isolation_background_jobs ON background_jobs;
CREATE POLICY tenant_isolation_background_jobs ON background_jobs
    FOR ALL
    USING (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    )
    WITH CHECK (
        (current_org_id() IS NOT NULL AND organization_id = current_org_id())
        OR is_service_role()
    );

-- ----------------------------------------------------------------------------
-- 3. Anti-Phantom Mass-Balance Conservation Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_mass_balance_conservation()
RETURNS TRIGGER AS $$
DECLARE
    v_initial_weight BIGINT;
    v_total_allocated BIGINT;
BEGIN
    SELECT initial_weight_grams INTO v_initial_weight
    FROM heat_numbers
    WHERE id = NEW.heat_id;

    IF v_initial_weight IS NULL THEN
        RAISE EXCEPTION 'Referenced Heat Number % does not exist in plant records.', NEW.heat_id;
    END IF;

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
