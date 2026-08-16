import React, { useEffect, useRef } from 'react';
import { Eye, Pencil, Send, Mail, Ban, RefreshCw, Archive, RotateCcw } from 'lucide-react';

export default function PlayerActionsMenu({ player, canManage, onClose, onAction }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const portalStatus = player.portal_status || 'not_invited';

  const baseActions = [
    { id: 'view', label: 'Ver ficha', icon: Eye, always: true },
    { id: 'edit', label: 'Editar jugador', icon: Pencil, staff: true },
    { id: 'status', label: 'Cambiar estado deportivo', icon: RefreshCw, staff: true },
    { id: 'archive', label: 'Archivar jugador', icon: Archive, staff: true }
  ];

  const portalActions = [
    { id: 'invite', label: 'Invitar al portal', icon: Send, showWhen: ['not_invited'] },
    { id: 'resend', label: 'Reenviar invitación', icon: Mail, showWhen: ['pending'] },
    { id: 'suspend', label: 'Suspender acceso', icon: Ban, showWhen: ['pending', 'active'] },
    { id: 'reactivate', label: 'Reactivar acceso', icon: RotateCcw, showWhen: ['suspended'] }
  ];

  const actions = [
    ...baseActions.filter(a => a.always || (a.staff && canManage)),
    ...portalActions.filter(a => canManage && a.showWhen.includes(portalStatus))
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="absolute top-10 right-2 z-50 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
      >
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <action.icon className="w-4 h-4 flex-shrink-0" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}