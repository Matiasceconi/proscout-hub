import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Building2, ArrowRightLeft, CalendarDays, Info } from 'lucide-react';

const LOAN_TYPE_LABELS = {
  loan: 'Préstamo',
  loan_with_option: 'Préstamo con opción de compra',
  free_transfer: 'Libre',
  permanent: 'Transferencia definitiva'
};

export default function PlayerTransferStatus({ player, clubData }) {
  const [loanClub, setLoanClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoanClub = async () => {
      if (player.loan_from_club_id) {
        try {
          const club = await base44.entities.Club.get(player.loan_from_club_id);
          setLoanClub(club);
        } catch (err) {
          console.error('Error loading loan club:', err);
        }
      }
      setLoading(false);
    };
    fetchLoanClub();
  }, [player.loan_from_club_id]);

  const isOnLoan = player.is_on_loan || player.contract_type === 'prestamo' || player.status === 'on_loan';
  const contractType = player.contract_type || (isOnLoan ? 'prestamo' : 'propiedad');
  const loanClubName = player.loan_from_club || loanClub?.club_name || '—';
  const loanClubLogo = loanClub?.internal_logo_url || loanClub?.official_logo_url || null;
  const currentClubName = clubData?.club_name || player.club || 'Sin club';
  const currentClubLogo = clubData?.internal_logo_url || clubData?.official_logo_url || player.club_logo_url || null;

  const loanEndDate = player.loan_end_date;
  const loanEnded = loanEndDate && new Date(loanEndDate) < new Date();
  const daysToLoanEnd = loanEndDate ? Math.ceil((new Date(loanEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Estado del jugador</h3>
      </div>

      {/* Badge principal de estado */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className={isOnLoan ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
          {isOnLoan ? 'A Préstamo' : 'Propiedad'}
        </Badge>
        {player.loan_type && isOnLoan && (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200">
            {LOAN_TYPE_LABELS[player.loan_type] || player.loan_type}
          </Badge>
        )}
        {loanEnded && (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            Préstamo finalizado
          </Badge>
        )}
      </div>

      {/* Grid de información */}
      <div className="space-y-3">
        {/* Club actual */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Club actual
          </span>
          <div className="flex items-center gap-2">
            {currentClubLogo && (
              <img src={currentClubLogo} alt="" className="w-5 h-5 object-contain" />
            )}
            <span className="text-sm font-medium text-slate-800">{currentClubName}</span>
          </div>
        </div>

        {/* Club dueño del pase (solo si está a préstamo) */}
        {isOnLoan && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Club dueño del pase
            </span>
            <div className="flex items-center gap-2">
              {loanClubLogo && (
                <img src={loanClubLogo} alt="" className="w-5 h-5 object-contain" />
              )}
              <span className="text-sm font-medium text-slate-800">{loanClubName}</span>
            </div>
          </div>
        )}

        {/* Tipo de contrato */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-400">Tipo de contrato</span>
          <span className="text-sm font-medium text-slate-700 capitalize">{contractType}</span>
        </div>

        {/* Fechas del préstamo (solo si está a préstamo) */}
        {isOnLoan && (
          <>
            {player.loan_start_date && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Inicio del préstamo
                </span>
                <span className="text-sm font-medium text-slate-700">{formatDate(player.loan_start_date)}</span>
              </div>
            )}
            {loanEndDate && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Fin del préstamo
                </span>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-700">{formatDate(loanEndDate)}</span>
                  {!loanEnded && daysToLoanEnd !== null && daysToLoanEnd <= 30 && (
                    <p className="text-xs text-amber-600">Vence en {daysToLoanEnd} días</p>
                  )}
                  {!loanEnded && daysToLoanEnd !== null && daysToLoanEnd > 30 && (
                    <p className="text-xs text-slate-400">Quedan {daysToLoanEnd} días</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Fin de contrato (si existe) */}
        {player.contract_end && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Fin de contrato
            </span>
            <span className="text-sm font-medium text-slate-700">{formatDate(player.contract_end)}</span>
          </div>
        )}

        {/* Última sincronización de transferencia */}
        {player.last_transfer_sync_at && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Última sync. transferencia
            </span>
            <span className="text-xs text-slate-500">{formatDate(player.last_transfer_sync_at)}</span>
          </div>
        )}
      </div>

      {/* Resumen visual de transferencia si está a préstamo */}
      {isOnLoan && loanClubName !== '—' && currentClubName !== 'Sin club' && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg p-3">
            <div className="flex flex-col items-center gap-1 flex-1">
              {loanClubLogo && <img src={loanClubLogo} alt="" className="w-8 h-8 object-contain" />}
              <span className="text-xs text-slate-500 text-center leading-tight">Dueño del pase</span>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">{loanClubName}</span>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              {currentClubLogo && <img src={currentClubLogo} alt="" className="w-8 h-8 object-contain" />}
              <span className="text-xs text-slate-500 text-center leading-tight">Juega en</span>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">{currentClubName}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}