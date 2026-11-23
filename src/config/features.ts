// ============================================================================
// HEATLEDGER AI: Feature Flags Configuration (Prompt M1)
// Specification:
// - Default to 6 core screens: Home, Upload & Review, Heats, Shipments, Share, Settings.
// - Advanced enterprise views moved behind flags (off by default) for simplicity.
// ============================================================================

export interface FeatureFlags {
  supplierIntelligence: boolean;
  supplierRequests: boolean;
  intakeChannels: boolean;
  regulationRadar: boolean;
  insightsTrends: boolean;
  roiReports: boolean;
  consultantPortal: boolean;
  apiIntegrations: boolean;
  auditTrailStandalone: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  supplierIntelligence: false,
  supplierRequests: false,
  intakeChannels: false,
  regulationRadar: false,
  insightsTrends: false,
  roiReports: false,
  consultantPortal: false,
  apiIntegrations: false,
  auditTrailStandalone: false,
};

export const getFeatureFlags = (): FeatureFlags => {
  try {
    const stored = localStorage.getItem('hl_feature_flags');
    if (stored) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_FEATURE_FLAGS;
};

export const setFeatureFlags = (flags: Partial<FeatureFlags>): void => {
  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem('hl_feature_flags', JSON.stringify(updated));
  } catch {
    // ignore
  }
};
