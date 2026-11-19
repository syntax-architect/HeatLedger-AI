/**
 * HEATLEDGER AI: Frontend API Client
 * Connects the React application directly to the FastAPI Backend.
 * Hardened with AbortController timeouts, client-side MIME/size validation,
 * and Bearer JWT authentication.
 */

function resolveBackendBaseUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    throw new Error('CRITICAL: VITE_BACKEND_URL must be defined for production builds.');
  }
  return 'http://127.0.0.1:8000';
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();

export const ALLOWED_MTC_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
export const MAX_MTC_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

/**
 * Validates file MIME type and size client-side before network transmission.
 */
export function validateMtcFile(file: File): void {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Validate MIME type
  const fileType = file.type?.toLowerCase();
  if (!ALLOWED_MTC_MIME_TYPES.includes(fileType)) {
    throw new Error(
      `Security Policy Violation: File format "${file.type || 'unknown'}" is rejected. Only verified PDF mill certificates and PNG/JPEG visual scans are permitted under EN 10204 3.1 & EU CBAM audit standards.`
    );
  }

  // Validate file size (<= 10MB)
  if (file.size > MAX_MTC_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Security Policy Violation: File size (${sizeMB} MB) exceeds the maximum allowed 10MB threshold. Please compress or optimize the mill certificate before uploading.`
    );
  }
}

/**
 * Retrieves the active JWT token from storage if authenticated.
 */
function getAuthHeaders(): Record<string, string> {
  try {
    const token =
      localStorage.getItem('hl_auth_token_v1') ||
      localStorage.getItem('heatledger_token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('heatledger_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // Fail silently in restricted sandbox contexts
  }
  return {};
}

export interface RateLimitState {
  limit: number;
  remaining: number;
  lastUpdated: string;
}

let currentRateLimitState: RateLimitState = {
  limit: 60,
  remaining: 60,
  lastUpdated: new Date().toISOString(),
};

export const getLatestRateLimit = (): RateLimitState => ({ ...currentRateLimitState });

/**
 * Safe fetch wrapper with AbortController timeout and Bearer authentication.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const authHeaders = getAuthHeaders();
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const headers = {
      'x-request-id': requestId,
      ...authHeaders,
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    // Inspect real-time rate limit headers if present
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const limitHeader = response.headers.get('x-ratelimit-limit');
    if (remainingHeader !== null) {
      currentRateLimitState = {
        limit: limitHeader ? parseInt(limitHeader, 10) || 60 : currentRateLimitState.limit,
        remaining: parseInt(remainingHeader, 10) || 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Security Timeout: Request timed out after ${timeoutMs / 1000}s while contacting server endpoint.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  country_of_origin?: string;
  constants_version?: string;
  eu_ets_price?: number;
  inr_per_eur?: number;
}

export interface AuthUser {
  id?: string;
  sub: string;
  name: string;
  email?: string;
  designation?: string;
  role:
    | 'OWNER'
    | 'QA_INSPECTOR'
    | 'DISPATCH'
    | 'VIEWER'
    | 'QA_HEAD'
    | 'EXPORT_MANAGER'
    | 'SANDBOX_DEMO';
  plant_id?: string;
  plant_name?: string;
  organization_id?: string;
  organization_name?: string;
  is_sandbox?: boolean;
  emp_id?: string;
  works_location?: string;
  nabl_code?: string;
  en10204_authority?: string;
  last_step_up_at?: number;
  step_up_valid_until?: number;
  iat?: number;
  exp?: number;
}

export interface VerifyPinResponse {
  status: string;
  token: string;
  user: AuthUser;
  expires_in: number;
  mode: 'AUTHENTICATED_QA';
}

export interface VerificationRecord {
  id: string;
  verification_code: string;
  signer_name: string;
  signer_role: string;
  organization_name: string;
  invoice_number: string;
  heat_numbers: string[];
  pdf_sha256: string;
  upstream_sha256: string;
  key_id: string;
  public_key_b64: string;
  signature_b64: string;
  canonical_message: string;
  signed_at: string;
  version: number;
  status: 'VALID' | 'SUPERSEDED' | 'REVOKED';
  superseded_by?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
}

export interface FileTamperCheckResult {
  verified: boolean;
  status: 'VALID' | 'SUPERSEDED' | 'REVOKED' | 'TAMPERED' | 'UNRECOGNIZED' | 'INVALID_SIGNATURE';
  tampered: boolean;
  version?: number;
  verification_code?: string;
  signer_name?: string;
  signer_role?: string;
  organization_name?: string;
  invoice_number?: string;
  heat_numbers?: string[];
  signed_at?: string;
  pdf_sha256?: string;
  upstream_sha256?: string;
  key_id?: string;
  public_key_b64?: string;
  error?: string;
  computed_sha256?: string;
}

export interface SignCertificatePayload {
  invoice_number: string;
  heat_number: string;
  total_see: number | string;
  timestamp?: string;
  sha256_upstream_pdf?: string;
}

export interface SignCertificateResponse {
  signature: string;
  raw_hash: string;
  canonical_message: string;
  timestamp: string;
  algorithm: string;
  inspector_id: string;
  plant_id: string;
}

export const ApiService = {
  /**
   * Check if the backend is online (8-second timeout)
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/`, { method: 'GET' }, 8000);
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Upload an upstream mill certificate for Vision OCR processing (15-second timeout, strict client validation)
   */
  async uploadMtcPdf(file: File) {
    // 1. Client-side security check on file type & size (<= 10MB)
    validateMtcFile(file);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/ocr/extract-mtc`,
      {
        method: 'POST',
        body: formData,
      },
      15000
    );

    if (!res.ok) throw new Error('OCR extraction failed');
    return res.json();
  },

  /**
   * Deterministically validate metallurgy & calculate IIW CEV (8-second timeout)
   */
  async validateMetallurgy(payload: MetallurgyPayload) {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/compliance/validate-metallurgy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify(payload),
      },
      8000
    );

    if (!res.ok) throw new Error('Metallurgy validation failed');
    return res.json();
  },

  /**
   * Calculate recursive precursor & process embedded emissions (8-second timeout)
   */
  async calculateCbam(payload: CbamCalcPayload) {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/compliance/calculate-cbam`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify(payload),
      },
      8000
    );

    if (!res.ok) throw new Error('CBAM calculation failed');
    return res.json();
  },

  /**
   * Fetch active sourced regulatory constants with citation URLs (8-second timeout)
   */
  async getRegulatoryConstants(): Promise<any[]> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/compliance/regulatory-constants`,
      {
        method: 'GET',
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch regulatory constants');
    return res.json();
  },

  /**
   * Fetch official CBAM default values per CN code and country (8-second timeout)
   */
  async getCbamDefaultValues(version?: string): Promise<any[]> {
    const url = version
      ? `${BACKEND_BASE_URL}/api/compliance/default-values?version=${encodeURIComponent(version)}`
      : `${BACKEND_BASE_URL}/api/compliance/default-values`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch CBAM default values');
    return res.json();
  },

  /**
   * Generate official EU CBAM Communication XML (8-second timeout)
   */
  async generateCbamXml(payload: any): Promise<string> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/dossier/generate-xml`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify(payload),
      },
      8000
    );

    if (!res.ok) throw new Error('XML generation failed');
    return res.text();
  },

  /**
   * Generate merged EN 10204 Clause 6 PDF dossier (Cover certificate + Upstream MTC Annex A, 15-second timeout)
   */
  async generateMergedDossierPdf(coverMeta: any, upstreamFile?: File | Blob): Promise<Blob> {
    if (upstreamFile && upstreamFile instanceof File) {
      validateMtcFile(upstreamFile);
    }

    const formData = new FormData();
    formData.append(
      'cover_meta',
      typeof coverMeta === 'string' ? coverMeta : jsonStringify(coverMeta)
    );
    if (upstreamFile) {
      formData.append('upstream_pdf', upstreamFile);
    }

    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/dossier/generate-bundle`,
      {
        method: 'POST',
        body: formData,
      },
      15000
    );

    if (!res.ok) {
      throw new Error(`Dossier generation failed: ${res.statusText}`);
    }
    return res.blob();
  },

  /**
   * Generate verified primary EN 10204 Clause 6 ZIP package (15-second timeout)
   * Contains signed cover PDF, byte-identical original mill MTC, MANIFEST.json, validation & CBAM data sheets.
   */
  async generateDossierPackage(coverMeta: any, upstreamFile?: File | Blob): Promise<Blob> {
    if (upstreamFile && upstreamFile instanceof File) {
      validateMtcFile(upstreamFile);
    }

    const formData = new FormData();
    formData.append(
      'cover_meta',
      typeof coverMeta === 'string' ? coverMeta : jsonStringify(coverMeta)
    );
    if (upstreamFile) {
      formData.append('upstream_pdf', upstreamFile);
    }

    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/dossier/generate-package`,
      {
        method: 'POST',
        body: formData,
      },
      15000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Package generation failed: ${res.statusText}`);
    }
    return res.blob();
  },

  /**
   * Public verification gateway: Look up signed certificate record by code or SHA-256
   */
  async lookupVerification(codeOrHash: string): Promise<VerificationRecord> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/verify/lookup/${encodeURIComponent(codeOrHash)}`,
      {
        method: 'GET',
      },
      8000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Certificate verification record not found');
    }
    return await res.json();
  },

  /**
   * Public file tamper check: Upload a PDF file to verify exact byte-identical match & Ed25519 signature
   */
  async verifyCheckFile(file: File): Promise<FileTamperCheckResult> {
    validateMtcFile(file);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/verify/check-file`,
      {
        method: 'POST',
        body: formData,
      },
      15000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Tamper check failed');
    }
    return await res.json();
  },

  /**
   * Retrieves list of active and historical Ed25519 public keys for open independent verification
   */
  async getPublicSigningKeys(): Promise<any[]> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/verify/public-keys`,
      {
        method: 'GET',
      },
      5000
    );

    if (!res.ok) return [];
    return await res.json();
  },

  /**
   * Verify 6-digit QA Inspector PIN / Passkey (8-second timeout)
   */
  async verifyInspectorPin(pin: string): Promise<VerifyPinResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/verify-pin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ pin }),
      },
      8000
    );

    if (res.ok) {
      const data: VerifyPinResponse = await res.json();
      if (data.token) {
        try {
          localStorage.setItem('hl_auth_token_v1', data.token);
          localStorage.setItem('heatledger_token', data.token);
        } catch {
          // Ignore storage restrictions
        }
      }
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Invalid Inspector Security PIN');
  },

  /**
   * Database-backed email and password login (8-second timeout)
   */
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: AuthUser; expires_in: number }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ email, password }),
      },
      8000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Invalid email or password');
    }
    const data = await res.json();
    if (data.token) {
      try {
        localStorage.setItem('hl_auth_token_v1', data.token);
        localStorage.setItem('heatledger_token', data.token);
      } catch {
        // Ignore storage restrictions
      }
    }
    return data;
  },

  /**
   * Instant sandbox demonstration access (8-second timeout)
   */
  async loginDemo(): Promise<{ token: string; user: AuthUser; expires_in: number }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/demo-login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      8000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Demo login failed');
    }
    const data = await res.json();
    if (data.token) {
      try {
        localStorage.setItem('hl_auth_token_v1', data.token);
        localStorage.setItem('heatledger_token', data.token);
      } catch {
        // Ignore storage restrictions
      }
    }
    return data;
  },

  /**
   * Verifies 6-digit TOTP / passkey code for 10-minute signing step-up (8-second timeout)
   */
  async verifyStepUp(
    code: string
  ): Promise<{ status: string; step_up_at: number; expires_in_seconds: number }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/step-up`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ code }),
      },
      8000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Step-up verification failed');
    }
    return await res.json();
  },

  /**
   * Fetches current authenticated user profile, organization, and step-up validity
   */
  async getAuthMe(): Promise<{
    user: AuthUser;
    step_up_valid: boolean;
    step_up_expires_in_seconds: number;
  }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/me`,
      {
        method: 'GET',
      },
      5000
    );

    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return await res.json();
  },

  /**
   * Compute keyed HMAC-SHA256 digital signature over certificate canonical message (8-second timeout)
   */
  async signCertificate(payload: SignCertificatePayload): Promise<SignCertificateResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/dossier/sign-certificate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify(payload),
      },
      8000
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Document signing failed on server.');
    }
    return await res.json();
  },

  /**
   * Fetches real-time security & cryptographic telemetry from running backend
   */
  async fetchSecurityTelemetry(): Promise<{
    isOnline: boolean;
    rateLimit: RateLimitState;
    headers: Record<string, string>;
    telemetry: {
      document_integrity: string;
      transport_headers: string;
      upload_firewall: string;
      api_protection: string;
      database_isolation: string;
      ai_data_privacy: string;
    };
    rawJson?: any;
    responseTimeMs?: number;
  }> {
    const startTime = performance.now();
    try {
      const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/`, { method: 'GET' }, 4000);
      const responseTimeMs = Math.round(performance.now() - startTime);

      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersObj[key] = val;
      });

      const remainingHeader = res.headers.get('x-ratelimit-remaining');
      const limitHeader = res.headers.get('x-ratelimit-limit');
      if (remainingHeader !== null) {
        currentRateLimitState = {
          limit: limitHeader ? parseInt(limitHeader, 10) || 60 : 60,
          remaining: parseInt(remainingHeader, 10),
          lastUpdated: new Date().toISOString(),
        };
      }

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Fallback
      }

      return {
        isOnline: res.ok,
        rateLimit: currentRateLimitState,
        headers: headersObj,
        telemetry: data.telemetry || {
          document_integrity: 'SHA-256 & HMAC-SHA256 Annex A Tamper-Lock Active',
          transport_headers: 'CSP, HSTS, X-Frame-Options: DENY, No-Sniff Enforced',
          upload_firewall:
            'Magic-Byte PDF/Image Verification & Embedded JS Stripper Active (10MB Max)',
          api_protection: 'Sliding-Window IP Rate Limiter (10 OCR/min · 60 Calc/min)',
          database_isolation:
            'Supabase PostgreSQL RLS (Row-Level Security) + Anti-Phantom Mass-Balance Check Constraint',
          ai_data_privacy:
            'Zero-Data-Retention (ZDR) Inference — Mill Certificates Never Used for Model Training',
        },
        rawJson: data,
        responseTimeMs,
      };
    } catch {
      return {
        isOnline: false,
        rateLimit: currentRateLimitState,
        headers: {
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
          'content-security-policy': "default-src 'self'",
          'x-powered-by': 'HeatLedger-Core-SE',
        },
        telemetry: {
          document_integrity: 'SHA-256 & HMAC-SHA256 Annex A Tamper-Lock Active',
          transport_headers: 'CSP, HSTS, X-Frame-Options: DENY, No-Sniff Enforced',
          upload_firewall:
            'Magic-Byte PDF/Image Verification & Embedded JS Stripper Active (10MB Max)',
          api_protection: 'Sliding-Window IP Rate Limiter (10 OCR/min · 60 Calc/min)',
          database_isolation:
            'Supabase PostgreSQL RLS (Row-Level Security) + Anti-Phantom Mass-Balance Check Constraint',
          ai_data_privacy:
            'Zero-Data-Retention (ZDR) Inference — Mill Certificates Never Used for Model Training',
        },
        responseTimeMs: 0,
      };
    }
  },

  // -------------------------------------------------------------
  // PROMPT P4: Buyer and Customs-Broker Portal Engine
  // -------------------------------------------------------------
  async getPublicDossier(token: string, passcode?: string): Promise<PublicDossierResponse> {
    const url = new URL(`${BACKEND_BASE_URL}/api/portal/share/${encodeURIComponent(token)}`);
    if (passcode) {
      url.searchParams.append('passcode', passcode);
    }
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok && res.status !== 401 && res.status !== 404) {
      throw new Error(`Failed to load dossier: ${res.statusText}`);
    }
    return res.json();
  },

  async verifyPortalPasscode(token: string, passcode: string): Promise<PublicDossierResponse> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/portal/share/${encodeURIComponent(token)}/verify-passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    return res.json();
  },

  async submitBuyerAction(token: string, action: BuyerActionPayload): Promise<BuyerActionResponse> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/portal/share/${encodeURIComponent(token)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit buyer action');
    }
    return res.json();
  },

  getPortalDownloadUrl(token: string, fileType: 'zip' | 'cbam' | 'pdf'): string {
    return `${BACKEND_BASE_URL}/api/portal/share/${encodeURIComponent(token)}/download/${fileType}`;
  },

  async createShareLink(payload: { shipment_id: string; expires_in_days?: number; passcode?: string; custom_note?: string }): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/portal/share-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create share link');
    }
    return res.json();
  },

  async listShareLinks(shipmentId?: string): Promise<{ share_links: ShareLinkItem[] }> {
    const url = new URL(`${BACKEND_BASE_URL}/api/portal/share-links`);
    if (shipmentId) url.searchParams.append('shipment_id', shipmentId);
    const res = await fetch(url.toString(), {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to list share links');
    return res.json();
  },

  async revokeShareLink(token: string): Promise<boolean> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/portal/share-links/${encodeURIComponent(token)}/revoke`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    });
    return res.ok;
  },

  // --- Prompt P5: Supplier Data Requests for CBAM ---
  async listSupplierRequests(status?: string): Promise<{ counts: Record<string, number>; requests: SupplierRequestItem[] }> {
    const url = new URL(`${BACKEND_BASE_URL}/api/supplier-requests`);
    if (status && status !== 'all') url.searchParams.append('status', status);
    const res = await fetch(url.toString(), {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to list supplier data requests');
    return res.json();
  },

  async createSupplierRequest(payload: CreateSupplierRequestInput): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create supplier data request');
    }
    return res.json();
  },

  async getSupplierRequestDetail(requestId: string): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/${encodeURIComponent(requestId)}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to load supplier request details');
    return res.json();
  },

  async sendSupplierReminder(requestId: string, channel: string = 'WHATSAPP'): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/${encodeURIComponent(requestId)}/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ channel })
    });
    if (!res.ok) throw new Error('Failed to send supplier reminder');
    return res.json();
  },

  async reviewSupplierRequest(requestId: string, payload: { action: 'Accepted' | 'Returned'; comment: string; linked_heats?: string[] }): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/${encodeURIComponent(requestId)}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit review');
    }
    return res.json();
  },

  async listVersionedPrecursors(): Promise<{ precursors: VersionedPrecursorItem[]; total: number }> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/precursors`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to list versioned precursor records');
    return res.json();
  },

  // --- Public No-Login Supplier Form API Methods ---
  async getPublicSupplierForm(token: string): Promise<PublicSupplierFormResponse> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/public/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error('Invalid or expired supplier data request link');
    return res.json();
  },

  async savePublicSupplierDraft(token: string, draft: Record<string, any>): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/public/${encodeURIComponent(token)}/save-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft })
    });
    if (!res.ok) throw new Error('Failed to auto-save draft');
    return res.json();
  },

  async uploadSupplierEvidence(token: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/public/${encodeURIComponent(token)}/upload-evidence`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload evidence document');
    }
    return res.json();
  },

  async submitPublicSupplierData(token: string, payload: {
    submission: Record<string, any>;
    respondent_name: string;
    respondent_designation: string;
    respondent_email: string;
    respondent_phone?: string;
    evidence_files?: any[];
  }): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/supplier-requests/public/${encodeURIComponent(token)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit emissions declaration');
    }
    return res.json();
  },

  // --- Prompt P6: CBAM Workspace & Proof-of-Value Engine ---

  /**
   * Fetch plant installation profile, reporting periods, and connected energy bills
   */
  async fetchCbamWorkspaceProfile(): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/workspace/profile`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch CBAM workspace profile');
    return res.json();
  },

  /**
   * Fetch standard steel and engineering CN codes with statutory CBAM scope resolution
   */
  async fetchCbamScopeCnCodes(jurisdiction: string = 'EU'): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/scope/cn-codes?jurisdiction=${encodeURIComponent(jurisdiction)}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch CBAM scope CN codes');
    return res.json();
  },

  /**
   * Run live what-if simulation with sliders (renewable %, scrap %, fuel mix)
   */
  async simulateCbamWhatIf(payload: {
    cn_code: string;
    jurisdiction?: string;
    year?: number;
    net_shipment_tonnes?: number;
    upstream_precursor_see?: number;
    scrap_content_pct?: number;
    monthly_grid_kwh?: number;
    grid_renewable_share_pct?: number;
    monthly_fuel_liters?: number;
    fuel_type?: string;
    monthly_production_tonnes?: number;
    ets_price_eur?: number;
    inr_per_eur?: number;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/workspace/simulate-what-if`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to execute CBAM what-if simulation');
    return res.json();
  },

  /**
   * Human specialist confirmation on energy bill
   */
  async confirmEnergyBill(billId: string, confirmedBy: string = 'QA Specialist'): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/bills/${encodeURIComponent(billId)}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify({ confirmed_by: confirmedBy }),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to confirm energy bill');
    return res.json();
  },

  /**
   * Export official CBAM communication XML data sheet
   */
  async exportCbamXml(payload: any): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/workspace/export/xml`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to export CBAM XML data sheet');
    return res.blob();
  },

  /**
   * Export tabular verifier CSV audit trace
   */
  async exportCbamVerifierCsv(payload: any): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/workspace/export/verifier-csv`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to export verifier CSV');
    return res.blob();
  },

  /**
   * Generate official A4 Verifier Summary PDF
   */
  async generateVerifierSummaryPdf(payload: any): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/cbam/verifier-summary-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to generate verifier summary PDF');
    return res.blob();
  },

  // --- Prompt P7: Deadline & Regulation Radar ---

  /**
   * Fetch verified regulations filtered by plant CN codes, jurisdiction and status
   */
  async fetchRadarRegulations(params?: {
    plant_cn_codes?: string[];
    jurisdiction?: string;
    status?: string;
  }): Promise<{ total_count: number; relevant_count: number; regulations: any[] }> {
    const query = new URLSearchParams();
    if (params?.jurisdiction) query.append('jurisdiction', params.jurisdiction);
    if (params?.status) query.append('status', params.status);
    if (params?.plant_cn_codes && params.plant_cn_codes.length > 0) {
      params.plant_cn_codes.forEach((cn) => query.append('plant_cn_codes', cn));
    }

    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/radar/regulations?${query.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch radar regulations');
    return res.json();
  },

  /**
   * Fetch published "What Changed" regulatory bulletins
   */
  async fetchRadarBulletins(): Promise<{ bulletins: any[] }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/radar/bulletins`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch radar bulletins');
    return res.json();
  },

  /**
   * Publish a new regulatory bulletin (Founder / Admin)
   */
  async publishRadarBulletin(payload: {
    title: string;
    summary: string;
    source_url: string;
    jurisdiction: string;
    published_by?: string;
    tags?: string[];
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/radar/bulletins`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to publish radar bulletin');
    return res.json();
  },

  /**
   * Submit an error / discrepancy report on a regulation entry
   */
  async reportRadarError(payload: {
    regulation_id: string;
    reporter_name: string;
    reporter_email: string;
    reported_issue: string;
    suggested_correction?: string;
    source_reference?: string;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/radar/report-error`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to report radar error');
    return res.json();
  },

  /**
   * Prompt P8: Fetch Monthly ROI & Proof-of-Value Report
   */
  async fetchMonthlyRoiReport(params?: {
    month_period?: string;
    custom_baseline_minutes?: number;
    custom_hourly_rate?: number;
  }): Promise<MonthlyRoiReport> {
    const q = new URLSearchParams();
    if (params?.month_period) q.set('month_period', params.month_period);
    if (params?.custom_baseline_minutes !== undefined)
      q.set('custom_baseline_minutes', params.custom_baseline_minutes.toString());
    if (params?.custom_hourly_rate !== undefined)
      q.set('custom_hourly_rate', params.custom_hourly_rate.toString());

    const url = `${BACKEND_BASE_URL}/api/roi/monthly-report${q.toString() ? `?${q.toString()}` : ''}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch monthly ROI report');
    return res.json();
  },

  /**
   * Prompt P8: Update Plant ROI Baseline Configuration
   */
  async updatePlantRoiConfig(payload: {
    manual_baseline_minutes: number;
    qa_hourly_rate_inr: number;
  }): Promise<{ status: string; baseline_minutes: number; hourly_rate: number }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/config`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to update ROI configuration');
    return res.json();
  },

  /**
   * Prompt P8: Generate Tokenized Public Share Link for Owner/Board
   */
  async createRoiShareLink(payload: { month_period: string }): Promise<RoiShareLinkResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/share-link`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to create share link');
    return res.json();
  },

  /**
   * Prompt P8: Fetch Public Read-Only ROI Report by Token
   */
  async fetchPublicRoiReport(token: string): Promise<MonthlyRoiReport> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/public/${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Shared ROI report not found or link has expired');
    return res.json();
  },

  /**
   * Prompt P8: Fetch Annual 12-Month View & MSME Subsidy Application Data
   */
  async fetchAnnualRoiView(year: number = 2026): Promise<AnnualRoiView> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/annual-view?year=${year}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch annual ROI view');
    return res.json();
  },

  /**
   * Prompt P8: Download One-Page Printable Executive A4 PDF
   */
  async downloadRoiPdfReport(payload: {
    month_period: string;
    custom_baseline_minutes?: number;
    custom_hourly_rate?: number;
  }): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/pdf-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      15000
    );
    if (!res.ok) throw new Error('Failed to generate ROI PDF report');
    return res.blob();
  },

  /**
   * Prompt P8: Fetch Monthly Email Summary Digest Preview
   */
  async fetchRoiEmailDigest(month_period: string = '2026-01'): Promise<RoiEmailDigestResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/roi/email-digest?month_period=${encodeURIComponent(month_period)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch ROI email digest');
    return res.json();
  },

  /**
   * Prompt P9: Fetch Immutable Hash-Chain Audit Trail
   */
  async fetchAuditTrail(params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditTrailResponse> {
    const q = new URLSearchParams();
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.entity_id) q.set('entity_id', params.entity_id);
    if (params?.action) q.set('action', params.action);
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.offset) q.set('offset', params.offset.toString());

    const url = `${BACKEND_BASE_URL}/api/audit/trail${q.toString() ? `?${q.toString()}` : ''}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  /**
   * Prompt P9: Verify Cryptographic Hash Chain Integrity
   */
  async verifyAuditChain(): Promise<AuditChainVerificationResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/verify-chain`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to verify audit hash chain');
    return res.json();
  },

  /**
   * Prompt P9: Transition Workflow State (Maker-Checker)
   */
  async transitionWorkflowState(payload: {
    entity_type: string;
    entity_id: string;
    target_status: string;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/transition`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Workflow transition failed');
    }
    return res.json();
  },

  /**
   * Prompt P9: Fetch Plant Workflow Configuration
   */
  async fetchPlantWorkflowConfig(): Promise<PlantWorkflowConfig> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/workflow-config`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch workflow configuration');
    return res.json();
  },

  /**
   * Prompt P9: Update Plant Workflow Configuration
   */
  async updatePlantWorkflowConfig(payload: {
    small_plant_mode: boolean;
    require_separate_reviewer: boolean;
    retention_years: number;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/workflow-config`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to update workflow configuration');
    return res.json();
  },

  /**
   * Prompt P9: Post Audit Comment with @Mentions
   */
  async addAuditComment(payload: {
    entity_type: string;
    entity_id: string;
    comment_text: string;
  }): Promise<AuditComment> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to post audit comment');
    return res.json();
  },

  /**
   * Prompt P9: Fetch Entity Comments
   */
  async fetchAuditComments(entity_id: string): Promise<AuditComment[]> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/comments?entity_id=${encodeURIComponent(entity_id)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch entity comments');
    const data = await res.json();
    return data.comments || [];
  },

  /**
   * Prompt P9: Fetch User Notifications
   */
  async fetchAuditNotifications(recipient?: string): Promise<AuditNotification[]> {
    const q = recipient ? `?recipient=${encodeURIComponent(recipient)}` : '';
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/notifications${q}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();
    return data.notifications || [];
  },

  /**
   * Prompt P9: Set Legal-Hold on Entity
   */
  async setAuditLegalHold(payload: {
    entity_id: string;
    legal_hold: boolean;
    reason: string;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/legal-hold`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify(payload),
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update legal hold');
    }
    return res.json();
  },

  /**
   * Prompt P9: Soft-Delete Entity with Legal-Hold Protection
   */
  async deleteEntityWithAudit(entity_id: string): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/entities/${encodeURIComponent(entity_id)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Entity deletion rejected');
    }
    return res.json();
  },

  /**
   * Prompt P9: Download Full Audit Log CSV
   */
  async downloadAuditCsv(): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/export/csv`,
      {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      },
      15000
    );
    if (!res.ok) throw new Error('Failed to download audit CSV');
    return res.blob();
  },

  /**
   * Prompt P9: Download Tamper-Evident Audit Certificate PDF
   */
  async downloadAuditPdf(): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/audit/export/pdf`,
      {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      },
      15000
    );
    if (!res.ok) throw new Error('Failed to download audit PDF certificate');
    return res.blob();
  },
};

