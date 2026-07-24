import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, daysUntil } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileText, Download, AlertCircle } from 'lucide-react';

export default function PlayerDocumentsTab({ player, permissions }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const data = await base44.entities.Document.filter({ organization_id: player.organization_id, player_id: player.id }, '-updated_date', 100);
      setDocs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando documentos...</div>;

  return (
    <div className="space-y-4">
      {permissions.isOrgAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Agregar documento
          </Button>
        </div>
      )}

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="Sin documentos" description="No se han cargado documentos para este jugador." />
      ) : (
        <div className="space-y-2">
          {docs.map(d => {
            const days = d.expiry_date ? daysUntil(d.expiry_date) : null;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.title}</p>
                  <p className="text-xs text-slate-400 capitalize">{d.document_type?.replace('_', ' ') || 'documento'}</p>
                </div>
                {days !== null && days >= 0 && days <= 30 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {days === 0 ? 'Hoy' : `${days}d`}
                  </Badge>
                )}
                {days !== null && days < 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>
                )}
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener" className="p-2 text-slate-400 hover:text-slate-700">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddDocDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddDocDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', document_type: 'other', file_url: '', expiry_date: '', visibility: 'all', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Document.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        status: 'valid'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Agregar documento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['contract','medical_report','id_document','passport','insurance','transfer','image_rights','sponsorship','other'].map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>URL del archivo</Label><Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Fecha de vencimiento</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
          <div>
            <Label>Visibilidad</Label>
            <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Staff y jugador</SelectItem>
                <SelectItem value="staff_only">Solo staff</SelectItem>
                <SelectItem value="player_only">Solo jugador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}