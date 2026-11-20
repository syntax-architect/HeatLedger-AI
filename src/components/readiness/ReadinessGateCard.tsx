import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Lock,
  Unlock,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReadinessEvaluation } from '../../types';
import { AnimatedNumber } from '../effects/AnimatedNumber';

interface ReadinessGateCardProps {
  evaluation: ReadinessEvaluation;
  onNavigateToField?: (fieldLink: string) => void;
  onRequestRelease?: () => void;
  onApproveRelease?: (overrideReason?: string) => void;
  userRole?: string;
  releaseStatus?: string;
}

export const ReadinessGateCard: React.FC<ReadinessGateCardProps> = ({
  evaluation,
  onNavigateToField,
  onRequestRelease,
  onApproveRelease,
  userRole = 'QA_INSPECTOR',
  releaseStatus = 'DRAFT',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const { score, status, can_release, checks, blocking_failures, warning_failures } = evaluation;

  const statusMeta =
    status === 'READY'
      ? {
          stroke: '#059669',
          badgeClass: 'bg-[#ECFDF5] border-emerald-200 text-[#047857]',
          label: 'Ready for Dispatch',
          icon: ShieldCheck,
        }
      : status === 'FIX_NEEDED'
        ? {
            stroke: '#D97706',
            badgeClass: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]',
            label: 'Warnings Present',
            icon: AlertTriangle,
          }
        : {
            stroke: '#DC2626',
            badgeClass: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
            label: 'Blocked at Gate',
            icon: AlertOctagon,
          };

  const StatusIcon = statusMeta.icon;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const firstFailingCheck = checks.find((c) => !c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  const handleConfirmOverride = () => {
    if (!overrideReason.trim()) return;
    onApproveRelease?.(overrideReason);
    setIsOverrideModalOpen(false);
  };

  return (
    <div className="rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden text-left">
      {/* Top Gate Summary Strip */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E4E4E7]">
        <div className="flex items-center gap-4">
          {/* Compact Readiness Score Dial */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
              <circle
                cx="44"
                cy="44"
                r="36"
                stroke="#F4F4F5"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="44"
                cy="44"
                r="36"
                stroke={statusMeta.stroke}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-semibold font-mono tabular-nums text-[#09090B] leading-none">
                <AnimatedNumber value={score} duration={0.45} />
              </span>
              <span className="text-xs text-[#52525B] leading-none mt-0.5">/100</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${statusMeta.badgeClass}`}
              >
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{statusMeta.label}</span>
              </span>
              {releaseStatus === 'RELEASE_APPROVED' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] text-xs font-medium border border-emerald-200">
                  Release Approved
                </span>
              )}
              {releaseStatus === 'RELEASE_REQUESTED' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-xs font-medium border border-blue-200">
                  Release Requested
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-[#09090B] tracking-[-0.01em]">
              Shipment Release Gatekeeper ·{' '}
              <span className="font-mono tabular-nums text-[#52525B] font-medium">
                {evaluation.shipment_id}
              </span>
            </h3>
            <p className="text-xs text-[#52525B]">
              {blocking_failures > 0
                ? `${blocking_failures} blocking check${blocking_failures > 1 ? 's' : ''} must be resolved prior to dispatch clearance.`
                : warning_failures > 0
                  ? `${warning_failures} advisory warning${warning_failures > 1 ? 's' : ''} noted before customs submission.`
                  : 'All statutory, metallurgical, and mass-balance rules verified.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {firstFailingCheck && (
            <button
              type="button"
              onClick={() => onNavigateToField?.(firstFailingCheck.field_link)}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7] text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Fix Next Issue</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#059669]" />
            </button>
          )}

          {releaseStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={onRequestRelease}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7] text-xs font-medium transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Request Release</span>
            </button>
          )}

          {can_release && releaseStatus !== 'RELEASE_APPROVED' && (
            <button
              type="button"
              onClick={() => onApproveRelease?.()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Approve Dispatch</span>
            </button>
          )}

          {!can_release && userRole === 'OWNER' && releaseStatus !== 'RELEASE_APPROVED' && (
            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-lg bg-[#FEF2F2] hover:bg-red-100 text-[#DC2626] border border-[#FECACA] text-xs font-medium transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Owner Override</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Rules Checklist Footer */}
      <div className="px-4 sm:px-5 py-3 bg-[#FAFAFA]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-[#52525B]">
            <span className="font-medium text-[#09090B]">Readiness Rule Checks</span>
            <span className="font-mono tabular-nums text-[#52525B]">
              {passedCount} / {checks.length} passed
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#52525B] hover:text-[#09090B] transition-colors cursor-pointer py-1"
          >
            <span>{isExpanded ? 'Hide checklist' : 'Inspect all checks'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 overflow-hidden"
            >
              <div className="rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] divide-y divide-[#E4E4E7]">
                {checks.map((check) => (
                  <div
                    key={check.rule_id}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      check.passed
                        ? 'bg-[#FFFFFF]'
                        : check.severity === 'BLOCK'
                          ? 'bg-[#FEF2F2]/60'
                          : 'bg-[#FFFBEB]/60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      ) : check.severity === 'BLOCK' ? (
                        <AlertOctagon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#09090B]">{check.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-xs font-medium border ${
                              check.passed
                                ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                                : check.severity === 'BLOCK'
                                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                                  : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                            }`}
                          >
                            {check.passed ? 'Pass' : check.severity === 'BLOCK' ? 'Blocking' : 'Warning'}
                          </span>
                        </div>
                        <p className="text-xs text-[#52525B] mt-0.5">{check.message}</p>
                        {!check.passed && (
                          <p className="text-xs text-[#047857] mt-1 font-medium">
                            Resolution: {check.fix_hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {!check.passed && onNavigateToField && (
                      <button
                        type="button"
                        onClick={() => onNavigateToField(check.field_link)}
                        className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7] text-xs font-medium shrink-0 transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Owner Override Modal */}
      <AnimatePresence>
        {isOverrideModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsOverrideModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-[0_20px_50px_rgba(0,0,0,0.18)] space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Owner Release Override</span>
              </div>
              <p className="text-xs text-[#52525B] leading-relaxed">
                This shipment currently fails{' '}
                <strong className="text-[#DC2626] font-semibold">
                  {blocking_failures} blocking rule{blocking_failures > 1 ? 's' : ''}
                </strong>
                . Authorizing release records an immutable override audit entry tied to your account.
              </p>

              <div>
                <label className="block text-xs font-medium text-[#09090B] mb-1.5">
                  Justification reason (required)
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Buyer accepted secondary mill lab certificate under commercial concession C-409."
                  className="w-full h-24 p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-xs text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#09090B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOverride}
                  disabled={overrideReason.trim().length < 5}
                  className="px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 text-xs font-medium text-white disabled:opacity-40 cursor-pointer"
                >
                  Confirm Override &amp; Release
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