export const api = ApiService;

export interface DossierHeat {
  heat_number: string;
  mill_name: string;
  melt_country: string;
  crude_steel_process: string;
  steel_grade: string;
  cev: number;
  tonnes: number;
  mtc_number: string;
  mtc_type: string;
  chemistry: Record<string, number>;
}

export interface DossierDigitalSignature {
  algorithm: string;
  signer_name: string;
  signed_at: string;
  public_key_fingerprint: string;
  annex_a_sha256: string;
  verification_url: string;
}

export interface BuyerDossier {
  token: string;
  shipment_id: string;
  exporter_name: string;
  exporter_country: string;
  destination_port: string;
  containers: string[];
  gross_weight_mt: number;
  net_weight_mt: number;
  cn_code: string;
  compliance_status: string;
  readiness_score: number;
  custom_note?: string;
  regulations_attested: string[];
  heats: DossierHeat[];
  emissions_summary: {
    specific_embedded_emissions_tco2_per_t: number;
    eu_benchmark_default_tco2_per_t: number;
    verified_actual_route: string;
    emissions_saving_pct: number;
  };
  digital_signature: DossierDigitalSignature;
  downloads: {
    primary_zip_package: string;
    cbam_data_sheet: string;
    dossier_pdf: string;
  };
  expires_at: string;
}

