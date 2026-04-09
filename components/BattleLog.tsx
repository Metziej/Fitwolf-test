
import React, { useState } from 'react';
import { BattleLogEntry } from '../types.ts';

interface BattleLogProps {
  history: BattleLogEntry[];
  onBack: () => void;
}

export default function BattleLog({ history, onBack }: BattleLogProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    if (day > 0 && day <= daysInMonth) return day;
    return null;
  });

  const hasEntryOnDate = (day: number) => {
    const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toLocaleDateString();
    return history.some(entry => {
        const entryDate = new Date(entry.date).toLocaleDateString();
        return entryDate === dateStr;
    });
  };

  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-24">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">BATTLE LOGS</h1>
          <p className="data-font text-[10px] text-gray-500 uppercase tracking-[0.2em]">Deployment History</p>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest data-font">Return</button>
      </header>

      {/* Deployment Calendar */}
      <section className="bg-[#0a0a0a] border border-[#222] p-6 mb-10">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="text-gray-500 hover:text-[#FF2A2A] text-lg">◄</button>
            <h2 className="font-black tracking-widest text-[#FF2A2A] uppercase">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h2>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="text-gray-500 hover:text-[#FF2A2A] text-lg">►</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[8px] text-gray-600 font-bold">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
                <div key={i} className={`aspect-square flex items-center justify-center border ${day ? 'border-[#222]' : 'border-transparent'} relative group`}>
                    {day && (
                        <>
                            <span className={`text-[10px] data-font ${hasEntryOnDate(day) ? 'text-white font-bold' : 'text-gray-700'}`}>{day}</span>
                            {hasEntryOnDate(day) && (
                                <div className="absolute inset-0 bg-[#FF2A2A]/5 animate-pulse"></div>
                            )}
                        </>
                    )}
                </div>
            ))}
        </div>
      </section>

      <div className="space-y-6">
        <h3 className="text-[10px] uppercase tracking-[0.5em] text-gray-500 border-b border-[#222] pb-2">Recent Deployments</h3>
        {history.length === 0 ? (
          <div className="border border-[#222] p-12 text-center text-gray-600 uppercase tracking-widest text-xs data-font">No System Data Found</div>
        ) : (
          [...history].reverse().slice(0, 10).map((entry) => (
            <div key={entry.id} className="border border-[#222] bg-[#0a0a0a] p-6">
              <div className="flex justify-between items-start border-b border-[#222] pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-bold px-2 py-0.5 border ${entry.type === 'STR' ? 'border-[#FF2A2A] text-[#FF2A2A]' : entry.type === 'VIT' ? 'border-[#00FF88] text-[#00FF88]' : 'border-white text-white'}`}>{entry.type}</span>
                    <h3 className="font-bold text-white uppercase tracking-wider">{entry.title}</h3>
                  </div>
                  <div className="text-[10px] text-gray-500 data-font uppercase">{entry.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#00FF88] font-bold data-font">+{entry.xpEarned} XP</div>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {entry.type === 'STR' && Array.isArray(entry.details) ? (
                  <div className="space-y-1">
                    {entry.details.map((ex: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="uppercase">{ex.name}</span>
                        <span className="data-font">{ex.weight}kg x {ex.reps} reps</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="data-font lowercase opacity-60 italic">{typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details).replace(/"/g, '')}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
