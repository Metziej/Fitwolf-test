
import React, { useState, useEffect, useRef } from 'react';
import { MindsetStep } from '../types.ts';

interface INTMindsetProps {
  steps: MindsetStep[];
  onBack: () => void;
  onComplete: (xpRatio: number) => void;
  onSaveProgress: (completedSteps: number[]) => void;
  savedProgress?: number[];
  isCompleted?: boolean;
}

export default function INTMindset({ steps, onBack, onComplete, onSaveProgress, savedProgress, isCompleted }: INTMindsetProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    if (savedProgress && savedProgress.length > 0 && savedProgress.length < steps.length) {
        return savedProgress.length;
    }
    return 0;
  });
  const [timer, setTimer] = useState(steps[currentStep]?.duration || 60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [thoughts, setThoughts] = useState<string[]>(steps.map(() => ''));
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioFileRef = useRef<HTMLAudioElement | null>(null);

  const startAudio = (freq: number, url?: string) => {
    if (!soundOn) return;
    
    // MP3 Handling
    if (url) {
        if (!audioFileRef.current) {
            audioFileRef.current = new Audio(url);
            audioFileRef.current.loop = true;
        } else if (audioFileRef.current.src !== url) {
            audioFileRef.current.src = url;
        }
        audioFileRef.current.play().catch(e => console.warn("Audio Playback blocked:", e));
        return;
    }

    // Binaural Beats Fallback
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  };

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const stopAudio = (fadeTime = 0.5) => {
    // Stop MP3
    if (audioFileRef.current) {
        audioFileRef.current.pause();
        audioFileRef.current = null;
    }

    // Stop Oscillator
    if (gainNodeRef.current && audioCtxRef.current) {
      try {
        const now = audioCtxRef.current.currentTime;
        gainNodeRef.current.gain.linearRampToValueAtTime(0, now + fadeTime);
        const osc = oscillatorRef.current;
        setTimeout(() => {
          try { osc?.stop(); } catch (err) {}
        }, fadeTime * 1000);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (steps.length > 0 && currentStep < steps.length) {
        if (isActive && !isFinished) {
          startAudio(steps[currentStep].frequency, steps[currentStep].audioUrl);
        } else {
          stopAudio(0.5);
        }
    }
    return () => stopAudio(0);
  }, [isActive, soundOn, currentStep, steps]);

  useEffect(() => {
    let interval: any;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && isActive) {
      setIsActive(false);
      setIsFinished(true);
      playBeep();
      stopAudio(1);
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  // Sync state with steps change
  useEffect(() => {
      if(steps[currentStep]) {
          setTimer(steps[currentStep].duration);
      }
  }, [currentStep, steps]);

  const handleNext = () => {
    const currentId = Number(steps[currentStep].id);
    const newCompleted = savedProgress ? [...savedProgress, currentId] : [currentId];
    // De-duplicate
    const uniqueCompleted = [...new Set(newCompleted)];
    onSaveProgress(uniqueCompleted);

    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setTimer(steps[next].duration);
      setIsActive(false);
      setIsFinished(false);
    } else {
      const completedCount = steps.length - skippedSteps.length;
      onComplete(completedCount / steps.length);
    }
  };

  const skipStep = () => {
    setSkippedSteps([...skippedSteps, currentStep]);
    setTimer(0);
    setIsActive(false);
    setIsFinished(true);
  };

  const toggleActive = () => {
    if (isFinished || isCompleted) return;
    setIsActive(!isActive);
  };

  if (steps.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 min-h-screen flex flex-col bg-black overflow-y-auto no-scrollbar pb-32">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-xs uppercase tracking-[0.5em] text-[#FF2A2A] mb-1 font-black">INT Module</h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Tactical Stillness</h1>
          {isCompleted && <div className="mt-2 text-[10px] data-font text-[#00FF88] font-bold tracking-widest uppercase">MISSION COMPLETE</div>}
        </div>
        <div className="flex flex-col items-end">
            <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest data-font">Abort</button>
            {!isFinished && !isActive && !isCompleted && (
                <button onClick={skipStep} className="text-gray-700 hover:text-red-600 text-[10px] uppercase tracking-widest data-font mt-2 font-black">Skip Sector</button>
            )}
        </div>
      </header>

      <div className="flex gap-2 mb-12 h-1.5 bg-[#111]">
        {steps.map((_, i) => (
            <div key={i} className={`flex-1 transition-all duration-500 ${i < currentStep ? 'bg-[#00FF88]' : i === currentStep ? 'bg-[#FF2A2A] animate-pulse' : 'bg-transparent'}`} />
        ))}
      </div>

      <div className="flex flex-col items-center flex-grow">
        <div className="flex gap-4 mb-8">
            <button onClick={() => setSoundOn(true)} className={`px-4 py-2 text-[10px] uppercase font-black border tracking-widest ${soundOn ? 'border-[#FF2A2A] text-[#FF2A2A] bg-[#FF2A2A]/10' : 'border-[#222] text-gray-500'}`}>Sound On</button>
            <button onClick={() => setSoundOn(false)} className={`px-4 py-2 text-[10px] uppercase font-black border tracking-widest ${!soundOn ? 'border-[#FF2A2A] text-[#FF2A2A] bg-[#FF2A2A]/10' : 'border-[#222] text-gray-500'}`}>Sound Off</button>
        </div>

        <div 
          onClick={toggleActive}
          className={`w-56 h-56 rounded-full border-2 border-[#111] flex flex-col items-center justify-center relative overflow-hidden mb-10 bg-black cursor-pointer group transition-all ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#FF2A2A]/40'}`}
        >
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="112" cy="112" r="108" fill="transparent" stroke="#111" strokeWidth="4" />
                <circle cx="112" cy="112" r="108" fill="transparent" stroke={isFinished || isCompleted ? "#00FF88" : "#FF2A2A"} strokeWidth="4" strokeDasharray="678.5" strokeDashoffset={678.5 - (678.5 * (timer / steps[currentStep].duration))} className="transition-all duration-1000 ease-linear" />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className="text-6xl font-black data-font text-white group-hover:text-[#FF2A2A] transition-colors">{timer}<span className="text-xl">s</span></span>
              {!isActive && !isFinished && !isCompleted && <span className="text-[8px] uppercase font-bold text-[#FF2A2A] animate-pulse">Touch to Start</span>}
              {isActive && <span className="text-[8px] uppercase font-bold text-gray-600">Active</span>}
              {isCompleted && <span className="text-[8px] uppercase font-bold text-[#00FF88]">Done</span>}
            </div>
        </div>

        <h3 className="text-[#FF2A2A] text-xl font-black tracking-[0.3em] mb-4 uppercase">{steps[currentStep].title}</h3>
        <p className="text-gray-400 max-w-sm text-center mb-8 data-font text-[10px] uppercase tracking-wider leading-relaxed font-bold">{steps[currentStep].desc}</p>
        
        <div className="w-full max-w-sm space-y-4 mb-10">
            <label className="text-[9px] uppercase tracking-widest text-gray-600 data-font block font-bold">Neural Logs / Focus Matrix:</label>
            <textarea 
                value={thoughts[currentStep] || ''}
                disabled={isCompleted}
                onChange={(e) => {
                    const t = [...thoughts];
                    t[currentStep] = e.target.value;
                    setThoughts(t);
                }}
                placeholder="Synchronize thoughts..."
                className="w-full h-32 bg-[#050505] border border-[#222] p-4 text-xs data-font text-white focus:border-[#FF2A2A] outline-none resize-none uppercase disabled:opacity-50"
            />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
            {!isActive && !isFinished && !isCompleted && (
                <button onClick={() => setIsActive(true)} className="w-full bg-[#FF2A2A] text-black font-black py-5 uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(255,42,42,0.4)]">Initialize Sequence</button>
            )}
            {isFinished && (
                <button onClick={handleNext} className="w-full bg-[#00FF88] text-black font-black py-5 uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(0,255,136,0.3)]">{currentStep === steps.length - 1 ? 'Upload Neural Data' : 'Next Phase'}</button>
            )}
            {isActive && (
                <button onClick={() => setIsActive(false)} className="w-full border border-[#222] text-gray-500 py-3 text-[10px] uppercase font-black tracking-widest">Pause Extraction</button>
            )}
            {isCompleted && (
                 <button disabled className="w-full bg-[#00FF88] text-black font-black py-5 uppercase tracking-[0.3em] cursor-not-allowed">Protocol Finished</button>
            )}
        </div>
      </div>
    </div>
  );
}
