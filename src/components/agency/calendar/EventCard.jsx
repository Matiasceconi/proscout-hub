import React from 'react';
import { EVENT_TYPE_COLORS, formatTime } from './calendarUtils';

function MiniAvatar({ person }) {
  if (person.photo_url) {
    return <img src={person.photo_url} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-white" />;
  }
  return (
    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center ring-1 ring-white">
      <span className="text-[8px] font-bold text-slate-500">{person.first_name?.[0]?.toUpperCase()}</span>
    </div>
  );
}

export default function EventCard({ item, onClick, compact }) {
  const colors = EVENT_TYPE_COLORS[item.event_type] || EVENT_TYPE_COLORS.other;
  const isMatch = item.source_type === 'fixture';

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-full text-left rounded-md border ${colors.border} ${colors.bg} p-1.5 hover:shadow-sm transition-all ${compact ? 'min-h-[28px]' : 'min-h-[40px]'}`}
    >
      {/* Time + title */}
      <div className="flex items-start gap-1">
        {!item.all_day && (
          <span className={`text-[10px] font-semibold ${colors.text} flex-shrink-0 mt-0.5`}>
            {formatTime(item.starts_at)}
          </span>
        )}
        <span className={`text-xs font-semibold ${colors.text} truncate leading-tight`}>
          {item.title}
        </span>
      </div>

      {/* Match details */}
      {isMatch && !compact && (
        <div className="flex items-center gap-1 mt-1">
          {item.home_team_logo && <img src={item.home_team_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
          {item.away_team_logo && <img src={item.away_team_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
          {item.represented?.length > 0 && (
            <div className="flex -space-x-1">
              {item.represented.slice(0, 3).map(r => <MiniAvatar key={`${r.type}-${r.id}`} person={r} />)}
            </div>
          )}
          {item.represented?.length > 0 && (
            <span className="text-[9px] text-slate-500">{item.represented.length} repr.</span>
          )}
        </div>
      )}

      {/* Non-match represented */}
      {!isMatch && !compact && item.represented?.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <div className="flex -space-x-1">
            {item.represented.slice(0, 3).map(r => <MiniAvatar key={`${r.type}-${r.id}`} person={r} />)}
          </div>
          <span className="text-[9px] text-slate-500 truncate">{item.represented[0].first_name}</span>
        </div>
      )}
    </button>
  );
}