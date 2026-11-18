-- ============================================================================
-- HEATLEDGER AI: Supabase PostgreSQL Database Schema & Mass-Balance Ledger
-- In Conformance with:
--   - EN 10204:2004 Clause 6 & Clause 3.1
--   - EU Regulation 2026/1963 (Melt-and-Pour Verification)
--   - EU Regulation 2023/1773 & UK CBAM (Precursor Traceability & SEE Math)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLE: exporter_plants
-- ============================================================================
CREATE TABLE IF NOT EXISTS exporter_plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    plant_name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    unlocode TEXT NOT NULL, -- e.g., 'IN CCU'
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    eu_installation_id TEXT UNIQUE NOT NULL, -- e.g., 'IN-WB-4409'
    authorised_qa_name TEXT NOT NULL, -- e.g., 'R. K. Chatterjee'
    authorised_qa_designation TEXT NOT NULL, -- e.g., 'Head of Metallurgy & QA'
    qa_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TABLE: metallurgical_standards
-- ============================================================================
CREATE TABLE IF NOT EXISTS metallurgical_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code TEXT UNIQUE NOT NULL, -- e.g., 'ASTM A105', 'ASTM A193 B7'
    description TEXT NOT NULL,
    cn_codes TEXT[] NOT NULL, -- text array of applicable CN codes, e.g. ARRAY['7307', '7326']
    chemical_limits JSONB NOT NULL, -- stores min/max for C, Mn, Si, P, S, Cr, Ni, Mo, V, Cu, CEV
    mechanical_limits JSONB NOT NULL, -- stores min/max for tensile_mpa, yield_mpa, elongation_pct, hardness_hbw
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with 8 Real Industrial Standards across CN 7304, 7306, 7307, 7318, 7308
INSERT INTO metallurgical_standards (standard_code, description, cn_codes, chemical_limits, mechanical_limits)
VALUES
(
    'ASTM A105',
    'Standard Specification for Carbon Steel Forgings for Piping Applications (ASME B16.5)',
    ARRAY['7307', '7326'],
    '{
        "C": {"min": 0.0, "max": 0.35},
        "Mn": {"min": 0.60, "max": 1.05},
        "Si": {"min": 0.10, "max": 0.35},
        "P": {"min": 0.0, "max": 0.035},
        "S": {"min": 0.0, "max": 0.040},
        "Cr": {"min": 0.0, "max": 0.30},
        "Ni": {"min": 0.0, "max": 0.40},
        "Mo": {"min": 0.0, "max": 0.12},
        "V": {"min": 0.0, "max": 0.08},
        "Cu": {"min": 0.0, "max": 0.40},
        "CEV": {"min": 0.0, "max": 0.47}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 485, "max": 720},
        "yield_mpa": {"min": 250, "max": 500},
        "elongation_pct": {"min": 22.0, "max": 100.0},
        "hardness_hbw": {"min": 137, "max": 187}
    }'::jsonb
),
(
    'ASTM A193 Grade B7',
    'High-Tensile Chromium-Molybdenum Alloy Steel Bolting for Pressure Vessels & Flanges',
    ARRAY['7318'],
    '{
        "C": {"min": 0.37, "max": 0.49},
        "Mn": {"min": 0.65, "max": 1.10},
        "Si": {"min": 0.15, "max": 0.35},
        "P": {"min": 0.0, "max": 0.035},
        "S": {"min": 0.0, "max": 0.040},
        "Cr": {"min": 0.75, "max": 1.20},
        "Mo": {"min": 0.15, "max": 0.25},
        "CEV": {"min": 0.0, "max": 0.90}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 860, "max": 1100},
        "yield_mpa": {"min": 725, "max": 950},
        "elongation_pct": {"min": 16.0, "max": 100.0},
        "hardness_hbw": {"min": 220, "max": 321}
    }'::jsonb
),
(
    'EN 10216-2 16Mo3',
    'Seamless Steel Tubes for Pressure Purposes - Elevated Temperature Alloy Steel',
    ARRAY['7304'],
    '{
        "C": {"min": 0.12, "max": 0.20},
        "Mn": {"min": 0.40, "max": 0.90},
        "Si": {"min": 0.10, "max": 0.35},
        "P": {"min": 0.0, "max": 0.025},
        "S": {"min": 0.0, "max": 0.015},
        "Mo": {"min": 0.25, "max": 0.35},
        "Cr": {"min": 0.0, "max": 0.30},
        "CEV": {"min": 0.0, "max": 0.45}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 450, "max": 600},
        "yield_mpa": {"min": 280, "max": 500},
        "elongation_pct": {"min": 22.0, "max": 100.0},
        "hardness_hbw": {"min": 130, "max": 180}
    }'::jsonb
),
(
    'EN 10217-1 P235TR1',
    'Welded Steel Tubes for Pressure Purposes - Specified Room Temperature Properties',
    ARRAY['7306'],
    '{
        "C": {"min": 0.0, "max": 0.16},
        "Mn": {"min": 0.0, "max": 1.20},
        "Si": {"min": 0.0, "max": 0.35},
        "P": {"min": 0.0, "max": 0.025},
        "S": {"min": 0.0, "max": 0.020},
        "Cr": {"min": 0.0, "max": 0.30},
        "CEV": {"min": 0.0, "max": 0.40}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 360, "max": 500},
        "yield_mpa": {"min": 235, "max": 450},
        "elongation_pct": {"min": 25.0, "max": 100.0},
        "hardness_hbw": {"min": 110, "max": 160}
    }'::jsonb
),
(
    'EN 10025 S355JR',
    'Hot Rolled Structural Steel for Fabrications, Towers, Bridges and Engineered Structures',
    ARRAY['7308', '7214'],
    '{
        "C": {"min": 0.0, "max": 0.24},
        "Mn": {"min": 0.0, "max": 1.60},
        "Si": {"min": 0.0, "max": 0.55},
        "P": {"min": 0.0, "max": 0.035},
        "S": {"min": 0.0, "max": 0.035},
        "CEV": {"min": 0.0, "max": 0.45}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 470, "max": 630},
        "yield_mpa": {"min": 355, "max": 550},
        "elongation_pct": {"min": 22.0, "max": 100.0},
        "hardness_hbw": {"min": 140, "max": 190}
    }'::jsonb
),
(
    'ASTM A53 Grade B',
    'Standard Specification for Pipe, Steel, Black and Hot-Dipped, Zinc-Coated, Welded and Seamless',
    ARRAY['7305', '7306'],
    '{
        "C": {"min": 0.0, "max": 0.30},
        "Mn": {"min": 0.29, "max": 1.20},
        "P": {"min": 0.0, "max": 0.050},
        "S": {"min": 0.0, "max": 0.045},
        "Cu": {"min": 0.0, "max": 0.40},
        "Ni": {"min": 0.0, "max": 0.40},
        "Cr": {"min": 0.0, "max": 0.40},
        "Mo": {"min": 0.0, "max": 0.15},
        "V": {"min": 0.0, "max": 0.08}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 415, "max": 650},
        "yield_mpa": {"min": 240, "max": 450},
        "elongation_pct": {"min": 21.0, "max": 100.0},
        "hardness_hbw": {"min": 120, "max": 175}
    }'::jsonb
),
(
    'ASTM A350 LF2',
    'Carbon and Low-Alloy Steel Forgings, Requiring Notch Toughness Testing for Piping Components',
    ARRAY['7307'],
    '{
        "C": {"min": 0.0, "max": 0.30},
        "Mn": {"min": 0.60, "max": 1.35},
        "Si": {"min": 0.15, "max": 0.35},
        "P": {"min": 0.0, "max": 0.035},
        "S": {"min": 0.0, "max": 0.040},
        "CEV": {"min": 0.0, "max": 0.47}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 485, "max": 655},
        "yield_mpa": {"min": 250, "max": 480},
        "elongation_pct": {"min": 22.0, "max": 100.0},
        "hardness_hbw": {"min": 137, "max": 197}
    }'::jsonb
),
(
    'AISI 4140 / 42CrMo4',
    'Direct Hardening Chromium-Molybdenum Quenched & Tempered Bar & Forging Stock',
    ARRAY['7228', '7326'],
    '{
        "C": {"min": 0.38, "max": 0.45},
        "Mn": {"min": 0.60, "max": 0.90},
        "Si": {"min": 0.15, "max": 0.40},
        "P": {"min": 0.0, "max": 0.025},
        "S": {"min": 0.0, "max": 0.035},
        "Cr": {"min": 0.90, "max": 1.20},
        "Mo": {"min": 0.15, "max": 0.30},
        "CEV": {"min": 0.0, "max": 0.85}
    }'::jsonb,
    '{
        "tensile_mpa": {"min": 900, "max": 1150},
        "yield_mpa": {"min": 750, "max": 980},
        "elongation_pct": {"min": 14.0, "max": 100.0},
        "hardness_hbw": {"min": 260, "max": 330}
    }'::jsonb
)
ON CONFLICT (standard_code) DO NOTHING;

