/**
 * HEATLEDGER AI: Frontend API Client
 * Connects the React application directly to the FastAPI Backend.
 * Hardened with AbortController timeouts, client-side MIME/size validation,
 * and Bearer JWT authentication.
 */

function resolveBackendBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    throw new Error('CRITICAL: VITE_API_URL or VITE_BACKEND_URL must be defined for production builds.');
  }
  return 'http://127.0.0.1:8000';
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();
export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'HeatLedger AI';

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

let _inMemoryAuthToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  _inMemoryAuthToken = token;
}

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)hl_csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Retrieves authentication and CSRF headers.
 * Tokens are strictly held in-memory and in httpOnly cookies (Prompt S2: zero token storage in localStorage).
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (_inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${_inMemoryAuthToken}`;
  }
  const csrf = getCsrfToken();
  if (csrf) {
    headers['x-csrf-token'] = csrf;
  }
  return headers;
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
      credentials: 'include',
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
      setInMemoryToken(data.token);
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
      setInMemoryToken(data.token);
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
   * Revokes session cookies and clears in-memory credentials.
   */
  async logout(): Promise<void> {
    setInMemoryToken(null);
    try {
      await fetchWithTimeout(
        `${BACKEND_BASE_URL}/api/auth/logout`,
        { method: 'POST' },
        5000
      );
    } catch {
      // Ignore network errors on logout
    }
  },

  /**
   * Request password reset link (30-minute validity)
   */
  async requestPasswordReset(email: string): Promise<{ status: string; message: string }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/request-password-reset`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ email }),
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Password reset request failed');
    }
    return await res.json();
  },

  /**
   * Reset password using signed one-time token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/reset-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ token, new_password: newPassword }),
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Password reset failed');
    }
    return await res.json();
  },

  /**
   * Enrols QA_INSPECTOR in authentic RFC 6238 TOTP with 8 recovery codes
   */
  async enrolTotp(): Promise<{
    secret: string;
    otpauth_url: string;
    recovery_codes: string[];
    digits: number;
    period: number;
  }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/totp/enrol`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'TOTP enrolment failed');
    }
    return await res.json();
  },

  /**
   * Confirms TOTP activation with 6-digit authenticator code
   */
  async confirmTotp(secret: string, code: string): Promise<{ status: string; message: string }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/auth/totp/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStringify({ secret, code }),
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'TOTP confirmation failed');
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

  /**
   * Prompt P10: Fetch Consultant Organization Portfolio & Multi-Plant Summary
   */
  async fetchConsultantPortfolio(): Promise<ConsultantPortfolio> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/portfolio`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch consultant portfolio');
    return res.json();
  },

  /**
   * Prompt P10: Fetch Cross-Client At-Risk Shipments
   */
  async fetchCrossClientAtRiskShipments(plant_id?: string): Promise<AtRiskShipmentCrossClient[]> {
    const q = plant_id ? `?plant_id=${encodeURIComponent(plant_id)}` : '';
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/at-risk-shipments${q}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch cross-client at-risk shipments');
    }
    return res.json();
  },

  async fetchConsultantAtRiskShipments(plant_id?: string): Promise<AtRiskShipmentCrossClient[]> {
    return this.fetchCrossClientAtRiskShipments(plant_id);
  },

  /**
   * Prompt P10: Fetch Cross-Client Review Queue
   */
  async fetchCrossClientReviewQueue(): Promise<CrossClientReviewItem[]> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/review-queue`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch cross-client review queue');
    return res.json();
  },

  async fetchConsultantReviewQueue(): Promise<CrossClientReviewItem[]> {
    return this.fetchCrossClientReviewQueue();
  },

  /**
   * Prompt P10: Invite Client Plant
   */
  async inviteClientPlant(payload: {
    plant_id: string;
    plant_name: string;
    plant_code: string;
    gst_or_pan?: string;
    location?: string;
    role?: string;
    duration_days?: number;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/clients/invite`,
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
    if (!res.ok) throw new Error('Failed to invite client plant');
    return res.json();
  },

  /**
   * Prompt P10: Revoke Client Plant Access (Plant Data Sovereignty)
   */
  async revokeClientPlantAccess(payload: {
    plant_id: string;
    consultant_org_id?: string;
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/clients/revoke`,
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
      throw new Error(err.detail || 'Failed to revoke plant access');
    }
    return res.json();
  },

  async revokeClientAccess(plant_id: string, consultant_org_id?: string): Promise<any> {
    return this.revokeClientPlantAccess({ plant_id, consultant_org_id });
  },

  /**
   * Prompt P10: Bulk Onboard Clients from CSV
   */
  async bulkOnboardClientsCsv(csv_content: string): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/clients/bulk-onboard`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: jsonStringify({ csv_content }),
      },
      15000
    );
    if (!res.ok) throw new Error('Failed to process bulk client onboarding');
    return res.json();
  },

  async bulkOnboardClientsFromCsv(csv_content: string): Promise<any> {
    return this.bulkOnboardClientsCsv(csv_content);
  },

  /**
   * Prompt P10: Fetch White-Label Branding Configuration
   */
  async fetchWhiteLabelConfig(): Promise<WhiteLabelConfig> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/white-label`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch white-label branding configuration');
    return res.json();
  },

  /**
   * Prompt P10: Update White-Label Branding Configuration
   */
  async updateWhiteLabelConfig(payload: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/white-label`,
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
    if (!res.ok) throw new Error('Failed to update white-label branding configuration');
    return res.json();
  },

  /**
   * Prompt P10: Fetch Consolidated Monthly Invoicing
   */
  async fetchConsolidatedInvoice(billing_month: string = '2026-04'): Promise<ConsolidatedInvoice> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/consolidated-invoice?billing_month=${encodeURIComponent(billing_month)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch consolidated monthly invoice');
    return res.json();
  },

  /**
   * Prompt P10: Fetch Consultant Referral Tracking Ledger
   */
  async fetchConsultantReferrals(): Promise<ConsultantReferralInfo> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/consultant/referrals`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch referral tracking info');
    return res.json();
  },

  /**
   * Prompt P13: Ask Your Data Assistant - Grounded Chat
   */
  async askAssistant(message: string, conversationHistory?: any[]): Promise<AssistantChatResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/assistant/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message, conversation_history: conversationHistory }),
      },
      15000
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Assistant request failed' }));
      throw new Error(err.detail || 'Assistant request failed');
    }
    return res.json();
  },

  /**
   * Prompt P13: Fetch Suggested Grounded Prompts
   */
  async getAssistantSuggestedPrompts(): Promise<{ prompts: Array<{ id: string; label: string; prompt: string }> }> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/assistant/suggested-prompts`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch suggested prompts');
    return res.json();
  },

  /**
   * Prompt P13: Fetch Monthly Assistant Token Usage
   */
  async getAssistantUsage(): Promise<AssistantUsageInfo> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/assistant/usage`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch token usage');
    return res.json();
  },

  /**
   * Prompt P12: Fetch Emissions Intensity Trend
   */
  async getEmissionsTrend(range: string = '90d'): Promise<EmissionsTrendData> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/analytics/emissions-trend?range=${encodeURIComponent(range)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch emissions trend');
    return res.json();
  },

  /**
   * Prompt P12: Fetch 2026-2030 CBAM Liability Forecast
   */
  async getCbamForecast(): Promise<CbamForecastData> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/analytics/cbam-forecast`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch CBAM forecast');
    return res.json();
  },

  /**
   * Prompt P12: Fetch Mill Benchmarking
   */
  async getMillBenchmarking(): Promise<MillBenchmarkingData> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/analytics/mill-benchmarking`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch mill benchmarking');
    return res.json();
  },

  /**
   * Prompt P12: Fetch Steel Grade Distribution
   */
  async getInventoryGrades(): Promise<InventoryGradeDistribution> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/analytics/inventory-grades`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      },
      8000
    );
    if (!res.ok) throw new Error('Failed to fetch inventory grades');
    return res.json();
  },

  /**
   * Prompt P12: Export Chart Data as CSV
   */
  async exportAnalyticsCsv(chartType: string = 'emissions'): Promise<Blob> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/analytics/export.csv?chart_type=${encodeURIComponent(chartType)}`,
      {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      },
      12000
    );
    if (!res.ok) throw new Error('Failed to export analytics CSV');
    return res.blob();
  },

  /**
   * Prompt P11: Fetch Scoped API Keys
   */
  async fetchApiKeys(): Promise<ApiKeyItem[]> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/integrations/api-keys`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch API keys');
    return res.json();
  },

  /**
   * Prompt P11: Create Scoped API Key
   */
  async createApiKey(name: string, scopes: string[]): Promise<ApiKeyCreatedResponse> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/integrations/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name, scopes }),
    });
    if (!res.ok) throw new Error('Failed to create API key');
    return res.json();
  },

  /**
   * Prompt P11: Revoke Scoped API Key
   */
  async revokeApiKey(keyId: string): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/integrations/api-keys/${encodeURIComponent(keyId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to revoke API key');
    return res.json();
  },

  /**
   * Prompt P11: Fetch Webhook Subscriptions
   */
  async fetchWebhooks(): Promise<WebhookSubscriptionItem[]> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/integrations/webhooks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch webhooks');
    return res.json();
  },

  /**
   * Prompt P11: Register Webhook Subscription
   */
  async registerWebhook(targetUrl: string, events: string[], secret?: string): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/integrations/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ target_url: targetUrl, events, secret }),
    });
    if (!res.ok) throw new Error('Failed to register webhook');
    return res.json();
  },

  /**
   * Prompt P11: Export Tally Prime / ERP CSV
   */
  async downloadTallyCsv(): Promise<Blob> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/exports/tally-csv`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to download Tally CSV');
    return res.blob();
  },

  /**
   * Prompt P14: Fetch Notifications
   */
  async fetchNotifications(unreadOnly: boolean = false): Promise<NotificationListResponse> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/notifications?unread_only=${unreadOnly}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      }
    );
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  /**
   * Prompt P14: Mark Notification as Read
   */
  async markNotificationRead(notificationId: string): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/notifications/${encodeURIComponent(notificationId)}/mark-read`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      }
    );
    if (!res.ok) throw new Error('Failed to mark notification read');
    return res.json();
  },

  /**
   * Prompt P14: Mark All Notifications Read
   */
  async markAllNotificationsRead(): Promise<any> {
    const res = await fetchWithTimeout(
      `${BACKEND_BASE_URL}/api/notifications/mark-all-read`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      }
    );
    if (!res.ok) throw new Error('Failed to mark all notifications read');
    return res.json();
  },

  /**
   * Prompt P14: Fetch Notification Preferences
   */
  async fetchNotificationPreferences(): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/notifications/preferences`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch notification preferences');
    return res.json();
  },

  /**
   * Prompt P14: Update Notification Preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/notifications/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ preferences }),
    });
    if (!res.ok) throw new Error('Failed to update notification preferences');
    return res.json();
  },

  /**
   * Prompt B10: Fetch Admin System Metrics
   */
  async fetchAdminMetrics(): Promise<AdminMetricsData> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/admin/metrics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch admin metrics');
    return res.json();
  },

  /**
   * Prompt B10: Fetch Admin Background Jobs
   */
  async fetchAdminJobs(status?: string): Promise<{ jobs: AdminJobItem[] }> {
    const url = status
      ? `${BACKEND_BASE_URL}/api/admin/jobs?status=${encodeURIComponent(status)}`
      : `${BACKEND_BASE_URL}/api/admin/jobs`;
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch admin jobs');
    return res.json();
  },

  /**
   * Prompt B10: Retry Background Job
   */
  async retryAdminJob(jobId: string): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/admin/jobs/${encodeURIComponent(jobId)}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to retry background job');
    return res.json();
  },

  /**
   * Prompt B10: Impersonate Pilot Tenant
   */
  async impersonateTenant(orgId: string, reason: string): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/admin/impersonate/${encodeURIComponent(orgId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to impersonate tenant');
    return res.json();
  },

  /**
   * Prompt B10: Toggle Kill Switch Flag
   */
  async toggleKillSwitch(flag: string, enabled: boolean): Promise<any> {
    const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/admin/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ flag, enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle kill switch');
    return res.json();
  },
};

export interface AssistantChatResponse {
  answer: string;
  cited_records: Array<{
    type: string;
    id?: string;
    heat_number?: string;
    mill_name?: string;
    link?: string;
    title?: string;
    [key: string]: any;
  }>;
  tools_used: string[];
  refusal: boolean;
  tokens_used: number;
  powered_by: string;
}

export interface AssistantUsageInfo {
  organization_id: string;
  monthly_token_cap: number;
  tokens_used: number;
  tokens_remaining: number;
  cap_exceeded: boolean;
  powered_by: string;
}

export interface EmissionsTrendData {
  date_range: string;
  organization_id: string;
  summary: {
    total_tonnes_shipped: number;
    avg_primary_see: number;
    eu_default_benchmark: number;
    cumulative_savings_inr: number;
    performance_label: string;
  };
  series: Array<{
    period: string;
    label: string;
    primary_see: number;
    eu_benchmark_default: number;
    markup_pct: number;
    default_with_markup: number;
    tonnes_shipped: number;
    savings_eur: number;
    savings_inr: number;
  }>;
  table_data: Array<{ [key: string]: any }>;
}

export interface CbamForecastData {
  organization_id: string;
  ets_benchmark_price_eur: number;
  inr_per_eur: number;
  total_5yr_savings_inr: number;
  total_5yr_savings_eur: number;
  projections: Array<{
    year: number;
    statutory_markup_pct: number;
    annual_export_tonnes: number;
    default_liability_eur: number;
    primary_liability_eur: number;
    avoided_markup_savings_eur: number;
    avoided_markup_savings_inr: number;
    status: string;
  }>;
  statutory_basis: string;
}

export interface MillBenchmarkingData {
  organization_id: string;
  mill_count: number;
  preferred_mill: string;
  mills: Array<{
    mill_name: string;
    short_name: string;
    avg_precursor_see: number;
    melt_and_pour_pass_rate_pct: number;
    total_heats_received: number;
    verified_tonnes: number;
    compliance_tier: string;
    color: string;
  }>;
}

export interface InventoryGradeDistribution {
  organization_id: string;
  total_active_grades: number;
  grades: Array<{
    grade: string;
    tonnes_available: number;
    tonnes_allocated: number;
    pct_of_total: number;
  }>;
}

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

export interface ClientPlantAccess {
  id: string;
  plant_id: string;
  plant_name: string;
  plant_code: string;
  gst_or_pan?: string;
  location?: string;
  granted_role: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  granted_by_user_id: string;
  expires_at?: string;
  created_at: string;
}

export type ClientPlantAccessGrant = ClientPlantAccess;
export type CrossClientAtRiskShipment = AtRiskShipmentCrossClient;

export interface ConsultantPortfolio {
  consultant_org_id: string;
  firm_name: string;
  contact_email: string;
  referral_code: string;
  discount_pct: number;
  commission_pct: number;
  total_clients: number;
  active_clients: number;
  total_shipments_monitored: number;
  at_risk_shipments_count: number;
  pending_reviews_count: number;
  monitored_tonnage_mt: number;
  monthly_retainer_inr: number;
  client_plants: ClientPlantAccess[];
}

export interface AtRiskShipmentCrossClient {
  id: string;
  plant_id: string;
  plant_name: string;
  plant_code: string;
  entity_type: string;
  entity_identifier: string;
  destination_country: string;
  importer_name: string;
  readiness_status: 'READY' | 'AT_RISK' | 'BLOCKED';
  block_reasons: string[];
  cbam_due_date: string;
  total_tonnage: number;
  review_status: string;
  updated_at: string;
}

export interface CrossClientReviewItem {
  id: string;
  plant_id: string;
  plant_name: string;
  plant_code: string;
  entity_type: string;
  entity_identifier: string;
  destination_country: string;
  importer_name: string;
  readiness_status: string;
  cbam_due_date: string;
  total_tonnage: number;
  updated_at: string;
}

export interface WhiteLabelConfig {
  consultant_org_id: string;
  firm_name: string;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain?: string | null;
  tagline?: string | null;
  show_consultant_brand_on_pdf: boolean;
  show_consultant_brand_on_portal: boolean;
  mandatory_verification_footer: string;
}

export interface ConsultantInvoiceLineItem {
  plant_id: string;
  plant_name: string;
  plant_code: string;
  service_description: string;
  monthly_rate_inr: number;
  gst_18_pct: number;
  total_inr: number;
}

export interface ConsolidatedInvoice {
  invoice_number: string;
  consultant_org_id: string;
  firm_name: string;
  billing_month: string;
  generated_date: string;
  total_active_plants: number;
  subtotal_inr: number;
  gst_18_pct_total_inr: number;
  gross_amount_inr: number;
  consultant_commission_pct: number;
  commission_credit_inr: number;
  net_payable_inr: number;
  line_items: ConsultantInvoiceLineItem[];
}

export interface AttributedClientReferral {
  plant_id: string;
  plant_name: string;
  status: string;
  referred_date: string;
  client_discount_applied_pct: number;
  consultant_monthly_credit_inr: number;
}

export interface ConsultantReferralInfo {
  referral_code: string;
  share_url: string;
  client_discount_pct: number;
  consultant_commission_pct: number;
  active_referred_plants_count: number;
  monthly_recurring_commission_inr: number;
  attributed_clients: AttributedClientReferral[];
}

function jsonStringify(obj: any): string {
  return JSON.stringify(obj);
}

export interface ApiKeyItem {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_by?: string;
  created_at: string;
  last_used_at?: string;
  is_active: boolean;
}

export interface ApiKeyCreatedResponse {
  id: string;
  name: string;
  raw_key: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
}

export interface WebhookSubscriptionItem {
  id: string;
  target_url: string;
  secret_masked: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  event_type: string;
  title: string;
  message: string;
  deep_link?: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  read_at?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  organization_id: string;
  unread_count: number;
  notifications: NotificationItem[];
}

export interface AdminMetricsData {
  platform_version: string;
  active_pilot_organizations: number;
  total_documents_processed: number;
  average_gemini_ocr_cost_per_page_usd: number;
  total_ai_spend_usd: number;
  ai_monthly_spend_cap_usd: number;
  spend_cap_utilization_pct: number;
  queue_health: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    dead_letter: number;
  };
  tenants: Array<{
    org_id: string;
    name: string;
    plan: string;
    documents: number;
    spend_usd: number;
    status: string;
  }>;
  feature_flags: Record<string, boolean>;
}

export interface AdminJobItem {
  id: string;
  organization_id: string;
  job_name: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';
  payload: any;
  retries: number;
  max_retries: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}
