import React, { useEffect, useRef } from 'react';
import { Eye, Pencil, Send, Mail, Ban, Archive } from 'lucide-react';

const ACTIONS = [
  { id: 'view', label: 'Ver ficha', icon: Eye },
  { id: 'edit', label: 'Editar director', icon: Pencil },
  { id: 'invite', label: 'Enviar invitación al portal', icon: Send },
  { id: 'resend', label: 'Reenviar invitación', icon: Mail },
  { id: 'suspend', label: 'Suspender acceso', icon: Ban },
  { id: 'archive', label: 'Archivar director', icon: Archive }
];

export default function DirectorActionsMenu({ director, canManage, onClose, onAction }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={ref} className="absolute top-10 right-2 z-50 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
        {ACTIONS.map(action => {
          const disabled = !canManage && action.id !== 'view';
          return (
            <button
              key={action.id}
              disabled={disabled}
              onClick={() => onAction(action.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <action.icon className="w-4 h-4 flex-shrink-0" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}