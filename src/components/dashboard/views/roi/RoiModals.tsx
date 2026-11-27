import React from 'react';
import { Copy, Mail, Share2, X } from 'lucide-react';
import { RoiEmailDigestResponse, RoiShareLinkResponse } from '../../../../services/api';

interface RoiShareModalProps {
  shareLinkData: RoiShareLinkResponse;
  onCopy: (text: string, label: string) => void;
  onClose: () => void;
}

export const RoiShareModal: React.FC<RoiShareModalProps> = ({
  shareLinkData,
  onCopy,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Public Board Share Link</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close share modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-xs text-[#55544E]">
        This tokenized link grants read-only access to this month&apos;s proof-of-value report
        without requiring a HeatLedger login. Ideal for the Managing Director, external board, or
        chartered accountants.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#18181A]">Public Shareable URL</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${window.location.origin}${shareLinkData.share_url}`}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={() =>
              onCopy(`${window.location.origin}${shareLinkData.share_url}`, 'Share link')
            }
            className="h-9 px-3 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] transition-colors duration-150 cursor-pointer flex items-center justify-center shrink-0"
            title="Copy link"
          >
            <Copy className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  </div>
);

interface RoiEmailDigestModalProps {
  emailDigest: RoiEmailDigestResponse;
  emailTab: 'plain' | 'html';
  onEmailTabChange: (tab: 'plain' | 'html') => void;
  onCopy: (text: string, label: string) => void;
  onClose: () => void;
}

export const RoiEmailDigestModal: React.FC<RoiEmailDigestModalProps> = ({
  emailDigest,
  emailTab,
  onEmailTabChange,
  onCopy,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <div>
            <h3 className="font-medium text-[#18181A] text-base">
              Monthly Proof-of-Value Email Digest
            </h3>
            <p className="text-xs text-[#55544E] font-mono">Subject: {emailDigest.subject}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close email preview"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="inline-flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10">
          <button
            type="button"
            onClick={() => onEmailTabChange('plain')}
            className={`h-7 px-3 rounded-md font-medium cursor-pointer transition-colors duration-150 ${
              emailTab === 'plain'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
          >
            Plain Text
          </button>
          <button
            type="button"
            onClick={() => onEmailTabChange('html')}
            className={`h-7 px-3 rounded-md font-medium cursor-pointer transition-colors duration-150 ${
              emailTab === 'html'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
          >
            HTML Preview
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onCopy(
              emailTab === 'plain' ? emailDigest.plain : emailDigest.html,
              emailTab === 'plain' ? 'Plain email body' : 'HTML email source'
            )
          }
          className="h-9 px-3 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Copy className="w-4 h-4" strokeWidth={1.5} />
          <span>Copy Content</span>
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg border border-[#18181A]/12 p-4 bg-[#F7F5F0]">
        {emailTab === 'plain' ? (
          <pre className="text-xs font-mono text-[#18181A] whitespace-pre-wrap leading-relaxed">
            {emailDigest.plain}
          </pre>
        ) : (
          <iframe
            title="Email HTML Preview"
            sandbox=""
            srcDoc={emailDigest.html}
            className="w-full min-h-[300px] bg-white rounded border-0"
          />
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer transition-colors duration-150"
        >
          Close Preview
        </button>
      </div>
    </div>
  </div>
);
