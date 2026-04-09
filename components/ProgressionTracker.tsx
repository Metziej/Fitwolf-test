
import React, { useState, useMemo } from 'react';
import { BattleLogEntry, UnitSystem } from '../types.ts';

interface ProgressionTrackerProps {
  history: BattleLogEntry[];
  unitSystem: UnitSystem;
  onBack: () => void;
}

type TimeFrame = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export default function ProgressionTracker({ history, unitSystem, onBack }: ProgressionTrackerProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAYS');

  const stats = useMemo(() => {
    // Basic grouping logic for volume / sessions
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Grouping strategy based on timeframe (Simplified for demo purposes)
    const groups: Record<string, number> = {};
    
    sortedHistory.forEach(entry => {
        const date = new Date(entry.date);
        let key = "";
        if (timeFrame === 'DAYS') key = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
        else if (timeFrame === 'WEEKS') {
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const week = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
            key = `W${week}`;
        }
        else if (timeFrame === 'MONTHS') key = date.toLocaleDateString(undefined, { month: 'short' });
        else key = date.getFullYear().toString();

        let value = 0;
        if (entry.type === 'STR' && Array.isArray(entry.details)) {
            value = entry.details.reduce((acc: number, curr: any) => acc + (curr.weight * curr.reps), 0);
        } else {
            value = 100; // Count other sessions as fixed tactical value
        }
        groups[key] = (groups[key] || 0) + value;
    });

    return Object.entries(groups).slice(-10); // Show last 10 points
  }, [history, timeFrame]);

  const maxVal = Math.max(...stats.map(s => s[1]), 1);

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Evolution</h1>
          <p className="data-font text-[10px] text-gray-500 uppercase tracking-[0.2em]">Tactical Data Aggregation</p>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest data-font">Return</button>
      </header>

      <div className="grid grid-cols-4 gap-2 mb-12">
        {(['DAYS', 'WEEKS', 'MONTHS', 'YEARS'] as TimeFrame[]).map(tf => (
            <button 
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`py-2 text-[10px] border font-bold tracking-widest uppercase transition-all ${timeFrame === tf ? 'bg-[#FF2A2A] border-[#FF2A2A] text-black shadow-[0_0_15px_rgba(255,42,42,0.3)]' : 'border-[#222] text-gray-500'}`}
            >
                {tf}
            </button>
        ))}
      </div>

      <section className="bg-[#0a0a0a] border border-[#222] p-8 relative min-h-[300px] flex flex-col justify-end">
        <div className="absolute top-4 left-6 text-[10px] uppercase tracking-widest text-gray-700 data-font">Volume Intensity Matrix</div>
        
        <div className="flex items-end justify-between h-48 gap-2 mb-4">
            {stats.length === 0 ? (
                <div className="w-full text-center text-[10px] text-gray-700 uppercase tracking-widest pb-12">Insufficient Tactical Data</div>
            ) : stats.map(([label, val], i) => (
                <div key={i} className="flex-grow flex flex-col items-center group">
                    <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] data-font text-[#FF2A2A]">{Math.round(val)}</div>
                    <div 
                        className="w-full bg-[#111] border-x border-[#222] group-hover:bg-[#FF2A2A] group-hover:shadow-[0_0_20px_rgba(255,42,42,0.5)] transition-all duration-500 relative"
                        style={{ height: `${(val / maxVal) * 100}%`, minHeight: '2px' }}
                    >
                        <div className="absolute top-0 left-0 w-full h-px bg-white/20"></div>
                    </div>
                    <div className="mt-3 text-[8px] text-gray-600 data-font rotate-45 md:rotate-0">{label}</div>
                </div>
            ))}
        </div>

        <div className="mt-12 grid grid-cols-3 border-t border-[#222] pt-6">
            <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase data-font">Deployments</div>
                <div className="text-2xl font-black text-white">{history.length}</div>
            </div>
            <div className="text-center border-x border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase data-font">Best Volume</div>
                <div className="text-2xl font-black text-[#00FF88]">{maxVal > 100 ? Math.round(maxVal) : 'N/A'}</div>
            </div>
            <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase data-font">Efficiency</div>
                <div className="text-2xl font-black text-white">{Math.min(100, history.length * 2)}%</div>
            </div>
        </div>
      </section>

      <footer className="mt-12 opacity-30 flex justify-center">
          <div className="text-[10px] uppercase tracking-[0.5em] data-font animate-pulse">Scanning Future Trajectory...</div>
      </footer>
    </div>
  );
}
