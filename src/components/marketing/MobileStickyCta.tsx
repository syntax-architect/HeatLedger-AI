import React from 'react';
import { MessageSquare, Calendar, ArrowRight } from 'lucide-react';

export interface MobileStickyCtaProps {
  onOpenBooking: () => void;
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export const MobileStickyCta: React.FC<MobileStickyCtaProps> = ({
  onOpenBooking,
  whatsappNumber = '919876543210',
  whatsappMessage = 'Hi HeatLedger team, I want to book a free CBAM shipment audit for my steel export containers.',
}) => {
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 py-2.5 pb-safe bg-[#0A0C10]/95 border-t border-white/[0.1] backdrop-blur-md">
      <div className="flex items-center gap-2 max-w-md mx-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with a CBAM specialist on WhatsApp"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#111318] hover:bg-[#181B22] border border-white/[0.14] text-[#F4F4F5] font-medium text-xs shrink-0 transition-colors whitespace-nowrap min-h-[42px]"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={onOpenBooking}
          aria-label="Book a free shipment audit"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs transition-colors whitespace-nowrap min-h-[42px]"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Book Free Audit</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
};
