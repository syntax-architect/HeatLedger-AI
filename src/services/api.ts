/**
 * HEATLEDGER AI: Frontend API Client
 * Connects the React application directly to the FastAPI Backend.
 */

const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

export interface MetallurgyPayload {
  extracted_chemistry: Record<string, number>;
  extracted_mechanical: Record<string, number>;
  standard_chem_limits: Record<string, { min: number; max: number }>;
  standard_mech_limits: Record<string, { min: number; max: number }>;
  standard_code: string;
  country_of_melt_explicit: boolean;
}

export interface CbamCalcPayload {
  invoice_number: string;
  cn_code: string;
  net_shipment_tonnes: number;
  upstream_precursor_see: number;
  scrap_loss_ratio: number;
  monthly_grid_kwh: number;
  monthly_solar_offset_kwh: number;
  monthly_fuel_liters: number;
  monthly_total_production_tonnes: number;
  year?: number;
  eu_ets_price?: number;
}

export const ApiService = {
  /**
   * Check if the backend is online
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Upload an upstream mill certificate for Vision OCR processing
   */
  async uploadMtcPdf(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BACKEND_BASE_URL}/api/ocr/extract-mtc`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('OCR extraction failed');
    return res.json();
  },

  /**
   * Deterministically validate metallurgy & calculate IIW CEV
   */
  async validateMetallurgy(payload: MetallurgyPayload) {
    const res = await fetch(`${BACKEND_BASE_URL}/api/compliance/validate-metallurgy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStringify(payload),
    });
    if (!res.ok) throw new Error('Metallurgy validation failed');
    return res.json();
  },

  /**
   * Calculate recursive precursor & process embedded emissions
   */
  async calculateCbam(payload: CbamCalcPayload) {
    const res = await fetch(`${BACKEND_BASE_URL}/api/compliance/calculate-cbam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStringify(payload),
    });
    if (!res.ok) throw new Error('CBAM calculation failed');
    return res.json();
  },

  /**
   * Generate official EU CBAM Communication XML
   */
  async generateCbamXml(payload: any): Promise<string> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/dossier/generate-xml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStringify(payload),
    });
    if (!res.ok) throw new Error('XML generation failed');
    return res.text();
  }
};

function jsonStringify(obj: any): string {
  return JSON.stringify(obj);
}
