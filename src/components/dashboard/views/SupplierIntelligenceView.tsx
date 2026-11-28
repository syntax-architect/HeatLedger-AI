import React, { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { haptics } from '../../../lib/motion';
import { SupplierDataRequestsTracker } from './SupplierDataRequestsTracker';
import { ScorecardsTab } from './supplier-intelligence/ScorecardsTab';
import { TemplatesTab } from './supplier-intelligence/TemplatesTab';
import { PoMatcherTab } from './supplier-intelligence/PoMatcherTab';
import { FixSupplierModal } from './supplier-intelligence/FixSupplierModal';
import type { SupplierItem, LearnedTemplate } from './supplier-intelligence/types';

export type { SupplierItem, LearnedTemplate } from './supplier-intelligence/types';

interface SupplierIntelligenceViewProps {
  initialSuppliers?: SupplierItem[];
  initialTemplates?: LearnedTemplate[];
  organizationName?: string;
}

export const SupplierIntelligenceView: React.FC<SupplierIntelligenceViewProps> = ({
  initialSuppliers = [],
  initialTemplates = [],
  organizationName,
}) => {
  const [activeTab, setActiveTab] = useState<'scorecards' | 'templates' | 'po-matcher' | 'data-requests'>('scorecards');
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [templates, setTemplates] = useState<LearnedTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState<boolean>(initialSuppliers.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');

  const [selectedSupplierForFix, setSelectedSupplierForFix] = useState<SupplierItem | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixCertNumber, setFixCertNumber] = useState('MTC-IN-2026-9041');
  const [fixHeatNumber, setFixHeatNumber] = useState('TSJ-26-9021');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/suppliers', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.suppliers) && isMounted) {
          setSuppliers(data.suppliers);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    fetch('/api/suppliers/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.templates) && isMounted) {
          setTemplates(data.templates);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.plant_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.typical_grades.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGrade = gradeFilter === 'ALL' || s.rating_grade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [suppliers, searchQuery, gradeFilter]);

  const handleOpenFixModal = (sup: SupplierItem) => {
    haptics.tap();
    setSelectedSupplierForFix(sup);
    const firstWord = (sup.name.split(' ')[0] ?? 'SUP').toUpperCase();
    setFixCertNumber(`MTC-${firstWord}-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFixHeatNumber(`${sup.name.slice(0, 3).toUpperCase()}-26-${Math.floor(1000 + Math.random() * 9000)}`);
    setFixModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans text-left text-[#18181A]">
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
            <h1 className="text-lg sm:text-xl font-medium tracking-[-0.02em] text-[#18181A]">
              Supplier &amp; Mill Intelligence
            </h1>
          </div>
          <p className="text-xs text-[#55544E] mt-1">
            Track certificate defect rates by mill, manage learned template layout fingerprints, and dispatch structured correction notices.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 self-start lg:self-center overflow-x-auto max-w-full">
          {[
            { id: 'scorecards' as const, label: 'Scorecards' },
            { id: 'templates' as const, label: 'Learned Templates' },
            { id: 'po-matcher' as const, label: 'PO Matcher' },
            { id: 'data-requests' as const, label: 'CBAM Precursor Tracker' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                haptics.tap();
                setActiveTab(tab.id);
              }}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                  : 'text-[#55544E] hover:text-[#18181A] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'scorecards' && (
        <ScorecardsTab
          suppliers={filteredSuppliers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          gradeFilter={gradeFilter}
          onGradeFilterChange={setGradeFilter}
          onOpenFixModal={handleOpenFixModal}
          loading={loading}
        />
      )}

      {activeTab === 'templates' && <TemplatesTab templates={templates} />}

      {activeTab === 'po-matcher' && <PoMatcherTab suppliers={suppliers} />}

      {activeTab === 'data-requests' && <SupplierDataRequestsTracker />}

      {fixModalOpen && selectedSupplierForFix && (
        <FixSupplierModal
          supplier={selectedSupplierForFix}
          certNumber={fixCertNumber}
          heatNumber={fixHeatNumber}
          organizationName={organizationName}
          onCertNumberChange={setFixCertNumber}
          onHeatNumberChange={setFixHeatNumber}
          onClose={() => setFixModalOpen(false)}
        />
      )}
    </div>
  );
};
