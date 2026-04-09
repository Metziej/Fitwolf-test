
import React from 'react';
import { SystemState, Goal } from '../types.ts';
import { WORKOUT_CYCLE as WorkoutData } from '../constants.tsx';
import { t } from '../translations.ts';
import { getRankInfo, getRankProgress, RANKS } from '../App.tsx';

// ── Overtraining detector ────────────────────────────────────────────────────
function getConsecutiveTrainingDays(history: any[]): number {
  if (!history || history.length === 0) return 0;
  const strDates = [...new Set(
    history
      .filter(e => e.type === 'STR')
      .map(e => new Date(e.date).toISOString().split('T')[0])
  )].sort().reverse();

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const dateStr of strDates) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((checkDate.getTime() - d.getTime()) / 86400000);
    if (diffDays === streak) {
      streak++;
      checkDate = d;
    } else {
      break;
    }
  }
  return streak;
}

// ── Dynamische stat-teksten ───────────────────────────────────────────────────
function getStatInsight(stats: { str: number; vit: number; int: number; recovery: number }): string | null {
  const { str, vit, int, recovery } = stats;
  if (vit < 5) return '⚠️ Je voedsel-inname stagneert je kracht. Log je maaltijden.';
  if (str > 20 && int < 5) return '🧠 Je bent sterk, maar traint je brein niet. Lees de Codex.';
  if (recovery < 5) return '😴 Je body is in de rode zone. Prioriteer slaap en voeding.';
  if (str > 30 && vit > 20) return '🔥 Elite statistieken gedetecteerd. Je bent op de goede weg, Wolf.';
  return null;
}

interface DashboardProps {
  state: SystemState;
  onOpenQuest: (id: string) => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onUpdateLanguage: (lang: string) => void;
}

