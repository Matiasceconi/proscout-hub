import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { StatCard, PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Building2, Users, Activity } from 'lucide-react';

export default function SuperadminDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrgs: 0, totalPlayers: 0, totalUsers: 0, activeOrgs: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const allOrgs = await base44.entities.Organization.list('-created_date', 500);
      setOrgs(allOrgs);
      setStats({
        totalOrgs: allOrgs.length,
        activeOrgs: allOrgs.filter(o => o.status === 'active').length,
        totalPlayers: 0,
        totalUsers: 0
      });

      // Get player and user counts per org
      const playerCounts = await Promise.all(
        allOrgs.slice(0, 50).map(o => base44.entities.Player.filter({ organization_id: o.id }, '-created_date', 1).then(p => p.length).catch(() => 0))
      );
      const memberCounts = await Promise.all(
        allOrgs.slice(0, 50).map(o => base44.entities.OrganizationMember.filter({ organization_id: o.id, status: 'active' }, '-created_date', 1).then(m => m.length).catch(() => 0))
      );

      setStats(s => ({
        ...s,
        totalPlayers: playerCounts.reduce((a, b) => a + b, 0),
        totalUsers: memberCounts.reduce((a, b) => a + b, 0)
      }));

      setOrgs(allOrgs.map((o, i) => ({
        ...o,
        playerCount: playerCounts[i] || 0,
        userCount: memberCounts[i] || 0
      })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Panel de plataforma" subtitle="Administración general de organizaciones" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Organizaciones" value={stats.totalOrgs} color="blue" />
        <StatCard icon={Building2} label="Activas" value={stats.activeOrgs} color="green" />
        <StatCard icon={Users} label="Usuarios totales" value={stats.totalUsers} color="purple" />
        <StatCard icon={Activity} label="Jugadores totales" value={stats.totalPlayers} color="amber" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Organizaciones registradas</h2>
        </div>
        {orgs.length === 0 ? (
          <EmptyState icon={Building2} title="Sin organizaciones" description="Aún no se han registrado agencias en la plataforma." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Organización</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Plan</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Usuarios</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Jugadores</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Registro</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgs.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {o.logo_url ? <img src={o.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{o.name}</p>
                          <p className="text-xs text-slate-400">{o.contact_email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 capitalize">{o.plan || 'free'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{o.userCount ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{o.playerCount ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">{formatDate(o.created_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={o.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                        {o.status === 'active' ? 'Activa' : o.status === 'trial' ? 'Prueba' : 'Suspendida'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}