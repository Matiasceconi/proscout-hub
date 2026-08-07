import React, { useState } from 'react';
import { formatDate } from '@/lib/roleUtils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { POSITION_GROUPS } from './statsHelpers';

function getMatchMetricsByPosition(m, position) {
  const group = POSITION_GROUPS[position] || 'MF';
  if (group === 'GK') return [['Atajadas', m.saves], ['Goles recib.', m.goals_conceded], ['Penales ataj.', m.penalties_saved]];
  if (group === 'DF') return [['Entradas', m.tackles], ['Intercep.', m.interceptions], ['Bloqueos', m.blocks], ['Duelos gan.', m.duels_won]];
  if (group === 'MF') return [['Pases', m.passes_total], ['Pases clave', m.key_passes], ['Duelos gan.', m.duels_won], ['Regates', m.dribbles_successful]];
  return [['Goles', m.goals], ['Asist.', m.assists], ['Remates', m.shots_total], ['Al arco', m.shots_on_target]];
}

function FullStatsView({ stat }) {
  const fields = [
    ['Minutos', stat.minutes], ['Rating', stat.rating?.toFixed(2)], ['Posición', stat.position],
    ['Titular', stat.started ? 'Sí' : 'No'], ['Suplente', stat.substitute ? 'Sí' : 'No'], ['Capitán', stat.captain ? 'Sí' : 'No'],
    ['Goles', stat.goals], ['Asistencias', stat.assists],
    ['Remates totales', stat.shots_total], ['Remates al arco', stat.shots_on_target],
    ['Pases totales', stat.passes_total], ['Pases clave', stat.key_passes], ['Precisión pase %', stat.pass_accuracy],
    ['Entradas', stat.tackles], ['Bloqueos', stat.blocks], ['Intercepciones', stat.interceptions],
    ['Duelos totales', stat.duels_total], ['Duelos ganados', stat.duels_won],
    ['Regates intentados', stat.dribbles_attempted], ['Regates exitosos', stat.dribbles_successful],
    ['Faltas recibidas', stat.fouls_drawn], ['Faltas cometidas', stat.fouls_committed],
    ['Amarillas', stat.yellow_cards], ['Rojas', stat.red_cards],
    ['Penales ganados', stat.penalties_won], ['Penales cometidos', stat.penalties_committed],
    ['Penales convertidos', stat.penalties_scored], ['Penales errados', stat.penalties_missed], ['Penales atajados', stat.penalties_saved],
    ['Goles recibidos', stat.goals_conceded], ['Atajadas', stat.saves],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100">
      {fields.map(([label, val]) => (
        <div key={label} className="text-xs">
          <span className="text-slate-400">{label}: </span>
          <span className="font-medium text-slate-700">{val === null || val === undefined ? 'Sin dato' : val}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatsMatchTable({ matchStats, fixtures, position }) {
  const [expanded, setExpanded] = useState(null);
  const fixtureById = new Map((fixtures || []).map(f => [f.provider_fixture_id, f]));

  if (!matchStats || matchStats.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">Sin partidos con estadísticas</p>;
  }
  const sorted = [...matchStats].sort((a, b) => new Date(b.fixture_date) - new Date(a.fixture_date));

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <h3 className="text-sm font-semibold text-slate-700 p-3 border-b border-slate-100">Partidos recientes</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400">
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Rival</th>
              <th className="text-left p-2">Comp.</th>
              <th className="text-center p-2">Res.</th>
              <th className="text-center p-2">L/V</th>
              <th className="text-center p-2">Tit.</th>
              <th className="text-center p-2">Pos.</th>
              <th className="text-center p-2">Min.</th>
              <th className="text-center p-2">Rating</th>
              <th className="text-center p-2">Métricas</th>
              <th className="text-center p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const fx = fixtureById.get(m.provider_fixture_id);
              const isExpanded = expanded === i;
              const metrics = getMatchMetricsByPosition(m, position);
              const isHome = m.home_away === 'home';
              const homeScore = fx?.home_score;
              const awayScore = fx?.away_score;
              const result = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined
                ? (isHome ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`)
                : '—';
              return (
                <React.Fragment key={i}>
                  <tr className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-2 text-slate-500 whitespace-nowrap">{formatDate(m.fixture_date)}</td>
                    <td className="p-2 text-slate-700">{fx ? (isHome ? fx.away_team_name : fx.home_team_name) : '—'}</td>
                    <td className="p-2 text-slate-400">{fx?.competition_name || '—'}</td>
                    <td className="p-2 text-center text-slate-600">{result}</td>
                    <td className="p-2 text-center">{isHome ? 'L' : 'V'}</td>
                    <td className="p-2 text-center">{m.started ? <span className="text-green-600">T</span> : m.minutes > 0 ? <span className="text-amber-500">S</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="p-2 text-center text-slate-500">{m.position || '—'}</td>
                    <td className="p-2 text-center text-slate-600">{m.minutes === 0 && m.started === false ? 'Conv.' : m.minutes}</td>
                    <td className="p-2 text-center font-medium text-slate-700">{m.rating ? Number(m.rating).toFixed(1) : '—'}</td>
                    <td className="p-2 text-center text-slate-500 text-[10px]">{metrics.filter(([, v]) => v !== null && v !== undefined && v !== 0).map(([l, v]) => `${l}: ${v}`).join(' · ') || '—'}</td>
                    <td className="p-2 text-center">
                      <button onClick={() => setExpanded(isExpanded ? null : i)} className="text-slate-400 hover:text-slate-700">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan={11} className="p-3">
                        <FullStatsView stat={m} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}