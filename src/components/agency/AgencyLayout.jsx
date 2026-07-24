import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getUserOrgId, getUserRole, isOrgAdmin } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, Users, Calendar, Trophy, BarChart3, Activity,
  HeartPulse, Search, Video, Gift, FileText, UserCog, Settings,
  LogOut, Menu, X, ChevronLeft
} from 'lucide-react';

const MENU_ITEMS = [
  { to: '/agency', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/agency/players', icon: Users, label: 'Jugadores' },
  { to: '/agency/calendar', icon: Calendar, label: 'Calendario' },
  { to: '/agency/matches', icon: Trophy, label: 'Partidos' },
  { to: '/agency/stats', icon: BarChart3, label: 'Estadísticas' },
  { to: '/agency/physical', icon: Activity, label: 'Rendimiento físico' },
  { to: '/agency/medical', icon: HeartPulse, label: 'Área médica' },
  { to: '/agency/analysis', icon: Search, label: 'Análisis de rivales' },
  { to: '/agency/videos', icon: Video, label: 'Videos' },
  { to: '/agency/benefits', icon: Gift, label: 'Beneficios' },
  { to: '/agency/documents', icon: FileText, label: 'Documentación' },
  { to: '/agency/team', icon: UserCog, label: 'Equipo de trabajo' },
  { to: '/agency/settings', icon: Settings, label: 'Configuración' }
];

export default function AgencyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [org, setOrg] = useState(null);

  const orgId = getUserOrgId(user);
  const role = getUserRole(user);

  useEffect(() => {
    if (orgId) {
      base44.entities.Organization.get(orgId).then(setOrg).catch(() => {});
    }
  }, [orgId]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const primaryColor = org?.primary_color || '#0F172A';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
        style={{ backgroundColor: primaryColor }}
      >
        {/* Logo / Org name */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{org?.name || 'FootAgency'}</p>
              <p className="text-white/50 text-xs">Panel de agencia</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-8 h-8 border border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.full_name || user?.email}</p>
              <p className="text-white/40 text-xs capitalize">{role?.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-white" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">{org?.name || 'FootAgency'}</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}