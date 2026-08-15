import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { formatDate } from '@/lib/roleUtils';

const SCORE_COLORS = {
  navy: '#0f172a',
  blue: '#3b82f6',
  green: '#16a34a',
  amber: '#f59e0b',
  gray: '#94a3b8',
  red: '#ef4444',
};

function RatingEvolutionChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos de calificación</p>;
  const chartData = data.map(m => ({
    date: formatDate(m.fixture_date).slice(0, 6),
    fullDate: formatDate(m.fixture_date),
    rating: m.rating ? Number(m.rating) : null,
    starter: m.started,
    rival: m.opponent_team_id || '—',
  }));
  const avgData = chartData.map((d, i) => {
    const window = chartData.slice(Math.max(0, i - 4), i + 1);
    const validRatings = window.filter(w => w.rating !== null);
    return { ...d, avg: validRatings.length > 0 ? validRatings.reduce((s, w) => s + w.rating, 0) / validRatings.length : null };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
        <p className="font-medium text-slate-700">{d.fullDate}</p>
        <p className="text-slate-500">Rival: {d.rival}</p>
        <p className="text-slate-500">{d.starter ? 'Titular' : 'Suplente'}</p>
        {d.rating !== null && <p className="text-slate-700">Rating: <span className="font-medium">{d.rating.toFixed(2)}</span></p>}
        {d.avg !== null && <p className="text-slate-400">Prom. móvil: {d.avg.toFixed(2)}</p>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={avgData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis domain={[4, 10]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="rating" stroke={SCORE_COLORS.blue} strokeWidth={1} dot={{ r: 3, fill: (d) => d?.starter ? SCORE_COLORS.green : SCORE_COLORS.amber }} />
        <Line type="monotone" dataKey="avg" stroke={SCORE_COLORS.navy} strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MinutesChart({ data, period, onPeriodChange }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos de minutos</p>;

  const sliced = period === '5' ? data.slice(-5) : period === '10' ? data.slice(-10) : data;
  const chartData = sliced.map(m => ({
    date: formatDate(m.fixture_date).slice(0, 6),
    fullDate: formatDate(m.fixture_date),
    minutos: m.minutes || 0,
    starter: m.started,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
        <p className="font-medium text-slate-700">{d.fullDate}</p>
        <p className="text-slate-500">{d.starter ? 'Titular' : 'Suplente'}</p>
        <p className="text-slate-700">Minutos: <span className="font-medium">{d.minutos}</span></p>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="minutos" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.starter ? SCORE_COLORS.green : SCORE_COLORS.gray} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SCORE_COLORS.green }} /> Titular</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SCORE_COLORS.gray }} /> Suplente</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {['5', '10', 'season'].map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-2 py-0.5 rounded ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              {p === '5' ? 'Últ. 5' : p === '10' ? 'Últ. 10' : 'Temporada'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductionChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos de producción</p>;
  let cumulative = 0;
  const chartData = data.map(m => {
    cumulative += (m.goals || 0) + (m.assists || 0);
    return {
      date: formatDate(m.fixture_date).slice(0, 6),
      fullDate: formatDate(m.fixture_date),
      acumulado: cumulative,
    };
  });
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
        <p className="font-medium text-slate-700">{d.fullDate}</p>
        <p className="text-slate-700">G+A acumulado: <span className="font-medium">{d.acumulado}</span></p>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="acumulado" stroke={SCORE_COLORS.green} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PositionRadar({ stats, position }) {
  if (!stats || stats.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos para comparación</p>;
  const s = stats[0];
  if (!s.minutes || s.minutes < 450) {
    return <p className="text-sm text-amber-600 py-8 text-center">Mínimo 450 minutos requeridos para comparación posicional</p>;
  }
  const data = [
    { metric: 'Goles', value: s.goals_total || 0, fullMark: 20 },
    { metric: 'Asistencias', value: s.goals_assists || 0, fullMark: 15 },
    { metric: 'Minutos', value: Math.min(s.minutes || 0, 3000), fullMark: 3000 },
    { metric: 'Rating', value: ((s.rating_avg || 0) * 10), fullMark: 100 },
    { metric: 'Pases', value: Math.min(s.passes_total || 0, 2000), fullMark: 2000 },
    { metric: 'Duelos', value: s.duels_won || 0, fullMark: 200 },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={SCORE_COLORS.navy} fill={SCORE_COLORS.navy} fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default function StatsCharts({ matchStats, seasonStats, position, minutesPeriod, onMinutesPeriodChange }) {
  const sorted = [...(matchStats || [])].sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Evolución del rendimiento</h3>
        <RatingEvolutionChart data={sorted} />
        <div className="flex gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SCORE_COLORS.green }} /> Titular</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SCORE_COLORS.amber }} /> Suplente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: SCORE_COLORS.navy }} /> Prom. móvil 5p</span>
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Participación (minutos)</h3>
        <MinutesChart data={sorted} period={minutesPeriod} onPeriodChange={onMinutesPeriodChange} />
      </div>
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Perfil comparativo</h3>
        <PositionRadar stats={seasonStats} position={position} />
      </div>
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Producción acumulada (G+A)</h3>
        <ProductionChart data={sorted} />
      </div>
    </div>
  );
}