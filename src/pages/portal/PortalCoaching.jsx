import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Headphones, Loader2, MessageSquareText, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REASONS = [
  { value: 'performance_review', label: 'Revisión de mi rendimiento' },
  { value: 'opponent_preparation', label: 'Preparación del próximo rival' },
  { value: 'career_planning', label: 'Planificación de carrera' },
  { value: 'confidence_support', label: 'Confianza y preparación mental' },
  { value: 'other', label: 'Otro motivo' }
];

const STATUS = {
  scheduled: { label: 'Pendiente de confirmación', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Realizada', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' }
};

function toLocalInputMinimum(days = 1) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function PortalCoaching() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const minimumDate = useMemo(() => toLocalInputMinimum(1), []);

  const [form, setForm] = useState({
    reason: 'performance_review',
    preferred_date: '',
    alternative_date: '',
    message: ''
  });
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [playerId]);

  const loadRequests = async () => {
    if (!playerId) return;
    setLoadingRequests(true);
    try {
      const events = await base44.entities.CalendarEvent.filter({
        player_id: playerId,
        event_type: 'meeting',
        source_type: 'follow_up'
      }, '-created_date', 20);
      setRequests(events);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await base44.functions.invoke('requestCoaching', form);
      const result = response?.data || response;
      if (!result?.success) throw new Error(result?.error || 'No se pudo enviar la solicitud.');

      setFeedback({ type: 'success', message: 'Solicitud enviada. Score Fútbol te confirmará el horario.' });
      setForm({ reason: 'performance_review', preferred_date: '', alternative_date: '', message: '' });
      await loadRequests();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.error || error?.message || 'No se pudo enviar la solicitud.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <Headphones className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Acompañamiento personal</p>
            <h1 className="mt-1 text-xl font-bold">Solicitar coaching virtual</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Elegí el tema y proponé un horario. El equipo de Score Fútbol revisará la solicitud y confirmará la reunión.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <Label htmlFor="coaching-reason">¿Qué querés trabajar?</Label>
          <select
            id="coaching-reason"
            value={form.reason}
            onChange={(event) => updateField('reason', event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
          >
            {REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="preferred-date">Fecha y horario preferido</Label>
            <Input
              id="preferred-date"
              type="datetime-local"
              min={minimumDate}
              value={form.preferred_date}
              onChange={(event) => updateField('preferred_date', event.target.value)}
              className="mt-2 h-12"
              required
            />
          </div>
          <div>
            <Label htmlFor="alternative-date">Horario alternativo</Label>
            <Input
              id="alternative-date"
              type="datetime-local"
              min={minimumDate}
              value={form.alternative_date}
              onChange={(event) => updateField('alternative_date', event.target.value)}
              className="mt-2 h-12"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="coaching-message">Comentario para el equipo</Label>
          <div className="relative mt-2">
            <MessageSquareText className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <textarea
              id="coaching-message"
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              maxLength={1200}
              rows={4}
              placeholder="Contanos brevemente qué te gustaría revisar..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-slate-400">{form.message.length}/1200</p>
        </div>

        {feedback && (
          <div className={`rounded-xl border p-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {feedback.message}
          </div>
        )}

        <Button type="submit" disabled={submitting} className="h-12 w-full bg-emerald-600 font-bold hover:bg-emerald-700">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
          {submitting ? 'Enviando solicitud...' : 'Solicitar reunión virtual'}
        </Button>

        <p className="text-center text-xs leading-5 text-slate-400">
          La fecha propuesta no queda confirmada hasta que el equipo de Score Fútbol la apruebe.
        </p>
      </form>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-slate-500" />
          <h2 className="font-bold text-slate-800">Mis solicitudes</h2>
        </div>

        {loadingRequests ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Headphones className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">Todavía no solicitaste reuniones</p>
            <p className="mt-1 text-xs text-slate-400">Cuando lo hagas, podrás seguir el estado desde acá.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const status = STATUS[request.status] || STATUS.scheduled;
              return (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{formatDateTime(request.start_date)}</p>
                      <p className="mt-1 text-xs text-slate-400">{request.location || 'Reunión virtual'} · 45 minutos</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {request.status === 'confirmed' && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Reunión confirmada. Consultá el enlace o la información en tu calendario.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
