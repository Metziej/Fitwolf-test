
import React, { useState, useEffect } from 'react';
import { UserProfile, Invoice } from '../types.ts';
import { getRankInfo } from '../App.tsx';

interface SubscriptionManagerProps {
  profile: UserProfile;
  onSave: (data: any) => void;
  onBack: () => void;
}

const TIER_INFO: Record<string, { label: string; price: string; color: string; perks: string[] }> = {
  free: {
    label: 'Pup (Gratis)',
    price: '€0 / maand',
    color: '#8A8A8A',
    perks: ['Dashboard toegang', 'Basis STR/VIT/INT tracking', 'E-Rank progressie'],
  },
  shadow: {
    label: 'Shadow Hunter',
    price: '€37 / maand',
    color: '#7EC8E3',
    perks: ['Alles uit Free', 'Akte I + II protocollen', 'Lean & Mean Blueprint', 'D/C-Rank unlock'],
  },
  wolf: {
    label: 'Pack Member (Wolf)',
    price: '€47 / maand',
    color: '#FF2A2A',
    perks: ['Alles', 'Volledige Vault', 'Alle Aktes', 'Custom Workout Builder', 'Advanced Heavy Duty', 'Guild Raid toegang'],
  },
};

export default function SubscriptionManager({ profile, onSave, onBack }: SubscriptionManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'upgrade'>('overview');

  const currentTier = TIER_INFO[profile.tierId] || TIER_INFO.free;
  const rankInfo = getRankInfo(profile.xp || 0);

  useEffect(() => {
    if (activeTab === 'invoices' && profile.subscriptionId) {
      loadInvoices();
    }
  }, [activeTab]);

  const loadInvoices = async () => {
    if (!profile.subscriptionId) return;
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/get-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.subscriptionId }),
      });
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices);
    } catch (e) {
      console.error('Invoices laden mislukt', e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleCancel = async () => {
    if (!profile.subscriptionId) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: profile.subscriptionId }),
      });
      const data = await res.json();
      if (data.success) {
        // Downgrade naar free tier
        onSave({ tierId: 'free', subscriptionId: null });
        setCancelDone(true);
        setShowCancelConfirm(false);
      }
    } catch (e) {
      console.error('Opzeggen mislukt', e);
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (tierId: string) => {
    const tier = TIER_INFO[tierId];
    if (!tier) return;
    // Stuur naar Stripe checkout
    try {
      const price = tierId === 'shadow' ? 37 : 47;
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: `FitWolf ${tier.label}`, price, qty: 1 }],
          successUrl: window.location.origin + '?checkout=success&tier=' + tierId,
          cancelUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error('Upgrade mislukt', e);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 pt-10 pb-32">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.4em] font-black mb-1">Abonnement</p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Systeem Toegang</h1>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest">← Terug</button>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-[#222] mb-6">
        {(['overview', 'invoices', 'upgrade'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[9px] uppercase font-black tracking-widest transition-all ${
              activeTab === tab ? 'text-[#FF2A2A] border-b-2 border-[#FF2A2A]' : 'text-gray-600'
            }`}
          >
            {tab === 'overview' ? 'Overzicht' : tab === 'invoices' ? 'Facturen' : 'Upgraden'}
          </button>
        ))}
      </nav>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {cancelDone && (
            <div className="border border-[#00FF88] bg-[#00FF88]/5 p-4">
              <p className="text-[10px] font-black text-[#00FF88] uppercase">✓ Abonnement opgezegd. Je bent teruggezet naar Pup (Gratis).</p>
            </div>
          )}

          {/* Huidige tier */}
          <div
            className="border p-6"
            style={{ borderColor: currentTier.color + '60', background: currentTier.color + '08' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Actief abonnement</p>
                <h2 className="text-xl font-black uppercase" style={{ color: currentTier.color }}>{currentTier.label}</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">{currentTier.price}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase mb-1">Rank</p>
                <p className="text-sm font-black" style={{ color: rankInfo.color }}>{rankInfo.rank}-RANK</p>
              </div>
            </div>
            <ul className="space-y-1">
              {currentTier.perks.map((perk, i) => (
                <li key={i} className="text-[10px] text-gray-400 flex items-center gap-2">
                  <span style={{ color: currentTier.color }}>✓</span> {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Opzeggen */}
          {profile.tierId !== 'free' && !cancelDone && (
            <div className="border border-[#333] p-4">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-3">Abonnement opzeggen</p>
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full border border-[#333] py-3 text-[10px] font-black uppercase text-gray-600 hover:text-[#FF2A2A] hover:border-[#FF2A2A] transition-all"
                >
                  Abonnement opzeggen
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-[#FF2A2A] font-black uppercase">
                    ⚠️ Je verliest toegang tot alle premium features. Weet je het zeker?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 border border-[#333] py-3 text-[10px] font-black uppercase text-gray-500"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 bg-[#FF2A2A] text-black py-3 text-[10px] font-black uppercase disabled:opacity-50"
                    >
                      {cancelling ? 'Bezig...' : 'Ja, opzeggen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Geen Stripe subscription ID = handmatig beheer */}
          {!profile.subscriptionId && profile.tierId !== 'free' && (
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest">
              Je abonnement wordt handmatig beheerd. Neem contact op via info@metzworks.nl om op te zeggen.
            </p>
          )}
        </div>
      )}

      {/* ── FACTUREN ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {!profile.subscriptionId ? (
            <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest py-10">
              Geen Stripe-account gekoppeld. Facturen worden per email verstuurd.
            </p>
          ) : loadingInvoices ? (
            <div className="text-center py-10">
              <div className="text-[#FF2A2A] font-black uppercase text-[10px] animate-pulse">Facturen laden...</div>
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest py-10">Geen facturen gevonden.</p>
          ) : (
            invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between border border-[#222] p-4">
                <div>
                  <p className="text-[10px] font-black text-white uppercase">{inv.date}</p>
                  <p className="text-[9px] text-gray-500">{inv.currency} {inv.amount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[8px] font-black uppercase px-2 py-0.5 border"
                    style={{
                      borderColor: inv.status === 'paid' ? '#00FF88' : '#FF2A2A',
                      color: inv.status === 'paid' ? '#00FF88' : '#FF2A2A',
                    }}
                  >
                    {inv.status}
                  </span>
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-gray-500 hover:text-white uppercase border border-[#333] px-2 py-1 transition-colors"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── UPGRADEN ── */}
      {activeTab === 'upgrade' && (
        <div className="space-y-4">
          {Object.entries(TIER_INFO).map(([tierId, tier]) => {
            const isCurrent = profile.tierId === tierId;
            return (
              <div
                key={tierId}
                className="border p-5 transition-all"
                style={{
                  borderColor: isCurrent ? tier.color : tier.color + '30',
                  background: isCurrent ? tier.color + '10' : 'transparent',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-black uppercase" style={{ color: tier.color }}>{tier.label}</h3>
                    <p className="text-[10px] text-gray-400">{tier.price}</p>
                  </div>
                  {isCurrent ? (
                    <span className="text-[8px] font-black uppercase px-2 py-1 border" style={{ borderColor: tier.color, color: tier.color }}>
                      Actief
                    </span>
                  ) : tierId !== 'free' ? (
                    <button
                      onClick={() => handleUpgrade(tierId)}
                      className="text-[9px] font-black uppercase px-4 py-2 transition-all text-black"
                      style={{ background: tier.color }}
                    >
                      Upgraden
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="text-[9px] text-gray-500 flex items-center gap-2">
                      <span style={{ color: tier.color }}>›</span> {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
