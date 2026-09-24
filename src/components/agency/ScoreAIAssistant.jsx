import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bot, Sparkles, Send, Loader2, Database, ShieldCheck, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

const BASE_SUGGESTIONS = [
  '¿Qué jugadores requieren atención hoy?',
  'Resumime los próximos partidos de mis representados.',
  '¿Qué contratos o seguimientos debería revisar?',
  'Dame un resumen ejecutivo de la cartera.'
];

function pageSuggestions(pathname) {
  if (pathname.includes('/agency/players/')) {
    return ['Resumime este jugador y su contexto actual.', '¿Qué datos importantes debería revisar antes de una reunión?', ...BASE_SUGGESTIONS.slice(0, 2)];
  }
  if (pathname.includes('/agency/stats')) {
    return ['¿Quiénes son los jugadores con mejor rendimiento reciente?', '¿Qué jugadores tienen menos cobertura estadística?', ...BASE_SUGGESTIONS.slice(0, 2)];
  }
  if (pathname.includes('/agency/matches')) {
    return ['¿Qué partidos próximos tienen representados?', '¿Qué jugadores vienen con más minutos recientemente?', ...BASE_SUGGESTIONS.slice(0, 2)];
  }
  if (pathname.includes('/agency/intelligence')) {
    return ['¿Qué jugadores tienen seguimientos pendientes?', '¿Qué prioridades debería atender primero?', ...BASE_SUGGESTIONS.slice(0, 2)];
  }
  return BASE_SUGGESTIONS;
}

export default function ScoreAIAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const orgId = getUserOrgId(user);
  const [open, setOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState({ configured: false, mode: 'read_only', statusMessage: '' });
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  const suggestions = useMemo(() => pageSuggestions(location.pathname), [location.pathname]);

  const loadStatus = async () => {
    if (!orgId) return;
    setStatusLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('score-ai', { action: 'status', organization_id: orgId });
      const data = response.data || {};
      setStatus({
        configured: Boolean(data.configured),
        mode: data.mode || 'read_only',
        provider: data.provider || 'OpenAI',
        model: data.model || null,
        statusMessage: data.status_message || '',
      });
    } catch (err) {
      setStatus({ configured: false, mode: 'read_only', statusMessage: '' });
      setError(err.response?.data?.error || err.message || 'No se pudo verificar el estado de Score IA.');
    }
    setStatusLoading(false);
  };

  useEffect(() => {
    if (open) loadStatus();
  }, [open, orgId]);

  const sendQuestion = async (text) => {
    const value = String(text || question).trim();
    if (!value || sending) return;
    if (!status.configured) {
      setError('Score IA todavía no está conectada. Cuando carguemos la API, este mismo panel quedará operativo.');
      return;
    }

    setError('');
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', text: value }]);
    setSending(true);
    try {
      const response = await base44.functions.invoke('score-ai', {
        organization_id: orgId,
        question: value,
      });
      const data = response.data || {};
      if (!data.success) throw new Error(data.error || 'No se pudo completar la consulta.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer || 'Sin respuesta.',
        sources: data.sources_used || [],
      }]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudo completar la consulta.');
    }
    setSending(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendQuestion();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_14px_40px_rgba(15,23,42,0.32)] transition hover:-translate-y-0.5 hover:bg-slate-900"
        aria-label="Abrir Score IA"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Score IA</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white">
            <SheetHeader className="text-left">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                <Bot className="h-5 w-5" />
              </div>
              <SheetTitle className="text-xl font-black text-white">Score IA</SheetTitle>
              <SheetDescription className="text-slate-300">
                Consultá jugadores, partidos, agenda y cartera desde un solo lugar.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
            <div className={`rounded-2xl border p-4 ${status.configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${status.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : status.configured ? <CheckCircle2 className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{statusLoading ? 'Verificando conexión…' : status.configured ? 'IA conectada' : 'Conexión pendiente'}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {statusLoading
                        ? 'Probando la conexión segura con OpenAI…'
                        : status.statusMessage || (status.configured
                          ? 'Modo consulta: puede leer información habilitada de Score sin modificar registros.'
                          : 'La conexión con OpenAI todavía no pudo validarse.')}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={loadStatus} className="rounded-lg p-2 text-slate-400 hover:bg-white/70 hover:text-slate-700" title="Actualizar estado">
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Consultas rápidas</p>
                  <div className="mt-3 grid gap-2">
                    {suggestions.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => status.configured ? sendQuestion(item) : setQuestion(item)}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Capability icon={Database} title="Datos conectados" text="Jugadores, partidos y agenda" />
                  <Capability icon={ShieldCheck} title="Solo lectura" text="No modifica registros" />
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.sources?.length > 0 && (
                        <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">Fuentes internas consultadas: {message.sources.join(' · ')}</p>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Analizando Score…</div>
                  </div>
                )}
              </div>
            )}

            {error && <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</div>}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-300">
              <Textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={status.configured ? 'Preguntale algo sobre tu cartera…' : 'La IA quedará habilitada cuando conectemos la API'}
                className="min-h-[76px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <span className="text-[10px] text-slate-400">Score IA · lectura interna</span>
                <Button size="sm" onClick={() => sendQuestion()} disabled={!question.trim() || sending || !status.configured} className="bg-slate-950 hover:bg-slate-800">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Capability({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <Icon className="h-4 w-4 text-emerald-700" />
      <p className="mt-2 text-xs font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{text}</p>
    </div>
  );
}