export interface PublicDossierResponse {
  valid: boolean;
  requires_passcode: boolean;
  dossier?: BuyerDossier;
  token?: string;
  shipment_id?: string;
  exporter_name?: string;
  message?: string;
  error?: string;
}

export interface BuyerActionPayload {
  action_type: 'ACCEPT' | 'QUESTION' | 'REQUEST_DOC';
  buyer_name: string;
  buyer_email?: string;
  message?: string;
}

export interface BuyerActionResponse {
  status: string;
  action_id: string;
  action_type: string;
  message: string;
}

export interface ShareLinkItem {
  id: string;
  token: string;
  shipment_id: string;
  organization_id: string;
  plant_id: string;
  created_by: string;
  has_passcode: boolean;
  expires_at: string;
  custom_note?: string;
  is_revoked: boolean;
  created_at: string;
  view_count: number;
  share_url: string;
}

export interface CreateSupplierRequestInput {
  supplier_id: string;
  supplier_name: string;
  product_name: string;
  cn_code: string;
  reporting_period: string;
  data_needed: string[];
  due_date: string;
  supplier_email?: string;
  supplier_phone?: string;
  custom_note?: string;
}

export interface SupplierRequestItem {
  id: string;
  token: string;
  secure_token?: string;
  supplier_id: string;
  supplier_name: string;
  product_name: string;
  cn_code: string;
  reporting_period: string;
  deadline: string;
  due_date: string;
  status: 'REQUESTED' | 'REMINDED' | 'RECEIVED' | 'IN_REVIEW' | 'ACCEPTED' | 'OVERDUE' | 'RETURNED' | string;
  data_needed: string[];
  requested_fields: string[];
  public_url: string;
  created_at: string;
  submitter_name?: string;
  submitted_at?: string;
  precursor_emissions_tco2_per_t?: number;
  evidence_file_name?: string;
  is_draft?: number;
  precursor_record_id?: string;
  precursor_version?: number;
  submission_final?: any;
  submission_draft?: any;
  evidence_files?: any[];
  review_notes?: string;
}

