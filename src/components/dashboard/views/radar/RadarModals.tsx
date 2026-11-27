import React from 'react';
import { Flag, Loader2, PlusCircle, Send, X } from 'lucide-react';
import { RegulationItem } from '../../../../types';

interface RadarPublishModalProps {
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  newJurisdiction: string;
  onNewJurisdictionChange: (v: string) => void;
  newSummary: string;
  onNewSummaryChange: (v: string) => void;
  newSourceUrl: string;
  onNewSourceUrlChange: (v: string) => void;
  newTags: string;
  onNewTagsChange: (v: string) => void;
  isPublishing: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RadarPublishModal: React.FC<RadarPublishModalProps> = ({
  newTitle,
  onNewTitleChange,
  newJurisdiction,
  onNewJurisdictionChange,
  newSummary,
  onNewSummaryChange,
  newSourceUrl,
  onNewSourceUrlChange,
  newTags,
  onNewTagsChange,
  isPublishing,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <h3 className="font-medium text-[#18181A] text-base">
              Publish &quot;What Changed&quot; Bulletin
            </h3>
          </div>
          <p className="text-xs text-[#55544E]">
            Broadcast verified legal changes to all connected export plants
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close publish modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5 text-xs font-sans">
        <div>
          <label className="font-medium text-[#18181A] block mb-1">Bulletin Title:</label>
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="e.g. EU Publishes Q2 Default Markup Schedule"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-medium focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="font-medium text-[#18181A] block mb-1">Jurisdiction:</label>
          <select
            value={newJurisdiction}
            onChange={(e) => onNewJurisdictionChange(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-medium focus:outline-none focus:border-[#059669]"
          >
            <option value="EU">🇪🇺 European Union (EU CBAM)</option>
            <option value="UK">🇬🇧 United Kingdom (UK CBAM)</option>
            <option value="GLOBAL">🌐 Global Standards / ISO</option>
          </select>
        </div>

        <div>
          <label className="font-medium text-[#18181A] block mb-1">Plain English Summary:</label>
          <textarea
            required
            rows={3}
            value={newSummary}
            onChange={(e) => onNewSummaryChange(e.target.value)}
            placeholder="Explain the practical consequence clearly for plant quality and dispatch teams."
            className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="font-medium text-[#18181A] block mb-1">Official Gazette Source URL:</label>
          <input
            type="url"
            required
            value={newSourceUrl}
            onChange={(e) => onNewSourceUrlChange(e.target.value)}
            placeholder="https://eur-lex.europa.eu/..."
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="font-medium text-[#18181A] block mb-1">Tags (comma separated):</label>
          <input
            type="text"
            value={newTags}
            onChange={(e) => onNewTagsChange(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#18181A]/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-[#55544E] hover:bg-[#EFECE5] hover:text-[#18181A] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPublishing}
            className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition-colors duration-150"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.5} />
            )}
            <span>Publish Bulletin</span>
          </button>
        </div>
      </form>
    </div>
  </div>
);

interface RadarReportModalProps {
  regulation: RegulationItem;
  reportedIssue: string;
  onReportedIssueChange: (v: string) => void;
  sourceReference: string;
  onSourceReferenceChange: (v: string) => void;
  isSubmittingReport: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RadarReportModal: React.FC<RadarReportModalProps> = ({
  regulation,
  reportedIssue,
  onReportedIssueChange,
  sourceReference,
  onSourceReferenceChange,
  isSubmittingReport,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-[#DC2626]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Report Regulatory Discrepancy</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close report modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs font-mono text-[#55544E]">
        Reporting for: <strong className="font-medium text-[#18181A]">{regulation.title}</strong> (
        {regulation.id})
      </div>

      <form onSubmit={onSubmit} className="space-y-3 text-xs font-sans">
        <div>
          <label className="font-medium text-[#18181A] block mb-1">
            Describe Discrepancy or Statutory Revision:
          </label>
          <textarea
            required
            rows={3}
            value={reportedIssue}
            onChange={(e) => onReportedIssueChange(e.target.value)}
            placeholder="e.g. In HMRC Notice or EUR-Lex, the date was revised to..."
            className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="font-medium text-[#18181A] block mb-1">Source Reference / URL:</label>
          <input
            type="text"
            value={sourceReference}
            onChange={(e) => onSourceReferenceChange(e.target.value)}
            placeholder="https://..."
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#18181A]/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-[#55544E] hover:bg-[#EFECE5] hover:text-[#18181A] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmittingReport}
            className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition-colors duration-150"
          >
            {isSubmittingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.5} />
            )}
            <span>Submit Discrepancy</span>
          </button>
        </div>
      </form>
    </div>
  </div>
);
