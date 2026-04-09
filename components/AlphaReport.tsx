
import React, { useState } from 'react';
import { WeeklyReport } from '../types.ts';

interface AlphaReportProps {
  existingReports: WeeklyReport[];
  currentWeight?: number;
  onSave: (report: WeeklyReport) => void;
  onDismiss: () => void;
}

export default function AlphaReport({ existingReports, currentWeight, onSave, onDismiss }: AlphaReportProps) {
  const [weight, setWeight] = useState<string>(currentWeight ? String(currentWeight) : '');
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  // Vorige week rapport voor trend
  const prev = existingReports.length > 0 ? existingReports[existingReports.length - 1] : null;
  const weightNum = parseFloat(weight);
  const weightTrend = prev && weightNum
    ? weightNum - prev.weight
    : null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!weightNum || isNaN(weightNum)) return;
    onSave({ date: today, weight: weightNum, energyLevel, photo: photo || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-[#FF2A2A] bg-[#080808] p-6 shadow-[0_0_40px_rgba(255,42,42,0.2)]">
        <div className="mb-6">
          <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.4em] font-black mb-1">Wekelijks Check-In</p>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Alpha Report</h2>
          <p className="text-[9px] text-gray-500 mt-1 uppercase">Systeem verlangt jouw voortgangsdata</p>
        </div>

        {/* Gewicht */}
        <div className="mb-4">
          <label className="text-[9px] uppercase tracking-widest text-gray-500 font-black block mb-2">
            Huidig gewicht (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="bijv. 82.5"
            className="w-full bg-black border border-[#333] p-3 text-white data-font text-xl focus:border-[#FF2A2A] outline-none"
          />
          {weightTrend !== null && (
            <p className={`text-[9px] font-black mt-1 ${weightTrend < 0 ? 'text-[#00FF88]' : weightTrend > 0 ? 'text-[#FF2A2A]' : 'text-gray-500'}`}>
              {weightTrend < 0 ? `▼ ${Math.abs(weightTrend).toFixed(1)} kg t.o.v. vorige week` : weightTrend > 0 ? `▲ +${weightTrend.toFixed(1)} kg t.o.v. vorige week` : '= Zelfde als vorige week'}
            </p>
          )}
        </div>

        {/* Energie Level */}
        <div className="mb-4">
          <label className="text-[9px] uppercase tracking-widest text-gray-500 font-black block mb-2">
            Energie level: <span className="text-white">{energyLevel}/10</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={e => setEnergyLevel(Number(e.target.value))}
            className="w-full accent-[#FF2A2A]"
          />
          <div className="flex justify-between text-[8px] text-gray-600 mt-1">
            <span>Uitgeput</span>
            <span>Maximaal</span>
          </div>
        </div>

        {/* Progressiefoto (optioneel) */}
        <div className="mb-6">
          <label className="text-[9px] uppercase tracking-widest text-gray-500 font-black block mb-2">
            Progressiefoto (optioneel)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="h-24 border border-dashed border-[#333] hover:border-[#FF2A2A] flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden"
          >
            {photo ? (
              <img src={photo} className="w-full h-full object-cover" alt="Progressie" />
            ) : (
              <span className="text-[9px] text-gray-600 uppercase font-black">📷 Upload foto</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 border border-gray-800 py-3 text-[10px] font-black uppercase text-gray-600 hover:text-white tracking-widest"
          >
            Later
          </button>
          <button
            onClick={handleSave}
            disabled={!weight || isNaN(parseFloat(weight))}
            className="flex-1 bg-[#FF2A2A] text-black py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Rapporteer
          </button>
        </div>
      </div>
    </div>
  );
}
