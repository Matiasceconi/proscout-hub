import React from 'react';
import PortalListPage from '@/components/player/PortalListPage';
import { Gift } from 'lucide-react';

export default function PortalBenefits() {
  return (
    <PortalListPage
      title="Mis beneficios"
      entityName="PlayerBenefit"
      icon={Gift}
      columns={[
        { key: 'benefit_name', primary: true },
        { key: 'assigned_date', secondary: true, date: true, render: i => `Asignado: ${i.assigned_date ? new Date(i.assigned_date).toLocaleDateString('es-ES') : '—'}` },
        { key: 'expiry_date', secondary: true, date: true, render: i => i.expiry_date ? `Vence: ${new Date(i.expiry_date).toLocaleDateString('es-ES')}` : '' },
        { key: 'status', badge: true }
      ]}
    />
  );
}