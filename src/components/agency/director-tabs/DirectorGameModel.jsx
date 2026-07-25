import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';

export default function DirectorGameModel({ director, canManage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    game_model: director.game_model || '',
    preferred_tactical_system: director.preferred_tactical_system || '',
    biography: director.biography || '',
    languages: director.languages || '',
    main_achievements: director.main_achievements || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.TechnicalDirector.update(director.id, form);
      setEditing(false);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Sistema táctico preferido</Label>
          <Input value={form.preferred_tactical_system} onChange={e => setForm(f => ({ ...f, preferred_tactical_system: e.target.value }))} placeholder="Ej. 4-3-3" />
        </div>
        <div className="space-y-1.5">
          <Label>Modelo de juego</Label>
          <Textarea value={form.game_model} onChange={e => setForm(f => ({ ...f, game_model: e.target.value }))} rows={4} placeholder="Descripción del modelo de juego..." />
        </div>
        <div className="space-y-1.5">
          <Label>Idiomas</Label>
          <Input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))} placeholder="Ej. Español, Inglés, Portugués" />
        </div>
        <div className="space-y-1.5">
          <Label>Logros principales</Label>
          <Textarea value={form.main_achievements} onChange={e => setForm(f => ({ ...f, main_achievements: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Biografía profesional</Label>
          <Textarea value={form.biography} onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} rows={4} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
        </div>
      )}
      <InfoBlock title="Sistema táctico preferido" value={director.preferred_tactical_system} />
      <InfoBlock title="Modelo de juego" value={director.game_model} multiline />
      <InfoBlock title="Idiomas" value={director.languages} />
      <InfoBlock title="Logros principales" value={director.main_achievements} multiline />
      <InfoBlock title="Biografía profesional" value={director.biography} multiline />
    </div>
  );
}

function InfoBlock({ title, value, multiline }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      {value ? (
        <p className={`text-sm text-slate-600 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
      ) : (
        <p className="text-sm text-slate-300 italic">Sin información cargada</p>
      )}
    </div>
  );
}