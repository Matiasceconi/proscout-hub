import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'w-8 h-8 text-[10px]',
  sm: 'w-10 h-10 text-xs',
  md: 'w-14 h-14 text-sm',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-24 h-24 text-xl',
  '2xl': 'w-32 h-32 text-2xl',
  full: 'w-full h-full text-4xl'
};

/**
 * ProfileAvatar - Componente único para mostrar fotos de jugadores y directores técnicos.
 * Usa photo_url (URL estable de Base44) como fuente principal.
 * Si no existe, usa photo_source_url (fuente externa de referencia) como fallback temporal.
 * Si tampoco existe o hay error, muestra iniciales.
 */
export default function ProfileAvatar({
  photoUrl,
  photoSourceUrl,
  firstName = '',
  lastName = '',
  fullName = '',
  size = 'md',
  shape = 'rounded-full',
  className = '',
  fallbackBgClassName = 'bg-slate-100',
  fallbackTextClassName = 'text-slate-400',
  alt: altOverride
}) {
  const [imgError, setImgError] = useState(false);
  const [srcError, setSrcError] = useState(false);

  const sizeClass = SIZES[size] || SIZES.md;
  const name = fullName || `${firstName} ${lastName}`.trim();
  const initials = (firstName.charAt(0) + (lastName.charAt(0) || firstName.charAt(1) || '')).toUpperCase();
  const altText = altOverride || name || 'Perfil';

  // Prioridad: photo_url (Base44) > photo_source_url (referencia) > iniciales
  const imageUrl = (photoUrl && !imgError) ? photoUrl
    : (photoSourceUrl && !srcError && !imgError) ? photoSourceUrl
    : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0 flex items-center justify-center',
        sizeClass,
        shape,
        !imageUrl && fallbackBgClassName,
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => {
            if (photoUrl && !imgError) {
              setImgError(true);
            } else {
              setSrcError(true);
            }
          }}
        />
      ) : (
        <span className={cn('font-semibold', fallbackTextClassName)}>
          {initials || '?'}
        </span>
      )}
    </div>
  );
}