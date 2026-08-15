import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getUserOrgId, getUserRole, isOrgAdmin } from '@/lib/roleUtils';
import { getDefaultPermissions } from '@/components/agency/settings/accessPermissions';
import { useOrganizationBranding } from '@/hooks/use-organization-branding';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, Users, Calendar, Trophy, BarChart3,
  FileText, UserCog, Settings,
  LogOut, Menu, X, ChevronLeft, GraduationCap, ClipboardList, User, Building2, ChevronUp
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const MENU_GROUPS = [
  { type: 'item', to: '/agency', icon: LayoutDashboard, label: 'Inicio', end: true },
  {
    type: 'group',
    label: 'Representados',
    icon: ClipboardList,
    items: [
      { to: '/agency/players', icon: Users, label: 'Jugadores', permission: 'players' },
      { to: '/agency/directors', icon: GraduationCap, label: 'Directores Técnicos', permission: 'players' }
    ]
  },
  { type: 'item', to: '/agency/calendar', icon: Calendar, label: 'Calendario', permission: 'calendar' },
  { type: 'item', to: '/agency/matches', icon: Trophy, label: 'Partidos', permission: 'matches' },
  { type: 'item', to: '/agency/stats', icon: BarChart3, label: 'Estadísticas', permission: 'statistics' },
  { type: 'item', to: '/agency/documents', icon: FileText, label: 'Documentación', permission: 'documents' },
  { type: 'item', to: '/agency/team', icon: UserCog, label: 'Equipo de trabajo', adminOnly: true },
  { type: 'item', to: '/agency/settings', icon: Settings, label: 'Configuración', adminOnly: true }
];

export default function AgencyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [org, setOrg] = useState(null);
  const [orgCount, setOrgCount] = useState(1);
  const [memberPermissions, setMemberPermissions] = useState([]);

  const orgId = getUserOrgId(user);
  const role = getUserRole(user);

  useEffect(() => {
    if (orgId) {
      base44.entities.Organization.get(orgId).then(setOrg).catch(() => {});
    }
  }, [orgId]);

  useEffect(() => {
    if (user?.id) {
      base44.entities.OrganizationMember.filter({ user_id: user.id, status: 'active' })
        .then(members => setOrgCount(members.length))
        .catch(() => setOrgCount(1));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !orgId) return;
    if (['organization_owner', 'organization_admin'].includes(role)) {
      setMemberPermissions(getDefaultPermissions('organization_admin'));
      return;
    }
    base44.entities.OrganizationMember.filter({ organization_id: orgId, user_id: user.id, status: 'active' }, '-updated_date', 1)
      .then(members => {
        const member = members[0];
        setMemberPermissions(member?.permissions?.length ? member.permissions : getDefaultPermissions(member?.app_role || role));
      })
      .catch(() => setMemberPermissions([]));
  }, [orgId, role, user?.id]);

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

  const primaryColor = org?.primary_color || SCORE_FUTBOL_BRAND.primaryColor;
  const brandLogo = org?.logo_url || SCORE_FUTBOL_BRAND.logoUrl;
  useOrganizationBranding(org, 'Gestión de representados');

  const canAccess = (entry) => {
    if (entry.adminOnly) return isOrgAdmin(user);
    return !entry.permission || memberPermissions.includes(entry.permission);
  };

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
            {brandLogo ? (
              <img src={brandLogo} alt={`Logo de ${SCORE_FUTBOL_BRAND.name}`} className="w-9 h-9 rounded-lg bg-white object-contain p-0.5 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{SCORE_FUTBOL_BRAND.name}</p>
              <p className="text-white/50 text-xs">Gestión de representados</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU_GROUPS.map((entry, idx) => {
            if (entry.type === 'group') {
              const visibleItems = entry.items.filter(canAccess);
              if (visibleItems.length === 0) return null;
              return (
                <div key={idx} className="pt-2">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">{entry.label}</p>
                  {visibleItems.map((item) => (
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
                </div>
              );
            }
            if (!canAccess(entry)) return null;
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <entry.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
                <span>{entry.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-white/10 transition-colors">
                <Avatar className="w-8 h-8 border border-white/20">
                  <AvatarFallback className="bg-white/10 text-white text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-white text-sm font-medium truncate">{user?.full_name || user?.email}</p>
                  <p className="text-white/40 text-xs capitalize">{role?.replace('_', ' ')}</p>
                </div>
                <ChevronUp className="w-4 h-4 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name || user?.email}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/agency/settings')}>
                <User className="w-4 h-4 mr-2" /> Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/agency/settings')}>
                <Settings className="w-4 h-4 mr-2" /> Configuración de la empresa
              </DropdownMenuItem>
              {orgCount > 1 && (
                <DropdownMenuItem onClick={() => navigate('/company-access')}>
                  <Building2 className="w-4 h-4 mr-2" /> Cambiar de organización
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">{SCORE_FUTBOL_BRAND.name}</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}