import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * PhotoEditOverlay - Botón de edición superpuesto sobre la foto de perfil.
 * Permite subir una nueva foto (se guarda en Base44 y se actualiza la entidad)
 * o quitar la foto actual.
 *
 * Props:
 *  - onSave: async (file_url) => void  (actualiza la entidad con la nueva photo_url)
 *  - onRemove: async () => void        (opcional, limpia la photo_url)
 *  - hasPhoto: boolean
 */
export default function PhotoEditOverlay({ onSave, onRemove, hasPhoto }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSave(file_url);
    } catch (err) {
      setError('No se pudo subir la imagen');
      console.error(err);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (!confirm('¿Quitar la foto de perfil?')) return;
    setUploading(true);
    try {
      await onRemove();
    } catch (err) {
      setError('No se pudo quitar la foto');
      console.error(err);
    }
    setUploading(false);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {uploading ? (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow hover:bg-black/70 transition-colors"
            title="Cambiar foto"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          {hasPhoto && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow hover:bg-black/70 transition-colors"
              title="Quitar foto"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-red-600 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}