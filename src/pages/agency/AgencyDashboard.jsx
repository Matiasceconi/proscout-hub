import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, formatDate, daysUntil, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '@/lib/roleUtils';
import { StatCard, SectionHeader, PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import {
  Users, Trophy, Search, Video, Activity, HeartPulse, Gift,
  UserPlus, Calendar, AlertCircle, Clock, FileText, TrendingUp,
  ChevronRight, Plus
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Crear jugador', icon: UserPlus, path: '/agency/players?action=new', color: 'bg-blue-500' },
  { label: 'Cargar partido', icon: Trophy, path: '/agency/matches?action=new', color: 'bg-emerald-500' },
  { label: 'Crear análisis', icon: Search, path: '/agency/analysis?action=new', color: 'bg-purple-500' },
  { label: 'Agregar video', icon: Video, path: '/agency/videos?action=new', color: 'bg-rose-500' },
  { label: 'Eval. física', icon: Activity, path: '/agency/physical?action=new', color: 'bg-cyan-500' },
  { label: 'Registrar lesión', icon: HeartPulse, path: '/agency/medical?action=new', color: 'bg-orange-500' },
  { label: 'Asignar beneficio', icon: Gift, path: '/agency/benefits?action=new', color: 'bg-amber-500' },
  { label: 'Invitar integrante', icon: Users, path: '/agency/team?action=new', color: 'bg-slate-700' }
];

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePlayers: 0,
    upcomingMatches: [],
    pendingAnalysis: 0,
    recentVideos: [],
    injuredPlayers: [],
    expiringDocs: [],
    recentActivity: []
  });

  useEffect(() => {
    if (orgId) loadData();
  }, [orgId]);

  const loadData = async () => {
    try {
      const [players, matches, analyses, videos, injuries, docs] = await Promise.all([
        base44.entities.Player.filter({ organization_id: orgId, status: 'active' }, '-updated_date', 200),
        base44.entities.Match.filter({ organization_id: orgId, status: 'scheduled' }, 'match_date', 50),
        base44.entities.OpponentAnalysis.filter({ organization_id: orgId, status: 'draft' }, '-created_date', 50),
        base44.entities.VideoContent.filter({ organization_id: orgId, status: 'published' }, '-published_date', 5),
        base44.entities.InjuryRecord.filter({ organization_id: orgId, status: { $in: ['rehabilitation', 'differentiated_training', 'partial_reintegration', 'available_with_restrictions'] } }, '-injury_date', 50),
        base44.entities.Document.filter({ organization_id: orgId }, '-updated_date', 100)
      ]);

      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingMatches = matches.filter(m => {
        const d = new Date(m.match_date);
        return d >= now && d <= sevenDaysLater;
      });

      const expiringDocs = docs.filter(d => {
        if (!d.expiry_date) return false;
        const days = daysUntil(d.expiry_date);
        return days !== null && days >= 0 && days <= 30;
      });

      setStats({
        activePlayers: players.length,
        upcomingMatches: upcomingMatches.slice(0, 5),
        pendingAnalysis: analyses.length,
        recentVideos: videos,
        injuredPlayers: injuries.slice(0, 5),
        expiringDocs: expiringDocs.slice(0, 5),
        recentActivity: []
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Panel de control"
        subtitle={`Resumen general de la agencia`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Jugadores activos" value={stats.activePlayers} color="blue" onClick={() => navigate('/agency/players')} />
        <StatCard icon={Trophy} label="Próx. partidos (7 días)" value={stats.upcomingMatches.length} color="green" onClick={() => navigate('/agency/matches')} />
        <StatCard icon={Search} label="Análisis pendientes" value={stats.pendingAnalysis} color="purple" onClick={() => navigate('/agency/analysis')} />
        <StatCard icon={HeartPulse} label="Jugadores lesionados" value={stats.injuredPlayers.length} color="red" onClick={() => navigate('/agency/medical')} />
      </div>

      {/* Quick actions */}
      <div>
        <SectionHeader title="Acciones rápidas" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming matches */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SectionHeader
            title="Próximos partidos"
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/agency/matches')}>Ver todos</Button>}
          />
          {stats.upcomingMatches.length === 0 ? (
            <EmptyState icon={Trophy} title="Sin partidos próximos" description="No hay partidos programados para los próximos 7 días." />
          ) : (
            <div className="space-y-2">
              {stats.upcomingMatches.map((match) => {
                const days = daysUntil(match.match_date);
                return (
                  <div
                    key={match.id}
                    onClick={() => navigate(`/agency/players/${match.player_id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-900 text-white flex-shrink-0">
                      <span className="text-xs font-medium">{days === 0 ? 'HOY' : `${days}d`}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">vs {match.opponent}</p>
                      <p className="text-xs text-slate-400 truncate">{match.player_name} · {match.competition || 'Sin competencia'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{formatDate(match.match_date)}</p>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 capitalize">{match.home_away === 'home' ? 'Local' : 'Visitante'}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Injured players */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SectionHeader
            title="Jugadores lesionados"
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/agency/medical')}>Ver área médica</Button>}
          />
          {stats.injuredPlayers.length === 0 ? (
            <EmptyState icon={HeartPulse} title="Sin lesionados" description="Todos los jugadores están disponibles." />
          ) : (
            <div className="space-y-2">
              {stats.injuredPlayers.map((inj) => (
                <div
                  key={inj.id}
                  onClick={() => navigate(`/agency/players/${inj.player_id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100"
                >
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <HeartPulse className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{inj.player_name}</p>
                    <p className="text-xs text-slate-400 truncate">{inj.diagnosis}</p>
                  </div>
                  <Badge className={AVAILABILITY_COLORS[inj.status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                    {AVAILABILITY_LABELS[inj.status] || inj.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent videos */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SectionHeader
            title="Últimos videos"
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/agency/videos')}>Ver todos</Button>}
          />
          {stats.recentVideos.length === 0 ? (
            <EmptyState icon={Video} title="Sin videos" description="No se han publicado videos recientemente." />
          ) : (
            <div className="space-y-2">
              {stats.recentVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => navigate(`/agency/players/${video.player_id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{video.title}</p>
                    <p className="text-xs text-slate-400 truncate">{video.player_name} · {formatDate(video.published_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring docs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SectionHeader
            title="Documentación por vencer"
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/agency/documents')}>Ver documentos</Button>}
          />
          {stats.expiringDocs.length === 0 ? (
            <EmptyState icon={FileText} title="Sin vencimientos próximos" description="Toda la documentación está al día." />
          ) : (
            <div className="space-y-2">
              {stats.expiringDocs.map((doc) => {
                const days = daysUntil(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/agency/players/${doc.player_id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400 truncate">{doc.player_name}</p>
                    </div>
                    <Badge className={days <= 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                      {days === 0 ? 'Vence hoy' : `${days} días`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}