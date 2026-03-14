"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Message = {
  id: string;
  sender_type: 'customer' | 'admin' | 'system';
  sender_name: string | null;
  body: string;
  created_at: string;
};

const GUEST_TOKEN_KEY = 'mecanidoc_support_guest_token';

function getGuestToken() {
  if (typeof window === 'undefined') return null;
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

export default function ChatBot() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const syncSession = async (token: string | null) => {
    setLoading(true);
    const response = await fetch('/api/support/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestToken: token }),
    });
    const data = await response.json();
    if (response.ok) {
      setConversationId(data.conversation?.id || null);
      setMessages(data.messages || []);
    }
    setLoading(false);
  };

  const loadMessages = async (id: string, token: string | null) => {
    const params = new URLSearchParams({ conversationId: id });
    if (token) params.set('guestToken', token);
    const response = await fetch(`/api/support/chat/messages?${params.toString()}`);
    const data = await response.json();
    if (response.ok) setMessages(data.messages || []);
  };

  useEffect(() => {
    const init = async () => {
      const token = getGuestToken();
      setGuestToken(token);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      await syncSession(token);
    };
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    const interval = setInterval(() => loadMessages(conversationId, guestToken), 4000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId, guestToken]);

  const handleSend = async () => {
    if (!conversationId || !inputMessage.trim() || sending) return;
    setSending(true);
    const response = await fetch('/api/support/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        guestToken,
        senderType: 'customer',
        text: inputMessage,
      }),
    });

    if (response.ok) {
      setInputMessage('');
      await loadMessages(conversationId, guestToken);
    }
    setSending(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-50 flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-blue-600 p-4 text-white shadow-lg transition-colors hover:bg-blue-700"
        aria-label="Ouvrir le chat"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <MessageCircle size={20} />
        <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:inset-auto md:bottom-24 md:right-6 md:h-[620px] md:w-96 md:rounded-xl md:border md:shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#0066CC] to-[#004499] p-4 text-white">
            <div>
              <h3 className="font-bold">Support MecaniDoc</h3>
              <p className="text-xs text-white/80">{userId ? 'Connecte' : 'Visiteur'} • Reponse humaine</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-white/10" aria-label="Fermer le chat">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : null}
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-xl px-4 py-3 text-sm ${message.sender_type === 'customer' ? 'bg-blue-600 text-white' : message.sender_type === 'admin' ? 'border bg-white text-gray-800' : 'bg-amber-100 text-amber-900'}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                      <UserRound size={12} /> {message.sender_name || message.sender_type}
                    </div>
                    <div className="whitespace-pre-wrap">{message.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Envoyez votre message a l'admin..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending || loading}
              />
              <button
                onClick={handleSend}
                disabled={sending || loading || !inputMessage.trim()}
                className="inline-flex min-w-[44px] items-center justify-center rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">Conversa atendida pelo admin no painel.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

