import React, { useMemo } from 'react';
import { WEEKDAYS_SHORT, MONTHS, getMonthGrid, getDateKey, isToday } from './calendarUtils';
import { EVENT_TYPE_COLORS } from './calendarUtils';

export default function MonthView({ monthDate, items, onItemClick }) {
  const grid = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const itemsByDay = useMemo(() => {
    const map = {};
    for (const item of items) {
      const key = getDateKey(item.starts_at);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {WEEKDAYS_SHORT.map(wd => (
          <div key={wd} className="px-2 py-2 text-center text-xs font-medium text-slate-500 bg-slate-50 border-r border-slate-100 last:border-r-0">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const dayKey = getDateKey(day);
          const dayItems = itemsByDay[dayKey] || [];
          const inMonth = day.getMonth() === monthDate.getMonth();
          const today = isToday(day);

          return (
            <div
              key={idx}
              className={`min-h-[80px] sm:min-h-[110px] border-r border-b border-slate-100 last:border-r-0 p-1 ${!inMonth ? 'bg-slate-50/50' : ''} ${today ? 'bg-green-50/40' : ''}`}
            >
              <div className="flex items-center justify-center mb-1">
                <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${today ? 'bg-green-600 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const colors = EVENT_TYPE_COLORS[item.event_type] || EVENT_TYPE_COLORS.other;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      className={`w-full text-left text-[10px] truncate px-1 py-0.5 rounded ${colors.bg} ${colors.text} hover:opacity-80 transition`}
                    >
                      {!item.all_day && <span className="font-semibold">{item.starts_at ? new Date(item.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''} </span>}
                      {item.title}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1">+{dayItems.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}