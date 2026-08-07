import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatTime, formatDayShort } from './dashboardUtils';

function TeamLogo({ logo, name, size = 'w-7 h-7' }) {
  if (logo) {
    return <img src={logo} alt="" className={`${size} object-contain flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0`}>
      <span className="text-[10px] font-bold text-slate-400">{name?.[0]?.toUpperCase() || '?'}</span>
    </div>
  );
}

function PersonAvatar({ person, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(person); }}
      className="flex items-center gap-1.5 flex-shrink-0 group"
      title={`${person.first_name} ${person.last_name}`}
    >
      {person.photo_url ? (
        <img src={person.photo_url} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center ring-1 ring-slate-200">
          <span className="text-[9px] font-bold text-slate-500">{person.first_name?.[0]?.toUpperCase()}</span>
        </div>
      )}
      <span className="text-xs text-slate-700 whitespace-nowrap group-hover:text-slate-900 group-hover:font-medium transition">
        {person.first_name} {person.last_name}
      </span>
    </button>
  );
}

export default function UpcomingMatchRow({ fixture, represented, clubsById, providerToClub, onViewProfile, onViewMatch }) {
  const homeClubId = providerToClub[fixture.home_provider_team_id];
  const awayClubId = providerToClub[fixture.away_provider_team_id];
  const homeLogo = fixture.home_team_logo || clubsById[homeClubId]?.internal_logo_url || clubsById[homeClubId]?.official_logo_url;
  const awayLogo = fixture.away_team_logo || clubsById[awayClubId]?.internal_logo_url || clubsById[awayClubId]?.official_logo_url;

  return (
    <button
      onClick={() => onViewMatch(fixture)}
      className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors text-left"
    >
      {/* Date/time */}
      <div className="flex-shrink-0 w-14 sm:w-16 text-center">
        <p className="text-xs font-medium text-slate-500">{formatDayShort(fixture.fixture_date)}</p>
        <p className="text-sm font-bold text-green-600">{formatTime(fixture.fixture_date)}</p>
      </div>

      {/* Competition + teams */}
      <div className="flex-shrink-0 min-w-0 w-[180px] sm:w-[240px]">
        <p className="text-xs text-slate-400 truncate mb-0.5">{fixture.competition_name || '—'}{fixture.round ? ` · ${fixture.round}` : ''}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate text-right">{fixture.home_team_name}</span>
            <TeamLogo logo={homeLogo} name={fixture.home_team_name} />
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">vs</span>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <TeamLogo logo={awayLogo} name={fixture.away_team_name} />
            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{fixture.away_team_name}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-8 bg-slate-100 flex-shrink-0" />

      {/* Represented players - horizontal, flexible */}
      <div className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 overflow-hidden">
        {represented.length === 0 ? (
          <span className="text-xs text-slate-400">Sin representados</span>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1">
            {represented.map(p => (
              <PersonAvatar key={`${p.type}-${p.id}`} person={p} onClick={onViewProfile} />
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
}