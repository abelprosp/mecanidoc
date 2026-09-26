"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCcw, Send } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';

type Conversation = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  assigned_admin_email: string | null;
  last_message: string | null;
  unread_count: number;
  last_message_at: string;
};

type SupportMessage = {
  id: string;
  sender_type: 'customer' | 'admin' | 'system';
  sender_name: string | null;
  body: string;
  created_at: string;
};

export default function SupportChatSection() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const conversationsSigRef = useRef('');
  const messagesRef = useRef<SupportMessage[]>([]);
  messagesRef.current = messages;
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  /** Devolve true se a lista mudou (evita re-render e reinicia o intervalo de polling). */
  const loadConversations = useCallback(async (): Promise<boolean> => {
    const response = await fetch('/api/support/chat/conversations', { cache: 'no-store' });
    if (!response.ok) {
      setLoading(false);
      return false;
    }
    const data = await response.json();
    const list: Conversation[] = data.conversations || [];
    const sig = list.map((c) => `${c.id}:${c.last_message_at}:${c.unread_count}:${c.status}`).join('|');
    const changed = sig !== conversationsSigRef.current;
    conversationsSigRef.current = sig;
    if (changed) setConversations(list);
    if (!selectedIdRef.current && list[0]?.id) setSelectedId(list[0].id);
    setLoading(false);
    return changed;
  }, []);

  /** Conversa a que pertencem as mensagens em estado (evita usar `after` de outra conversa). */
  const messagesForRef = useRef<string | null>(null);

  /** Carrega mensagens: completo na primeira vez por conversa, depois incremental. */
  const loadMessages = useCallback(async (conversationId: string): Promise<boolean> => {
    const params = new URLSearchParams({ conversationId });
    const sameConversation = messagesForRef.current === conversationId;
    const last = messagesRef.current[messagesRef.current.length - 1];
    if (sameConversation && last) params.set('after', last.created_at);
    const response = await fetch(`/api/support/chat/messages?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return false;
    // A seleção pode ter mudado durante o pedido.
    if (selectedIdRef.current !== conversationId) return false;
    const data = await response.json();
    const incoming: SupportMessage[] = data.messages || [];
    if (!data.incremental) {
      messagesForRef.current = conversationId;
      setMessages(incoming);
      return true;
    }
    if (incoming.length === 0) return false;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !known.has(m.id))];
    });
    return true;
  }, []);

  // Lista de conversas: 6s com atividade, até 45s sem; pausa com a aba oculta.
  const { bump: bumpConversations } = usePolling(loadConversations, { baseMs: 6000, maxMs: 45_000 });

  // Mensagens da conversa selecionada: 4s → 30s; o primeiro tick após mudar de conversa carrega tudo.
  const { bump: bumpMessages } = usePolling(
    () => (selectedIdRef.current ? loadMessages(selectedIdRef.current) : Promise.resolve(false)),
    { baseMs: 4000, maxMs: 30_000, enabled: Boolean(selectedId) }
  );

  useEffect(() => {
    if (selectedId) bumpMessages();
  }, [selectedId, bumpMessages]);

  const visibleMessages = messagesForRef.current === selectedId ? messages : [];

  const assignConversation = async () => {
    if (!selectedId) return;
    await fetch('/api/support/chat/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId, assignToMe: true, status: 'in_progress' }),
    });
    await loadConversations();
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    await fetch('/api/support/chat/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId, status: 'closed' }),
    });
    await loadConversations();
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    const response = await fetch('/api/support/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId, senderType: 'admin', text: reply }),
    });
    if (response.ok) {
      setReply('');
      await loadMessages(selectedId);
      bumpMessages();
      bumpConversations();
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Support Chat</h1>
          <p className="text-sm text-gray-500">Conversations du site traitées par l&apos;admin.</p>
        </div>
        <button onClick={() => bumpConversations()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCcw size={16} /> Actualiser
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border bg-white">
          <div className="border-b p-4 font-semibold text-gray-800">Conversations</div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div> : null}
            {!loading && conversations.length === 0 ? <div className="p-6 text-sm text-gray-500">Aucune conversation pour le moment.</div> : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className={`w-full border-b p-4 text-left transition-colors hover:bg-gray-50 ${selectedId === conversation.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-800">{conversation.customer_name || conversation.customer_email || 'Visiteur'}</div>
                    <div className="text-xs text-gray-500">{conversation.customer_email || 'Sans email'}</div>
                  </div>
                  {Number(conversation.unread_count) > 0 ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-gray-500">{conversation.status} {conversation.assigned_admin_email ? `• ${conversation.assigned_admin_email}` : ''}</div>
                <div className="mt-2 line-clamp-2 text-sm text-gray-600">{conversation.last_message || 'Nouvelle conversation'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-white">
          {!selected ? (
            <div className="flex min-h-[500px] items-center justify-center text-gray-500">Choisissez une conversation.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <div className="font-semibold text-gray-800">{selected.customer_name || selected.customer_email || 'Visiteur'}</div>
                  <div className="text-sm text-gray-500">Statut: {selected.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={assignConversation} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <CheckCircle2 size={16} /> Prendre en charge
                  </button>
                  <button onClick={closeConversation} className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Clore
                  </button>
                </div>
              </div>

              <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4 bg-gray-50">
                {visibleMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${message.sender_type === 'admin' ? 'bg-blue-600 text-white' : message.sender_type === 'system' ? 'bg-amber-100 text-amber-900' : 'bg-white text-gray-800 border'}`}>
                      <div className="mb-1 text-xs opacity-70">{message.sender_name || message.sender_type}</div>
                      <div className="whitespace-pre-wrap">{message.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Répondre au client..."
                    className="min-h-[96px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
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

