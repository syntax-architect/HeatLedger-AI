export interface SupplierItem {
  id: string;
  name: string;
  plant_location: string;
  supplier_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  typical_grades: string[];
  rating_grade: 'A' | 'B' | 'C' | 'D';
  total_certs_processed: number;
  missing_melt_pour_pct: number;
  low_confidence_ocr_pct: number;
  out_of_spec_pct: number;
  avg_turnaround_days: number;
  repeat_defects: string[];
  trend_monthly_defect_pct: number[];
  layout_fingerprint: string;
}

export interface LearnedTemplate {
  mill_id: string;
  mill_name: string;
  fingerprint: string;
  layout_type: string;
  header_labels: string[];
  chemistry_table_bbox: { top: number; left: number; width: number; height: number };
  melt_origin_marker: string;
  confidence_score: number;
  review_time_reduction_pct: number;
  last_seen: string;
}

export interface PoMatchResult {
  status: 'MATCHED' | 'DISCREPANCY_FLAGGED';
  discrepancy_kg: number;
  discrepancy_pct: number;
  message: string;
}
