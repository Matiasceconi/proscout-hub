import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/roleUtils';
import { EmptyState } from '@/components/shared/UIBits';
import { History } from 'lucide-react';

export default function DirectorActivityTab({ director }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.AuditLog.filter({ organization_id: director.organization_id, entity_id: director.id }, '-timestamp', 50);
      setLogs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando actividad...</div>;

  if (logs.length === 0) {
    return <EmptyState icon={History} title="Sin actividad registrada" description="Las acciones sobre este director aparecerán aquí." />;
  }

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <History className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700">
              <span className="font-medium capitalize">{log.action || 'acción'}</span>
              {log.entity_type && <span className="text-slate-400"> · {log.entity_type}</span>}
            </p>
            {log.details && <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>}
            <p className="text-xs text-slate-300 mt-0.5">
              {log.user_email || 'Sistema'} · {formatDateTime(log.timestamp || log.created_date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}