-- ============================================================================
-- 3. TABLE: upstream_mill_heats
-- Mass Balance Ledger with strict constraint against phantom heat reuse
-- ============================================================================
CREATE TABLE IF NOT EXISTS upstream_mill_heats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES exporter_plants(id) ON DELETE CASCADE,
    heat_number TEXT NOT NULL,
    mill_name TEXT NOT NULL, -- e.g., 'SAIL Bokaro', 'Tata Steel Jamshedpur', 'JSW'
    country_of_melt_pour VARCHAR(2) NOT NULL DEFAULT 'IN', -- ISO 3166-1 alpha-2
    melting_route TEXT NOT NULL CHECK (melting_route IN ('BF-BOF', 'EAF', 'Induction')),
    certificate_pdf_url TEXT,
    extracted_chemistry JSONB NOT NULL,
    extracted_mechanical JSONB NOT NULL,
    bounding_boxes JSONB NOT NULL, -- stores [page, x0, y0, x1, y1] coordinates
    purchased_mass_tonnes NUMERIC(10, 3) NOT NULL CHECK (purchased_mass_tonnes > 0),
    consumed_mass_tonnes NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    precursor_see_tco2e NUMERIC(8, 4) NOT NULL CHECK (precursor_see_tco2e >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- CHECK CONSTRAINT: A factory can never allocate more tonnes than purchased!
    CONSTRAINT chk_mass_balance_phantom_guard 
        CHECK (consumed_mass_tonnes <= purchased_mass_tonnes)
);