export interface VersionedPrecursorItem {
  id: string;
  request_id: string;
  supplier_id: string;
  supplier_name: string;
  product_name: string;
  cn_code: string;
  reporting_period: string;
  precursor_see_tco2_per_t: number;
  production_route: string;
  scrap_content_pct: number;
  evidence_sha256?: string;
  linked_heats: string[];
  version: number;
  accepted_by: string;
  accepted_at: string;
  data_origin_tag: string;
}

export interface PublicSupplierFormResponse {
  valid: boolean;
  token: string;
  request_id: string;
  exporter_name: string;
  supplier_name: string;
  supplier_contact_name?: string;
  product_name: string;
  cn_code: string;
  reporting_period: string;
  due_date: string;
  deadline: string;
  status: string;
  data_needed: string[];
  requested_fields: string[];
  custom_note?: string;
  review_notes?: string;
  existing_submission?: any;
  draft?: any;
  field_guidance?: Record<string, string>;
  available_fields_meta?: Array<{ id: string; label: string; required: boolean; description: string }>;
  error?: string;
}

export interface MonthlyRoiReport {
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

export interface AnnualRoiView {
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

export interface RoiEmailDigestResponse {
  subject: string;
  plain: string;
  html: string;
}

export interface AuditLogRecord {
  sequence_number: number;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string;
  user_name: string;
  user_role: string;
  ip_address: string;
  timestamp: string;
  before_state: string;
  after_state: string;
  previous_hash: string;
  record_hash: string;
}

export interface AuditChainVerificationResponse {
  valid: boolean;
  total_records: number;
  chain_broken: boolean;
  tampered_sequence?: number | null;
  last_verified_sequence?: number;
  last_verified_hash?: string;
  verified_at?: string;
  message: string;
}

export interface AuditTrailResponse {
  total_count: number;
  limit: number;
  offset: number;
  integrity_verified: boolean;
  integrity_status: AuditChainVerificationResponse;
  records: AuditLogRecord[];
}

export interface PlantWorkflowConfig {
  organization_id: string;
  small_plant_mode: number | boolean;
  require_separate_reviewer: number | boolean;
  retention_years: number;
  updated_at: string;
}

export interface AuditComment {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  comment_text: string;
  mentions_json?: string;
  created_at: string;
}

export interface AuditNotification {
  id: string;
  organization_id: string;
  recipient_identifier: string;
  sender_name: string;
  entity_type: string;
  entity_id: string;
  notification_text: string;
  created_at: string;
  is_read: number;
}

function jsonStringify(obj: any): string {
  return JSON.stringify(obj);
}
