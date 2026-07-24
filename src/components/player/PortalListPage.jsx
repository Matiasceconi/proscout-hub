import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Loader2 } from 'lucide-react';

export default function PortalListPage({ title, subtitle, entityName, columns, icon: Icon, filterByPlayer = true }) {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      const query = filterByPlayer
        ? { player_id: playerId }
        : { organization_id: player.organization_id };
      const data = await base44.entities[entityName].filter(query, '-updated_date', 100);
      setItems(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle || `${items.length} registros`} />
      {items.length === 0 ? (
        <EmptyState icon={Icon} title="Sin registros" />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  {columns.map(c => c.primary ? <p key={c.key} className="text-sm font-medium text-slate-800 truncate">{c.render ? c.render(item) : item[c.key]}</p> : null)}
                </div>
                {columns.map(c => c.badge ? (
                  <Badge key={c.key} className={AVAILABILITY_COLORS[item[c.key]] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                    {AVAILABILITY_LABELS[item[c.key]] || item[c.key]}
                  </Badge>
                ) : null)}
              </div>
              <div className="space-y-0.5">
                {columns.map(c => c.secondary ? <p key={c.key} className="text-xs text-slate-400">{c.render ? c.render(item) : c.date ? formatDate(item[c.key]) : item[c.key]}</p> : null)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}