
import React, { useState, useEffect } from 'react';
import { SystemState, Goal, UserProfile, UserRole, UnitSystem, GlobalSystemData, BattleLogEntry, AccessTier, Product, DailyProgress } from './types.ts';
import { WORKOUT_CYCLE, NUTRITION_BLUEPRINT, DEFAULT_MINDSET } from './constants.tsx';
import Auth from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import STRTracker from './components/STRTracker.tsx';
import VITNutrition from './components/VITNutrition.tsx';
import INTMindset from './components/INTMindset.tsx';
import ProfileEdit from './components/ProfileEdit.tsx';
import NavigationDock from './components/NavigationDock.tsx';
import Armory from './components/Armory.tsx';
import Guild from './components/Guild.tsx';
import SystemArchitect from './components/SystemArchitect.tsx';
import BattleLog from './components/BattleLog.tsx';
import PersonalCommand from './components/PersonalCommand.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import XPPopup from './components/XPPopup.tsx';
import AlphaReport from './components/AlphaReport.tsx';
import SubscriptionManager from './components/SubscriptionManager.tsx';
import ReferralPanel from './components/ReferralPanel.tsx';
import ExerciseProgressChart from './components/ExerciseProgressChart.tsx';
import EventBanner from './components/EventBanner.tsx';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const STORAGE_KEY = 'fitwolf_v18_persistence_fix';

// ─── Rank Systeem ────────────────────────────────────────────────────────────
// Gebaseerd op het E→S rank systeem uit goal.md
export interface RankInfo {
  label: string;       // Bijv. "E-Rank: Weak Hunter"
  rank: string;        // Bijv. "E"
  xpRequired: number;  // Minimaal XP voor dit rank
  xpNext: number;      // XP voor volgend rank (Infinity voor S)
  color: string;
}

export const RANKS: RankInfo[] = [
  { label: "E-Rank: Weak Hunter",  rank: "E", xpRequired: 0,     xpNext: 500,   color: "#8A8A8A" },
  { label: "D-Rank: Iron Wolf",    rank: "D", xpRequired: 500,   xpNext: 1500,  color: "#7EC8E3" },
  { label: "C-Rank: Steel Wolf",   rank: "C", xpRequired: 1500,  xpNext: 4000,  color: "#00FF88" },
  { label: "B-Rank: Dark Wolf",    rank: "B", xpRequired: 4000,  xpNext: 10000, color: "#9B59B6" },
  { label: "A-Rank: Blood Wolf",   rank: "A", xpRequired: 10000, xpNext: 25000, color: "#FFB800" },
  { label: "S-Rank: Alfa Wolf",    rank: "S", xpRequired: 25000, xpNext: Infinity, color: "#FF2A2A" },
];

export function getRankInfo(xp: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].xpRequired) return RANKS[i];
  }
  return RANKS[0];
}

