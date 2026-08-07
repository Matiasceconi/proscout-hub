import React from 'react';
import { User, ClipboardList } from 'lucide-react';
import { CALLUP_STATUS_MAP } from './dashboardUtils';
import { POSITION_LABELS, DIRECTOR_ROLE_LABELS } from '@/lib/roleUtils';

export default function RepresentedPersonRow({ person, fixture, stats, isHome, onFollowUp, onViewProfile }) {
  const isDirector = person.type === 'director';
  const fullName = `${person.first_name} ${person.last_name}`;
  const roleLabel = isDirector
    ? DIRECTOR_ROLE_LABELS[person.primary_role] || 'Director Técnico'
    : POSITION_LABELS[person.position] || person.position || '';

  const callup = !isDirector && stats?.callup_status ? CALLUP_STATUS_MAP[stats.callup_status] : null;
  const hasPendingFollowUp = !isDirector && stats?.follow_up_status === 'pending';

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors">
      {/* Photo */}
      {person.photo_url ? (
        <img src={person.photo_url} alt={fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-slate-500">{person.first_name?.[0]}{person.last_name?.[0]}</span>
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-slate-800 truncate">{fullName}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDirector ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
            {isDirector ? 'DT' : 'JUG'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {person.clubName && <span className="text-xs text-slate-500 truncate">{person.clubName}</span>}
          {roleLabel && <span className="text-xs text-slate-400 truncate">· {roleLabel}</span>}
          {isHome != null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isHome ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
              {isHome ? 'LOCAL' : 'VISIT.'}
            </span>
          )}
        </div>
      </div>

      {/* Situation */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {callup && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${callup.color}`}>{callup.label}</span>
        )}
        {isDirector && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">Cuerpo técnico</span>
        )}
        {hasPendingFollowUp && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">Seguimiento</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onViewProfile(person)}
          className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700"
          title="Ver perfil"
        >
          <User className="w-4 h-4" />
        </button>
        {!isDirector && (
          <button
            onClick={() => onFollowUp(fixture, person, stats)}
            className={`p-2 rounded-md hover:bg-slate-100 ${hasPendingFollowUp ? 'text-orange-600 hover:bg-orange-50' : 'text-slate-500 hover:text-slate-700'}`}
            title={hasPendingFollowUp ? 'Cargar seguimiento' : 'Ver seguimiento'}
          >
            <ClipboardList className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}