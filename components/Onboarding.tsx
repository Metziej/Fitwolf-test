
import React, { useState } from 'react';
import { Goal, UnitSystem } from '../types';

interface OnboardingProps {
  onComplete: (data: { weight: number; height: number; age: number; goal: Goal; units: UnitSystem }) => void;
}

type OnboardingStep = 'class' | 'stats';

const CLASSES: { id: Goal; name: string; icon: string; subtitle: string; desc: string; color: string }[] = [
  {
    id: Goal.BULK,
    name: 'WARRIOR',
    icon: '🗡️',
    subtitle: 'Kracht & Massa',
    desc: 'Jouw doel is maximale kracht en spiermassa opbouwen. Heavy Duty protocollen. Juggernaut dieet.',
    color: '#FF2A2A',
  },
  {
    id: Goal.CUT,
    name: 'PREDATOR',
    icon: '🐺',
    subtitle: 'Lean & Definitie',
    desc: 'Jouw doel is vetverbranding met behoud van spiermassa. Lean Blueprint dieet. Metabole optimalisatie.',
    color: '#00FF88',
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('class');
  const [formData, setFormData] = useState({
    weight: 80,
    height: 180,
    age: 25,
    goal: Goal.BULK,
    units: UnitSystem.METRIC,
  });

  // ── Stap 1: Klasse keuze ─────────────────────────────────────────────────
  if (step === 'class') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#030303]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.5em] font-black mb-2">Systeem Initialisatie</p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Jager Profiel Aanmaken</h1>
            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">Kies je klasse. Dit bepaalt je pad.</p>
          </div>

          <div className="space-y-4">
            {CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => {
                  setFormData(f => ({ ...f, goal: cls.id }));
                  setStep('stats');
                }}
                className="w-full border-2 p-6 text-left transition-all hover:scale-[1.01] group"
                style={{
                  borderColor: cls.color + '40',
                  background: cls.color + '08',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = cls.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = cls.color + '40')}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{cls.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="text-xl font-black uppercase italic tracking-tighter" style={{ color: cls.color }}>
                        {cls.name}
                      </h2>
                      <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{cls.subtitle}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{cls.desc}</p>
                  </div>
                  <span className="text-[#333] group-hover:text-gray-500 transition-colors text-xl font-black">→</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-[8px] text-gray-700 mt-6 uppercase tracking-widest">
            Je klasse kan later aangepast worden via je profiel.
          </p>
        </div>
      </div>
    );
  }

  // ── Stap 2: Statistieken invoeren ─────────────────────────────────────────
  const selectedClass = CLASSES.find(c => c.id === formData.goal)!;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#030303]">
      <div className="w-full max-w-md border-2 bg-black p-8 shadow-[0_0_30px_rgba(255,42,42,0.2)]"
        style={{ borderColor: selectedClass.color }}>
        <header className="mb-8">
          <button
            onClick={() => setStep('class')}
            className="text-[9px] text-gray-600 hover:text-white uppercase tracking-widest mb-4 block"
          >
            ← Andere klasse kiezen
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{selectedClass.icon}</span>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: selectedClass.color }}>
              {selectedClass.name}
            </h1>
          </div>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Initialiseer jager statistieken</p>
        </header>

        <div className="space-y-5">
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-2 font-black">
              Eenheden systeem
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormData({ ...formData, units: UnitSystem.METRIC })}
                className={`py-2 text-[10px] uppercase font-black border transition-all ${formData.units === UnitSystem.METRIC ? 'text-black' : 'border-[#222] text-gray-600'}`}
                style={formData.units === UnitSystem.METRIC ? { background: selectedClass.color, borderColor: selectedClass.color } : {}}
              >
                Metric (KG/CM)
              </button>
              <button
                onClick={() => setFormData({ ...formData, units: UnitSystem.IMPERIAL })}
                className={`py-2 text-[10px] uppercase font-black border transition-all ${formData.units === UnitSystem.IMPERIAL ? 'text-black' : 'border-[#222] text-gray-600'}`}
                style={formData.units === UnitSystem.IMPERIAL ? { background: selectedClass.color, borderColor: selectedClass.color } : {}}
              >
                Imperial (LBS/IN)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-2 font-black">
              Lichaamsgewicht ({formData.units === UnitSystem.METRIC ? 'KG' : 'LBS'})
            </label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
              className="w-full bg-[#111] border border-[#222] p-3 focus:border-[#FF2A2A] outline-none text-white text-lg"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-2 font-black">
              Lengte ({formData.units === UnitSystem.METRIC ? 'CM' : 'IN'})
            </label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
              className="w-full bg-[#111] border border-[#222] p-3 focus:border-[#FF2A2A] outline-none text-white text-lg"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-2 font-black">
              Leeftijd
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
              className="w-full bg-[#111] border border-[#222] p-3 focus:border-[#FF2A2A] outline-none text-white text-lg"
            />
          </div>

          <button
            onClick={() => onComplete(formData)}
            className="w-full py-4 font-black uppercase tracking-[0.3em] text-black transition-all shadow-lg"
            style={{ background: selectedClass.color, boxShadow: `0 0 20px ${selectedClass.color}44` }}
          >
            {selectedClass.icon} Systeem Activeren
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
