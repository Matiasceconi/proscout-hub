import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Trophy, MapPin, Clock, Calendar, AlertTriangle } from 'lucide-react';

const FIXTURE_STATUS = {
  NS: 'Por jugar', FT: 'Finalizado', AET: 'Finalizado (prórroga)',
  PEN: 'Finalizado (penales)', PST: 'Pospuesto', CANC: 'Cancelado',
  ABD: 'Abandonado', LIVE: 'En vivo', HT: 'Entretiempo'
};

function formatArg(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatArgDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatArgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function ApiFootballCalendarSection({ calendarData, canManage }) {
  const navigate = useNavigate();
  if (!calendarData) return null;

  const { status, club, next_match, last_results, next_fixtures, last_sync, options } = calendarData;

  if (status === 'sin_club') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center mb-4">
        <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" /> Actualmente sin club
        </p>
      </div>
    );
  }

  if (status === 'no_mapping') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          {club?.internal_logo_url && <img src={club.internal_logo_url} alt="" className="w-10 h-10 object-contain" />}
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{club?.club_name}</p>
            <p className="text-xs text-amber-700">El club no está vinculado a API-Football todavía</p>
          </div>
          {canManage && <Button size="sm" variant="outline" onClick={() => navigate('/admin/club-mapping')}>Vincular</Button>}
        </div>
      </div>
    );
  }

  if (status === 'ambiguous') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <p className="text-sm font-medium text-slate-800">Múltiples clubes actuales detectados</p>
        </div>
        <p className="text-xs text-slate-500 mb-3">Seleccione el club correcto:</p>
        <div className="space-y-2">
          {options?.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
              <span className="text-sm text-slate-700">{opt.club_name}</span>
              {opt.start_date && <span className="text-xs text-slate-400">desde {formatArgDate(opt.start_date)}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {club?.internal_logo_url && <img src={club.internal_logo_url} alt="" className="w-6 h-6 object-contain" />}
        <span>Calendario del Club</span>
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">API-Football</Badge>
      </div>

      {next_match && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Próximo partido</span>
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              {next_match.team_logo && <img src={next_match.team_logo} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mx-auto mb-1" />}
              <p className="text-xs text-slate-300">{next_match.is_home ? next_match.home_team_name : next_match.away_team_name}</p>
            </div>
            <div className="text-center">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-1">{next_match.role === 'local' ? 'Local' : 'Visitante'}</Badge>
              <p className="text-xs text-slate-400">VS</p>
            </div>
            <div className="text-center">
              {next_match.opponent_logo && <img src={next_match.opponent_logo} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mx-auto mb-1" />}
              <p className="text-xs text-slate-300">{next_match.opponent}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-300">
            {next_match.competition_name && (
              <span className="flex items-center gap-1">
                {next_match.competition_logo && <img src={next_match.competition_logo} alt="" className="w-3 h-3 object-contain" />}
                {next_match.competition_name}
              </span>
            )}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatArg(next_match.fixture_date)}</span>
            {next_match.stadium && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{next_match.stadium}</span>}
            <span>{FIXTURE_STATUS[next_match.fixture_status] || next_match.fixture_status || 'Por jugar'}</span>
          </div>
        </div>
      )}

      {last_results?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Últimos resultados</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {last_results.map((f, i) => (
              <div key={f.id || i} className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  {f.home_team_logo && <img src={f.home_team_logo} alt="" className="w-6 h-6 object-contain" />}
                  <span className="text-sm font-bold text-slate-800">{f.result || '-'}</span>
                  {f.away_team_logo && <img src={f.away_team_logo} alt="" className="w-6 h-6 object-contain" />}
                </div>
                <p className="text-[10px] text-slate-400 text-center truncate">{f.competition_name}</p>
                <p className="text-[10px] text-slate-400 text-center">{formatArgDate(f.fixture_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {next_fixtures?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos partidos</h3>
          <div className="space-y-2">
            {next_fixtures.map((f, i) => (
              <div key={f.id || i} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {f.team_logo && <img src={f.team_logo} alt="" className="w-6 h-6 object-contain" />}
                  <span className="text-xs text-slate-400">vs</span>
                  {f.opponent_logo && <img src={f.opponent_logo} alt="" className="w-6 h-6 object-contain" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.opponent}</p>
                  <p className="text-xs text-slate-400 truncate">
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 mr-1 text-[10px]">{f.role === 'local' ? 'Local' : 'Visitante'}</Badge>
                    {f.competition_name}
                    {f.stadium && ` · ${f.stadium}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">{formatArgDate(f.fixture_date)}</p>
                  <p className="text-xs text-slate-400">{formatArgTime(f.fixture_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {last_sync && (
        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span>Última actualización: {formatArg(last_sync.sync_date)}</span>
          {last_sync.queries_remaining != null && <span>· Consultas restantes: {last_sync.queries_remaining}</span>}
        </div>
      )}
    </div>
  );
}