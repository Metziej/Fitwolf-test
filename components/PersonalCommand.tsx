
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Goal, UnitSystem, Sex, MealBlueprint } from '../types.ts';
import { NUTRITION_BLUEPRINT, BASE_KCAL } from '../constants.tsx';
import { GoogleGenAI } from "@google/genai";

interface PersonalCommandProps {
  profile: UserProfile;
  history: any[];
  onSave: (data: any) => void;
  onBack: () => void;
}

const PHOTO_SLOTS = [
  { id: 'frontRelaxed', label: 'Front Relaxed' },
  { id: 'frontFlexed', label: 'Front Flexed' },
  { id: 'sideRelaxed', label: 'Side Relaxed' },
  { id: 'sideFlexed', label: 'Side Flexed' },
  { id: 'backRelaxed', label: 'Back Relaxed' },
  { id: 'backFlexed', label: 'Back Flexed' }
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PersonalCommand({ profile, history, onSave, onBack }: PersonalCommandProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'meal_planner' | 'logistics' | 'visuals' | 'energy_calculation'>('status');
  
  // Wizard State
  const [formData, setFormData] = useState({
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    sex: profile.sex || Sex.MALE,
    goal: profile.goal,
    activityLevel: profile.activityLevel || 1.55
  });

  // Meal Planner State
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState<Record<number, MealBlueprint[]>>(() => {
     // Default: every day has the base blueprint
     const plan: Record<number, MealBlueprint[]> = {};
     DAYS_OF_WEEK.forEach((_, i) => plan[i] = NUTRITION_BLUEPRINT);
     return plan;
  });
  const [swappingMeal, setSwappingMeal] = useState<{dayIdx: number, mealIdx: number, currentMeal: MealBlueprint} | null>(null);
  const [swapComplexity, setSwapComplexity] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  const [swapInstructions, setSwapInstructions] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Logistics State - Default all days selected
  const [selectedGroceryDays, setSelectedGroceryDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Visuals State
  const [photos, setPhotos] = useState<Record<string, string>>(profile.photos || {});

  // Mifflin-St Jeor BMR — gecorrigeerde FitWolf standaard formule (zie goal.md sectie 2.4)
  const calculateMacros = () => {
    // Converteer naar metrisch als nodig
    const weightKg = profile.units === UnitSystem.IMPERIAL
      ? formData.weight * 0.453592
      : formData.weight;
    const heightCm = profile.units === UnitSystem.IMPERIAL
      ? formData.height * 2.54
      : formData.height;

    // Mifflin-St Jeor met correcte man/vrouw formule
    const bmr = formData.sex === Sex.FEMALE
      ? 447.6 + (9.2 * weightKg) + (3.1 * heightCm) - (4.3 * formData.age)
      : 88.4  + (13.4 * weightKg) + (4.8 * heightCm) - (5.7 * formData.age);

    const tdee = bmr * formData.activityLevel;

    // FitWolf surplus/deficit ranges (goal.md)
    const targetKcal = formData.goal === Goal.CUT
      ? tdee - 500   // Midden van 400-600 kcal deficit
      : tdee + 300;  // Midden van 200-400 kcal surplus

    const protein = weightKg * 2.2;
    const fats = (targetKcal * 0.25) / 9;
    const carbs = (targetKcal - (protein * 4) - (fats * 9)) / 4;

    return {
      kcal:    Math.round(targetKcal),
      protein: Math.round(protein),
      carbs:   Math.round(Math.max(0, carbs)),
      fats:    Math.round(fats),
    };
  };

  const finalizeWizard = () => {
    const macros = calculateMacros();
    const scaleRatio = macros.kcal / BASE_KCAL;

    onSave({
      ...profile,
      ...formData,   // bevat nu ook sex
      ...macros,
      scaleRatio
    });
    setActiveTab('status');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, slotId: string) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newPhotos = { ...photos, [slotId]: ev.target.result as string };
          setPhotos(newPhotos);
          onSave({ ...profile, photos: newPhotos });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCharacterImage = () => {
      if (profile.goal === Goal.BULK) return "https://api.dicebear.com/7.x/avataaars/svg?seed=Juggernaut&clothing=graphicShirt&eyes=surprised&eyebrows=angry";
      return "https://api.dicebear.com/7.x/avataaars/svg?seed=Predator&clothing=hoodie&eyes=squint&eyebrows=angry";
  };

  // AI Meal Swapping
  const generateMealSwap = async (permanent: boolean) => {
      if (!swappingMeal) return;
      setIsAiLoading(true);

      try {
        const mealToSwap = swappingMeal.currentMeal;
        const targetKcal = Math.round(mealToSwap.kcal * (profile.scaleRatio || 1));
        const mealNameContext = mealToSwap.name.split(':')[0] || "MEAL"; // Get category like BREAKFAST/SNACK

        let stylePrompt = "";
        if (swapComplexity === 'SIMPLE') {
            stylePrompt = "Keep it extremely simple (Bodybuilder style). Basic ingredients (e.g. Rice, Chicken, Broccoli, Potato). Minimal spices, very easy to prep. Cost-effective.";
        } else {
            stylePrompt = "Make it a culinary experience (Gourmet style). Use spices, herbs, and advanced cooking techniques. Use varied and interesting ingredients. It should feel like a premium meal.";
        }

        const prompt = `
            Act as an elite sports nutritionist. 
            Generate a JSON object for a single meal to replace "${mealToSwap.name}".
            
            Parameters:
            - Target Calories: ~${targetKcal} kcal
            - High Protein
            - Context/Type: ${mealNameContext} (Ensure the new meal fits this category)
            - Style: ${stylePrompt}
            - User Preference/Restrictions: ${swapInstructions || 'None'}

            Format (JSON):
            {
              "name": "${mealNameContext}: [Creative Name]",
              "items": [{"name": "Ingredient Name", "base": 100, "unit": "g"}],
              "p": 30, "c": 40, "f": 10, "kcal": ${targetKcal},
              "preparation": "Concise preparation instructions."
            }
        `;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        const text = response.text || "";
        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newMeal = JSON.parse(jsonStr);

        // Assign ID
        newMeal.id = `ai_${Date.now()}`;
        
        // Update Plan
        const updatedPlan = { ...weeklyPlan };
        
        if (permanent) {
            // Update this slot for THIS specific day. 
            // UX Decision: Since it's a daily planner, "Permanent" here implies saving the state.
            updatedPlan[swappingMeal.dayIdx][swappingMeal.mealIdx] = newMeal;
        } else {
            updatedPlan[swappingMeal.dayIdx][swappingMeal.mealIdx] = newMeal;
        }
        
        setWeeklyPlan(updatedPlan);
        setSwappingMeal(null);
        setSwapInstructions('');

      } catch (e) {
          console.error(e);
          alert("AI SYSTEM FAILURE. CHECK API KEY OR NETWORK.");
      } finally {
          setIsAiLoading(false);
      }
  };

  // Grocery List Logic
  const groceryList = useMemo(() => {
      if (selectedGroceryDays.length === 0) return [];

      const aggregated: Record<string, {name: string, amount: number, unit: string}> = {};
      
      selectedGroceryDays.forEach(dayIdx => {
          const meals = weeklyPlan[dayIdx];
          meals.forEach(meal => {
              meal.items.forEach(item => {
                  const key = item.name.toLowerCase();
                  if (!aggregated[key]) {
                      aggregated[key] = { name: item.name, amount: 0, unit: item.unit };
                  }
                  // Apply scale ratio
                  aggregated[key].amount += item.base * (profile.scaleRatio || 1);
              });
          });
      });

      return Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedGroceryDays, weeklyPlan, profile.scaleRatio]);

  return (
    <div className="fixed inset-0 z-40 bg-black overflow-y-auto no-scrollbar scroll-smooth pb-24">
       <div className="max-w-2xl mx-auto min-h-screen bg-[#050505]">
          <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#FF2A2A]/30 p-4 flex justify-between items-center">
             <div>
                <h2 className="text-[10px] text-[#FF2A2A] uppercase tracking-[0.3em] font-black">Command Node</h2>
                <h1 className="text-xl text-white uppercase font-black italic tracking-tighter">{profile.username}</h1>
             </div>
             <button onClick={onBack} className="border border-[#333] px-4 py-2 text-[10px] uppercase font-black hover:bg-white hover:text-black transition-all">Close</button>
          </header>

          <nav className="flex border-b border-[#222] overflow-x-auto no-scrollbar">
             {(['status', 'meal_planner', 'logistics', 'visuals', 'energy_calculation'] as const).map(tab => (
               <button 
                 key={tab} 
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-4 px-4 text-[10px] uppercase font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#FF2A2A] text-black' : 'text-gray-600 hover:text-white'}`}
               >
                 {tab.replace('_', ' ')}
               </button>
             ))}
          </nav>

          <div className="p-6 animate-fade-in">
             {activeTab === 'status' && (
                <div className="space-y-6">
                   <div className="bg-[#0a0a0a] border border-[#222] p-6 flex flex-col items-center">
                       <h3 className="text-[#FF2A2A] uppercase font-black tracking-widest text-xs mb-4">Operative Status</h3>
                       <div className="w-48 h-48 rounded-full border-4 border-[#FF2A2A] overflow-hidden mb-6 bg-[#111] relative">
                           <img src={getCharacterImage()} className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 w-full bg-[#FF2A2A] text-black text-[9px] font-black text-center py-1 uppercase tracking-widest">
                               Lvl {Math.floor((history.length / 10) + 1)}
                           </div>
                       </div>
                       
                       <div className="w-full grid grid-cols-2 gap-4">
                           <div className="bg-black border border-[#333] p-3 text-center">
                               <div className="text-[9px] text-gray-500 uppercase font-black">Strength</div>
                               <div className="text-xl text-[#FF2A2A] font-black">{profile.stats?.str || 0}</div>
                           </div>
                           <div className="bg-black border border-[#333] p-3 text-center">
                               <div className="text-[9px] text-gray-500 uppercase font-black">Vitality</div>
                               <div className="text-xl text-[#00FF88] font-black">{profile.stats?.vit || 0}</div>
                           </div>
                           <div className="bg-black border border-[#333] p-3 text-center">
                               <div className="text-[9px] text-gray-500 uppercase font-black">Intellect</div>
                               <div className="text-xl text-[#00F0FF] font-black">{profile.stats?.int || 0}</div>
                           </div>
                           <div className="bg-black border border-[#333] p-3 text-center">
                               <div className="text-[9px] text-gray-500 uppercase font-black">Recovery</div>
                               <div className="text-xl text-[#FFB800] font-black">{profile.stats?.recovery || 0}</div>
                           </div>
                       </div>
                   </div>

                   <div className="bg-[#0a0a0a] border border-[#222] p-6">
                      <h3 className="text-xs text-white uppercase font-black tracking-widest mb-4 border-b border-[#222] pb-2">Daily Macro Targets</h3>
                      <div className="grid grid-cols-4 gap-2 text-center">
                         <div><div className="text-2xl font-black text-white">{profile.kcal}</div><div className="text-[8px] text-gray-500 uppercase font-bold">Kcal</div></div>
                         <div><div className="text-2xl font-black text-[#FF2A2A]">{profile.protein}g</div><div className="text-[8px] text-gray-500 uppercase font-bold">Prot</div></div>
                         <div><div className="text-2xl font-black text-[#00F0FF]">{profile.carbs}g</div><div className="text-[8px] text-gray-500 uppercase font-bold">Carb</div></div>
                         <div><div className="text-2xl font-black text-[#FFB800]">{profile.fats}g</div><div className="text-[8px] text-gray-500 uppercase font-bold">Fat</div></div>
                      </div>
                   </div>
                   
                   <button onClick={() => setActiveTab('energy_calculation')} className="w-full border border-[#FF2A2A] text-[#FF2A2A] py-3 text-[10px] uppercase font-black tracking-widest hover:bg-[#FF2A2A] hover:text-black transition-all">Recalibrate Biometrics</button>
                </div>
             )}

             {activeTab === 'meal_planner' && (
                 <div className="space-y-6">
                     {/* Day Selector */}
                     <div className="flex justify-between items-center bg-[#0a0a0a] border border-[#222] p-2">
                        <button onClick={() => setCurrentDayIdx(prev => (prev === 0 ? 6 : prev - 1))} className="p-3 hover:text-[#00FF88]">◄</button>
                        <h3 className="text-[#00FF88] font-black uppercase tracking-[0.2em]">{DAYS_OF_WEEK[currentDayIdx]}</h3>
                        <button onClick={() => setCurrentDayIdx(prev => (prev === 6 ? 0 : prev + 1))} className="p-3 hover:text-[#00FF88]">►</button>
                     </div>

                     {/* Meals List */}
                     <div className="space-y-4">
                        {weeklyPlan[currentDayIdx].map((meal, idx) => (
                            <div key={idx} className="border border-[#222] p-5 bg-[#0a0a0a] relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">{meal.name}</h4>
                                    <span className="text-[9px] data-font text-gray-500 font-bold">{Math.round(meal.kcal * (profile.scaleRatio || 1))} KCAL</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-4 uppercase">{meal.items.map(i => i.name).join(', ')}</p>
                                
                                <div className="flex gap-2">
                                    <button onClick={() => setSwappingMeal({ dayIdx: currentDayIdx, mealIdx: idx, currentMeal: meal })} className="flex-1 border border-[#00FF88] text-[#00FF88] py-2 text-[9px] uppercase font-black hover:bg-[#00FF88] hover:text-black transition-all">
                                        ♻ AI Swap
                                    </button>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             )}

             {activeTab === 'logistics' && (
                <div className="space-y-8">
                   <section>
                       <h3 className="text-xs text-[#00FF88] uppercase font-black tracking-widest mb-4">Tactical Supply Parameters</h3>
                       
                       <div className="bg-[#0a0a0a] border border-[#222] p-4 mb-4">
                           <p className="text-[9px] text-gray-500 uppercase font-bold mb-2">Select Operation Days</p>
                           <div className="flex gap-1 flex-wrap">
                               {DAYS_OF_WEEK.map((day, idx) => (
                                   <button 
                                     key={day}
                                     onClick={() => setSelectedGroceryDays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                                     className={`px-3 py-2 text-[8px] font-black uppercase border ${selectedGroceryDays.includes(idx) ? 'bg-[#00FF88] text-black border-[#00FF88]' : 'border-[#333] text-gray-600'}`}
                                   >
                                     {day.substring(0, 2)}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </section>

                   <section>
                      <h3 className="text-xs text-[#00FF88] uppercase font-black tracking-widest mb-4">Supply List</h3>
                      {groceryList.length === 0 ? (
                          <div className="p-8 border border-dashed border-gray-700 text-gray-500 text-xs text-center uppercase">Select days to generate intel</div>
                      ) : (
                          <div className="bg-[#0a0a0a] border border-[#222] p-0 overflow-hidden">
                              {groceryList.map((item, i) => (
                                  <div key={`${item.name}-${i}`} className={`flex items-center p-4 border-b border-[#222] last:border-0 transition-all ${checkedItems[item.name] ? 'bg-[#00FF88]/5' : 'hover:bg-[#111]'}`}>
                                      <div 
                                        className={`w-5 h-5 border rounded-sm mr-4 flex items-center justify-center cursor-pointer transition-all ${checkedItems[item.name] ? 'bg-[#00FF88] border-[#00FF88] text-black' : 'border-[#444] text-transparent hover:border-[#00FF88]'}`}
                                        onClick={() => setCheckedItems(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                                      >
                                        ✓
                                      </div>
                                      <div className={`flex-grow ${checkedItems[item.name] ? 'opacity-50 line-through' : ''}`}>
                                          <div className="text-white text-xs font-bold uppercase">{item.name}</div>
                                      </div>
                                      
                                      <div className={`font-mono text-xs font-bold ${checkedItems[item.name] ? 'text-gray-600' : 'text-[#00FF88]'}`}>
                                          {Math.round(item.amount)} {item.unit}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                   </section>

                   <button onClick={() => {
                        const text = groceryList.map(i => `[ ] ${i.name}: ${Math.round(i.amount)}${i.unit}`).join('\n');
                        navigator.clipboard.writeText(text);
                        alert("SUPPLY LIST COPIED TO CLIPBOARD");
                   }} className="w-full bg-[#00FF88] text-black py-4 text-[10px] uppercase font-black tracking-widest shadow-[0_0_15px_#00FF8840]">Export Logistics Data</button>
                </div>
             )}

             {activeTab === 'visuals' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      {PHOTO_SLOTS.map((slot) => (
                         <div key={slot.id} className="bg-[#0a0a0a] border border-[#222] p-2 flex flex-col">
                            <h4 className="text-[9px] uppercase font-black text-gray-500 mb-2">{slot.label}</h4>
                            <div className="flex-grow aspect-[3/4] bg-black border border-[#222] relative group cursor-pointer overflow-hidden">
                                {photos[slot.id] ? (
                                    <img src={photos[slot.id]} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-800 text-3xl">📷</div>
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                    <span className="text-[8px] uppercase font-black text-white">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, slot.id)} />
                                </label>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             )}

             {activeTab === 'energy_calculation' && (
                <div className="space-y-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-4">System Recalibration Required. Input new parameters.</p>

                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">Biological Sex (for BMR)</label>
                    <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value as Sex})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A] text-[10px] uppercase">
                       <option value={Sex.MALE}>Male</option>
                       <option value={Sex.FEMALE}>Female</option>
                    </select></div>

                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">Weight</label>
                    <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A]" /></div>
                    
                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">Height (CM)</label>
                    <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A]" /></div>
                    
                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">Age</label>
                    <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A]" /></div>
                    
                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">Activity Multiplier</label>
                    <select value={formData.activityLevel} onChange={e => setFormData({...formData, activityLevel: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A] text-[10px] uppercase">
                       <option value={1.2}>Sedentary (Desktop Command)</option>
                       <option value={1.375}>Light Active (1-3 days)</option>
                       <option value={1.55}>Moderately Active (3-5 days)</option>
                       <option value={1.725}>Very Active (6-7 days)</option>
                    </select></div>
                    
                    <div><label className="text-[9px] uppercase text-[#FF2A2A] font-black">New Objective</label>
                    <select value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value as Goal})} className="w-full bg-black border border-[#222] p-3 text-white outline-none focus:border-[#FF2A2A] text-[10px] uppercase">
                       <option value={Goal.CUT}>Cutting Phase</option>
                       <option value={Goal.BULK}>Massing Phase</option>
                    </select></div>

                    <button onClick={finalizeWizard} className="w-full bg-[#FF2A2A] text-black font-black py-4 uppercase tracking-[0.5em] shadow-[0_0_20px_#FF2A2A]">Execute Calculation</button>
                </div>
             )}
          </div>
       
          {/* AI Swap Modal */}
          {swappingMeal && (
              <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6">
                  <div className="bg-[#0a0a0a] border border-[#00FF88] p-6 max-w-sm w-full relative shadow-[0_0_50px_#00FF8840]">
                      <h3 className="text-lg font-black uppercase text-white mb-2">Tactical Meal Override</h3>
                      <p className="text-xs text-gray-500 mb-6 uppercase">Target: {swappingMeal.currentMeal.name}</p>

                      <div className="flex gap-2 mb-4">
                          <button onClick={() => setSwapComplexity('SIMPLE')} className={`flex-1 py-3 text-[9px] font-black uppercase border ${swapComplexity === 'SIMPLE' ? 'bg-[#00FF88] text-black border-[#00FF88]' : 'border-gray-700 text-gray-500'}`}>Simple (Basic)</button>
                          <button onClick={() => setSwapComplexity('ADVANCED')} className={`flex-1 py-3 text-[9px] font-black uppercase border ${swapComplexity === 'ADVANCED' ? 'bg-[#00FF88] text-black border-[#00FF88]' : 'border-gray-700 text-gray-500'}`}>Advanced (Culinary)</button>
                      </div>

                      <div className="mb-6">
                          <label className="text-[9px] uppercase text-[#00FF88] font-black block mb-2">Custom Instructions (Optional)</label>
                          <textarea 
                             value={swapInstructions} 
                             onChange={e => setSwapInstructions(e.target.value)} 
                             placeholder="E.g. No Pork, Spicy, Vegetarian..." 
                             className="w-full bg-black border border-[#222] p-3 text-xs text-white outline-none focus:border-[#00FF88] h-20 resize-none uppercase"
                          />
                      </div>

                      {isAiLoading ? (
                          <div className="text-center py-8">
                              <div className="inline-block w-8 h-8 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-4"></div>
                              <p className="text-[10px] uppercase font-black text-[#00FF88] animate-pulse">Consulting Core Intelligence...</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              <button onClick={() => generateMealSwap(false)} className="w-full py-4 border border-[#00FF88] text-[#00FF88] font-black uppercase text-[10px] hover:bg-[#00FF88] hover:text-black transition-all">Swap (One-Time)</button>
                              <button onClick={() => generateMealSwap(true)} className="w-full py-4 bg-[#00FF88] text-black font-black uppercase text-[10px] shadow-[0_0_20px_#00FF8840]">Swap (Permanent)</button>
                              <button onClick={() => setSwappingMeal(null)} className="w-full py-3 text-gray-500 font-black uppercase text-[10px] hover:text-white mt-4">Cancel</button>
                          </div>
                      )}
                  </div>
              </div>
          )}
       </div>
    </div>
  );
}
