
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { UserProfile, CustomDish, UnitSystem, MealBlueprint, MeasureUnit } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

interface VITNutritionProps {
  profile: UserProfile;
  checkedMeals: string[];
  customDishes: CustomDish[];
  onToggleMeal: (id: string) => void;
  onAddCustomDish: (dish: CustomDish) => void;
  onBack: () => void;
  onComplete: (details: string, rate: number) => void;
  onSaveProgress: (checked: string[], custom: CustomDish[]) => void;
  globalNutrition: MealBlueprint[];
  isCompleted?: boolean;
}

const ProgressBar = ({ label, current, max, color }: { label: string, current: number, max: number, color: string }) => {
   const safeMax = max || 1; // Prevent division by zero
   const pct = Math.min((current / safeMax) * 100, 100);
   const remaining = Math.max(0, max - current);
   return (
      <div className="mb-3">
         <div className="flex justify-between text-[9px] uppercase font-black mb-1">
            <span className="text-white">{label}</span>
            <span className="text-gray-500">{Math.round(current)} / {Math.round(max)} ({Math.round(remaining)} Left)</span>
         </div>
         <div className="h-1.5 bg-[#111] w-full">
            <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}></div>
         </div>
      </div>
   );
};

export default function VITNutrition({ profile, checkedMeals: initialChecked, customDishes: initialCustom, onToggleMeal, onAddCustomDish, onBack, onComplete, onSaveProgress, globalNutrition, isCompleted }: VITNutritionProps) {
  const scaleRatio = profile?.scaleRatio || 1;
  const [checked, setChecked] = useState<string[]>(initialChecked);
  const [customDishes, setCustomDishes] = useState<CustomDish[]>(initialCustom);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealBlueprint | null>(null);
  
  const [newDish, setNewDish] = useState<{ name: string; kcal: number; p: number; c: number; f: number; amount: number; unit: MeasureUnit; isPer100g: boolean }>({ name: '', kcal: 0, p: 0, c: 0, f: 0, amount: 100, unit: 'g', isPer100g: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [shoppingListChecked, setShoppingListChecked] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('fitwolf_shopping_list') || '[]'); } catch { return []; }
  });

  useEffect(() => {
      localStorage.setItem('fitwolf_shopping_list', JSON.stringify(shoppingListChecked));
  }, [shoppingListChecked]);

  const toggleShoppingItem = (item: string) => {
      setShoppingListChecked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const weeklyPlan = useMemo(() => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days.map(day => ({ day, meals: globalNutrition }));
  }, [globalNutrition]);

  const shoppingList = useMemo(() => {
      const list: Record<string, { amount: number, unit: string }> = {};
      weeklyPlan.forEach(day => {
          day.meals.forEach(meal => {
              meal.items.forEach(item => {
                  if (!list[item.name]) list[item.name] = { amount: 0, unit: item.unit };
                  list[item.name].amount += item.base * scaleRatio;
              });
          });
      });
      
      const categories: Record<string, any[]> = {
          'Produce': [], 'Meat & Dairy': [], 'Pantry': [], 'Snacks & Supplements': [], 'Other': []
      };

      Object.entries(list).forEach(([name, data]) => {
          const lower = name.toLowerCase();
          if (lower.includes('chicken') || lower.includes('beef') || lower.includes('yogurt') || lower.includes('milk') || lower.includes('cheese') || lower.includes('feta') || lower.includes('egg')) {
              categories['Meat & Dairy'].push({ name, ...data });
          } else if (lower.includes('banana') || lower.includes('blueberries') || lower.includes('avocado') || lower.includes('pepper') || lower.includes('broccoli') || lower.includes('vegetable')) {
              categories['Produce'].push({ name, ...data });
          } else if (lower.includes('bread') || lower.includes('wrap') || lower.includes('rice') || lower.includes('pasta') || lower.includes('oil') || lower.includes('honey') || lower.includes('peanut butter') || lower.includes('granola')) {
              categories['Pantry'].push({ name, ...data });
          } else if (lower.includes('whey') || lower.includes('snickers') || lower.includes('chocolate') || lower.includes('nut')) {
              categories['Snacks & Supplements'].push({ name, ...data });
          } else {
              categories['Other'].push({ name, ...data });
          }
      });
      return categories;
  }, [weeklyPlan, scaleRatio]);

  const isMetric = profile.units === UnitSystem.METRIC;

  useEffect(() => {
      if (!isCompleted) {
          onSaveProgress(checked, customDishes);
      }
  }, [checked, customDishes, isCompleted]);

  const handleToggle = (id: string) => {
    if(isCompleted) return;
    setChecked(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAIAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    
    try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64Data = ev.target?.result as string;
            // Strip data:image/jpeg;base64, header
            const cleanBase64 = base64Data.split(',')[1];
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const prompt = `
                Analyze this food image. Identify the main dish.
                Estimate the macros PER 100g.
                Return ONLY a valid JSON object. No markdown.
                Format:
                {
                    "name": "Dish Name",
                    "kcal_per_100g": 150,
                    "p_per_100g": 20,
                    "c_per_100g": 10,
                    "f_per_100g": 5
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: cleanBase64 } },
                        { text: prompt }
                    ]
                }
            });

            const text = response.text || "{}";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            setNewDish({
                name: data.name || "Unknown Ration",
                kcal: data.kcal_per_100g || 0,
                p: data.p_per_100g || 0,
                c: data.c_per_100g || 0,
                f: data.f_per_100g || 0,
                amount: 100,
                unit: 'g',
                isPer100g: true
            });
            setIsAddingCustom(true);
        };
        reader.readAsDataURL(file);

    } catch (error) {
        console.error("AI Analysis Failed", error);
        alert("SCAN FAILED. MANUAL ENTRY REQUIRED.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const addDish = () => {
    let finalKcal = newDish.kcal;
    let finalP = newDish.p;
    let finalC = newDish.c;
    let finalF = newDish.f;

    if (newDish.isPer100g && newDish.unit === 'g') {
        const factor = newDish.amount / 100;
        finalKcal *= factor;
        finalP *= factor;
        finalC *= factor;
        finalF *= factor;
    }

    const dishToAdd: CustomDish = {
        id: Date.now().toString(),
        name: `${newDish.name} (${newDish.amount}${newDish.unit})`,
        kcal: finalKcal,
        p: finalP,
        c: finalC,
        f: finalF,
        amount: newDish.amount,
        unit: newDish.unit
    };
    
    setCustomDishes(prev => [...prev, dishToAdd]);
    setIsAddingCustom(false);
    setNewDish({ name: '', kcal: 0, p: 0, c: 0, f: 0, amount: 100, unit: 'g', isPer100g: false });
  };

  const stats = useMemo(() => {
    let current = { kcal: 0, p: 0, c: 0, f: 0 };
    globalNutrition.forEach(meal => {
        if (checked.includes(meal.id)) {
            current.kcal += meal.kcal * scaleRatio;
            current.p += meal.p * scaleRatio;
            current.c += meal.c * scaleRatio;
            current.f += meal.f * scaleRatio;
        }
    });
    customDishes.forEach(dish => {
        if (checked.includes(dish.id)) {
            current.kcal += dish.kcal;
            current.p += dish.p;
            current.c += dish.c;
            current.f += dish.f;
        }
    });
    return current;
  }, [checked, customDishes, scaleRatio, globalNutrition]);

  const completionRate = Math.min(stats.kcal / (profile.kcal || 2500), 1);
  const isAllCompleted = globalNutrition.every(m => checked.includes(m.id));

  const handleFinish = (force: boolean = false) => {
      onSaveProgress(checked, customDishes);
      if (force) {
          if(!confirm("Confirm end of feeding cycle? Incomplete logs may affect Vit stats.")) return;
      }
      onComplete(`KCAL:${Math.round(stats.kcal)}/${profile.kcal}`, completionRate);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 pb-32 overflow-y-auto no-scrollbar animate-fade-in relative">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xs uppercase tracking-[0.5em] text-[#FF2A2A] mb-1 font-black">VIT Module</h2>
          <h1 className="text-3xl font-black uppercase text-white leading-none">Tactical Fueling</h1>
        </div>
        <button onClick={onBack} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest font-black">Abort</button>
      </header>

      {/* MACRO DASHBOARD */}
      <section className="bg-[#0a0a0a] border border-[#222] p-5 mb-6 sticky top-0 z-30 shadow-xl">
         <ProgressBar label="Energy (Kcal)" current={stats.kcal} max={profile.kcal} color="#FF2A2A" />
         <div className="grid grid-cols-3 gap-4">
            <ProgressBar label="Prot" current={stats.p} max={profile.protein} color="#00FF88" />
            <ProgressBar label="Carb" current={stats.c} max={profile.carbs} color="#00F0FF" />
            <ProgressBar label="Fat" current={stats.f} max={profile.fats} color="#FFB800" />
         </div>
         <button onClick={() => setShowWeeklyPlan(true)} className="w-full mt-4 bg-[#111] border border-[#222] text-white font-black py-3 uppercase tracking-widest hover:border-[#FF2A2A] transition-colors data-font text-[10px]">
             View Weekly Plan & Shopping List
         </button>
      </section>

      {showWeeklyPlan && (
          <div className="fixed inset-0 bg-black/95 z-[100] overflow-y-auto p-4 flex flex-col">
              <div className="flex justify-between items-center mb-6 mt-8">
                  <h2 className="text-xl font-black uppercase tracking-widest text-[#FF2A2A]">Weekly Logistics</h2>
                  <button onClick={() => setShowWeeklyPlan(false)} className="text-white font-black uppercase text-xs">Close [X]</button>
              </div>

              <div className="flex gap-4 mb-6">
                  <button onClick={() => setViewMode('simple')} className={`flex-1 py-3 uppercase text-[10px] font-black tracking-widest border ${viewMode === 'simple' ? 'bg-[#FF2A2A] text-white border-[#FF2A2A]' : 'bg-[#111] text-gray-500 border-[#222]'}`}>Simple View</button>
                  <button onClick={() => setViewMode('advanced')} className={`flex-1 py-3 uppercase text-[10px] font-black tracking-widest border ${viewMode === 'advanced' ? 'bg-[#FF2A2A] text-white border-[#FF2A2A]' : 'bg-[#111] text-gray-500 border-[#222]'}`}>Advanced View</button>
              </div>

              <div className="space-y-8 mb-12">
                  <h3 className="text-lg font-black uppercase text-white border-b border-[#222] pb-2">Weekly Meal Plan</h3>
                  {weeklyPlan.map((day, i) => (
                      <div key={i} className="border border-[#222] p-4 bg-[#0a0a0a]">
                          <h4 className="text-[#00FF88] font-black uppercase tracking-widest mb-4">{day.day}</h4>
                          <div className="space-y-4">
                              {day.meals.map(meal => (
                                  <div key={meal.id} className="border-l-2 border-[#FF2A2A] pl-4">
                                      <h5 className="text-white font-bold text-sm uppercase">{meal.name}</h5>
                                      {viewMode === 'simple' ? (
                                          <p className="text-gray-400 text-xs mt-1">{meal.items.map(item => item.name).join(', ')}</p>
                                      ) : (
                                          <p className="text-gray-400 text-xs mt-1 italic">{meal.preparation}</p>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>

              <div className="space-y-6 pb-20">
                  <h3 className="text-lg font-black uppercase text-white border-b border-[#222] pb-2">Shopping List (7 Days)</h3>
                  {Object.entries(shoppingList).map(([category, items]) => items.length > 0 && (
                      <div key={category} className="mb-6">
                          <h4 className="text-[#FF2A2A] font-black uppercase tracking-widest mb-3 text-xs">{category}</h4>
                          <div className="space-y-2">
                              {items.map((item, i) => {
                                  const isChecked = shoppingListChecked.includes(item.name);
                                  return (
                                      <div key={i} onClick={() => toggleShoppingItem(item.name)} className={`flex justify-between items-center p-3 border cursor-pointer transition-colors ${isChecked ? 'border-[#00FF88] bg-[#00FF88]/10' : 'border-[#222] bg-[#111] hover:border-gray-500'}`}>
                                          <span className={`text-sm font-bold uppercase ${isChecked ? 'text-[#00FF88] line-through opacity-50' : 'text-white'}`}>{item.name}</span>
                                          <span className={`text-xs data-font ${isChecked ? 'text-[#00FF88] opacity-50' : 'text-gray-400'}`}>{Math.round(item.amount)} {item.unit}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="space-y-4 mb-12">
        {/* BLUEPRINT MEALS */}
        {globalNutrition.map((meal) => {
          const isChecked = checked.includes(meal.id);
          return (
            <div key={meal.id} className={`border p-5 transition-all ${isChecked ? 'bg-[#00FF88]/5 border-[#00FF88]' : 'bg-[#0a0a0a] border-[#222] hover:border-[#FF2A2A]'}`}>
              <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-3">
                    <button onClick={() => handleToggle(meal.id)} className={`w-6 h-6 border flex items-center justify-center ${isChecked ? 'bg-[#00FF88] border-[#00FF88] text-black' : 'border-gray-600'}`}>
                        {isChecked && '✓'}
                    </button>
                    <h3 onClick={() => setSelectedMeal(meal)} className={`font-black tracking-widest uppercase text-xs cursor-pointer hover:underline ${isChecked ? 'text-[#00FF88]' : 'text-white'}`}>{meal.name}</h3>
                 </div>
                 <span className="text-[9px] data-font text-gray-500 font-bold">{Math.round(meal.kcal * scaleRatio)} KCAL</span>
              </div>
            </div>
          );
        })}

        {/* CUSTOM DISHES */}
        {customDishes.map((dish, idx) => {
             const isChecked = checked.includes(dish.id);
             return (
             <div key={dish.id} className={`border p-5 relative transition-all ${isChecked ? 'bg-[#FFB800]/10 border-[#FFB800]' : 'bg-[#0a0a0a] border-[#222] hover:border-[#FFB800]'}`}>
                <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-3">
                      <button onClick={() => handleToggle(dish.id)} className={`w-6 h-6 border flex items-center justify-center ${isChecked ? 'bg-[#FFB800] border-[#FFB800] text-black' : 'border-gray-600'}`}>
                          {isChecked && '✓'}
                      </button>
                      <h3 className={`font-black tracking-widest uppercase text-xs ${isChecked ? 'text-[#FFB800]' : 'text-white'}`}>{dish.name}</h3>
                   </div>
                   <span className="text-[9px] data-font text-[#FFB800] font-bold">{Math.round(dish.kcal)} KCAL</span>
                </div>
                {!isCompleted && <button onClick={() => setCustomDishes(customDishes.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-[8px] text-red-500 font-black">X</button>}
             </div>
             );
        })}
      </div>

      {!isCompleted && (
        <div className="grid grid-cols-2 gap-4 mb-4">
            <button onClick={() => { setIsAddingCustom(true); setNewDish({ name: '', kcal: 0, p: 0, c: 0, f: 0, amount: 100, unit: 'g', isPer100g: false }); }} className="border-2 border-dashed border-[#222] py-4 text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-[#FF2A2A] hover:border-[#FF2A2A] transition-all">
                + Manual Entry
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#00F0FF]/30 bg-[#00F0FF]/5 py-4 text-[10px] uppercase font-black tracking-widest text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-all flex items-center justify-center gap-2">
                {isAnalyzing ? <span className="animate-pulse">Analyzing...</span> : <>📷 AI Vision Scan</>}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleAIAnalysis} />
        </div>
      )}

      <div className="flex flex-col gap-3 mb-12">
        {!isCompleted && (
            <>
                <button 
                    onClick={() => {
                        if (isAllCompleted) {
                            handleFinish();
                        } else {
                            onSaveProgress(checked, customDishes);
                            onBack(); // Direct navigation back
                        }
                    }}
                    className={`w-full py-5 font-black uppercase tracking-[0.5em] text-black shadow-[0_0_20px_#FF2A2A] transition-all ${
                        isAllCompleted 
                        ? 'bg-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.4)]' 
                        : 'bg-[#FF2A2A] shadow-[0_0_20px_rgba(255,42,42,0.4)]'
                    }`}
                >
                    {isAllCompleted ? 'COMPLETE FEEDING CYCLE' : 'SAVE PROGRESS'}
                </button>

                {!isAllCompleted && (
                    <button 
                        onClick={() => handleFinish(true)}
                        className="w-full py-3 text-[10px] uppercase font-black text-gray-600 hover:text-[#FF2A2A] tracking-widest"
                    >
                        Force End Day
                    </button>
                )}
            </>
        )}

        {isCompleted && (
            <button disabled className="w-full py-5 bg-[#00FF88] text-black font-black uppercase tracking-[0.5em] cursor-not-allowed">
                NUTRITION LOGGED
            </button>
        )}
      </div>

      {/* MEAL DETAIL MODAL */}
      {selectedMeal && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedMeal(null)}>
              <div className="bg-[#0a0a0a] border border-[#00FF88] p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-black uppercase text-[#00FF88] mb-4 border-b border-[#333] pb-2">{selectedMeal.name}</h2>
                  
                  <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Tactical Ingredients (Scaled)</h3>
                  <ul className="space-y-2 mb-6">
                      {selectedMeal.items.map((item, i) => (
                          <li key={i} className="flex justify-between text-sm border-b border-[#222] pb-1">
                              <span className="text-white uppercase font-bold text-xs">{item.name}</span>
                              <span className="text-[#00FF88] font-mono text-xs">{Math.round(item.base * scaleRatio)} {item.unit}</span>
                          </li>
                      ))}
                  </ul>

                  <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Execution (Preparation)</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono mb-6">{selectedMeal.preparation || "No tactical instructions available."}</p>

                  <button onClick={() => setSelectedMeal(null)} className="w-full py-3 bg-[#00FF88] text-black font-black uppercase text-xs">Close Intel</button>
              </div>
          </div>
      )}

      {/* CUSTOM DISH MODAL */}
      {isAddingCustom && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-[#FF2A2A] p-6 shadow-[0_0_30px_#FF2A2A40]">
               <h3 className="text-white font-black uppercase tracking-widest mb-6">New Nutrient Source</h3>
               <div className="space-y-4">
                  <input placeholder="Dish Name" value={newDish.name} onChange={e => setNewDish({...newDish, name: e.target.value})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A] uppercase" />
                  
                  <div className="flex gap-4 items-center">
                     <label className="text-[9px] uppercase font-bold text-gray-500">Mode:</label>
                     <button onClick={() => setNewDish({...newDish, isPer100g: false})} className={`px-2 py-1 text-[9px] uppercase font-black border ${!newDish.isPer100g ? 'bg-[#FF2A2A] text-black' : 'text-gray-500'}`}>Total</button>
                     <button onClick={() => setNewDish({...newDish, isPer100g: true})} className={`px-2 py-1 text-[9px] uppercase font-black border ${newDish.isPer100g ? 'bg-[#FF2A2A] text-black' : 'text-gray-500'}`}>Per 100g</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[8px] uppercase text-gray-500">Kcal</label>
                        <input type="number" value={newDish.kcal || ''} onChange={e => setNewDish({...newDish, kcal: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A]" />
                     </div>
                     <div className="flex gap-2">
                        <div className="flex-grow">
                            <label className="text-[8px] uppercase text-gray-500">Amount</label>
                            <input type="number" value={newDish.amount || ''} onChange={e => setNewDish({...newDish, amount: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A]" />
                        </div>
                        <div className="w-20">
                            <label className="text-[8px] uppercase text-gray-500">Unit</label>
                            <select value={newDish.unit} onChange={e => setNewDish({...newDish, unit: e.target.value as MeasureUnit})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none">
                                <option value="g">Gram</option>
                                <option value="ml">ML</option>
                                <option value="pcs">Pcs</option>
                                <option value="scoop">Scoop</option>
                                <option value="bowl">Bowl</option>
                                <option value="bag">Bag</option>
                            </select>
                        </div>
                     </div>
                     <div><label className="text-[8px] uppercase text-gray-500">Prot</label><input type="number" value={newDish.p || ''} onChange={e => setNewDish({...newDish, p: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A]" /></div>
                     <div><label className="text-[8px] uppercase text-gray-500">Carb</label><input type="number" value={newDish.c || ''} onChange={e => setNewDish({...newDish, c: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A]" /></div>
                     <div><label className="text-[8px] uppercase text-gray-500">Fat</label><input type="number" value={newDish.f || ''} onChange={e => setNewDish({...newDish, f: Number(e.target.value)})} className="w-full bg-black border border-[#222] p-3 text-white text-xs outline-none focus:border-[#FF2A2A]" /></div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setIsAddingCustom(false)} className="flex-1 py-3 border border-[#333] text-gray-500 text-[10px] font-black uppercase">Cancel</button>
                     <button onClick={addDish} className="flex-1 py-3 bg-[#FF2A2A] text-black text-[10px] font-black uppercase">Inject</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
