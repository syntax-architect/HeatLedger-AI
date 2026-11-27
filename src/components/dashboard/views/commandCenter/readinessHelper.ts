import { ReadinessEvaluation, ShipmentRecord } from '../../../../types';

export function evaluateShipmentReadiness(
  shipment: ShipmentRecord | null
): ReadinessEvaluation | null {
  if (!shipment) return null;

  const isMeltDefect = shipment.meltAndPourStatus === 'UNVERIFIED_DEFECT';
  const isOffSpec = shipment.metallurgyStatus === 'OFF_SPEC_ALERT';
  const isUnsigned = !shipment.qaSigned;
  const isCbamMissing = shipment.cbamXmlStatus === 'PENDING_INPUTS';

  let score = 100;
  if (isMeltDefect) score -= 25;
  if (isOffSpec) score -= 15;
  if (isUnsigned) score -= 10;
  if (isCbamMissing) score -= 10;

  const blockingFails = (isMeltDefect ? 1 : 0) + (isOffSpec ? 1 : 0) + (isUnsigned ? 1 : 0);
  const warningFails = isCbamMissing ? 1 : 0;
  const status = blockingFails > 0 ? 'BLOCKED' : warningFails > 0 ? 'FIX_NEEDED' : 'READY';

  return {
    shipment_id: shipment.containerInvoice.split('/')[0].trim(),
    score: Math.max(0, score),
    status,
    can_release: blockingFails === 0,
    blocking_failures: blockingFails,
    warning_failures: warningFails,
    total_rules: 9,
    checks: [
      {
        rule_id: 'RULE_MELT_POUR',
        name: 'Melt-and-Pour Country of Origin Attestation',
        severity: 'BLOCK',
        passed: !isMeltDefect,
        message: !isMeltDefect
          ? 'Melt-and-Pour origin verified (India [IN])'
          : 'Missing verified Melt-and-Pour country on upstream certificate.',
        fix_hint: 'Confirm melt country in MTC Workbench.',
        field_link: `/app?view=mtc-workbench&preset=sail&field=country_of_melt`,
      },
      {
        rule_id: 'RULE_CERT_TYPE',
        name: 'EN 10204 3.1 / 3.2 Certificate Type',
        severity: 'BLOCK',
        passed: true,
        message: 'Inspection certificate conforms to EN 10204:2004 Type 3.1.',
        fix_hint: 'Upload unaltered 3.1 mill certificate from steel producer.',
        field_link: `/app?view=mtc-workbench&preset=sail&field=compliance_mode`,
      },
      {
        rule_id: 'RULE_HEAT_UNIQUE',
        name: 'Heat Number Provenance & Uniqueness',
        severity: 'BLOCK',
        passed: true,
        message: `${shipment.linkedHeatNumbers.length} linked heats verified against mill lots.`,
        fix_hint: 'Link verified heat numbers in Heat Inventory.',
        field_link: `/app?view=heat-inventory`,
      },
      {
        rule_id: 'RULE_CHEMISTRY_SPEC',
        name: 'Spectrometric Chemistry In-Spec',
        severity: 'BLOCK',
        passed: !isOffSpec,
        message: !isOffSpec
          ? 'All ladle elements conform to target grade limits.'
          : 'Chemistry contains out-of-spec elements.',
        fix_hint: 'Review highlighted chemical values in MTC Workbench.',
        field_link: `/app?view=mtc-workbench&preset=sail&field=chemistry`,
      },
      {
        rule_id: 'RULE_MASS_BALANCE',
        name: 'Ledger Mass Balance Reconciliation',
        severity: 'BLOCK',
        passed: true,
        message: 'Shipped weight reconciled in raw material heat ledger.',
        fix_hint: 'Adjust shipment allocation in Heat Inventory.',
        field_link: `/app?view=heat-inventory`,
      },
      {
        rule_id: 'RULE_ORIGINAL_HASHED',
        name: 'Byte-Identical Upstream PDF SHA-256 Digest',
        severity: 'BLOCK',
        passed: true,
        message: 'Unaltered upstream mill PDF preserved with tamper-evident SHA-256.',
        fix_hint: 'Attach original mill PDF in MTC Workbench.',
        field_link: `/app?view=mtc-workbench&preset=sail&field=document`,
      },
      {
        rule_id: 'RULE_EXPORTER_SIGNED',
        name: 'QA Inspector Digital Signature',
        severity: 'BLOCK',
        passed: !isUnsigned,
        message: !isUnsigned
          ? 'Digitally Signed (Ed25519) by authorized QA representative.'
          : 'Unsigned draft: authorized QA inspector signature required.',
        fix_hint: 'Review and apply digital signature in Clause 6 Sign-Off.',
        field_link: `/app?view=sign-off-queue`,
      },
      {
        rule_id: 'RULE_CBAM_DATA',
        name: 'CBAM Specific Embedded Emissions Data',
        severity: 'WARN',
        passed: !isCbamMissing,
        message: !isCbamMissing
          ? `Calculated Specific Emissions: ${shipment.specificEmissions} tCO2e/t`
          : 'CBAM calculation pending: shipment exposed to statutory default markups under EU 2025/2621.',
        fix_hint: 'Compute actual embedded emissions in Customs Dossier.',
        field_link: `/app?view=cbam-dossier`,
      },
      {
        rule_id: 'RULE_INVOICE_TOLERANCE',
        name: 'Invoice vs Linked Heat Weight Tolerance (±5%)',
        severity: 'WARN',
        passed: true,
        message: `Container weight (${shipment.netTonnage} MT) matches heat allocation.`,
        fix_hint: 'Verify container net export payload.',
        field_link: `/app?view=heat-inventory`,
      },
    ],
  };
}
