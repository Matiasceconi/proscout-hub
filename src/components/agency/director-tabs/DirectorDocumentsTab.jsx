import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, Plus, ExternalLink } from 'lucide-react';

const DOC_TYPES = {
  contract: 'Contrato', medical_report: 'Informe médico', id_document: 'Documento de identidad',
  passport: 'Pasaporte', insurance: 'Seguro', transfer: 'Transferencia', image_rights: 'Derechos de imagen',
  sponsorship: 'Patrocinio', presentation: 'Presentación', other: 'Otro'
};

export default function DirectorDocumentsTab({ director, canManage }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.Document.filter({ organization_id: director.organization_id, director_id: director.id }, '-created_date', 50);
      setDocs(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando documentos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{docs.length} documentos</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>}
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="Sin documentos" description="Agrega contratos y documentación del director." />
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{d.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">{DOC_TYPES[d.document_type] || d.document_type}</Badge>
                  {d.expiry_date && <span className="text-xs text-slate-400">Vence: {formatDate(d.expiry_date)}</span>}
                </div>
              </div>
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && <DocDialog director={director} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function DocDialog({ director, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', document_type: 'contract', file_url: '', file_name: '', expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Document.create({
        ...form, organization_id: director.organization_id, director_id: director.id, status: 'valid', visibility: 'staff_only'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Agregar documento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>URL del archivo</Label><Input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value, file_name: e.target.value.split('/').pop() }))} placeholder="https://..." /></div>
          <div className="space-y-1.5"><Label>Fecha de vencimiento</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}