import React, { useMemo } from 'react';
import EventCard from './EventCard';
import { WEEKDAYS_SHORT, isSameDay, isToday, getDateKey } from './calendarUtils';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const HOUR_HEIGHT = 52; // px per hour

export default function WeekView({ weekDays, items, onItemClick }) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Group items by day
  const itemsByDay = useMemo(() => {
    const map = {};
    for (const d of weekDays) map[getDateKey(d)] = [];
    for (const item of items) {
      const key = getDateKey(item.starts_at);
      if (map[key]) {
        // All-day items go to all-day section; timed items go to grid
        map[key].push(item);
      }
    }
    return map;
  }, [items, weekDays]);

  // Position for timed events
  const getItemPosition = (item) => {
    if (item.all_day) return null;
    const d = new Date(item.starts_at);
    const startHour = d.getHours() + d.getMinutes() / 60;
    const endHour = item.ends_at ? new Date(item.ends_at).getHours() + new Date(item.ends_at).getMinutes() / 60 : startHour + 1;
    const top = Math.max(0, (startHour - 8) * HOUR_HEIGHT);
    const height = Math.max(24, (endHour - startHour) * HOUR_HEIGHT);
    return { top, height };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex">
        {/* Time column */}
        <div className="w-12 sm:w-14 flex-shrink-0 border-r border-slate-100">
          <div className="h-8 border-b border-slate-100 bg-slate-50" />
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-slate-400 text-right pr-1.5 pt-0.5 border-b border-slate-50">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-[700px]">
            {weekDays.map((day, idx) => {
              const dayKey = getDateKey(day);
              const dayItems = itemsByDay[dayKey] || [];
              const allDayItems = dayItems.filter(i => i.all_day);
              const timedItems = dayItems.filter(i => !i.all_day);
              const today = isToday(day);

              return (
                <div key={idx} className={`flex-1 border-r border-slate-100 last:border-r-0 ${today ? 'bg-green-50/40' : ''}`}>
                  {/* Day header */}
                  <div className={`h-8 border-b border-slate-100 flex items-center justify-center ${today ? 'bg-green-100' : 'bg-slate-50'}`}>
                    <span className={`text-xs font-medium ${today ? 'text-green-700' : 'text-slate-600'}`}>
                      {WEEKDAYS_SHORT[idx]} {day.getDate()}
                    </span>
                  </div>

                  {/* All-day section */}
                  {allDayItems.length > 0 && (
                    <div className="px-1 py-1 space-y-1 border-b border-slate-100 bg-slate-50/50">
                      {allDayItems.map(item => (
                        <EventCard key={item.id} item={item} onClick={onItemClick} compact />
                      ))}
                    </div>
                  )}

                  {/* Timed grid */}
                  <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div key={h} style={{ top: (h - 8) * HOUR_HEIGHT }} className="absolute left-0 right-0 border-b border-slate-50" />
                    ))}

                    {/* Current time line */}
                    {today && currentHour >= 8 && currentHour <= 20 && (
                      <div
                        style={{ top: (currentHour - 8) * HOUR_HEIGHT }}
                        className="absolute left-0 right-0 z-10 flex items-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    )}

                    {/* Timed events */}
                    {timedItems.map(item => {
                      const pos = getItemPosition(item);
                      if (!pos) return null;
                      return (
                        <div
                          key={item.id}
                          style={{ top: pos.top, height: pos.height }}
                          className="absolute left-1 right-1 z-5"
                        >
                          <EventCard item={item} onClick={onItemClick} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}