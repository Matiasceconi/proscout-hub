import React from 'react';
import { Calendar, Gift, ClipboardList, AlertTriangle, Users, Video, Briefcase } from 'lucide-react';
import { formatTime } from './dashboardUtils';

const EVENT_TYPE_CONFIG = {
  match: { icon: Calendar, color: 'text-green-600 bg-green-50', label: 'Partido' },
  training: { icon: Users, color: 'text-blue-600 bg-blue-50', label: 'Entrenamiento' },
  medical: { icon: ClipboardList, color: 'text-red-600 bg-red-50', label: 'Médico' },
  travel: { icon: Briefcase, color: 'text-purple-600 bg-purple-50', label: 'Viaje' },
  media: { icon: Video, color: 'text-cyan-600 bg-cyan-50', label: 'Media' },
  meeting: { icon: Users, color: 'text-slate-600 bg-slate-100', label: 'Reunión' },
  other: { icon: Calendar, color: 'text-slate-600 bg-slate-100', label: 'Evento' },
};

const STATUS_LABELS = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
};

export default function DayAgenda({ events, onViewProfile }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Sin eventos adicionales hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
        const Icon = cfg.icon;
        const isExpiring = ev._isExpiring;
        const isBirthday = ev._isBirthday;
        return (
          <button
            key={ev.id}
            onClick={() => ev._person && onViewProfile(ev._person)}
            className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
          >
            <div className="flex-shrink-0 text-right w-12">
              <p className="text-sm font-semibold text-slate-700">{formatTime(ev.start_date)}</p>
            </div>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isExpiring ? 'text-amber-600 bg-amber-50' : isBirthday ? 'text-pink-600 bg-pink-50' : cfg.color}`}>
              {isExpiring ? <AlertTriangle className="w-4 h-4" /> : isBirthday ? <Gift className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-xs text-slate-400">{isExpiring ? 'Vencimiento' : isBirthday ? 'Cumpleaños' : cfg.label}</span>
                {ev.player_name && <span className="text-xs text-slate-400 truncate">· {ev.player_name}</span>}
                {ev.status && <span className="text-xs text-slate-400">· {STATUS_LABELS[ev.status] || ev.status}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}