CREATE INDEX IF NOT EXISTS idx_mill_heats_lookup 
    ON upstream_mill_heats(plant_id, heat_number);

-- ============================================================================
-- 4. TABLE: plant_monthly_energy
-- Tracks factory monthly direct & indirect emissions for CBAM calculation
-- ============================================================================
CREATE TABLE IF NOT EXISTS plant_monthly_energy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES exporter_plants(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL, -- First of month, e.g., '2026-01-01'
    electricity_kwh NUMERIC(14, 2) NOT NULL,
    grid_emission_factor NUMERIC(6, 4) NOT NULL DEFAULT 0.8200, -- kg CO2e / kWh for regional grid
    fuel_type TEXT NOT NULL, -- 'Natural Gas', 'LPG', 'Furnace Oil', 'Diesel'
    fuel_quantity NUMERIC(12, 2) NOT NULL, -- Liters or Nm3
    total_production_tonnes NUMERIC(10, 3) NOT NULL CHECK (total_production_tonnes > 0),
    direct_see_per_tonne NUMERIC(8, 4) NOT NULL, -- tCO2e / t
    indirect_see_per_tonne NUMERIC(8, 4) NOT NULL, -- tCO2e / t
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plant_id, billing_month)
);

-- ============================================================================
-- 5. TABLE: export_shipments
-- Container and invoice records destined for EU / UK buyers
-- ============================================================================
CREATE TABLE IF NOT EXISTS export_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES exporter_plants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    destination_country VARCHAR(2) NOT NULL CHECK (destination_country IN ('DE', 'NL', 'IT', 'GB', 'FR', 'ES', 'BE', 'PL')),
    destination_port TEXT NOT NULL,
    cn_code VARCHAR(8) NOT NULL,
    net_mass_tonnes NUMERIC(10, 3) NOT NULL CHECK (net_mass_tonnes > 0),
    gross_mass_tonnes NUMERIC(10, 3) NOT NULL,
    compliance_mode TEXT NOT NULL CHECK (compliance_mode IN ('TRANSFORMED_3_1', 'CLAUSE_6_PASSTHROUGH')),
    qa_signed_by TEXT,
    qa_signed_at TIMESTAMPTZ,
    total_see_tco2e NUMERIC(8, 4),
    dossier_zip_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. TABLE: shipment_heat_allocations
