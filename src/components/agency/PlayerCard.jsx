import React from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateAge, POSITION_LABELS, PLAYER_CATEGORIES, PLAYER_CATEGORY_COLORS, SPORTING_STATUS_LABELS, SPORTING_STATUS_COLORS, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import PlayerActionsMenu from './PlayerActionsMenu';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

const STATS_TOOLTIP = 'Estadísticas acumuladas con el club actual durante la temporada vigente.';

function StatBox({ label, value }) {
  return (
    <div className="text-center bg-slate-50 rounded-lg py-1.5 px-1">
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-tight">{value}</p>
    </div>
  );
}

function StatsMessage({ message }) {
  return (
    <div className="col-span-3 bg-slate-50 rounded-lg py-2 px-2 text-center">
      <p className="text-[11px] text-slate-400 font-medium leading-tight">{message}</p>
    </div>
  );
}

export default function PlayerCard({ player, primaryColor, canManage, onAction, statsData, seasonDisplay }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const age = calculateAge(player.birth_date);
  const categoryColor = PLAYER_CATEGORY_COLORS[player.category] || 'bg-slate-100 text-slate-600 border-slate-200';

  // Club info from statsData (Club entity) with fallback to player fields
  const clubInfo = statsData?.club;
  const clubLogo = clubInfo?.internal_logo_url || clubInfo?.official_logo_url || statsData?.provider_team_logo || player.club_logo_url;
  const clubName = clubInfo?.short_name || clubInfo?.club_name || player.club || 'Sin club';
  const clubCountry = clubInfo?.country || player.club_country || player.competition;

  const statsStatus = statsData?.status || (player.current_club_id ? 'sin_datos' : 'sin_club');
  const statsValues = statsData?.stats;
  const legend = seasonDisplay ? `${clubName} · ${seasonDisplay}` : clubName;

  const renderStats = () => {
    if (statsStatus === 'ok' && statsValues) {
      return (
        <>
          <StatBox label="PJ" value={statsValues.pj} />
          <StatBox label="MIN" value={statsValues.min} />
          <StatBox label="G+A" value={statsValues.ga} />
        </>
      );
    }
    if (statsStatus === 'sin_datos') {
      return (
        <>
          <StatBox label="PJ" value="—" />
          <StatBox label="MIN" value="—" />
          <StatBox label="G+A" value="—" />
        </>
      );
    }
    const messages = {
      sin_club: 'Sin club actual',
      club_sin_vincular: 'Club sin vincular',
      jugador_sin_vincular: 'Jugador sin vincular',
      sin_cobertura: 'Sin cobertura'
    };
    return <StatsMessage message={messages[statsStatus] || 'Sin datos'} />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all flex flex-col">
      {/* Photo with category badge */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <ProfileAvatar
          photoUrl={player.photo_url}
          photoSourceUrl={player.photo_source_url}
          firstName={player.first_name}
          lastName={player.last_name}
          size="full"
          shape="rounded-none"
          className="w-full h-full"
          fallbackBgClassName="bg-slate-100"
          fallbackTextClassName="text-slate-300 text-4xl"
        />
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

        {/* Club info */}
        <div className="mt-2 flex items-center gap-1.5 min-w-0">
          {clubLogo && <img src={clubLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
          <span className="text-xs text-slate-600 truncate">{clubName}</span>
          {clubCountry && <span className="text-xs text-slate-400 truncate">· {clubCountry}</span>}
        </div>

        {/* Stats legend + values */}
        <div className="mt-3" title={STATS_TOOLTIP}>
          <p className="text-[10px] text-slate-400 mb-1.5 truncate">{legend}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {renderStats()}
          </div>
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