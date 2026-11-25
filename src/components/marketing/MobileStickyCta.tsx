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
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 pb-safe bg-[#121316]/95 border-t border-[#EAEAEA]/10 backdrop-blur-md">
      <div className="flex items-center gap-2 max-w-md mx-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with a CBAM specialist on WhatsApp"
          className="inline-flex items-center justify-center gap-2 px-3 rounded-lg bg-[#181A1F] hover:bg-[#22252B] border border-[#EAEAEA]/12 text-[#EAEAEA] font-medium text-xs shrink-0 transition-colors whitespace-nowrap h-11"
        >
          <MessageSquare className="w-4 h-4 text-[#10B981] shrink-0" strokeWidth={1.5} />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={onOpenBooking}
          aria-label="Book a free shipment audit"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-[#EAEAEA] hover:bg-white text-[#121316] font-medium text-xs transition-colors whitespace-nowrap h-11 cursor-pointer"
        >
          <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Book free audit</span>
          <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
