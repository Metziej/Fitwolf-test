
import React, { useState } from 'react';
import { GlobalSystemData, UserProfile, UserRole, Goal, Product, DiscountCode, RaidOrder, Program, AccessTier, ProgramWeek, ProgramDay, RaidFrequency, MealBlueprint, MindsetStep, WorkoutSession } from '../types.ts';

interface SystemArchitectProps {
  globalData: GlobalSystemData;
  users: UserProfile[];
  onUpdate: (data: GlobalSystemData) => void;
  onUpdateUser: (userId: string, data: any) => void;
  onMasquerade: (userId: string) => void;
  onBack: () => void;
}

export default function SystemArchitect({ globalData, users, onUpdate, onUpdateUser, onMasquerade, onBack }: SystemArchitectProps) {
  const [activeTab, setActiveTab] = useState<'tiers' | 'users' | 'protocols' | 'shop' | 'guild'>('users');
  const [protocolSubTab, setProtocolSubTab] = useState<'SCHEDULE' | 'WORKOUT_LIB' | 'NUTRITION_LIB' | 'MINDSET_LIB'>('SCHEDULE');
  const [editData, setEditData] = useState<GlobalSystemData>(globalData);
  
  // STR Editor State
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editingDay, setEditingDay] = useState<{ weekIdx: number, dayIdx: number, day: ProgramDay } | null>(null);

  // Shop State
  const [customCategory, setCustomCategory] = useState("");

  const saveGlobalChanges = () => {
    onUpdate(editData);
    alert("SYSTEM OVERRIDE SUCCESSFUL.");
  };

  const createNewProgram = () => {
    const newProg: Program = {
        id: Date.now().toString(),
        title: "NEW PROTOCOL",
        description: "UNCLASSIFIED",
        tierId: editData.accessTiers[0]?.id || "free",
        isActive: true,
        weeks: [{ weekNumber: 1, days: Array.from({length: 7}, (_, i) => ({
            dayNumber: i + 1,
            title: `Day ${i + 1}`,
            workoutId: "",
            nutritionId: "",
            mindsetId: "",
            isRestDay: false
        })) }]
    };
    setEditData({...editData, programs: [...(editData.programs || []), newProg]});
    setEditingProgram(newProg);
  };
  const updateProgram = (updated: Program) => {
      const newProgs = (editData.programs || []).map(p => p.id === updated.id ? updated : p);
      setEditData({...editData, programs: newProgs});
      setEditingProgram(updated);
  };
  const updateTier = (index: number, field: string, value: any) => {
      const newTiers = [...(editData.accessTiers || [])];
      newTiers[index] = { ...newTiers[index], [field]: value };
      setEditData({...editData, accessTiers: newTiers});
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pt-12 pb-32 animate-fade-in bg-black min-h-screen">
      <header className="mb-10 flex justify-between items-start border-b border-[#FFB800]/40 pb-6">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.5em] text-[#FFB800] font-bold">System Architect Access</h2>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">COMMAND & CONTROL</h1>
        </div>
        <button onClick={onBack} className="text-[#FFB800] hover:text-white text-xs uppercase tracking-widest font-black border border-[#FFB800]/40 px-4 py-2">Exit Admin</button>
      </header>

      <nav className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {(['users', 'protocols', 'tiers', 'shop', 'guild'] as const).map(tab => (
          <button 
            key={tab} onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-3 px-6 text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#FFB800] text-black border-[#FFB800]' : 'border-gray-800 text-gray-500 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="space-y-8">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="space-y-4 animate-fade-in">
                {users.map((u, i) => (
                    <div key={u.id || i} className="bg-[#050505] border border-[#1a1a1a] p-4 flex justify-between items-center group hover:border-[#FFB800]/50 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-black border border-gray-800 flex items-center justify-center font-black text-xs text-white">{u.username.substring(0, 2)}</div>
                            <div>
                                <h4 className="text-xs font-black uppercase text-white">{u.username}</h4>
                                <p className="text-[9px] text-gray-500 uppercase font-bold">{u.email} // Tier: {editData.accessTiers?.find(t => t.id === u.tierId)?.name || 'UNKNOWN'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <select 
                                value={u.tierId}
                                onChange={(e) => onUpdateUser(u.id, { tierId: e.target.value })}
                                className="bg-black border border-gray-800 text-[8px] text-[#FFB800] p-1 uppercase"
                             >
                                {(editData.accessTiers || []).map((t, i) => (
                                    <option key={t.id || i} value={t.id}>{t.name}</option>
                                ))}
                             </select>
                            <button onClick={() => onMasquerade(u.id)} className="text-[8px] font-black uppercase bg-[#FFB800] text-black px-3 py-1.5 hover:bg-white transition-all">Inspect</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* TIERS TAB */}
        {activeTab === 'tiers' && (
            <div className="space-y-6 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(editData.accessTiers || []).map((tier, i) => (
                        <div key={tier.id || i} className="bg-[#0a0a0a] border p-6" style={{ borderColor: tier.color }}>
                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                                <h3 className="font-black uppercase text-white">{tier.name}</h3>
                                <input type="color" value={tier.color} onChange={e => updateTier(i, 'color', e.target.value)} className="w-6 h-6 bg-transparent border-none" />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[8px] uppercase text-gray-500 font-bold">Tier Name</label>
                                    <input value={tier.name} onChange={e => updateTier(i, 'name', e.target.value)} className="w-full bg-black border border-gray-800 p-2 text-white text-xs font-black uppercase" />
                                </div>
                                <div>
                                    <label className="text-[8px] uppercase text-gray-500 font-bold">Price ($)</label>
                                    <input type="number" value={tier.price} onChange={e => updateTier(i, 'price', Number(e.target.value))} className="w-full bg-black border border-gray-800 p-2 text-white text-xs font-black uppercase" />
                                </div>
                                <button 
                                    onClick={() => {
                                        const newTiers = [...editData.accessTiers];
                                        newTiers.splice(i, 1);
                                        setEditData({...editData, accessTiers: newTiers});
                                    }}
                                    className="text-red-500 text-[9px] font-black uppercase hover:text-white"
                                >
                                    Delete Tier
                                </button>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setEditData({...editData, accessTiers: [...(editData.accessTiers || []), { id: Date.now().toString(), name: "NEW TIER", price: 0, perks: [], color: "#ffffff" }]})}
                        className="border-2 border-dashed border-gray-800 flex items-center justify-center p-12 text-gray-600 font-black uppercase tracking-widest hover:border-[#FFB800] hover:text-[#FFB800] transition-all"
                    >
                        + Create Access Tier
                    </button>
                 </div>
                 <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Save Access Matrix</button>
            </div>
        )}

        {/* PROTOCOLS TAB (UPDATED FOR STR/VIT/INT) */}
        {activeTab === 'protocols' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex gap-4 border-b border-gray-800 pb-2 mb-6 overflow-x-auto">
                    {[
                        { id: 'SCHEDULE', label: 'Program Schedule' },
                        { id: 'WORKOUT_LIB', label: 'Workout Library (STR)' },
                        { id: 'NUTRITION_LIB', label: 'Nutrition Library (VIT)' },
                        { id: 'MINDSET_LIB', label: 'Mindset Library (INT)' }
                    ].map(sub => (
                        <button 
                            key={sub.id} 
                            onClick={() => setProtocolSubTab(sub.id as any)}
                            className={`text-xs font-black uppercase tracking-widest pb-2 whitespace-nowrap ${protocolSubTab === sub.id ? 'text-[#FFB800] border-b-2 border-[#FFB800]' : 'text-gray-600'}`}
                        >
                            {sub.label}
                        </button>
                    ))}
                </div>

                {protocolSubTab === 'SCHEDULE' && (
                   <div className="space-y-8">
                       {!editingProgram ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(editData.programs || []).map((prog, i) => (
                                    <div key={prog.id || i} onClick={() => setEditingProgram(prog)} className="bg-[#0a0a0a] border border-gray-800 p-6 hover:border-[#FFB800] cursor-pointer transition-all group relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-black text-white uppercase italic">{prog.title}</h3>
                                            <span className="text-[9px] bg-[#FFB800] text-black px-2 py-0.5 font-black uppercase rounded-sm">
                                                {editData.accessTiers?.find(t => t.id === prog.tierId)?.name || 'UNKNOWN'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-4">{prog.description}</p>
                                        <div className="flex gap-4 text-[9px] text-gray-600 uppercase font-black">
                                            <span>{prog.weeks?.length || 0} Weeks</span>
                                            <span>{prog.isActive ? 'Active' : 'Archived'}</span>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={createNewProgram} className="border-2 border-dashed border-gray-800 flex items-center justify-center p-6 hover:border-[#FFB800] hover:text-[#FFB800] text-gray-600 font-black uppercase tracking-widest transition-all">
                                    + Initialize New Protocol
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#0a0a0a] border border-[#FFB800]/20 p-6 relative">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                                    <h2 className="text-xl font-black text-[#FFB800] uppercase">Editing: {editingProgram.title}</h2>
                                    <button onClick={() => setEditingProgram(null)} className="text-gray-500 hover:text-white text-[10px] uppercase font-black">Close Editor</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase text-gray-600 font-bold">Protocol Title</label>
                                        <input value={editingProgram.title} onChange={e => updateProgram({...editingProgram, title: e.target.value})} className="w-full bg-black border border-gray-800 p-3 text-xs text-white font-bold uppercase outline-none focus:border-[#FFB800]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase text-gray-600 font-bold">Required Tier</label>
                                        <select value={editingProgram.tierId} onChange={e => updateProgram({...editingProgram, tierId: e.target.value})} className="w-full bg-black border border-gray-800 p-3 text-xs text-[#FFB800] font-bold uppercase outline-none">
                                            {(editData.accessTiers || []).map((t, i) => (
                                                <option key={t.id || i} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {editingProgram.weeks.map((week, wIdx) => (
                                        <div key={wIdx} className="border border-gray-800 p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Week {week.weekNumber}</h4>
                                                <button className="text-[9px] text-red-500 font-black uppercase">Delete Week</button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-2">
                                                {week.days.map((day, dIdx) => (
                                                    <div 
                                                        key={dIdx} 
                                                        onClick={() => setEditingDay({ weekIdx: wIdx, dayIdx: dIdx, day })}
                                                        className={`p-2 border cursor-pointer hover:border-[#FFB800] transition-colors ${day.isRestDay ? 'border-gray-900 bg-gray-900/20' : 'border-gray-800 bg-black'} flex flex-col gap-2 min-h-[80px]`}
                                                    >
                                                        <div className="text-[8px] text-gray-500 font-black uppercase text-center">Day {day.dayNumber}</div>
                                                        <div className="text-[9px] text-white font-bold text-center uppercase leading-tight">
                                                            {day.isRestDay ? 'REST' : (editData.globalWorkouts.find(w => w.id === day.workoutId)?.title || 'WORKOUT')}
                                                        </div>
                                                        <div className="flex gap-1 justify-center mt-auto">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${day.nutritionId ? 'bg-[#00FF88]' : 'bg-gray-800'}`}></div>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${day.mindsetId ? 'bg-[#00F0FF]' : 'bg-gray-800'}`}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                            const nextWeekNum = editingProgram.weeks.length + 1;
                                            const newWeek: ProgramWeek = { weekNumber: nextWeekNum, days: Array.from({length: 7}, (_, i) => ({ dayNumber: i + 1, title: `Day ${i + 1}`, workoutId: "", nutritionId: "", mindsetId: "", isRestDay: false })) };
                                            updateProgram({...editingProgram, weeks: [...editingProgram.weeks, newWeek]});
                                        }} className="w-full border border-gray-800 py-3 text-[10px] uppercase font-black text-gray-500 hover:text-white">
                                        + Add Week Block
                                    </button>
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-800">
                                     <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Save Protocol Changes</button>
                                </div>
                                {editingDay && (
                                    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
                                        <div className="bg-[#0a0a0a] border border-[#FFB800] p-6 w-full max-w-lg shadow-[0_0_50px_#FFB80030] overflow-y-auto max-h-[90vh]">
                                            <h3 className="text-xl font-black text-[#FFB800] uppercase mb-6">Mission Config: Day {editingDay.day.dayNumber}</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-4 mb-4">
                                                    <button onClick={() => { const newWeeks = [...editingProgram.weeks]; newWeeks[editingDay.weekIdx].days[editingDay.dayIdx].isRestDay = false; updateProgram({...editingProgram, weeks: newWeeks}); setEditingDay({...editingDay, day: { ...editingDay.day, isRestDay: false }}); }} className={`flex-1 py-3 font-black uppercase text-xs ${!editingDay.day.isRestDay ? 'bg-[#FFB800] text-black' : 'border border-gray-800 text-gray-500'}`}>Active Duty</button>
                                                    <button onClick={() => { const newWeeks = [...editingProgram.weeks]; newWeeks[editingDay.weekIdx].days[editingDay.dayIdx].isRestDay = true; updateProgram({...editingProgram, weeks: newWeeks}); setEditingDay({...editingDay, day: { ...editingDay.day, isRestDay: true }}); }} className={`flex-1 py-3 font-black uppercase text-xs ${editingDay.day.isRestDay ? 'bg-[#00FF88] text-black' : 'border border-gray-800 text-gray-500'}`}>Rest & Recover</button>
                                                </div>
                                                
                                                {!editingDay.day.isRestDay && (
                                                    <div>
                                                        <label className="text-[9px] uppercase text-gray-500 font-bold">Workout Protocol (STR)</label>
                                                        <select value={editingDay.day.workoutId} onChange={(e) => { const newWeeks = [...editingProgram.weeks]; newWeeks[editingDay.weekIdx].days[editingDay.dayIdx].workoutId = e.target.value; updateProgram({...editingProgram, weeks: newWeeks}); setEditingDay({...editingDay, day: { ...editingDay.day, workoutId: e.target.value }}); }} className="w-full bg-black border border-gray-800 p-3 text-white uppercase text-xs">
                                                            <option value="">-- No Workout --</option>
                                                            {editData.globalWorkouts.map((w, idx) => (<option key={idx} value={w.id || idx.toString()}>{w.title}</option>))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-[9px] uppercase text-gray-500 font-bold">Nutrition Plan (VIT)</label>
                                                    <select value={editingDay.day.nutritionId} onChange={(e) => { const newWeeks = [...editingProgram.weeks]; newWeeks[editingDay.weekIdx].days[editingDay.dayIdx].nutritionId = e.target.value; updateProgram({...editingProgram, weeks: newWeeks}); setEditingDay({...editingDay, day: { ...editingDay.day, nutritionId: e.target.value }}); }} className="w-full bg-black border border-gray-800 p-3 text-white uppercase text-xs">
                                                        <option value="">-- No Specific Meal --</option>
                                                        {editData.globalNutrition.map((m, idx) => (<option key={idx} value={m.id || idx.toString()}>{m.name}</option>))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[9px] uppercase text-gray-500 font-bold">Mindset Protocol (INT)</label>
                                                    <select value={editingDay.day.mindsetId} onChange={(e) => { const newWeeks = [...editingProgram.weeks]; newWeeks[editingDay.weekIdx].days[editingDay.dayIdx].mindsetId = e.target.value; updateProgram({...editingProgram, weeks: newWeeks}); setEditingDay({...editingDay, day: { ...editingDay.day, mindsetId: e.target.value }}); }} className="w-full bg-black border border-gray-800 p-3 text-white uppercase text-xs">
                                                        <option value="">-- No Specific Mindset --</option>
                                                        {editData.globalMindset.map((m, idx) => (<option key={idx} value={m.id || idx.toString()}>{m.title}</option>))}
                                                    </select>
                                                </div>

                                                <button onClick={() => setEditingDay(null)} className="w-full border border-gray-700 py-4 mt-4 text-white font-black uppercase tracking-widest hover:bg-white hover:text-black">Close Config</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                   </div>
                )}

                {protocolSubTab === 'WORKOUT_LIB' && (
                     <div className="space-y-6">
                        {editData.globalWorkouts.map((workout, i) => (
                             <div key={i} className="bg-[#0a0a0a] border border-gray-800 p-6 relative">
                                <button onClick={() => {
                                    const newWorkouts = editData.globalWorkouts.filter((_, idx) => idx !== i);
                                    setEditData({...editData, globalWorkouts: newWorkouts});
                                }} className="absolute top-4 right-4 text-red-500 text-xs font-black">DELETE</button>
                                
                                <h3 className="text-[#FF2A2A] font-black uppercase tracking-widest text-sm mb-4">Workout Blueprint: {workout.title}</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase text-gray-600 font-bold">Title</label>
                                        <input value={workout.title} onChange={e => { const newW = [...editData.globalWorkouts]; newW[i].title = e.target.value; setEditData({...editData, globalWorkouts: newW}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs uppercase" />
                                    </div>
                                    {/* Simplified Exercise List Display */}
                                    <div className="border border-[#222] p-2 max-h-40 overflow-y-auto">
                                        {workout.exercises.map((ex, exIdx) => (
                                            <div key={exIdx} className="flex justify-between text-xs text-gray-400 border-b border-[#222] py-1">
                                                <span>{ex.name}</span>
                                                <button onClick={() => {
                                                    const newW = [...editData.globalWorkouts];
                                                    newW[i].exercises = newW[i].exercises.filter((_, ei) => ei !== exIdx);
                                                    setEditData({...editData, globalWorkouts: newW});
                                                }} className="text-red-500">X</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => {
                                        const name = prompt("Enter Exercise Name:");
                                        const reps = prompt("Enter Rep Range (e.g. 6-8):");
                                        if (name && reps) {
                                            const newW = [...editData.globalWorkouts];
                                            newW[i].exercises.push({ id: Date.now().toString(), name, reps, weight: 0, repsFilled: 0, completed: false });
                                            setEditData({...editData, globalWorkouts: newW});
                                        }
                                    }} className="w-full border border-gray-800 py-2 text-[10px] uppercase font-bold text-gray-500">+ Add Exercise</button>
                                </div>
                             </div>
                        ))}
                        <button onClick={() => setEditData({...editData, globalWorkouts: [...editData.globalWorkouts, { id: Date.now().toString(), title: "NEW WORKOUT", exercises: [] }]})} className="w-full border border-gray-800 py-4 text-xs font-black uppercase text-gray-500 hover:text-white">+ Create New Workout Definition</button>
                        <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Save Workout Library</button>
                     </div>
                )}

                {protocolSubTab === 'NUTRITION_LIB' && (
                    <div className="space-y-6">
                        {editData.globalNutrition.map((meal, i) => (
                             <div key={meal.id || i} className="bg-[#0a0a0a] border border-gray-800 p-6 relative">
                                <button onClick={() => {
                                    const newMeals = editData.globalNutrition.filter((_, idx) => idx !== i);
                                    setEditData({...editData, globalNutrition: newMeals});
                                }} className="absolute top-4 right-4 text-red-500 text-xs font-black">DELETE</button>
                                
                                <h3 className="text-[#00FF88] font-black uppercase tracking-widest text-sm mb-4">Meal Blueprint {i+1}</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1"><label className="text-[8px] uppercase text-gray-600 font-bold">Name</label><input value={meal.name} onChange={e => { const newMeals = [...editData.globalNutrition]; newMeals[i].name = e.target.value; setEditData({...editData, globalNutrition: newMeals}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs uppercase" /></div>
                                    <div className="space-y-1"><label className="text-[8px] uppercase text-gray-600 font-bold">Total Kcal</label><input type="number" value={meal.kcal} onChange={e => { const newMeals = [...editData.globalNutrition]; newMeals[i].kcal = Number(e.target.value); setEditData({...editData, globalNutrition: newMeals}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs" /></div>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <label className="text-[8px] uppercase text-gray-600 font-bold">Preparation Instructions</label>
                                    <textarea value={meal.preparation || ''} onChange={e => { const newMeals = [...editData.globalNutrition]; newMeals[i].preparation = e.target.value; setEditData({...editData, globalNutrition: newMeals}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs h-20" />
                                </div>
                             </div>
                        ))}
                        <button onClick={() => setEditData({...editData, globalNutrition: [...editData.globalNutrition, { id: Date.now().toString(), name: "NEW MEAL", kcal: 0, p: 0, c: 0, f: 0, items: [], preparation: "" }]})} className="w-full border border-gray-800 py-4 text-xs font-black uppercase text-gray-500 hover:text-white">+ Add Meal</button>
                        <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Save Nutrition Matrix</button>
                    </div>
                )}

                {protocolSubTab === 'MINDSET_LIB' && (
                     <div className="space-y-6">
                        {(editData.globalMindset || []).map((step, i) => (
                             <div key={step.id || i} className="bg-[#0a0a0a] border border-gray-800 p-6 relative">
                                <button onClick={() => {
                                    const newSteps = (editData.globalMindset || []).filter((_, idx) => idx !== i);
                                    setEditData({...editData, globalMindset: newSteps});
                                }} className="absolute top-4 right-4 text-red-500 text-xs font-black">DELETE</button>
                                
                                <h3 className="text-[#00F0FF] font-black uppercase tracking-widest text-sm mb-4">Mindset Phase {i+1}</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1"><label className="text-[8px] uppercase text-gray-600 font-bold">Title</label><input value={step.title} onChange={e => { const newSteps = [...(editData.globalMindset || [])]; newSteps[i].title = e.target.value; setEditData({...editData, globalMindset: newSteps}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs uppercase" /></div>
                                    <div className="space-y-1"><label className="text-[8px] uppercase text-gray-600 font-bold">Frequency (Hz)</label><input type="number" value={step.frequency} onChange={e => { const newSteps = [...(editData.globalMindset || [])]; newSteps[i].frequency = Number(e.target.value); setEditData({...editData, globalMindset: newSteps}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs" /></div>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <label className="text-[8px] uppercase text-gray-600 font-bold">Description</label>
                                    <input value={step.desc} onChange={e => { const newSteps = [...(editData.globalMindset || [])]; newSteps[i].desc = e.target.value; setEditData({...editData, globalMindset: newSteps}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs" />
                                </div>
                                {/* AUDIO AND DURATION CONFIG */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase text-gray-600 font-bold">Audio URL (.mp3)</label>
                                        <input value={step.audioUrl || ''} onChange={e => { const newSteps = [...(editData.globalMindset || [])]; newSteps[i].audioUrl = e.target.value; setEditData({...editData, globalMindset: newSteps}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase text-gray-600 font-bold">Duration (Seconds)</label>
                                        <input type="number" value={step.duration} onChange={e => { const newSteps = [...(editData.globalMindset || [])]; newSteps[i].duration = Number(e.target.value); setEditData({...editData, globalMindset: newSteps}) }} className="w-full bg-black border border-gray-800 p-2 text-white text-xs" />
                                    </div>
                                </div>
                             </div>
                        ))}
                        <button onClick={() => setEditData({...editData, globalMindset: [...(editData.globalMindset || []), { id: Date.now().toString(), title: "NEW PHASE", desc: "FOCUS", duration: 60, frequency: 432 }]})} className="w-full border border-gray-800 py-4 text-xs font-black uppercase text-gray-500 hover:text-white">+ Add Mindset Phase</button>
                        <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Save Mindset Matrix</button>
                     </div>
                )}
            </div>
        )}

        {/* SHOP EDITOR */}
        {activeTab === 'shop' && (
            <div className="space-y-8 animate-fade-in">
                 <section className="space-y-4">
                    <h3 className="text-[#FFB800] font-black uppercase tracking-widest text-sm mb-4">Supply Depot Inventory</h3>
                    {editData.shopProducts.map((p, i) => (
                      <div key={p.id || i} className="bg-[#0a0a0a] border border-gray-800 p-6 flex flex-col gap-4 group">
                         <div className="flex justify-between items-start">
                            <span className="text-3xl bg-black p-2 border border-gray-800">{p.image}</span>
                            <div className="flex gap-2">
                               <button onClick={() => {
                                 const newProducts = editData.shopProducts.filter((_, idx) => idx !== i);
                                 setEditData({...editData, shopProducts: newProducts});
                               }} className="text-red-500 text-sm">✕</button>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[8px] uppercase text-gray-600 font-bold">Designation</label>
                               <input value={p.name} onChange={e => {
                                 const newProducts = [...editData.shopProducts];
                                 newProducts[i].name = e.target.value;
                                 setEditData({...editData, shopProducts: newProducts});
                               }} className="w-full bg-black border border-gray-800 p-3 text-xs text-white uppercase outline-none focus:border-[#FFB800]" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] uppercase text-gray-600 font-bold">Price</label>
                               <input type="number" value={p.price} onChange={e => {
                                 const newProducts = [...editData.shopProducts];
                                 newProducts[i].price = Number(e.target.value);
                                 setEditData({...editData, shopProducts: newProducts});
                               }} className="w-full bg-black border border-gray-800 p-3 text-xs text-white outline-none focus:border-[#FFB800]" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] uppercase text-gray-600 font-bold">Original Price</label>
                               <input type="number" value={p.originalPrice || ''} onChange={e => {
                                 const newProducts = [...editData.shopProducts];
                                 newProducts[i].originalPrice = Number(e.target.value);
                                 setEditData({...editData, shopProducts: newProducts});
                               }} className="w-full bg-black border border-gray-800 p-3 text-xs text-white outline-none focus:border-[#FFB800]" />
                            </div>
                             <div className="space-y-1">
                               <label className="text-[8px] uppercase text-gray-600 font-bold">Category</label>
                               <select value={p.category} onChange={e => {
                                 if (e.target.value === "ADD_NEW") {
                                     const newCat = prompt("Enter new Category Name:");
                                     if(newCat) {
                                         const newProducts = [...editData.shopProducts];
                                         newProducts[i].category = newCat;
                                         setEditData({...editData, shopProducts: newProducts});
                                     }
                                 } else {
                                    const newProducts = [...editData.shopProducts];
                                    newProducts[i].category = e.target.value;
                                    setEditData({...editData, shopProducts: newProducts});
                                 }
                               }} className="w-full bg-black border border-gray-800 p-3 text-xs text-white uppercase outline-none focus:border-[#FFB800]">
                                   <option value="Supplements">Supplements</option>
                                   <option value="Gear">Gear</option>
                                   <option value="Apparel">Apparel</option>
                                   <option value={p.category}>{p.category} (Current)</option>
                                   <option value="ADD_NEW">+ Add New...</option>
                               </select>
                            </div>
                             <div className="space-y-1">
                               <label className="text-[8px] uppercase text-gray-600 font-bold">Buff Description</label>
                               <input value={p.buff} onChange={e => {
                                 const newProducts = [...editData.shopProducts];
                                 newProducts[i].buff = e.target.value;
                                 setEditData({...editData, shopProducts: newProducts});
                               }} className="w-full bg-black border border-gray-800 p-3 text-xs text-white uppercase outline-none focus:border-[#FFB800]" />
                            </div>
                         </div>
                      </div>
                    ))}
                    <button onClick={() => setEditData({...editData, shopProducts: [...editData.shopProducts, { id: Date.now().toString(), name: 'NEW SUPPLY', price: 0, category: 'Supplements', image: '📦', buff: '+0 STAT' }]})} className="w-full border-2 border-dashed border-gray-800 py-6 text-xs text-gray-600 font-black uppercase tracking-widest">+ Inject New Loot</button>
                 </section>
                 <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_20px_#FFB80040]">Synchronize Shop Matrix</button>
            </div>
        )}

        {/* GUILD EDITOR (Compact Layout) */}
        {activeTab === 'guild' && (
            <div className="bg-[#0a0a0a] border border-[#FFB800]/20 p-6 space-y-8 animate-fade-in">
            <section>
                <h3 className="text-[#FFB800] font-black uppercase tracking-widest text-sm mb-4">Boss Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                    <label className="text-[9px] uppercase text-gray-600 font-bold">Boss Name</label>
                    <input value={editData.guildBoss.name} onChange={e => setEditData({...editData, guildBoss: {...editData.guildBoss, name: e.target.value}})} className="w-full bg-black border border-gray-800 p-4 text-xs text-white uppercase outline-none focus:border-[#FFB800]" />
                    </div>
                    <div className="space-y-1">
                    <label className="text-[9px] uppercase text-gray-600 font-bold">Max HP</label>
                    <input type="number" value={editData.guildBoss.maxHp} onChange={e => setEditData({...editData, guildBoss: {...editData.guildBoss, maxHp: Number(e.target.value)}})} className="w-full bg-black border border-gray-800 p-4 text-xs text-white outline-none focus:border-[#FFB800]" />
                    </div>
                </div>
            </section>
            <section>
                <h3 className="text-[#FFB800] font-black uppercase tracking-widest text-sm mb-4">Raid Orders</h3>
                <div className="space-y-4">
                    {editData.raidOrders.map((order, i) => (
                        <div key={order.id || i} className="border border-gray-800 p-4 relative bg-[#050505] flex flex-col gap-3">
                             <button onClick={() => setEditData({...editData, raidOrders: editData.raidOrders.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 text-red-500 font-black text-xs border border-red-900 px-2 py-1">DELETE</button>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* TEXT INPUTS */}
                                <div className="col-span-2 grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase text-gray-600 font-bold">Mission Title</label>
                                        <input value={order.title} onChange={e => {
                                            const newOrders = [...editData.raidOrders];
                                            newOrders[i].title = e.target.value;
                                            setEditData({...editData, raidOrders: newOrders});
                                        }} placeholder="MISSION TITLE" className="w-full bg-black border border-gray-800 p-2 text-xs text-[#FFB800] uppercase font-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase text-gray-600 font-bold">Description</label>
                                        <input value={order.description} onChange={e => {
                                            const newOrders = [...editData.raidOrders];
                                            newOrders[i].description = e.target.value;
                                            setEditData({...editData, raidOrders: newOrders});
                                        }} placeholder="MISSION BRIEFING" className="w-full bg-black border border-gray-800 p-2 text-xs text-white uppercase" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="space-y-1">
                                            <label className="text-[8px] uppercase text-gray-600 font-bold">XP Reward</label>
                                            <input type="number" value={order.xpReward} onChange={e => {
                                                const newOrders = [...editData.raidOrders];
                                                newOrders[i].xpReward = Number(e.target.value);
                                                setEditData({...editData, raidOrders: newOrders});
                                            }} className="w-full bg-black border border-gray-800 p-2 text-xs text-[#00FF88] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] uppercase text-gray-600 font-bold">Frequency</label>
                                            <select value={order.frequency} onChange={e => {
                                                const newOrders = [...editData.raidOrders];
                                                newOrders[i].frequency = e.target.value as RaidFrequency;
                                                setEditData({...editData, raidOrders: newOrders});
                                            }} className="w-full bg-black border border-gray-800 p-2 text-xs text-white uppercase">
                                                <option value="DAILY">Daily</option>
                                                <option value="WEEKLY">Weekly</option>
                                                <option value="MONTHLY">Monthly</option>
                                                <option value="ONETIME">One-Time</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                {/* IMAGE INPUT */}
                                <div className="space-y-1">
                                    <label className="text-[8px] uppercase text-gray-600 font-bold">Background Image URL</label>
                                    <input value={order.backgroundImage || ''} onChange={e => {
                                        const newOrders = [...editData.raidOrders];
                                        newOrders[i].backgroundImage = e.target.value;
                                        setEditData({...editData, raidOrders: newOrders});
                                    }} placeholder="HTTPS://..." className="w-full bg-black border border-gray-800 p-2 text-xs text-gray-400" />
                                    {order.backgroundImage && (
                                        <div className="h-16 w-full mt-2 overflow-hidden border border-gray-800 rounded-sm">
                                            <img src={order.backgroundImage} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    ))}
                    <button onClick={() => setEditData({...editData, raidOrders: [...editData.raidOrders, { id: Date.now().toString(), title: "NEW OPERATION", description: "AWAITING ORDERS", xpReward: 100, isCompleted: false, frequency: 'DAILY' }]})} className="w-full border border-gray-800 py-3 text-[10px] uppercase font-black text-gray-600 hover:text-[#FFB800]">+ Issue New Order</button>
                </div>
            </section>
            <button onClick={saveGlobalChanges} className="w-full bg-[#FFB800] text-black py-4 font-black uppercase tracking-widest shadow-[0_0_30px_#FFB80030]">Deploy Boss Matrix</button>
            </div>
        )}

      </div>
    </div>
  );
}
