import React from 'react';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Standardized Shimmer Base
 */
export const SkeletonShimmer: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
}> = ({ className = '', width, height }) => {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`relative overflow-hidden rounded-lg bg-[#EFECE5] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-[#FCFBF8]/40 ${className}`}
      style={{ width, height }}
    />
  );
};

/**
 * Metric & KPI Card Grid Skeleton
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="status" aria-label="Loading metrics">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <SkeletonShimmer className="h-3.5 w-24" />
            <SkeletonShimmer className="h-5 w-5 rounded-md" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <SkeletonShimmer className="h-8 w-20" />
            <SkeletonShimmer className="h-4 w-12 rounded-md" />
          </div>
          <div className="mt-3">
            <SkeletonShimmer className="h-2.5 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * High-Fidelity Table Skeleton (Heats, Shipments, Webhooks, Audit Trail)
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  title?: string;
}> = ({ rows = 5, columns = 6, title }) => {
  return (
    <div
      className="w-full rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden"
      role="status"
      aria-label="Loading records table"
    >
      {/* Table Header Filter Bar */}
      <div className="p-4 border-b border-[#18181A]/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {title ? (
            <span className="text-sm font-medium text-[#18181A]">{title}</span>
          ) : (
            <SkeletonShimmer className="h-5 w-36" />
          )}
          <SkeletonShimmer className="h-5 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-8 w-44 rounded-lg" />
          <SkeletonShimmer className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Table Columns Header */}
      <div className="grid grid-cols-6 gap-4 px-5 py-3 bg-[#EFECE5]/60 border-b border-[#18181A]/10">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-3 w-16" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#18181A]/8">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid grid-cols-6 gap-4 px-5 py-3.5 items-center hover:bg-[#F7F5F0] transition-colors"
          >
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="h-4 w-4 rounded-sm" />
              <SkeletonShimmer className="h-4 w-24 font-mono" />
            </div>
            <SkeletonShimmer className="h-4 w-28" />
            <SkeletonShimmer className="h-4 w-16" />
            <SkeletonShimmer className="h-5 w-20 rounded-md" />
            <SkeletonShimmer className="h-4 w-20" />
            <div className="flex justify-end">
              <SkeletonShimmer className="h-6 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3 bg-[#F7F5F0] border-t border-[#18181A]/10 flex items-center justify-between text-xs text-[#78766E]">
        <SkeletonShimmer className="h-3.5 w-32" />
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-7 w-16 rounded-lg" />
          <SkeletonShimmer className="h-7 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * Split-Screen MTC Workbench Skeleton
 */
export const WorkbenchSkeleton: React.FC = () => {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]"
      role="status"
      aria-label="Loading Certificate Review Workbench"
    >
      {/* Left Document Viewport */}
      <div className="lg:col-span-7 bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-[#18181A]/10">
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="h-5 w-40" />
            <SkeletonShimmer className="h-4 w-20 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="h-7 w-7 rounded-lg" />
            <SkeletonShimmer className="h-7 w-7 rounded-lg" />
            <SkeletonShimmer className="h-7 w-16 rounded-lg" />
          </div>
        </div>
        <div className="my-auto flex flex-col items-center justify-center p-12">
          <SkeletonShimmer className="w-full max-w-lg h-96 rounded-xl" />
        </div>
        <div className="pt-3 border-t border-[#18181A]/10 flex items-center justify-between">
          <SkeletonShimmer className="h-3.5 w-48 font-mono" />
          <SkeletonShimmer className="h-6 w-24 rounded-lg" />
        </div>
      </div>

      {/* Right Extracted Fields Panel */}
      <div className="lg:col-span-5 bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#18181A]/10">
            <SkeletonShimmer className="h-5 w-36" />
            <SkeletonShimmer className="h-6 w-24 rounded-md" />
          </div>

          <div className="space-y-4 mt-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-[#18181A]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <SkeletonShimmer className="h-3.5 w-28" />
                  <SkeletonShimmer className="h-4 w-14 rounded-md" />
                </div>
                <SkeletonShimmer className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-[#18181A]/10 flex items-center justify-between gap-3">
          <SkeletonShimmer className="h-10 w-28 rounded-lg" />
          <SkeletonShimmer className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * Chart & Analytics Viewport Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 280 }) => {
  return (
    <div
      className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10"
      role="status"
      aria-label="Loading analytics chart"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <SkeletonShimmer className="h-5 w-48" />
          <SkeletonShimmer className="h-3 w-64 mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-7 w-20 rounded-lg" />
          <SkeletonShimmer className="h-7 w-20 rounded-lg" />
        </div>
      </div>
      <div style={{ height }} className="flex items-end justify-between gap-4 pt-4 border-b border-l border-[#18181A]/10 pb-2 pl-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonShimmer
            key={i}
            className="w-full rounded-t-md"
            height={`${Math.max(25, (i * 11 + 35) % 90)}%`}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * General Full View Skeleton (Page Shell)
 */
export const ViewSkeleton: React.FC<{
  title?: string;
  hasKpis?: boolean;
  type?: 'table' | 'cards' | 'chart' | 'workbench';
}> = ({ title, hasKpis = true, type = 'table' }) => {
  return (
    <div className="space-y-6 animate-fadeIn" role="status" aria-busy="true">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {title ? (
            <h1 className="text-xl font-medium tracking-tight text-[#18181A]">{title}</h1>
          ) : (
            <SkeletonShimmer className="h-7 w-48" />
          )}
          <SkeletonShimmer className="h-3.5 w-72 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-9 w-28 rounded-lg" />
          <SkeletonShimmer className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      {hasKpis && <CardGridSkeleton count={4} />}

      {/* Main Content Type */}
      {type === 'table' && <TableSkeleton rows={6} columns={6} />}
      {type === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3">
              <SkeletonShimmer className="h-5 w-32" />
              <SkeletonShimmer className="h-3.5 w-full" />
              <SkeletonShimmer className="h-3.5 w-3/4" />
              <div className="pt-3 flex justify-between">
                <SkeletonShimmer className="h-4 w-20" />
                <SkeletonShimmer className="h-6 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}
      {type === 'chart' && <ChartSkeleton height={320} />}
      {type === 'workbench' && <WorkbenchSkeleton />}
    </div>
  );
};

/**
 * Standard Accessible Industry-Grade Empty State
 */
export interface ActionableEmptyStateProps {
  icon?: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ActionableEmptyState: React.FC<ActionableEmptyStateProps> = ({
  icon,
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-[#18181A]/20 bg-[#F7F5F0] ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] mb-4">
        {icon || <Database className="w-5 h-5" strokeWidth={1.5} />}
      </div>

      {badge && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#EFECE5] text-[#55544E] border border-[#18181A]/10 mb-2">
          {badge}
        </span>
      )}

      <h3 className="text-base font-medium text-[#18181A] mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-[#55544E] max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="h-9 px-4 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] font-medium text-xs hover:bg-[#EFECE5] transition-colors cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
