import React from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  emp_id?: string;
  designation?: string;
  has_totp?: boolean;
  is_active?: boolean;
}

interface TeamManagementSectionProps {
  members: TeamMember[];
  inviteEmail: string;
  inviteRole: 'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER';
  isInviting: boolean;
  inviteStatus: string | null;
  onInviteEmailChange: (email: string) => void;
  onInviteRoleChange: (role: 'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER') => void;
  onSendInvite: (e: React.FormEvent) => void;
  onRemoveMember: (userId: string, name: string) => void;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  members,
  inviteEmail,
  inviteRole,
  isInviting,
  inviteStatus,
  onInviteEmailChange,
  onInviteRoleChange,
  onSendInvite,
  onRemoveMember,
}) => {
  return (
    <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-sm font-medium text-[#18181A]">
            Active Plant Team
          </h2>
          <p className="text-xs text-[#55544E]">
            Removing a user immediately revokes all active sessions
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {members.length === 0 ? (
          <div className="p-4 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] text-xs text-[#55544E]">
            No team members loaded yet. Invite colleagues below to assign plant roles.
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] gap-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#18181A]">
                    {m.name || m.email}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#ECFDF5] border border-emerald-200 text-[#047857]">
                    {m.role}
                  </span>
                  {m.has_totp && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-mono">
                      TOTP
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#55544E] mt-0.5">
                  {m.email} {m.designation ? `· ${m.designation}` : ''}{' '}
                  {m.emp_id ? <span className="font-mono tabular-nums">(#{m.emp_id})</span> : ''}
                </div>
              </div>

              {m.role !== 'OWNER' && (
                <button
                  type="button"
                  onClick={() => onRemoveMember(m.id, m.name || m.email)}
                  className="self-start sm:self-center inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors duration-150 cursor-pointer"
                  title="Revoke session and remove user"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Remove User</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSendInvite} className="pt-3 border-t border-[#18181A]/10 space-y-3">
        <div className="text-xs font-medium text-[#18181A]">
          Invite New Colleague
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder="colleague@steelmill.in"
            className="flex-1 h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
          <select
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
          >
            <option value="DISPATCH">DISPATCH</option>
            <option value="QA_INSPECTOR">QA_INSPECTOR</option>
            <option value="VIEWER">VIEWER</option>
            <option value="OWNER">OWNER</option>
          </select>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium disabled:opacity-50 transition-colors duration-150 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            <span>{isInviting ? 'Inviting...' : 'Send Invite'}</span>
          </button>
        </div>
        {inviteStatus && (
          <div className="text-xs text-[#047857]">
            {inviteStatus}
          </div>
        )}
      </form>
    </section>
  );
};
