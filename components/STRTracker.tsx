
import React, { useState, useEffect, useMemo } from 'react';
import { WorkoutSession, BattleLogEntry, UnitSystem, Exercise } from '../types.ts';
import RankGate from './RankGate.tsx';

interface STRTrackerProps {
  currentWorkout: any;
  history: BattleLogEntry[];
  unitSystem: UnitSystem;
  currentXp?: number;
  onBack: () => void;
  onComplete: (session: WorkoutSession, completionRate: number) => void;
  onSaveProgress: (workoutId: string, exercises: Exercise[]) => void;
  savedProgress?: { workoutId: string, exercises: Exercise[] };
  savedRoutineOrder?: string[];
  onSaveOrder: (title: string, order: string[]) => void;
  isCompleted?: boolean;
}

// Haal de laatste sessie-data op voor een oefening uit de history
function getLastSessionData(exerciseName: string, history: BattleLogEntry[]): { weight: number; reps: number } | null {
  // Doorzoek history omgekeerd (meest recent eerst)
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.type !== 'STR' || !entry.details) continue;
    const exercises: Exercise[] = Array.isArray(entry.details) ? entry.details : [];
    const match = exercises.find(
      (e: Exercise) => e.name?.toLowerCase() === exerciseName.toLowerCase() && (e.weight || 0) > 0
    );
    if (match) {
      return { weight: match.weight || 0, reps: match.repsFilled || 0 };
    }
  }
  return null;
}

// Haal het persoonlijk record op voor een oefening
function getPersonalRecord(exerciseName: string, history: BattleLogEntry[]): number {
  let maxWeight = 0;
  for (const entry of history) {
    if (entry.type !== 'STR' || !entry.details) continue;
    const exercises: Exercise[] = Array.isArray(entry.details) ? entry.details : [];
    const match = exercises.find(
      (e: Exercise) => e.name?.toLowerCase() === exerciseName.toLowerCase()
    );
    if (match && (match.weight || 0) > maxWeight) {
      maxWeight = match.weight || 0;
    }
  }
  return maxWeight;
}

