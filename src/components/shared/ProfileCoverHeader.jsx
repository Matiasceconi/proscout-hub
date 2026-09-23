import React from 'react';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import PhotoEditOverlay from '@/components/shared/PhotoEditOverlay';

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
  children,
  canEditPhoto = false,
  onSavePhoto,
  onRemovePhoto
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#071225] via-[#10243d] to-[#17374a] sm:h-36">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
        {clubLogoUrl && (
          <div className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/95 p-2 shadow-xl sm:h-20 sm:w-20">
            <img src={clubLogoUrl} alt={clubName || 'Club'} className="h-full w-full object-contain" />
          </div>
        )}
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-end">
            <div className={`relative shrink-0 ${canEditPhoto ? 'group' : ''}`}>
              <ProfileAvatar
                photoUrl={photoUrl}
                photoSourceUrl={photoSourceUrl}
                firstName={firstName}
                lastName={lastName}
                size="2xl"
                shape="rounded-full"
                className="border-4 border-white shadow-xl"
              />
              {canEditPhoto && (
                <PhotoEditOverlay
                  onSave={onSavePhoto}
                  onRemove={onRemovePhoto}
                  hasPhoto={!!photoUrl}
                />
              )}
            </div>

            <div className="pb-1 text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Perfil representado</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{firstName} {lastName}</h1>
              {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
              {clubName && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
                  {clubLogoUrl && <img src={clubLogoUrl} alt="" className="h-5 w-5 object-contain" />}
                  <span className="text-sm font-bold text-slate-700">{clubName}</span>
                </div>
              )}
              {badges && <div className="mt-3 flex flex-wrap justify-center gap-1.5 md:justify-start">{badges}</div>}
            </div>
          </div>

          {actions && <div className="flex flex-wrap justify-center gap-2 md:justify-end md:pb-1">{actions}</div>}
        </div>

        {children && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
