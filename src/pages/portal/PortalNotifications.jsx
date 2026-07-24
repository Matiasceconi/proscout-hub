import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDateTime } from '@/lib/roleUtils';
import { PageHeader, EmptyState } from '@/components/shared/UIBits';
import { Bell, Loader2, Check } from 'lucide-react';

export default function PortalNotifications() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const data = await base44.entities.Notification.filter({ player_id: playerId }, '-created_date', 50);
      setNotifs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const markRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { is_read: true });
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Notificaciones" />
      {notifs.length === 0 ? (
        <EmptyState icon={Bell} title="Sin notificaciones" />
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 ${n.is_read ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_date)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 text-slate-400 hover:text-slate-700">
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}