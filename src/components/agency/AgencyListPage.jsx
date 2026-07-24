import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, formatDate, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Loader2 } from 'lucide-react';

export default function AgencyListPage({ title, subtitle, entityName, filterKey, columns, icon: Icon, navigateToPlayer = true }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [orgId]);

  const load = async () => {
    try {
      const data = await base44.entities[entityName].filter({ [filterKey || 'organization_id']: orgId }, '-updated_date', 200);
      setItems(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title={title} subtitle={subtitle || `${items.length} registros`} />
      {items.length === 0 ? (
        <EmptyState icon={Icon} title="Sin registros" description="No se encontraron registros." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className={`px-4 py-3 font-medium text-slate-500 ${c.hideOnMobile ? 'hidden md:table-cell' : ''} ${c.align || 'text-left'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => navigateToPlayer && item.player_id && navigate(`/agency/players/${item.player_id}`)}
                  className={navigateToPlayer && item.player_id ? 'hover:bg-slate-50 cursor-pointer' : ''}
                >
                  {columns.map(c => (
                    <td key={c.key} className={`px-4 py-3 ${c.hideOnMobile ? 'hidden md:table-cell' : ''} ${c.align || 'text-left'}`}>
                      {c.render ? c.render(item) : (
                        c.badge ? (
                          <Badge className={AVAILABILITY_COLORS[item[c.key]] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                            {AVAILABILITY_LABELS[item[c.key]] || item[c.key] || '—'}
                          </Badge>
                        ) : (
                          <span className="text-slate-600">{c.date ? formatDate(item[c.key]) : item[c.key] || '—'}</span>
                        )
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}