export default function Dashboard({ state, onOpenQuest, onOpenHistory, onOpenProfile, onLogout, onUpdateLanguage }: DashboardProps) {
  const currentWorkout = WorkoutData[state.currentWorkoutIndex];
  // Rank-gebaseerde XP voortgang — toont progress naar VOLGENDE rank
  const currentXp = state.currentUser?.xp ?? state.xp;
  const rankInfo = getRankInfo(currentXp);
  const progressPercent = getRankProgress(currentXp);
  const nextRank = RANKS.find(r => r.xpRequired > rankInfo.xpRequired);
  const xpToNext = nextRank ? nextRank.xpRequired - currentXp : 0;
  const protocolName = state.currentUser?.goal === Goal.CUT ? "PREDATOR" : "JUGGERNAUT";
  const lang = state.currentUser?.language || 'nl';

  // ── Wolf Streak ──────────────────────────────────────────────────────────
  const streak = state.currentUser?.streak || 0;
  const lastActive = state.currentUser?.lastActiveDate;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const streakBroken = streak > 0 && lastActive && lastActive < yesterday;

  // ── Overtraining detector ─────────────────────────────────────────────────
  const allHistory = state.currentUser?.history || state.history || [];
  const consecutiveDays = getConsecutiveTrainingDays(allHistory);
  const showOvertrainingWarning = consecutiveDays >= 3;

  // ── Dynamische stat insight ───────────────────────────────────────────────
  const stats = state.currentUser?.stats || { str: 0, vit: 0, int: 0, recovery: 0 };
  const statInsight = getStatInsight(stats);

  const getFlag = (language: string) => {
    switch (language) {
      case 'nl':
        return (
          <>
            <div className="bg-[#AE1C28] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#FFFFFF] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#21468B] flex-1 w-full pointer-events-none"></div>
          </>
        );
      case 'de':
        return (
          <>
            <div className="bg-[#000000] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#DD0000] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#FFCE00] flex-1 w-full pointer-events-none"></div>
          </>
        );
      case 'fr':
        return (
          <div className="flex w-full h-full pointer-events-none">
            <div className="bg-[#002395] flex-1 h-full"></div>
            <div className="bg-[#FFFFFF] flex-1 h-full"></div>
            <div className="bg-[#ED2939] flex-1 h-full"></div>
          </div>
        );
      case 'es':
        return (
          <>
            <div className="bg-[#AA151B] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#F1BF00] flex-1 w-full pointer-events-none"></div>
            <div className="bg-[#AA151B] flex-1 w-full pointer-events-none"></div>
          </>
        );
      case 'en':
      default:
        return (
          <div className="relative w-full h-full bg-[#012169] pointer-events-none overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[15%] bg-white absolute"></div>
              <div className="h-full w-[15%] bg-white absolute"></div>
              <div className="w-full h-[8%] bg-[#C8102E] absolute"></div>
              <div className="h-full w-[8%] bg-[#C8102E] absolute"></div>
            </div>
          </div>
        );
    }
  };

  // Calculate Progress for display
  const dailyProgress = state.currentUser?.dailyProgress;
  
  // STR Progress Calculation
  let strStatus = "S";
  let strColor = "text-gray-500";
  let strBorder = "border-[#333]";
  let strBg = "bg-[#0a0a0a]"; // Tile Background
  let strIconBg = "bg-[#111]"; // Icon Box Background
  
  if (state.dailyQuests.str) {
      strStatus = "✓";
      strColor = "text-[#00FF88]";
      strBorder = "border-[#00FF88]";
      strBg = "bg-[#00FF88]/5";
      strIconBg = "bg-[#00FF88]/10";
  } else if (dailyProgress?.str?.exercises?.length > 0) {
      const completed = dailyProgress.str.exercises.filter(e => e.completed).length;
      const total = dailyProgress.str.exercises.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      if (pct > 0) {
          strStatus = `${pct}%`;
          strColor = "text-[#FFB800]";
          strBorder = "border-[#FFB800]";
          strBg = "bg-[#FFB800]/5";
          strIconBg = "bg-[#FFB800]/10";
      }
  }

  // VIT Progress Calculation
  let vitStatus = "V";
  let vitColor = "text-gray-500";
  let vitBorder = "border-[#333]";
  let vitBg = "bg-[#0a0a0a]";
  let vitIconBg = "bg-[#111]";

  if (state.dailyQuests.vit) {
      vitStatus = "✓";
      vitColor = "text-[#00FF88]";
      vitBorder = "border-[#00FF88]";
      vitBg = "bg-[#00FF88]/5";
      vitIconBg = "bg-[#00FF88]/10";
  } else if (dailyProgress?.vit?.checkedMeals?.length > 0) {
      // Dynamisch op basis van het totaal maaltijden — niet hardcoded op 6
      const totalMeals = (state.globalSystemData?.globalNutrition?.length || 6);
      const pct = Math.min(Math.round((dailyProgress.vit.checkedMeals.length / totalMeals) * 100), 99);
      if (pct > 0) {
          vitStatus = `${pct}%`;
          vitColor = "text-[#FFB800]";
          vitBorder = "border-[#FFB800]";
          vitBg = "bg-[#FFB800]/5";
          vitIconBg = "bg-[#FFB800]/10";
      }
  }

  // INT Progress Calculation
  let intStatus = "I";
  let intColor = "text-gray-500";
  let intBorder = "border-[#333]";
  let intBg = "bg-[#0a0a0a]";
  let intIconBg = "bg-[#111]";

  if (state.dailyQuests.int) {
      intStatus = "✓";
      intColor = "text-[#00FF88]";
      intBorder = "border-[#00FF88]";
      intBg = "bg-[#00FF88]/5";
      intIconBg = "bg-[#00FF88]/10";
  }

  return (
    <div className="flex flex-col justify-between p-4 max-w-xl mx-auto min-h-screen pb-32">
      <header className="flex justify-between items-start pt-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
             <div className="text-[#FF2A2A] font-black text-3xl leading-none italic tracking-tighter uppercase">{state.rank}</div>
             <div className="w-1.5 h-1.5 rounded-full bg-[#FF2A2A] animate-pulse"></div>
          </div>
          <div className="glitch-wrapper">
            <h1 className="glitch text-lg font-black uppercase text-white tracking-widest leading-none" data-text={t(lang, 'hub_title')}>{t(lang, 'hub_title')}</h1>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Protocol: <span className="text-[#FF2A2A]">{protocolName}</span></p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative group" tabIndex={0}>
                <button className="w-8 h-8 flex flex-col border border-[#333] hover:border-[#FF2A2A] transition-all overflow-hidden opacity-80 hover:opacity-100 focus:outline-none">
                    {getFlag(lang)}
                </button>
                <div className="absolute right-0 top-full mt-2 w-40 bg-black border border-[#333] hidden group-hover:block group-focus-within:block z-50">
                   <button onClick={() => {
                       const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                       if (select) { select.value = 'en'; select.dispatchEvent(new Event('change')); }
                       onUpdateLanguage('en');
                   }} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-black text-white hover:bg-[#FF2A2A] hover:text-black uppercase">
                       <div className="w-5 h-5 flex flex-col border border-[#333] overflow-hidden">{getFlag('en')}</div>
                       English
                   </button>
                   <button onClick={() => {
                       const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                       if (select) { select.value = 'nl'; select.dispatchEvent(new Event('change')); }
                       onUpdateLanguage('nl');
                   }} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-black text-white hover:bg-[#FF2A2A] hover:text-black uppercase">
                       <div className="w-5 h-5 flex flex-col border border-[#333] overflow-hidden">{getFlag('nl')}</div>
                       Nederlands
                   </button>
                   <button onClick={() => {
                       const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                       if (select) { select.value = 'de'; select.dispatchEvent(new Event('change')); }
                       onUpdateLanguage('de');
                   }} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-black text-white hover:bg-[#FF2A2A] hover:text-black uppercase">
                       <div className="w-5 h-5 flex flex-col border border-[#333] overflow-hidden">{getFlag('de')}</div>
                       Deutsch
                   </button>
                   <button onClick={() => {
                       const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                       if (select) { select.value = 'fr'; select.dispatchEvent(new Event('change')); }
                       onUpdateLanguage('fr');
                   }} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-black text-white hover:bg-[#FF2A2A] hover:text-black uppercase">
                       <div className="w-5 h-5 flex flex-col border border-[#333] overflow-hidden">{getFlag('fr')}</div>
                       Français
                   </button>
                   <button onClick={() => {
                       const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                       if (select) { select.value = 'es'; select.dispatchEvent(new Event('change')); }
                       onUpdateLanguage('es');
                   }} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-black text-white hover:bg-[#FF2A2A] hover:text-black uppercase">
                       <div className="w-5 h-5 flex flex-col border border-[#333] overflow-hidden">{getFlag('es')}</div>
                       Español
                   </button>
                </div>
            </div>
            <button onClick={onOpenProfile} className="p-2 border border-[#333] hover:border-[#FF2A2A] group transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-[#FF2A2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
      </header>

      <section className="bg-white/5 border border-white/10 p-4 mt-4">
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.3em] text-gray-400 font-black">{t(lang, 'evolution_progress')}</span>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: rankInfo.color }}>
              [{rankInfo.rank}-RANK]
            </span>
          </div>
          <span className="text-[10px] font-black data-font" style={{ color: rankInfo.color }}>
            {currentXp} XP {nextRank ? `· ${xpToNext} → ${nextRank.rank}` : '· MAX RANK'}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 relative overflow-hidden">
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${progressPercent}%`, backgroundColor: rankInfo.color, boxShadow: `0 0 10px ${rankInfo.color}` }}
          />
        </div>
      </section>

      {/* ── Wolf Streak ─────────────────────────────────────────────────── */}
      {streak > 0 && !streakBroken && (
        <div className="flex items-center gap-2 mt-3 px-1">
          <span className="text-lg">🔥</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">
            {streak} dag{streak !== 1 ? 'en' : ''} streak
          </span>
          <span className="text-[9px] text-gray-600 ml-1">— blijf actief!</span>
        </div>
      )}
      {streakBroken && streak > 0 && (
        <div className="mt-3 border border-[#FF2A2A]/40 bg-[#FF2A2A]/5 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#FF2A2A]">
            ⚠️ Streak verbroken! Was {streak} dagen. Comeback Missie: log vandaag een training.
          </p>
        </div>
      )}

      {/* ── Overtraining waarschuwing ────────────────────────────────────── */}
      {showOvertrainingWarning && (
        <div className="mt-3 border border-[#FF8800]/60 bg-[#FF8800]/5 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#FF8800]">
            ⚠️ {consecutiveDays} trainingsdagen op rij — Pas op voor overtraining. Rust is essentieel voor spiergroei.
          </p>
        </div>
      )}

      {/* ── Stat Insight ────────────────────────────────────────────────── */}
      {statInsight && (
        <div className="mt-3 border border-[#333] bg-white/3 p-3">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">{statInsight}</p>
        </div>
      )}

      <div className="flex-grow flex flex-col justify-center space-y-3 my-8">
        <h2 className="text-[9px] uppercase tracking-[0.4em] text-gray-600 font-black border-l-2 border-gray-800 pl-2">Active Objectives</h2>
        
        <button onClick={() => onOpenQuest('str')} className={`flex items-center justify-between p-4 border transition-all ${strBg} ${strBorder} hover:border-[#FF2A2A]/50`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 flex items-center justify-center border-2 font-black text-xs ${strIconBg} ${strColor} ${strBorder.replace('/20', '')} ${strStatus.includes('%') ? 'text-[10px]' : ''}`}>
                {strStatus}
            </div>
            <div className="text-left">
              <h3 className={`font-black tracking-widest text-sm uppercase ${state.dailyQuests.str ? 'text-[#00FF88]' : 'text-white'}`}>STR: {currentWorkout?.title?.split(' ')[0] || 'REST'}</h3>
              <p className="text-[8px] text-gray-500 uppercase font-bold">{t(lang, 'str_module')}</p>
            </div>
          </div>
          <div className="text-[9px] text-[#FF2A2A] font-black">+100 XP</div>
        </button>

        <button onClick={() => onOpenQuest('vit')} className={`flex items-center justify-between p-4 border transition-all ${vitBg} ${vitBorder} hover:border-[#FF2A2A]/50`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 flex items-center justify-center border-2 font-black text-xs ${vitIconBg} ${vitColor} ${vitBorder.replace('/20', '')} ${vitStatus.includes('%') ? 'text-[10px]' : ''}`}>
                {vitStatus}
            </div>
            <div className="text-left"><h3 className={`font-black tracking-widest text-sm uppercase ${state.dailyQuests.vit ? 'text-[#00FF88]' : 'text-white'}`}>VIT: {t(lang, 'vit_module')}</h3></div>
          </div>
          <div className="text-[9px] text-[#FF2A2A] font-black">+25 XP</div>
        </button>

        <button onClick={() => onOpenQuest('int')} className={`flex items-center justify-between p-4 border transition-all ${intBg} ${intBorder} hover:border-[#FF2A2A]/50`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 flex items-center justify-center border-2 font-black text-xs ${intIconBg} ${intColor} ${intBorder.replace('/20', '')}`}>{intStatus}</div>
            <div className="text-left"><h3 className={`font-black tracking-widest text-sm uppercase ${state.dailyQuests.int ? 'text-[#00FF88]' : 'text-white'}`}>INT: {t(lang, 'int_module')}</h3></div>
          </div>
          <div className="text-[9px] text-[#FF2A2A] font-black">+25 XP</div>
        </button>
      </div>

      <div className="space-y-2 mb-2">
        <button onClick={onOpenHistory} className="w-full bg-white/5 border border-white/10 py-3 text-[9px] uppercase font-black tracking-widest text-gray-500 hover:text-white transition-all">{t(lang, 'battle_logs')}</button>
        <button onClick={() => onOpenQuest('personal')} className="w-full bg-[#FF2A2A] text-black py-4 text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_0_20px_rgba(255,42,42,0.3)] italic">
          {t(lang, 'command_center_btn')}
        </button>
      </div>
    </div>
  );
}
