import React from 'react';
import PortalListPage from '@/components/player/PortalListPage';
import { FileText } from 'lucide-react';

export default function PortalDocuments() {
  return (
    <PortalListPage
      title="Mis documentos"
      entityName="Document"
      icon={FileText}
      columns={[
        { key: 'title', primary: true },
        { key: 'document_type', secondary: true, render: i => i.document_type?.replace('_', ' ') },
        { key: 'expiry_date', secondary: true, date: true, render: i => i.expiry_date ? `Vence: ${new Date(i.expiry_date).toLocaleDateString('es-ES')}` : '' }
      ]}
    />
  );
}