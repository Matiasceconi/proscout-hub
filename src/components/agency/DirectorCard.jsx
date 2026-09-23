import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS, DIRECTOR_STATUS_COLORS, calculateAge } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { MoreVertical, Grid3x3 } from 'lucide-react';
import DirectorActionsMenu from './DirectorActionsMenu';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

export default function DirectorCard({ director, clubData, primaryColor, canManage, onAction }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const age = calculateAge(director.birth_date);
  const clubLogo = clubData?.internal_logo_url || clubData?.official_logo_url;
  const clubName = clubData?.short_name || clubData?.club_name || director.current_club || director.last_club || 'Sin club';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <ProfileAvatar
          photoUrl={director.photo_url}
          photoSourceUrl={director.photo_source_url}
          firstName={director.first_name}
          lastName={director.last_name}
          size="full"
          shape="rounded-none"
          className="w-full h-full"
          fallbackBgClassName="bg-slate-100"
          fallbackTextClassName="text-slate-300 text-4xl"
        />
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${DIRECTOR_STATUS_COLORS[director.professional_status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {DIRECTOR_STATUS_LABELS[director.professional_status] || 'Disponible'}
          </span>
        </div>
        {clubLogo && (
          <div className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-xl border border-white/80 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm" title={clubName}>
            <img src={clubLogo} alt={clubName} className="h-full w-full object-contain" />
          </div>
        )}
        {canManage && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
              className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {director.first_name} {director.last_name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {age ? `${age} años` : ''} {director.nationality ? `· ${director.nationality}` : ''}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {DIRECTOR_ROLE_LABELS[director.primary_role] || 'Director Técnico'}
          </span>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 min-w-0 rounded-lg bg-slate-50 px-2.5 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
              {clubLogo ? <img src={clubLogo} alt="" className="h-5 w-5 object-contain" /> : <span className="text-[10px] font-bold text-slate-400">{clubName?.[0] || '?'}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{clubName}</p>
              {director.competition && <p className="text-[10px] text-slate-400 truncate">{director.competition}</p>}
            </div>
          </div>
          {director.preferred_tactical_system && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Grid3x3 className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate">{director.preferred_tactical_system}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <Button
            onClick={() => navigate(`/agency/directors/${director.id}`)}
            className="w-full text-xs h-8"
            style={{ backgroundColor: primaryColor }}
          >
            Ver ficha completa
          </Button>
        </div>
      </div>

      {menuOpen && (
        <DirectorActionsMenu
          director={director}
          canManage={canManage}
          onClose={() => setMenuOpen(false)}
          onAction={(action) => { setMenuOpen(false); onAction(action, director); }}
        />
      )}
    </div>
  );
}