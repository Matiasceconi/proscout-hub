import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ShieldCheck, LogOut, Building2, Users, BarChart3 } from 'lucide-react';

const MENU_ITEMS = [
  { to: '/superadmin', icon: Building2, label: 'Organizaciones', end: true },
  { to: '/superadmin/users', icon: Users, label: 'Usuarios' },
  { to: '/superadmin/stats', icon: BarChart3, label: 'Métricas' }
];

export default function SuperadminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="sticky top-0 h-screen w-60 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">FootAgency Pro</p>
              <p className="text-white/40 text-xs">Superadmin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-medium">
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
              <p className="text-white/40 text-xs">Plataforma</p>
            </div>
            <button onClick={() => logout()} className="text-white/40 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}