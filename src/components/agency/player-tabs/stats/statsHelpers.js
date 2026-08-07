export const POSITION_GROUPS = {
  GK: 'GK', CB: 'DF', LB: 'DF', RB: 'DF',
  CDM: 'MF', CM: 'MF', CAM: 'MF',
  LW: 'FW', RW: 'FW', ST: 'FW', CF: 'FW',
};

export const POSITION_LABELS_FULL = {
  GK: 'Arquero', CB: 'Defensor central', LB: 'Lateral izq.', RB: 'Lateral der.',
  CDM: 'Mediocentro def.', CM: 'Mediocentro', CAM: 'Mediapunta',
  LW: 'Extremo izq.', RW: 'Extremo der.', ST: 'Delantero', CF: 'Segundo delantero',
};

export function per90(total, minutes) {
  if (!minutes || minutes === 0) return null;
  return (total / minutes) * 90;
}

export function safeDiv(numerator, denominator) {
  if (!denominator || denominator === 0) return null;
  return numerator / denominator;
}

export function pct(numerator, denominator) {
  const r = safeDiv(numerator, denominator);
  return r === null ? null : r * 100;
}

export function formatNum(v, decimals = 0) {
  if (v === null || v === undefined) return 'Sin dato';
  return Number(v).toFixed(decimals);
}

export function calcTrend(currentSum, previousSum) {
  if (currentSum === null || previousSum === null) return null;
  if (previousSum === 0 && currentSum === 0) return 'flat';
  if (previousSum === 0) return 'up';
  const diff = ((currentSum - previousSum) / previousSum) * 100;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'flat';
}

export function trendIcon(trend) {
  if (trend === 'up') return { icon: '▲', color: 'text-green-600' };
  if (trend === 'down') return { icon: '▼', color: 'text-red-600' };
  return { icon: '▬', color: 'text-slate-400' };
}

export function getPositionMetrics(position, stats) {
  const group = POSITION_GROUPS[position] || 'MF';
  const m = stats || {};

  if (group === 'GK') {
    return [
      { label: 'Partidos', value: m.appearances },
      { label: 'Titularidades', value: m.lineups },
      { label: 'Minutos', value: m.minutes },
      { label: 'Rating prom.', value: m.rating_avg ? Number(m.rating_avg).toFixed(2) : null },
      { label: 'Atajadas', value: m.saves },
      { label: 'Goles recibidos', value: m.goals_conceded },
      { label: 'Penales atajados', value: m.penalties_saved },
    ];
  }
  if (group === 'DF') {
    return [
      { label: 'Minutos', value: m.minutes },
      { label: 'Titularidades', value: m.lineups },
      { label: 'Rating prom.', value: m.rating_avg ? Number(m.rating_avg).toFixed(2) : null },
      { label: 'Entradas', value: m.tackles_total },
      { label: 'Intercepciones', value: m.tackles_interceptions },
      { label: 'Bloqueos', value: m.tackles_blocks },
      { label: 'Duelos ganados (%)', value: pct(m.duels_won, m.duels_total) ? `${pct(m.duels_won, m.duels_total).toFixed(0)}%` : null, calculated: true },
      { label: 'Precisión de pase (%)', value: m.pass_accuracy ? `${m.pass_accuracy}%` : null },
      { label: 'Goles', value: m.goals_total },
      { label: 'Asistencias', value: m.goals_assists },
    ];
  }
  if (group === 'MF') {
    return [
      { label: 'Minutos', value: m.minutes },
      { label: 'Titularidades', value: m.lineups },
      { label: 'Rating prom.', value: m.rating_avg ? Number(m.rating_avg).toFixed(2) : null },
      { label: 'Pases totales', value: m.passes_total },
      { label: 'Precisión de pase (%)', value: m.pass_accuracy ? `${m.pass_accuracy}%` : null },
      { label: 'Pases clave', value: m.passes_key },
      { label: 'Asistencias', value: m.goals_assists },
      { label: 'Duelos ganados (%)', value: pct(m.duels_won, m.duels_total) ? `${pct(m.duels_won, m.duels_total).toFixed(0)}%` : null, calculated: true },
      { label: 'Regates exitosos', value: m.dribbles_success },
      { label: 'Goles', value: m.goals_total },
    ];
  }
  // FW
  return [
    { label: 'Minutos', value: m.minutes },
    { label: 'Titularidades', value: m.lineups },
    { label: 'Rating prom.', value: m.rating_avg ? Number(m.rating_avg).toFixed(2) : null },
    { label: 'Goles', value: m.goals_total },
    { label: 'Asistencias', value: m.goals_assists },
    { label: 'G + A', value: (m.goals_total || 0) + (m.goals_assists || 0) },
    { label: 'G + A cada 90', value: per90((m.goals_total || 0) + (m.goals_assists || 0), m.minutes) ? per90((m.goals_total || 0) + (m.goals_assists || 0), m.minutes).toFixed(2) : null, calculated: true },
    { label: 'Remates totales', value: m.shots_total },
    { label: 'Remates al arco', value: m.shots_on },
    { label: 'Conversión (%)', value: pct(m.goals_total, m.shots_total) ? `${pct(m.goals_total, m.shots_total).toFixed(0)}%` : null, calculated: true },
    { label: 'Pases clave', value: m.passes_key },
    { label: 'Regates exitosos', value: m.dribbles_success },
  ];
}

