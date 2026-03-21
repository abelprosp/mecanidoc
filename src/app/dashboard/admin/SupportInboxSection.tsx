"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, RefreshCcw, Send } from 'lucide-react';

type EmailThread = {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  preview: string | null;
  status: string;
  last_message_at: string;
};

type EmailMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  created_at: string;
};

export default function SupportInboxSection() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId]);

  const loadThreads = async () => {
    const response = await fetch('/api/support/email/threads');
    const data = await response.json();
    if (response.ok) {
      setThreads(data.threads || []);
      if (!selectedId && data.threads?.[0]?.id) setSelectedId(data.threads[0].id);
      setError(null);
    } else {
      setError(data.error || 'Falha ao carregar inbox.');
    }
    setLoading(false);
  };

  const loadThread = async (threadId: string) => {
    const response = await fetch(`/api/support/email/thread/${threadId}`);
    const data = await response.json();
    if (response.ok) {
      setMessages(data.messages || []);
      setError(null);
    } else {
      setError(data.error || 'Falha ao abrir thread.');
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId]);

  const syncInbox = async () => {
    setSyncing(true);
    const response = await fetch('/api/support/email/sync', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Falha ao sincronizar emails.');
    } else {
      setError(null);
      await loadThreads();
      if (selectedId) await loadThread(selectedId);
    }
    setSyncing(false);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    const response = await fetch('/api/support/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: selected.id,
        to: selected.from_email,
        subject: selected.subject || 'Réponse MecaniDoc',
        body: reply,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Falha ao enviar email.');
    } else {
      setReply('');
      setError(null);
      await loadThread(selected.id);
      await loadThreads();
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inbox Email</h1>
          <p className="text-sm text-gray-500">
            Synchronisation IMAP et réponses SMTP. Configurez les serveurs dans <strong>Configuration Globale</strong> → Messagerie support (ou variables SUPPORT_* sur le serveur).
          </p>
        </div>
        <button onClick={syncInbox} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />} Synchroniser
        </button>
      </header>

      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border bg-white">
          <div className="border-b p-4 font-semibold text-gray-800">Boîte de réception</div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div> : null}
            {!loading && threads.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-gray-500">
                <Inbox size={28} />
                <span>Aucun email synchronisé pour le moment.</span>
              </div>
            ) : null}
            {threads.map((thread) => (
              <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`w-full border-b p-4 text-left hover:bg-gray-50 ${selectedId === thread.id ? 'bg-blue-50' : ''}`}>
                <div className="font-medium text-gray-800">{thread.subject || '(Sans sujet)'}</div>
                <div className="mt-1 text-xs text-gray-500">{thread.from_name || thread.from_email} • {thread.status}</div>
                <div className="mt-2 line-clamp-2 text-sm text-gray-600">{thread.preview || 'Sans aperçu'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-white">
          {!selected ? (
            <div className="flex min-h-[500px] items-center justify-center text-gray-500">Sélectionnez un email.</div>
          ) : (
            <>
              <div className="border-b p-4">
                <div className="font-semibold text-gray-800">{selected.subject || '(Sans sujet)'}</div>
                <div className="text-sm text-gray-500">{selected.from_name || selected.from_email}</div>
              </div>
              <div className="max-h-[55vh] space-y-3 overflow-y-auto bg-gray-50 p-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${message.direction === 'outbound' ? 'bg-blue-600 text-white' : 'border bg-white text-gray-800'}`}>
                      <div className="mb-1 text-xs opacity-70">{message.direction === 'outbound' ? message.to_email : message.from_email}</div>
                      <div className="whitespace-pre-wrap">{message.body_text || '(Sans contenu texte)'}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Répondre par email..." className="min-h-[120px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50">
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

