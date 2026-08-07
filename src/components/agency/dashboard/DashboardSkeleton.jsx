import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="h-48 rounded-2xl bg-slate-200" />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-40 bg-slate-200 rounded" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-100 rounded-xl" />
            <div className="h-64 bg-slate-100 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-slate-100 rounded-xl" />
          <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}