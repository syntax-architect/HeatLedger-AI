import React from 'react';
import { Smartphone, KeyRound, RefreshCw } from 'lucide-react';

export interface SigningKey {
  key_id: string;
  algorithm: string;
  public_key_b64: string;
  is_active: boolean;
  created_at: string;
}

interface InspectorAndKeysSectionProps {
  inspectorName: string;
  inspectorDesignation: string;
  inspectorEmpId: string;
  isUpdatingInspector: boolean;
  inspectorStatus: string | null;
  signingKeys: SigningKey[];
  isRotatingKey: boolean;
  keyStatus: string | null;
  onInspectorNameChange: (val: string) => void;
  onInspectorDesignationChange: (val: string) => void;
  onInspectorEmpIdChange: (val: string) => void;
  onUpdateInspector: (e: React.FormEvent) => void;
  onRotateKey: () => void;
}

export const InspectorAndKeysSection: React.FC<InspectorAndKeysSectionProps> = ({
  inspectorName,
  inspectorDesignation,
  inspectorEmpId,
  isUpdatingInspector,
  inspectorStatus,
  signingKeys,
  isRotatingKey,
  keyStatus,
  onInspectorNameChange,
  onInspectorDesignationChange,
  onInspectorEmpIdChange,
  onUpdateInspector,
  onRotateKey,
}) => {
  return (
    <>
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#B45309] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#18181A]">
              Authorised Inspector Setup
            </h2>
            <p className="text-xs text-[#55544E]">
              Inspector enrolls TOTP on personal phone; owner never sees the secret
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] leading-relaxed">
          <strong className="font-medium text-[#B45309]">Privacy Guarantee:</strong> The plant owner assigns the inspector identity (name, designation, employee ID). The inspector enrolls TOTP on their personal device. The owner never sees or handles the secret.
        </div>

        <form onSubmit={onUpdateInspector} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#18181A] mb-1">
              Inspector Name
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => onInspectorNameChange(e.target.value)}
              placeholder="Full name"
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#18181A] mb-1">
              Official Designation
            </label>
            <input
              type="text"
              value={inspectorDesignation}
              onChange={(e) => onInspectorDesignationChange(e.target.value)}
              placeholder="e.g. Head of Quality Assurance"
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#18181A] mb-1">
              Employee ID
            </label>
            <input
              type="text"
              value={inspectorEmpId}
              onChange={(e) => onInspectorEmpIdChange(e.target.value)}
              placeholder="e.g. QA-EMP-001"
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={isUpdatingInspector}
              className="h-9 px-4 bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium rounded-lg transition-colors duration-150 cursor-pointer"
            >
              {isUpdatingInspector ? 'Updating...' : 'Update Inspector Identity'}
            </button>
            {inspectorStatus && (
              <span className="text-xs text-[#047857] font-medium">
                {inspectorStatus}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#059669] flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#18181A]">
                Ed25519 Signing Keys
              </h2>
              <p className="text-xs text-[#55544E]">
                Rotatable key pairs; old public keys kept so past packs still verify
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRotateKey}
            disabled={isRotatingKey}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] hover:bg-[#EFECE5] text-xs font-medium text-[#18181A] transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRotatingKey ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>{isRotatingKey ? 'Rotating...' : 'Rotate Key'}</span>
          </button>
        </div>

        {keyStatus && (
          <div className="text-xs text-[#047857]">
            {keyStatus}
          </div>
        )}

        <div className="space-y-2">
          {signingKeys.length === 0 ? (
            <div className="p-3 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] text-xs text-[#55544E]">
              No active signing keys returned from server yet.
            </div>
          ) : (
            signingKeys.map((k) => (
              <div
                key={k.key_id}
                className="p-3 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-[#18181A]">
                    {k.key_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-xs ${
                      k.is_active
                        ? 'bg-[#ECFDF5] border border-emerald-200 text-[#047857] font-medium'
                        : 'bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E]'
                    }`}
                  >
                    {k.is_active ? 'ACTIVE' : 'HISTORICAL'}
                  </span>
                </div>
                <div className="font-mono text-xs text-[#55544E] break-all">
                  {k.public_key_b64}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};
