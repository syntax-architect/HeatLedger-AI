export type AppMode = 'marketing' | 'dashboard';

export type DashboardView =
  | 'command-center'
  | 'mtc-workbench'
  | 'heat-inventory'
  | 'sign-off-queue'
  | 'cbam-dossier'
  | 'regulation-radar'
  | 'roi-reports'
  | 'supplier-intelligence'
  | 'supplier-requests'
  | 'intake-channels'
  | 'settings';

export interface ChemicalElement {
  symbol: 'C' | 'Mn' | 'Si' | 'P' | 'S' | 'Cr' | 'Ni' | 'Mo' | 'CEV' | string;
  name: string;
  measured: number;
  min: number;
  max: number;
  unit: string;
  status: 'PASS' | 'FAIL_HIGH' | 'FAIL_LOW';
}

export interface ElementLimit {
  min: number;
  max: number;
  unit?: string;
}

export interface StandardMechanicalLimit {
  property: string;
  requirement: string;
  min?: number;
  max?: number;
}

export interface MetallurgicalStandardDef {
  standardCode: string;
  title: string;
  description: string;
  cnCodes: string[];
  matchingPresetId?: string;
  chemistry: Record<string, ElementLimit>;
  mechanics?: StandardMechanicalLimit[];
}

export interface MechanicalProperty {
  property: string;
  measured: string;
  requirement: string;
  status: 'PASS' | 'FAIL';
}

export interface BoundingBox {
  id: string;
  label: string;
  type: 'amber' | 'cobalt' | 'emerald';
  coords: { x: number; y: number; width: number; height: number }; // percentage 0-100
  fieldName: string;
  fieldValue: string;
}

export interface SimulatorPreset {
  id: string;
  code: string;
  title: string;
  route: string;
  heatNumber: string;
  mill: string;
  productType: string;
  meltRoute: string;
  meltCountry: string;
  certNumber: string;
  issueDate: string;
  actualEmissions: number;
  defaultEmissions: number;
  tonnage: number;
  euroSavings: number;
  chemistry: ChemicalElement[];
  mechanics: MechanicalProperty[];
  boundingBoxes: BoundingBox[];
}

export interface CnCodeItem {
  code: string;
  title: string;
  category: string;
  euMeltPourDeadline: string;
  ukMeltPourDeadline: string;
  euCbamStatus: 'MANDATORY_NOW' | 'MANDATORY_2026' | 'EXEMPT_UNTIL_2028';
  ukCbamStatus: string;
  mtcProofRequired: boolean;
  precursorTraceability: boolean;
  notes: string;
}

export interface ShipmentRecord {
  id: string;
  containerInvoice: string;
  buyerName: string;
  destinationPort: string;
  country: string;
  cnCode: string;
  netTonnage: number;
  linkedHeatNumbers: string[];
  metallurgyStatus: '100% WITHIN SPEC' | 'OFF_SPEC_ALERT';
  meltAndPourStatus: 'VERIFIED_INDIA' | 'UNVERIFIED_DEFECT';
  cbamXmlStatus: 'GENERATED_VALID' | 'PENDING_INPUTS';
  specificEmissions: number;
  complianceMode: 'TRANSFORMED_3_1' | 'CLAUSE_6_PASSTHROUGH';
  qaSigned: boolean;
}

export interface HeatInventoryItem {
  heatNumber: string;
  supplierMill: string;
  grade: string;
  totalPurchasedMT: number;
  consumedExportMT: number;
  remainingMT: number;
  precursorSee: number; // tCO2e/t
  status: 'HEALTHY' | 'LOW_BALANCE' | 'EXHAUSTED';
  certRef: string;
  receivedDate: string;
}

export interface ReadinessCheck {
  rule_id: string;
  name: string;
  severity: 'BLOCK' | 'WARN' | 'INFO';
  passed: boolean;
  message: string;
  fix_hint: string;
  field_link: string;
}

export interface ReadinessEvaluation {
  shipment_id: string;
  score: number;
  status: 'READY' | 'FIX_NEEDED' | 'BLOCKED';
  can_release: boolean;
  checks: ReadinessCheck[];
  blocking_failures: number;
  warning_failures: number;
  total_rules: number;
}

export interface ReleaseGateStatus {
  shipment_id: string;
  status: 'DRAFT' | 'RELEASE_REQUESTED' | 'RELEASE_APPROVED' | 'RELEASE_REJECTED';
  readiness_score: number;
  requested_by?: string;
  requested_at?: string;
  approved_by?: string;
  approved_at?: string;
  override_applied?: boolean;
  override_reason?: string;
  evaluation?: ReadinessEvaluation;
}

// --- Prompt P7: Deadline & Regulation Radar ---
export interface RegulationItem {
  id: string;
  jurisdiction: 'EU' | 'UK' | 'GLOBAL';
  title: string;
  summary: string;
  applies_to_cn: string[];
  applies_to_destinations: string[];
  effective_date: string;
  deadline_date?: string | null;
  status: 'IN_FORCE' | 'PROPOSED' | 'UNDER_DISCUSSION';
  legal_act: string;
  source_url: string;
  last_verified: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  action_guidance: string;
  days_remaining: number;
  is_past: boolean;
  is_imminent: boolean;
  is_urgent: boolean;
  relevant_to_plant: boolean;
  calendar_ics_url: string;
  google_calendar_url: string;
  disclaimer: string;
}

export interface BulletinItem {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  jurisdiction: string;
  published_by: string;
  published_at: string;
  tags: string[];
}

// --- Prompt P8: ROI & Proof-of-Value Report ---
export interface RoiMonthlyReport {
  organization_id: string;
  plant_name: string;
  month_period: string;
  baseline_minutes_per_cert: number;
  qa_hourly_rate_inr: number;
  measured_review_minutes_per_cert: number;
  certificates_processed: number;
  total_fields_extracted: number;
  fields_auto_extracted: number;
  fields_manually_corrected: number;
  extraction_accuracy_pct: number;
  hours_saved: number;
  hours_saved_value_inr: number;
  formula_hours_saved: string;
  shipments_released: number;
  shipment_tonnes_released: number;
  blocks_caught_count: number;
  blocks_breakdown: Record<string, number>;
  supplier_corrections_sent: number;
  dossiers_delivered: number;
  buyer_portal_views: number;
  buyer_acceptances: number;
  estimated_cbam_savings_eur: number;
  estimated_cbam_savings_inr: number;
  cbam_disclaimer: string;
  monthly_subscription_cost_inr: number;
  total_value_inr: number;
  roi_multiple: number;
  generated_at: string;
}

export interface RoiAnnualView {
  year: number;
  organization_id: string;
  total_certificates_processed: number;
  total_shipments_released: number;
  total_tonnage_released: number;
  total_blocks_prevented: number;
  total_hours_saved: number;
  hours_saved_formula: string;
  total_estimated_cbam_duty_avoided_eur: number;
  total_estimated_cbam_duty_avoided_inr: number;
  planning_label: string;
  msme_subsidy_application_data: {
    enterprise_name: string;
    enterprise_category: string;
    subsidized_software_scheme: string;
    expenditure_incurred_inr: number;
    claimable_subsidy_amount_inr: number;
    technical_deliverables: string;
    compliance_accreditations: string[];
  };
}

export interface RoiShareLinkResponse {
  token: string;
  share_url: string;
  period: string;
  created_at: string;
}

export interface RoiEmailDigest {
  subject: string;
  plain: string;
  html: string;
}
