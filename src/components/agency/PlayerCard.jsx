import React from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateAge, POSITION_LABELS, PLAYER_CATEGORIES, PLAYER_CATEGORY_COLORS, SPORTING_STATUS_LABELS, SPORTING_STATUS_COLORS, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Users, MoreVertical, MapPin } from 'lucide-react';
import PlayerActionsMenu from './PlayerActionsMenu';

export default function PlayerCard({ player, primaryColor, canManage, onAction }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const age = calculateAge(player.birth_date);
  const categoryColor = PLAYER_CATEGORY_COLORS[player.category] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all flex flex-col">
      {/* Photo with category badge */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Users className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${categoryColor}`}>
            {PLAYER_CATEGORIES[player.category] || 'Sin categoría'}
          </span>
        </div>
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

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {player.first_name} {player.last_name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {age ? `${age} años` : ''} {player.nationality ? `· ${player.nationality}` : ''}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {POSITION_LABELS[player.position] || player.position}
          </span>
        </div>

        {/* Club + competition */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {player.club_logo_url && <img src={player.club_logo_url} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
            <span className="text-xs text-slate-600 truncate">{player.club || 'Sin club'}</span>
          </div>
          {player.competition && (
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate">{player.competition}</span>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge className={SPORTING_STATUS_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
            {SPORTING_STATUS_LABELS[player.availability_status] || 'Disponible'}
          </Badge>
          <Badge className={PORTAL_STATUS_COLORS[player.portal_status] || 'bg-slate-100 text-slate-500 border-slate-200'}>
            {PORTAL_STATUS_LABELS[player.portal_status] || 'Sin invitar'}
          </Badge>
        </div>

        {/* Button */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <Button
            onClick={() => navigate(`/agency/players/${player.id}`)}
            className="w-full text-xs h-8"
            style={{ backgroundColor: primaryColor }}
          >
            Ver ficha completa
          </Button>
        </div>
      </div>

      {menuOpen && (
        <PlayerActionsMenu
          player={player}
          canManage={canManage}
          onClose={() => setMenuOpen(false)}
          onAction={(action) => { setMenuOpen(false); onAction(action, player); }}
        />
      )}
    </div>
  );
}