export function getRankProgress(xp: number): number {
  const rank = getRankInfo(xp);
  if (rank.xpNext === Infinity) return 100;
  const progress = xp - rank.xpRequired;
  const total = rank.xpNext - rank.xpRequired;
  return Math.min(Math.round((progress / total) * 100), 100);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Referral Code Generator ─────────────────────────────────────────────────
function generateReferralCode(username: string): string {
  const base = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${base}-${rand}`;
}

// ─── Active Seasonal Event Helper ────────────────────────────────────────────
function getActiveSeasonalEvent(globalData: GlobalSystemData) {
  const today = new Date().toISOString().slice(0, 10);
  return (globalData.seasonalEvents || []).find(
    e => e.startDate <= today && today <= e.endDate
  ) || null;
}

const INITIAL_TIERS: AccessTier[] = [
    { id: "free",   name: "Pup (Free)",            price: 0,  perks: ["Dashboard", "Tracker", "Akte I (2 weken)"],                 color: "#8A8A8A" },
    { id: "shadow", name: "Shadow Hunter",          price: 37, perks: ["Akte I + II", "Lean & Mean Blueprint", "D/C-Rank unlock"], color: "#7EC8E3" },
    { id: "wolf",   name: "Pack Member (Wolf)",     price: 47, perks: ["Alles", "Volledige Vault", "Alle Aktes", "Community"],     color: "#FF2A2A" },
];

const INITIAL_GLOBAL_DATA: GlobalSystemData = {
  guildBoss: { name: "VOID TITAN", maxHp: 1000000, currentHp: 842500 },
  raidOrders: [
    { id: 'ro1', title: 'AEROBIC STEALTH: 5KM', description: 'EXECUTE 5KM RECON.', xpReward: 300, isCompleted: false, aspectRatio: '16:9', frequency: 'WEEKLY' },
    { id: 'ro2', title: 'TITAN GRIP: 100 REPS', description: 'TOTAL PULL VOLUME.', xpReward: 450, isCompleted: false, aspectRatio: '16:9', frequency: 'DAILY' }
  ],
  shopProducts: [
    { id: 'p1', name: 'WHEY: SHADOW ED.', price: 44.99, originalPrice: 59.99, discountLabel: '25% OFF', category: 'Supplements', image: '🧬', buff: '+15 RECOVERY' },
    { id: 'p2', name: 'CREATINE MONOLITH', price: 29.99, category: 'Supplements', image: '🧊', buff: '+10 STRENGTH' }
  ],
  discountCodes: [{ code: 'WOLF10', percentage: 10 }],
  globalWorkouts: WORKOUT_CYCLE,
  globalNutrition: NUTRITION_BLUEPRINT,
  globalMindset: DEFAULT_MINDSET,
  accessTiers: INITIAL_TIERS,
  programs: [
      {
          id: "prog_main",
          title: "STANDARD OPERATION",
          description: "The default loop for new hunters.",
          tierId: "free",
          isActive: true,
          weeks: [{ weekNumber: 1, days: Array.from({length: 7}, (_, i) => ({ dayNumber: i+1, title: "Standard Day", workoutId: (i % 3).toString(), nutritionId: "m1", mindsetId: "1", isRestDay: i === 6 })) }]
      }
  ],
  dashboardConfig: { bgImage: "", showCharacter: false }
};

export default function App() {
  const [state, setState] = useState<SystemState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      isLoggedIn: false, currentUser: null, users: [], xp: 0, rank: RANKS[0].label,
      dailyQuests: { str: false, vit: false, int: false }, history: [],
      activeTab: 'COMMAND', globalSystemData: INITIAL_GLOBAL_DATA, currentWorkoutIndex: 0, messages: []
    };
  });

  const [masqueradeId, setMasqueradeId] = useState<string | null>(null);
  const [subScreen, setSubScreen] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [xpPopup, setXpPopup] = useState<{ amount: number; type: 'STR' | 'VIT' | 'INT' } | null>(null);
  const [showAlphaReport, setShowAlphaReport] = useState(false);
  const [showInactivityBanner, setShowInactivityBanner] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Load global system data
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) {
          setState(prev => ({ ...prev, globalSystemData: configSnap.data() as GlobalSystemData }));
        }
      } catch (error) {
        console.error("Failed to load system config:", error);
      }

      if (user) {
        // User is signed in, fetch profile from Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = { ...userSnap.data() as UserProfile, id: user.uid };

            // isBanned check — gebande users worden direct uitgelogd
            if (userData.isBanned) {
              await signOut(auth);
              setState(prev => ({ ...prev, isLoggedIn: false, currentUser: null }));
              setIsAuthLoading(false);
              alert('[SYSTEM] Account suspended. Contact support.');
              return;
            }

            // Rank dynamisch bepalen op basis van opgeslagen XP
            const userXp = userData.xp || 0;
            const rankInfo = getRankInfo(userXp);

            setState(prev => ({
              ...prev,
              isLoggedIn: true,
              currentUser: userData,
              rank: rankInfo.label,
              xp: userXp,
              currentWorkoutIndex: userData.currentDayIndex ?? prev.currentWorkoutIndex,
              users: prev.users.some(u => u.id === userData.id) ? prev.users : [...prev.users, userData]
            }));

            // ── Referral code aanmaken als die ontbreekt ──────────────────
            if (!userData.referralCode) {
              const code = generateReferralCode(userData.username || 'WOLF');
              setDoc(doc(db, 'users', user.uid), { referralCode: code }, { merge: true }).catch(() => {});
            }

            // ── Onboarding e-mails: dag 0 direct na registratie ──────────
            const emailsSent = userData.onboardingEmailsSent || [];
            if (!emailsSent.includes('day0') && userData.email) {
              fetch('/api/send-onboarding-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toEmail: userData.email, username: userData.username || 'Jager', day: 0 }),
              }).then(() => {
                setDoc(doc(db, 'users', user.uid), { onboardingEmailsSent: [...emailsSent, 'day0'] }, { merge: true }).catch(() => {});
              }).catch(() => {});
            }
          } else {
            // New user, profile will be created during registration or first login
            setState(prev => ({ ...prev, isLoggedIn: true }));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        // User is signed out
        setState(prev => ({ ...prev, isLoggedIn: false, currentUser: null }));
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state.isLoggedIn && state.currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // ── Guild Chat: real-time Firestore listener ──────────────────────────────
  useEffect(() => {
    if (!state.isLoggedIn) return;

    const messagesQuery = query(
      collection(db, 'guild', 'main', 'messages'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(prev => ({ ...prev, messages: msgs }));
    }, (error) => {
      console.error('[FitWolf] Guild messages listener error:', error);
    });

    return () => unsubscribe();
  }, [state.isLoggedIn]);
  // ─────────────────────────────────────────────────────────────────────────

  // Daily Progress Reset Logic — met dag-advance en skip-beveiliging
  useEffect(() => {
      if (!state.currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      const currentProgress = state.currentUser.dailyProgress;

      if (!currentProgress || currentProgress.date !== today) {
          // Nieuwe dag: kijk of gisteren STR gedaan was
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const history = state.currentUser.history || [];
          const didSTRYesterday = history.some(
              e => e.type === 'STR' && new Date(e.date).toISOString().split('T')[0] === yesterday
          );

          const workoutCount = state.globalSystemData.globalWorkouts.length || 3;
          const currentDayIndex = state.currentUser.currentDayIndex ?? state.currentWorkoutIndex;
          // Alleen doorschuiven als gisteren getraind — anders zelfde workout opnieuw
          const newDayIndex = didSTRYesterday
              ? (currentDayIndex + 1) % workoutCount
              : currentDayIndex;

          const newProgress: DailyProgress = {
              date: today,
              str: { workoutId: '', exercises: [] },
              vit: { checkedMeals: [], customDishes: [] },
              int: { completedSteps: [] }
          };

          updateProfile({ dailyProgress: newProgress, currentDayIndex: newDayIndex });
          setState(prev => ({ ...prev, currentWorkoutIndex: newDayIndex }));
      }
  }, [state.currentUser?.id, new Date().toISOString().split('T')[0]]); // Check bij user-change of datum-change

  // ── Alpha Report trigger (elke zondag) ────────────────────────────────────
  useEffect(() => {
    if (!state.currentUser) return;
    const dayOfWeek = new Date().getDay(); // 0 = zondag
    if (dayOfWeek !== 0) return;

    const today = new Date().toISOString().split('T')[0];
    const reports = state.currentUser.weeklyReports || [];
    const alreadyReportedToday = reports.some(r => r.date === today);

    if (!alreadyReportedToday) {
      setShowAlphaReport(true);
    }
  }, [state.currentUser?.id]);

  // ── Inactiviteit detectie (3 dagen geen log) ──────────────────────────────
  useEffect(() => {
    if (!state.currentUser) return;
    const lastActive = state.currentUser.lastActiveDate;
    if (!lastActive) return;

    const daysSinceActive = Math.floor(
      (Date.now() - new Date(lastActive).getTime()) / 86400000
    );

    if (daysSinceActive >= 3) {
      setShowInactivityBanner(true);
      // Push notificatie indien beschikbaar
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('[SYSTEEM] FitWolf Waarschuwing', {
          body: 'Je spieren atrofiëren. Meld je in de trainingszaal.',
          icon: '/icon-192.png',
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, [state.currentUser?.id, state.currentUser?.lastActiveDate]);

  useEffect(() => {
      const handleLangChange = (e: Event) => {
          const customEvent = e as CustomEvent<string>;
          if (customEvent.detail) {
              updateProfile({ language: customEvent.detail });
          }
      };
      window.addEventListener('changeLanguage', handleLangChange);
      return () => window.removeEventListener('changeLanguage', handleLangChange);
  }, [state.currentUser?.id]);

  useEffect(() => {
      const lang = state.currentUser?.language || localStorage.getItem('fitwolf_language') || 'nl';
      if (state.currentUser?.language) {
          localStorage.setItem('fitwolf_language', state.currentUser.language);
      }
      
      // Set Google Translate cookie directly for faster and more reliable translation
      document.cookie = `googtrans=/en/${lang}; path=/`;
      document.cookie = `googtrans=/en/${lang}; domain=${window.location.hostname}; path=/`;

      let retries = 0;
      const applyLanguage = () => {
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (select) {
              if (select.value !== lang) {
                  select.value = lang;
                  select.dispatchEvent(new Event('change'));
              }
          } else if (retries < 10) {
              retries++;
              setTimeout(applyLanguage, 500);
          }
      };
      applyLanguage();
  }, [state.currentUser?.language]);

  const effectiveUser = masqueradeId 
    ? state.users.find(u => u.id === masqueradeId) || state.currentUser 
    : state.currentUser;

  const isAdmin = state.currentUser?.role?.toUpperCase() === UserRole.ADMIN || 
                  state.currentUser?.email === 'michael.j.metz93@gmail.com' || 
                  state.currentUser?.email === 'michael_metz@live.nl' ||
                  state.currentUser?.email?.toLowerCase().includes('admin');
  const isMasquerading = !!masqueradeId;

  const isCompletedToday = (type: 'STR' | 'VIT' | 'INT') => {
      const history = effectiveUser?.history || state.history;
      if (!history) return false;
      const today = new Date().toISOString().split('T')[0];
      return history.some(entry => entry && entry.type === type && new Date(entry.date).toISOString().split('T')[0] === today);
  };

  const handleLogin = (user: UserProfile) => {
    // This is now handled by onAuthStateChanged, but we can use it to update state immediately if needed
    setState(prev => ({
      ...prev, isLoggedIn: true, currentUser: user,
      users: prev.users.some(u => u.id === user.id) ? prev.users : [...prev.users, user]
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setState(prev => ({
        ...prev,
        isLoggedIn: false,
        currentUser: null,
        activeTab: 'COMMAND'
      }));
      setSubScreen(null);
      setMasqueradeId(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = (data: any) => {
    const targetId = effectiveUser?.id;
    if (!targetId) return;

    setState(prev => {
      const userToUpdate = masqueradeId 
        ? prev.users.find(u => u.id === masqueradeId) || prev.currentUser 
        : prev.currentUser;
      
      if (!userToUpdate || userToUpdate.id !== targetId) return prev;

      const updatedUser = { ...userToUpdate, ...data };

      // Firestore update (non-blocking for UI snappiness) — write only changed fields to avoid race conditions
      setDoc(doc(db, 'users', targetId), data, { merge: true })
        .catch(error => console.error('[FitWolf] updateProfile write failed:', error));

      return {
        ...prev, 
        currentUser: !masqueradeId && prev.currentUser?.id === targetId ? updatedUser : prev.currentUser,
        users: prev.users.map(u => u.id === targetId ? updatedUser : u)
      };
    });
  };

  // Dedicated Save Progress Handlers
  const saveStrProgress = async (workoutId: string, exercises: any[]) => {
      const today = new Date().toISOString().split('T')[0];
      const userToUpdate = masqueradeId 
        ? state.users.find(u => u.id === masqueradeId) || state.currentUser 
        : state.currentUser;
      
      if (!userToUpdate) return;
      
      const currentProgress = userToUpdate.dailyProgress || { 
          date: today, 
          str: { workoutId: "", exercises: [] }, 
          vit: { checkedMeals: [], customDishes: [] }, 
          int: { completedSteps: [] } 
      };
      
      const updatedProgress = {
          ...currentProgress,
          str: { workoutId, exercises }
      };

      const updatedUser = { ...userToUpdate, dailyProgress: updatedProgress };

      try {
          // Sla alleen dailyProgress op om race conditions met andere saves te voorkomen
          await setDoc(doc(db, 'users', userToUpdate.id), { dailyProgress: updatedProgress }, { merge: true });
          setState(prev => ({
            ...prev,
            currentUser: !masqueradeId && prev.currentUser?.id === userToUpdate.id ? updatedUser : prev.currentUser,
            users: prev.users.map(u => u.id === userToUpdate.id ? updatedUser : u)
          }));
      } catch (err) {
          console.error('[FitWolf] saveStrProgress failed:', err);
      }
  };

  const saveVitProgress = async (checkedMeals: string[], customDishes: any[]) => {
      const today = new Date().toISOString().split('T')[0];
      const userToUpdate = masqueradeId 
        ? state.users.find(u => u.id === masqueradeId) || state.currentUser 
        : state.currentUser;
      
      if (!userToUpdate) return;
      
      const currentProgress = userToUpdate.dailyProgress || { 
          date: today, 
          str: { workoutId: "", exercises: [] }, 
          vit: { checkedMeals: [], customDishes: [] }, 
          int: { completedSteps: [] } 
      };
      
      const updatedProgress = {
          ...currentProgress,
          vit: { checkedMeals, customDishes }
      };

      const updatedUser = { ...userToUpdate, dailyProgress: updatedProgress };

      try {
          await setDoc(doc(db, 'users', userToUpdate.id), { dailyProgress: updatedProgress }, { merge: true });
          setState(prev => ({
            ...prev,
            currentUser: !masqueradeId && prev.currentUser?.id === userToUpdate.id ? updatedUser : prev.currentUser,
            users: prev.users.map(u => u.id === userToUpdate.id ? updatedUser : u)
          }));
      } catch (err) {
          console.error('[FitWolf] saveVitProgress failed:', err);
      }
  };

  const saveIntProgress = async (completedSteps: number[]) => {
      const today = new Date().toISOString().split('T')[0];
      const userToUpdate = masqueradeId 
        ? state.users.find(u => u.id === masqueradeId) || state.currentUser 
        : state.currentUser;
      
      if (!userToUpdate) return;
      
      const currentProgress = userToUpdate.dailyProgress || { 
          date: today, 
          str: { workoutId: "", exercises: [] }, 
          vit: { checkedMeals: [], customDishes: [] }, 
          int: { completedSteps: [] } 
      };
      
      const updatedProgress = {
          ...currentProgress,
          int: { completedSteps }
      };

      const updatedUser = { ...userToUpdate, dailyProgress: updatedProgress };

      try {
          await setDoc(doc(db, 'users', userToUpdate.id), { dailyProgress: updatedProgress }, { merge: true });
          setState(prev => ({
            ...prev,
            currentUser: !masqueradeId && prev.currentUser?.id === userToUpdate.id ? updatedUser : prev.currentUser,
            users: prev.users.map(u => u.id === userToUpdate.id ? updatedUser : u)
          }));
      } catch (err) {
          console.error('[FitWolf] saveIntProgress failed:', err);
      }
  };

  const handlePurchase = (product: Product) => {
    if (!product.buff) return;
    const buffParts = product.buff.split(' ');
    const val = parseInt(buffParts[0]);
    const type = buffParts[1]?.toUpperCase();

    if (!type) return;

    const currentStats = effectiveUser?.stats || { str: 0, vit: 0, int: 0, recovery: 0 };
    let newStats = { ...currentStats };

    if (type.includes('RECOVERY')) newStats.recovery += val;
    else if (type.includes('STRENGTH')) newStats.str += val;
    else if (type.includes('INT')) newStats.int += val;

    updateProfile({ stats: newStats });
  };

  const addBattleLog = (type: 'STR' | 'VIT' | 'INT', title: string, completionRate: number, details: any) => {
    if (isCompletedToday(type)) return;

    const maxXP = type === 'STR' ? 100 : 25;
    // Seizoensevent XP multiplier toepassen
    const activeEvent = getActiveSeasonalEvent(state.globalSystemData);
    const multiplier = activeEvent ? activeEvent.xpMultiplier : 1;
    const earnedXP = Math.round(completionRate * maxXP * multiplier);

    // Toon XP animatie
    setXpPopup({ amount: earnedXP, type });

    const newEntry: BattleLogEntry = {
      id: Date.now().toString(), type, title, date: new Date().toISOString(),
      xpEarned: earnedXP, details
    };

    const currentStats = effectiveUser?.stats || { str: 0, vit: 0, int: 0, recovery: 0 };
    let newStats = { ...currentStats };
    if (completionRate > 0.8) {
        if (type === 'STR') newStats.str += 1;
        if (type === 'VIT') newStats.vit += 1;
        if (type === 'INT') newStats.int += 1;
    }
    
    const currentHistory = effectiveUser?.history || [];
    const currentXp = effectiveUser?.xp || 0;

    updateProfile({
        stats: newStats,
        history: [...currentHistory, newEntry],
        xp: currentXp + earnedXP
    });

    const newTotalXp = currentXp + earnedXP;
    const newRankInfo = getRankInfo(newTotalXp);

    // Boss damage: elke STR-sessie dealt schade aan de Guild Raid Boss
    const BOSS_DAMAGE_PER_WORKOUT = 5000;

    setState(prev => {
        const updatedUsers = prev.users.map(u => u.id === effectiveUser?.id ? { ...u, stats: newStats, history: [...currentHistory, newEntry], xp: newTotalXp } : u);

        // Workout rotatie: dag-index schuift pas morgen door (via daily reset useEffect)
        // Raid Boss HP verlagen bij STR completion
        const currentBossHp = prev.globalSystemData.guildBoss.currentHp;
        const newBossHp = type === 'STR' && completionRate > 0.5
          ? Math.max(0, currentBossHp - Math.round(BOSS_DAMAGE_PER_WORKOUT * completionRate))
          : currentBossHp;

        const updatedGlobalData = type === 'STR' && completionRate > 0.5
          ? { ...prev.globalSystemData, guildBoss: { ...prev.globalSystemData.guildBoss, currentHp: newBossHp } }
          : prev.globalSystemData;

        // Streak bijhouden
        const today = new Date().toISOString().split('T')[0];
        const lastActive = effectiveUser?.lastActiveDate;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const currentStreak = effectiveUser?.streak || 0;
        const newStreak = lastActive === yesterday ? currentStreak + 1 : (lastActive === today ? currentStreak : 1);

        if (effectiveUser?.id) {
            updateProfile({ streak: newStreak, lastActiveDate: today });
        }

        // Community XP milestone bijhouden (voor seizoensevents)
        const newCommunityXp = (prev.globalSystemData.communityXpTotal || 0) + earnedXP;
        const activeEvt = getActiveSeasonalEvent(prev.globalSystemData);
        const milestoneNowReached = activeEvt?.milestoneGoal
          ? newCommunityXp >= activeEvt.milestoneGoal
          : false;

        const updatedGlobalDataWithXP = {
          ...updatedGlobalData,
          communityXpTotal: newCommunityXp,
          seasonalEvents: (prev.globalSystemData.seasonalEvents || []).map(e =>
            activeEvt && e.id === activeEvt.id && milestoneNowReached
              ? { ...e, milestoneReached: true }
              : e
          ),
        };

        // Sync boss HP + community XP naar Firestore
        if (effectiveUser?.id) {
            setDoc(doc(db, 'system', 'config'), updatedGlobalDataWithXP, { merge: true })
              .catch(err => handleFirestoreError(err, OperationType.WRITE, 'system/config'));
        }

        return {
            ...prev,
            xp: newTotalXp,
            rank: newRankInfo.label,
            history: [...prev.history, newEntry],
            dailyQuests: { ...prev.dailyQuests, [type.toLowerCase()]: true },
            currentWorkoutIndex: prev.currentWorkoutIndex,
            users: updatedUsers,
            globalSystemData: updatedGlobalDataWithXP,
            currentUser: prev.currentUser?.id === effectiveUser?.id ? { ...prev.currentUser, stats: newStats, history: [...currentHistory, newEntry], xp: newTotalXp } : prev.currentUser
        };
    });

    setSubScreen(null);
  };

  const handleSendMessage = async (text: string, media?: string) => {
    const newMessage = {
      user: effectiveUser?.username || 'UNKNOWN',
      rank: effectiveUser?.tierId || 'free',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      media: media || null,
      supports: 0,
      reactions: {},
      comms: 0
    };
    try {
      await addDoc(collection(db, 'guild', 'main', 'messages'), newMessage);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'guild/main/messages');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guild', 'main', 'messages', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guild/main/messages/${id}`);
    }
  };

  if (isAuthLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-[#FF2A2A] font-black animate-pulse tracking-[0.5em]">INITIALIZING SYSTEM...</div>
    </div>
  );

  if (!state.isLoggedIn) return <ErrorBoundary><Auth onLogin={handleLogin} /></ErrorBoundary>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#030303] text-white flex flex-col">
        {/* XP Animatie overlay */}
        {xpPopup && (
          <XPPopup
            amount={xpPopup.amount}
            type={xpPopup.type}
            onDone={() => setXpPopup(null)}
          />
        )}

        {/* Alpha Report — wekelijkse check-in (elke zondag) */}
        {showAlphaReport && state.currentUser && (
          <AlphaReport
            existingReports={state.currentUser.weeklyReports || []}
            currentWeight={state.currentUser.weight}
            onSave={(report) => {
              const updatedReports = [...(state.currentUser?.weeklyReports || []), report];
              updateProfile({ weeklyReports: updatedReports });
              setShowAlphaReport(false);
            }}
            onDismiss={() => setShowAlphaReport(false)}
          />
        )}

        {/* Inactiviteit Banner — na 3+ dagen niet gelogd */}
        {showInactivityBanner && (
          <div className="fixed top-0 left-0 right-0 z-[150] bg-[#FF2A2A] text-black px-4 py-3 flex items-center justify-between shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest">
              ⚠️ [SYSTEEM] Je spieren atrofiëren. Meld je in de trainingszaal.
            </p>
            <button
              onClick={() => {
                setShowInactivityBanner(false);
                setState(p => ({ ...p, activeTab: 'COMMAND' }));
                setSubScreen('str');
              }}
              className="ml-4 border-2 border-black px-3 py-1 text-[10px] font-black uppercase hover:bg-black hover:text-[#FF2A2A] transition-colors whitespace-nowrap"
            >
              Training Starten
            </button>
            <button onClick={() => setShowInactivityBanner(false)} className="ml-2 text-black/60 hover:text-black text-lg font-black">×</button>
          </div>
        )}

        {isMasquerading && (
           <div className="bg-[#FFB800] text-black text-[10px] font-black uppercase py-2 px-4 flex justify-between items-center sticky top-0 z-[60] shadow-lg animate-pulse">
              <span>👁️ OVERRIDE ACTIVE: {effectiveUser?.username}</span>
              <button onClick={() => setMasqueradeId(null)} className="border border-black px-4 py-1 hover:bg-black hover:text-[#FFB800] transition-colors">EXIT OVERRIDE</button>
           </div>
        )}

        <main className="flex-grow relative overflow-hidden">
          {state.activeTab === 'ADMIN' && !masqueradeId ? (
            <SystemArchitect 
              globalData={state.globalSystemData} 
              users={state.users}
              onUpdate={(data) => {
                  setState(p => ({ ...p, globalSystemData: data }));
                  setDoc(doc(db, 'system', 'config'), data, { merge: true })
                      .catch(err => handleFirestoreError(err, OperationType.WRITE, 'system/config'));
              }}
              onUpdateUser={(id, data) => setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === id ? { ...u, ...data } : u)
              }))}
              onMasquerade={(userId) => {
                  setMasqueradeId(userId);
                  setState(p => ({ ...p, activeTab: 'COMMAND' })); 
              }}
              onBack={() => setState(p => ({ ...p, activeTab: 'COMMAND' }))}
            />
          ) : (
            <>
               {state.activeTab === 'ARMORY' && <Armory products={state.globalSystemData.shopProducts} discountCodes={state.globalSystemData.discountCodes} profile={effectiveUser!} onPurchase={handlePurchase} />}
          
               {state.activeTab === 'GUILD' && (
                <Guild
                  globalData={state.globalSystemData} profile={effectiveUser!} messages={state.messages}
                  isAdmin={isAdmin}
                  onDeleteMessage={handleDeleteMessage}
                  onUpdateBossHp={(hp) => setState(p => ({ ...p, globalSystemData: { ...p.globalSystemData, guildBoss: { ...p.globalSystemData.guildBoss, currentHp: hp } } }))}
                  onSendMessage={handleSendMessage}
                />
              )}

              {state.activeTab === 'COMMAND' && (
                <>
                  {!subScreen && (
                    <>
                      <EventBanner
                        events={state.globalSystemData.seasonalEvents || []}
                        communityXpTotal={state.globalSystemData.communityXpTotal}
                      />
                      <Dashboard state={{...state, currentUser: effectiveUser, xp: effectiveUser?.xp || state.xp, history: effectiveUser?.history || state.history, dailyQuests: { str: isCompletedToday('STR'), vit: isCompletedToday('VIT'), int: isCompletedToday('INT') }}} onOpenQuest={setSubScreen} onOpenHistory={() => setSubScreen('history')} onOpenProfile={() => setSubScreen('profile')} onLogout={handleLogout} onUpdateLanguage={(lang) => updateProfile({ language: lang })} />
                    </>
                  )}
                  {subScreen === 'profile' && <ProfileEdit profile={effectiveUser!} onSave={updateProfile} onBack={() => setSubScreen(null)} onLogout={handleLogout} onNavigate={setSubScreen} />}
                  {subScreen === 'history' && <BattleLog history={effectiveUser?.history || state.history} onBack={() => setSubScreen(null)} />}
                  {subScreen === 'personal' && <PersonalCommand profile={effectiveUser!} history={effectiveUser?.history || state.history} onSave={updateProfile} onBack={() => setSubScreen(null)} />}
                  
                  {subScreen === 'str' && (
                    <STRTracker
                      currentWorkout={state.globalSystemData.globalWorkouts[state.currentWorkoutIndex]}
                      history={effectiveUser?.history || state.history}
                      unitSystem={effectiveUser?.units || UnitSystem.METRIC}
                      currentXp={effectiveUser?.xp || state.xp || 0}
                      onBack={() => setSubScreen(null)}
                      onComplete={(session, rate) => addBattleLog('STR', session.title, rate, session.exercises)}
                      onSaveProgress={saveStrProgress}
                      savedProgress={effectiveUser?.dailyProgress?.str}
                      onSaveOrder={(title, order) => updateProfile({ customRoutines: { ...effectiveUser?.customRoutines, [title]: order } })}
                      isCompleted={isCompletedToday('STR')}
                    />
                  )}

                  {subScreen === 'vit' && (
                    <VITNutrition 
                      profile={effectiveUser!} 
                      checkedMeals={effectiveUser?.dailyProgress?.vit?.checkedMeals || []} 
                      customDishes={effectiveUser?.dailyProgress?.vit?.customDishes || []}
                      onToggleMeal={() => {}} 
                      onAddCustomDish={() => {}} // Handled inside VIT by onSaveProgress
                      onBack={() => setSubScreen(null)}
                      onComplete={(details, rate) => addBattleLog('VIT', 'Nutrition Sync', rate, details)}
                      onSaveProgress={saveVitProgress}
                      globalNutrition={state.globalSystemData.globalNutrition}
                      isCompleted={isCompletedToday('VIT')}
                    />
                  )}

                  {subScreen === 'int' && (
                    <INTMindset
                      steps={state.globalSystemData.globalMindset || DEFAULT_MINDSET}
                      onBack={() => setSubScreen(null)}
                      onComplete={(rate) => addBattleLog('INT', 'Stillness Calibration', rate, `Focus Ratio: ${Math.round(rate * 100)}%`)}
                      onSaveProgress={saveIntProgress}
                      savedProgress={effectiveUser?.dailyProgress?.int?.completedSteps}
                      isCompleted={isCompletedToday('INT')}
                    />
                  )}

                  {subScreen === 'subscription' && effectiveUser && (
                    <SubscriptionManager
                      profile={effectiveUser}
                      onSave={updateProfile}
                      onBack={() => setSubScreen(null)}
                    />
                  )}

                  {subScreen === 'referral' && effectiveUser && (
                    <ReferralPanel
                      profile={effectiveUser}
                      onBack={() => setSubScreen(null)}
                    />
                  )}

                  {subScreen === 'progress' && (
                    <ExerciseProgressChart
                      history={effectiveUser?.history || state.history}
                      onBack={() => setSubScreen(null)}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>

        <NavigationDock activeTab={state.activeTab} isAdmin={isAdmin && !isMasquerading} onTabChange={(tab) => setState(p => ({ ...p, activeTab: tab }))} />
      </div>
    </ErrorBoundary>
  );
}
