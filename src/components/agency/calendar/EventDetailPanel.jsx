import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, User, Users, FileText, Edit, Trash2, Check, ExternalLink, Calendar } from 'lucide-react';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatTime, formatDateLong } from './calendarUtils';
import { useIsMobile } from '@/hooks/use-mobile';

function Avatar({ person }) {
  if (person.photo_url) {
    return <img src={person.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
      <span className="text-xs font-bold text-slate-500">{person.first_name?.[0]?.toUpperCase()}</span>
    </div>
  );
}

function DetailContent({ item, onClose, onEdit, onDelete, onComplete, onViewProfile, onViewMatch, canEdit }) {
  const colors = EVENT_TYPE_COLORS[item.event_type] || EVENT_TYPE_COLORS.other;
  const isMatch = item.source_type === 'fixture';
  const isAuto = item.source_type !== 'manual';

  return (
    <div className="space-y-4">
      {/* Type badge + title */}
      <div>
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} mb-2`}>
          {EVENT_TYPE_LABELS[item.event_type] || item.event_type}
        </span>
        <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
        {item.subtitle && !isMatch && <p className="text-sm text-slate-500 mt-1">{item.subtitle}</p>}
      </div>

      {/* Match details */}
      {isMatch && (
        <div className={`rounded-lg ${colors.bg} border ${colors.border} p-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 justify-end">
              {item.home_team_logo && <img src={item.home_team_logo} alt="" className="w-8 h-8 object-contain" />}
              <span className="text-sm font-semibold text-slate-700 text-right">{item.home_team_name}</span>
            </div>
            <div className="text-center px-2">
              {item.home_score != null && item.away_score != null ? (
                <p className="text-lg font-bold text-slate-800">{item.home_score} - {item.away_score}</p>
              ) : (
                <p className="text-xs text-slate-400">vs</p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">{item.competition_name}</p>
            </div>
            <div className="flex items-center gap-2 flex-1">
              {item.away_team_logo && <img src={item.away_team_logo} alt="" className="w-8 h-8 object-contain" />}
              <span className="text-sm font-semibold text-slate-700">{item.away_team_name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Date/time */}
      <div className="flex items-start gap-2 text-sm">
        <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
        <div>
          <p className="text-slate-700 font-medium">{formatDateLong(item.starts_at)}</p>
          {!item.all_day && <p className="text-slate-500 text-xs">{formatTime(item.starts_at)} {item.ends_at && `— ${formatTime(item.ends_at)}`}</p>}
          {item.all_day && <p className="text-slate-500 text-xs">Todo el día</p>}
        </div>
      </div>

      {/* Location */}
      {item.location && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
          <p className="text-slate-700">{item.location}</p>
        </div>
      )}

      {/* Status + priority */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABELS[item.status] || item.status}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
          Prioridad {PRIORITY_LABELS[item.priority] || item.priority}
        </span>
      </div>

      {/* Represented */}
      {item.represented?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Representados</p>
          <div className="space-y-2">
            {item.represented.map(r => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => onViewProfile(r)}
                className="flex items-center gap-2 w-full hover:bg-slate-50 p-1.5 rounded-lg transition text-left"
              >
                <Avatar person={r} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-slate-400">{r.type === 'player' ? 'Jugador' : 'DT'}</p>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  {r.type === 'player' ? 'JUG' : 'DT'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Responsible */}
      {item.responsible && (
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">Responsable:</span>
          <span className="text-slate-700 font-medium">{item.responsible}</span>
        </div>
      )}

      {/* Source */}
      <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
        <FileText className="w-3.5 h-3.5" />
        <span>Origen: {isMatch ? 'Partido (API-Football)' : isAuto ? 'Automático' : 'Evento manual'}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {isMatch && (
          <Button variant="outline" size="sm" onClick={() => onViewMatch(item)}>
            <ExternalLink className="w-4 h-4 mr-1" /> Ver partido
          </Button>
        )}
        {canEdit && !isAuto && (
          <>
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
            <Button variant="outline" size="sm" onClick={onComplete}><Check className="w-4 h-4 mr-1" /> Completar</Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4 mr-1" /> Eliminar</Button>
          </>
        )}
        {isAuto && (
          <p className="text-xs text-slate-400 italic">Este evento es automático y se gestiona desde su origen</p>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPanel({ item, onClose, onEdit, onDelete, onComplete, onViewProfile, onViewMatch, canEdit }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle del evento</SheetTitle>
          </SheetHeader>
          {item && (
            <DetailContent
              item={item}
              onClose={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onViewProfile={onViewProfile}
              onViewMatch={onViewMatch}
              canEdit={canEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del evento</DialogTitle>
        </DialogHeader>
        {item && (
          <DetailContent
            item={item}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
            onViewProfile={onViewProfile}
            onViewMatch={onViewMatch}
            canEdit={canEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}