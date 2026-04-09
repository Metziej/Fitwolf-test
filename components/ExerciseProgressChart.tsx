
import React, { useMemo, useState } from 'react';
import { BattleLogEntry } from '../types';

interface DataPoint {
  date: string; // "YYYY-MM-DD"
  weight: number;
  reps: number;
  volume: number; // weight × reps
}

interface ExerciseProgressChartProps {
  history: BattleLogEntry[];
  onBack?: () => void;
}

function extractExerciseData(history: BattleLogEntry[], exerciseName: string): DataPoint[] {
  const points: DataPoint[] = [];

  for (const entry of history) {
    if (entry.type !== 'STR') continue;
    const details = entry.details;
    if (!details?.exercises) continue;

    const match = details.exercises.find(
      (ex: any) =>
        typeof ex.name === 'string' &&
        ex.name.toLowerCase() === exerciseName.toLowerCase() &&
        ex.weight > 0
    );

    if (match) {
      points.push({
        date: entry.date.slice(0, 10),
        weight: Number(match.weight) || 0,
        reps: Number(match.repsFilled) || Number(match.reps) || 0,
        volume: (Number(match.weight) || 0) * (Number(match.repsFilled) || 0),
      });
    }
  }

  // Sort ascending by date, deduplicate (keep highest weight per day)
  const byDate: Record<string, DataPoint> = {};
  for (const p of points) {
    if (!byDate[p.date] || p.weight > byDate[p.date].weight) {
      byDate[p.date] = p;
    }
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

function getExerciseNames(history: BattleLogEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of history) {
    if (entry.type !== 'STR') continue;
    const details = entry.details;
    if (!details?.exercises) continue;
    for (const ex of details.exercises) {
      if (typeof ex.name === 'string' && ex.weight > 0) {
        names.add(ex.name);
      }
    }
  }
  return Array.from(names).sort();
}

type MetricKey = 'weight' | 'reps' | 'volume';

const METRIC_LABELS: Record<MetricKey, string> = {
  weight: 'Gewicht (kg)',
  reps: 'Reps',
  volume: 'Volume (kg×reps)',
};

export default function ExerciseProgressChart({ history, onBack }: ExerciseProgressChartProps) {
  const exerciseNames = useMemo(() => getExerciseNames(history), [history]);
  const [selected, setSelected] = useState<string>(exerciseNames[0] || '');
  const [metric, setMetric] = useState<MetricKey>('weight');

  const data = useMemo(() => extractExerciseData(history, selected), [history, selected]);

  // Find PR
  const prValue = data.length > 0 ? Math.max(...data.map(d => d[metric])) : 0;
  const minValue = data.length > 0 ? Math.min(...data.map(d => d[metric])) : 0;
  const range = prValue - minValue || 1;

  // Chart dimensions (SVG-like using CSS)
  const CHART_HEIGHT = 120; // px

  const latestEntry = data[data.length - 1];
  const firstEntry = data[0];
  const improvement =
    latestEntry && firstEntry && firstEntry[metric] > 0
      ? (((latestEntry[metric] - firstEntry[metric]) / firstEntry[metric]) * 100).toFixed(1)
      : null;

  if (exerciseNames.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-4 pt-10 pb-32">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.4em] font-black mb-1">Progressie</p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Oefening Grafieken</h1>
          </div>
          {onBack && (
            <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest">← Terug</button>
          )}
        </header>
        <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest py-16">
          Log eerst workouts om progressie te zien.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 pt-10 pb-32">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <p className="text-[9px] text-[#FF2A2A] uppercase tracking-[0.4em] font-black mb-1">Progressie</p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Oefening Grafieken</h1>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest">← Terug</button>
        )}
      </header>

      {/* Exercise selector */}
      <div className="mb-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Oefening</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-[#111] border border-[#222] text-white text-[10px] uppercase font-black p-3 outline-none focus:border-[#FF2A2A] appearance-none"
        >
          {exerciseNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Metric tabs */}
      <div className="flex border-b border-[#222] mb-6">
        {(Object.keys(METRIC_LABELS) as MetricKey[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 py-2.5 text-[8px] uppercase font-black tracking-widest transition-all ${
              metric === m ? 'text-[#FF2A2A] border-b-2 border-[#FF2A2A]' : 'text-gray-600'
            }`}
          >
            {m === 'weight' ? 'Gewicht' : m === 'reps' ? 'Reps' : 'Volume'}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest py-10">
          Geen data voor "{selected}".
        </p>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-[#222] p-3 text-center">
              <p className="text-lg font-black text-[#FF2A2A]">{prValue}</p>
              <p className="text-[8px] text-gray-600 uppercase">PR</p>
            </div>
            <div className="border border-[#222] p-3 text-center">
              <p className="text-lg font-black text-white">{latestEntry?.[metric] ?? '—'}</p>
              <p className="text-[8px] text-gray-600 uppercase">Laatste</p>
            </div>
            <div className="border border-[#222] p-3 text-center">
              <p className={`text-lg font-black ${improvement && Number(improvement) >= 0 ? 'text-[#00FF88]' : 'text-[#FF2A2A]'}`}>
                {improvement !== null ? `${Number(improvement) >= 0 ? '+' : ''}${improvement}%` : '—'}
              </p>
              <p className="text-[8px] text-gray-600 uppercase">Totaal</p>
            </div>
          </div>

          {/* Chart */}
          <div className="border border-[#222] bg-[#0A0A0A] p-4 mb-4">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">{METRIC_LABELS[metric]}</p>
            <div className="relative" style={{ height: CHART_HEIGHT + 'px' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <div
                  key={fraction}
                  className="absolute left-0 right-0 border-t border-[#1A1A1A]"
                  style={{ top: `${(1 - fraction) * CHART_HEIGHT}px` }}
                />
              ))}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-0.5">
                {data.map((point, i) => {
                  const heightPct = range > 0 ? ((point[metric] - minValue) / range) * 85 + 5 : 50;
                  const isPR = point[metric] === prValue;
                  const isLatest = i === data.length - 1;
                  return (
                    <div
                      key={point.date}
                      className="flex-1 relative group"
                      style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
                    >
                      <div
                        className="w-full transition-all duration-200"
                        style={{
                          height: `${heightPct}%`,
                          background: isPR
                            ? '#FF2A2A'
                            : isLatest
                            ? '#FF2A2A80'
                            : '#333',
                          boxShadow: isPR ? '0 0 6px #FF2A2A60' : undefined,
                        }}
                      />
                      {/* Tooltip on hover */}
                      <div
                        className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#111] border border-[#333] px-2 py-1 text-[8px] text-white font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                      >
                        {point.date.slice(5)}<br />{point[metric]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels (first, middle, last) */}
            <div className="flex justify-between mt-2">
              <span className="text-[7px] text-gray-700">{data[0]?.date.slice(5)}</span>
              {data.length > 2 && (
                <span className="text-[7px] text-gray-700">{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
              )}
              <span className="text-[7px] text-gray-700">{data[data.length - 1]?.date.slice(5)}</span>
            </div>
          </div>

          {/* Data table (last 8 sessions) */}
          <div className="border border-[#222]">
            <div className="grid grid-cols-4 border-b border-[#222] px-3 py-2">
              <span className="text-[8px] text-gray-600 uppercase">Datum</span>
              <span className="text-[8px] text-gray-600 uppercase text-right">Gewicht</span>
              <span className="text-[8px] text-gray-600 uppercase text-right">Reps</span>
              <span className="text-[8px] text-gray-600 uppercase text-right">Volume</span>
            </div>
            {[...data].reverse().slice(0, 8).map((point) => {
              const isCurrentPR = point[metric] === prValue;
              return (
                <div
                  key={point.date}
                  className="grid grid-cols-4 px-3 py-2.5 border-b border-[#111] last:border-0"
                  style={{ background: isCurrentPR ? '#FF2A2A08' : undefined }}
                >
                  <span className="text-[9px] text-gray-400">{point.date.slice(5)}</span>
                  <span className={`text-[9px] font-black text-right ${isCurrentPR && metric === 'weight' ? 'text-[#FF2A2A]' : 'text-white'}`}>
                    {point.weight}kg
                    {metric === 'weight' && isCurrentPR && ' 🔥'}
                  </span>
                  <span className="text-[9px] text-gray-400 text-right">{point.reps}</span>
                  <span className={`text-[9px] font-black text-right ${isCurrentPR && metric === 'volume' ? 'text-[#FF2A2A]' : 'text-gray-400'}`}>
                    {point.volume}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