export function getSummaryCards(matchStats, seasonStats) {
  const ms = matchStats || [];
  const ss = seasonStats || [];
  const totals = ss.reduce((acc, s) => ({
    appearances: acc.appearances + (s.appearances || 0),
    lineups: acc.lineups + (s.lineups || 0),
    minutes: acc.minutes + (s.minutes || 0),
    rating_sum: acc.rating_sum + (s.rating_avg || 0) * (s.appearances || 0),
    rating_count: acc.rating_count + (s.appearances || 0),
    goals: acc.goals + (s.goals_total || 0),
    assists: acc.assists + (s.goals_assists || 0),
    yellow: acc.yellow + (s.yellow_cards || 0),
    red: acc.red + (s.red_cards || 0),
  }), { appearances: 0, lineups: 0, minutes: 0, rating_sum: 0, rating_count: 0, goals: 0, assists: 0, yellow: 0, red: 0 });

  const last5 = ms.slice(0, 5);
  const prev5 = ms.slice(5, 10);
  const sumField = (arr, field) => arr.reduce((s, m) => s + (m[field] || 0), 0);

  return [
    { label: 'Partidos jugados', value: totals.appearances, trend: calcTrend(last5.length, prev5.length) },
    { label: 'Titularidades', value: totals.lineups, sub: totals.appearances ? `${pct(totals.lineups, totals.appearances).toFixed(0)}% titularidad` : null, trend: calcTrend(sumField(last5, 'started') ? 1 : 0, sumField(prev5, 'started') ? 1 : 0) },
    { label: 'Minutos totales', value: totals.minutes, sub: totals.appearances ? `${Math.round(totals.minutes / totals.appearances)} min/par.` : null, trend: calcTrend(sumField(last5, 'minutes'), sumField(prev5, 'minutes')) },
    { label: 'Calificación prom.', value: totals.rating_count ? (totals.rating_sum / totals.rating_count).toFixed(2) : null, trend: null },
    { label: 'Goles', value: totals.goals, trend: calcTrend(sumField(last5, 'goals'), sumField(prev5, 'goals')) },
    { label: 'Asistencias', value: totals.assists, trend: calcTrend(sumField(last5, 'assists'), sumField(prev5, 'assists')) },
    { label: 'Participaciones de gol', value: totals.goals + totals.assists, sub: 'G + A', trend: calcTrend(sumField(last5, 'goals') + sumField(last5, 'assists'), sumField(prev5, 'goals') + sumField(prev5, 'assists')) },
    { label: 'Tarjetas', value: totals.yellow + totals.red, sub: `${totals.yellow}A + ${totals.red}R`, trend: calcTrend(sumField(last5, 'yellow_cards') + sumField(last5, 'red_cards'), sumField(prev5, 'yellow_cards') + sumField(prev5, 'red_cards')) },
  ];
}

export function getKeyInsights(matchStats, seasonStats, position) {
  const insights = [];
  const ms = matchStats || [];
  if (ms.length > 0) {
    const last5 = ms.slice(0, 5);
    const prev5 = ms.slice(5, 10);
    const startsLast5 = last5.filter(m => m.started).length;
    insights.push({
      text: `Fue titular en ${startsLast5} de sus últimos ${last5.length} partidos`,
      metric: 'Titularidades', period: 'Últimos 5 partidos', sample: `${last5.length} partidos`,
    });
    if (prev5.length > 0) {
      const minLast5 = last5.reduce((s, m) => s + (m.minutes || 0), 0);
      const minPrev5 = prev5.reduce((s, m) => s + (m.minutes || 0), 0);
      if (minPrev5 > 0) {
        const pctChange = ((minLast5 - minPrev5) / minPrev5) * 100;
        const direction = pctChange > 0 ? 'aumentó' : 'disminuyó';
        insights.push({
          text: `${direction.charAt(0).toUpperCase() + direction.slice(1)} un ${Math.abs(pctChange).toFixed(0)}% sus minutos respecto de los 5 partidos anteriores`,
          metric: 'Minutos', period: 'Últimos 10 partidos', sample: `${last5.length + prev5.length} partidos`,
        });
      }
    }
  }
  const ss = seasonStats || [];
  if (ss.length > 0 && ss[0].minutes >= 450) {
    insights.push({
      text: `Se encuentra con datos suficientes para comparación posicional en ${POSITION_LABELS_FULL[position] || position}`,
      metric: 'Cobertura', period: 'Temporada actual', sample: `${ss[0].minutes} minutos`,
    });
  }
  return insights.slice(0, 3);
}

export function getCoverageStatus(identity, seasonStats, matchStats) {
  if (!identity || identity.status !== 'verified') return { label: 'Sin vincular', color: 'red' };
  if (identity.status === 'error') return { label: 'Error', color: 'red' };
  if (!seasonStats || seasonStats.length === 0) return { label: 'Sin datos', color: 'amber' };
  const hasMatchStats = matchStats && matchStats.length > 0;
  if (hasMatchStats) return { label: 'Actualizado', color: 'green' };
  return { label: 'Cobertura parcial', color: 'amber' };
}