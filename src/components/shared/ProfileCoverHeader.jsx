import React from 'react';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

/**
 * ProfileCoverHeader - Encabezado de portada para fichas de jugadores y DTs.
 * Muestra la foto de perfil centrada y prominente (circular, 128px) sobre una
 * banda de portada, con el logo del club como composición visual.
 */
export default function ProfileCoverHeader({
  photoUrl,
  photoSourceUrl,
  firstName = '',
  lastName = '',
  clubLogoUrl,
  clubName,
  subtitle,
  badges,
  actions,
  children
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      {/* Banda de portada */}
      <div className="h-28 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 relative overflow-hidden">
        {/* Logo del club en la esquina superior derecha */}
        {clubLogoUrl && (
          <img
            src={clubLogoUrl}
            alt={clubName || 'Club'}
            className="absolute top-3 right-3 w-14 h-14 rounded-xl bg-white/95 p-1 object-contain shadow-lg"
          />
        )}
      </div>

      {/* Foto + info */}
      <div className="px-5 pb-5">
        <div className="flex flex-col items-center -mt-16">
          {/* Foto de perfil - grande, circular, centrada */}
          <ProfileAvatar
            photoUrl={photoUrl}
            photoSourceUrl={photoSourceUrl}
            firstName={firstName}
            lastName={lastName}
            size="2xl"
            shape="rounded-full"
            className="border-4 border-white shadow-xl"
          />

          {/* Nombre + club */}
          <div className="mt-3 text-center">
            <h1 className="text-xl font-bold text-slate-900">{firstName} {lastName}</h1>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            {clubName && (
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {clubLogoUrl && <img src={clubLogoUrl} alt="" className="w-4 h-4 object-contain" />}
                <span className="text-sm text-slate-600 font-medium">{clubName}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          {badges && <div className="flex flex-wrap justify-center gap-1.5 mt-3">{badges}</div>}

          {/* Acciones */}
          {actions && <div className="flex flex-wrap justify-center gap-2 mt-4">{actions}</div>}

          {/* Info adicional */}
          {children && <div className="mt-4 w-full">{children}</div>}
        </div>
      </div>
    </div>
  );
}