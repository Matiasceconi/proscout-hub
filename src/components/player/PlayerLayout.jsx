import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getPlayerId, getPlayerOrgId } from '@/lib/roleUtils';
import { useOrganizationBranding } from '@/hooks/use-organization-branding';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Home, Calendar, Trophy, BarChart3, Activity, Search, Video,
  HeartPulse, Gift, FileText, Bell, User, LogOut, Menu, X, ChevronLeft
} from 'lucide-react';

const MENU_ITEMS = [
  { to: '/portal', icon: Home, label: 'Inicio', end: true },
  { to: '/portal/calendar', icon: Calendar, label: 'Mi calendario' },
  { to: '/portal/matches', icon: Trophy, label: 'Mis partidos' },
  { to: '/portal/stats', icon: BarChart3, label: 'Mis estadísticas' },
  { to: '/portal/physical', icon: Activity, label: 'Mi rendimiento' },
  { to: '/portal/opponent', icon: Search, label: 'Mi próximo rival' },
  { to: '/portal/videos', icon: Video, label: 'Mis videos' },
  { to: '/portal/medical', icon: HeartPulse, label: 'Mi estado médico' },
  { to: '/portal/benefits', icon: Gift, label: 'Mis beneficios' },
  { to: '/portal/documents', icon: FileText, label: 'Mis documentos' },
  { to: '/portal/notifications', icon: Bell, label: 'Notificaciones' },
  { to: '/portal/profile', icon: User, label: 'Mi perfil' }
];

export default function PlayerLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [org, setOrg] = useState(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const playerId = getPlayerId(user);
  const playerOrgId = getPlayerOrgId(user);

  useEffect(() => {
    if (playerId) {
      base44.entities.Player.get(playerId).then(setPlayer).catch(() => {});
    }
    if (playerOrgId) {
      base44.entities.Organization.get(playerOrgId).then(setOrg).catch(() => {});
    }
  }, [playerId, playerOrgId]);

  useEffect(() => {
    if (playerId) {
      base44.entities.Notification.filter({ player_id: playerId, is_read: false }, '-created_date', 50)
        .then(n => setUnreadNotifs(n.length))
        .catch(() => {});
    }
  }, [playerId, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const primaryColor = org?.primary_color || '#0F172A';
  useOrganizationBranding(org, 'Portal del jugador');

  const initials = (player?.first_name?.[0] || '') + (player?.last_name?.[0] || '') || 'P';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">{org?.name || 'Plataforma de gestión'}</p>
              <p className="text-slate-400 text-xs">Portal del jugador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/portal/notifications" className="relative p-2 text-slate-500 hover:text-slate-800">
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </NavLink>
            <button onClick={() => setMenuOpen(true)} className="p-2 text-slate-600">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100" style={{ backgroundColor: primaryColor }}>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-white/20">
                  <AvatarFallback className="text-white font-semibold" style={{ backgroundColor: 'transparent' }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {player?.first_name} {player?.last_name}
                  </p>
                  <p className="text-white/50 text-xs">{player?.club || 'Sin club'}</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {MENU_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm ${
                      isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={() => logout()}
                className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5 pb-20">
        <Outlet />
      </main>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 lg:hidden">
        <div className="flex justify-around items-center h-16">
          {MENU_ITEMS.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs ${
                  isActive ? 'text-slate-900' : 'text-slate-400'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label.replace('Mi ', '').replace('Mis ', '')}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}