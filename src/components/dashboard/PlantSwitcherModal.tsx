import React from 'react';
import { ResponsiveSheet } from '../common/ResponsiveSheet';
import { Building2, Check, MapPin, Shield, Flame } from 'lucide-react';

export interface PlantProfile {
  id: string;
  name: string;
  shortName: string;
  installationId: string;
  unLocode: string;
  location: string;
  furnaceRoute: string;
  activeEmissionsScope: string;
}

export const REGISTERED_PLANTS: PlantProfile[] = [
  {
    id: 'howrah-plant-1',
    name: 'Howrah Precision Forgings Pvt. Ltd.',
    shortName: 'Plant 1 · Liluah',
    installationId: 'IN-WB-4409',
    unLocode: 'IN CCU',
    location: 'Howrah, West Bengal',
    furnaceRoute: 'Induction Furnace + Gas-Fired Reheating',
    activeEmissionsScope: 'CBAM Annex II Steel (7326 / 7214)',
  },
  {
    id: 'raipur-sms-2',
    name: 'Central India Steel & Alloys Ltd.',
    shortName: 'SMS-2 · Raipur Works',
    installationId: 'IN-CG-8821',
    unLocode: 'IN RPR',
    location: 'Raipur, Chhattisgarh',
    furnaceRoute: 'Direct Reduced Iron (DRI) + Electric Arc Furnace',
    activeEmissionsScope: 'CBAM Annex I Billets & Wire Rod (7207)',
  },
  {
    id: 'kalinganagar-mill-4',
    name: 'Coastal Strip & Bar Mills Corp.',
    shortName: 'Plant 4 · Kalinganagar',
    installationId: 'IN-OD-1092',
    unLocode: 'IN PRT',
    location: 'Jajpur, Odisha',
    furnaceRoute: 'Basic Oxygen Furnace (BOF) Route',
    activeEmissionsScope: 'CBAM Hot-Rolled Coil (7208)',
  },
  {
    id: 'jamshedpur-unit-3',
    name: 'Chotanagpur Heavy Forgings Unit',
    shortName: 'Unit 3 · Jamshedpur',
    installationId: 'IN-JH-5530',
    unLocode: 'IN IXW',
    location: 'Jamshedpur, Jharkhand',
    furnaceRoute: 'Secondary Metallurgy + Heavy Hydraulic Press',
    activeEmissionsScope: 'Engineered Forged Flanges (7307)',
  },
];

interface PlantSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlantId: string;
  onSelectPlant: (plant: PlantProfile) => void;
}

export const PlantSwitcherModal: React.FC<PlantSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePlantId,
  onSelectPlant,
}) => {
  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Factory Installation"
      description="Scope MTC verification, heat mass-balance inventory, and CBAM dossiers to a registered Indian installation."
    >
      <div className="space-y-2.5">
        {REGISTERED_PLANTS.map((plant) => {
          const isSelected = plant.id === activePlantId;

          return (
            <button
              key={plant.id}
              type="button"
              onClick={() => {
                onSelectPlant(plant);
                onClose();
              }}
              className={`w-full text-left p-4 rounded-xl border transition-colors touch-target cursor-pointer flex items-start justify-between gap-3 ${
                isSelected
                  ? 'bg-[#ECFDF5]/60 border-[#059669]'
                  : 'bg-[#FFFFFF] border-[#E4E4E7] hover:bg-[#FAFAFA] hover:border-[#D4D4D8]'
              }`}
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#059669] border-[#059669] text-white'
                        : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#52525B]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-xs text-[#09090B] truncate">
                    {plant.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]">
                    {plant.shortName}
                  </span>
                </div>

                <div className="text-xs text-[#52525B] flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>ID:</span>
                    <strong className="font-mono font-medium text-[#09090B]">
                      {plant.installationId}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>UN/LOCODE:</span>
                    <strong className="font-mono font-medium text-[#09090B]">
                      {plant.unLocode}
                    </strong>
                  </span>
                </div>

                <div className="text-xs text-[#52525B] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span className="truncate">{plant.furnaceRoute}</span>
                </div>

                <div className="text-xs text-[#047857] font-mono">
                  {plant.activeEmissionsScope}
                </div>
              </div>

              {isSelected && (
                <div className="w-6 h-6 rounded-md bg-[#059669] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </ResponsiveSheet>
  );
};
