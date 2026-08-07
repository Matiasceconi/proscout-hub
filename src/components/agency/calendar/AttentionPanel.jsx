import React, { useMemo } from 'react';
import { FileWarning, UserX, BarChart3, Calendar, Plane, FileText, ChevronRight } from 'lucide-react';
import { isWithinDays, isToday, isFuture, formatTime } from './calendarUtils';

export default function AttentionPanel({ items, fixtures, documents, players, matchStats, onItemClick, onActionClick }) {
  // Compute attention items
  const attention = useMemo(() => {
    const alerts = [];

    // 1. Convocatorias por confirmar (fixtures with TBD/PST status or no stadium)
    const toConfirm = fixtures.filter(f => {
      const fixtureItem = items.find(i => i.source_type === 'fixture' && i.source_id === f.id);
      return fixtureItem && (!f.stadium || f.fixture_status === 'TBD' || f.fixture_status === 'PST');
    });
    if (toConfirm.length > 0) {
      alerts.push({
        id: 'confirm-callups',
        icon: Calendar,
        color: 'text-amber-600 bg-amber-50',
        title: `${toConfirm.length} convocatoria${toConfirm.length === 1 ? '' : 's'} por confirmar`,
        desc: 'Revisá y confirmá convocatorias pendientes',
        action: () => onActionClick?.('confirm-callups'),
      });
    }

    // 2. Documentos próximos a vencer (within 7 days)
    const expiringDocs = documents.filter(d => {
      if (!d.expiry_date) return false;
      return isWithinDays(d.expiry_date + 'T23:59:59', 7);
    });
    if (expiringDocs.length > 0) {
      alerts.push({
        id: 'expiring-docs',
        icon: FileWarning,
        color: 'text-amber-600 bg-amber-50',
        title: `${expiringDocs.length} documento${expiringDocs.length === 1 ? '' : 's'} vence${expiringDocs.length === 1 ? '' : 'n'} pronto`,
        desc: expiringDocs.map(d => `${d.title}${d.player_name ? ' · ' + d.player_name : ''}`).slice(0, 2).join(', '),
        action: () => onActionClick?.('expiring-docs'),
      });
    }

    // 3. Contratos próximos a vencer
    const expiringContracts = players.filter(p => p.contract_end && isWithinDays(p.contract_end + 'T23:59:59', 7));
    if (expiringContracts.length > 0) {
      alerts.push({
        id: 'expiring-contracts',
        icon: FileText,
        color: 'text-orange-600 bg-orange-50',
        title: `${expiringContracts.length} contrato${expiringContracts.length === 1 ? '' : 's'} por vencer`,
        desc: expiringContracts.map(p => `${p.first_name} ${p.last_name} vence ${new Date(p.contract_end).toLocaleDateString('es-ES')}`).slice(0, 2).join(', '),
        action: () => onActionClick?.('expiring-contracts'),
      });
    }

    // 4. Eventos sin responsable
    const noResponsible = items.filter(i => i.source_type === 'manual' && !i.responsible && isFuture(i.starts_at));
    if (noResponsible.length > 0) {
      alerts.push({
        id: 'no-responsible',
        icon: UserX,
        color: 'text-slate-600 bg-slate-100',
        title: `${noResponsible.length} evento${noResponsible.length === 1 ? '' : 's'} sin responsable`,
        desc: 'Asigná un responsable para evitar omisiones',
        action: () => onActionClick?.('no-responsible'),
      });
    }

    // 5. Seguimientos pendientes
    const pendingFollowUps = matchStats.filter(s => s.follow_up_status === 'pending');
    if (pendingFollowUps.length > 0) {
      alerts.push({
        id: 'pending-followups',
        icon: BarChart3,
        color: 'text-blue-600 bg-blue-50',
        title: `${pendingFollowUps.length} seguimiento${pendingFollowUps.length === 1 ? '' : 's'} pendiente${pendingFollowUps.length === 1 ? '' : 's'}`,
        desc: 'Actualizá seguimientos abiertos esta semana',
        action: () => onActionClick?.('pending-followups'),
      });
    }

    return alerts;
  }, [items, fixtures, documents, players, matchStats]);

  // Summary of next 7 days
  const summary = useMemo(() => {
    const upcoming = items.filter(i => isWithinDays(i.starts_at, 7) && isFuture(i.starts_at));
    const matches = upcoming.filter(i => i.source_type === 'fixture').length;
    const represented = new Set();
    upcoming.forEach(i => i.represented?.forEach(r => represented.add(`${r.type}-${r.id}`)));
    const travels = upcoming.filter(i => i.event_type === 'travel').length;
    const expiring = upcoming.filter(i => i.source_type === 'contract' || i.source_type === 'document').length;

    return { matches, represented: represented.size, travels, expiring };
  }, [items]);

  // Next event
  const nextEvent = useMemo(() => {
    const upcoming = items
      .filter(i => isFuture(i.starts_at))
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    return upcoming[0] || null;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Requiere atención */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Requiere atención</h3>
        {attention.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Todo bajo control ✅</p>
        ) : (
          <div className="space-y-2">
            {attention.map(a => (
              <button
                key={a.id}
                onClick={a.action}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <a.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{a.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{a.desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Próximos 7 días */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Próximos 7 días</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-green-700">{summary.matches}</p>
            <p className="text-[10px] text-slate-500">Partidos</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-blue-700">{summary.represented}</p>
            <p className="text-[10px] text-slate-500">Representados</p>
          </div>
          <div className="bg-sky-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-sky-700">{summary.travels}</p>
            <p className="text-[10px] text-slate-500">Viajes</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-amber-700">{summary.expiring}</p>
            <p className="text-[10px] text-slate-500">Vencimientos</p>
          </div>
        </div>
      </div>

      {/* Próximo evento */}
      {nextEvent && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Próximo evento</h3>
          <button onClick={() => onItemClick(nextEvent)} className="w-full text-left hover:bg-slate-50 rounded-lg p-2 transition">
            <p className="text-xs text-slate-400">
              {isToday(nextEvent.starts_at) ? 'Hoy' : new Date(nextEvent.starts_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
              {!nextEvent.all_day && ` · ${formatTime(nextEvent.starts_at)}`}
            </p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{nextEvent.title}</p>
            {nextEvent.source_type === 'fixture' && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {nextEvent.home_team_logo && <img src={nextEvent.home_team_logo} alt="" className="w-4 h-4 object-contain" />}
                <span className="text-[10px] text-slate-400">VS</span>
                {nextEvent.away_team_logo && <img src={nextEvent.away_team_logo} alt="" className="w-4 h-4 object-contain" />}
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}