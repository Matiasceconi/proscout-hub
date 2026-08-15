import React from 'react';

export default function StatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-3">
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-slate-100 rounded" />
          <div className="h-8 w-32 bg-slate-100 rounded" />
          <div className="h-8 w-40 bg-slate-100 rounded" />
          <div className="h-6 w-20 bg-slate-100 rounded-full ml-auto" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-slate-100 rounded" />
          <div className="h-8 w-20 bg-slate-100 rounded" />
          <div className="h-8 w-24 bg-slate-100 rounded ml-auto" />
          <div className="h-8 w-24 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 h-20">
            <div className="h-6 w-16 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-4 h-56">
            <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
            <div className="h-40 bg-slate-50 rounded" />
          </div>
        ))}
      </div>

      {/* Match table skeleton */}
      <div className="border border-slate-200 rounded-lg p-4 h-40">
        <div className="h-4 w-40 bg-slate-100 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-slate-50 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}