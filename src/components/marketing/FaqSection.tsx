import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { GsapReveal } from '../effects/GsapMotion';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'What happens if our mill test certificate does not declare the Country of Melt and Pour?',
    a: 'Under Council Regulation (EU) 2023/1214 (Article 3g) and Implementing Regulation (EU) 2026/1963, European customs authorities restrict imports of iron and steel products processed in third countries where Russian crude steel inputs cannot be ruled out. Importers must produce mill test certificates identifying the country where the crude steel was melted and poured, or shipments risk detention at port of entry.',
  },
  {
    q: 'Can our factory re-type mill test certificates onto our own company letterhead?',
    a: 'No. European Standard EN 10204:2004 Clause 6 specifies that intermediaries and fabricators must pass on inspection certificates without alteration to the original document. HeatLedger AI performs byte-identical original preservation of the upstream mill certificate, pairing it with a signed cover sheet and tamper-evident SHA-256 hash.',
  },
  {
    q: 'How does HeatLedger AI calculate CBAM specific embedded emissions (SEE)?',
    a: 'HeatLedger implements the deterministic formulas established in Commission Implementing Regulation (EU) 2023/1773 and Regulation (EU) 2023/956 Annex IV. It accounts for direct emissions from fuel combustion, indirect emissions from electricity consumption, and precursor carbon intensities across BF-BOF or DRI-EAF production routes with a step-by-step calculation trace.',
  },
  {
    q: 'What are the statutory markups on CBAM default values?',
    a: 'Under Commission Implementing Regulation (EU) 2025/2621, EU default values for embedded emissions carry progressive statutory markups when verified actual installation data is not supplied. Providing verified actual data lowers the carbon intensity basis used by European buyers and creates a meaningful estimated cost difference versus default values.',
  },
  {
    q: 'Does HeatLedger AI replace our third-party CBAM verification auditor?',
    a: 'No. HeatLedger supports compliance preparation by organizing, reconciling, and calculating operational evidence into verifier-ready packages. Final CBAM declarations submitted under the definitive regime must be verified by an accredited independent verifier as required under Article 8 of Regulation (EU) 2023/956.',
  },
  {
    q: 'Can shop-floor operators use HeatLedger without an internet connection in the plant?',
    a: 'Yes. The HeatLedger web console works as an installable Progressive Web App (PWA). Floor staff can capture certificates with mobile cameras in low-signal shop bays; captures queue locally in IndexedDB and sync automatically once connectivity returns.',
  },
  {
    q: 'How are subscription payments and Indian GST handled?',
    a: 'HeatLedger AI is billed under Service Accounting Code (SAC) 998313 (Information Technology Software Services) with statutory 18% Indian GST. Businesses enter their GSTIN during checkout to receive CGST/SGST (West Bengal) or IGST tax invoices for input tax credit reconciliation.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.text = JSON.stringify(jsonLdData);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('faq-jsonld');
      if (el) el.remove();
    };
  }, []);

  return (
    <section
      id="faq"
      className="py-20 lg:py-28 bg-[#121316] text-[#EAEAEA] border-b border-[#EAEAEA]/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Sticky Editorial Header */}
          <GsapReveal className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="text-xs font-mono text-[#10B981] mb-3">
              Statutory and technical clarifications
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-[#EAEAEA] tracking-[-0.025em] leading-[1.12] [text-wrap:balance]">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#9FA3AD] leading-relaxed">
              Operational, metallurgical, and regulatory details on EN 10204 Clause 6,
              Melt-and-Pour proof, and EU or UK CBAM preparation.
            </p>
          </GsapReveal>

          {/* Right Bordered Accordion */}
          <GsapReveal y={12} className="lg:col-span-8">
            <div className="rounded-2xl border border-[#EAEAEA]/10 bg-[#181A1F] divide-y divide-[#EAEAEA]/[0.08] overflow-hidden">
              {FAQS.map((item, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-[#22252B]/60 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#22252B] cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-medium text-[#EAEAEA] leading-snug">
                        {item.q}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className={`mt-0.5 shrink-0 ${
                          isOpen ? 'text-[#10B981]' : 'text-[#6F7480]'
                        }`}
                      >
                        <Plus className="w-4 h-4" strokeWidth={1.5} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-5 text-sm text-[#9FA3AD] leading-relaxed">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </GsapReveal>
        </div>
      </div>
    </section>
  );
};
