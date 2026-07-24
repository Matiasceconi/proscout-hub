import React from 'react';
import AgencyListPage from '@/components/agency/AgencyListPage';
import { Gift } from 'lucide-react';

export default function AgencyBenefits() {
  return (
    <AgencyListPage
      title="Beneficios"
      subtitle="Beneficios asignados a jugadores"
      entityName="PlayerBenefit"
      icon={Gift}
      columns={[
        { key: 'player_name', label: 'Jugador' },
        { key: 'benefit_name', label: 'Beneficio' },
        { key: 'assigned_date', label: 'Asignado', date: true, hideOnMobile: true },
        { key: 'expiry_date', label: 'Vencimiento', date: true, hideOnMobile: true },
        { key: 'status', label: 'Estado', hideOnMobile: true, render: i => (
          <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {i.status === 'active' ? 'Activo' : i.status === 'expired' ? 'Vencido' : 'Revocado'}
          </span>
        )}
      ]}
    />
  );
}