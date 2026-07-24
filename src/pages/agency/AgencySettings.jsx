import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { PageHeader } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AgencySettings() {
  const { user, checkUserAuth } = useAuth();
  const orgId = getUserOrgId(user);
  const { toast } = useToast();
  const [org, setOrg] = useState(null);
  const [form, setForm] = useState({ name: '', logo_url: '', primary_color: '#0F172A', secondary_color: '#3B82F6', cover_image_url: '', contact_email: '', contact_phone: '', address: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrg(); }, [orgId]);

  const loadOrg = async () => {
    try {
      const data = await base44.entities.Organization.get(orgId);
      setOrg(data);
      setForm({
        name: data.name || '', logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#0F172A', secondary_color: data.secondary_color || '#3B82F6',
        cover_image_url: data.cover_image_url || '', contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '', address: data.address || '', country: data.country || ''
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Organization.update(orgId, form);
      toast({ title: 'Configuración guardada', description: 'La identidad de tu agencia se actualizó correctamente.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleUpload = async (file, field) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
    } catch (err) {
      toast({ title: 'Error al subir archivo', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <PageHeader title="Configuración" subtitle="Personaliza la identidad de tu agencia" />
      <form onSubmit={handleSave} className="space-y-5">
        {/* Branding */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Building2 className="w-4 h-4" /> Identidad visual</h3>
          <div><Label>Nombre de la agencia</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Logotipo</Label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-slate-300" />}
                </div>
                <Label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Upload className="w-3.5 h-3.5" /> Subir</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'logo_url')} />
                </Label>
              </div>
            </div>
            <div>
              <Label>Imagen de portada</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {form.cover_image_url ? <img src={form.cover_image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-300">Sin portada</span>}
                </div>
                <Label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Upload className="w-3.5 h-3.5" /> Subir</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'cover_image_url')} />
                </Label>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Color primario</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Color secundario</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <Input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Información de contacto</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Email de contacto</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
            <div><Label>Teléfono</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
          </div>
          <div><Label>Dirección</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>País</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}