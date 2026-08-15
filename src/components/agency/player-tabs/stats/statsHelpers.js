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

export function trendLabel(trend) {
  if (trend === 'up') return 'Al alza';
  if (trend === 'down') return 'A la baja';
  return 'Estable';
}

// Suma un campo de un array de match stats
function sumField(arr, field) {
  return (arr || []).reduce((s, m) => s + (m[field] || 0), 0);
}

// Calcula promedio de un campo de match stats (solo los que tienen valor)
function avgField(arr, field) {
  const valid = (arr || []).filter(m => m[field] !== null && m[field] !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((s, m) => s + Number(m[field]), 0) / valid.length;
}

// Cuenta vallas invictas para arquero (partidos donde goals_conceded = 0 y jugó)
function countCleanSheets(matchStats) {
  return (matchStats || []).filter(m => (m.minutes || 0) > 0 && (m.goals_conceded || 0) === 0).length;
}

/**
 * Summary cards específicos por posición (6-8 indicadores)
 * Cada card: { label, value, sub, trend, isReduced }
 */
export function getSummaryCards(matchStats, seasonStats, position) {
  const ms = (matchStats || []).slice(); // ya ordenados desc
  const ss = seasonStats || [];
  const group = POSITION_GROUPS[position] || 'MF';

  // Totales de season stats
  const totals = ss.reduce((acc, s) => ({
    appearances: acc.appearances + (s.appearances || 0),
    lineups: acc.lineups + (s.lineups || 0),
    minutes: acc.minutes + (s.minutes || 0),
    rating_sum: acc.rating_sum + (s.rating_avg || 0) * (s.appearances || 0),
    rating_count: acc.rating_count + (s.appearances || 0),
    goals: acc.goals + (s.goals_total || 0),
    assists: acc.assists + (s.goals_assists || 0),
    shots: acc.shots + (s.shots_total || 0),
    shots_on: acc.shots_on + (s.shots_on || 0),
    passes: acc.passes + (s.passes_total || 0),
    key_passes: acc.key_passes + (s.passes_key || 0),
    tackles: acc.tackles + (s.tackles_total || 0),
    interceptions: acc.interceptions + (s.tackles_interceptions || 0),
    duels_won: acc.duels_won + (s.duels_won || 0),
    duels_total: acc.duels_total + (s.duels_total || 0),
    saves: acc.saves + (s.saves || 0),
    goals_conceded: acc.goals_conceded + (s.goals_conceded || 0),
  }), {
    appearances: 0, lineups: 0, minutes: 0, rating_sum: 0, rating_count: 0,
    goals: 0, assists: 0, shots: 0, shots_on: 0, passes: 0, key_passes: 0,
    tackles: 0, interceptions: 0, duels_won: 0, duels_total: 0, saves: 0, goals_conceded: 0,
  });

  const last5 = ms.slice(0, 5);
  const prev5 = ms.slice(5, 10);
  const isReduced = totals.minutes < 450;
  const ratingAvg = totals.rating_count ? (totals.rating_sum / totals.rating_count).toFixed(2) : null;

  // Helper para crear card con trend basado en sumas de last5 vs prev5
  const card = (label, value, field, sub = null, isAvg = false) => ({
    label,
    value,
    sub,
    trend: isAvg ? calcTrend(avgField(last5, field), avgField(prev5, field)) : calcTrend(sumField(last5, field), sumField(prev5, field)),
    isReduced,
  });

  if (group === 'GK') {
    return [
      card('Partidos', totals.appearances, 'minutes', totals.lineups ? `${totals.lineups} titularidades` : null),
      card('Titularidades', totals.lineups, 'started'),
      card('Minutos', totals.minutes, 'minutes', totals.appearances ? `${Math.round(totals.minutes / totals.appearances)} min/par.` : null),
      { label: 'Calificación prom.', value: ratingAvg, sub: null, trend: calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating')), isReduced },
      card('Atajadas', totals.saves, 'saves'),
      card('Goles recibidos', totals.goals_conceded, 'goals_conceded'),
      { label: 'Vallas invictas', value: countCleanSheets(ms), sub: totals.appearances ? `${pct(countCleanSheets(ms), totals.appearances)?.toFixed(0) || 0}%` : null, trend: null, isReduced },
    ];
  }

  if (group === 'DF') {
    return [
      card('Minutos', totals.minutes, 'minutes', totals.appearances ? `${Math.round(totals.minutes / totals.appearances)} min/par.` : null),
      card('Titularidades', totals.lineups, 'started'),
      { label: 'Calificación prom.', value: ratingAvg, sub: null, trend: calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating')), isReduced },
      card('Entradas', totals.tackles, 'tackles'),
      card('Intercepciones', totals.interceptions, 'interceptions'),
      { label: 'Duelos ganados %', value: pct(totals.duels_won, totals.duels_total) ? `${pct(totals.duels_won, totals.duels_total).toFixed(0)}%` : null, sub: null, trend: calcTrend(pct(sumField(last5, 'duels_won'), sumField(last5, 'duels_total')), pct(sumField(prev5, 'duels_won'), sumField(prev5, 'duels_total'))), isReduced },
      { label: 'Precisión de pase', value: totals.passes ? `${pct(totals.passes - 0, totals.passes)?.toFixed(0) || 0}%` : null, sub: null, trend: calcTrend(avgField(last5, 'pass_accuracy'), avgField(prev5, 'pass_accuracy')), isReduced },
      card('Goles', totals.goals, 'goals'),
    ];
  }

  if (group === 'MF') {
    return [
      card('Minutos', totals.minutes, 'minutes', totals.appearances ? `${Math.round(totals.minutes / totals.appearances)} min/par.` : null),
      card('Titularidades', totals.lineups, 'started'),
      { label: 'Calificación prom.', value: ratingAvg, sub: null, trend: calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating')), isReduced },
      card('Pases', totals.passes, 'passes_total'),
      { label: 'Precisión de pase', value: avgField(ms, 'pass_accuracy') ? `${avgField(ms, 'pass_accuracy').toFixed(0)}%` : null, sub: null, trend: calcTrend(avgField(last5, 'pass_accuracy'), avgField(prev5, 'pass_accuracy')), isReduced },
      card('Pases clave', totals.key_passes, 'key_passes'),
      card('Asistencias', totals.assists, 'assists'),
      { label: 'Duelos ganados %', value: pct(totals.duels_won, totals.duels_total) ? `${pct(totals.duels_won, totals.duels_total).toFixed(0)}%` : null, sub: null, trend: calcTrend(pct(sumField(last5, 'duels_won'), sumField(last5, 'duels_total')), pct(sumField(prev5, 'duels_won'), sumField(prev5, 'duels_total'))), isReduced },
    ];
  }

  // FW
  const gaPer90 = per90(totals.goals + totals.assists, totals.minutes);
  return [
    card('Minutos', totals.minutes, 'minutes', totals.appearances ? `${Math.round(totals.minutes / totals.appearances)} min/par.` : null),
    card('Titularidades', totals.lineups, 'started'),
    { label: 'Calificación prom.', value: ratingAvg, sub: null, trend: calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating')), isReduced },
    card('Goles', totals.goals, 'goals'),
    card('Asistencias', totals.assists, 'assists'),
    { label: 'Goles + Asistencias', value: totals.goals + totals.assists, sub: null, trend: calcTrend(sumField(last5, 'goals') + sumField(last5, 'assists'), sumField(prev5, 'goals') + sumField(prev5, 'assists')), isReduced },
    { label: 'G+A cada 90', value: gaPer90 ? gaPer90.toFixed(2) : null, sub: null, trend: null, isReduced },
    card('Remates', totals.shots, 'shots_total'),
    card('Remates al arco', totals.shots_on, 'shots_on_target'),
  ];
}

/**
 * Métricas por posición para tabla detallada
 * Cada item: { label, value, per90Value, trend, calculated }
 */
export function getPositionMetrics(position, seasonStats, matchStats) {
  const group = POSITION_GROUPS[position] || 'MF';
  const s = (seasonStats && seasonStats[0]) || {};
  const ms = matchStats || [];
  const minutes = s.minutes || 0;
  const last5 = ms.slice(0, 5);
  const prev5 = ms.slice(5, 10);

  const metric = (label, total, field, isPer90 = true, isAvg = false) => ({
    label,
    value: total,
    per90Value: isPer90 && minutes > 0 ? per90(total, minutes) : null,
    trend: isAvg ? calcTrend(avgField(last5, field), avgField(prev5, field)) : calcTrend(sumField(last5, field), sumField(prev5, field)),
    calculated: false,
  });

  const calcMetric = (label, value, per90Val, trend) => ({
    label, value, per90Value: per90Val, trend, calculated: true,
  });

  if (group === 'GK') {
    return [
      metric('Partidos', s.appearances, 'minutes', false),
      metric('Titularidades', s.lineups, 'started', false),
      metric('Banco', s.bench, 'substitute', false),
      metric('Minutos', s.minutes, 'minutes', false),
      calcMetric('Calificación prom.', s.rating_avg ? Number(s.rating_avg).toFixed(2) : null, null, calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating'))),
      metric('Atajadas', s.saves, 'saves'),
      metric('Goles recibidos', s.goals_conceded, 'goals_conceded'),
      metric('Penales atajados', s.penalties_saved, 'penalties_saved'),
      { label: 'Vallas invictas', value: countCleanSheets(ms), per90Value: null, trend: null, calculated: true },
    ];
  }

  if (group === 'DF') {
    return [
      metric('Partidos', s.appearances, 'minutes', false),
      metric('Titularidades', s.lineups, 'started', false),
      metric('Minutos', s.minutes, 'minutes', false),
      calcMetric('Calificación prom.', s.rating_avg ? Number(s.rating_avg).toFixed(2) : null, null, calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating'))),
      metric('Entradas', s.tackles_total, 'tackles'),
      metric('Intercepciones', s.tackles_interceptions, 'interceptions'),
      metric('Bloqueos', s.tackles_blocks, 'blocks'),
      calcMetric('Duelos ganados %', pct(s.duels_won, s.duels_total) ? `${pct(s.duels_won, s.duels_total).toFixed(0)}%` : null, null, calcTrend(pct(sumField(last5, 'duels_won'), sumField(last5, 'duels_total')), pct(sumField(prev5, 'duels_won'), sumField(prev5, 'duels_total')))),
      calcMetric('Precisión de pase %', s.pass_accuracy ? `${s.pass_accuracy}%` : null, null, calcTrend(avgField(last5, 'pass_accuracy'), avgField(prev5, 'pass_accuracy'))),
      metric('Goles', s.goals_total, 'goals'),
      metric('Asistencias', s.goals_assists, 'assists'),
      metric('Remates', s.shots_total, 'shots_total'),
      metric('Faltas cometidas', s.fouls_committed, 'fouls_committed'),
      metric('Amarillas', s.yellow_cards, 'yellow_cards', false),
      metric('Rojas', s.red_cards, 'red_cards', false),
    ];
  }

  if (group === 'MF') {
    return [
      metric('Partidos', s.appearances, 'minutes', false),
      metric('Titularidades', s.lineups, 'started', false),
      metric('Minutos', s.minutes, 'minutes', false),
      calcMetric('Calificación prom.', s.rating_avg ? Number(s.rating_avg).toFixed(2) : null, null, calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating'))),
      metric('Pases totales', s.passes_total, 'passes_total'),
      calcMetric('Precisión de pase %', s.pass_accuracy ? `${s.pass_accuracy}%` : null, null, calcTrend(avgField(last5, 'pass_accuracy'), avgField(prev5, 'pass_accuracy'))),
      metric('Pases clave', s.passes_key, 'key_passes'),
      metric('Asistencias', s.goals_assists, 'assists'),
      metric('Goles', s.goals_total, 'goals'),
      calcMetric('Duelos ganados %', pct(s.duels_won, s.duels_total) ? `${pct(s.duels_won, s.duels_total).toFixed(0)}%` : null, null, calcTrend(pct(sumField(last5, 'duels_won'), sumField(last5, 'duels_total')), pct(sumField(prev5, 'duels_won'), sumField(prev5, 'duels_total')))),
      metric('Regates exitosos', s.dribbles_success, 'dribbles_successful'),
      metric('Regates intentados', s.dribbles_attempts, 'dribbles_attempted'),
      metric('Faltas recibidas', s.fouls_drawn, 'fouls_drawn'),
      metric('Amarillas', s.yellow_cards, 'yellow_cards', false),
      metric('Rojas', s.red_cards, 'red_cards', false),
    ];
  }

  // FW
  return [
    metric('Partidos', s.appearances, 'minutes', false),
    metric('Titularidades', s.lineups, 'started', false),
    metric('Minutos', s.minutes, 'minutes', false),
    calcMetric('Calificación prom.', s.rating_avg ? Number(s.rating_avg).toFixed(2) : null, null, calcTrend(avgField(last5, 'rating'), avgField(prev5, 'rating'))),
    metric('Goles', s.goals_total, 'goals'),
    metric('Asistencias', s.goals_assists, 'assists'),
    calcMetric('Goles + Asistencias', (s.goals_total || 0) + (s.goals_assists || 0), per90((s.goals_total || 0) + (s.goals_assists || 0), s.minutes) ? per90((s.goals_total || 0) + (s.goals_assists || 0), s.minutes).toFixed(2) : null, calcTrend(sumField(last5, 'goals') + sumField(last5, 'assists'), sumField(prev5, 'goals') + sumField(prev5, 'assists'))),
    metric('Remates totales', s.shots_total, 'shots_total'),
    metric('Remates al arco', s.shots_on, 'shots_on_target'),
    calcMetric('Conversión %', pct(s.goals_total, s.shots_total) ? `${pct(s.goals_total, s.shots_total).toFixed(0)}%` : null, null, calcTrend(pct(sumField(last5, 'goals'), sumField(last5, 'shots_total')), pct(sumField(prev5, 'goals'), sumField(prev5, 'shots_total')))),
    metric('Pases clave', s.passes_key, 'key_passes'),
    metric('Regates exitosos', s.dribbles_success, 'dribbles_successful'),
    metric('Faltas recibidas', s.fouls_drawn, 'fouls_drawn'),
    metric('Amarillas', s.yellow_cards, 'yellow_cards', false),
    metric('Rojas', s.red_cards, 'red_cards', false),
  ];
}

/**
 * Conclusiones deterministas para representación (máximo 3)
 */
export function getKeyInsights(matchStats, seasonStats, position) {
  const insights = [];
  const ms = (matchStats || []).slice();
  const ss = seasonStats || [];
  const group = POSITION_GROUPS[position] || 'MF';

  if (ms.length > 0) {
    const last5 = ms.slice(0, 5);
    const prev5 = ms.slice(5, 10);
    const startsLast5 = last5.filter(m => m.started).length;

    insights.push({
      text: `Fue titular en ${startsLast5} de sus últimos ${last5.length} partidos`,
      metric: 'Titularidades',
      period: 'Últimos 5 partidos',
      sample: `${last5.length} partidos`,
    });

    if (prev5.length > 0) {
      const minLast5 = sumField(last5, 'minutes');
      const minPrev5 = sumField(prev5, 'minutes');
      if (minPrev5 > 0) {
        const pctChange = ((minLast5 - minPrev5) / minPrev5) * 100;
        const direction = pctChange > 0 ? 'aumentó' : 'disminuyó';
        insights.push({
          text: `${direction.charAt(0).toUpperCase() + direction.slice(1)} un ${Math.abs(pctChange).toFixed(0)}% sus minutos respecto de los 5 partidos anteriores`,
          metric: 'Minutos',
          period: 'Últimos 10 partidos',
          sample: `${last5.length + prev5.length} partidos`,
        });
      }
    }

    // Insight específico por posición
    if (group === 'FW' && ss.length > 0) {
      const goalsLast5 = sumField(last5, 'goals');
      if (goalsLast5 > 0) {
        insights.push({
          text: `Convirtió ${goalsLast5} goles en sus últimos ${last5.length} partidos`,
          metric: 'Goles',
          period: 'Últimos 5 partidos',
          sample: `${last5.length} partidos`,
        });
      }
    } else if (group === 'MF' && ss.length > 0) {
      const keyPassesLast5 = sumField(last5, 'key_passes');
      if (keyPassesLast5 > 0) {
        insights.push({
          text: `Generó ${keyPassesLast5} pases clave en sus últimos ${last5.length} partidos`,
          metric: 'Pases clave',
          period: 'Últimos 5 partidos',
          sample: `${last5.length} partidos`,
        });
      }
    } else if (group === 'DF' && ss.length > 0) {
      const tacklesLast5 = sumField(last5, 'tackles');
      if (tacklesLast5 > 0) {
        insights.push({
          text: `Logró ${tacklesLast5} entradas en sus últimos ${last5.length} partidos`,
          metric: 'Entradas',
          period: 'Últimos 5 partidos',
          sample: `${last5.length} partidos`,
        });
      }
    } else if (group === 'GK' && ss.length > 0) {
      const savesLast5 = sumField(last5, 'saves');
      if (savesLast5 > 0) {
        insights.push({
          text: `Realizó ${savesLast5} atajadas en sus últimos ${last5.length} partidos`,
          metric: 'Atajadas',
          period: 'Últimos 5 partidos',
          sample: `${last5.length} partidos`,
        });
      }
    }
  }

  if (ss.length > 0 && ss[0].minutes >= 450) {
    insights.push({
      text: `Cuenta con datos suficientes para comparación posicional en ${POSITION_LABELS_FULL[position] || position}`,
      metric: 'Cobertura',
      period: 'Temporada actual',
      sample: `${ss[0].minutes} minutos`,
    });
  }

  return insights.slice(0, 3);
}

export function getCoverageStatus(identity, seasonStats, matchStats, syncing = false) {
  if (syncing) return { label: 'Actualizando', color: 'blue' };
  if (!identity || identity.status !== 'verified') return { label: 'Sin vincular', color: 'red' };
  if (identity.status === 'error') return { label: 'Error', color: 'red' };
  if (!seasonStats || seasonStats.length === 0) return { label: 'Sin datos', color: 'amber' };
  const hasMatchStats = matchStats && matchStats.length > 0;
  if (hasMatchStats) return { label: 'Actualizado', color: 'green' };
  return { label: 'Cobertura parcial', color: 'amber' };
}