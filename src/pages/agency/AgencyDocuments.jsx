import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { FileText } from 'lucide-react';

export default function AgencyDocuments() {
  return (
    <AgencyListPage
      title="Documentación"
      subtitle="Documentos de jugadores"
      entityName="Document"
      icon={FileText}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'title', label: 'Documento' },
        { key: 'document_type', label: 'Tipo', hideOnMobile: true, render: i => <span className="capitalize text-slate-600">{i.document_type?.replace('_', ' ')}</span> },
        { key: 'expiry_date', label: 'Vencimiento', date: true, hideOnMobile: true },
        { key: 'status', label: 'Estado', hideOnMobile: true, render: i => (
          <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'valid' ? 'bg-green-100 text-green-700' : i.status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {i.status === 'valid' ? 'Vigente' : i.status === 'expiring_soon' ? 'Por vencer' : 'Vencido'}
          </span>
        )}
      ]}
    />
  );
}