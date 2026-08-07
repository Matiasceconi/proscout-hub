import React from 'react';

export default function StatMetric({ label, value, tone = 'slate' }) {
  const tones = { slate: 'bg-slate-50 text-slate-900', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700' };
  return <div className={`rounded-lg px-3 py-2 text-center ${tones[tone]}`}><p className="text-lg font-bold leading-tight">{value ?? 0}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p></div>;
}