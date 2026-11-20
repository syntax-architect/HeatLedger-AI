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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm">
            <HeartHandshake className="w-5 h-5" />
            <span>Pilot Milestone: 3 Shipments Sealed</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Thank You for Your Feedback!
            </h4>
            <p className="text-slate-500 text-xs">
              Your insights help us optimize EN 10204 and CBAM compliance across Howrah and Liluah steel mills.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Congratulations! Your plant has completed <strong>{shipmentsCompletedCount} verified export dossiers</strong>. How likely are you to recommend HeatLedger to fellow steel & engineering exporters?
            </p>

            {/* Score Selector (0 - 10) */}
            <div className="space-y-1.5">
              <label className="block text-slate-500 font-semibold text-[11px]">
                Rating (0 = Not likely, 10 = Extremely likely)
              </label>
              <div className="flex items-center justify-between gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScore(s)}
                    className={`w-7 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                      score === s
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold text-[11px] mb-1">
                What could we improve for your plant's QA and dispatch workflows?
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Faster chemistry extraction, Tally invoice sync..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={score === null}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
