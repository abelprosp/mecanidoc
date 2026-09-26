"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type MailSettingsForm = {
  id: string | null;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  smtp_pass: string;
  imap_host: string;
  imap_port: string;
  imap_user: string;
  imap_mailbox: string;
  imap_pass: string;
};

const emptyMailForm = (): MailSettingsForm => ({
  id: null,
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_from: '',
  smtp_pass: '',
  imap_host: '',
  imap_port: '993',
  imap_user: '',
  imap_mailbox: 'INBOX',
  imap_pass: '',
});

export default function SettingsSection() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [mail, setMail] = useState<MailSettingsForm>(emptyMailForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from('global_settings').select('*').maybeSingle();
      setSettings(data || {});

      const { data: mailRow, error: mailErr } = await supabase
        .from('support_mail_settings')
        .select('id,smtp_host,smtp_port,smtp_user,smtp_from,imap_host,imap_port,imap_user,imap_mailbox')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (mailErr && mailErr.code !== 'PGRST116' && !`${mailErr.message || ''}`.includes('does not exist')) {
        console.warn('support_mail_settings:', mailErr);
      }

      if (mailRow) {
        setMail({
          id: mailRow.id,
          smtp_host: mailRow.smtp_host || '',
          smtp_port: String(mailRow.smtp_port ?? 587),
          smtp_user: mailRow.smtp_user || '',
          smtp_from: mailRow.smtp_from || '',
          smtp_pass: '',
          imap_host: mailRow.imap_host || '',
          imap_port: String(mailRow.imap_port ?? 993),
          imap_user: mailRow.imap_user || '',
          imap_mailbox: mailRow.imap_mailbox || 'INBOX',
          imap_pass: '',
        });
      } else {
        setMail(emptyMailForm());
      }

      setLoading(false);
    };
    f();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) await supabase.from('global_settings').update(settings).eq('id', settings.id);
      else await supabase.from('global_settings').insert([settings]);

      const mailPayload: Record<string, unknown> = {
        smtp_host: mail.smtp_host.trim() || null,
        smtp_port: Number.parseInt(String(mail.smtp_port), 10) || 587,
        smtp_user: mail.smtp_user.trim() || null,
        smtp_from: mail.smtp_from.trim() || null,
        imap_host: mail.imap_host.trim() || null,
        imap_port: Number.parseInt(String(mail.imap_port), 10) || 993,
        imap_user: mail.imap_user.trim() || null,
        imap_mailbox: mail.imap_mailbox.trim() || 'INBOX',
        updated_at: new Date().toISOString(),
      };
      if (mail.smtp_pass.trim()) mailPayload.smtp_pass = mail.smtp_pass.trim();
      if (mail.imap_pass.trim()) mailPayload.imap_pass = mail.imap_pass.trim();

      if (mail.id) {
        const { error: upErr } = await supabase.from('support_mail_settings').update(mailPayload).eq('id', mail.id);
        if (upErr) throw upErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('support_mail_settings')
          .insert([mailPayload])
          .select('id')
          .single();
        if (insErr) throw insErr;
        if (inserted?.id) setMail((m) => ({ ...m, id: inserted.id }));
      }

      setMail((m) => ({ ...m, smtp_pass: '', imap_pass: '' }));
      alert('Paramètres sauvegardés');
    } catch (e: any) {
      console.error(e);
      alert(
        e?.message?.includes('support_mail_settings') || e?.code === '42P01'
          ? 'Exécutez la migration SQL add_support_mail_settings.sql sur Supabase, puis réessayez.'
          : `Erreur: ${e?.message || 'sauvegarde impossible'}`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Configuration Globale</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Boutique</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">TVA (%)</label>
            <input
              type="number"
              value={settings.default_tax_rate || ''}
              onChange={(e) => setSettings({ ...settings, default_tax_rate: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Frais de Livraison (€)</label>
            <input
              type="number"
              value={settings.delivery_base_fee || ''}
              onChange={(e) => setSettings({ ...settings, delivery_base_fee: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="5.99"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Messagerie support (SMTP / IMAP)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Utilisé pour l&apos;envoi des réponses et la synchronisation de la boîte « Inbox Email ». Laissez les champs mot de passe vides pour ne pas les modifier.
          Les variables d&apos;environnement <code className="bg-gray-100 px-1 rounded">SUPPORT_SMTP_*</code> /{' '}
          <code className="bg-gray-100 px-1 rounded">SUPPORT_IMAP_*</code> servent de secours si un champ reste vide en base.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div className="md:col-span-2 text-xs font-bold text-blue-700 uppercase">SMTP (envoi)</div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Serveur SMTP</label>
            <input
              value={mail.smtp_host}
              onChange={(e) => setMail({ ...mail, smtp_host: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="smtp.exemple.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Port</label>
            <input
              type="number"
              value={mail.smtp_port}
              onChange={(e) => setMail({ ...mail, smtp_port: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Utilisateur</label>
            <input
              value={mail.smtp_user}
              onChange={(e) => setMail({ ...mail, smtp_user: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Mot de passe SMTP</label>
            <input
              type="password"
              value={mail.smtp_pass}
              onChange={(e) => setMail({ ...mail, smtp_pass: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-1">Adresse d&apos;expédition (From)</label>
            <input
              value={mail.smtp_from}
              onChange={(e) => setMail({ ...mail, smtp_from: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="support@votredomaine.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 border-t pt-6">
          <div className="md:col-span-2 text-xs font-bold text-blue-700 uppercase">IMAP (synchronisation)</div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Serveur IMAP</label>
            <input
              value={mail.imap_host}
              onChange={(e) => setMail({ ...mail, imap_host: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="imap.exemple.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Port</label>
            <input
              type="number"
              value={mail.imap_port}
              onChange={(e) => setMail({ ...mail, imap_port: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Utilisateur IMAP</label>
            <input
              value={mail.imap_user}
              onChange={(e) => setMail({ ...mail, imap_user: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Mot de passe IMAP</label>
            <input
              type="password"
              value={mail.imap_pass}
              onChange={(e) => setMail({ ...mail, imap_pass: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-1">Dossier (mailbox)</label>
            <input
              value={mail.imap_mailbox}
              onChange={(e) => setMail({ ...mail, imap_mailbox: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="INBOX"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 w-full md:w-auto"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
          </button>
        </div>
      </div>
    </div>
  );
}
