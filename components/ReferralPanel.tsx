
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ReferralPanelProps {
  profile: UserProfile;
  onBack: () => void;
}

export default function ReferralPanel({ profile, onBack }: ReferralPanelProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const referralCode = profile.referralCode || '—';
  const referralCount = profile.referralCount || 0;

  // XP bonus tiers
  const BONUS_TIERS = [
    { count: 1, reward: '+500 XP Bonus' },
    { count: 3, reward: '+1500 XP + Shadow Trial (7 dagen gratis)' },
    { count: 5, reward: '+3000 XP + Wolf Badge 🐺' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setError('Voer een geldig e-mailadres in.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/send-referral-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: inviteEmail.trim(),
          fromUsername: profile.username,
          referralCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setInviteEmail('');
      } else {
        setError('Versturen mislukt. Probeer opnieuw.');
      }
    } catch {
      setError('Verbindingsfout. Probeer opnieuw.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 pt-10 pb-32">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.4em] font-black mb-1">Guild Uitbreiding</p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Referral Systeem</h1>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest">← Terug</button>
      </header>

      {/* Jouw code */}
      <div className="border border-[#FF2A2A]/40 bg-[#FF2A2A]/05 p-6 mb-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Jouw Referral Code</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-[0.3em] text-[#FF2A2A]">{referralCode}</span>
          <button
            onClick={handleCopy}
            className="text-[9px] font-black uppercase border border-[#333] px-3 py-1.5 hover:border-[#FF2A2A] hover:text-[#FF2A2A] transition-all"
          >
            {copied ? '✓ Gekopieerd' : 'Kopieer'}
          </button>
        </div>
        <p className="text-[9px] text-gray-600 mt-2">
          Geef deze code aan vrienden. Zij vullen hem in bij registratie.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-[#222] p-4 text-center">
          <p className="text-3xl font-black text-[#FF2A2A]">{referralCount}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Uitgenodigde Jagers</p>
        </div>
        <div className="border border-[#222] p-4 text-center">
          <p className="text-3xl font-black text-white">{referralCount * 500}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Bonus XP Verdiend</p>
        </div>
      </div>

      {/* Beloningsstructuur */}
      <div className="border border-[#222] p-5 mb-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-4">Beloningsstructuur</p>
        <div className="space-y-3">
          {BONUS_TIERS.map((tier) => {
            const reached = referralCount >= tier.count;
            return (
              <div
                key={tier.count}
                className="flex items-center justify-between"
                style={{ opacity: reached ? 1 : 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-[8px] font-black border px-2 py-0.5 uppercase"
                    style={{
                      borderColor: reached ? '#00FF88' : '#444',
                      color: reached ? '#00FF88' : '#666',
                    }}
                  >
                    {reached ? '✓' : `${tier.count}x`}
                  </span>
                  <span className="text-[10px] text-gray-400">{tier.reward}</span>
                </div>
                <span className="text-[8px] text-gray-600 uppercase">
                  {tier.count} referral{tier.count > 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[#222]">
          <p className="text-[9px] text-gray-600">
            🐺 Je vriend krijgt: <span className="text-white">7 dagen Shadow Hunter gratis</span> bij registratie met jouw code.
          </p>
        </div>
      </div>

      {/* Uitnodigen via e-mail */}
      <div className="border border-[#222] p-5">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-4">Vriend Uitnodigen via E-mail</p>

        {sent ? (
          <div className="border border-[#00FF88] bg-[#00FF88]/5 p-4 text-center">
            <p className="text-[10px] font-black text-[#00FF88] uppercase">✓ Uitnodiging verstuurd!</p>
            <button
              onClick={() => setSent(false)}
              className="mt-3 text-[9px] text-gray-500 hover:text-white uppercase tracking-widest"
            >
              Nog iemand uitnodigen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="vriend@email.com"
              className="w-full bg-[#111] border border-[#222] p-3 text-white text-sm outline-none focus:border-[#FF2A2A] placeholder-gray-700 transition-colors"
            />
            {error && (
              <p className="text-[9px] text-[#FF2A2A] font-black uppercase">{error}</p>
            )}
            <button
              onClick={handleInvite}
              disabled={sending}
              className="w-full bg-[#FF2A2A] text-black py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-opacity"
            >
              {sending ? 'Versturen...' : '→ Uitnodiging Sturen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
