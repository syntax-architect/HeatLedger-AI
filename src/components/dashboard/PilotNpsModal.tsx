import React, { useState } from 'react';
import { Star, Send, X, CheckCircle2, HeartHandshake } from 'lucide-react';

interface PilotNpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentsCompletedCount?: number;
}

export const PilotNpsModal: React.FC<PilotNpsModalProps> = ({
  isOpen,
  onClose,
  shipmentsCompletedCount = 3,
}) => {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score === null) return;
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
      <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4 text-xs text-[#18181A]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-[#047857] font-medium text-sm">
            <HeartHandshake className="w-4 h-4" strokeWidth={1.5} />
            <span>Pilot Milestone: 3 Shipments Sealed</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
            aria-label="Close NPS modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto" strokeWidth={1.5} />
            <h4 className="font-medium text-sm text-[#18181A]">
              Thank You for Your Feedback!
            </h4>
            <p className="text-[#55544E] text-xs">
              Your insights help us optimize EN 10204 and CBAM compliance across Howrah and Liluah steel mills.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[#55544E] leading-relaxed">
              Congratulations! Your plant has completed <span className="font-medium text-[#18181A]">{shipmentsCompletedCount} verified export dossiers</span>. How likely are you to recommend HeatLedger to fellow steel &amp; engineering exporters?
            </p>

            {/* Score Selector (0 - 10) */}
            <div className="space-y-1.5">
              <label className="block text-[#55544E] font-medium text-[11px]">
                Rating (0 = Not likely, 10 = Extremely likely)
              </label>
              <div className="flex items-center justify-between gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScore(s)}
                    className={`w-7 h-8 rounded-md font-mono text-xs font-medium transition-colors ${
                      score === s
                        ? 'bg-[#059669] text-[#FCFBF8]'
                        : 'bg-[#F7F5F0] border border-[#18181A]/10 text-[#18181A] hover:bg-[#EFECE5]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#55544E] font-medium text-[11px] mb-1">
                What could we improve for your plant's QA and dispatch workflows?
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Faster chemistry extraction, Tally invoice sync..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-[#EFECE5] text-[#18181A] hover:bg-[#18181A]/10 font-medium transition-colors"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={score === null}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-[#FCFBF8] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
