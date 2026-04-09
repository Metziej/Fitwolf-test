
import React, { useEffect, useState } from 'react';

interface XPPopupProps {
  amount: number;
  type: 'STR' | 'VIT' | 'INT';
  onDone: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  STR: '#FF2A2A',
  VIT: '#00FF88',
  INT: '#7EC8E3',
};

const TYPE_ICON: Record<string, string> = {
  STR: '⚔️',
  VIT: '🍖',
  INT: '🧠',
};

export default function XPPopup({ amount, type, onDone }: XPPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Haptic feedback indien ondersteund
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 80]);
    }

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const color = TYPE_COLOR[type] || '#FF2A2A';

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Particle bursts */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            animation: `particle-${i % 4} 1.2s ease-out forwards`,
            animationDelay: `${i * 0.05}s`,
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}

      {/* Main XP Badge */}
      <div
        style={{
          color,
          border: `2px solid ${color}`,
          boxShadow: `0 0 30px ${color}66, 0 0 60px ${color}33`,
          animation: visible
            ? 'xpFloat 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : 'xpFadeOut 0.4s ease-in forwards',
        }}
        className="bg-black/90 px-8 py-5 font-black uppercase tracking-[0.3em] text-center select-none"
      >
        <div className="text-3xl mb-1">{TYPE_ICON[type]}</div>
        <div className="text-4xl leading-none" style={{ textShadow: `0 0 20px ${color}` }}>
          +{amount} XP
        </div>
        <div className="text-[10px] mt-2 opacity-70">{type} MODULE COMPLETE</div>
      </div>

      <style>{`
        @keyframes xpFloat {
          0%   { opacity: 0; transform: scale(0.5) translateY(40px); }
          30%  { opacity: 1; transform: scale(1.1) translateY(-10px); }
          60%  { opacity: 1; transform: scale(1) translateY(0); }
          85%  { opacity: 1; transform: scale(1) translateY(-5px); }
          100% { opacity: 0; transform: scale(0.9) translateY(-30px); }
        }
        @keyframes xpFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes particle-0 {
          0%   { opacity: 1; transform: rotate(0deg)   translate(0, 0); }
          100% { opacity: 0; transform: rotate(0deg)   translate(0, -80px); }
        }
        @keyframes particle-1 {
          0%   { opacity: 1; transform: rotate(90deg)  translate(0, 0); }
          100% { opacity: 0; transform: rotate(90deg)  translate(0, -80px); }
        }
        @keyframes particle-2 {
          0%   { opacity: 1; transform: rotate(180deg) translate(0, 0); }
          100% { opacity: 0; transform: rotate(180deg) translate(0, -80px); }
        }
        @keyframes particle-3 {
          0%   { opacity: 1; transform: rotate(270deg) translate(0, 0); }
          100% { opacity: 0; transform: rotate(270deg) translate(0, -80px); }
        }
      `}</style>
    </div>
  );
}