-- Junction table linking export shipments to upstream mill heats
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipment_heat_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES export_shipments(id) ON DELETE CASCADE,
    heat_id UUID NOT NULL REFERENCES upstream_mill_heats(id) ON DELETE RESTRICT,
    allocated_mass_tonnes NUMERIC(10, 3) NOT NULL CHECK (allocated_mass_tonnes > 0),
    scrap_loss_ratio NUMERIC(5, 4) NOT NULL DEFAULT 1.0800, -- e.g. 1.08 = 8% scrap loss
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shipment_id, heat_id)
);

-- ============================================================================
-- 7. TRIGGER: Automatic Mass-Balance Increment on upstream_mill_heats
-- Automatically updates consumed_mass_tonnes when a heat is allocated.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_increment_heat_consumption()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE upstream_mill_heats
    SET consumed_mass_tonnes = consumed_mass_tonnes + (NEW.allocated_mass_tonnes * NEW.scrap_loss_ratio),
        updated_at = NOW()
    WHERE id = NEW.heat_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_heat_allocation ON shipment_heat_allocations;
CREATE TRIGGER trg_after_heat_allocation
AFTER INSERT ON shipment_heat_allocations
FOR EACH ROW
EXECUTE FUNCTION fn_increment_heat_consumption();

-- Trigger for deletion / unallocation of shipments
CREATE OR REPLACE FUNCTION fn_decrement_heat_consumption()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE upstream_mill_heats
    SET consumed_mass_tonnes = GREATEST(0, consumed_mass_tonnes - (OLD.allocated_mass_tonnes * OLD.scrap_loss_ratio)),
        updated_at = NOW()
    WHERE id = OLD.heat_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_heat_deallocation ON shipment_heat_allocations;
CREATE TRIGGER trg_after_heat_deallocation
AFTER DELETE ON shipment_heat_allocations
FOR EACH ROW
EXECUTE FUNCTION fn_decrement_heat_consumption();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each exporter plant cannot see or tamper with competitor heats/data.
-- ============================================================================
ALTER TABLE exporter_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE upstream_mill_heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_monthly_energy ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_heat_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metallurgical_standards ENABLE ROW LEVEL SECURITY;

-- Metallurgical standards are read-only public reference for all authenticated users
CREATE POLICY p_standards_read_all ON metallurgical_standards
    FOR SELECT TO authenticated USING (true);

-- Exporter plants policy
CREATE POLICY p_plants_isolation ON exporter_plants
    FOR ALL TO authenticated
    USING (id = (auth.jwt() -> 'app_metadata' ->> 'plant_id')::uuid);

-- Upstream heats policy
CREATE POLICY p_heats_isolation ON upstream_mill_heats
    FOR ALL TO authenticated
    USING (plant_id = (auth.jwt() -> 'app_metadata' ->> 'plant_id')::uuid);

-- Monthly energy policy
CREATE POLICY p_energy_isolation ON plant_monthly_energy
    FOR ALL TO authenticated
    USING (plant_id = (auth.jwt() -> 'app_metadata' ->> 'plant_id')::uuid);

-- Export shipments policy
CREATE POLICY p_shipments_isolation ON export_shipments
    FOR ALL TO authenticated
    USING (plant_id = (auth.jwt() -> 'app_metadata' ->> 'plant_id')::uuid);

-- Shipment allocations policy
CREATE POLICY p_allocations_isolation ON shipment_heat_allocations
    FOR ALL TO authenticated
    USING (
        shipment_id IN (
            SELECT id FROM export_shipments 
            WHERE plant_id = (auth.jwt() -> 'app_metadata' ->> 'plant_id')::uuid
        )
    );
