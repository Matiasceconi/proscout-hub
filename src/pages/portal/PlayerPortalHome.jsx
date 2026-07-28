import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate, formatDateTime, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, daysUntil } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Trophy, Video, Search, Activity, Gift, Calendar, HeartPulse, Bell, ChevronRight, TrendingUp } from 'lucide-react';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

export default function PlayerPortalHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const playerId = getPlayerId(user);

  const [player, setPlayer] = useState(null);
  const [data, setData] = useState({
    nextMatch: null, recentVideos: [], recentAnalysis: [], seasonStats: null,
    lastAssessment: null, latestInjury: null, benefits: [], notifications: [], weekEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [playerId]);

  const loadData = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      setPlayer(player);
      const orgId = player.organization_id;

      const [matches, videos, analyses, stats, assessments, injuries, benefits, notifs, events] = await Promise.all([
        base44.entities.Match.filter({ organization_id: orgId, player_id: playerId, status: 'scheduled' }, 'match_date', 10),
        base44.entities.VideoContent.filter({ organization_id: orgId, player_id: playerId, status: 'published' }, '-published_date', 5),
        base44.entities.OpponentAnalysis.filter({ organization_id: orgId, player_id: playerId, status: 'published' }, '-published_date', 3),
        base44.entities.PlayerSeasonStats.filter({ organization_id: orgId, player_id: playerId }, '-season', 5),
        base44.entities.PhysicalAssessment.filter({ organization_id: orgId, player_id: playerId }, '-assessment_date', 3),
        base44.entities.InjuryRecord.filter({ organization_id: orgId, player_id: playerId, shared_with_player: true }, '-injury_date', 3),
        base44.entities.PlayerBenefit.filter({ organization_id: orgId, player_id: playerId, status: 'active' }, '-assigned_date', 5),
        base44.entities.Notification.filter({ player_id: playerId, is_read: false }, '-created_date', 5),
        base44.entities.CalendarEvent.filter({ organization_id: orgId, player_id: playerId }, 'start_date', 20)
      ]);

      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekEvents = events.filter(e => {
        const d = new Date(e.start_date);
        return d >= now && d <= weekEnd;
      });

      setData({
        nextMatch: matches.find(m => new Date(m.match_date) >= now) || null,
        recentVideos: videos,
        recentAnalysis: analyses,
        seasonStats: stats[0],
        lastAssessment: assessments[0],
        latestInjury: injuries[0],
        benefits: benefits,
        notifications: notifs,
        weekEvents: weekEvents
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div></div>;
  if (!player) return <p className="text-center text-slate-500 py-10">No se encontró tu perfil.</p>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const initials = (player.first_name?.[0] || '') + (player.last_name?.[0] || '');

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <ProfileAvatar
          photoUrl={player.photo_url}
          photoSourceUrl={player.photo_source_url}
          firstName={player.first_name}
          lastName={player.last_name}
          size="lg"
          shape="rounded-2xl"
          className="flex-shrink-0"
        />
        <div>
          <p className="text-sm text-slate-400">{greeting},</p>
          <h1 className="text-xl font-bold text-slate-900">{player.first_name} {player.last_name}</h1>
          <p className="text-sm text-slate-500">{player.club || 'Sin club'} · {POSITION_LABELS[player.position] || player.position}</p>
        </div>
      </div>

      {/* Availability badge */}
      <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
        <HeartPulse className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-500">Estado:</span>
        <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
          {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
        </Badge>
      </div>

      {/* Next match */}
      {data.nextMatch && (
        <div onClick={() => navigate('/portal/matches')} className="bg-slate-900 rounded-2xl p-5 text-white cursor-pointer">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
            <Trophy className="w-4 h-4" /> Próximo partido
          </div>
          <p className="text-lg font-bold">vs {data.nextMatch.opponent}</p>
          <p className="text-sm text-white/70">{data.nextMatch.competition || 'Sin competencia'}</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-white/80">{formatDateTime(data.nextMatch.match_date)}</p>
            <Badge className="bg-white/15 text-white border-transparent capitalize">{data.nextMatch.home_away === 'home' ? 'Local' : 'Visitante'}</Badge>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {data.seasonStats && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Estadísticas {data.seasonStats.season}
            </h2>
            <button onClick={() => navigate('/portal/stats')} className="text-xs text-slate-400 hover:text-slate-700">Ver más</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Partidos" value={data.seasonStats.matches} />
            <StatBox label="Goles" value={data.seasonStats.goals} />
            <StatBox label="Asist." value={data.seasonStats.assists} />
            <StatBox label="Min." value={data.seasonStats.minutes} />
          </div>
        </div>
      )}

      {/* Latest analysis */}
      {data.recentAnalysis.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4" /> Último análisis publicado
          </h2>
          <div onClick={() => navigate('/portal/opponent')} className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer">
            <p className="font-medium text-slate-800">{data.recentAnalysis[0].opponent_player_name}</p>
            <p className="text-xs text-slate-400">{data.recentAnalysis[0].opponent_team || ''} · {formatDate(data.recentAnalysis[0].published_date)}</p>
            {data.recentAnalysis[0].weaknesses && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{data.recentAnalysis[0].weaknesses}</p>}
          </div>
        </div>
      )}

      {/* New videos */}
      {data.recentVideos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Video className="w-4 h-4" /> Videos nuevos
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {data.recentVideos.map(v => (
              <a key={v.id} href={v.video_url} target="_blank" rel="noopener" className="flex-shrink-0 w-40">
                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-8 h-8 text-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1 truncate">{v.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Week schedule */}
      {data.weekEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Agenda semanal
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            {data.weekEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700">{new Date(e.start_date).getDate()}</span>
                  <span className="text-[9px] uppercase text-blue-500">{new Date(e.start_date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">{e.title}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(e.start_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      {data.benefits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Gift className="w-4 h-4" /> Beneficios destacados
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {data.benefits.map(b => (
              <div key={b.id} className="flex-shrink-0 w-32 bg-white rounded-xl border border-slate-200 p-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{b.benefit_name}</p>
                {b.expiry_date && <p className="text-xs text-slate-400">Vence: {formatDate(b.expiry_date)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {data.notifications.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notificaciones pendientes
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            {data.notifications.map(n => (
              <div key={n.id} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{n.title}</p>
                  <p className="text-xs text-slate-400">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}