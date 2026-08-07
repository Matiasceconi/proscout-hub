import React, { useMemo } from 'react';
import { EVENT_TYPE_COLORS, formatTime, WEEKDAYS_LONG, MONTHS, getDateKey, isToday } from './calendarUtils';
import { ChevronRight } from 'lucide-react';

function Avatar({ person }) {
  if (person.photo_url) {
    return <img src={person.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
      <span className="text-[9px] font-bold text-slate-500">{person.first_name?.[0]?.toUpperCase()}</span>
    </div>
  );
}

function AgendaItem({ item, onClick }) {
  const colors = EVENT_TYPE_COLORS[item.event_type] || EVENT_TYPE_COLORS.other;
  const isMatch = item.source_type === 'fixture';

  return (
    <button
      onClick={() => onClick(item)}
      className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
    >
      {/* Time */}
      <div className="flex-shrink-0 w-12 text-right">
        {item.all_day ? (
          <span className="text-[10px] text-slate-400 font-medium">Todo el día</span>
        ) : (
          <span className={`text-sm font-bold ${colors.text}`}>{formatTime(item.starts_at)}</span>
        )}
      </div>

      {/* Color dot */}
      <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}

        {/* Match details */}
        {isMatch && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1">
              {item.home_team_logo && <img src={item.home_team_logo} alt="" className="w-4 h-4 object-contain" />}
              <span className="text-xs text-slate-600">{item.home_team_name}</span>
            </div>
            <span className="text-[10px] text-slate-400">vs</span>
            <div className="flex items-center gap-1">
              {item.away_team_logo && <img src={item.away_team_logo} alt="" className="w-4 h-4 object-contain" />}
              <span className="text-xs text-slate-600">{item.away_team_name}</span>
            </div>
            {item.home_score != null && item.away_score != null && (
              <span className="text-xs font-bold text-slate-700 ml-1">{item.home_score} - {item.away_score}</span>
            )}
          </div>
        )}

        {/* Represented */}
        {item.represented?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <div className="flex -space-x-1.5">
              {item.represented.slice(0, 4).map(r => <Avatar key={`${r.type}-${r.id}`} person={r} />)}
            </div>
            <span className="text-xs text-slate-500">
              {item.represented.slice(0, 2).map(r => `${r.first_name} ${r.last_name}`).join(', ')}
              {item.represented.length > 2 && ` +${item.represented.length - 2}`}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {item.represented.length} representad{item.represented.length === 1 ? 'o' : 'os'}
            </span>
          </div>
        )}

        {/* Responsible + location */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.responsible && (
            <span className="text-[10px] text-slate-400">Resp. {item.responsible}</span>
          )}
          {item.location && (
            <span className="text-[10px] text-slate-400">📍 {item.location}</span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-2" />
    </button>
  );
}

export default function AgendaView({ items, onItemClick, emptyMessage }) {
  // Group by day
  const grouped = useMemo(() => {
    const map = {};
    for (const item of items) {
      const key = getDateKey(item.starts_at);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    // Sort by time within each day
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage || 'No hay eventos para mostrar'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(([dayKey, dayItems]) => {
        const date = new Date(dayKey + 'T12:00:00');
        const today = isToday(date);
        return (
          <div key={dayKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Sticky day header */}
            <div className={`sticky top-0 z-10 px-3 py-2 border-b border-slate-100 ${today ? 'bg-green-50' : 'bg-slate-50'}`}>
              <span className={`text-sm font-semibold ${today ? 'text-green-700' : 'text-slate-700'}`}>
                {WEEKDAYS_LONG[date.getDay() === 0 ? 6 : date.getDay() - 1]} {date.getDate()} {MONTHS[date.getMonth()].toLowerCase()}
                {today && <span className="ml-2 text-xs text-green-600 font-normal">· Hoy</span>}
              </span>
            </div>
            {dayItems.map(item => (
              <AgendaItem key={item.id} item={item} onClick={onItemClick} />
            ))}
          </div>
        );
      })}
    </div>
  );
}