export default function STRTracker({ currentWorkout, history, unitSystem, currentXp = 0, onBack, onComplete, onSaveProgress, savedProgress, savedRoutineOrder, onSaveOrder, isCompleted }: STRTrackerProps) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const initializedRef = React.useRef(false);

  // Precompute last session data en PRs voor alle oefeningen
  const lastSessionMap = useMemo(() => {
    const map: Record<string, { weight: number; reps: number } | null> = {};
    if (currentWorkout?.exercises) {
      for (const ex of currentWorkout.exercises) {
        map[ex.name] = getLastSessionData(ex.name, history);
      }
    }
    return map;
  }, [currentWorkout?.id, history.length]);

  const prMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (currentWorkout?.exercises) {
      for (const ex of currentWorkout.exercises) {
        map[ex.name] = getPersonalRecord(ex.name, history);
      }
    }
    return map;
  }, [currentWorkout?.id, history.length]);

  useEffect(() => {
    if (isCompleted && savedProgress?.exercises) {
        setExercises(savedProgress.exercises);
        return;
    }

    if (!initializedRef.current && savedProgress && savedProgress.exercises.length > 0 && savedProgress.workoutId === currentWorkout?.id) {
        setExercises(savedProgress.exercises);
        initializedRef.current = true;
    } else if (!initializedRef.current && currentWorkout) {
        let initialList = [...currentWorkout.exercises];
        if (savedRoutineOrder) {
            const orderMap = new Map(savedRoutineOrder.map((name, i) => [name, i]));
            initialList.sort((a, b) => (orderMap.get(a.name) ?? 999) - (orderMap.get(b.name) ?? 999));
        }
        setExercises(initialList.map(ex => ({ ...ex, weight: 0, repsFilled: 0, completed: false })));
        initializedRef.current = true;
    }
  }, [currentWorkout?.id, isCompleted, savedProgress]);

  // Auto-save logic with debounce
  useEffect(() => {
      if (isCompleted || exercises.length === 0) return;

      const timer = setTimeout(() => {
          onSaveProgress(currentWorkout?.id || "custom", exercises);
      }, 1500); // 1.5s debounce to prevent Firestore spam

      return () => clearTimeout(timer);
  }, [exercises, isCompleted, currentWorkout?.id]);

  const handleUpdate = (idx: number, field: string, value: number) => {
    if (isCompleted) return;
    setExercises(prev => {
      const newList = [...prev];
      const updatedItem = { ...newList[idx], [field]: Math.max(0, value) };
      updatedItem.completed = updatedItem.repsFilled > 0; // Allow weight to be 0 for bodyweight
      newList[idx] = updatedItem;
      return newList;
    });
  };

  const onDragStart = (idx: number) => {
    if (isCompleted) return;
    setDraggedIdx(idx);
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx || isCompleted) return;
    
    const newList = [...exercises];
    const item = newList[draggedIdx];
    newList.splice(draggedIdx, 1);
    newList.splice(idx, 0, item);
    setDraggedIdx(idx);
    setExercises(newList);
  };

  const onDragEnd = () => {
    setDraggedIdx(null);
    onSaveOrder(currentWorkout.title, exercises.map(e => e.name));
  };

  const completedCount = exercises.filter(ex => ex.completed).length;
  const progressPercent = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;
  const isAllCompleted = exercises.length > 0 && completedCount === exercises.length;
  const weightLabel = unitSystem === UnitSystem.METRIC ? 'KG' : 'LBS';

  const handleSave = () => {
      onSaveProgress(currentWorkout?.id || "custom", exercises);
      onBack();
  };

  const handleFinish = (force: boolean = false) => {
      onSaveProgress(currentWorkout?.id || "custom", exercises);
      if (force) {
          // Manual override without confirm for iframe compatibility
          const session: WorkoutSession = {
              id: Date.now().toString(),
              workoutId: currentWorkout?.id || "custom",
              title: currentWorkout?.title || "Custom Strike",
              exercises: exercises,
              date: new Date().toISOString()
          };
          onComplete(session, progressPercent);
          return;
      }
      
      onComplete({
          id: Date.now().toString(),
          title: currentWorkout.title,
          exercises: exercises,
          date: new Date().toLocaleDateString(),
          xpEarned: 100,
          unitSystem: unitSystem
      }, completedCount / (exercises.length || 1));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-32 overflow-y-auto no-scrollbar">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-xs uppercase tracking-[0.5em] text-[#FF2A2A] mb-1">STR Module</h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{currentWorkout?.title || 'Unknown Protocol'}</h1>
          <div className="mt-2 text-[10px] data-font text-[#FF2A2A] font-bold tracking-widest uppercase">Target Engagement: {isCompleted ? '100% (LOCKED)' : `${progressPercent}%`}</div>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest data-font">Abort</button>
      </header>

      <div className="space-y-4 mb-8">
        {exercises.map((ex, idx) => (
          <div 
            key={`${ex.name}-${idx}`}
            draggable={!isCompleted}
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
            className={`border brushed-metal p-4 relative transition-all ${!isCompleted ? 'cursor-move' : ''} ${draggedIdx === idx ? 'opacity-40 scale-95 border-[#FF2A2A]' : ex.completed ? 'border-[#00FF88]' : 'border-[#222]'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-grow">
                <h3 className={`font-bold text-sm uppercase ${ex.completed ? 'text-[#00FF88]' : 'text-white'}`}>{ex.name}</h3>
                <p className="text-[9px] text-[#FF2A2A] uppercase data-font opacity-60 tracking-widest">{ex.reps || 'Standard Engagement'}</p>
              </div>
              <div className="flex items-center gap-3">
                  {ex.videoUrl && (
                      <button onClick={() => setActiveVideo(ex.videoUrl)} className="text-[9px] bg-[#222] hover:bg-[#FF2A2A] hover:text-black text-white px-2 py-1 uppercase font-black tracking-widest transition-colors">
                          ▶ Visual
                      </button>
                  )}
                  <div className="flex flex-col items-center justify-center opacity-30">
                    <div className="w-5 h-0.5 bg-white mb-1 rounded-full"></div>
                    <div className="w-5 h-0.5 bg-white mb-1 rounded-full"></div>
                    <div className="w-5 h-0.5 bg-white rounded-full"></div>
                  </div>
              </div>
            </div>

            {/* Last Time referentie */}
            {lastSessionMap[ex.name] && (
              <div className="mb-3 text-[9px] text-gray-500 data-font uppercase tracking-widest border-l-2 border-[#333] pl-2">
                Vorige sessie: <span className="text-gray-400 font-bold">{lastSessionMap[ex.name]!.weight}{weightLabel} × {lastSessionMap[ex.name]!.reps} reps</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] uppercase tracking-widest text-gray-500 data-font font-bold">{weightLabel}</label>
                  {/* PR Badge: verschijnt als huidig gewicht hoger is dan ooit */}
                  {!isCompleted && ex.weight > 0 && prMap[ex.name] !== undefined && ex.weight > prMap[ex.name] && (
                    <span className="text-[8px] bg-[#00FF88] text-black font-black px-2 py-0.5 uppercase tracking-widest animate-pulse">
                      🔥 PR!
                    </span>
                  )}
                </div>
                <input
                  type="number" value={ex.weight || ''}
                  disabled={isCompleted}
                  onChange={(e) => handleUpdate(idx, 'weight', Number(e.target.value))}
                  className={`w-full bg-black border p-3 text-white data-font focus:border-[#FF2A2A] outline-none text-xl disabled:opacity-50 ${
                    !isCompleted && ex.weight > 0 && ex.weight > (prMap[ex.name] || 0)
                      ? 'border-[#00FF88] shadow-[0_0_8px_#00FF8866]'
                      : 'border-[#222]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-widest text-gray-500 data-font font-bold">REPS</label>
                <input
                  type="number" value={ex.repsFilled || ''}
                  disabled={isCompleted}
                  onChange={(e) => handleUpdate(idx, 'repsFilled', Number(e.target.value))}
                  className="w-full bg-black border border-[#222] p-3 text-white data-font focus:border-[#FF2A2A] outline-none text-xl disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        ))}

        {!isCompleted && (
            <button
                onClick={() => setShowAddCustom(true)}
                className="w-full border-2 border-dashed border-[#222] p-4 text-[10px] uppercase tracking-[0.5em] text-gray-600 hover:border-[#FF2A2A] hover:text-[#FF2A2A] transition-all font-black"
            >
                + Inject Custom Engagement
            </button>
        )}

        {/* ── Rank-Locked Features ─────────────────────────────────────── */}
        <div className="mt-6 space-y-3">
          <h3 className="text-[9px] uppercase tracking-[0.4em] text-gray-600 font-black border-l-2 border-gray-800 pl-2">
            Advanced Protocols
          </h3>
          <RankGate requiredRank="B" currentXp={currentXp} featureName="Advanced Heavy Duty Protocollen">
            <div className="border border-[#9B59B6]/40 bg-[#9B59B6]/5 p-4">
              <h4 className="text-xs font-black text-[#9B59B6] uppercase tracking-widest mb-1">
                ⚡ Heavy Duty Intensification
              </h4>
              <p className="text-[9px] text-gray-500">Rest-Pause, Drop Sets, Forced Reps — Mentzer protocol voor gevorderden.</p>
            </div>
          </RankGate>
          <RankGate requiredRank="A" currentXp={currentXp} featureName="Custom Workout Builder">
            <div className="border border-[#FFB800]/40 bg-[#FFB800]/5 p-4">
              <h4 className="text-xs font-black text-[#FFB800] uppercase tracking-widest mb-1">
                🛠️ Custom Workout Builder
              </h4>
              <p className="text-[9px] text-gray-500">Bouw je eigen trainingsschema van scratch.</p>
            </div>
          </RankGate>
        </div>

        <div className="flex flex-col gap-3 mt-6">
            {!isCompleted && (
                <>
                    <button 
                        onClick={() => {
                            if (isAllCompleted) {
                                handleFinish();
                            } else {
                                handleSave();
                            }
                        }}
                        className={`w-full py-5 font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center ${
                            isAllCompleted 
                            ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.4)]' 
                            : 'bg-[#FF2A2A] text-black shadow-[0_0_20px_rgba(255,42,42,0.4)]'
                        }`}
                    >
                        {isAllCompleted ? 'FINISH & CLAIM XP' : 'SAVE PROGRESS'}
                    </button>
                    
                    {!isAllCompleted && (
                        <button 
                            onClick={() => handleFinish(true)}
                            className="w-full py-3 text-[10px] uppercase font-black text-gray-600 hover:text-[#FF2A2A] tracking-widest"
                        >
                            Force End Session
                        </button>
                    )}
                </>
            )}

            {isCompleted && (
                <button disabled className="w-full py-5 bg-[#00FF88] text-black font-black uppercase tracking-[0.5em] cursor-not-allowed">
                    MISSION ACCOMPLISHED
                </button>
            )}
        </div>
      </div>

      {showAddCustom && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
              <div className="w-full max-w-md border-2 border-[#FF2A2A] bg-black p-8 shadow-[0_0_50px_rgba(255,42,42,0.3)]">
                  <h2 className="text-xl font-black mb-6 uppercase tracking-widest text-[#FF2A2A]">New Tactical Move</h2>
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Exercise Name" className="w-full bg-[#111] border border-[#222] p-4 text-white mb-6 uppercase data-font outline-none focus:border-[#FF2A2A]" />
                  <div className="flex gap-4">
                    <button onClick={() => setShowAddCustom(false)} className="flex-1 border border-gray-700 py-4 uppercase text-[10px] font-black tracking-widest text-gray-500">Cancel</button>
                    <button 
                      onClick={() => {
                          if (!customName) return;
                          setExercises(prev => [...prev, { name: customName.toUpperCase(), weight: 0, repsFilled: 0, completed: false, isCustom: true }]);
                          setCustomName(''); setShowAddCustom(false);
                      }}
                      className="flex-1 bg-white text-black font-black py-4 uppercase tracking-widest text-[10px]"
                    >Inject</button>
                  </div>
              </div>
          </div>
      )}

      {activeVideo && (
         <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
             <div className="w-full max-w-3xl aspect-video relative border border-[#FF2A2A]">
                 <button onClick={() => setActiveVideo(null)} className="absolute -top-10 right-0 text-white font-black uppercase text-xs">Close Feed [X]</button>
                 <iframe src={activeVideo} className="w-full h-full" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
             </div>
         </div>
      )}
    </div>
  );
}
